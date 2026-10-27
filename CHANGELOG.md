# Changelog

## 1.6.0 (2026-10-27)

### Added

- The sidebar "Open PRs into …" block has an **Agent prompt** drawer at the
  bottom. It holds a ready-made prompt that lists the open PRs into those
  branches and asks a coding agent (Claude Code, Codex or similar) to bring
  each branch up to date, resolve conflicts, fix the tests and push, without
  merging anything. **Copy prompt** puts it on the clipboard. Drafts are left
  out unless you tick **Include drafts**.

## 1.5.1 (2026-10-26)

### Fixed

- A PR whose base branch was changed (for example a stacked PR that GitHub
  moved to `main` after its parent merged) took the colour of the old base
  branch from the timeline, instead of the branch it merges into now.

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

- Popup: the three on/off toggles now say what they do ("Tint PR pages",
  "Other open PRs", "Mark PR lists"), each with a one-line description.
- Popup: on a repo's Pull requests tab it says how many PRs on the page are
  marked, instead of "Not a pull request page". When it can't reach the tab
  (opened before the extension was installed or updated), it says to reload
  the tab.
- Settings created in 1.4 become the first colour group, so an upgrade changes
  nothing on screen. The first group is also written back to the 1.4 keys, so
  an older version on another synced browser keeps working.

## 1.4.0 (2026-10-19)

- First Chrome Web Store release. It tints pull requests into protected
  branches, marks them on the PR list, lists other open PRs into protected
  branches in the sidebar, and adds a toolbar popup and a settings page.
