const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');

const root = path.resolve(__dirname, '..');
const quietConsole = { log() {}, warn() {}, error() {} };

async function state(html, fonts = [], currentMap) {
  const { window } = parseHTML(`<html><head></head><body>${html}</body></html>`);
  const location = new URL('https://mooc1.chaoxing.com/work/view');
  window.location = location;
  const getComputedStyle = (node) => {
    let family = '';
    for (let current = node; current && !family; current = current.parentElement) {
      family = current.style?.fontFamily || current.getAttribute?.('data-test-font') || '';
    }
    return { fontFamily: family || '"Microsoft YaHei", sans-serif', display: node.style?.display || 'block', visibility: 'visible' };
  };
  const context = vm.createContext({
    window, document: window.document, location, getComputedStyle, atob,
    console: quietConsole, setTimeout, clearTimeout, AbortController, URL,
    performance: { getEntriesByType: () => [] },
    chrome: { runtime: { getURL: (name) => `chrome-extension://test/${name}` } },
    fetch: async (url) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url.split('chrome-extension://test/')[1]), 'utf8')) })
  });
  const source = fs.readFileSync(path.join(root, 'lib/font-decrypt.js'), 'utf8')
    .replace('window.fontDecryptor = new FontDecryptor();', 'window.FontDecryptor = FontDecryptor;');
  vm.runInContext(source, context);
  const prototype = window.FontDecryptor.prototype;
  if (fonts !== null) prototype._findAllEncryptedFontSources = () => fonts;
  const buildDynamicMapping = prototype._buildDynamicMapping;
  prototype._buildDynamicMapping = async (font) => currentMap || font.map;
  const decryptor = new window.FontDecryptor();
  window.fontDecryptor = decryptor;
  while (!decryptor.isReady()) await new Promise((resolve) => setImmediate(resolve));
  vm.runInContext(fs.readFileSync(path.join(root, 'content/parser.js'), 'utf8'), context);
  return { window, document: window.document, decryptor, parser: new window.QuestionExportParser(), context, buildDynamicMapping };
}

const encryptedFont = (fontFamily, entries) => ({ fontFamily, url: `https://example.invalid/${fontFamily}.ttf`, map: new Map(entries) });

test('real bundled static map cannot change normal Chinese on a plain page', async () => {
  const text = '普通中文标题与题干';
  const { document, decryptor, parser } = await state(`<h1>${text}</h1><div class="questionLi"><h3 class="qtContent">${text}</h3></div>`);
  assert.ok(decryptor.staticMap.size > 100, 'load the real historical mapping');
  assert.notEqual([...text].map((char) => decryptor.staticMap.get(char) || char).join(''), text, 'fixture must expose static substitution');
  assert.equal(decryptor.decrypt(text), text);
  assert.equal(decryptor.decryptNodeText(document.querySelector('h1')), text);
  assert.equal(parser.extractPageTitle(), text);
  assert.equal(parser.extractChaoxingTitle(document.querySelector('.questionLi')), text);
});

test('mixed encrypted and normal descendants decode only their effective font once', async () => {
  const font = encryptedFont('font-cxsecret', [['甲', '乙'], ['乙', '丙']]);
  const { document, decryptor, parser } = await state('<div id="mixed">普通甲<span data-test-font="font-cxsecret">甲<b>甲</b><i data-test-font="serif">甲</i></span>甲</div>', [font]);
  const node = document.querySelector('#mixed');
  assert.equal(decryptor.decryptNodeText(node), '普通甲乙乙甲甲');
  assert.equal(parser.extractReadableText(node), '普通甲乙乙甲甲');
  assert.equal(parser.cleanTitleText(parser.extractReadableText(node)), '普通甲乙乙甲甲');
  assert.equal(node.textContent, '普通甲甲甲甲甲', 'extraction must not change the page');
});

test('two current encrypted fonts retain separate mappings for the same codepoint', async () => {
  const { document, decryptor } = await state('<div id="mixed"><span data-test-font="exam-font">甲</span><span data-test-font="font-cxsecret">甲</span></div>', [
    encryptedFont('exam-font', [['甲', '乙']]), encryptedFont('font-cxsecret', [['甲', '丁']])
  ]);
  assert.equal(decryptor.decryptNodeText(document.querySelector('#mixed')), '乙丁');
  assert.equal(decryptor.decrypt('甲'), '甲', 'a bare string has no font provenance');
});

test('cloned question extraction preserves inherited font evidence', async () => {
  const { document, parser } = await state('<section data-test-font="font-cxsecret"><div class="questionLi"><p>甲甲甲甲甲甲</p><div class="mark_answer">正确答案：甲</div></div></section>', [encryptedFont('font-cxsecret', [['甲', '乙'], ['乙', '丙']])]);
  assert.equal(parser.extractTitleFromText(document.querySelector('.questionLi')), '乙乙乙乙乙乙');
});

test('unknown encrypted font fails clearly instead of falling back to static or another font', async () => {
  const { document, decryptor } = await state('<span data-test-font="font-cxsecret">甲</span>', [encryptedFont('exam-font', [['甲', '乙']])]);
  assert.throws(() => decryptor.decryptNodeText(document.querySelector('span')), /字体/);
});

test('failed and ambiguous current fonts cannot silently export substituted text', async () => {
  for (const fonts of [
    [{ fontFamily: 'font-cxsecret', url: 'https://example.invalid/failed.ttf', map: null }],
    [encryptedFont('font-cxsecret', [['甲', '乙']]), { ...encryptedFont('font-cxsecret', [['甲', '丁']]), url: 'https://example.invalid/other.ttf' }]
  ]) {
    const { document, decryptor } = await state('<span data-test-font="font-cxsecret">甲</span>', fonts);
    assert.throws(() => decryptor.decryptNodeText(document.querySelector('span')), /字体/);
  }
});

test('actual inline font discovery initializes a map and keeps ordinary webfonts separate', async () => {
  const { document, decryptor } = await state('<style>@font-face {font-family: font-cxsecret; src:url(data:font/ttf;base64,QQ==)} @font-face {font-family: ordinary; src:url(data:font/ttf;base64,Qg==)}</style><span data-test-font="font-cxsecret">甲</span>', null, new Map([['甲', '乙']]));
  assert.equal(decryptor.fontMaps.size, 1);
  assert.equal(decryptor.decryptNodeText(document.querySelector('span')), '乙');
});

test('dynamic glyph matching reports unresolved covered characters and preserves font fallbacks', async () => {
  const { document, decryptor, context, buildDynamicMapping } = await state('<span data-test-font="font-cxsecret">甲</span>');
  decryptor._glyphMappingTable = { 123: '乙'.codePointAt(0) };
  const font = { cmap: { tables: [{ format: 12, groups: ['甲'.codePointAt(0), '甲'.codePointAt(0), 1, '丙'.codePointAt(0), '丙'.codePointAt(0), 2] }] } };
  context.Typr = { parse: () => [font], U: { codeToGlyph: (_font, code) => code, glyphToPath: (_font, glyph) => ({ cmds: ['M'], crds: [glyph] }) } };
  context.md5 = (json) => `000000000000000000000000${JSON.parse(json).crds[0] === '甲'.codePointAt(0) ? '0000007b' : '0000007c'}`;
  const source = { fontFamily: 'font-cxsecret', base64: 'QQ==' };
  const map = await buildDynamicMapping.call(decryptor, source);
  assert.equal(map.get('甲'), '乙');
  assert.equal(map.unresolvedCharacters.has('丙'), true);
  decryptor._registerFontMapping(source, map);
  assert.equal(decryptor.decryptNodeText(document.querySelector('span')), '乙');
  document.querySelector('span').textContent = '丁';
  assert.equal(decryptor.decryptNodeText(document.querySelector('span')), '丁', 'codepoints absent from this font use normal font fallback');
  document.querySelector('span').textContent = '丙';
  assert.throws(() => decryptor.decryptNodeText(document.querySelector('span')), /字体/);
});

test('all-frame extraction preserves a real font-decode failure as fatal', async () => {
  const { context } = await state('<div class="questionLi"><h3 class="qtContent" data-test-font="font-cxsecret">甲甲甲甲甲甲甲甲甲甲</h3></div>');
  context.chrome.scripting = { executeScript: async ({ func }) => [{ result: await func() }] };
  vm.runInContext(fs.readFileSync(path.join(root, 'popup/popup.js'), 'utf8'), context);
  const results = await context.runExtractorInAllFrames(1);
  assert.equal(results[0].result.success, false);
  assert.equal(results[0].result.fatal, true);
  assert.match(results[0].result.error, /字体/);
});
