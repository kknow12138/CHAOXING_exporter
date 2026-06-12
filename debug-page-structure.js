// 学习通 / 长江雨课堂 / 课堂派页面结构调试工具
// 在浏览器控制台运行此脚本，查看页面的题目容器结构

console.log('=== 题目页面结构分析 ===');
console.log('页面 URL:', window.location.href);
console.log('页面标题:', document.title);

// 1. 查找所有可能的题目容器
const possibleSelectors = [
  '.TiMu',
  '.questionLi',
  '.Py_tk',
  '.e-q-body',
  '.a4-paper-problem',
  '.container-problem',
  '.exam-question',
  '.paper-question',
  '.homework-question',
  '.question-item',
  '.option-item',
  'div[id^="question"]',
  '[data-question-id]',
  '[data-problem-id]',
  '[class*="question"]',
  '[class*="problem"]',
  '[class*="topic"]',
  '[class*="item"]'
];

console.log('\n--- 尝试各种选择器 ---');
possibleSelectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✓ ${selector}: 找到 ${elements.length} 个元素`);
      console.log('  示例元素:', elements[0]);
    }
  } catch (e) {
    console.log(`✗ ${selector}: 无效选择器`);
  }
});

// 2. 分析页面中包含"单选题"、"判断题"等关键词的元素
console.log('\n--- 查找题型关键词 ---');
const keywords = ['单选题', '多选题', '判断题', '填空题', '简答题'];
keywords.forEach(keyword => {
  const xpath = `//*[contains(text(), '${keyword}')]`;
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  if (result.singleNodeValue) {
    console.log(`✓ 找到"${keyword}":`, result.singleNodeValue);
    console.log('  父元素:', result.singleNodeValue.parentElement);
  }
});

// 3. 查找所有包含选项 A/B/C/D 的元素
console.log('\n--- 查找选项元素 ---');
const optionPattern = /^[A-D]\./;
const allElements = document.querySelectorAll('*');
let optionContainers = new Set();

allElements.forEach(el => {
  if (el.textContent && optionPattern.test(el.textContent.trim())) {
    // 找到包含选项的元素，向上查找容器
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.querySelectorAll('li, div').length >= 2) {
        optionContainers.add(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }
});

console.log(`找到 ${optionContainers.size} 个可能的题目容器`);
optionContainers.forEach((container, index) => {
  console.log(`容器 ${index + 1}:`, container);
  console.log('  类名:', container.className);
  console.log('  ID:', container.id);
});

console.log('\n=== 分析完成 ===');
console.log('请将上述信息反馈给开发者');
