const form = document.getElementById('form');
const groupsEl = document.getElementById('groups');
const addGroup = document.getElementById('add-group');
const fields = {
  tintEnabled: document.getElementById('tintEnabled'),
  showBlock: document.getElementById('showBlock'),
  highlightList: document.getElementById('highlightList'),
};
const status = document.getElementById('status');
const COLOUR_INPUTS = [
  ['bgLight', 'Light theme'],
  ['bgDark', 'Dark theme'],
  ['bar', 'Top bar'],
];

// Unsaved edits live here until Save, so moving or removing a card keeps what was typed in the others.
let draft = [];

function element(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function paintPreview(card, group) {
  for (const [key, side] of [['bgLight', 'light'], ['bgDark', 'dark']]) {
    const box = card.querySelector(`.preview .${side}`);
    box.style.background = group[key];
    box.style.borderTopColor = group.bar;
  }
}

function colourField(card, group, [key, text], index) {
  const id = `group-${index}-${key}`;
  const input = element('input', { type: 'color', id, value: group[key] });
  input.addEventListener('input', () => {
    group[key] = input.value;
    paintPreview(card, group);
  });
  return element('div', {}, [element('label', { htmlFor: id, textContent: text }), input]);
}

function presetButton(card, group, preset) {
  const button = element('button', { type: 'button', className: 'swatch', textContent: preset.name });
  button.style.background = preset.bgLight;
  button.style.borderTopColor = preset.bar;
  button.addEventListener('click', () => {
    Object.assign(group, colours(preset));
    for (const [key] of COLOUR_INPUTS) card.querySelector(`[id$='-${key}']`).value = group[key];
    paintPreview(card, group);
  });
  return button;
}

function actionButton(text, label, disabled, onClick) {
  const button = element('button', { type: 'button', className: 'icon', textContent: text, disabled });
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

function move(index, step) {
  const target = index + step;
  draft = draft.map((group, i) => (i === index ? draft[target] : i === target ? draft[index] : group));
  renderGroups();
}

function buildCard(group, index) {
  const textareaId = `group-${index}-branches`;
  const textarea = element('textarea', { id: textareaId, value: group.text, spellcheck: false, placeholder: 'main' });
  textarea.addEventListener('input', () => (group.text = textarea.value));
  const card = element('div', { className: 'group' });
  card.setAttribute('role', 'listitem');
  card.append(
    element('div', { className: 'group-main' }, [
      element('label', { htmlFor: textareaId, textContent: 'Branches' }),
      textarea,
      element('div', { className: 'colors' }, COLOUR_INPUTS.map((entry) => colourField(card, group, entry, index))),
      element('div', { className: 'swatches' }, COLOR_PRESETS.map((preset) => presetButton(card, group, preset))),
      element('div', { className: 'preview' }, [
        element('div', { className: 'light', textContent: 'Light theme preview' }),
        element('div', { className: 'dark', textContent: 'Dark theme preview' }),
      ]),
    ]),
    element('div', { className: 'group-actions' }, [
      actionButton('↑', 'Move this colour up', index === 0, () => move(index, -1)),
      actionButton('↓', 'Move this colour down', index === draft.length - 1, () => move(index, 1)),
      actionButton('Remove', 'Remove this colour', draft.length === 1, () => {
        draft = draft.filter((_, i) => i !== index);
        renderGroups();
      }),
    ]),
  );
  paintPreview(card, group);
  return card;
}

function renderGroups() {
  groupsEl.replaceChildren(...draft.map(buildCard));
  addGroup.hidden = draft.length >= MAX_GROUPS;
}

const toDraft = (group) => ({ id: group.id, text: group.branches.join('\n'), ...colours(group) });

function fill(s) {
  draft = s.groups.map(toDraft);
  renderGroups();
  fields.tintEnabled.checked = s.tintEnabled;
  fields.showBlock.checked = s.showBlock;
  fields.highlightList.checked = s.highlightList;
}

function flash(text, isError = false) {
  status.textContent = text;
  status.classList.toggle('error', isError);
  setTimeout(() => {
    status.textContent = '';
    status.classList.remove('error');
  }, 1500);
}

addGroup.addEventListener('click', () => {
  draft = [...draft, toDraft(newGroup(draft))];
  renderGroups();
  groupsEl.lastElementChild.querySelector('textarea').focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  saveSettings({
    groups: draft.map((group) => ({ id: group.id, branches: parseBranches(group.text), ...colours(group) })),
    tintEnabled: fields.tintEnabled.checked,
    showBlock: fields.showBlock.checked,
    highlightList: fields.highlightList.checked,
  }).then(
    (saved) => {
      fill(saved);
      flash('Saved');
    },
    (error) => flash(error.message, true),
  );
});

document.getElementById('reset').addEventListener('click', () => {
  saveSettings(DEFAULT_SETTINGS).then((saved) => {
    fill(saved);
    flash('Reset');
  });
});

onSettingsChanged(fill);
loadSettings().then(fill);
