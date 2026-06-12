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

    const response = await extractQuestionsFromTab(tab.id);

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

async function extractQuestionsFromTab(tabId) {
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

async function requestQuestions(tabId) {
  return await chrome.tabs.sendMessage(tabId, {
    action: 'extractQuestions'
  });
}

function isMissingContentScriptError(error) {
  return /Receiving end does not exist|Could not establish connection/i.test(error.message || '');
}

async function injectContentScripts(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
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
