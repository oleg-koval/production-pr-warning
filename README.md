# GitHub PR Redline

When a pull request (or a compare page) targets `main`, `master`, `prod` or `production`:

- the page turns pale red with a red bar on top;
- the PR sidebar (Conversation tab) shows a block listing the other open PRs into those branches in the same repo, with a link to the full list.

Edit `PROTECTED` in `content.js` to change the branch list. The PR list is read from GitHub's own pull request list page using your logged-in session, so no token is needed.

## Install

- Chrome: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", pick this folder.
- Comet: open `comet://extensions`, same steps.

After editing files, click the reload icon on the extension card and refresh GitHub.
