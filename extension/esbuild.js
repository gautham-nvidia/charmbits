const esbuild = require("esbuild");
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { buildTarget } = require('../release/build-target.cjs');
const target = buildTarget(__dirname);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	await mkdir(target.dist, { recursive: true });
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: join(target.dist, 'extension.js'),
		define: target.define,
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	const webview = await esbuild.context({
		entryPoints: ['src/webview.ts'],
		bundle: true,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
		outfile: join(target.dist, 'webview.js'),
		define: target.define,
		minify: production,
		sourcemap: !production,
	});
	if (watch) {
		await ctx.watch();
		await webview.watch();
	} else {
		await ctx.rebuild();
		await webview.rebuild();
		await ctx.dispose();
		await webview.dispose();
	}
	await writeFile(join(target.dist, 'edition.json'), `${JSON.stringify(target.metadata)}\n`);
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
