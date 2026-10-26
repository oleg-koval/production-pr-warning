// Toolbar popup: what the current tab merges into, then quick edits. Each
// change saves straight to storage, so open GitHub tabs update without a reload.

const root = document.documentElement;
const statusCard = document.getElementById('status');
const toggles = [...document.querySelectorAll('[data-setting]')];
const groupsEl = document.getElementById('groups');
const addGroup = document.getElementById('add-group');
const removeGroup = document.getElementById('remove-group');
const presets = document.getElementById('presets');
const custom = document.getElementById('custom');
const picker = document.getElementById('picker');
const wheel = document.getElementById('wheel');
const knob = document.getElementById('knob');
const saveError = document.getElementById('save-error');

let settings = { ...DEFAULT_SETTINGS };
// The colour group whose colour the swatches and wheel edit. Until the user
// picks one, it follows the group the current tab merges into.
let selected = 0;
let followTab = true;

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
    state = await chrome.tabs.sendMessage(tab.id, { type: 'redline:state', groups: settings.groups });
  } catch {
    // No content script answered: not a github.com tab, or it loaded before the extension.
  }
  if (request === statusRequest) renderStatus(state);
}

function renderStatus(state) {
  const rows = [];
  let calm = true;
  if (!state) {
    rows.push(
      el('div', 'v', 'Can’t read this tab'),
      el('div', 'k', 'On GitHub? Reload the tab. Tabs opened before PR Redline was installed or updated can’t be read.'),
    );
    rows[0].style.fontSize = '13px';
  } else if (state.kind === 'other') {
    rows.push(el('div', 'v', 'Not a pull request page'), el('div', 'k', 'Open a pull request, or a repo’s Pull requests tab'));
    rows[0].style.fontSize = '13px';
  } else if (state.kind === 'list') {
    const marked = settings.highlightList
      ? `${state.marked} PR${state.marked === 1 ? '' : 's'} on this page marked by colour`
      : 'Mark PR lists is off';
    rows.push(el('div', 'v', 'Pull request list'), el('div', 'k', `${state.repo} · ${marked}`));
    rows[0].style.fontSize = '13px';
  } else if (!state.base) {
    rows.push(el('div', 'v', 'Reading the base branch…'), el('div', 'k', state.repo));
    rows[0].style.fontSize = '13px';
  } else {
    const group = groupFor(state.base, settings.groups);
    calm = !group;
    const value = el('div', 'v');
    value.append(el('code', '', state.base), group ? `${colourName(group)} group` : 'no colour');
    const details = [state.kind === 'pull' ? `${state.repo} #${state.number}` : state.repo];
    if (state.done) details.push('merged or closed');
    if (group && state.others !== undefined) {
      details.push(`${state.others} more open PR${state.others === 1 ? '' : 's'} into ${colourName(group)} branches`);
    }
    if (group) {
      statusCard.style.setProperty('--tint-light', group.bgLight);
      statusCard.style.setProperty('--tint-dark', group.bgDark);
      statusCard.style.setProperty('--bar', group.bar);
    }
    if (group && followTab) {
      followTab = false;
      select(settings.groups.indexOf(group));
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

// A refused save (too many branches for storage.sync) is shown here rather than lost.
function guard(promise) {
  return promise.then(
    () => (saveError.hidden = true),
    (error) => {
      saveError.textContent = error.message;
      saveError.hidden = false;
    },
  );
}

for (const button of toggles) {
  button.addEventListener('click', () => {
    const key = button.dataset.setting;
    guard(saveSettings({ [key]: !settings[key] }));
  });
}

// --- Colour groups ---

const updateGroup = (index, change) =>
  saveSettings((current) => ({ groups: current.groups.map((g, i) => (i === index ? change(g) : g)) }));

function select(index) {
  selected = index;
  apply(settings);
}

let rows = [];

// Rows are rebuilt only when a group is added, removed, recoloured or selected;
// chips are refreshed in place, so an open branch input keeps its focus.
function renderGroups() {
  const shape = JSON.stringify([selected, settings.groups.map(colours)]);
  if (groupsEl.dataset.shape !== shape) {
    groupsEl.dataset.shape = shape;
    rows = settings.groups.map(buildRow);
    groupsEl.replaceChildren(...rows.map((r) => r.row));
  }
  rows.forEach((r, index) => renderChips(r, index));
  addGroup.hidden = settings.groups.length >= MAX_GROUPS;
  removeGroup.hidden = settings.groups.length < 2;
}

function buildRow(group, index) {
  const name = colourName(group);
  const row = el('div', 'group');
  row.setAttribute('role', 'listitem');
  row.setAttribute('aria-current', String(index === selected));
  const swatch = el('button', 'swatch');
  swatch.type = 'button';
  swatch.title = `Edit the ${name} colour`;
  swatch.setAttribute('aria-label', swatch.title);
  swatch.style.setProperty('--l', group.bgLight);
  swatch.style.setProperty('--d', group.bgDark);
  swatch.style.setProperty('--b', group.bar);
  swatch.addEventListener('click', () => {
    followTab = false;
    select(index);
  });
  const list = el('ul');
  const add = el('button', 'add', '+ add');
  add.type = 'button';
  const input = el('input');
  input.hidden = true;
  input.placeholder = 'release/*';
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', `New branch for the ${name} colour`);
  const chips = el('div', 'chips');
  chips.append(list, add, input);
  row.append(swatch, chips);
  wireBranchInput(index, add, input);
  return { row, list, add };
}

function renderChips({ list }, index) {
  const { branches } = settings.groups[index];
  const key = branches.join('\n');
  if (list.dataset.key === key) return;
  list.dataset.key = key;
  list.replaceChildren(
    ...branches.map((branch, position) => {
      const item = el('li');
      const remove = el('button', '', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${branch}`);
      remove.title = `Remove ${branch}`;
      remove.addEventListener('click', () => removeBranch(index, branch, position));
      item.append(el('code', '', branch), remove);
      return item;
    }),
  );
}

function removeBranch(index, branch, position) {
  guard(
    updateGroup(index, (g) => ({ ...g, branches: g.branches.filter((b) => b !== branch) })).then((saved) => {
      update(saved);
      const { list, add } = rows[index];
      const buttons = list.querySelectorAll('button');
      (buttons[Math.min(position, buttons.length - 1)] ?? add).focus();
    }),
  );
}

function wireBranchInput(index, add, input) {
  const commit = () => {
    const added = parseBranches(input.value);
    input.value = '';
    if (added.length) guard(updateGroup(index, (g) => ({ ...g, branches: [...new Set([...g.branches, ...added])] })));
  };
  const close = () => {
    input.hidden = true;
    add.hidden = false;
  };
  add.addEventListener('click', () => {
    add.hidden = true;
    input.hidden = false;
    input.value = '';
    input.focus();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Stay open after Enter so several branches can go in one go.
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      input.value = '';
      close();
      add.focus();
    }
  });
  input.addEventListener('blur', () => {
    if (input.hidden) return;
    commit();
    close();
  });
}

addGroup.addEventListener('click', () => {
  flushWheel();
  guard(
    saveSettings((current) => ({ groups: [...current.groups, newGroup(current.groups)] })).then((saved) => {
      followTab = false;
      selected = saved.groups.length - 1;
      update(saved);
      rows[selected].add.click();
    }),
  );
});

removeGroup.addEventListener('click', () => {
  // A pending wheel save names its group by row, so it goes out before the rows shift.
  flushWheel();
  const index = selected;
  guard(
    saveSettings((current) => ({ groups: current.groups.filter((_, i) => i !== index) })).then((saved) => {
      selected = Math.max(0, index - 1);
      update(saved);
    }),
  );
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
    // A preset is the latest choice, so it must not be overwritten by a wheel save still waiting.
    flushWheel();
    guard(updateGroup(selected, (g) => ({ ...g, ...colours(preset) })));
  });
  presets.appendChild(button);
  return { preset, button };
});

let wheelPos = wheelFromBar(DEFAULT_GROUP.bar);

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
let pendingWheelSave = null;
let dragging = false;
function saveWheel(delay = 0) {
  const index = selected;
  clearTimeout(saveTimer);
  pendingWheelSave = () => guard(updateGroup(index, (g) => ({ ...g, ...comboFor(wheelPos) })));
  saveTimer = setTimeout(flushWheel, delay);
}

// Sends a waiting wheel save now, with the latest wheel position.
function flushWheel() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const save = pendingWheelSave;
  pendingWheelSave = null;
  save();
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
  const statusChanged =
    JSON.stringify(next.groups) !== JSON.stringify(settings.groups) || next.highlightList !== settings.highlightList;
  settings = next;
  selected = Math.min(selected, settings.groups.length - 1);
  for (const button of toggles) button.setAttribute('aria-pressed', String(settings[button.dataset.setting]));
  renderGroups();
  // While the wheel is moving, an older save echoing back must not pull it back.
  if (dragging || saveTimer !== null) return statusChanged;
  const group = settings.groups[selected];
  // Keep the knob where the user put it unless the colours came from elsewhere.
  if (comboFor(wheelPos).bar !== group.bar) wheelPos = wheelFromBar(group.bar);
  placeKnob();
  showColours(group);
  return statusChanged;
}

// The status card only depends on the colour groups and the list toggle.
function update(next) {
  if (apply(next)) refreshStatus();
}

document.getElementById('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

onSettingsChanged(update);
loadSettings().then((loaded) => {
  apply(loaded);
  refreshStatus();
});
