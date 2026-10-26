#!/usr/bin/env bash
# Uploads a zip to the Chrome Web Store and submits it for review (API v2).
# Usage: CLIENT_ID=… CLIENT_SECRET=… REFRESH_TOKEN=… PUBLISHER_ID=… EXTENSION_ID=… scripts/publish-store.sh <zip>
set -euo pipefail

zip=$1
missing=()
for name in CLIENT_ID CLIENT_SECRET REFRESH_TOKEN PUBLISHER_ID; do
  [ -n "${!name:-}" ] || missing+=("$name")
done
# No credentials at all means the store step is not set up yet, so the GitHub release still ships.
# Some but not all means a typo in the secrets, which must not pass as a skipped step.
if [ ${#missing[@]} -eq 4 ]; then
  echo "::warning::Chrome Web Store secrets are not set, skipping the store upload"
  exit 0
elif [ ${#missing[@]} -gt 0 ]; then
  echo "::error::Missing Chrome Web Store secrets: ${missing[*]}"
  exit 1
fi

token=$(curl -sSf --max-time 30 https://oauth2.googleapis.com/token \
  -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
  -d refresh_token="$REFRESH_TOKEN" -d grant_type=refresh_token | jq -r .access_token)
echo "::add-mask::$token"
auth=(-H "Authorization: Bearer $token")
item="publishers/$PUBLISHER_ID/items/$EXTENSION_ID"

upload=$(curl -sS --max-time 120 -X POST "${auth[@]}" -H 'Content-Type: application/zip' -T "$zip" "https://chromewebstore.googleapis.com/upload/v2/$item:upload")
echo "upload: $upload"
state=$(jq -r '.uploadState // empty' <<<"$upload")
for _ in $(seq 1 30); do
  case "$state" in
    SUCCEEDED) break ;;
    IN_PROGRESS | UPLOAD_IN_PROGRESS)
      sleep 10
      state=$(curl -sSf --max-time 30 "${auth[@]}" "https://chromewebstore.googleapis.com/v2/$item:fetchStatus" | jq -r '.lastAsyncUploadState // empty')
      ;;
    *) echo "::error::Upload failed: ${state:-no uploadState in the response}"; exit 1 ;;
  esac
done
[ "$state" = SUCCEEDED ] || { echo "::error::Upload still $state after 5 minutes"; exit 1; }

publish=$(curl -sSf --max-time 30 -X POST "${auth[@]}" -H 'Content-Type: application/json' -d '{}' \
  "https://chromewebstore.googleapis.com/v2/$item:publish")
echo "publish: $publish"
echo "Submitted for review, state $(jq -r .state <<<"$publish")" >>"${GITHUB_STEP_SUMMARY:-/dev/stdout}"
