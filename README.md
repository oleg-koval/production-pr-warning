<img src="icons/icon.svg" width="64" height="64" alt="" />

# PR Redline

A browser extension for GitHub that draws a red line over pull requests into protected branches.

When a pull request (or a compare page) targets `main`, `master`, `prod` or `production`:

- the page turns pale red with a red bar on top;
- a merged or closed PR keeps a washed-out, faded tint;
- on the repo's pull request list, rows into those branches get the tint, a red left edge and a "protected base" badge (faded when merged or closed);
- the PR sidebar (Conversation tab) shows a block listing the other open PRs into those branches in the same repo, with a link to the full list.

The PR list is read from GitHub's own pull request list page using your logged-in session, so no token is needed.

## Settings

- Toolbar popup: shows which branch the current PR merges into and whether it is protected, with the count of other open protected PRs. Below that: turn the tint, the PR list block and the list highlight on or off, add or remove protected branches, and pick a colour preset or a custom combo from the colour wheel (one pick sets the light page, dark page and top-bar colours together).
- All settings (popup button, or right-click the icon > Options): edit the protected branches (`*` wildcards such as `release/*` are allowed), pick custom light, dark and top-bar colours, and reset to defaults.

Settings are stored in `chrome.storage.sync` and apply to open GitHub tabs immediately. Wildcard patterns tint the page but are left out of the PR list block and the list highlight (unless the list is already filtered by that base branch), because GitHub search has no wildcard for base branches. The list highlight checks up to the first 100 matching PRs.

## Install

- Chrome: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", pick this folder.
- Comet: open `comet://extensions`, same steps.

After editing files, click the reload icon on the extension card and refresh GitHub.
