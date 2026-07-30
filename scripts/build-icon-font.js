// Builds resources/sqla-icons.woff from the SVGs in resources/icon-font-src.
//
// fantasticon's CLI can't be used on Windows (it globs with path.join, which
// produces backslashes that the `glob` package treats as escapes), so we drive
// its underlying libraries directly here. Reads each SVG by an explicit path,
// so there is no glob involved and it works cross-platform.
//
// Run with: node scripts/build-icon-font.js
// Codepoints must stay in sync with the "contributes.icons" entries in package.json.

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { SVGIcons2SVGFontStream } = require('svgicons2svgfont');
const svg2ttf = require('svg2ttf');
const ttf2woff = require('ttf2woff');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'resources', 'icon-font-src');
const outFile = path.join(root, 'resources', 'sqla-icons.woff');

// name -> codepoint. Keep in lockstep with package.json "contributes.icons".
const icons = [
    { name: 'sqla-object-details', file: 'sqla-object-details.svg', codepoint: 0xe001 },
    { name: 'sqla-virtual-document', file: 'sqla-virtual-document.svg', codepoint: 0xe002 },
    { name: 'sqla-execute', file: 'sqla-execute.svg', codepoint: 0xe003 },
    { name: 'sqla-database', file: 'sqla-database.svg', codepoint: 0xe004 },
    { name: 'sqla-folder', file: 'sqla-folder.svg', codepoint: 0xe005 },
    { name: 'sqla-table', file: 'sqla-table.svg', codepoint: 0xe006 },
    { name: 'sqla-view', file: 'sqla-view.svg', codepoint: 0xe007 },
    { name: 'sqla-procedure', file: 'sqla-procedure.svg', codepoint: 0xe008 },
    { name: 'sqla-refresh', file: 'sqla-refresh.svg', codepoint: 0xe009 },
    { name: 'sqla-result-set', file: 'sqla-result-set.svg', codepoint: 0xe00a }
];

// SVG font glyphs are drawn on a 1000-unit em with the baseline at 200 units up
// (fontHeight 1000, descent 200) so the artwork sits centred like a codicon.
const fontStream = new SVGIcons2SVGFontStream({
    fontName: 'sqla-icons',
    fontHeight: 1000,
    descent: 200,
    normalize: true,
    log: () => {}
});

const chunks = [];
fontStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
fontStream.on('error', (err) => {
    console.error(err);
    process.exit(1);
});
fontStream.on('finish', () => {
    const svgFont = Buffer.concat(chunks).toString('utf8');
    const ttf = svg2ttf(svgFont, {});
    const woff = ttf2woff(Buffer.from(ttf.buffer));
    fs.writeFileSync(outFile, Buffer.from(woff.buffer));
    console.log(`Wrote ${path.relative(root, outFile)} (${icons.length} glyphs)`);
});

for (const icon of icons) {
    const svgPath = path.join(srcDir, icon.file);
    const glyph = Readable.from(fs.readFileSync(svgPath));
    glyph.metadata = { name: icon.name, unicode: [String.fromCodePoint(icon.codepoint)] };
    fontStream.write(glyph);
}
fontStream.end();
