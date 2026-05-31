// 等待字体解密初始化
async function waitForFontDecryptor() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.fontDecryptor && window.fontDecryptor.isReady()) {
        clearInterval(check);
        resolve();
      }
    }, 100);

    // 超时保护（5秒）
    setTimeout(() => {
      clearInterval(check);
      resolve();
    }, 5000);
  });
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractQuestions') {
    (async () => {
      try {
        // 等待字体解密准备就绪
        await waitForFontDecryptor();

        // 初始化解析器
        const parser = new ChaoxingParser();

        // 查找所有题目
        const questionElements = parser.findQuestions();

        // 调试信息
        console.log('页面 HTML 结构分析:');
        console.log('- 找到的题目数量:', questionElements.length);
        console.log('- 页面标题:', document.title);
        console.log('- 页面 URL:', window.location.href);

        if (questionElements.length === 0) {
          // 提供更详细的调试信息
          const debugInfo = parser.debugPageStructure();
          console.error('调试信息:', debugInfo);

          sendResponse({
            success: false,
            error: '未找到题目，请确认当前页面是学习通的考试/作业页面。请打开浏览器控制台（F12）查看详细信息。'
          });
          return;
        }

        // 解析所有题目
        const questions = [];
        questionElements.forEach((element, index) => {
          const question = parser.parseQuestion(element, index);
          questions.push(question);
        });

        // 提取页面标题作为文件名
        const pageTitle = document.querySelector('.ceyan_name h3')?.innerText.trim()
                       || document.title
                       || '学习通题目';

        sendResponse({
          success: true,
          data: {
            title: pageTitle,
            questions: questions,
            totalCount: questions.length
          }
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();

    return true; // 保持消息通道开启（异步响应）
  }
});

console.log('学习通题目导出助手已加载');
