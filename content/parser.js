class ChaoxingParser {
  constructor() {
    // 核心选择器（多重回退策略）
    this.selectors = {
      // 题目容器 - 优先使用 .questionLi（作业页面），然后是 .TiMu（考试页面）
      questionContainer: ['.questionLi', '.TiMu', '.Py_tk', '.e-q-body', 'div[id^="question"]'],
      // 题目文本 - 添加 .qtContent（作业页面的题目文本）
      questionTitle: ['.qtContent', '.Zy_TItle .clearfix', '.Zy_TItle', '.newZy_TItle', '.fontLabel', '.topic-title', '.e-q-q'],
      // 选项 - 作业页面使用 .mark_letter 下的 li
      options: ['.mark_letter li', 'ul li'],
      answerBox: ['.mark_answer', '.rightAnswerContent', '.newAnswerBx', '.answerBx', '.lookAnswer', '.answer', '.correctAnswer'],
      checkedMarker: ['input:checked', '.ri', '.dui', '.correct']
    };
  }

  // 查找所有题目
  findQuestions() {
    // 尝试多个选择器
    for (const selector of this.selectors.questionContainer) {
      const questions = document.querySelectorAll(selector);
      if (questions.length > 0) {
        console.log(`找到 ${questions.length} 道题目，使用选择器: ${selector}`);
        return questions;
      }
    }

    // 如果都没找到，返回空数组
    console.warn('未找到题目，尝试的选择器:', this.selectors.questionContainer);
    return [];
  }

  // 解析单个题目
  parseQuestion(questionElement, index) {
    const question = {
      number: index + 1,
      title: this.extractTitle(questionElement),
      options: this.extractOptions(questionElement),
      answer: this.extractAnswer(questionElement),
      type: null
    };

    // 推断题型
    question.type = this.inferQuestionType(question);
    return question;
  }

  // 提取题干（支持多重选择器回退）
  extractTitle(element) {
    for (const selector of this.selectors.questionTitle) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        let text = titleElement.innerText.trim();
        text = this.decryptText(text);
        return this.cleanText(text);
      }
    }
    return "未找到题目";
  }

  // 提取选项
  extractOptions(element) {
    const options = [];

    // 尝试多个选择器
    let optionElements = null;
    for (const selector of this.selectors.options) {
      optionElements = element.querySelectorAll(selector);
      if (optionElements.length > 0) {
        break;
      }
    }

    if (!optionElements || optionElements.length === 0) {
      return options;
    }

    optionElements.forEach((opt, idx) => {
      let text = opt.innerText.trim();
      text = this.decryptText(text);
      text = this.cleanText(text);

      // 检测是否为选中/正确答案
      const isChecked = this.selectors.checkedMarker.some(
        selector => opt.querySelector(selector)
      );

      options.push({
        label: String.fromCharCode(65 + idx), // A, B, C, D...
        text: text,
        isChecked: isChecked
      });
    });

    return options;
  }

  // 提取答案/解析
  extractAnswer(element) {
    for (const selector of this.selectors.answerBox) {
      const answerElement = element.querySelector(selector);
      if (answerElement) {
        let text = answerElement.innerText.trim();
        text = this.decryptText(text);
        return this.cleanText(text);
      }
    }
    return null;
  }

  // 推断题型
  inferQuestionType(question) {
    const optionCount = question.options.length;
    if (optionCount === 0) {
      return question.title.includes('填空') ? '填空题' : '简答题';
    } else if (optionCount === 2) {
      const texts = question.options.map(o => o.text.toLowerCase());
      if (texts.some(t => t.includes('对') || t.includes('错') ||
                          t.includes('true') || t.includes('false'))) {
        return '判断题';
      }
    }
    return question.title.includes('多选') ? '多选题' : '单选题';
  }

  // 文本清理
  cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  // 字体解密（调用 font-decrypt.js）
  decryptText(text) {
    if (window.fontDecryptor && window.fontDecryptor.isReady()) {
      return window.fontDecryptor.decrypt(text);
    }
    return text;
  }

  // 调试页面结构
  debugPageStructure() {
    const info = {
      url: window.location.href,
      title: document.title,
      possibleContainers: []
    };

    // 检查常见的题目容器类名
    const commonClasses = [
      'TiMu', 'questionLi', 'Py_tk', 'e-q-body', 'question',
      'topic', 'item', 'list-item', 'work-item'
    ];

    commonClasses.forEach(cls => {
      const elements = document.querySelectorAll(`.${cls}`);
      if (elements.length > 0) {
        info.possibleContainers.push({
          selector: `.${cls}`,
          count: elements.length,
          sample: elements[0].className
        });
      }
    });

    // 检查带 ID 的题目容器
    const elementsWithId = document.querySelectorAll('[id*="question"], [id*="topic"], [id*="item"]');
    if (elementsWithId.length > 0) {
      info.possibleContainers.push({
        selector: '[id*="question"]',
        count: elementsWithId.length,
        sample: elementsWithId[0].id
      });
    }

    return info;
  }
}
