import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!['win32', 'darwin'].includes(process.platform)) throw new Error('Build and verify the personal desktop package on Windows or macOS.');
if (process.argv.length > 2) throw new Error('The personal builder takes no arguments and always uses private-builds/.');
const extension = join(repo, 'extension'), desktop = join(repo, 'desktop');
const extensionManifest = JSON.parse(await readFile(join(extension, 'package.json'), 'utf8'));
const desktopManifest = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'));
const privateRoot = join(repo, 'private-builds');
await mkdir(privateRoot, { recursive: true });
const output = await mkdtemp(join(privateRoot, `charmbits-${extensionManifest.version}-`));
const stagedExtension = join(output, 'extension'), stagedDesktop = join(output, 'desktop');
await Promise.all([mkdir(stagedExtension), mkdir(stagedDesktop)]);
const personalNotes = `# CharmBits Personal

Private owner edition: all included features and all 278 current designs are
unlocked, including the 51 owner-review studies. No trial, payment, activation
file or billing connection is required. Nimbus remains an optional weather
connection. Keep these builds private; public desktop pricing is separate.

VSIX: use Extensions > Install from VSIX. It keeps gautham-nvidia.charmlet so
your editor preferences, photos and progress remain available. It replaces the
public extension in that editor. Disable automatic updates for this extension
to retain the personal edition. Restore the public VSIX whenever you prefer.

Desktop: extract the entire archive and open CharmBits Personal. It has its own
profile named CharmBits Personal, so you can compare it with the public desktop.
Existing desktop packs/photos can be imported through its normal controls.

Appearance > Charm bracelet holds two or three charms. Tap a pet for a quiet
response; pull any charm left or right. Reduced Motion stops decorative effects.
These are unsigned review builds. The package identity and checksums are in
personal-build.json.
`;
await writeFile(join(output, 'README.md'), personalNotes);
for (const name of ['CHANGELOG.md', 'LICENSE', 'ARTWORK.md', 'ARTWORK-LICENSE.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(join(extension, name), join(stagedExtension, name));
}
await writeFile(join(stagedExtension, 'README.md'), `${personalNotes}\n${await readFile(join(extension, 'README.md'), 'utf8')}`);
await cp(join(extension, 'media'), join(stagedExtension, 'media'), { recursive: true });
await writeFile(join(stagedExtension, '.vscodeignore'), (await readFile(join(extension, '.vscodeignore'), 'utf8'))
  .replace(/^media\/trial-(?:artist|athlete)-\*\.png\r?\n?/gm, ''));
await writeFile(join(stagedExtension, 'package.json'), `${JSON.stringify({
  ...extensionManifest, displayName: 'CharmBits Personal', charmbitsEdition: 'personal', preview: true,
  description: 'Private owner edition with all charms and features unlocked. Not for public distribution.',
  scripts: undefined, devDependencies: undefined,
}, null, 2)}\n`);
await writeFile(join(stagedDesktop, 'package.json'), `${JSON.stringify({
  ...desktopManifest, name: 'charmbits-personal-desktop', productName: 'CharmBits Personal',
  author: desktopManifest.author || 'Gautham Anebajagane',
  charmbitsEdition: 'personal', scripts: undefined, devDependencies: undefined,
}, null, 2)}\n`);

const run = (script, args, cwd, env = process.env) => execFileSync(process.execPath, [script, ...args],
  { cwd, env, stdio: 'inherit' });
run(join(extension, 'esbuild.js'), ['--production', '--personal', '--outdir', join(stagedExtension, 'dist')], extension);
run(join(desktop, 'build.mjs'), ['--personal', '--outdir', join(stagedDesktop, 'dist')], repo);
const vsix = join(output, `CharmBits-Personal-${extensionManifest.version}.vsix`);
run(join(extension, 'node_modules/@vscode/vsce/vsce'), ['package', '--no-dependencies', '--out', vsix], stagedExtension);
const desktopRequire = createRequire(join(desktop, 'package.json'));
const { packager } = await import(pathToFileURL(desktopRequire.resolve('@electron/packager')).href);
const [application] = await packager({
  dir: stagedDesktop, name: 'CharmBits Personal', appVersion: desktopManifest.version,
  appBundleId: 'dev.charmbits.personal', platform: process.platform, arch: process.arch,
  electronVersion: desktopRequire('electron/package.json').version, out: join(output, 'application'),
  prune: true, asar: false,
});
if (!application) throw new Error('The private desktop package was not created.');
const suffix = process.platform === 'win32' ? '.zip' : '.tar.gz';
const archive = join(output, `CharmBits-Personal-desktop-${desktopManifest.version}-${process.platform}-${process.arch}${suffix}`);
execFileSync('tar', [...(process.platform === 'win32' ? ['-a', '-cf'] : ['-czf']),
  archive, '-C', dirname(application), basename(application)], { stdio: 'inherit' });

// Exercise the downloaded shape, including permissions/framework links on macOS.
const extracted = await mkdtemp(join(tmpdir(), 'charmbits-personal-archive-'));
try {
  execFileSync('tar', ['-xf', archive, '-C', extracted], { stdio: 'inherit' });
  run(join(desktop, 'test', 'smoke.mjs'), ['--packaged', '--personal'], repo,
    { ...process.env, CHARMLET_DESKTOP_BUNDLE_ROOT: extracted });
} finally {
  await rm(extracted, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 })
    .catch(error => console.warn(`Temporary extraction retained at ${extracted}: ${error.message}`));
}
// Run after desktop smoke: two native UI tests must not compete for keyboard focus.
run(join(extension, 'node_modules/@playwright/test/cli.js'),
  ['test', '--grep', 'keeps pet reactions calm'], extension, {
    ...process.env, CHARMLET_TEST_PACKAGED: '1', CHARMLET_TEST_VSIX: vsix, CHARMBITS_TEST_PERSONAL: '1',
  });
async function artifact(file) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return { file, bytes: (await stat(file)).size, sha256: hash.digest('hex') };
}
const record = {
  edition: 'personal', publicDistribution: false, designs: 278,
  editorVersion: extensionManifest.version, desktopVersion: desktopManifest.version,
  vsix: await artifact(vsix), desktop: await artifact(archive), application,
  verification: ['extracted desktop archive smoke', 'installed VSIX full personal catalogue and approved motion'],
};
await writeFile(join(output, 'personal-build.json'), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
