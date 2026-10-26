// Shared by the content script, popup and options page. Settings live in
// chrome.storage.sync; every page listens to onChanged so edits apply live.

const SETTINGS_KEY = 'settings';

// A new colour group takes the first preset no group uses yet, so the order
// puts clearly different hues first.
const COLOR_PRESETS = [
  { name: 'Pale red', bgLight: '#ffebe9', bgDark: '#2d1215', bar: '#cf222e' },
  { name: 'Green', bgLight: '#dafbe1', bgDark: '#12261e', bar: '#1a7f37' },
  { name: 'Blue', bgLight: '#ddf4ff', bgDark: '#0c2340', bar: '#0969da' },
  { name: 'Orange', bgLight: '#fff1e5', bgDark: '#2e1b0c', bar: '#bc4c00' },
  { name: 'Yellow', bgLight: '#fff8c5', bgDark: '#2b2111', bar: '#9a6700' },
  { name: 'Purple', bgLight: '#fbefff', bgDark: '#271630', bar: '#8250df' },
  { name: 'Red', bgLight: '#ffcecb', bgDark: '#4c1419', bar: '#a40e26' },
];

// Each colour group tints PRs into its own branches. The settings item has to
// stay under the 8 KB storage.sync quota, so the number of groups is capped.
const MAX_GROUPS = 8;

const colours = ({ bgLight, bgDark, bar }) => ({ bgLight, bgDark, bar });

const DEFAULT_GROUP = { branches: ['main', 'master', 'prod', 'production'], ...colours(COLOR_PRESETS[0]) };

const DEFAULT_SETTINGS = {
  tintEnabled: true,
  showBlock: true,
  highlightList: true,
  groups: [DEFAULT_GROUP],
};

// Before 1.5 there was one colour, kept as top-level branches/bgLight/bgDark/bar.
// Those become the first group, so an upgrade changes nothing on screen.
const legacyGroup = (stored) => ({ ...DEFAULT_GROUP, ...stored });

function normalizeSettings(raw) {
  const stored = typeof raw === 'object' && raw !== null ? raw : {};
  const groups = Array.isArray(stored.groups) && stored.groups.length ? stored.groups : [legacyGroup(stored)];
  return {
    tintEnabled: stored.tintEnabled ?? DEFAULT_SETTINGS.tintEnabled,
    showBlock: stored.showBlock ?? DEFAULT_SETTINGS.showBlock,
    highlightList: stored.highlightList ?? DEFAULT_SETTINGS.highlightList,
    groups: groups.slice(0, MAX_GROUPS).map((g) => ({ branches: [...(g.branches ?? [])], ...colours({ ...DEFAULT_GROUP, ...g }) })),
  };
}

// The first group is mirrored into the pre-1.5 keys so an older version still
// running on another synced browser keeps its protected branches.
const toStored = (settings) => ({ ...settings, branches: settings.groups[0].branches, ...colours(settings.groups[0]) });

async function loadSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

// Writes are chained so two quick clicks cannot both read the old value and
// the second overwrite the first. A function patch is applied to the fresh value.
let writeQueue = Promise.resolve();
function saveSettings(patch) {
  const write = writeQueue.then(async () => {
    const current = await loadSettings();
    const next = normalizeSettings({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) });
    await chrome.storage.sync.set({ [SETTINGS_KEY]: toStored(next) });
    return next;
  });
  writeQueue = write.catch(() => {});
  return write;
}

function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      callback(normalizeSettings(changes[SETTINGS_KEY].newValue));
    }
  });
}

// "*" matches any run of characters, so "release/*" covers "release/1.2".
const patternToRegExp = (pattern) =>
  new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

const branchMatches = (branch, patterns) =>
  branch != null && patterns.some((p) => patternToRegExp(p).test(branch));

const isWildcard = (pattern) => pattern.includes('*');

// First match wins, so a branch listed in two groups takes the upper colour.
const groupFor = (branch, groups) => groups.find((g) => branchMatches(branch, g.branches)) ?? null;

// Names GitHub search can look up for a group: exact names that no upper group claims.
const searchableBranches = (group, groups) =>
  group.branches.filter((b) => !isWildcard(b) && groupFor(b, groups) === group);

const sameColours = (a, b) => a.bgLight === b.bgLight && a.bgDark === b.bgDark && a.bar === b.bar;

// Groups have no names; the UI calls them by their preset colour.
const colourName = (group) => COLOR_PRESETS.find((p) => sameColours(p, group))?.name.toLowerCase() ?? 'custom';

const newGroup = (groups) => ({
  branches: [],
  ...colours(COLOR_PRESETS.find((p) => !groups.some((g) => sameColours(g, p))) ?? COLOR_PRESETS[0]),
});

function parseBranches(text) {
  return [...new Set(text.split(/[\s,]+/).map((b) => b.trim()).filter(Boolean))];
}
