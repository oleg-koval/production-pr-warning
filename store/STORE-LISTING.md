# Chrome Web Store: listing and compliance

Everything to paste into the developer dashboard
(https://chrome.google.com/webstore/devconsole) for PR Redline.

## Package

```bash
./scripts/package.sh   # writes dist/pr-redline-<version>.zip
```

The zip holds only the runtime files (manifest, scripts, styles, pages, icons).
`docs/`, `store/` and the README are left out.

## Listing copy

**Name** (from `manifest.json`): PR Redline - Production PR warning

**Summary (132 chars max):**
Colours GitHub pull requests by base branch: red for production, green for staging, or your own colours.

**Description:**

PR Redline colours every GitHub pull request by the branch it merges into.
PRs into main, master, prod, production or any prod-* branch (such as prod-eu)
turn red by default, and you can add more colours, such as green for staging,
so you always know whether you are about to merge into staging or into
production.

- Pull request and compare pages take the colour of their base branch, with a
  bar on top. Merged and closed ones keep a faded tint.
- The repository's pull request list marks those PRs with a coloured edge and a
  badge.
- The PR sidebar lists the other open pull requests into branches of the same
  colour in the same repository.
- Up to 8 colour groups, each with its own branch list.
- The toolbar popup shows what the current PR merges into and lets you edit
  branches and colours in place.
- Your own branch names and wildcards such as release/*. Light and dark
  GitHub themes.

Works with your existing GitHub session: no token, no account, no data
collected. Runs only on github.com.

Also from the same author: MergeChain (https://mergechain.dev) blocks a PR's
merge until the PRs it depends on land.

PR Redline is not affiliated with or endorsed by GitHub, Inc.

**Category:** Developer Tools
**Language:** English
**Homepage URL:** https://redline.olegkoval.com/
**Support URL:** https://github.com/oleg-koval/production-pr-warning/issues

## Single purpose (required field)

Visually mark which branch a GitHub pull request targets, by colouring it.

## Permission justifications (required field)

- **storage**: saves the user's settings (branch names, colours,
  feature toggles) with `chrome.storage.sync`. Nothing else is stored.
- **Content script on `https://github.com/*`** (host access): reads the base
  branch from pull request and compare pages to tint them, and loads the
  repository's own pull request list page (same origin, the user's existing
  session) to mark and list PRs into the configured branches. No other sites.

No other permissions. No `tabs`, no `<all_urls>`, no remote code.

## Data usage disclosure (Privacy tab)

- Collected user data: tick **none** of the categories.
- Certify all three: not sold to third parties; not used or transferred for
  purposes unrelated to the single purpose; not used for creditworthiness or
  lending.

**Remote code:** No, I am not using remote code.

## Privacy policy URL

https://redline.olegkoval.com/privacy.html

## Assets to upload

| Field | File | Size |
| --- | --- | --- |
| Store icon | `store/assets/store-icon-128.png` | 128x128 (96 artwork, 16 px padding) |
| Screenshot 1 | `store/screenshots/01-pull.png` | 1280x800 |
| Screenshot 2 | `store/screenshots/02-list.png` | 1280x800 |
| Screenshot 3 | `store/screenshots/03-popup.png` | 1280x800 |
| Screenshot 4 | `store/screenshots/04-options.png` | 1280x800 |
| Small promo tile | `store/assets/promo-small-440x280.png` | 440x280 |

Screenshots 1 and 2 are real github.com pages with the extension loaded.

## Pre-submit checklist

- [x] Manifest V3
- [x] Single, narrow purpose
- [x] Name does not imply GitHub affiliation; disclaimer in description and privacy page
- [x] No GitHub logo in the icon, tile or name
- [x] Minimal permissions, each justified above
- [x] No remote or hosted code
- [x] Privacy policy at a public URL
- [x] Data-use disclosure: nothing collected
- [x] Screenshots and small promo tile at the required sizes
- [ ] One-time developer registration fee paid (5 USD) on the dashboard account
- [ ] Publisher email verified on the dashboard account
