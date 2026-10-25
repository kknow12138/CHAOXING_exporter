const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { inflateRawSync } = require('node:zlib');
const { parseHTML } = require('linkedom');
const docx = require('docx');

const root = path.resolve(__dirname, '..');
const popupSource = fs.readFileSync(path.join(root, 'popup/popup.js'), 'utf8');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5mQAAAAASUVORK5CYII=';
const quietConsole = { log() {}, warn() {}, error() {} };

function loadPopup({ url = 'https://changjiang.yuketang.cn/v2/web/studentCards/12/34', format = 'docx', fetch } = {}) {
  const { window } = parseHTML(fs.readFileSync(path.join(root, 'popup/popup.html'), 'utf8'));
  const location = new URL(url);
  const blobs = [];
  const messages = [];
  class TestURL extends URL {
    static createObjectURL(blob) { blobs.push(blob); return 'blob:export-test'; }
    static revokeObjectURL() {}
  }
  const sandbox = {
    window, document: window.document, HTMLElement: window.HTMLElement, Node: window.Node,
    location, URL: TestURL, URLSearchParams, Blob, AbortController,
    console: quietConsole, fetch,
    setTimeout: (callback) => { queueMicrotask(callback); return 1; },
    clearTimeout() {}, setInterval, clearInterval,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
    performance: { getEntriesByType: () => [] },
    chrome: {
      tabs: { query: async () => [{ id: 1, url }], sendMessage: async () => ({ success: false }) },
      runtime: { getURL: (name) => `chrome-extension://test/${name}`, sendMessage: async (message) => { messages.push(message); return { success: true }; } },
      scripting: { executeScript: async ({ func, args = [] }) => func ? [{ result: await func(...args) }] : [] }
    }
  };
  window.location = location;
  window.fontDecryptor = { isReady: () => true, decrypt: (text) => text, _buildDynamicMapping: async () => new Map() };
  const context = vm.createContext(sandbox);
  vm.runInContext(popupSource, context, { filename: 'popup.js' });
  context.getSelectedExportFormat = () => format;
  return { context, document: window.document, window, blobs, messages };
}

function loadGenerator(overrides = {}) {
  const source = fs.readFileSync(path.join(root, 'src/docx-generator.js'), 'utf8')
    .replace(/^import \{([^}]+)\} from 'docx';/, 'const {$1} = docx;')
    .replace('export default class DocxGenerator', 'class DocxGenerator');
  const context = vm.createContext({ docx, console: quietConsole, fetch: globalThis.fetch, AbortController, setTimeout, clearTimeout, ...overrides });
  vm.runInContext(`${source}\nglobalThis.Generator = DocxGenerator;`, context);
  return new context.Generator();
}

function unzipText(buffer, wantedName) {
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const compression = buffer.readUInt16LE(offset + 8);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    if (name === wantedName) {
      const data = buffer.subarray(start, start + size);
      return (compression === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    offset = start + size;
  }
  throw new Error(`ZIP entry missing: ${wantedName}`);
}

async function wordXml(question) {
  const generator = loadGenerator();
  const document = await generator.generate({ title: '回归试卷', questions: [{ number: 1, type: '单选题', title: '测试题干', options: [], ...question }] });
  return unzipText(await docx.Packer.toBuffer(document), 'word/document.xml');
}

function shape(text) {
  return { Paragraphs: [{ Lines: [{ Texts: [{ Text: text }] }] }] };
}

function cardsResponse(slides) {
  return async () => ({ ok: true, json: async () => ({ data: { Title: '习题集', Slides: slides } }) });
}

async function htmlExport(question) {
  const state = loadPopup();
  await state.context.downloadQuizHTML({ title: '回归试卷', questions: [{ number: 1, type: '单选题', title: '测试题干', options: [], ...question }] });
  return state.blobs[0].text();
}

test('studentCards honors the selected Word format', async () => {
  const state = loadPopup({ fetch: cardsResponse([{ Problem: { ProblemID: 1 }, ProblemBodys: [shape('题干')] }]) });
  await state.context.handlePlatformExtract('yuketang');
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].action, 'generateDocx');
  assert.equal(state.blobs.length, 0);
});

test('studentCards preserves every text block in a question', async () => {
  const state = loadPopup({ fetch: cardsResponse([{ Problem: { ProblemID: 1 }, ProblemBodys: [shape('第一段题干'), shape('第二段条件')] }]) });
  const result = await state.context.extractYuketangCards(1, state.context.location.href);
  assert.equal(result.success, true);
  assert.match(result.data.questions[0].title, /第一段题干[\s\S]*第二段条件/);
});

test('studentCards rejects an empty question set', async () => {
  const state = loadPopup({ fetch: cardsResponse([]) });
  const result = await state.context.extractYuketangCards(1, state.context.location.href);
  assert.equal(result.success, false);
  assert.match(result.error, /题目/);
});

test('Word preserves ordinary options on a written question', async () => {
  const xml = await wordXml({ type: '填空题', options: [{ label: 'A', text: '不能丢失的选项' }] });
  assert.ok(xml.includes('不能丢失的选项'), 'missing ordinary options');
});

test('Word preserves my answer when no standard answer is available', async () => {
  assert.ok((await wordXml({ myAnswer: '我的独立答案', answer: '' })).includes('我的独立答案'), 'missing my answer');
});

test('Word uses the available correct answer on choice questions', async () => {
  assert.ok((await wordXml({ correctAnswer: '可见标准答案', answer: '' })).includes('可见标准答案'), 'missing correct answer');
});

test('Word preserves zero answer and zero score', async () => {
  const xml = await wordXml({ type: '填空题', score: 0, myAnswer: 0, correctAnswer: 0, answer: 0 });
  assert.ok(xml.includes('得分：0'), 'missing zero score');
  assert.ok(/<w:t[^>]*>0<\/w:t>/.test(xml), 'missing zero answer');
});

test('Word preserves images in my answer and analysis', async () => {
  const xml = await wordXml({ myAnswerImages: [{ src: png, alt: '我的答案图片' }], analysisImages: [{ src: png, alt: '解析图片' }] });
  assert.ok(xml.includes('我的答案图片'), 'missing my-answer image');
  assert.ok(xml.includes('解析图片'), 'missing analysis image');
});

test('Word preserves written-answer image-only sections', async () => {
  const xml = await wordXml({ type: '简答题', myAnswerImages: [{ src: png, alt: '主观作答图片' }], analysisImages: [{ src: png, alt: '主观解析图片' }] });
  assert.ok(xml.includes('主观作答图片'), 'missing written my-answer image');
  assert.ok(xml.includes('主观解析图片'), 'missing written analysis image');
});

test('HTML preserves numeric zero and answer/analysis image-only sections', async () => {
  const html = await htmlExport({ myAnswer: 0, correctAnswer: 0, myAnswerImages: [{ src: png, alt: '作答配图' }], analysisImages: [{ src: png, alt: '解析配图' }] });
  assert.ok(/我的答案：[\s\S]*?0/.test(html), 'missing HTML zero answer');
  assert.ok(/正确答案：[\s\S]*?0/.test(html), 'missing HTML zero correct answer');
  assert.ok(html.includes('作答配图'), 'missing HTML my-answer image');
  assert.ok(html.includes('解析配图'), 'missing HTML analysis image');
});

test('HTML renders an image only once when rich HTML already contains it', async () => {
  const html = await htmlExport({ titleHtml: `<p>图题<img src="${png}"></p>`, titleImages: [{ src: png }] });
  const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll('.stem img').length, 1);
});

test('HTML retains grouped options and escapes metadata', async () => {
  const html = await htmlExport({ type: '<img src=x onerror=alert(1)>', optionGroups: [{ number: '(1)', options: [{ label: 'A', text: '分组选项' }] }] });
  const { document } = parseHTML(html);
  assert.match(document.querySelector('.group').textContent, /分组选项/);
  assert.ok(!document.querySelector('.qtype img'), 'question type must be escaped');
});

function lmsState(problems) {
  return loadPopup({
    url: 'https://changjiang.yuketang.cn/v2/web/ai-workspace/lms-graph/12/exercise/34',
    fetch: async (url) => ({ ok: true, json: async () => url.includes('leaf_info') ? { data: { name: '作业', leaf_type_id: 34 } } : { data: { problems } } })
  });
}

test('AI workspace API keeps image-only questions', async () => {
  const state = lmsState([{ content: { TypeText: '简答题', Body: '<img src="/stem.png">' } }]);
  const result = await state.context.extractYuketangLmsGraphExercise(1, state.context.location.href);
  assert.equal(result.success, true);
  assert.equal(result.data.totalCount, 1);
  assert.equal(result.data.questions[0].titleImages[0].src, 'https://changjiang.yuketang.cn/stem.png');
});

test('AI workspace API preserves zero answers and analysis images', async () => {
  const state = lmsState([{ content: { Body: '题干', Analysis: '<img src="/analysis.png">' }, user: { answer: 0, my_answer: 0 } }]);
  const result = await state.context.extractYuketangLmsGraphExercise(1, state.context.location.href);
  assert.equal(result.data.questions[0].answer, '0');
  assert.equal(result.data.questions[0].myAnswer, '0');
  assert.equal(result.data.questions[0].analysisImages[0].src, 'https://changjiang.yuketang.cn/analysis.png');
});

test('AI workspace decryption preserves nested images and does not decode twice', async () => {
  const state = lmsState([{ content: { Body: '<span class="xuetangx-com-encrypted-font">甲<span class="xuetangx-com-encrypted-font">甲</span><img src="/inside.png"></span>' } }]);
  state.window.fontDecryptor.decrypt = (value) => value.replaceAll('乙', '丙').replaceAll('甲', '乙');
  const result = await state.context.extractYuketangLmsGraphExercise(1, state.context.location.href);
  assert.equal(result.data.questions[0].title, '乙乙');
  assert.match(result.data.questions[0].titleHtml, /inside.png/);
  assert.doesNotMatch(result.data.questions[0].titleHtml, /xuetangx-com-encrypted-font/);
});

test('Word retains a fallback URL if an image cannot be downloaded', async () => {
  const generator = loadGenerator();
  generator.fetchImageData = async () => null;
  const document = await generator.generate({ title: '失效图片', questions: [{ number: 1, type: '单选题', title: '图题', titleImages: [{ src: 'https://example.invalid/image.png' }] }] });
  const xml = unzipText(await docx.Packer.toBuffer(document), 'word/document.xml');
  assert.match(xml, /图片加载失败/);
  assert.match(xml, /https:\/\/example.invalid\/image.png/);
});

function aiDomState({ sameText = false, stalled = false, selectedOnly = false } = {}) {
  const state = loadPopup({ url: 'https://changjiang.yuketang.cn/v2/web/iframe-exercise/12', fetch: async () => ({ ok: true, json: async () => ({ map: {} }) }) });
  Object.defineProperty(state.window.HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentElement; } });
  state.window.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 600, height: 200 });
  const panel = (number) => `<section class="question-main" data-question-id="${number}"><div class="question-title">${sameText ? '相同题干' : `第${number}道题干`}</div><div class="option-item selected">A. 可见选项一</div><div class="option-item">B. 可见选项二</div>${selectedOnly ? '' : '<div class="correct-answer">正确答案：B</div>'}</section>`;
  state.document.body.innerHTML = `<button class="subject-item J_order active" data-order="1">1</button><button class="subject-item J_order" data-order="2">2</button>${panel(1)}`;
  for (const button of state.document.querySelectorAll('[data-order]')) {
    button.addEventListener('click', () => {
      state.document.querySelectorAll('[data-order]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (!stalled) state.document.querySelector('.question-main').outerHTML = panel(Number(button.dataset.order));
    });
  }
  return state;
}

test('AI navigation retains separate question IDs with identical text', async () => {
  const state = aiDomState({ sameText: true });
  const results = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  assert.equal(results[0].result.success, true);
  assert.equal(results[0].result.data.totalCount, 2);
});

test('AI navigation reports stalled/incomplete traversal instead of partial success', async () => {
  const state = aiDomState({ stalled: true });
  const results = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  assert.equal(results[0].result.success, false);
  assert.match(results[0].result.error, /完整|加载|切换/);
});

test('AI selected options are my answer, not an invented correct answer', async () => {
  const state = aiDomState({ selectedOnly: true });
  const results = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  const question = results[0].result.data.questions[0];
  assert.ok(!question.answer, 'selected option must not become correct answer');
  assert.match(question.myAnswer, /A/);
});

test('all-frame extraction waits for a font map that finishes after three seconds', async () => {
  const state = loadPopup();
  let elapsed = 0;
  let parsedAt = -1;
  const intervals = new Map();
  const timeouts = new Map();
  let id = 0;
  state.context.setInterval = (callback) => { intervals.set(++id, callback); return id; };
  state.context.clearInterval = (timer) => intervals.delete(timer);
  state.context.setTimeout = (callback, delay) => { timeouts.set(++id, { callback, deadline: elapsed + delay }); return id; };
  state.context.clearTimeout = (timer) => timeouts.delete(timer);
  state.window.fontDecryptor.isReady = () => elapsed >= 4000;
  state.window.QuestionExportParser = class {
    findQuestions() { return [{}]; }
    parseQuestion() { parsedAt = elapsed; return { title: '题目' }; }
    extractPageTitle() { return '字体测试'; }
  };
  const pending = state.context.runExtractorInAllFrames(1);
  for (elapsed = 100; elapsed <= 5000; elapsed += 100) {
    [...intervals.values()].forEach((callback) => callback());
    for (const [timer, item] of timeouts) {
      if (item.deadline <= elapsed) { timeouts.delete(timer); item.callback(); }
    }
    await Promise.resolve();
  }
  await pending;
  assert.ok(parsedAt >= 4000, `parser ran prematurely at ${parsedAt}ms`);
});

function loadParser(html, url = 'https://mooc1.chaoxing.com/work/view') {
  const state = loadPopup({ url });
  state.document.body.innerHTML = html;
  vm.runInContext(fs.readFileSync(path.join(root, 'content/parser.js'), 'utf8'), state.context);
  return { ...state, parser: new state.window.QuestionExportParser() };
}

test('Chaoxing parser keeps answer, my-answer and analysis images in their own sections', () => {
  const state = loadParser(`<div class="questionLi"><h3 class="qtContent">简答题：说明图示<img src="/stem.png"></h3>
    <div class="mark_answer"><dl class="mark_fill colorDeep"><dt>我的答案：</dt><dd><img src="/mine.png"></dd></dl>
    <dl class="mark_fill colorGreen"><dt>正确答案：</dt><dd><img src="/correct.png"></dd></dl>
    <div class="analysis">答案解析：<img src="/analysis.png"></div></div></div>`);
  const question = state.parser.parseQuestion(state.document.querySelector('.questionLi'), 0);
  assert.deepEqual(Array.from(question.titleImages, (image) => image.src), ['https://mooc1.chaoxing.com/stem.png']);
  assert.deepEqual(Array.from(question.answerImages || [], (image) => image.src), ['https://mooc1.chaoxing.com/correct.png']);
  assert.deepEqual(Array.from(question.myAnswerImages || [], (image) => image.src), ['https://mooc1.chaoxing.com/mine.png']);
  assert.deepEqual(Array.from(question.analysisImages || [], (image) => image.src), ['https://mooc1.chaoxing.com/analysis.png']);
});

test('ordinary Yuketang DOM parser preserves stem and analysis images', () => {
  const state = loadParser('<div data-question-id="1"><div class="question-stem">图示说明<img src="/stem.png"></div><div class="analysis">解析<img src="/analysis.png"></div></div>', 'https://changjiang.yuketang.cn/exam/result');
  const question = state.parser.parseQuestion(state.document.querySelector('[data-question-id]'), 0);
  assert.equal(question.titleImages?.[0]?.src, 'https://changjiang.yuketang.cn/stem.png');
  assert.equal(question.analysisImages?.[0]?.src, 'https://changjiang.yuketang.cn/analysis.png');
});

test('parser preserves lazy-loaded images and small mathematical images', () => {
  const state = loadParser('<div class="questionLi"><img src="/loading.gif" data-src="/diagram.png"><img src="/formula.png" width="16" height="16"></div>');
  const images = state.parser.extractImagesFromNode(state.document.querySelector('.questionLi'));
  assert.deepEqual(Array.from(images, (image) => image.src), ['https://mooc1.chaoxing.com/diagram.png', 'https://mooc1.chaoxing.com/formula.png']);
});

test('background download filename accepts a missing or empty title', () => {
  const source = fs.readFileSync(path.join(root, 'src/service-worker.js'), 'utf8').replace(/^import .*$/m, '');
  const context = vm.createContext({ chrome: { runtime: { onMessage: { addListener() {} } } }, console: quietConsole });
  vm.runInContext(source, context);
  assert.equal(context.sanitizeFilename(undefined), '题目');
  assert.equal(context.sanitizeFilename(''), '题目');
});

test('content extraction fails instead of exporting before font initialization finishes', async () => {
  const state = loadPopup();
  state.window.fontDecryptor.isReady = () => false;
  let handler;
  let parsed = false;
  state.context.chrome.runtime.onMessage = { addListener: (listener) => { handler = listener; } };
  state.context.setInterval = () => 1;
  state.context.clearInterval = () => {};
  state.context.QuestionExportParser = class {
    findQuestions() { parsed = true; return [{}]; }
    parseQuestion() { return { title: '未解密文本' }; }
    extractPageTitle() { return '字体测试'; }
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'content/content.js'), 'utf8'), state.context);
  const result = await new Promise((resolve) => handler({ action: 'extractQuestions' }, {}, resolve));
  assert.equal(result.success, false);
  assert.equal(parsed, false);
  assert.match(result.error, /字体/);
});

test('AI workspace keeps image-only answers and my answers', async () => {
  const state = lmsState([{ content: { Body: '题干' }, user: { answer: '<img src="/correct.png">', my_answer: '<img src="/mine.png">' } }]);
  const result = await state.context.extractYuketangLmsGraphExercise(1, state.context.location.href);
  assert.equal(result.data.questions[0].answerImages?.[0]?.src, 'https://changjiang.yuketang.cn/correct.png');
  assert.equal(result.data.questions[0].myAnswerImages?.[0]?.src, 'https://changjiang.yuketang.cn/mine.png');
  assert.ok(!result.data.questions[0].answer.includes('<img'), 'HTML must not leak into Word text');
});

test('rich HTML export strips executable elements and unsafe URLs', async () => {
  const html = await htmlExport({ titleHtml: '<p onclick="alert(1)">题干</p><iframe src="https://example.invalid"></iframe><a href="javascript:alert(1)">参考</a><img src="javascript:alert(1)">', titleImages: [{ src: 'javascript:alert(2)' }] });
  const { document } = parseHTML(html);
  const stem = document.querySelector('.stem');
  assert.ok(!stem.querySelector('iframe, [onclick]'), 'unsafe element/handler preserved');
  assert.ok(!stem.innerHTML.includes('javascript:'), 'unsafe URL preserved');
});

test('all-frame font timeout is fatal and never parses undecoded questions', async () => {
  const state = loadPopup();
  state.window.fontDecryptor.isReady = () => false;
  state.context.setInterval = () => 1;
  state.context.clearInterval = () => {};
  let parsed = false;
  state.window.QuestionExportParser = class {
    findQuestions() { return [{}]; }
    parseQuestion() { parsed = true; return { title: '未解密文本' }; }
  };
  const results = await state.context.runExtractorInAllFrames(1);
  assert.equal(parsed, false);
  assert.equal(results[0].result.fatal, true);
  assert.match(results[0].result.error, /字体/);
});

test('all-frame selection preserves fatal errors even when another frame succeeds', async () => {
  const state = loadPopup();
  const failure = { success: false, fatal: true, error: '字体仍在加载，请稍后重试导出' };
  state.context.runExtractorInAllFrames = async () => [
    { result: { success: true, data: { totalCount: 1, questions: [{ title: '部分题目' }] } } },
    { result: failure }
  ];
  assert.equal(await state.context.extractQuestionsFromAllFrames(1), failure);
});

test('all-frame selection preserves a fatal error after content injection', async () => {
  const state = loadPopup();
  const failure = { success: false, fatal: true, error: '字体仍在加载，请稍后重试导出' };
  let runs = 0;
  state.context.runExtractorInAllFrames = async () => ++runs === 1 ? [] : [{ result: failure }];
  assert.equal(await state.context.extractQuestionsFromAllFrames(1), failure);
  assert.equal(runs, 2);
});

test('popup does not fallback to partial content after a fatal frame error', async () => {
  for (const platform of ['chaoxing', 'yuketang']) {
    const state = loadPopup();
    const failure = { success: false, fatal: true, error: '字体仍在加载，请稍后重试导出' };
    state.context.extractQuestionsFromAllFrames = async () => failure;
    state.context.extractYuketangAiExerciseFromAllFrames = async () => null;
    let fallback = false;
    state.context.requestQuestions = async () => { fallback = true; return { success: true }; };
    assert.equal(await state.context.extractQuestionsFromTab(1, platform), failure);
    assert.equal(fallback, false);
  }
});

test('a frame without questions cannot block export on font readiness', async () => {
  const state = loadPopup();
  state.window.fontDecryptor.isReady = () => false;
  state.context.setInterval = () => 1;
  state.context.clearInterval = () => {};
  state.window.QuestionExportParser = class {
    findQuestions() { return []; }
    getNoQuestionMessage() { return '没有题目'; }
  };
  const results = await state.context.runExtractorInAllFrames(1);
  assert.equal(results[0].result.error, '没有题目');
  assert.ok(!results[0].result.fatal);
});

test('AI DOM exports stem, options, my-answer, answer and analysis images to Word', async () => {
  const state = aiDomState();
  state.document.body.innerHTML = `<section class="question-main" data-question-id="1">
    <div class="question-title">图示对应哪一个选项？<img src="${png}" alt="AI题干图"></div>
    <div class="option-item">A. 图一<img src="${png}" alt="AI选项图"></div><div class="option-item">B. 图二</div>
    <div class="my-answer">我的答案：<img src="${png}" alt="AI作答图"></div>
    <div class="correct-answer">正确答案：<img src="${png}" alt="AI答案图"></div>
    <div class="analysis">答案解析：<img src="${png}" alt="AI解析图"></div></section>`;
  const [{ result }] = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  assert.equal(result.success, true);
  const question = result.data.questions[0];
  assert.equal(question.titleImages?.[0]?.alt, 'AI题干图');
  assert.equal(question.options[0]?.images?.[0]?.alt, 'AI选项图');
  assert.equal(question.myAnswerImages?.[0]?.alt, 'AI作答图');
  assert.equal(question.answerImages?.[0]?.alt, 'AI答案图');
  assert.equal(question.analysisImages?.[0]?.alt, 'AI解析图');
  const xml = await wordXml(question);
  for (const alt of ['AI题干图', 'AI选项图', 'AI作答图', 'AI答案图', 'AI解析图']) assert.ok(xml.includes(alt), `missing ${alt}`);
});

test('AI DOM preserves image-only titles and labeled image-only options', async () => {
  const state = aiDomState();
  state.document.body.innerHTML = `<section class="question-main" data-question-id="1">
    <div class="question-title"><img data-src="/stem.png" src="/loading.gif"></div>
    <div class="option-item">A. <img data-src="/one.png" src="/loading.gif"></div>
    <div class="option-item">B. <img src="/two.png"></div></section>`;
  const [{ result }] = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  assert.equal(result.success, true);
  const question = result.data.questions[0];
  assert.equal(question.titleImages?.[0]?.src, 'https://changjiang.yuketang.cn/stem.png');
  assert.equal(question.options.length, 2);
  assert.equal(question.options[0].label, 'A');
  assert.equal(question.options[0].images?.[0]?.src, 'https://changjiang.yuketang.cn/one.png');
  assert.match(question.titleHtml, /\/stem.png/);
  assert.doesNotMatch(question.titleHtml, /loading.gif/);
});

test('DOM question discovery preserves image sections through Word export', async () => {
  const state = loadParser(`<div class="questionLi"><h3 class="qtContent">简答题：请说明图示中的对应关系<img src="${png}" alt="发现题干图"></h3>
    <div class="mark_answer"><dl class="mark_fill colorDeep"><dt>我的答案：</dt><dd><img src="${png}" alt="发现作答图"></dd></dl>
    <dl class="mark_fill colorGreen"><dt>正确答案：</dt><dd><img src="${png}" alt="发现答案图"></dd></dl>
    <div class="analysis">答案解析：<img src="${png}" alt="发现解析图"></div></div></div>`);
  const elements = state.parser.findQuestions();
  assert.equal(elements.length, 1);
  const question = state.parser.parseQuestion(elements[0], 0);
  const xml = await wordXml(question);
  for (const alt of ['发现题干图', '发现作答图', '发现答案图', '发现解析图']) assert.ok(xml.includes(alt), `missing ${alt}`);
});

for (const stalledAt of ['headers', 'body']) {
  test(`Word image download timeout bounds stalled ${stalledAt} and preserves fallback URL`, async () => {
    let signal;
    let timeout;
    let cleared = false;
    const generator = loadGenerator({
      fetch: (_url, options) => {
        signal = options.signal;
        const stalled = () => new Promise((_resolve, reject) => {
          if (signal?.aborted) reject(new Error('Aborted'));
          else signal?.addEventListener('abort', () => reject(new Error('Aborted')));
        });
        return stalledAt === 'headers' ? stalled() : Promise.resolve({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: stalled });
      },
      setTimeout: (callback, delay) => { timeout = { callback, delay }; return 7; },
      clearTimeout: (timer) => { if (timer === 7) cleared = true; }
    });
    const pending = generator.generate({ title: '图片超时', questions: [{ number: 1, title: '题干', titleImages: [{ src: 'https://example.invalid/stalled.png' }] }] });
    await Promise.resolve();
    assert.ok(signal, 'image fetch must receive an abort signal');
    assert.ok(timeout && timeout.delay > 0 && timeout.delay <= 15000, 'image fetch needs a bounded timeout');
    timeout.callback();
    const xml = unzipText(await docx.Packer.toBuffer(await pending), 'word/document.xml');
    assert.ok(signal.aborted);
    assert.ok(cleared, 'timeout must be cleared after abort');
    assert.match(xml, /图片加载失败/);
    assert.match(xml, /https:\/\/example.invalid\/stalled.png/);
  });
}

test('Word clears image timeout after a successful response', async () => {
  let cleared = false;
  const bytes = Uint8Array.from(Buffer.from(png.split(',')[1], 'base64')).buffer;
  const generator = loadGenerator({
    fetch: async () => ({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => bytes }),
    setTimeout: () => 8,
    clearTimeout: (timer) => { if (timer === 8) cleared = true; }
  });
  assert.equal(await generator.fetchImageData('https://example.invalid/ok.png'), bytes);
  assert.ok(cleared, 'successful download must clear its timeout');
});

test('AI DOM retains a standalone image-only question without options or answers', async () => {
  const state = aiDomState();
  state.document.body.innerHTML = `<section class="question-main" data-question-id="1"><div class="question-title"><img src="${png}" alt="独立图片题"></div></section>`;
  const [{ result }] = await state.context.runYuketangAiExerciseExtractorInAllFrames(1);
  assert.equal(result.success, true);
  assert.equal(result.data.totalCount, 1);
  const xml = await wordXml(result.data.questions[0]);
  assert.ok(xml.includes('独立图片题'));
});

test('HTML rich images inherit the export width constraint', async () => {
  const html = await htmlExport({ titleHtml: `<img src="${png}" width="2400" style="width:2400px">` });
  const { document } = parseHTML(html);
  const styles = document.querySelector('style').textContent;
  assert.match(styles, /\.rich img[^{}]*\{[^{}]*max-width:100%[^{}]*height:auto/);
  assert.ok(document.querySelector('.rich img'));
});
