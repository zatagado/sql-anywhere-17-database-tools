const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

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

/**
 * Shims @mapbox/node-pre-gyp so odbc's JS can be bundled without
 * pulling in 60+ transitive dependencies. The native .node binary
 * is copied to dist/ and resolved at runtime via __dirname.
 * @type {import('esbuild').Plugin}
 */
const nativeModulePlugin = {
	name: 'native-module',

	setup(build) {
		build.onResolve({ filter: /^@mapbox\/node-pre-gyp$/ }, () => ({
			path: 'node-pre-gyp',
			namespace: 'node-pre-gyp-shim',
		}));
		build.onLoad({ filter: /.*/, namespace: 'node-pre-gyp-shim' }, () => ({
			contents: `
				const path = require('path');
				exports.find = function() {
					return path.join(__dirname, 'odbc.node');
				};
			`,
			loader: 'js',
		}));
		build.onEnd(() => {
			const src = path.join(__dirname, 'node_modules', 'odbc', 'lib', 'bindings', 'napi-v8', 'odbc.node');
			const dest = path.join(__dirname, 'dist', 'odbc.node');
			try {
				fs.unlinkSync(dest);
			} catch (/** @type {any} */ e) {
				if (e.code !== 'ENOENT') {
					const srcStat = fs.statSync(src);
					try {
						const destStat = fs.statSync(dest);
						if (srcStat.size === destStat.size && srcStat.mtimeMs <= destStat.mtimeMs) {
							console.log('[native-module] odbc.node is locked but already up to date — skipping copy');
							return;
						}
					} catch { /* dest gone — will copy below */ }
					throw e;
				}
			}
			fs.copyFileSync(src, dest);
		});
	},
};

async function main() {
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
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			nativeModulePlugin,
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
