# Releasing PR Redline

A release is a version tag on `main`. Pushing the tag builds the zip, publishes the GitHub release and submits the same zip to the Chrome Web Store for review.

## Release a version

1. On a branch, bump `version` in `manifest.json` and add a `## <version> (<date>)` section to `CHANGELOG.md`. The release notes are taken from that section.
2. Open a pull request and merge it into `main`.
3. Tag the merge commit and push the tag:

   ```bash
   git switch main && git pull --ff-only
   git tag v1.6.0 && git push origin v1.6.0
   ```

4. Watch the **Release** run in the Actions tab. When it is green, the store step summary says `Submitted for review, state PENDING_REVIEW`. Users get the update automatically once Google's review passes.

Tag only after the pull request is merged. The workflow refuses a tag that is not on `main` or that does not match `manifest.json`.

## What the workflow checks

| Step | Fails when |
| --- | --- |
| Check the tag is on main | The tag points at a commit that is not on `main`, for example a tag pushed before the PR was merged. |
| Check the tag matches manifest.json | Tag `v1.6.0` but `manifest.json` says something else. The store never accepts the same version twice. |
| Publish the GitHub release | `CHANGELOG.md` has no section for the version. |
| Submit to the Chrome Web Store | Google rejects a call. The log shows `HTTP <status> from <url>` followed by Google's own error message. |

## Chrome Web Store setup (once)

The store step needs four repository secrets. Without any of them it skips the store with a warning and the GitHub release still ships. With only some of them it fails, because that is a typo, not a choice.

| Secret | Where it comes from |
| --- | --- |
| `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET` | An OAuth client in a Google Cloud project with the Chrome Web Store API enabled. See [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api). |
| `CWS_REFRESH_TOKEN` | A refresh token for the scope `https://www.googleapis.com/auth/chromewebstore`, made **with the client above**. In the OAuth Playground, open the settings (gear icon) and tick **Use your own OAuth credentials** first, or the token belongs to Google's demo client and will not work. Sign in as an account that can manage the extension. |
| `CWS_PUBLISHER_ID` | Developer Dashboard > **Settings** > **Publisher ID**, on the publisher that **owns** the extension. If the account has more than one publisher, switch to the right one with the menu at the top left and check that PR Redline is under **Items**. This is not the extension ID. |

Set each secret in a terminal, where `gh` prompts for the value so it never lands in your shell history:

```bash
gh secret set CWS_REFRESH_TOKEN --repo oleg-koval/production-pr-warning
```

To check the client and refresh token before saving them, exchange them for an access token by hand:

```bash
curl -sS https://oauth2.googleapis.com/token \
  -d client_id="$CLIENT_ID" -d client_secret="$CLIENT_SECRET" \
  -d refresh_token="$REFRESH_TOKEN" -d grant_type=refresh_token | jq 'has("access_token")'
```

`true` means the three values belong together.

## When the store step fails

Fix the cause, then re-run only the failed job. A re-run uses the workflow and scripts from the tagged commit, so it picks up changed secrets but not changed code. The GitHub release step is safe to repeat: it replaces the zip on the existing release.

```bash
gh run rerun <run-id> --repo oleg-koval/production-pr-warning --failed
```

| Error in the log | Cause | Fix |
| --- | --- | --- |
| `HTTP 400` from `oauth2.googleapis.com/token`, `unauthorized_client` | The refresh token was made with a different OAuth client, usually the Playground's own. | Make a new refresh token with **Use your own OAuth credentials** ticked, and save it. |
| `HTTP 400`, `invalid_grant` | The refresh token was revoked or expired. Tokens from an OAuth app left in **Testing** expire after 7 days. | Make a new refresh token. Set the OAuth consent screen to **In production** so it stops expiring. |
| `HTTP 401`, `invalid_client` | The client ID or secret in GitHub is wrong or empty. | Run the token check above with the same values, then save all three again. |
| `HTTP 403` from `chromewebstore.googleapis.com`, `PERMISSION_DENIED` | `CWS_PUBLISHER_ID` is not the publisher that owns the extension, or the signed-in account cannot manage it. | Copy the Publisher ID again as described above and save it. |
| `FAILED_PRECONDITION`, `You may not edit or publish an item that is in review` | An earlier version is still in review. | Wait for that review to finish, or click **Cancel review** on the item in the dashboard, then re-run. |

A code fix to the workflow or scripts needs a new version and tag, because re-running an old tag runs the old code.
