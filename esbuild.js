const esbuild = require("esbuild");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * @param {string} filePath
 */
function sha256File(filePath) {
	return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

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
		build.onEnd((result) => {
			if (result.errors.length) {
				return;
			}
			const odbcPackageJson = path.join(__dirname, 'node_modules', 'odbc', 'package.json');
			if (!fs.existsSync(odbcPackageJson)) {
				throw new Error(
					'[native-module] node_modules/odbc is missing. Run yarn install.',
				);
			}
			const preGyp = require('@mapbox/node-pre-gyp');
			const src = preGyp.find(odbcPackageJson);
			const dest = path.join(__dirname, 'dist', 'odbc.node');
			if (!fs.existsSync(src)) {
				throw new Error(
					`[native-module] No ODBC add-on at ${src}. Run yarn rebuild-odbc (or yarn install in node_modules/odbc) to compile the native module.`,
				);
			}
			fs.mkdirSync(path.dirname(dest), { recursive: true });

			const srcHash = sha256File(src);
			if (fs.existsSync(dest) && sha256File(dest) === srcHash) {
				console.log("[native-module] dist/odbc.node already matches linked build — skipping copy");
				return;
			}

			try {
				if (fs.existsSync(dest)) {
					fs.unlinkSync(dest);
				}
			} catch (/** @type {any} */ e) {
				if (e.code === "EBUSY" || e.code === "EPERM" || e.code === "EACCES") {
					throw new Error(
						"[native-module] Cannot replace dist/odbc.node (file is locked by a running Extension Host). " +
							"Stop debugging and close the Extension Development Host window, then run node esbuild.js or yarn run rebuild-odbc again.",
					);
				}
				throw e;
			}
			fs.copyFileSync(src, dest);
			console.log(`[native-module] copied native addon: ${src} -> ${dest}`);
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
