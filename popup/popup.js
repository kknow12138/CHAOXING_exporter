const platformConfigs = {
  chaoxing: {
    name: '学习通',
    hosts: ['chaoxing.com'],
    pageHint: '请在学习通的考试、作业或测验页面使用此按钮'
  },
  yuketang: {
    name: '雨课堂',
    hosts: ['yuketang.cn', 'changjiang-exam.yuketang.cn'],
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
  const exportFormat = getSelectedExportFormat();

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

    // 雨课堂 AI 学习空间作业页：从当前“作业”节点走 API 提取，避免误抓知识点目录
    if (platform === 'yuketang' && isYuketangLmsGraphExercisePage(tab.url)) {
      const response = await extractYuketangLmsGraphExercise(tab.id, tab.url);
      if (!response.success) throw new Error(response.error);

      statusDiv.textContent = `雨课堂成功抓取 ${response.data.totalCount} 道题目`;
      statusDiv.className = 'status success';
      resultDiv.innerHTML = `
        <p>✓ 平台: 雨课堂（AI 学习空间作业）</p>
        <p>✓ 题目数量: ${response.data.totalCount}</p>
        <p>✓ 正在生成${exportFormat === 'html' ? ' HTML 网页' : ' Word 文档'}...</p>
      `;
      resultDiv.className = 'result';

      if (exportFormat === 'html') {
        downloadQuizHTML(response.data);
      } else {
        await generateAndDownload(response.data);
      }

      resultDiv.innerHTML = `
        <p>✓ 平台: 雨课堂（AI 学习空间作业）</p>
        <p>✓ 题目数量: ${response.data.totalCount}</p>
        <p>✓ ${exportFormat === 'html' ? 'HTML 网页已生成并下载，可打开后打印为 PDF' : 'Word 文档已生成并下载'}</p>
      `;
      return;
    }

    // 雨课堂 studentCards 页面：走 API 提取，默认导出 HTML
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
      <p>正在生成${exportFormat === 'html' ? ' HTML 网页' : ' Word 文档'}...</p>
    `;
    resultDiv.className = 'result';

    if (exportFormat === 'html') {
      downloadQuizHTML(response.data);
    } else {
      await generateAndDownload(response.data);
    }

    resultDiv.innerHTML = `
      <p>✓ 平台: ${config.name}</p>
      <p>✓ 题目数量: ${response.data.totalCount}</p>
      <p>✓ ${exportFormat === 'html' ? 'HTML 网页已生成并下载，可打开后打印为 PDF' : 'Word 文档已生成并下载'}</p>
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

function getSelectedExportFormat() {
  return document.querySelector('input[name="export-format"]:checked')?.value || 'docx';
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

  if (platform === 'yuketang') {
    const aiExerciseResponse = await extractYuketangAiExerciseFromAllFrames(tabId);
    if (aiExerciseResponse && aiExerciseResponse.success) {
      return aiExerciseResponse;
    }

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

async function extractYuketangAiExerciseFromAllFrames(tabId) {
  let results = await runYuketangAiExerciseExtractorInAllFrames(tabId);
  let bestResponse = pickBestFrameResponse(results);

  if (bestResponse) {
    return bestResponse;
  }

  await injectContentScripts(tabId, true);
  results = await runYuketangAiExerciseExtractorInAllFrames(tabId);
  bestResponse = pickBestFrameResponse(results);
  return bestResponse || null;
}

async function runYuketangAiExerciseExtractorInAllFrames(tabId) {
  try {
    return await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: async () => {
        const waitOnce = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
        const loadYuketangFontMap = async () => {
          try {
            const response = await fetch(chrome.runtime.getURL('lib/yuketang-font-map.json'));
            if (!response.ok) {
              return new Map();
            }

            const payload = await response.json();
            const rawMap = payload.map || payload || {};
            return new Map(Object.entries(rawMap).map(([key, value]) => {
              const sourceChar = /^\d+$/.test(key) ? String.fromCharCode(Number(key)) : key;
              return [sourceChar, String(value)];
            }));
          } catch (error) {
            return new Map();
          }
        };

        const isYuketangHost = location.hostname.includes('yuketang.cn');
        const orderButtons = Array.from(document.querySelectorAll([
          '.subject-item.J_order[data-order]',
          '.subject-item[data-order]',
          '[data-order].J_order',
          '[data-order][class*="subject"]'
        ].join(', '))).filter((button) => {
          return button instanceof HTMLElement && button.offsetParent !== null;
        });
        const isIframeExercise = /\/v2\/web\/iframe-exercise\//.test(location.href);

        if (!isYuketangHost || (!isIframeExercise && orderButtons.length === 0)) {
          return { success: false, error: 'not yuketang ai exercise frame' };
        }

        const yuketangFontMap = await loadYuketangFontMap();

        const cleanText = (text) => String(text || '')
          .replace(/\u00a0/g, ' ')
          .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
          .replace(/[ \t]*\n+[ \t]*/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const decryptNodeText = (node) => {
          const decryptText = (text) => Array.from(String(text || ''))
            .map((char) => yuketangFontMap.get(char) || char)
            .join('');

          if (window.fontDecryptor && window.fontDecryptor.isReady()) {
            if (typeof window.fontDecryptor.decryptNodeText === 'function') {
              return window.fontDecryptor.decryptNodeText(node);
            }

            return window.fontDecryptor.decrypt(node?.textContent || '');
          }

          if (!node) {
            return '';
          }

          if (node.nodeType === 3) {
            return decryptText(node.nodeValue || '');
          }

          if (node.nodeType !== 1) {
            return '';
          }

          if (node.classList && node.classList.contains('xuetangx-com-encrypted-font')) {
            return decryptText(node.textContent || '');
          }

          return Array.from(node.childNodes || [])
            .map((child) => decryptNodeText(child))
            .join('');
        };

        const isVisible = (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0;
        };

        const noiseSelectors = [
          'script',
          'style',
          'noscript',
          'template',
          '.subject-item.J_order',
          '.subject-item[data-order]',
          '[data-order].J_order',
          '[data-order][class*="subject"]',
          '[class*="pagination"]',
          '[class*="nav"]',
          '[class*="menu"]',
          '[class*="toolbar"]'
        ];

        const removeNoise = (root) => {
          noiseSelectors.forEach((selector) => {
            root.querySelectorAll(selector).forEach((child) => child.remove());
          });
        };

        const readVisibleText = (node) => {
          if (!node) {
            return '';
          }

          const clone = node.cloneNode(true);
          removeNoise(clone);

          return cleanText(decryptNodeText(clone) || clone.innerText || clone.textContent || '');
        };

        const sanitizeRichHtml = (node) => {
          if (!node) {
            return '';
          }

          const clone = node.cloneNode(true);
          removeNoise(clone);
          clone.querySelectorAll('*').forEach((element) => {
            Array.from(element.attributes || []).forEach((attr) => {
              const name = attr.name.toLowerCase();
              if (name.startsWith('on') || name === 'style') {
                element.removeAttribute(attr.name);
                return;
              }

              if (!['class', 'src', 'alt', 'title', 'href'].includes(name)) {
                element.removeAttribute(attr.name);
                return;
              }

              if (name === 'src') {
                try {
                  element.setAttribute('src', new URL(attr.value, location.href).href);
                } catch (error) {
                  element.removeAttribute('src');
                }
              }

              if (name === 'href' && /^javascript:/i.test(attr.value || '')) {
                element.removeAttribute('href');
              }
            });
          });

          return clone.innerHTML || clone.textContent || '';
        };

        const findYuketangFontUrl = () => {
          const defaultFontUrl = 'https://fe-static-yuketang.yuketang.cn/fe_font/product/exam_font_239fdcc493de4ef5a4d14835f3a0243c.ttf';
          const resourceUrl = (performance.getEntriesByType('resource') || [])
            .map((entry) => entry.name)
            .find((url) => /exam_font_[\w-]+\.ttf/i.test(url));
          if (resourceUrl) {
            return resourceUrl;
          }

          const styleText = Array.from(document.querySelectorAll('style'))
            .map((style) => style.textContent || '')
            .join('\n');
          const match = styleText.match(/https?:\/\/[^"')\s]+exam_font_[^"')\s]+\.ttf/i);
          return match ? match[0] : defaultFontUrl;
        };

        const visibleElements = (selector, scope = document) => {
          return Array.from(scope.querySelectorAll(selector)).filter(isVisible);
        };

        const scoreQuestionPanel = (node) => {
          const text = readVisibleText(node);
          if (!text || text.length < 4) {
            return -Infinity;
          }

          let score = Math.min(text.length, 1200) / 100;
          if (/(正确答案|参考答案|标准答案|我的答案|答案解析|解析)/.test(text)) score += 8;
          if (/(单选题|多选题|判断题|填空题|简答题|主观题)/.test(text)) score += 4;
          if (/(^|\s)[A-H][\.\s、:：\)]\s*\S+/.test(text)) score += 5;
          if (node.querySelector('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]')) score += 4;
          if (node.matches('.subject-item, [data-order], [class*="nav"], [class*="menu"]')) score -= 20;
          if (visibleElements('.subject-item.J_order[data-order], .subject-item[data-order], [data-order].J_order', node).length > 3) score -= 15;
          return score;
        };

        const findQuestionPanel = () => {
          const selectors = [
            '.question-main',
            '.question-content',
            '.question-detail',
            '.subject-detail',
            '.subject-content',
            '.exercise-subject',
            '.exercise-content',
            '.problem-detail',
            '.problem-content',
            '.container-problem',
            '.a4-paper-problem',
            '[data-question-id]',
            '[data-problem-id]',
            '[class*="question-main"]',
            '[class*="question-content"]',
            '[class*="questionDetail"]',
            '[class*="subject-detail"]',
            '[class*="subjectContent"]',
            '[class*="problem-detail"]',
            '[class*="problemContent"]'
          ];
          const candidates = selectors.flatMap((selector) => visibleElements(selector));
          const unique = Array.from(new Set(candidates.length > 0 ? candidates : visibleElements('main, section, article, .content, .main, body')));
          return unique
            .map((node) => ({ node, score: scoreQuestionPanel(node) }))
            .sort((a, b) => b.score - a.score)[0]?.node || null;
        };

        const stripQuestionNoise = (text) => cleanText(text)
          .replace(/^\d+[\.\s、:：)]*\s*/, '')
          .replace(/^[\(\[【]?(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)[\)\]】]?\s*/i, '')
          .replace(/\s*(正确答案|参考答案|标准答案|我的答案|答案解析|解析|收起解析).*$/i, '')
          .trim();

        const parseOptionText = (text, index) => {
          const normalized = cleanText(text)
            .replace(/\s*(正确答案|参考答案|标准答案|我的答案|答案解析|解析).*$/i, '')
            .trim();
          const match = normalized.match(/^([A-H])[\.\s、:：\)]\s*(.+)$/i);
          if (match) {
            return { label: match[1].toUpperCase(), text: cleanText(match[2]) };
          }

          return { label: String.fromCharCode(65 + index), text: normalized };
        };

        const extractOptions = (panel) => {
          const selectors = [
            '.option-item',
            '.answer-option',
            '.question-option',
            '.choice-item',
            '.el-radio',
            '.el-checkbox',
            '[role="radio"]',
            '[role="checkbox"]',
            'label',
            'li'
          ].join(', ');
          const nodes = visibleElements(selectors, panel)
            .filter((node) => {
              const text = readVisibleText(node);
              return /^([A-H])[\.\s、:：\)]\s*\S+/i.test(text) ||
                node.querySelector('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]');
            })
            .filter((node) => {
              const childOptionCount = Array.from(node.children || [])
                .filter((child) => /^([A-H])[\.\s、:：\)]\s*\S+/i.test(readVisibleText(child)))
                .length;
              return childOptionCount <= 1;
            });

          const seen = new Set();
          const fromNodes = nodes.map((node, index) => {
            const option = parseOptionText(readVisibleText(node), index);
            return {
              ...option,
              html: sanitizeRichHtml(node),
              isChecked: Boolean(node.matches('.checked, .selected, .active, .right, .correct, [aria-checked="true"]') ||
                node.querySelector('input:checked, .checked, .selected, .active, .right, .correct, [aria-checked="true"]'))
            };
          }).filter((option) => {
            const key = `${option.label}:${option.text}`;
            if (!option.text || seen.has(key) || /^(正确答案|参考答案|标准答案|我的答案|答案解析|解析)/.test(option.text)) {
              return false;
            }

            seen.add(key);
            return true;
          }).slice(0, 8);

          if (fromNodes.length >= 2) {
            return fromNodes;
          }

          const text = readVisibleText(panel)
            .replace(/\s*(正确答案|参考答案|标准答案|我的答案|答案解析|解析).*$/i, '');
          const matches = Array.from(text.matchAll(/(?:^|\s)([A-H])[\.\s、:：\)]\s*(.*?)(?=\s+[A-H][\.\s、:：\)]\s*|$)/gi));
          return matches.map((match, index) => ({
            label: match[1].toUpperCase(),
            text: cleanText(match[2]),
            html: '',
            isChecked: false
          })).filter((option) => option.text && option.text.length <= 300).slice(0, 8);
        };

        const extractLabeledText = (panel, labelPattern, stopPattern) => {
          const text = readVisibleText(panel);
          const match = text.match(new RegExp(`(?:${labelPattern})[:：]?\\s*(.+?)(?=\\s*(?:${stopPattern})|$)`, 'i'));
          return match ? cleanText(match[1]) : null;
        };

        const extractAnswer = (panel, options) => {
          const answer = extractLabeledText(
            panel,
            '正确答案|参考答案|标准答案|答案',
            '我的答案|答案解析|解析|收起解析|AI讲解|知识点|本题得分|得分'
          );
          if (!answer) {
            const checked = options.filter((option) => option.isChecked);
            return checked.length > 0 ? checked.map((option) => `${option.label}. ${option.text}`).join('、') : null;
          }

          const compact = answer.replace(/[，,、\s]+/g, '').toUpperCase();
          if (/^[A-H]+$/.test(compact)) {
            const matchedOptions = compact
              .split('')
              .map((label) => options.find((option) => option.label === label))
              .filter(Boolean);
            return matchedOptions.length > 0
              ? matchedOptions.map((option) => `${option.label}. ${option.text}`).join('、')
              : compact.split('').join('、');
          }

          return answer;
        };

        const extractAnalysis = (panel) => {
          return extractLabeledText(
            panel,
            '答案解析|解析|试题解析',
            '正确答案|参考答案|标准答案|我的答案|收起解析|AI讲解|知识点|本题得分|得分'
          );
        };

        const findTitleNode = (panel) => {
          const titleSelectors = [
            '.question-title',
            '.subject-title',
            '.problem-title',
            '.question-stem',
            '.subject-stem',
            '.problem-stem',
            '[class*="question-title"]',
            '[class*="subject-title"]',
            '[class*="problem-title"]',
            '[class*="questionStem"]',
            '[class*="subjectStem"]',
            '[class*="problemStem"]'
          ];
          for (const selector of titleSelectors) {
            const node = visibleElements(selector, panel)[0];
            if (node && stripQuestionNoise(readVisibleText(node)).length >= 2) {
              return node;
            }
          }

          return null;
        };

        const extractTitle = (panel) => {
          const titleNode = findTitleNode(panel);
          if (titleNode) {
            return stripQuestionNoise(readVisibleText(titleNode));
          }

          const cloneText = readVisibleText(panel);
          const optionIndex = cloneText.search(/\s+[A-H][\.\s、:：\)]\s*\S+/);
          const answerIndex = cloneText.search(/\s*(正确答案|参考答案|标准答案|我的答案|答案解析|解析)/);
          const endCandidates = [optionIndex, answerIndex].filter((index) => index > 0);
          const end = endCandidates.length > 0 ? Math.min(...endCandidates) : cloneText.length;
          return stripQuestionNoise(cloneText.slice(0, end)) || '未找到题目';
        };

        const inferType = (title, options, answer) => {
          const joined = `${title} ${answer || ''}`;
          if (/多选题|多选/.test(joined) || options.filter((option) => option.isChecked).length > 1) return '多选题';
          if (/判断题|判断/.test(joined) || (options.length === 2 && options.every((option) => /^(对|错|正确|错误)$/.test(option.text)))) return '判断题';
          if (/填空题|填空/.test(joined)) return '填空题';
          if (/简答题|主观题|问答题|论述题|名词解释/.test(joined)) return '简答题';
          return options.length > 0 ? '单选题' : '未知题型';
        };

        const parseCurrentQuestion = (fallbackNumber) => {
          const panel = findQuestionPanel();
          if (!panel) {
            return null;
          }

          const title = extractTitle(panel);
          const titleNode = findTitleNode(panel);
          const options = extractOptions(panel);
          const answer = extractAnswer(panel, options);
          const analysis = extractAnalysis(panel);
          const type = inferType(title, options, answer);

          if (!title && options.length === 0 && !answer) {
            return null;
          }

          return {
            number: fallbackNumber,
            title,
            titleHtml: titleNode ? sanitizeRichHtml(titleNode) : '',
            options,
            myAnswer: null,
            correctAnswer: null,
            answer,
            analysis,
            score: null,
            type
          };
        };

        const dedupeQuestions = (questions) => {
          const seen = new Set();
          return questions.filter((question) => {
            const key = [
              question.title,
              (question.options || []).map((option) => `${option.label}:${option.text}`).join('|'),
              question.answer || '',
              question.correctAnswer || ''
            ].join('::');
            if (seen.has(key)) {
              return false;
            }

            seen.add(key);
            return true;
          });
        };

        const sortedButtons = orderButtons
          .map((button, index) => ({
            button,
            order: Number(button.dataset.order || button.textContent || index + 1) || index + 1
          }))
          .sort((a, b) => a.order - b.order);
        const questions = [];

        if (sortedButtons.length === 0) {
          const question = parseCurrentQuestion(1);
          if (question) {
            questions.push(question);
          }
        } else {
          for (const { button, order } of sortedButtons) {
            button.click();
            await waitOnce(1000);
            const question = parseCurrentQuestion(order);
            if (question) {
              questions.push(question);
            }
          }
        }

        const uniqueQuestions = dedupeQuestions(questions).map((question, index) => ({
          ...question,
          number: index + 1
        }));

        if (uniqueQuestions.length === 0) {
          return { success: false, error: '未找到雨课堂 AI 学习空间测试题' };
        }

        return {
          success: true,
          data: {
            title: cleanText(document.title || '长江雨课堂 AI 学习空间测试题') || '长江雨课堂 AI 学习空间测试题',
            platform: 'yuketang',
            yuketangFontUrl: findYuketangFontUrl(),
            questions: uniqueQuestions,
            totalCount: uniqueQuestions.length
          }
        };
      }
    });
  } catch (error) {
    return [];
  }
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

  try {
    const { hostname } = new URL(url);
    return platformConfigs[platform].hosts.some((host) => isHostMatch(hostname, host));
  } catch (error) {
    return false;
  }
}

function isHostMatch(hostname, allowedHost) {
  return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
}

// ── 雨课堂 studentCards 习题集支持 ────────────────────────────────

function isYuketangCardsPage(url) {
  return url && url.includes('yuketang.cn') && url.includes('/studentCards/');
}

function isYuketangLmsGraphExercisePage(url) {
  return Boolean(url && url.includes('yuketang.cn') && /\/ai-workspace\/lms-graph\/\d+\/exercise\/\d+/.test(url));
}

async function extractYuketangLmsGraphExercise(tabId, url) {
  const parsedUrl = new URL(url);
  const match = parsedUrl.pathname.match(/\/ai-workspace\/lms-graph\/(\d+)\/exercise\/(\d+)/);
  const classroomId = match?.[1] || '';
  const exerciseId = match?.[2] || '';

  if (!classroomId || !exerciseId) {
    return { success: false, error: '无法从当前作业 URL 解析课堂 ID 或作业 ID' };
  }

  const [{ result: decryptorReady } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Boolean(window.fontDecryptor && typeof window.fontDecryptor._buildDynamicMapping === 'function')
  });

  if (!decryptorReady) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'lib/typr.js',
        'lib/font-decrypt.js'
      ]
    });
  }

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (classroomId, exerciseId) => {
      const cleanText = (text) => String(text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
        .replace(/[ \t]*\n+[ \t]*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const waitForFontDecryptor = async () => {
        const decryptor = window.fontDecryptor;
        if (!decryptor) {
          return null;
        }

        for (let i = 0; i < 150; i += 1) {
          if (decryptor.isReady && decryptor.isReady()) {
            return decryptor;
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return decryptor;
      };

      const decryptor = await waitForFontDecryptor();
      let exerciseDecryptMap = null;
      const decryptText = (text) => {
        if (exerciseDecryptMap && exerciseDecryptMap.size > 0) {
          return Array.from(String(text || ''))
            .map((char) => exerciseDecryptMap.get(char) || char)
            .join('');
        }

        if (decryptor && typeof decryptor.decrypt === 'function') {
          return decryptor.decrypt(text || '');
        }

        return String(text || '');
      };

      const decryptEncryptedNodes = (root) => {
        root.querySelectorAll([
          '.xuetangx-com-encrypted-font',
          '[style*="exam-data-decrypt-font"]',
          '[style*="exam-font"]'
        ].join(', ')).forEach((node) => {
          node.textContent = decryptText(node.textContent || '');
        });
      };

      const normalizeImageSrc = (root) => {
        root.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src');
          if (!src) {
            return;
          }

          try {
            img.setAttribute('src', new URL(src, location.href).href);
          } catch (error) {
            img.removeAttribute('src');
          }
        });
      };

      const sanitizeRichHtml = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        div.querySelectorAll('script, style, noscript, template').forEach((node) => node.remove());
        decryptEncryptedNodes(div);
        div.querySelectorAll('*').forEach((element) => {
          Array.from(element.attributes || []).forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || name === 'style') {
              element.removeAttribute(attr.name);
              return;
            }

            if (!['class', 'src', 'alt', 'title', 'href'].includes(name)) {
              element.removeAttribute(attr.name);
              return;
            }

            if (name === 'href' && /^javascript:/i.test(attr.value || '')) {
              element.removeAttribute('href');
            }
          });
        });
        normalizeImageSrc(div);
        return div.innerHTML || '';
      };

      const htmlToText = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        decryptEncryptedNodes(div);
        return cleanText(div.innerText || div.textContent || '');
      };

      const extractImages = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        normalizeImageSrc(div);
        return Array.from(div.querySelectorAll('img'))
          .map((img) => ({
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '题目图片',
            width: Number(img.naturalWidth || img.width || 0) || undefined,
            height: Number(img.naturalHeight || img.height || 0) || undefined
          }))
          .filter((image) => image.src);
      };

      const requestOptions = {
        credentials: 'include',
        headers: {
          xtbz: 'ykt',
          'xt-agent': 'web'
        }
      };

      try {
        const pageOrigin = location.origin;
        const leafResponse = await fetch(
          `${pageOrigin}/mooc-api/v1/lms/learn/leaf_info/${classroomId}/${exerciseId}/?classroom_id=${classroomId}`,
          requestOptions
        );
        if (!leafResponse.ok) {
          throw new Error(`leaf_info API ${leafResponse.status}`);
        }

        const leafJson = await leafResponse.json();
        const leafData = leafJson.data || {};
        const exerciseListId =
          leafData.content_info?.leaf_type_id ||
          leafData.leaf_type_id ||
          exerciseId;
        const title = cleanText(leafData.name || document.title || `作业_${exerciseId}`);

        const exerciseResponse = await fetch(
          `${pageOrigin}/mooc-api/v1/lms/exercise/get_exercise_list/${exerciseListId}/?classroom_id=${classroomId}`,
          requestOptions
        );
        if (!exerciseResponse.ok) {
          throw new Error(`get_exercise_list API ${exerciseResponse.status}`);
        }

        const exerciseJson = await exerciseResponse.json();
        const exerciseData = exerciseJson.data || {};
        const problems = Array.isArray(exerciseData.problems) ? exerciseData.problems : [];
        const exerciseFontUrl = exerciseData.font
          ? new URL(exerciseData.font, location.origin).href
          : '';

        if (decryptor && exerciseFontUrl && typeof decryptor._buildDynamicMapping === 'function') {
          try {
            const map = await decryptor._buildDynamicMapping({
              label: `exercise API (${exerciseFontUrl.split('/').pop()})`,
              base64: null,
              url: exerciseFontUrl,
              fontFamily: 'exam-data-decrypt-font'
            });

            if (map && map.size > 0) {
              exerciseDecryptMap = map;
            }
          } catch (error) {
            console.warn('雨课堂作业字体动态解密失败，降级使用已有映射:', error);
          }
        }

        const questions = problems.map((problem, index) => {
          const content = problem.content || {};
          const user = problem.user || {};
          const bodyHtml = content.Body || '';
          const options = Array.isArray(content.Options) ? content.Options : [];
          const answer = Array.isArray(user.answer) ? user.answer.join('') : String(user.answer || '');
          const myAnswer = Array.isArray(user.my_answer) ? user.my_answer.join('') : String(user.my_answer || '');

          return {
            number: index + 1,
            type: content.TypeText || content.Type || '题目',
            title: htmlToText(bodyHtml),
            titleHtml: sanitizeRichHtml(bodyHtml),
            titleImages: extractImages(bodyHtml),
            options: options.map((option, optionIndex) => {
              const valueHtml = option.value || option.Value || '';
              return {
                label: option.key || option.Key || String.fromCharCode(65 + optionIndex),
                text: htmlToText(valueHtml),
                html: sanitizeRichHtml(valueHtml),
                images: extractImages(valueHtml)
              };
            }),
            myAnswer,
            correctAnswer: answer,
            answer,
            analysis: htmlToText(content.Analysis || content.analysis || ''),
            score: user.my_score ?? '',
            maxScore: content.score ?? ''
          };
        }).filter((question) => question.title || question.options.length > 0 || question.answer);

        if (questions.length === 0) {
          return { success: false, error: '当前作业节点没有返回可导出的题目' };
        }

        return {
          success: true,
          data: {
            title: title || exerciseData.exercise_name || '长江雨课堂作业',
            platform: 'yuketang',
            yuketangFontUrl: exerciseFontUrl,
            questions,
            totalCount: questions.length
          }
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    args: [classroomId, exerciseId]
  });

  return result?.result ?? { success: false, error: '作业抓取脚本注入失败' };
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
  const yuketangFontUrl = data.yuketangFontUrl || 'https://fe-static-yuketang.yuketang.cn/fe_font/product/exam_font_239fdcc493de4ef5a4d14835f3a0243c.ttf';
  const ts = new Date().toLocaleString('zh-CN');

  const items = questions.map(q => {
    const optsHTML = (q.options || []).length
      ? '<div class="opts">' +
        (q.options || []).map(o => {
          const ok = String(q.answer || q.correctAnswer || '').toUpperCase().includes(String(o.label || '').toUpperCase());
          return `<div class="opt${ok ? ' correct' : ''}">
            <span class="lbl">${escHtml(o.label)}</span>
            <span>${renderRichContent(o.html, o.text, o.images)}</span>
          </div>`;
        }).join('') +
        '</div>'
      : '';
    const optionGroupsHTML = (q.optionGroups || []).length
      ? '<div class="opts">' +
        (q.optionGroups || []).map(group => `
          <div class="group">
            <div class="group-title">${escHtml(group.number || '')} 选项</div>
            ${(group.options || []).map(o => `<div class="opt">
              <span class="lbl">${escHtml(o.label)}</span>
              <span>${renderRichContent(o.html, o.text, o.images)}</span>
            </div>`).join('')}
          </div>
        `).join('') +
        '</div>'
      : '';
    const answer = q.correctAnswer || q.answer;

    return `<div class="q">
  <div class="qhead">
    <span class="qnum">第 ${q.number} 题</span>
    <span class="qtype">${q.type}</span>
  </div>
  <div class="stem">${renderRichContent(q.titleHtml, q.title, q.titleImages)}</div>
  ${optsHTML}
  ${optionGroupsHTML}
  ${q.myAnswer ? `<div class="mine">我的答案：${escHtml(q.myAnswer)}</div>` : ''}
  ${answer ? `<div class="ans">正确答案：<strong>${escHtml(answer)}</strong>${renderHtmlImages(q.answerImages)}</div>` : renderHtmlImages(q.answerImages, 'ans')}
  ${q.analysis ? `<div class="analysis">解析：${escHtml(q.analysis)}</div>` : ''}
</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>${escHtml(title)} — 随堂题目</title>
<style>
  @font-face{font-family:exam-data-decrypt-font;src:url("${escCssUrl(yuketangFontUrl)}") format("truetype");font-weight:normal;font-style:normal;font-display:block}
  .xuetangx-com-encrypted-font{font-family:exam-data-decrypt-font,"PingFang SC","Microsoft YaHei",sans-serif}
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
  .rich{white-space:pre-wrap}
  .opts{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
  .group{display:flex;flex-direction:column;gap:8px}
  .group-title{font-weight:700;color:#555;margin:6px 0 2px}
  .opt{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;
       background:#f9f9f9;border:1px solid #eee;border-radius:8px;font-size:15px}
  .opt.correct{background:#f0faf0;border-color:#81c784;color:${CORRECT_COLOR}}
  .lbl{font-weight:700;min-width:22px;flex-shrink:0}
  .mine{background:#f5f5f5;color:#555;border-radius:6px;
       padding:10px 14px;font-size:14px;margin-top:10px}
  .ans{background:#e8f5e9;color:${CORRECT_COLOR};border-radius:6px;
       padding:10px 14px;font-size:14px;margin-top:10px}
  .analysis{background:#fff8e1;color:#795548;border-radius:6px;
            padding:10px 14px;font-size:13px;margin-top:8px}
  .img-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
  .img-list img{max-width:100%;height:auto;border:1px solid #eee;border-radius:6px;background:#fff}
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

function renderHtmlImages(images, className = 'img-list') {
  const list = Array.isArray(images) ? images : [];
  if (list.length === 0) {
    return '';
  }

  return `<div class="${className}">` + list.map((image) => {
    const src = escHtml(image.src || '');
    const alt = escHtml(image.alt || '题目图片');
    return src ? `<img src="${src}" alt="${alt}">` : '';
  }).join('') + '</div>';
}

function renderRichContent(html, fallbackText, images) {
  const content = html ? `<div class="rich">${html}</div>` : escHtml(fallbackText || '');
  return `${content}${renderHtmlImages(images)}`;
}

function escCssUrl(url) {
  return String(url || '').replace(/["\\\n\r]/g, '');
}

function sanitizeFilename(name) {
  return String(name ?? '题目').replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}
