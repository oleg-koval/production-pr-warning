// Toolbar popup: what the current tab merges into, then quick edits. Each
// change saves straight to storage, so open GitHub tabs update without a reload.

const root = document.documentElement;
const statusCard = document.getElementById('status');
const toggles = [...document.querySelectorAll('[data-setting]')];
const branchList = document.getElementById('branches');
const addBranch = document.getElementById('add-branch');
const branchInput = document.getElementById('branch-input');
const presets = document.getElementById('presets');
const custom = document.getElementById('custom');
const picker = document.getElementById('picker');
const wheel = document.getElementById('wheel');
const knob = document.getElementById('knob');

let settings = { ...DEFAULT_SETTINGS };

// --- Colour maths. Storage and the options page work in hex. ---

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (!d) return { h: 0, s: 0, l: l * 100 };
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: (d / (1 - Math.abs(2 * l - 1))) * 100, l: l * 100 };
}

// One wheel position gives the whole combo. Yellows and greens get a darker
// bar, otherwise it disappears against a light page.
function comboFor({ h, s }) {
  const darkBar = h >= 45 && h <= 170;
  return {
    bgLight: hslToHex(h, 100 * s, 95),
    bgDark: hslToHex(h, 45 * s, 13),
    bar: hslToHex(h, 75 * s, darkBar ? 32 : 45),
  };
}

const wheelFromBar = (bar) => {
  const { h, s } = hexToHsl(bar);
  return { h, s: Math.min(1, s / 75) };
};

// --- Current tab status ---

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// Only the newest request may paint, so a slow reply cannot overwrite a fresh one.
let statusRequest = 0;
async function refreshStatus() {
  const request = ++statusRequest;
  let state = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state = await chrome.tabs.sendMessage(tab.id, { type: 'redline:state', branches: settings.branches });
  } catch {
    // No content script answered: not a github.com tab, or it loaded before the extension.
  }
  if (request === statusRequest) renderStatus(state);
}

function renderStatus(state) {
  const rows = [];
  let calm = true;
  if (!state || state.kind === 'other') {
    rows.push(el('div', 'v', 'Not a pull request page'), el('div', 'k', 'Open a PR on github.com to see its base'));
    rows[0].style.fontSize = '13px';
  } else if (!state.base) {
    rows.push(el('div', 'v', 'Reading the base branch…'), el('div', 'k', state.repo));
    rows[0].style.fontSize = '13px';
  } else {
    calm = !branchMatches(state.base, settings.branches);
    const value = el('div', 'v');
    value.append(el('code', '', state.base), calm ? 'not protected' : 'protected');
    const details = [state.kind === 'pull' ? `${state.repo} #${state.number}` : state.repo];
    if (state.done) details.push('merged or closed');
    if (!calm && state.others !== undefined) {
      details.push(`${state.others} more open PR${state.others === 1 ? '' : 's'} into protected branches`);
    }
    rows.push(
      el('div', 'k', state.kind === 'pull' ? 'This pull request merges into' : 'This new pull request would merge into'),
      value,
      el('div', 'k', details.join(' · ')),
    );
  }
  statusCard.classList.toggle('calm', calm);
  statusCard.replaceChildren(...rows);
}

// --- Toggles ---

for (const button of toggles) {
  button.addEventListener('click', () => {
    const key = button.dataset.setting;
    saveSettings({ [key]: !settings[key] });
  });
}

// --- Protected branches ---

// Rebuilt only when the list changes, so focus survives the storage echo.
function renderBranches() {
  const key = settings.branches.join('\n');
  if (branchList.dataset.key === key) return;
  branchList.dataset.key = key;
  branchList.replaceChildren(
    ...settings.branches.map((branch, index) => {
      const item = el('li');
      const remove = el('button', '', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${branch}`);
      remove.title = `Remove ${branch}`;
      remove.addEventListener('click', () => removeBranch(branch, index));
      item.append(el('code', '', branch), remove);
      return item;
    }),
  );
}

function removeBranch(branch, index) {
  saveSettings({ branches: settings.branches.filter((b) => b !== branch) }).then((saved) => {
    update(saved);
    const buttons = branchList.querySelectorAll('button');
    (buttons[Math.min(index, buttons.length - 1)] ?? addBranch).focus();
  });
}

function openBranchInput() {
  addBranch.hidden = true;
  branchInput.hidden = false;
  branchInput.value = '';
  branchInput.focus();
}

function closeBranchInput({ commit }) {
  const added = commit ? parseBranches(branchInput.value) : [];
  branchInput.value = '';
  if (added.length) saveSettings({ branches: [...new Set([...settings.branches, ...added])] });
  return added.length;
}

addBranch.addEventListener('click', openBranchInput);
branchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    // Stay open after Enter so several branches can go in one go.
    closeBranchInput({ commit: true });
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeBranchInput({ commit: false });
    branchInput.hidden = true;
    addBranch.hidden = false;
    addBranch.focus();
  }
});
branchInput.addEventListener('blur', () => {
  if (branchInput.hidden) return;
  closeBranchInput({ commit: true });
  branchInput.hidden = true;
  addBranch.hidden = false;
});

// --- Colours: presets and the wheel ---

const presetButtons = COLOR_PRESETS.map((preset) => {
  const button = el('button', 'swatch');
  button.type = 'button';
  button.title = preset.name;
  button.setAttribute('aria-label', preset.name);
  button.style.setProperty('--l', preset.bgLight);
  button.style.setProperty('--d', preset.bgDark);
  button.style.setProperty('--b', preset.bar);
  button.addEventListener('click', () => {
    const { bgLight, bgDark, bar } = preset;
    saveSettings({ bgLight, bgDark, bar });
  });
  presets.appendChild(button);
  return { preset, button };
});

const sameColours = (a, b) => a.bgLight === b.bgLight && a.bgDark === b.bgDark && a.bar === b.bar;

let wheelPos = wheelFromBar(DEFAULT_SETTINGS.bar);

// Paints a colour combo everywhere in the popup without saving it.
function showColours(colours) {
  root.style.setProperty('--tint-light', colours.bgLight);
  root.style.setProperty('--tint-dark', colours.bgDark);
  root.style.setProperty('--bar', colours.bar);
  let matched = false;
  for (const { preset, button } of presetButtons) {
    const active = sameColours(preset, colours);
    matched ||= active;
    button.setAttribute('aria-pressed', String(active));
  }
  custom.classList.toggle('active', !matched);
  for (const [name, value] of [['light', colours.bgLight], ['dark', colours.bgDark], ['bar', colours.bar]]) {
    document.getElementById(`swatch-${name}`).style.background = value;
    document.getElementById(`hex-${name}`).textContent = value;
  }
}

function placeKnob() {
  const radians = (wheelPos.h * Math.PI) / 180;
  knob.style.left = `${50 + 50 * wheelPos.s * Math.sin(radians)}%`;
  knob.style.top = `${50 - 50 * wheelPos.s * Math.cos(radians)}%`;
  wheel.setAttribute('aria-valuenow', String(Math.round(wheelPos.h)));
  wheel.setAttribute('aria-valuetext', `Hue ${Math.round(wheelPos.h)} degrees, strength ${Math.round(wheelPos.s * 100)}%`);
}

function previewWheel() {
  placeKnob();
  showColours(comboFor(wheelPos));
}

// storage.sync allows about 120 writes a minute: drags save once on release,
// arrow keys after a short pause.
let saveTimer = null;
let dragging = false;
function saveWheel(delay = 0) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSettings(comboFor(wheelPos));
  }, delay);
}

function pick(event) {
  const rect = wheel.getBoundingClientRect();
  const radius = rect.width / 2;
  const dx = event.clientX - rect.left - radius;
  const dy = event.clientY - rect.top - radius;
  wheelPos = {
    h: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360,
    s: Math.min(1, Math.hypot(dx, dy) / radius),
  };
  previewWheel();
}

wheel.addEventListener('pointerdown', (event) => {
  wheel.setPointerCapture(event.pointerId);
  dragging = true;
  pick(event);
});
wheel.addEventListener('pointermove', (event) => {
  if (wheel.hasPointerCapture(event.pointerId)) pick(event);
});
wheel.addEventListener('pointerup', () => {
  dragging = false;
  saveWheel();
});

wheel.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 15 : 5;
  const moves = {
    ArrowLeft: { h: -step },
    ArrowRight: { h: step },
    ArrowUp: { s: 0.05 },
    ArrowDown: { s: -0.05 },
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  wheelPos = {
    h: (wheelPos.h + (move.h ?? 0) + 360) % 360,
    s: Math.min(1, Math.max(0, wheelPos.s + (move.s ?? 0))),
  };
  previewWheel();
  saveWheel(400);
});

custom.addEventListener('click', () => {
  picker.hidden = !picker.hidden;
  custom.setAttribute('aria-expanded', String(!picker.hidden));
  if (!picker.hidden) wheel.focus();
});

// --- Wiring ---

function apply(next) {
  const branchesChanged = next.branches.join('\n') !== settings.branches.join('\n');
  settings = next;
  for (const button of toggles) button.setAttribute('aria-pressed', String(settings[button.dataset.setting]));
  renderBranches();
  // While the wheel is moving, an older save echoing back must not pull it back.
  if (dragging || saveTimer !== null) return branchesChanged;
  // Keep the knob where the user put it unless the colours came from elsewhere.
  if (comboFor(wheelPos).bar !== settings.bar) wheelPos = wheelFromBar(settings.bar);
  placeKnob();
  showColours(settings);
  return branchesChanged;
}

// The status card only depends on the branch list.
function update(next) {
  if (apply(next)) refreshStatus();
}

document.getElementById('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

onSettingsChanged(update);
loadSettings().then((loaded) => {
  apply(loaded);
  refreshStatus();
});
