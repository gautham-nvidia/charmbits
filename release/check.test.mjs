import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicationBlockers, requirePublicationReady, validateCandidate } from './check.mjs';
import { legacyPagesRedirect } from '../website/distribution.mjs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../extension/node_modules/esbuild/lib/main.js';
import targetTools from './build-target.cjs';

function fixture() {
  const manifest = { name: 'charmlet', displayName: 'CharmBits: Coding Charms', publisher: 'gautham-nvidia', version: '0.5.0', pricing: 'Free',
    bugs: { url: 'https://github.com/gautham-nvidia/charmbits/issues' } };
  const files = new Map([
    ['extension/package.json', Buffer.from(JSON.stringify(manifest))],
    ['extension/readme.md', Buffer.from('CharmBits 0.5.0')],
    ['extension/changelog.md', Buffer.from('## 0.5.0 - release preparation')],
    ['extension/dist/edition.json', Buffer.from('{"edition":"public"}')],
    ...['privacy.md', 'third_party_notices.md', 'artwork.md', 'dist/extension.js', 'dist/webview.js',
      'media/view.html', 'media/view.css', 'media/marketplace-icon.png'].map(name => [`extension/${name}`, Buffer.from(name)]),
  ]);
  const built = new Map([...files].filter(([name]) => name.includes('/dist/') || name.includes('/media/') || name.endsWith('/privacy.md')));
  return { manifest, packaged: structuredClone(manifest),
    identity: { Id: 'charmlet', Publisher: 'gautham-nvidia', Version: '0.5.0' }, files, built,
    catalogue: { version: '0.5.0', extensionDownload: './downloads/charmbits.vsix' },
    siteVsix: Buffer.from('same reviewed archive'), vsix: Buffer.from('same reviewed archive'), expectedVersion: '0.5.0' };
}

test('a coherent candidate records identity and checksum without making it publishable', () => {
  const data = fixture();
  const result = validateCandidate(data);
  assert.equal(result.id, 'gautham-nvidia.charmlet');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(publicationBlockers({ ...data, target: 'artifact' }).length, 2);
});

test('the public download portal must not ship a raw installer alongside its email gate', () => {
  const data = fixture();
  data.catalogue.extensionDownload = './download.html';
  assert.throws(() => validateCandidate(data), /bypasses email verification/);
  data.siteVsix = null;
  assert.equal(validateCandidate(data).version, '0.5.0');
});
test('wrong version, publisher, XML identity and pricing cannot be released', () => {
  for (const change of [
    data => { data.expectedVersion = '0.5.1'; },
    data => { data.packaged.publisher = 'someone-else'; },
    data => { data.packaged.displayName = 'Charmlet: Coding Charms'; },
    data => { data.manifest.description = 'Updated listing copy'; },
    data => { data.identity.Version = '0.4.3'; },
    data => { data.manifest.pricing = 'Trial'; },
  ]) {
    const data = fixture(); change(data);
    assert.throws(() => validateCandidate(data));
  }
});
test('a stale website download or bundle fails even when metadata matches', () => {
  const data = fixture();
  data.siteVsix = Buffer.from('older archive');
  assert.throws(() => validateCandidate(data), /Website download differs/);
  data.siteVsix = data.vsix;
  data.files.set('extension/dist/webview.js', Buffer.from('older renderer'));
  assert.throws(() => validateCandidate(data), /VSIX differs from built/);
  data.files.set('extension/dist/webview.js', data.built.get('extension/dist/webview.js'));
  data.files.set('extension/privacy.md', Buffer.from('outdated disclosure'));
  assert.throws(() => validateCandidate(data), /VSIX differs from built/);
});
test('private/source files and omitted privacy notices fail the package check', () => {
  for (const name of ['extension/.env.local', 'extension/src/private.ts', 'extension/node_modules/example.js', 'extension/session/notes.md']) {
    const data = fixture(); data.files.set(name, Buffer.from('not for distribution'));
    assert.throws(() => validateCandidate(data), /Unexpected packaged file/);
  }
  const data = fixture(); data.files.delete('extension/privacy.md');
  assert.throws(() => validateCandidate(data), /Required package file/);
});
test('publication requires licence files and credentials for every selected registry', () => {
  const data = fixture();
  assert.throws(() => requirePublicationReady({ ...data, target: 'both' }), /Publication is blocked/);
  data.manifest.license = 'MIT';
  data.files.set('extension/license', Buffer.from('Fixture source licence'));
  data.files.set('extension/artwork-license.md', Buffer.from('Fixture artwork terms'));
  assert.equal(publicationBlockers({ ...data, target: 'both', environment: { VSCE_PAT: 'fixture-only' } }).length, 1);
  requirePublicationReady({ ...data, target: 'both', environment: { VSCE_PAT: 'fixture-only', OVSX_PAT: 'fixture-only' } });
  assert.throws(() => publicationBlockers({ ...data, target: 'unknown' }), /Choose artifact/);
});

test('trusted publishing requires the GitHub OIDC context and retains source and artwork gates', () => {
  const data = fixture();
  const environment = { CHARMLET_RELEASE_AUTH: 'oidc', GITHUB_ACTIONS: 'true',
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/fixture-only',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fixture-only' };
  assert.equal(publicationBlockers({ ...data, target: 'marketplace', environment }).length, 2);
  data.manifest.license = 'MIT';
  data.files.set('extension/license', Buffer.from('Fixture source licence'));
  data.files.set('extension/artwork-license.md', Buffer.from('Fixture artwork terms'));
  requirePublicationReady({ ...data, target: 'marketplace', environment });
  for (const key of ['GITHUB_ACTIONS', 'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN']) {
    assert.throws(() => requirePublicationReady({ ...data, target: 'marketplace',
      environment: { ...environment, [key]: '' } }), /id-token: write/);
  }
  assert.equal(publicationBlockers({ ...data, target: 'both', environment }).length, 1);
  assert.throws(() => requirePublicationReady({ ...data, target: 'marketplace',
    environment: { VSCE_PAT: 'fixture-only', CHARMLET_RELEASE_AUTH: 'unknown' } }), /Choose pat or oidc/);
});

test('withheld artwork cannot enter a VSIX even through an archived revision', () => {
  for (const name of ['trial-artist-travis-scott-r1-p4.png', 'trial-athlete-lionel-messi-r2.png', 'artist-old-preview.png']) {
    const data = fixture();
    data.files.set(`extension/media/${name}`, Buffer.from('review-only'));
    assert.throws(() => validateCandidate(data), /Withheld review artwork/);
  }
  const data = fixture();
  data.built.set('extension/license', Buffer.from('Approved source terms'));
  data.files.set('extension/license', Buffer.from('Stale terms'));
  assert.throws(() => validateCandidate(data), /VSIX differs from built file/);
});

test('the shared website build redirects only the old Pages project', () => {
  const expected = '/* https://charmbits.pages.dev/:splat 301\n';
  for (const url of ['https://charmlet.pages.dev', 'https://abc123.charmlet.pages.dev']) {
    assert.equal(legacyPagesRedirect(url), expected);
  }
  for (const url of [undefined, 'https://charmbits.pages.dev', 'https://abc123.charmbits.pages.dev',
    'https://notcharmlet.pages.dev', 'https://charmlet.pages.dev.example.test']) {
    assert.equal(legacyPagesRedirect(url), '');
  }
  assert.throws(() => legacyPagesRedirect('https://user@charmlet.pages.dev'));
});

test('personal builds require isolated output and cannot pass public package checks', () => {
  const root = join(tmpdir(), 'charmbits-build-target');
  for (const args of [['--personal'], ['--personal', '--outdir', 'dist'],
    ['--personal', '--outdir', 'dist/personal'], ['--outdir']]) {
    assert.throws(() => targetTools.buildTarget(root, args));
  }
  assert.equal(targetTools.buildTarget(root, []).define.__CHARMBITS_PERSONAL__, 'false');
  assert.equal(targetTools.buildTarget(root, ['--personal', '--outdir', '../private-build']).define.__CHARMBITS_PERSONAL__, 'true');
  for (const change of [
    data => { data.packaged.charmbitsEdition = 'personal'; },
    data => { data.files.set('extension/dist/edition.json', Buffer.from('{"edition":"personal"}')); },
  ]) {
    const data = fixture(); change(data);
    assert.throws(() => validateCandidate(data), /personal/);
  }
});

test('the compiled personal edition unlocks the full collection offline without reading or writing activations', async () => {
  async function edition(personal) {
    const result = await build({
      stdin: { contents: "export { AccessController } from './access-controller'; export { CHARMS, WITHHELD_CHARMS } from './charm-catalog';",
        resolveDir: fileURLToPath(new URL('../extension/src/', import.meta.url)), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', write: false,
      define: { __CHARMBITS_PERSONAL__: String(personal) },
    });
    return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
  }
  const [personal, publicEdition] = await Promise.all([edition(true), edition(false)]);
  assert.equal(personal.CHARMS.length, publicEdition.CHARMS.length + publicEdition.WITHHELD_CHARMS.length);
  const directory = await mkdtemp(join(tmpdir(), 'charmbits-personal-access-'));
  let touchedSecrets = false;
  const secrets = { get: async () => { touchedSecrets = true; }, set: async () => { touchedSecrets = true; } };
  const access = new personal.AccessController({ application: 'desktop', directory, secrets });
  try {
    await access.initialize({ version: 1, editionVersion: 1 });
    await access.observeClock();
    access.watch(() => { throw new Error('Personal builds must not run billing timers.'); }, () => {});
    assert.equal(access.catalogue(personal.CHARMS).length, personal.CHARMS.length);
    assert.equal(access.snapshot.label, 'Personal edition');
    assert.equal(access.snapshot.canActivate, false);
    assert.equal(access.snapshot.canBrowse, false);
    assert.equal(touchedSecrets, false);
    assert.deepEqual(await readdir(directory), []);
    const publicAccess = new publicEdition.AccessController({ application: 'desktop', directory, secrets, personal: true });
    assert.equal(publicAccess.catalogue(publicEdition.CHARMS).length, 31, 'A runtime option cannot unlock a public desktop build.');
    publicAccess.dispose();
  } finally { access.dispose(); await rm(directory, { recursive: true, force: true }); }
});
