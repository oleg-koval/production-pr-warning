// Toolbar popup: quick toggles and colour presets. Each change saves straight
// to storage, so open GitHub tabs update without a reload.

const tintEnabled = document.getElementById('tintEnabled');
const showBlock = document.getElementById('showBlock');
const highlightList = document.getElementById('highlightList');
const swatches = document.getElementById('swatches');
const branches = document.getElementById('branches');

const isPresetActive = (preset, s) =>
  preset.bgLight === s.bgLight && preset.bgDark === s.bgDark && preset.bar === s.bar;

function render(s) {
  tintEnabled.checked = s.tintEnabled;
  showBlock.checked = s.showBlock;
  highlightList.checked = s.highlightList;
  branches.textContent = s.branches.join(', ');
  swatches.replaceChildren(
    ...COLOR_PRESETS.map((preset) => {
      const button = document.createElement('button');
      button.className = `swatch${isPresetActive(preset, s) ? ' active' : ''}`;
      button.title = preset.name;
      button.style.background = preset.bgLight;
      button.style.borderTopColor = preset.bar;
      button.addEventListener('click', () => {
        const { bgLight, bgDark, bar } = preset;
        saveSettings({ bgLight, bgDark, bar }).then(render);
      });
      return button;
    }),
  );
}

tintEnabled.addEventListener('change', () => saveSettings({ tintEnabled: tintEnabled.checked }));
showBlock.addEventListener('change', () => saveSettings({ showBlock: showBlock.checked }));
highlightList.addEventListener('change', () => saveSettings({ highlightList: highlightList.checked }));
document.getElementById('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

onSettingsChanged(render);
loadSettings().then(render);
