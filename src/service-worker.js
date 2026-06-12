// 导入 DocxGenerator（webpack 会打包到一起）
import DocxGenerator from './docx-generator.js';

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateDocx') {
    (async () => {
      try {
        const { data } = request;

        // 创建 DocxGenerator 实例
        const generator = new DocxGenerator();
        const doc = generator.generate(data);

        // 生成 Blob
        const blob = await generator.toBlob(doc);

        // 将 Blob 转换为 ArrayBuffer，然后转为 base64 data URL
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const CHUNK = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        const base64 = btoa(binary);
        const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

        const filename = `${sanitizeFilename(data.title)}_${Date.now()}.docx`;

        // 触发下载
        await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        });

        sendResponse({ success: true });
      } catch (error) {
        console.error('生成 Word 文档失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 异步响应
  }
});

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}

console.log('题目导出助手 - 后台服务已启动');
