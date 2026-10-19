const PROTECTED = ['main', 'master', 'prod', 'production'];
const CLASS = 'gh-redline';

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

function apply() {
  const isProtected = PROTECTED.includes(detectBase());
  document.documentElement.classList.toggle(CLASS, isProtected);

  const pull = location.pathname.match(/^\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (isProtected && pull) {
    showProtectedPrList({ repo: pull[1], number: Number(pull[2]), branches: PROTECTED });
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

apply();
document.addEventListener('turbo:load', schedule);
window.addEventListener('popstate', schedule);
new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
