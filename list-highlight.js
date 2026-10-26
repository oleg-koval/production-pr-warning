// Highlights rows on a repo's pull request list whose base is in a colour
// group. List rows and the list's JSON do not carry the base branch, so the
// same search is re-run once per group with its base: qualifiers and the
// returned PR numbers are marked in that group's colour.

const HIT_CLASS = 'ghrl-row-hit';
const DEAD_ROW_CLASS = 'ghrl-row-dead';
const BADGE_CLASS = 'ghrl-row-badge';
const HIGHLIGHT_MAX_PAGES = 4;
const DEFAULT_LIST_QUERY = 'is:pr is:open';

const BASE_TOKEN = /(^|\s)base:("[^"]+"|\S+)/g;

// Keeps the visitor's own filters and swaps their base: tokens for each group's
// branches. A visitor filtering by base already names the branches, so wildcard
// patterns can match those; otherwise only exact names can be searched. A name
// goes to the first group it matches, so the per-group results never overlap.
function groupListQueries(query, groups) {
  const visitorBases = [...query.matchAll(BASE_TOKEN)].map((m) => m[2].replace(/"/g, ''));
  const rest = query.replace(BASE_TOKEN, ' ').trim();
  return groups.map((group) => {
    const bases = visitorBases.length
      ? visitorBases.filter((b) => groupFor(b, groups) === group)
      : searchableBranches(group, groups);
    return bases.length ? { bases, query: `${rest} ${bases.map((b) => `base:${b}`).join(' ')}`.trim() } : null;
  });
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

const ROW_VARS = { '--ghrl-row-light': 'bgLight', '--ghrl-row-dark': 'bgDark', '--ghrl-row-bar': 'bar' };

// The badge names the base when the group's search had only one; with several
// the result does not say which one matched.
const badgeText = (hit) => (hit.bases.length === 1 ? hit.bases[0] : 'protected base');

function markRow(link, hit) {
  const row = link.closest('li');
  if (!row) return;
  row.classList.toggle(HIT_CLASS, !!hit);
  const isDone = !!row.querySelector('.octicon-git-merge, .octicon-git-pull-request-closed');
  row.classList.toggle(DEAD_ROW_CLASS, !!hit && isDone);
  for (const [name, key] of Object.entries(ROW_VARS)) {
    if (hit) row.style.setProperty(name, hit.group[key]);
    else row.style.removeProperty(name);
  }
  const badge = row.querySelector(`.${BADGE_CLASS}`);
  if (hit && !badge) {
    const span = document.createElement('span');
    span.className = BADGE_CLASS;
    span.textContent = badgeText(hit);
    link.after(span);
  } else if (hit) {
    badge.textContent = badgeText(hit);
  } else if (badge) {
    badge.remove();
  }
}

// Called on every DOM change. Paints only once every group's search is back,
// so a row never flashes one colour and then another.
function highlightPullList({ repo, groups, onReady }) {
  const params = new URLSearchParams(location.search);
  const searches = groupListQueries(params.get('q') ?? DEFAULT_LIST_QUERY, groups);
  const links = document.querySelectorAll('[data-testid="listitem-title-link"]');
  if (!searches.some(Boolean) || !links.length) return clearPullListHighlight();

  const hits = searches.flatMap((search, index) =>
    search ? [{ group: groups[index], bases: search.bases, entry: protectedNumbers(repo, search.query, onReady) }] : [],
  );
  if (hits.some((hit) => !hit.entry.numbers)) return;
  links.forEach((link) => {
    const number = pullNumberOf(link);
    markRow(link, hits.find((hit) => hit.entry.numbers.has(number)) ?? null);
  });
}

function clearPullListHighlight() {
  document.querySelectorAll(`.${HIT_CLASS}`).forEach((row) => {
    row.classList.remove(HIT_CLASS, DEAD_ROW_CLASS);
    Object.keys(ROW_VARS).forEach((name) => row.style.removeProperty(name));
  });
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((badge) => badge.remove());
}
