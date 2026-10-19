<p align="center">
  <img src="icons/icon.svg" width="72" height="72" alt="PR Redline icon" />
</p>

<h1 align="center">PR Redline</h1>

<p align="center">
  <strong>See the red line before you merge.</strong><br />
  A Chrome extension that tints GitHub pull requests into <code>main</code>, <code>production</code> and other protected branches,<br />
  so a production PR never passes for a staging one.
</p>

<p align="center">
  <a href="https://redline.olegkoval.com">Website</a> ·
  <a href="https://github.com/oleg-koval/production-pr-warning/releases/latest">Download</a> ·
  <a href="https://redline.olegkoval.com/privacy.html">Privacy</a> ·
  <a href="https://github.com/oleg-koval/production-pr-warning/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/oleg-koval/production-pr-warning/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/oleg-koval/production-pr-warning?label=release&color=cf222e" /></a>
  <img alt="Chrome Web Store: in review" src="https://img.shields.io/badge/Chrome%20Web%20Store-in%20review-d29922" />
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-1f2328" />
  <img alt="No data collected" src="https://img.shields.io/badge/data%20collected-none-1a7f37" />
</p>

![A GitHub pull request into production, tinted pale red with a red bar on top](store/screenshots/01-pull.png)

## Why

On GitHub, a pull request into `production` looks exactly like one into `staging`. The base branch is a small grey label next to the title, and it is easy to approve or merge the wrong one, especially with release PRs, hotfixes and repos that have several long-lived branches.

PR Redline makes the target impossible to miss. It needs no token, no account and no setup. Install it and every PR into a protected branch turns red.

## What it does

| | |
| --- | --- |
| **Tinted pull requests** | Pull request and compare pages into a protected branch turn pale red with a red bar on top. Merged and closed PRs keep a faded tint. |
| **Marked PR list** | On the repository's pull request list, PRs into protected branches get the tint, a red left edge and a `protected base` badge. |
| **Everything else in flight** | The PR sidebar lists the other open PRs into protected branches in the same repo, with a link to the full list. |
| **Toolbar popup** | Shows what the current PR merges into and whether that branch is protected, and lets you edit branches and colours in place. |
| **Your branches, your colours** | Default protected branches are `main`, `master`, `prod` and `production`. Add your own, including wildcards like `release/*`. Light and dark GitHub themes are both supported. |

## How it works

| Pull request list | Toolbar popup | Settings |
| --- | --- | --- |
| ![PR list with protected-base PRs marked](store/screenshots/02-list.png) | ![Toolbar popup](store/screenshots/03-popup.png) | ![Settings page](store/screenshots/04-options.png) |

1. A content script runs on `github.com` only and reads the base branch from the pull request or compare page.
2. If the base matches one of your protected branches, it adds a class that tints the page.
3. For the sidebar block and the list badges, it loads the repository's own pull request list page from github.com with your existing session. No GitHub token is asked for or stored.

## Install

The Chrome Web Store listing is in review. Until it is approved:

1. [Download the latest release zip](https://github.com/oleg-koval/production-pr-warning/releases/latest) and unzip it.
2. Open `chrome://extensions` (or `comet://extensions` in Comet) and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.

It works in Chrome and in Chromium-based browsers such as Comet, Edge, Brave and Arc.

## Settings

- **Toolbar popup**: turn the tint, the PR list block and the list highlight on or off, add or remove protected branches, and pick a colour preset or a custom combo from the colour wheel (one pick sets the light page, dark page and top-bar colours together).
- **All settings** (popup button, or right-click the icon > Options): edit protected branches with `*` wildcards, pick custom light, dark and top-bar colours, and reset to defaults.

Settings are stored in `chrome.storage.sync` and apply to open GitHub tabs immediately.

Wildcard patterns tint the page but are left out of the PR list block and the list highlight, because GitHub search has no wildcard for base branches. The exception is when the list is already filtered by that base branch. The list highlight checks up to the first 100 matching PRs.

## Privacy

PR Redline collects no data. It runs only on `https://github.com/*`, makes no requests outside github.com, and has no analytics, no tracking and no remote code. The only permission is `storage`, for your settings. See the [privacy policy](https://redline.olegkoval.com/privacy.html).

## Development

```bash
git clone https://github.com/oleg-koval/production-pr-warning.git
```

Load the repository folder with **Load unpacked**. After editing files, click the reload icon on the extension card and refresh GitHub.

```bash
./scripts/package.sh   # builds dist/pr-redline-<version>.zip for the Chrome Web Store
```

The website lives in `docs/` and is served by GitHub Pages at [redline.olegkoval.com](https://redline.olegkoval.com).

## Also for GitHub pull requests

- [MergeChain](https://mergechain.dev) blocks a pull request's merge until the PRs it depends on land, across repos. PR Redline makes the merge *target* obvious; MergeChain controls merge *order*.

---

PR Redline is not affiliated with or endorsed by GitHub, Inc.
