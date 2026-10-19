// Highlights rows on a repo's pull request list whose base is a protected
// branch. List rows do not carry the base branch, so the same search is re-run
// with base: qualifiers and the returned PR numbers are marked.

const HIT_CLASS = 'ghrl-row-hit';
const DEAD_ROW_CLASS = 'ghrl-row-dead';
const BADGE_CLASS = 'ghrl-row-badge';
const HIGHLIGHT_MAX_PAGES = 4;
const DEFAULT_LIST_QUERY = 'is:pr is:open';

const BASE_TOKEN = /(^|\s)base:("[^"]+"|\S+)/g;

// Keeps the visitor's own filters, swaps their base: tokens for the protected
// ones. A visitor filtering by base already names the branches, so wildcard
// patterns can match those; otherwise only exact names can be searched.
function protectedListQuery(query, patterns) {
  const visitorBases = [...query.matchAll(BASE_TOKEN)].map((m) => m[2].replace(/"/g, ''));
  const bases = visitorBases.length
    ? visitorBases.filter((b) => branchMatches(b, patterns))
    : patterns.filter((p) => !isWildcard(p));
  if (!bases.length) return null;
  const rest = query.replace(BASE_TOKEN, ' ').trim();
  return `${rest} ${bases.map((b) => `base:${b}`).join(' ')}`.trim();
}

const highlightCache = new Map();
function protectedNumbers(repo, query, onReady) {
  const key = `${repo}|${query}`;
  const hit = highlightCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;

  const entry = { at: Date.now(), numbers: null };
  highlightCache.set(key, entry);
  (async () => {
    const numbers = new Set();
    for (let page = 1; page <= HIGHLIGHT_MAX_PAGES; page++) {
      const result = await fetchPullsPage(repo, query, page);
      result.prs.forEach((pr) => numbers.add(pr.number));
      if (page >= result.totalPages) break;
    }
    entry.numbers = numbers;
    onReady();
  })().catch(() => highlightCache.delete(key));
  return entry;
}

const pullNumberOf = (link) => Number(link.getAttribute('href')?.match(/\/pull\/(\d+)/)?.[1]);

function markRow(link, isHit) {
  const row = link.closest('li');
  if (!row) return;
  row.classList.toggle(HIT_CLASS, isHit);
  const isDone = !!row.querySelector('.octicon-git-merge, .octicon-git-pull-request-closed');
  row.classList.toggle(DEAD_ROW_CLASS, isHit && isDone);
  const badge = row.querySelector(`.${BADGE_CLASS}`);
  if (isHit && !badge) {
    const span = document.createElement('span');
    span.className = BADGE_CLASS;
    span.textContent = 'protected base';
    link.after(span);
  } else if (!isHit && badge) {
    badge.remove();
  }
}

// Called on every DOM change; only touches rows whose state differs.
function highlightPullList({ repo, patterns, onReady }) {
  const params = new URLSearchParams(location.search);
  const query = protectedListQuery(params.get('q') ?? DEFAULT_LIST_QUERY, patterns);
  const links = document.querySelectorAll('[data-testid="listitem-title-link"]');
  if (!query || !links.length) return clearPullListHighlight();

  const entry = protectedNumbers(repo, query, onReady);
  if (!entry.numbers) return;
  links.forEach((link) => markRow(link, entry.numbers.has(pullNumberOf(link))));
}

function clearPullListHighlight() {
  document.querySelectorAll(`.${HIT_CLASS}`).forEach((row) => row.classList.remove(HIT_CLASS, DEAD_ROW_CLASS));
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((badge) => badge.remove());
}
