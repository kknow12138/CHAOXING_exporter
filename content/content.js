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
        const parser = new QuestionExportParser();

        // 查找所有题目
        const questionElements = parser.findQuestions();

        if (questionElements.length === 0) {
          sendResponse({
            success: false,
            error: parser.getNoQuestionMessage()
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
        const pageTitle = parser.extractPageTitle();

        sendResponse({
          success: true,
          data: {
            title: pageTitle,
            platform: parser.platform,
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

