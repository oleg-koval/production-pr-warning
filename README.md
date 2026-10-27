<p align="center">
  <img src="icons/icon.svg" width="72" height="72" alt="PR Redline icon" />
</p>

<h1 align="center">PR Redline</h1>

<p align="center">
  <strong>See the red line before you merge.</strong><br />
  A Chrome extension that colours GitHub pull requests by the branch they merge into:<br />
  red for <code>main</code> and <code>production</code>, green for <code>staging</code>, or any colours you pick.
</p>

<p align="center">
  <a href="https://redline.olegkoval.com">Website</a> ·
  <a href="https://chromewebstore.google.com/detail/pr-redline-production-pr/bddnpilanolcofleogjnpceflakmpgea">Chrome Web Store</a> ·
  <a href="https://redline.olegkoval.com/privacy.html">Privacy</a> ·
  <a href="https://github.com/oleg-koval/production-pr-warning/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/oleg-koval/production-pr-warning/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/oleg-koval/production-pr-warning?label=release&color=cf222e" /></a>
  <a href="https://chromewebstore.google.com/detail/pr-redline-production-pr/bddnpilanolcofleogjnpceflakmpgea"><img alt="Chrome Web Store" src="https://img.shields.io/chrome-web-store/v/bddnpilanolcofleogjnpceflakmpgea?label=Chrome%20Web%20Store&color=1a7f37" /></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-1f2328" />
  <img alt="No data collected" src="https://img.shields.io/badge/data%20collected-none-1a7f37" />
</p>

![A GitHub pull request into production, tinted pale red with a red bar on top](store/screenshots/01-pull.png)

## Why

On GitHub, a pull request into `production` looks exactly like one into `staging`. The base branch is a small grey label next to the title, and it is easy to approve or merge the wrong one, especially with release PRs, hotfixes and repos that have several long-lived branches.

PR Redline makes the target impossible to miss. It needs no token, no account and no setup. Install it and every PR into `main` or `production` turns red. Add more colours for the rest, for example green for `staging` and blue for `release/*`.

## What it does

| | |
| --- | --- |
| **Tinted pull requests** | Pull request and compare pages take the colour of their base branch: pale red with a red bar on top by default. Merged and closed PRs keep a faded tint. |
| **Marked PR list** | On the repository's pull request list, each PR into one of your branches gets its colour's tint, left edge and a badge. |
| **Everything else in flight** | The PR sidebar lists the other open PRs into branches of the same colour, with a link to the full list. Its **Agent prompt** drawer copies a ready-to-run `claude`, `codex` or `opencode` command, or the plain prompt for any other agent. The prompt asks the agent to update every one of those branches and resolve conflicts, so they are ready to merge. |
| **Toolbar popup** | Shows what the current PR merges into and which colour it got, and lets you edit branches and colours in place. |
| **Colour groups** | Up to 8 colours, each with its own branch list. The default is red for `main`, `master`, `prod`, `production` and any `prod-*` or `production-*` branch, such as `prod-eu`. Add green for `staging`, blue for `release/*`, and so on. Light and dark GitHub themes are both supported. |

## How it works

| Pull request list | Toolbar popup |
| --- | --- |
| ![PR list with protected-base PRs marked](store/screenshots/02-list.png) | ![Toolbar popup](store/screenshots/03-popup.png) |
| **Settings** | **Agent prompt** |
| ![Settings page](store/screenshots/04-options.png) | ![The Agent prompt drawer in the PR sidebar, open on the Claude tab](store/screenshots/05-agent.png) |

1. A content script runs on `github.com` only and reads the base branch from the pull request or compare page.
2. If the base matches a branch in one of your colours, it tints the page in that colour. The first matching colour wins.
3. For the sidebar block and the list badges, it loads the repository's own pull request list page from github.com with your existing session. No GitHub token is asked for or stored.

## Install

**[Add PR Redline from the Chrome Web Store](https://chromewebstore.google.com/detail/pr-redline-production-pr/bddnpilanolcofleogjnpceflakmpgea)**. Updates install automatically.

To load it by hand instead: [download the latest release zip](https://github.com/oleg-koval/production-pr-warning/releases/latest), unzip it, open `chrome://extensions` (or `comet://extensions` in Comet), turn on **Developer mode**, click **Load unpacked** and pick the unzipped folder.

It works in Chrome and in Chromium-based browsers such as Comet, Edge, Brave and Arc.

## Settings

- **Toolbar popup**: turn the tint, the PR list block and the list highlight on or off, add or remove branches in each colour, add or remove colours, and pick a preset or a custom combo from the colour wheel (one pick sets the light page, dark page and top-bar colours together).
- **All settings** (popup button, or right-click the icon > Options): edit each colour's branches with `*` wildcards, pick custom light, dark and top-bar colours, reorder colours (the upper one wins when a branch is in two), and reset to defaults.

Upgrading from 1.4 keeps your branches and colour as the first colour group.

Settings are stored in `chrome.storage.sync` and apply to open GitHub tabs immediately.

Wildcard patterns tint the page but are left out of the PR list block and the list highlight, because GitHub search has no wildcard for base branches. The exception is when the list is already filtered by that base branch. The list highlight checks up to the first 100 matching PRs.

## Privacy

PR Redline collects no data. It runs only on `https://github.com/*`, makes no requests outside github.com, and has no analytics, no tracking and no remote code. The only permission is `storage`, for your settings and the agent you last picked in the drawer. The drawer's copy button writes to your clipboard only when you click it. See the [privacy policy](https://redline.olegkoval.com/privacy.html).

## Development

```bash
git clone https://github.com/oleg-koval/production-pr-warning.git
```

Load the repository folder with **Load unpacked**. After editing files, click the reload icon on the extension card and refresh GitHub.

```bash
./scripts/package.sh   # builds dist/pr-redline-<version>.zip for the Chrome Web Store
```

To release, bump `version` in `manifest.json`, add its section to `CHANGELOG.md`, merge, then tag `main`:

```bash
git tag v1.6.1 && git push origin v1.6.1
```

The Release workflow builds the zip, publishes the GitHub release and submits it to the Chrome Web Store for review. [RELEASING.md](RELEASING.md) covers the store secrets it needs and what to do when a step fails.

The website lives in `docs/` and is served by GitHub Pages at [redline.olegkoval.com](https://redline.olegkoval.com).

## Also for GitHub pull requests

- [MergeChain](https://mergechain.dev) blocks a pull request's merge until the PRs it depends on land, across repos. PR Redline makes the merge *target* obvious; MergeChain controls merge *order*.

---

PR Redline is not affiliated with or endorsed by GitHub, Inc.
