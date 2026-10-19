#!/usr/bin/env bash
# Builds the Chrome Web Store upload: runtime files only.
set -euo pipefail

cd "$(dirname "$0")/.."
version=$(node -p "require('./manifest.json').version")
out="dist/pr-redline-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -q -X "$out" \
  manifest.json \
  settings.js pr-list.js list-highlight.js content.js redline.css \
  popup.html popup.js options.html options.js \
  icons/icon-16.png icons/icon-32.png icons/icon-48.png icons/icon-128.png

echo "$out"
