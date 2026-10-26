// "Open PRs into <branches>" block for the PR sidebar, scoped to the colour
// group of the current PR's base. Visual language
// follows mergechain's dependency block: left icon column + content area,
// Primer tokens, octicons, clickable rows.

const BLOCK_ID = 'ghrl-pr-list';
const MAX_ROWS = 10;
const CACHE_MS = 60_000;

const SIDEBAR_SELECTORS = ['#partial-discussion-sidebar', '[data-testid="sidebar"]', '.Layout-sidebar'];

const OCTICON_PATHS = {
  pr: 'M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z',
  draft: 'M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.251 2.251 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5ZM2.5 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM3.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm9.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14 7.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm0-4.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z',
};

const octicon = (name, className) => {
  const span = document.createElement('span');
  span.className = className;
  span.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${OCTICON_PATHS[name]}"/></svg>`;
  return span;
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const listQuery = (branches) => `is:pr is:open ${branches.map((b) => `base:${b}`).join(' ')}`;
const listUrl = (repo, branches) => `/${repo}/pulls?q=${encodeURIComponent(listQuery(branches))}`;

// Several base: qualifiers are OR'ed by GitHub search, so one request covers
// every protected branch. The list page embeds its results as JSON for React.
async function fetchPullsPage(repo, query, page = 1) {
  const res = await fetch(`/${repo}/pulls?q=${encodeURIComponent(query)}&page=${page}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  for (const script of doc.querySelectorAll('script[data-target="react-app.embeddedData"]')) {
    const route = JSON.parse(script.textContent)?.payload?.repoPullsDashboardContentRoute;
    if (!route) continue;
    return {
      total: route.totalCount ?? 0,
      totalPages: route.totalPages ?? 1,
      prs: (route.results ?? []).map((pr) => ({
        number: pr.number,
        title: pr.title,
        url: pr.permalink,
        draft: pr.isDraft === true || /DRAFT/.test(pr.displayState ?? ''),
      })),
    };
  }
  throw new Error('PR list format not recognised');
}

const fetchProtectedPrs = (repo, branches) => fetchPullsPage(repo, listQuery(branches));

const cache = new Map();
function cachedPrs(repo, branches) {
  const key = listUrl(repo, branches);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = fetchProtectedPrs(repo, branches);
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

// The search includes the current PR itself when it is open; leave it out of the count.
function otherOpenCount(data, number) {
  const includesSelf = data.prs.some((pr) => pr.number === number);
  return Math.max(0, data.total - (includesSelf ? 1 : 0));
}

function render(block, state, ctx) {
  const content = block.querySelector('.ghrl-content');
  const pill = block.querySelector('.ghrl-pill');
  const body = content.querySelector('.ghrl-body');
  body.replaceChildren();

  if (state.kind === 'loading') {
    pill.textContent = '…';
    body.appendChild(el('div', 'ghrl-skeleton'));
    body.appendChild(el('div', 'ghrl-skeleton'));
    return;
  }
  if (state.kind === 'error') {
    pill.textContent = '?';
    body.appendChild(el('div', 'ghrl-error', `Could not load PRs: ${state.message}`));
  } else {
    const others = state.data.prs.filter((pr) => pr.number !== ctx.number);
    pill.textContent = String(otherOpenCount(state.data, ctx.number));
    if (others.length === 0) {
      body.appendChild(el('div', 'ghrl-empty', 'No other open PRs.'));
    }
    for (const pr of others.slice(0, MAX_ROWS)) {
      const link = el('a', `ghrl-link ghrl-row--${pr.draft ? 'draft' : 'open'}`);
      link.href = pr.url;
      link.title = pr.title;
      link.appendChild(octicon(pr.draft ? 'draft' : 'pr', 'ghrl-icon'));
      link.appendChild(el('span', 'ghrl-ref', `#${pr.number}`));
      link.appendChild(el('span', 'ghrl-title', pr.title || '(untitled)'));
      body.appendChild(link);
    }
  }
  const more = el('a', 'ghrl-more', state.kind === 'ready' && state.data.total > MAX_ROWS ? 'View all in PR list' : 'Open in PR list');
  more.href = listUrl(ctx.repo, ctx.branches);
  body.appendChild(more);
}

// The branches are part of the key: the same PR can move to another colour's base.
const blockKey = (ctx) => `${ctx.repo}#${ctx.number}|${ctx.branches.join(',')}`;

function buildBlock(ctx) {
  const block = el('div', 'ghrl-block');
  block.id = BLOCK_ID;
  block.dataset.key = blockKey(ctx);
  const iconCol = el('div', 'ghrl-icon-col');
  iconCol.appendChild(octicon('pr', 'ghrl-head-icon'));
  const content = el('div', 'ghrl-content');
  const header = el('div', 'ghrl-header');
  header.appendChild(el('span', 'ghrl-heading', `Open PRs into ${ctx.branches.join(', ')}`));
  header.appendChild(el('span', 'ghrl-pill'));
  content.appendChild(header);
  content.appendChild(el('div', 'ghrl-body'));
  block.appendChild(iconCol);
  block.appendChild(content);
  return block;
}

// Called on every DOM change, so the already-mounted path must stay cheap.
function showProtectedPrList(ctx) {
  if (document.getElementById(BLOCK_ID)?.dataset.key === blockKey(ctx)) return;
  removeProtectedPrList();

  const sidebar = SIDEBAR_SELECTORS.map((s) => document.querySelector(s)).find(Boolean);
  if (!sidebar) return;

  const block = buildBlock(ctx);
  sidebar.insertBefore(block, sidebar.firstChild);
  render(block, { kind: 'loading' }, ctx);
  cachedPrs(ctx.repo, ctx.branches).then(
    (data) => block.isConnected && render(block, { kind: 'ready', data }, ctx),
    (err) => block.isConnected && render(block, { kind: 'error', message: err.message }, ctx),
  );
}

function removeProtectedPrList() {
  document.getElementById(BLOCK_ID)?.remove();
}
