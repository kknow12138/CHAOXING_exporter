/**
 * 生成「字形轮廓哈希 → 真字」映射表 (lib/yuketang-glyph-hash-map.json)
 *
 * 背景：雨课堂每次请求都返回一套全新随机字体，码点是随机分配的，
 * 但字形【轮廓】在所有随机字体里是同一套固定设计。因此用
 *   hash = md5(JSON.stringify(Typr 字形 path)).slice(24) → parseInt(16)
 * 作为 key，就能得到一张跨字体通用、且纯本地可查的解密表，
 * 彻底摆脱对 forestpolice.org 的依赖。
 *
 * 关键：生成端必须用与浏览器端 font-decrypt.js 完全相同的
 * Typr + md5 实现，保证哈希一致 —— 所以这里直接加载项目内 lib/typr.js。
 *
 * 用法：
 *   node scripts/generate_glyph_hash_map.js \
 *     [--font <ttf 路径>] [--map lib/yuketang-font-map.json] \
 *     [--output lib/yuketang-glyph-hash-map.json]
 *
 * --font 省略时默认用 /tmp/current_exam_font.ttf（生成静态字符表的源字体）。
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const ROOT = path.resolve(__dirname, '..');
const fontPath = arg('--font', '/tmp/current_exam_font.ttf');
const mapPath = arg('--map', path.join(ROOT, 'lib/yuketang-font-map.json'));
const outPath = arg('--output', path.join(ROOT, 'lib/yuketang-glyph-hash-map.json'));

// 1. 加载项目内 typr.js（含 Typr 与 md5 两个全局），在 vm 沙箱里取出
const typrSrc = fs.readFileSync(path.join(ROOT, 'lib/typr.js'), 'utf8');
// typr.js 里残留了几处调试 console.log（line 275/299），用静音 console 屏蔽噪音
const quietConsole = { log() {}, warn() {}, error() {}, dir() {} };
const sandbox = { window: {}, self: {}, console: quietConsole, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(typrSrc, sandbox);
const Typr = sandbox.Typr;
const md5 = sandbox.md5;
if (!Typr || !Typr.U || typeof md5 !== 'function') {
  console.error('加载 typr.js 失败：Typr / md5 未就绪');
  process.exit(1);
}

// 2. 解析字体
const fontBuf = fs.readFileSync(fontPath);
const ab = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
// Typr.parse 对可变/集合字体返回字体数组，取第一个 master
const parsed = Typr.parse(ab);
const font = Array.isArray(parsed) ? parsed[0] : parsed;
if (!font || !font.cmap) {
  console.error('字体解析失败或缺少 cmap：', fontPath);
  process.exit(1);
}

// 3. 读取「乱码字符 → 真字」静态表（与该字体配套）
const staticMap = JSON.parse(fs.readFileSync(mapPath, 'utf8')).map || {};

// 与 font-decrypt.js 一致的哈希
function glyphHash(p) {
  return parseInt(md5(JSON.stringify(p)).slice(24), 16);
}

// 4. 遍历静态表：乱码码点 → 字形 path → 哈希 → 真字码点
const hashMap = {};
let ok = 0, skip = 0, collide = 0;
for (const [scrambled, real] of Object.entries(staticMap)) {
  if (!scrambled || !real) { skip++; continue; }
  const code = scrambled.codePointAt(0);
  try {
    const gid = Typr.U.codeToGlyph(font, code);
    if (!gid) { skip++; continue; }
    const p = Typr.U.glyphToPath(font, gid);
    if (!p || !p.cmds || !p.cmds.length) { skip++; continue; }
    if (typeof p.cmds[0] === 'string' && p.cmds[0].indexOf('data:') === 0) { skip++; continue; }
    const h = glyphHash(p);
    const realCode = real.codePointAt(0);
    if (hashMap[h] !== undefined && hashMap[h] !== realCode) collide++;
    hashMap[h] = realCode;
    ok++;
  } catch (e) {
    skip++;
  }
}

fs.writeFileSync(outPath, JSON.stringify(hashMap));
console.log(`字形哈希表生成完成：${ok} 条 (跳过 ${skip}，冲突 ${collide}) → ${path.relative(ROOT, outPath)}`);

// 5. 端到端自检：用哈希表反解一段已知 ground truth
//    DOM 实测：乱码「器案纪个」应解为「错误的是」
function decryptViaHash(scrambledStr) {
  let out = '';
  for (const ch of scrambledStr) {
    const code = ch.codePointAt(0);
    try {
      const gid = Typr.U.codeToGlyph(font, code);
      if (!gid) { out += ch; continue; }
      const p = Typr.U.glyphToPath(font, gid);
      if (!p || !p.cmds || !p.cmds.length) { out += ch; continue; }
      const real = hashMap[glyphHash(p)];
      out += real ? String.fromCodePoint(real) : ch;
    } catch (e) {
      out += ch;
    }
  }
  return out;
}

const cases = [
  ['器案纪个', '错误的是'],
  ['纪融售', '的描述'],
];
let pass = 0;
console.log('\n=== 端到端自检（哈希表 + 字体 → 真字）===');
for (const [scr, expect] of cases) {
  const got = decryptViaHash(scr);
  const good = got === expect;
  if (good) pass++;
  console.log(`  ${scr} → ${got}  期望 ${expect}  ${good ? 'OK' : 'FAIL'}`);
}
console.log(`自检：${pass}/${cases.length} 通过`);
process.exit(pass === cases.length ? 0 : 2);
