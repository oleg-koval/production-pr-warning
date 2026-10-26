# Changelog

## 1.5.0 (2026-10-26)

### Added

- Colour groups. Each colour has its own list of branches, so PRs into
  `production` can be red, PRs into `staging` green, and PRs into `release/*`
  blue. You can have up to 8 colours. If a branch is in two colours, the upper
  one wins.
- The PR list highlight and the sidebar "other open PRs" block work per colour:
  each row and each list uses the colour of its base branch.
- Popup: branches are grouped by colour. You can add or remove a colour, and
  pick a preset or a custom colour for the selected row.
- Settings page: one card per colour, with its own branches, colours and
  preview. Cards can be moved up and down.
- New presets: Green and Blue.

### Changed

- Settings created in 1.4 become the first colour group, so an upgrade changes
  nothing on screen. The first group is also written back to the 1.4 keys, so
  an older version on another synced browser keeps working.

## 1.4.0 (2026-10-19)

- First Chrome Web Store release. It tints pull requests into protected
  branches, marks them on the PR list, lists other open PRs into protected
  branches in the sidebar, and adds a toolbar popup and a settings page.
