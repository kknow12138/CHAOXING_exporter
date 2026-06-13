const platformConfigs = {
  chaoxing: {
    name: '学习通',
    hosts: ['chaoxing.com', '.edu.cn'],
    pageHint: '请在学习通的考试、作业或测验页面使用此按钮'
  },
  yuketang: {
    name: '雨课堂',
    hosts: ['yuketang.cn', 'changjiang-exam.yuketang.cn', '.edu.cn'],
    pageHint: '请在雨课堂的试卷或考试结果页面使用此按钮'
  },
  ketangpai: {
    name: '课堂派',
    hosts: ['ketangpai.com'],
    pageHint: '请在课堂派的测试或作业详情页面使用此按钮'
  },
  zhihuishu: {
    name: '智慧树',
    hosts: ['zhihuishu.com'],
    pageHint: '请在智慧树的考试、作业或试卷页面使用此按钮'
  }
};

document.querySelectorAll('.platform-btn').forEach((button) => {
  button.addEventListener('click', () => {
    handlePlatformExtract(button.dataset.platform);
  });
});

async function handlePlatformExtract(platform) {
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const buttons = Array.from(document.querySelectorAll('.platform-btn'));
  const config = platformConfigs[platform];

  try {
    buttons.forEach((button) => {
      button.disabled = true;
    });
    statusDiv.textContent = `正在抓取${config.name}题目...`;
    statusDiv.className = 'status loading';
    resultDiv.className = 'result hidden';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!isSupportedPlatformPage(tab.url, platform)) {
      throw new Error(config.pageHint);
    }

    // 雨课堂 studentCards 页面：走 API 提取 → 导出 HTML
    if (platform === 'yuketang' && isYuketangCardsPage(tab.url)) {
      const response = await extractYuketangCards(tab.id, tab.url);
      if (!response.success) throw new Error(response.error);

      statusDiv.textContent = `雨课堂成功抓取 ${response.data.totalCount} 道题目`;
      statusDiv.className = 'status success';
      resultDiv.innerHTML = `
        <p>✓ 平台: 雨课堂（习题集）</p>
        <p>✓ 题目数量: ${response.data.totalCount}</p>
        <p>✓ HTML 文件已下载（可打开后打印为 PDF）</p>
      `;
      resultDiv.className = 'result';
      downloadQuizHTML(response.data);
      return;
    }

    const response = await extractQuestionsFromTab(tab.id, platform);

    if (!response.success) {
      throw new Error(response.error);
    }

    statusDiv.textContent = `${config.name}成功抓取 ${response.data.totalCount} 道题目`;
    statusDiv.className = 'status success';

    resultDiv.innerHTML = `
      <p>平台: ${config.name}</p>
      <p>题目数量: ${response.data.totalCount}</p>
      <p>正在生成 Word 文档...</p>
    `;
    resultDiv.className = 'result';

    await generateAndDownload(response.data);

    resultDiv.innerHTML = `
      <p>✓ 平台: ${config.name}</p>
      <p>✓ 题目数量: ${response.data.totalCount}</p>
      <p>✓ Word 文档已生成并下载</p>
    `;
  } catch (error) {
    statusDiv.textContent = '错误: ' + error.message;
    statusDiv.className = 'status error';
    resultDiv.className = 'result hidden';
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

async function generateAndDownload(data) {
  const response = await chrome.runtime.sendMessage({
    action: 'generateDocx',
    data: data
  });

  if (!response.success) {
    throw new Error(response.error);
  }
}

async function extractQuestionsFromTab(tabId, platform) {
  if (platform === 'chaoxing') {
    const frameResponse = await extractQuestionsFromAllFrames(tabId);
    if (frameResponse && frameResponse.success) {
      return frameResponse;
    }
  }

  try {
    return await requestQuestions(tabId);
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    await injectContentScripts(tabId);
    return await requestQuestions(tabId);
  }
}

async function extractQuestionsFromAllFrames(tabId) {
  let results = await runExtractorInAllFrames(tabId);
  let bestResponse = pickBestFrameResponse(results);

  if (bestResponse) {
    return bestResponse;
  }

  await injectContentScripts(tabId, true);
  results = await runExtractorInAllFrames(tabId);
  bestResponse = pickBestFrameResponse(results);
  return bestResponse || null;
}

async function runExtractorInAllFrames(tabId) {
  try {
    return await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: async () => {
        const waitForFontDecryptor = () => new Promise((resolve) => {
          const timer = setInterval(() => {
            if (!window.fontDecryptor || window.fontDecryptor.isReady()) {
              clearInterval(timer);
              resolve();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(timer);
            resolve();
          }, 3000);
        });

        if (!window.QuestionExportParser) {
          return { success: false, error: 'parser not ready' };
        }

        await waitForFontDecryptor();

        const parser = new window.QuestionExportParser();
        const questionElements = parser.findQuestions();

        if (questionElements.length === 0) {
          return { success: false, error: parser.getNoQuestionMessage() };
        }

        const questions = questionElements.map((element, index) => parser.parseQuestion(element, index));

        return {
          success: true,
          data: {
            title: parser.extractPageTitle(),
            platform: parser.platform,
            questions,
            totalCount: questions.length
          }
        };
      }
    });
  } catch (error) {
    return [];
  }
}

function pickBestFrameResponse(results) {
  return (results || [])
    .map((item) => item.result)
    .filter((result) => result && result.success && result.data && result.data.totalCount > 0)
    .sort((a, b) => b.data.totalCount - a.data.totalCount)[0] || null;
}

async function requestQuestions(tabId) {
  return await chrome.tabs.sendMessage(tabId, {
    action: 'extractQuestions'
  });
}

function isMissingContentScriptError(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(error.message || '');
}

async function injectContentScripts(tabId, allFrames = false) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames },
    files: [
      'lib/typr.js',
      'lib/font-decrypt.js',
      'content/parser.js',
      'content/content.js'
    ]
  });
}

function isSupportedPlatformPage(url, platform) {
  if (!url || !platformConfigs[platform]) {
    return false;
  }

  return platformConfigs[platform].hosts.some((host) => url.includes(host));
}

// ── 雨课堂 studentCards 习题集支持 ────────────────────────────────

function isYuketangCardsPage(url) {
  return url && url.includes('yuketang.cn') && url.includes('/studentCards/');
}

// 注入 MAIN world，调用 cards detlist API 提取题目
async function extractYuketangCards(tabId, url) {
  // 从 URL 解析 cards_id 和 classroom_id
  const m = url.match(/\/studentCards\/(\d+)\/(\d+)/);
  const params = new URLSearchParams(new URL(url).search);
  const classroomId = params.get('classroom_id') || (m && m[1]) || '';
  const cardsId = m ? m[2] : '';

  if (!cardsId) {
    return { success: false, error: '无法从 URL 解析课件 ID，请确认在 studentCards 页面' };
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (cardsId, classroomId) => {
      // 从 shape 提取纯文本（Paragraphs → Lines → Texts → Text）
      function shapeText(shape) {
        if (!shape) return '';
        const lines = [];
        for (const para of shape.Paragraphs ?? []) {
          for (const line of para.Lines ?? []) {
            const t = (line.Texts ?? []).map(t => t.Text ?? '').join('');
            if (t.trim()) lines.push(t.trim());
          }
        }
        return lines.join('\n');
      }

      const PTYPES = { 0: '单选题', 1: '多选题', 2: '填空题', 3: '主观题', 4: '投票题' };

      try {
        const base = location.origin;
        const resp = await fetch(
          `${base}/v2/api/web/cards/detlist/${cardsId}?classroom_id=${classroomId}`,
          { credentials: 'include', headers: { 'xtbz': 'ykt', 'xt-agent': 'web' } }
        );
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const json = await resp.json();
        const body = json.data ?? json;
        const title = body.Title || `课件_${cardsId}`;
        const slides = body.Slides ?? [];

        const questions = slides
          .filter(s => s.problem_result?.answer || s.Problem?.ProblemID)
          .map((s, idx) => {
            const pr = s.problem_result ?? {};
            const answer = String(pr.answer ?? '');
            const type = PTYPES[pr.problem_type] ?? '题目';
            const stem = shapeText(s.ProblemBodys?.['0']);
            const options = (s.Problem?.Bullets ?? []).map(b => {
              const contents = Array.isArray(b.Contents)
                ? b.Contents
                : Object.values(b.Contents ?? {});
              const text = contents.map(c => shapeText(c)).filter(Boolean).join(' ');
              return { label: b.Label ?? '', text };
            });
            return { number: idx + 1, type, title: stem, options, answer, analysis: '' };
          });

        return {
          success: true,
          data: { title, platform: 'yuketang', questions, totalCount: questions.length }
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    args: [cardsId, classroomId]
  });

  return result?.result ?? { success: false, error: '脚本注入失败' };
}

// 生成题目 HTML 并触发下载
function downloadQuizHTML(data) {
  const { title, questions } = data;
  const CORRECT_COLOR = '#2e7d32';
  const ts = new Date().toLocaleString('zh-CN');

  const items = questions.map(q => {
    const optsHTML = q.options.length
      ? '<div class="opts">' +
        q.options.map(o => {
          const ok = q.answer.toUpperCase().includes(o.label.toUpperCase());
          return `<div class="opt${ok ? ' correct' : ''}">
            <span class="lbl">${o.label}</span>
            <span>${escHtml(o.text)}</span>
          </div>`;
        }).join('') +
        '</div>'
      : '';

    return `<div class="q">
  <div class="qhead">
    <span class="qnum">第 ${q.number} 题</span>
    <span class="qtype">${q.type}</span>
  </div>
  <div class="stem">${escHtml(q.title)}</div>
  ${optsHTML}
  ${q.answer ? `<div class="ans">✅ 正确答案：<strong>${q.answer}</strong></div>` : ''}
  ${q.analysis ? `<div class="analysis">💡 解析：${escHtml(q.analysis)}</div>` : ''}
</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>${escHtml(title)} — 随堂题目</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
       max-width:860px;margin:0 auto;padding:24px 16px;background:#f7f7f8;color:#333;line-height:1.7}
  h1{color:#1a1a2e;border-bottom:3px solid #4a90e2;padding-bottom:12px;margin-bottom:6px;font-size:22px}
  .meta{color:#999;font-size:13px;margin-bottom:24px}
  .q{background:#fff;border:1px solid #e8e8e8;border-radius:10px;padding:18px 20px;
     margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
  .qhead{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .qnum{font-weight:700;font-size:16px;color:#1a1a2e}
  .qtype{font-size:11px;background:#eef3fb;color:#4a90e2;padding:2px 8px;border-radius:10px;font-weight:600}
  .stem{font-size:16px;font-weight:500;margin-bottom:16px;white-space:pre-wrap;line-height:1.8}
  .opts{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
  .opt{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;
       background:#f9f9f9;border:1px solid #eee;border-radius:8px;font-size:15px}
  .opt.correct{background:#f0faf0;border-color:#81c784;color:${CORRECT_COLOR}}
  .lbl{font-weight:700;min-width:22px;flex-shrink:0}
  .ans{background:#e8f5e9;color:${CORRECT_COLOR};border-radius:6px;
       padding:10px 14px;font-size:14px;margin-top:10px}
  .analysis{background:#fff8e1;color:#795548;border-radius:6px;
            padding:10px 14px;font-size:13px;margin-top:8px}
  .print-btn{position:fixed;top:16px;right:16px;background:#4a90e2;color:#fff;
             border:none;border-radius:8px;padding:10px 20px;font-size:14px;
             font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);z-index:999}
  .print-btn:hover{background:#357abd}
  @media print{
    .print-btn{display:none}
    body{background:#fff;padding:0}
    .q{box-shadow:none;border:1px solid #ddd;break-inside:avoid}
  }
</style></head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ 打印 / 导出 PDF</button>
<h1>📝 ${escHtml(title)} — 随堂题目</h1>
<p class="meta">共 ${questions.length} 道题 · 导出时间：${ts}</p>
${items}
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${sanitizeFilename(title)}_题目.html`
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeFilename(name) {
  return String(name ?? '题目').replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}
