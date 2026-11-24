import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const flags = process.argv.slice(2);
if (flags.some(flag => flag !== '--release')) throw new Error('Only --release is supported.');
// Keep the installed extension identity while giving the download its current public name.
const result = spawnSync(process.execPath, [
  join(root, 'node_modules/@vscode/vsce/vsce'), 'package', '--no-dependencies',
  '--out', join(root, `charmbits-${manifest.version}.vsix`),
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
