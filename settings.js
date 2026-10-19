// Shared by the content script, popup and options page. Settings live in
// chrome.storage.sync; every page listens to onChanged so edits apply live.

const SETTINGS_KEY = 'settings';

const COLOR_PRESETS = [
  { name: 'Pale red', bgLight: '#ffebe9', bgDark: '#2d1215', bar: '#cf222e' },
  { name: 'Red', bgLight: '#ffcecb', bgDark: '#4c1419', bar: '#a40e26' },
  { name: 'Orange', bgLight: '#fff1e5', bgDark: '#2e1b0c', bar: '#bc4c00' },
  { name: 'Yellow', bgLight: '#fff8c5', bgDark: '#2b2111', bar: '#9a6700' },
  { name: 'Purple', bgLight: '#fbefff', bgDark: '#271630', bar: '#8250df' },
];

const DEFAULT_SETTINGS = {
  tintEnabled: true,
  showBlock: true,
  branches: ['main', 'master', 'prod', 'production'],
  bgLight: COLOR_PRESETS[0].bgLight,
  bgDark: COLOR_PRESETS[0].bgDark,
  bar: COLOR_PRESETS[0].bar,
};

async function loadSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY];
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...raw };
}

// Writes are chained so two quick clicks cannot both read the old value and
// the second overwrite the first.
let writeQueue = Promise.resolve();
function saveSettings(patch) {
  const write = writeQueue.then(async () => {
    const next = { ...(await loadSettings()), ...patch };
    await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
    return next;
  });
  writeQueue = write.catch(() => {});
  return write;
}

function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      callback({ ...DEFAULT_SETTINGS, ...changes[SETTINGS_KEY].newValue });
    }
  });
}

// "*" matches any run of characters, so "release/*" covers "release/1.2".
const patternToRegExp = (pattern) =>
  new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

const branchMatches = (branch, patterns) =>
  branch != null && patterns.some((p) => patternToRegExp(p).test(branch));

const isWildcard = (pattern) => pattern.includes('*');

function parseBranches(text) {
  return [...new Set(text.split(/[\s,]+/).map((b) => b.trim()).filter(Boolean))];
}
