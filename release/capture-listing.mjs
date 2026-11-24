import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Capture real installed UI in a disposable editor profile, never an owner's data.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { _electron: electron, expect } = require('@playwright/test');
const { resolveCliPathFromVSCodeExecutablePath } = require('@vscode/test-electron');
const { command, readyFrame, isolatedEditorEnvironment, closeOwnedEditor } =
  require(join(repo, 'extension/out/test/editor-helpers.js'));
assert.equal(typeof closeOwnedEditor, 'function', 'Compile the current test helpers before capturing the listing.');
const { DEFAULT_STATE } = require(join(repo, 'extension/out/charm-state.js'));
const { defaultCompanionState, applyCompanionAction } = require(join(repo, 'extension/out/companion-core.js'));
const options = Object.fromEntries(process.argv.slice(2).map(argument => {
  const match = /^--(vsix|dog|output)=(.+)$/.exec(argument);
  if (!match) throw new Error('Use --vsix=FILE --dog=FILE --output=DIRECTORY and VSCODE_EXECUTABLE.');
  return match.slice(1);
}));
if (!options.vsix || !options.dog || !options.output || !process.env.VSCODE_EXECUTABLE) {
  throw new Error('An explicit public VSIX, demo dog portrait, output directory and VSCODE_EXECUTABLE are required.');
}
const manifest = JSON.parse(readFileSync(join(repo, 'extension/package.json'), 'utf8'));
const identity = `${manifest.publisher}.${manifest.name}`;
const output = resolve(options.output);
const vsix = resolve(options.vsix);
const portrait = resolve(options.dog);
const executablePath = process.env.VSCODE_EXECUTABLE;
const profile = mkdtempSync(join(tmpdir(), 'charmbits-store-'));
const user = join(profile, 'user');
const extensions = join(profile, 'extensions');
const storage = join(user, 'User/globalStorage', identity);
mkdirSync(storage, { recursive: true });
mkdirSync(output, { recursive: true });
const saveJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
saveJson(join(storage, 'preferences.json'), {
  ...DEFAULT_STATE, charmId: 'live:cali', charmPinned: true, festiveEnabled: false,
  reducedMotion: true, rotateMessages: false, cordLength: 74, size: 190,
});
const now = Date.now();
const yesterday = new Date(now - 86400000);
const companion = applyCompanionAction(defaultCompanionState(), { type: 'feed-mode', mode: 'encouragement' }, now).state;
companion.garden = {
  plant: { id: 'demo-garden', flowerId: 'hibiscus', waterings: 10, plantedAt: now - 20 * 86400000 },
  collection: [],
  lastWateredDay: new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(yesterday),
  lastWateredAt: yesterday.getTime(),
};
saveJson(join(storage, 'companion.json'), companion);
saveJson(join(user, 'User/settings.json'), {
  'security.workspace.trust.emptyWindow': false,
  'security.workspace.trust.startupPrompt': 'never',
  'workbench.startupEditor': 'none',
  'workbench.colorTheme': 'Default Light Modern',
  'workbench.sideBar.location': 'right',
  'workbench.secondarySideBar.defaultVisibility': 'hidden',
  'chat.disableAIFeatures': true,
  'extensions.autoUpdate': false,
  'extensions.autoCheckUpdates': false,
  'window.commandCenter': false,
  'window.title': '${activeEditorShort} — Visual Studio Code',
  'editor.minimap.enabled': false,
  'editor.fontSize': 17,
  'editor.lineHeight': 29,
  'breadcrumbs.enabled': false,
  'telemetry.telemetryLevel': 'off',
});
const scratch = join(profile, 'little-wins.ts');
writeFileSync(scratch, [
  '// A little focus. A little room to breathe.',
  '',
  'type LittleWin = {',
  '  label: string;',
  '  done: boolean;',
  '};',
  '',
  'const today: LittleWin[] = [',
  '  { label: "Make one useful thing", done: true },',
  '  { label: "Take a proper break", done: true },',
  '  { label: "Call someone I love", done: false },',
  '];',
  '',
  'export function smallSteps(wins: LittleWin[]) {',
  '  return wins.filter(win => win.done);',
  '}',
  '',
  'console.log(smallSteps(today));',
  '',
].join('\n'));
const environment = isolatedEditorEnvironment();
const cliPath = process.env.VSCODE_CLI_PATH ?? resolveCliPathFromVSCodeExecutablePath(executablePath);
const installArgs = [`--user-data-dir=${user}`, `--extensions-dir=${extensions}`, '--install-extension', vsix, '--force'];
let installer = cliPath;
const installEnvironment = { ...environment };
if (process.platform === 'win32') {
  const entry = readFileSync(cliPath, 'utf8').match(/"%~dp0\.\.\\([^"]+cli\.js)"/)?.[1];
  if (!entry) throw new Error('Cannot resolve the vendor CLI entry point.');
  installArgs.unshift(resolve(dirname(cliPath), '..', entry));
  installer = executablePath;
  installEnvironment.ELECTRON_RUN_AS_NODE = '1';
  installEnvironment.VSCODE_DEV = '';
}
const installation = spawnSync(installer, installArgs, { env: installEnvironment, encoding: 'utf8', timeout: 90000 });
assert.equal(installation.status, 0, installation.stderr || installation.stdout);
const installed = JSON.parse(readFileSync(join(extensions, `${identity}-${manifest.version}`, 'package.json'), 'utf8'));
assert.equal(installed.version, manifest.version);
assert.notEqual(installed.charmbitsEdition, 'personal');
const app = await electron.launch({
  executablePath, env: environment, timeout: 45000,
  args: ['--new-window', `--user-data-dir=${user}`, `--extensions-dir=${extensions}`,
    '--force-device-scale-factor=1', '--skip-welcome', '--skip-release-notes',
    '--disable-telemetry', '--disable-updates', scratch],
});
const captures = [];
const evidence = { outputPath: filename => join(output, filename) };
try {
  const window = await app.firstWindow();
  assert.equal(realpathSync(await app.evaluate(({ app: host }) => host.getPath('userData'))), realpathSync(user));
  await app.evaluate(({ BrowserWindow }) => {
    const owned = BrowserWindow.getAllWindows()[0];
    owned.setIgnoreMouseEvents(true);
    owned.setSize(1360, 680);
  });
  await expect(window.locator('.part.activitybar a.action-label[aria-label="CharmBits"]')).toBeVisible({ timeout: 30000 });
  await command(window, 'CharmBits: Show Charm');
  const frame = await readyFrame(window);
  await expect(frame.locator('#app-version')).toHaveText(`v${manifest.version}`);
  await expect(frame.locator('#stage')).toHaveAttribute('data-charm', 'live:cali');
  if (await window.locator('.part.auxiliarybar').isVisible()) {
    await command(window, 'View: Toggle Secondary Side Bar');
  }
  const bannerClose = window.locator('.part.banner').getByRole('button', { name: /close/i });
  if (await bannerClose.isVisible()) await bannerClose.click();
  // Use the editor's real resize handle, so captures reflect a normal user layout.
  const sidebar = await window.locator('.part.sidebar').boundingBox();
  assert.ok(sidebar);
  const sashes = await window.locator('.monaco-sash.vertical:not(.disabled)').all();
  const candidates = [];
  for (const sash of sashes) {
    const box = await sash.boundingBox();
    if (box && box.height > sidebar.height / 2) candidates.push(box);
  }
  candidates.sort((a, b) => Math.abs(a.x + a.width / 2 - sidebar.x) - Math.abs(b.x + b.width / 2 - sidebar.x));
  const sash = candidates[0];
  assert.ok(sash && Math.abs(sash.x + sash.width / 2 - sidebar.x) < 20, 'Find the actual right sidebar resize handle.');
  await window.mouse.move(sash.x + sash.width / 2, sash.y + 100);
  await window.mouse.down();
  await window.mouse.move(sash.x + sash.width / 2 + sidebar.width - 420, sash.y + 100, { steps: 12 });
  await window.mouse.up();
  await expect.poll(async () => Math.round((await window.locator('.part.sidebar').boundingBox()).width)).toBe(420);

  async function capture(name, selector = '#app') {
    await expect(frame.locator('#stage')).toHaveAttribute('data-persisted', 'true');
    const notices = window.locator('.notifications-toasts');
    if (await notices.isVisible()) await command(window, 'Notifications: Clear All Notifications');
    await expect(notices).toBeHidden();
    await frame.evaluate(async () => {
      await document.fonts.ready;
      const visible = [...document.images].filter(image => {
        const box = image.getBoundingClientRect();
        if (!image.offsetParent || !image.getAttribute('src') || !box.width || !box.height) return false;
        let left = Math.max(0, box.left), top = Math.max(0, box.top);
        let right = Math.min(innerWidth, box.right), bottom = Math.min(innerHeight, box.bottom);
        // A tile can be inside the viewport but below its scroller's clipped edge.
        for (let parent = image.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          const bounds = parent.getBoundingClientRect();
          if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
            left = Math.max(left, bounds.left); right = Math.min(right, bounds.right);
          }
          if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
            top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom);
          }
        }
        return right > left && bottom > top;
      });
      let timer;
      try {
        await Promise.race([
          Promise.all(visible.map(image => image.decode())),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Visible artwork did not decode.')), 10000); }),
        ]);
      } finally { clearTimeout(timer); }
    });
    await window.mouse.move(400, 140);
    await frame.locator(selector).screenshot({ path: join(output, `${name}.png`) });
    captures.push({ name, selector, charm: await frame.locator('#stage').getAttribute('data-charm') });
    console.log(`Captured ${name}`);
  }
  async function appearance() {
    await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
    await frame.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  }
  await capture('cali');
  await window.screenshot({ path: join(output, 'cali-workspace.png') });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1360, 870));
  await frame.getByRole('button', { name: 'Browse charms', exact: true }).click();
  await expect(frame.locator('#charm-grid .charm-tile')).toHaveCount(241);
  await capture('collection', '#charm-picker');
  await frame.locator('#picker-close').click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1360, 680));

  await frame.getByRole('button', { name: 'Focus', exact: true }).click();
  await frame.locator('#focus-intent').fill('Make one useful thing');
  await frame.locator('#focus-start').click();
  await expect(frame.locator('#focus-pause')).toBeVisible();
  await frame.locator('#focus-pause').click();
  await expect(frame.locator('#focus-resume')).toBeVisible();
  await capture('focus', '#focus-panel');
  await frame.locator('#companion-close').click();

  await frame.getByRole('button', { name: 'Open garden', exact: true }).click();
  await expect(frame.locator('#garden-count')).toHaveText('10 / 11 waterings');
  await frame.getByRole('button', { name: 'Water plant', exact: true }).click();
  await expect(frame.locator('#garden-count')).toHaveText('11 / 11 waterings');
  await capture('garden', '#companion-tools');
  await frame.locator('#companion-close').click();

  await frame.getByRole('button', { name: 'Charm settings', exact: true }).click();
  await frame.getByRole('menuitem', { name: 'Photo charms', exact: true }).click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1360, 870));
  await frame.locator('#photo-file').setInputFiles({ name: 'goldie.png', mimeType: 'image/png', buffer: readFileSync(portrait) });
  await expect(frame.locator('#photo-editor')).toHaveAttribute('data-photo-ready', 'true');
  const frames = await frame.locator('#photo-frame option').evaluateAll(options => options.map(option => ({ value: option.value, label: option.textContent })));
  const locket = frames.find(option => /locket|oval/i.test(option.label));
  assert.ok(locket, 'The product must offer an actual locket frame.');
  await frame.locator('#photo-frame').selectOption(locket.value);
  await frame.locator('#photo-name').fill('A little closer to home');
  await frame.locator('.photo-body').evaluate(element => { element.scrollTop = 0; });
  await capture('photo-editor', '#photo-editor');
  await frame.locator('#photo-save').click();
  await expect(frame.locator('#photo-editor')).toBeHidden();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1360, 680));
  const photo = await frame.locator('#stage').getAttribute('data-charm');
  assert.match(photo, /^pack:photo-/);
  await capture('dog-locket');

  await appearance();
  await frame.locator('#arrangement').selectOption('bracelet');
  const choices = await frame.locator('#bracelet-choice-0 option').evaluateAll(options => options.map(option => ({ value: option.value, label: option.textContent?.trim() })));
  const rose = choices.find(option => option.value === 'trial:flower-red-rose');
  assert.ok(rose, 'Use the released rose rather than a substitute illustration.');
  await frame.locator('#bracelet-choice-0').selectOption('live:cali');
  await frame.locator('#bracelet-choice-1').selectOption(photo);
  await frame.locator('#bracelet-choice-2').selectOption(rose.value);
  await frame.locator('#bracelet-style').selectOption('rose-gold');
  await frame.locator('#settings-close').click();
  await expect(frame.locator('#stage')).toHaveAttribute('data-arrangement', 'bracelet');
  await capture('bracelet');
  saveJson(join(output, 'capture-receipt.json'), {
    version: manifest.version, identity, capturedAt: new Date().toISOString(),
    vsixSha256: createHash('sha256').update(readFileSync(vsix)).digest('hex'),
    demoPortraitSha256: createHash('sha256').update(readFileSync(portrait)).digest('hex'),
    actualInstalledPublicApp: true, syntheticProfile: true, seededDemoGarden: true,
    noOwnerPhotosUsed: true, captures,
  });
} catch (error) {
  saveJson(join(output, 'capture-error.json'), { message: String(error), stack: error.stack, profile });
  const window = app.windows()[0];
  if (window) await window.screenshot({ path: join(output, 'capture-error.png'), timeout: 5000 }).catch(() => {});
  throw error;
} finally {
  await closeOwnedEditor({ app, profile }, evidence);
}
