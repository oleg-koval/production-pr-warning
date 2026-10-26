const CLASS = 'gh-redline';
const DEAD_CLASS = 'gh-redline-dead';

let settings = { ...DEFAULT_SETTINGS };

// Fork PRs render the ref as "owner:branch"; branch names cannot contain ":".
const stripOwner = (ref) => ref.trim().split(':').pop();

function baseFromPullPage() {
  // Conversation tab (React UI keeps a .base-ref span in the sticky header).
  const baseRef = document.querySelector('.base-ref');
  if (baseRef?.textContent.trim()) return stripOwner(baseRef.textContent);

  // Files tab: two .commit-ref spans, the head one carries .head-ref.
  const commitRef = document.querySelector('.commit-ref:not(.head-ref)');
  if (commitRef?.textContent.trim()) return stripOwner(commitRef.textContent);

  // Commits tab and other React views: base branch link comes before the head link.
  const link = document.querySelector('a[class*="BranchName"][href*="/tree/"]');
  if (link) return decodeURIComponent(link.getAttribute('href').split('/tree/')[1]);

  return null;
}

function detectBase() {
  const path = location.pathname;
  if (/^\/[^/]+\/[^/]+\/pull\/\d+/.test(path)) return baseFromPullPage();

  const compare = path.match(/^\/[^/]+\/[^/]+\/compare\/(.+?)\.\.\.?/);
  if (compare) return stripOwner(decodeURIComponent(compare[1]));

  return null;
}

// Merged or closed PRs keep a faded tint: they still went to a protected branch,
// but there is nothing left to act on.
function isPullDone() {
  const label = document.querySelector('[class*="StateLabel"][data-status]');
  if (label) return /merged|closed/i.test(label.dataset.status);
  return !!document.querySelector('.gh-header-meta .State--merged, .gh-header-meta .State--closed');
}

// Inline vars on <html> override the stylesheet defaults in redline.css.
function applyColors(group) {
  const style = document.documentElement.style;
  style.setProperty('--redline-user-bg-light', group.bgLight);
  style.setProperty('--redline-user-bg-dark', group.bgDark);
  style.setProperty('--redline-user-bar', group.bar);
}

function apply() {
  const group = groupFor(detectBase(), settings.groups);
  if (group) applyColors(group);
  const tinted = !!group && settings.tintEnabled;
  document.documentElement.classList.toggle(CLASS, tinted);
  document.documentElement.classList.toggle(DEAD_CLASS, tinted && /\/pull\/\d+/.test(location.pathname) && isPullDone());

  // GitHub search has no wildcard for base:, so the list covers exact names only.
  const listBranches = group ? searchableBranches(group, settings.groups) : [];
  const pull = location.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (pull && settings.showBlock && listBranches.length) {
    showProtectedPrList({ repo: pull[1], number: Number(pull[2]), branches: listBranches });
  } else {
    removeProtectedPrList();
  }

  const pullList = location.pathname.match(/^\/([^/]+\/[^/]+)\/pulls\/?$/);
  if (pullList && settings.highlightList) {
    highlightPullList({ repo: pullList[1], groups: settings.groups, onReady: schedule });
  } else {
    clearPullListHighlight();
  }
}

// Answers the toolbar popup. The popup sends its own groups so the count
// never lags behind an edit it just made.
function pageState() {
  const path = location.pathname;
  const pull = path.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (pull) return { kind: 'pull', repo: pull[1], number: Number(pull[2]), base: detectBase(), done: isPullDone() };
  const compare = path.match(/^\/([^/]+\/[^/]+)\/compare\//);
  if (compare) return { kind: 'compare', repo: compare[1], base: detectBase() };
  return { kind: 'other' };
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type !== 'redline:state') return;
  const state = pageState();
  const group = groupFor(state.base, message.groups);
  const branches = group ? searchableBranches(group, message.groups) : [];
  if (state.kind !== 'pull' || !branches.length) {
    reply(state);
    return;
  }
  cachedPrs(state.repo, branches).then(
    (data) => reply({ ...state, others: otherOpenCount(data, state.number) }),
    () => reply(state),
  );
  return true;
});

let pending = null;
function schedule() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    apply();
  }, 150);
}

onSettingsChanged((next) => {
  settings = next;
  removeProtectedPrList();
  clearPullListHighlight();
  apply();
});

loadSettings().then((loaded) => {
  settings = loaded;
  apply();
  document.addEventListener('turbo:load', schedule);
  window.addEventListener('popstate', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
});
