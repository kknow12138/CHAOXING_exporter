document.getElementById('extractBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const resultDiv = document.getElementById('result');
  const btn = document.getElementById('extractBtn');

  try {
    // 禁用按钮
    btn.disabled = true;
    statusDiv.textContent = '正在抓取题目...';
    statusDiv.className = 'status loading';
    resultDiv.className = 'result hidden';

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 检查是否为学习通页面
    if (!tab.url.includes('chaoxing.com') && !tab.url.includes('.edu.cn')) {
      throw new Error('请在学习通的考试/作业页面使用此扩展');
    }

    // 发送消息到 content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractQuestions'
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    // 显示结果
    statusDiv.textContent = `成功抓取 ${response.data.totalCount} 道题目`;
    statusDiv.className = 'status success';

    resultDiv.innerHTML = `
      <p>题目数量: ${response.data.totalCount}</p>
      <p>正在生成 Word 文档...</p>
    `;
    resultDiv.className = 'result';

    // 生成并下载 Word 文档
    await generateAndDownload(response.data);

    resultDiv.innerHTML = `
      <p>✓ 题目数量: ${response.data.totalCount}</p>
      <p>✓ Word 文档已生成并下载</p>
    `;

  } catch (error) {
    statusDiv.textContent = '错误: ' + error.message;
    statusDiv.className = 'status error';
    resultDiv.className = 'result hidden';
  } finally {
    btn.disabled = false;
  }
});

async function generateAndDownload(data) {
  // 通过 background script 生成文档
  const response = await chrome.runtime.sendMessage({
    action: 'generateDocx',
    data: data
  });

  if (!response.success) {
    throw new Error(response.error);
  }
}
