const form = document.getElementById('form');
const fields = {
  branches: document.getElementById('branches'),
  bgLight: document.getElementById('bgLight'),
  bgDark: document.getElementById('bgDark'),
  bar: document.getElementById('bar'),
  tintEnabled: document.getElementById('tintEnabled'),
  showBlock: document.getElementById('showBlock'),
  highlightList: document.getElementById('highlightList'),
};
const status = document.getElementById('status');

function preview() {
  const light = document.getElementById('previewLight');
  const dark = document.getElementById('previewDark');
  light.style.background = fields.bgLight.value;
  dark.style.background = fields.bgDark.value;
  light.style.borderTopColor = fields.bar.value;
  dark.style.borderTopColor = fields.bar.value;
}

function fill(s) {
  fields.branches.value = s.branches.join('\n');
  fields.bgLight.value = s.bgLight;
  fields.bgDark.value = s.bgDark;
  fields.bar.value = s.bar;
  fields.tintEnabled.checked = s.tintEnabled;
  fields.showBlock.checked = s.showBlock;
  fields.highlightList.checked = s.highlightList;
  preview();
}

function flash(text) {
  status.textContent = text;
  setTimeout(() => (status.textContent = ''), 1500);
}

document.getElementById('swatches').replaceChildren(
  ...COLOR_PRESETS.map((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.textContent = preset.name;
    button.style.background = preset.bgLight;
    button.style.borderTopColor = preset.bar;
    button.addEventListener('click', () => {
      fields.bgLight.value = preset.bgLight;
      fields.bgDark.value = preset.bgDark;
      fields.bar.value = preset.bar;
      preview();
    });
    return button;
  }),
);

for (const input of [fields.bgLight, fields.bgDark, fields.bar]) input.addEventListener('input', preview);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  saveSettings({
    branches: parseBranches(fields.branches.value),
    bgLight: fields.bgLight.value,
    bgDark: fields.bgDark.value,
    bar: fields.bar.value,
    tintEnabled: fields.tintEnabled.checked,
    showBlock: fields.showBlock.checked,
    highlightList: fields.highlightList.checked,
  }).then((saved) => {
    fill(saved);
    flash('Saved');
  });
});

document.getElementById('reset').addEventListener('click', () => {
  saveSettings(DEFAULT_SETTINGS).then((saved) => {
    fill(saved);
    flash('Reset');
  });
});

onSettingsChanged(fill);
loadSettings().then(fill);
