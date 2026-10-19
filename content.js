const CLASS = 'gh-redline';

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

// Inline vars on <html> override the stylesheet defaults in redline.css.
function applyColors() {
  const style = document.documentElement.style;
  style.setProperty('--redline-user-bg-light', settings.bgLight);
  style.setProperty('--redline-user-bg-dark', settings.bgDark);
  style.setProperty('--redline-user-bar', settings.bar);
}

function apply() {
  const isProtected = branchMatches(detectBase(), settings.branches);
  document.documentElement.classList.toggle(CLASS, isProtected && settings.tintEnabled);

  // GitHub search has no wildcard for base:, so the list covers exact names only.
  const listBranches = settings.branches.filter((b) => !isWildcard(b));
  const pull = location.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (isProtected && pull && settings.showBlock && listBranches.length) {
    showProtectedPrList({ repo: pull[1], number: Number(pull[2]), branches: listBranches });
  } else {
    removeProtectedPrList();
  }
}

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
  applyColors();
  removeProtectedPrList();
  apply();
});

loadSettings().then((loaded) => {
  settings = loaded;
  applyColors();
  apply();
  document.addEventListener('turbo:load', schedule);
  window.addEventListener('popstate', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
});
