import { build } from '../extension/node_modules/esbuild/lib/main.js';
import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWithheldArtworkFile } from '../release/artwork-policy.mjs';
import targetTools from '../release/build-target.cjs';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const target = targetTools.buildTarget(root);
const { dist, personal, define } = target;
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const sharedNode = {
  bundle: true, platform: 'node', format: 'cjs', target: 'node20', external: ['electron'], sourcemap: false, define,
};
const desktopLayout = {
  name: 'desktop-layout',
  setup(builder) {
    builder.onResolve({ filter: /^\.\/charm-state$/ }, () => ({ path: join(root, 'src', 'desktop-layout.ts') }));
  },
};
await Promise.all([
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'main.ts')], outfile: join(dist, 'main.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'preload.ts')], outfile: join(dist, 'preload.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'window-placement.ts')], outfile: join(dist, 'window-placement.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'desktop-view.ts')], outfile: join(dist, 'desktop-view.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'desktop-layout.ts')], outfile: join(dist, 'desktop-layout.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'power-behavior.ts')], outfile: join(dist, 'power-behavior.cjs') }),
  build({ entryPoints: [join(root, 'src', 'overlay.ts')], bundle: true, platform: 'browser', format: 'iife', target: 'es2022', outfile: join(dist, 'overlay.js'), sourcemap: false, define }),
  build({ entryPoints: [join(root, 'src', 'renderer.ts')], plugins: [desktopLayout], bundle: true, platform: 'browser', format: 'iife', target: 'es2022', outfile: join(dist, 'renderer.js'), sourcemap: false, define }),
]);
await cp(join(repo, 'extension', 'media'), join(dist, 'media'), {
  recursive: true, filter: source => personal || !isWithheldArtworkFile(basename(source)),
});
await copyFile(join(repo, 'extension', 'media', 'view.html'), join(dist, 'view.html'));
await copyFile(join(repo, 'extension', 'media', 'view.css'), join(dist, 'view.css'));
await copyFile(join(repo, 'extension', 'media', 'puzzle.css'), join(dist, 'puzzle.css'));
await copyFile(join(repo, 'extension', 'media', 'celebration.css'), join(dist, 'celebration.css'));
await copyFile(join(repo, 'extension', 'media', 'bracelet.css'), join(dist, 'bracelet.css'));
await copyFile(join(root, 'src', 'desktop.css'), join(dist, 'desktop.css'));
await copyFile(join(repo, 'extension', 'THIRD_PARTY_NOTICES.md'), join(dist, 'THIRD_PARTY_NOTICES.md'));
await copyFile(join(repo, 'extension', 'ARTWORK.md'), join(dist, 'ARTWORK.md'));
await copyFile(join(repo, 'extension', 'PRIVACY.md'), join(dist, 'PRIVACY.md'));
await copyFile(join(repo, 'extension', 'LICENSE'), join(dist, 'LICENSE'));
await copyFile(join(repo, 'extension', 'ARTWORK-LICENSE.md'), join(dist, 'ARTWORK-LICENSE.md'));
await copyFile(join(root, 'README.md'), join(dist, 'DESKTOP_BETA.md'));
await writeFile(join(dist, 'edition.json'), `${JSON.stringify(target.metadata)}\n`);
console.log(`Built CharmBits ${personal ? 'Personal' : 'public desktop beta'}.`);
