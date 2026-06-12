class QuestionExportParser {
  constructor() {
    this.platform = this.detectPlatform();
    this.platformConfigs = this.createPlatformConfigs();
    this.selectors = this.platformConfigs[this.platform] || this.platformConfigs.generic;
    this.allQuestionContainerSelectors = [...new Set([
      ...this.platformConfigs.chaoxing.questionContainer,
      ...this.platformConfigs.yuketang.questionContainer,
      ...this.platformConfigs.ketangpai.questionContainer,
      ...this.platformConfigs.zhihuishu.questionContainer,
      ...this.platformConfigs.generic.questionContainer
    ])];
    this.mergedOptionSelectors = [
      ...this.selectors.options,
      ...this.platformConfigs.generic.options
    ];
    this._scoreCache = new WeakMap();
  }

  createPlatformConfigs() {
    return {
      chaoxing: {
        questionContainer: [
          '.questionLi',
          '.TiMu',
          '.Py_tk',
          '.e-q-body',
          'div[id^="question"]'
        ],
        questionTitle: [
          '.qtContent',
          '.Zy_TItle .clearfix',
          '.Zy_TItle',
          '.newZy_TItle',
          '.fontLabel',
          '.topic-title',
          '.e-q-q'
        ],
        options: [
          '.mark_letter li',
          '.mark_letter .clearfix',
          '.answerList li',
          'ul li'
        ],
        answerBox: [
          '.mark_answer',
          '.rightAnswerContent',
          '.newAnswerBx',
          '.answerBx',
          '.lookAnswer',
          '.answer',
          '.correctAnswer'
        ],
        checkedMarker: [
          'input:checked',
          '.ri',
          '.dui',
          '.correct',
          '.right'
        ],
        pageTitle: [
          '.ceyan_name h3',
          '.mark_title',
          '.examTit',
          'h1',
          'h2'
        ]
      },
      yuketang: {
        questionContainer: [
          '.subject-item',
          '.result_item',
          '[data-question-id]',
          '[data-problem-id]',
          '.a4-paper-problem',
          '.container-problem',
          '[class*="problem-item"]',
          '[class*="problemItem"]',
          '[class*="question-item"]',
          '[class*="questionItem"]',
          '[class*="problem"]',
          '[class*="question"]',
          '[class*="exercise"]'
        ],
        questionTitle: [
          '.item-body .clearfix.exam-font',
          '.item-body h4',
          '.item-body p',
          '.item-type',
          '[class*="ProblemTitle"]',
          '[class*="problem-title"]',
          '[class*="question-title"]',
          '[class*="title"]',
          '[class*="content"]',
          'h1',
          'h2',
          'h3'
        ],
        options: [
          '.list-unstyled li',
          '.list-unstyled-radio li',
          '.list-unstyled-checkbox li',
          '.el-radio__label',
          '.el-checkbox__label',
          '.radioText',
          '.checkboxText',
          '[class*="ProblemSelection"] [class*="option"]',
          '[class*="ProblemSingle"] [class*="option"]',
          '[class*="ProblemMulti"] [class*="option"]',
          '[class*="answer--multiple-choice"] [class*="option"]',
          '[class*="answer-content-container"] [class*="option"]',
          '[class*="answer__item"]',
          '[class*="option"]',
          '[role="radio"]',
          '[role="checkbox"]',
          'label'
        ],
        answerBox: [
          '.item-footer',
          '.item-footer--header',
          '.grade',
          '[class*="RightAnswer"]',
          '[class*="right-answer"]',
          '[class*="answerAndAnalysis"]',
          '[class*="answer-content"]',
          '[class*="answer__wrap"]',
          '[class*="analysis"]',
          '[class*="解析"]'
        ],
        checkedMarker: [
          'input:checked',
          '.is-checked',
          '.dot-success',
          '[aria-checked="true"]',
          '.checked',
          '.selected',
          '.active',
          '.right'
        ],
        pageTitle: [
          '.header-title',
          '.header-content .el-col',
          '.header',
          '[class*="quiz-title"]',
          '[class*="paper-title"]',
          '[class*="exam-title"]',
          '[class*="activity-title"]',
          '[class*="title"]',
          'h1',
          'h2'
        ]
      },
      ketangpai: {
        questionContainer: [
          '.student-detail-question-block',
          '[class*="student-detail-question-block"]',
          '[class*="plugins-testType-"]',
          '.question-item',
          '.questions-item',
          '.problem-item',
          '.subject-item',
          '.exam-question',
          '.paper-question',
          '.test-paper-question',
          '.homework-question',
          '.work-question',
          '[data-question-id]',
          '[data-problem-id]',
          '[data-id]',
          '[class*="question-item"]',
          '[class*="questionItem"]',
          '[class*="problem-item"]',
          '[class*="problemItem"]',
          '[class*="subject-item"]',
          '[class*="paper-question"]',
          '[class*="exam-question"]',
          '[class*="homework-question"]',
          '[class*="question"]'
        ],
        questionTitle: [
          '.content-box',
          '[class*="-content"] .content-box',
          '.DocumentTitle-content > .content-box',
          '.question-title',
          '.question-stem',
          '.question-content',
          '.stem',
          '.subject-title',
          '.problem-title',
          '.topic-title',
          '.html-content',
          '.content',
          '[class*="question-title"]',
          '[class*="questionTitle"]',
          '[class*="question-stem"]',
          '[class*="questionStem"]',
          '[class*="question-content"]',
          '[class*="questionContent"]',
          '[class*="subject-title"]',
          '[class*="problem-title"]',
          '[class*="stem"]',
          '[class*="title"]',
          'h1',
          'h2',
          'h3'
        ],
        options: [
          '.SingleChoice-radio .el-radio__label',
          '.Multiplechoice-radio .el-checkbox__label',
          '.Judge-content .el-radio__label',
          '.choice .radio-title',
          '.radio-title',
          '.option-item',
          '.answer-item',
          '.choice-item',
          '.question-option',
          '.el-radio',
          '.el-checkbox',
          '.el-radio__label',
          '.el-checkbox__label',
          '[class*="option-item"]',
          '[class*="optionItem"]',
          '[class*="answer-item"]',
          '[class*="answerItem"]',
          '[class*="choice-item"]',
          '[class*="choiceItem"]',
          '[class*="question-option"]',
          '[class*="option"]',
          '[role="radio"]',
          '[role="checkbox"]',
          'label',
          'li'
        ],
        answerBox: [
          '.answer-correct-type',
          '.answer-correct',
          '.DocumentTitle-reference',
          '.answer',
          '.answer-content',
          '.right-answer',
          '.correct-answer',
          '.standard-answer',
          '.reference-answer',
          '.analysis',
          '.parse',
          '.solution',
          '[class*="right-answer"]',
          '[class*="rightAnswer"]',
          '[class*="correct-answer"]',
          '[class*="correctAnswer"]',
          '[class*="standard-answer"]',
          '[class*="reference-answer"]',
          '[class*="answer-content"]',
          '[class*="answerContent"]',
          '[class*="analysis"]',
          '[class*="parse"]'
        ],
        checkedMarker: [
          'input:checked',
          '.is-checked',
          '.checked',
          '.selected',
          '.active',
          '.right',
          '.correct',
          '[aria-checked="true"]'
        ],
        pageTitle: [
          '.homework-title',
          '.work-title',
          '.exam-title',
          '.paper-title',
          '.test-title',
          '.task-title',
          '.header-title',
          '[class*="homework-title"]',
          '[class*="work-title"]',
          '[class*="exam-title"]',
          '[class*="paper-title"]',
          '[class*="task-title"]',
          '[class*="title"]',
          'h1',
          'h2'
        ]
      },
      zhihuishu: {
        questionContainer: [
          '.questionType',
          '.question-type',
          '.question-item',
          '.question-item-wrap',
          '.paper-subject',
          '[data-questionid]',
          '.examPaper_subject',
          '.subject',
          '.subjectItem',
          '.questionList li',
          '.exap-paper-item',
          '.nodeContent',
          '.topic-item',
          '[class*="examPaper_subject"]',
          '[class*="subjectItem"]',
          '[class*="subject-item"]',
          '[class*="question-item"]',
          '[class*="questionItem"]',
          '[data-question-id]',
          '[data-problem-id]',
          '[class*="subject"]',
          '[class*="question"]'
        ],
        questionTitle: [
          '.question-title',
          '.question-content',
          '.question-stem',
          '.subject_describe p',
          '.subject_describe',
          '.subject_stem',
          '.subjectDescribe',
          '.nodeLab',
          '.exap-title',
          '.topic-title',
          '.stem',
          '[class*="subject_describe"]',
          '[class*="subjectDescribe"]',
          '[class*="describe"]',
          '[class*="stem"]',
          '[class*="题干"]',
          '[class*="title"]',
          '[class*="content"]',
          'h1',
          'h2',
          'h3'
        ],
        options: [
          '.option-item',
          '.option',
          '.answer-option',
          '.question-option',
          '.choice-item',
          '.choice',
          '[class*="option"]',
          '[class*="choice"]',
          '.subject_node .nodeLab',
          '.subject_node',
          '.examPaper_optionList li',
          '.optionList li',
          '.option_node',
          '.nodeLab',
          '.option-item',
          '.answer-item',
          '[class*="subject_node"]',
          '[class*="optionList"] li',
          '[class*="option-item"]',
          '[class*="optionItem"]',
          '[class*="answer-item"]',
          '[class*="option"]',
          '[role="radio"]',
          '[role="checkbox"]',
          'label',
          'li'
        ],
        answerBox: [
          '.examPaper_answer',
          '.subject_answer',
          '.rightAnswer',
          '.right-answer',
          '.correctAnswer',
          '.answer',
          '.answer-content',
          '.analysis',
          '.subject_analysis',
          '[class*="examPaper_answer"]',
          '[class*="subject_answer"]',
          '[class*="rightAnswer"]',
          '[class*="right-answer"]',
          '[class*="correctAnswer"]',
          '[class*="answer-content"]',
          '[class*="answer"]',
          '[class*="analysis"]',
          '[class*="解析"]'
        ],
        checkedMarker: [
          '.examquestions-answer',
          '[class*="examquestions-answer"]',
          'input:checked',
          '.is-checked',
          '.checked',
          '[class*="checked"]',
          '.selected',
          '[class*="selected"]',
          '.active',
          '[class*="active"]',
          '.right',
          '[class*="right"]',
          '.correct',
          '[class*="correct"]',
          '.cur',
          '.on',
          '[aria-checked="true"]'
        ],
        pageTitle: [
          '.examPaper_title',
          '.paperName',
          '.exam-title',
          '.paper-title',
          '.exap-name',
          '[class*="examPaper_title"]',
          '[class*="paperName"]',
          '[class*="paper-title"]',
          '[class*="exam-title"]',
          '[class*="title"]',
          'h1',
          'h2'
        ]
      },
      generic: {
        questionContainer: [
          '[data-question-id]',
          '[data-problem-id]',
          '[id*="question"]',
          '[id*="problem"]',
          '[class*="question-item"]',
          '[class*="question"]',
          '[class*="problem-item"]',
          '[class*="problem"]',
          '[class*="exercise"]',
          '[class*="topic-item"]',
          '[class*="topic"]'
        ],
        questionTitle: [
          '[class*="title"]',
          '[class*="content"]',
          '[class*="stem"]',
          '[class*="body"]',
          'h1',
          'h2',
          'h3',
          'p'
        ],
        options: [
          '[class*="option"]',
          '[class*="choice"]',
          '[role="radio"]',
          '[role="checkbox"]',
          'label',
          'li'
        ],
        answerBox: [
          '[class*="answer"]',
          '[class*="analysis"]',
          '[class*="explain"]'
        ],
        checkedMarker: [
          'input:checked',
          '[aria-checked="true"]',
          '.checked',
          '.selected',
          '.active',
          '.correct',
          '.right'
        ],
        pageTitle: [
          'h1',
          'h2',
          'title'
        ]
      }
    };
  }

  detectPlatform() {
    const host = window.location.hostname;

    if (host.includes('chaoxing.com')) {
      return 'chaoxing';
    }

    if (host.includes('yuketang.cn')) {
      return 'yuketang';
    }

    if (host.includes('ketangpai.com')) {
      return 'ketangpai';
    }

    if (host.includes('zhihuishu.com')) {
      return 'zhihuishu';
    }

    return 'generic';
  }

  findQuestions() {
    const attempts = [];

    for (const selector of this.selectors.questionContainer) {
      const elements = Array.from(document.querySelectorAll(selector));
      const normalized = this.normalizeQuestionCandidates(elements);

      if (normalized.length === 0) {
        continue;
      }

      const score = this.scoreQuestionSet(normalized);
      attempts.push({ selector, elements: normalized, score });
    }

    attempts.sort((a, b) => b.score - a.score);

    if (attempts.length > 0) {
      return attempts[0].elements;
    }

    const fallback = this.findQuestionsByInteractiveElements();
    return fallback;
  }

  normalizeQuestionCandidates(elements) {
    const filtered = elements.filter((element) => this.isQuestionCandidate(element));
    const unique = Array.from(new Set(filtered));

    return unique.filter((element) => {
      return !unique.some((other) => other !== element && element.contains(other));
    });
  }

  isQuestionCandidate(element) {
    if (!element || !element.innerText) {
      return false;
    }

    const text = this.cleanText(this.decryptText(element.innerText));
    if (text.length < 8) {
      return false;
    }

    const score = this.scoreQuestionElement(element, text);
    return score >= 4;
  }

  scoreQuestionElement(element, text = null) {
    if (!text && this._scoreCache.has(element)) {
      return this._scoreCache.get(element);
    }
    const plainText = text || this.cleanText(this.decryptText(element.innerText || ''));
    let score = 0;

    if (element.dataset.questionId || element.dataset.problemId) {
      score += 4;
    }

    if (this.platform === 'ketangpai' && this.isKetangpaiQuestionElement(element)) {
      score += 5;
    }

    if (this.platform === 'zhihuishu' && this.isZhihuishuQuestionElement(element, plainText)) {
      score += 5;
    }

    if (this.hasQuestionTypeKeyword(plainText)) {
      score += 2;
    }

    const optionCount = this.estimateOptionCount(element);
    if (optionCount >= 2) {
      score += 3;
    }

    const interactiveCount = element.querySelectorAll('input, textarea, [role="radio"], [role="checkbox"]').length;
    if (interactiveCount > 0) {
      score += Math.min(interactiveCount, 3);
    }

    if (plainText.length >= 20) {
      score += 1;
    }

    if (this.looksLikeQuestionListContainer(element)) {
      score -= 3;
    }

    if (!text) {
      this._scoreCache.set(element, score);
    }
    return score;
  }

  scoreQuestionSet(elements) {
    const totalScore = elements.reduce((sum, element) => sum + this.scoreQuestionElement(element), 0);
    const averageScore = totalScore / elements.length;
    return averageScore * 10 + Math.min(elements.length, 50);
  }

  looksLikeQuestionListContainer(element) {
    const children = Array.from(element.children);
    const questionLikeChildren = children.filter((child) => this.isQuestionCandidateLite(child));
    return questionLikeChildren.length >= 2;
  }

  isQuestionCandidateLite(element) {
    if (!element || !element.innerText) {
      return false;
    }

    const text = this.cleanText(this.decryptText(element.innerText));
    if (text.length < 8) {
      return false;
    }

    return this.estimateOptionCount(element) >= 2 || this.hasQuestionTypeKeyword(text);
  }

  findQuestionsByInteractiveElements() {
    const interactiveElements = document.querySelectorAll('input, textarea, [role="radio"], [role="checkbox"]');
    const roots = new Set();

    interactiveElements.forEach((element) => {
      let current = element.parentElement;
      let depth = 0;

      while (current && current !== document.body && depth < 8) {
        if (this.isQuestionCandidate(current)) {
          roots.add(current);
          break;
        }

        current = current.parentElement;
        depth += 1;
      }
    });

    return this.normalizeQuestionCandidates(Array.from(roots));
  }

  parseQuestion(questionElement, index) {
    if (this.platform === 'ketangpai') {
      return this.parseKetangpaiQuestion(questionElement, index);
    }

    if (this.platform === 'zhihuishu') {
      return this.parseZhihuishuQuestion(questionElement, index);
    }

    const question = {
      number: index + 1,
      title: this.extractTitle(questionElement),
      options: this.extractOptions(questionElement),
      answer: this.extractAnswer(questionElement),
      type: null
    };

    question.type = this.inferQuestionType(question, questionElement);
    return question;
  }

  parseKetangpaiQuestion(questionElement, index) {
    const question = {
      number: index + 1,
      title: this.extractKetangpaiTitle(questionElement),
      options: this.extractKetangpaiOptions(questionElement),
      answer: this.extractKetangpaiAnswer(questionElement),
      type: null
    };

    question.type = this.inferKetangpaiQuestionType(questionElement, question);
    return question;
  }

  parseZhihuishuQuestion(questionElement, index) {
    const title = this.extractZhihuishuTitle(questionElement);
    const type = this.extractZhihuishuType(questionElement);
    const options = type === '判断题'
      ? this.extractZhihuishuJudgeOptions(questionElement)
      : this.extractZhihuishuOptions(questionElement);

    const checkedOptions = options.filter((o) => o.isChecked);
    let answer = null;
    if (checkedOptions.length > 0) {
      answer = this.formatZhihuishuCheckedAnswer(type, checkedOptions);
    } else {
      answer = this.normalizeZhihuishuFallbackAnswer(type, this.extractAnswer(questionElement), options);
    }

    return {
      number: index + 1,
      title,
      options,
      answer,
      type: type || this.inferQuestionType({ title, options, answer }, questionElement)
    };
  }

  isZhihuishuQuestionElement(element, text = null) {
    if (!element) {
      return false;
    }

    const plainText = text || this.cleanText(this.decryptText(element.innerText || element.textContent || ''));
    return /【(单选题|多选题|判断题|填空题|简答题|名词解释|论述题)】/.test(plainText) ||
      /^\d+\s*【/.test(plainText) ||
      Boolean(element.querySelector('.subject_describe, .subject_node, .examPaper_optionList, [class*="option"]'));
  }

  extractZhihuishuTitle(element) {
    const descEl = element.querySelector('.subject_describe p') ||
                   element.querySelector('.subject_describe') ||
                   element.querySelector('.question-title') ||
                   element.querySelector('.question-content') ||
                   element.querySelector('.question-stem');
    if (descEl) {
      return this.cleanZhihuishuTitleText(descEl.innerText || descEl.textContent || '');
    }

    const clone = element.cloneNode(true);
    [
      ...this.selectors.options,
      ...this.selectors.answerBox,
      '.AI',
      '[class*="ai"]',
      '[class*="answer"]',
      '[class*="analysis"]',
      '[class*="score"]'
    ].forEach((selector) => {
      clone.querySelectorAll(selector).forEach((node) => node.remove());
    });

    const text = this.cleanZhihuishuTitleText(clone.innerText || clone.textContent || '');
    return text || this.extractTitle(element);
  }

  extractZhihuishuType(element) {
    const text = this.cleanText(element.innerText || element.textContent || '');
    const match = text.match(/【(单选题|多选题|判断题|填空题|简答题|名词解释|论述题)】/);
    if (match) return match[1];
    return null;
  }

  extractZhihuishuOptions(element) {
    const selector = [
      '.subject_node',
      '.examPaper_optionList li',
      '.optionList li',
      '.option_node',
      '.option-item',
      '.answer-option',
      '.question-option',
      '.choice-item',
      '[class*="option"]',
      '[class*="choice"]',
      'label',
      'li'
    ].join(', ');

    const optionElements = Array.from(element.querySelectorAll(selector))
      .filter((node) => this.isZhihuishuOptionNode(node));

    if (optionElements.length >= 2) {
      return this.buildZhihuishuOptions(optionElements);
    }

    return this.findOptionsByText(element);
  }

  extractZhihuishuJudgeOptions(element) {
    const optionElements = Array.from(element.querySelectorAll('label, li, .subject_node, .option-item, .answer-option, .question-option, .choice-item, [class*="option"], [class*="choice"], div'))
      .filter((node) => {
        const text = this.cleanText(this.decryptText(node.innerText || node.textContent || ''));
        if (!/^([AB])[\.\s、:：\)]\s*(对|错)$/i.test(text)) {
          return false;
        }

        return !Array.from(node.children || []).some((child) => {
          const childText = this.cleanText(this.decryptText(child.innerText || child.textContent || ''));
          return /^([AB])[\.\s、:：\)]\s*(对|错)$/i.test(childText);
        });
      });

    const deduped = this.dedupeZhihuishuOptionElements(optionElements);
    if (deduped.length >= 2) {
      return this.buildZhihuishuOptions(deduped);
    }

    const textOptions = this.findOptionsByText(element)
      .filter((option) => /^[AB]$/.test(option.label) && /^(对|错)$/.test(option.text));

    return textOptions.map((option) => ({
      ...option,
      isChecked: this.isZhihuishuJudgeOptionCheckedByText(element, option)
    }));
  }

  dedupeZhihuishuOptionElements(optionElements) {
    const bestByText = new Map();

    optionElements.forEach((element) => {
      const text = this.cleanText(this.decryptText(element.innerText || element.textContent || ''));
      const current = bestByText.get(text);
      if (!current || element.querySelector('input, [aria-checked], i, svg, span') || text.length < this.cleanText(current.innerText || current.textContent || '').length) {
        bestByText.set(text, element);
      }
    });

    return Array.from(bestByText.values());
  }

  isZhihuishuJudgeOptionCheckedByText(element, option) {
    const optionTextPattern = new RegExp(`^${option.label}[\\.\\s、:：\\)]\\s*${option.text}$`, 'i');
    const textNode = Array.from(element.querySelectorAll('*')).find((node) => {
      const text = this.cleanText(this.decryptText(node.innerText || node.textContent || ''));
      return optionTextPattern.test(text);
    });

    if (!textNode) {
      return false;
    }

    const candidates = [
      textNode,
      textNode.parentElement,
      textNode.parentElement && textNode.parentElement.parentElement
    ].filter(Boolean);

    return candidates.some((candidate) => this.isZhihuishuOptionChecked(candidate));
  }

  isZhihuishuOptionNode(node) {
    const text = this.cleanText(this.decryptText(node.innerText || node.textContent || ''));
    if (!this.isOptionLikeText(text) || text.length > 220) {
      return false;
    }

    if (/\s+[A-H][\.\s、:：\)]\s*\S+/.test(text)) {
      return false;
    }

    const childOptionCount = Array.from(node.children || [])
      .filter((child) => this.isOptionLikeText(this.cleanText(child.innerText || child.textContent || '')))
      .length;

    return childOptionCount <= 1;
  }

  buildZhihuishuOptions(optionElements) {
    const seen = new Set();
    const options = [];

    optionElements.forEach((optionElement, index) => {
      const rawText = this.cleanText(this.decryptText(optionElement.innerText || optionElement.textContent || ''));
      const parsed = this.parseOptionText(rawText);
      const label = parsed.label || String.fromCharCode(65 + index);
      const dedupeKey = `${label}-${parsed.text}`;

      if (!parsed.text || seen.has(dedupeKey)) {
        return;
      }

      seen.add(dedupeKey);
      options.push({
        label,
        text: parsed.text,
        isChecked: this.isZhihuishuOptionChecked(optionElement)
      });
    });

    return options;
  }

  isZhihuishuOptionChecked(optionElement) {
    if (optionElement.querySelector('input:checked, [aria-checked="true"]')) {
      return true;
    }

    const optionScope = optionElement.closest('li, label, .subject_node, [class*="option"], [class*="choice"]') || optionElement;
    const classText = this.collectClassText(optionScope).toLowerCase();

    if (/(^|[-_ ])(checked|selected|active|current|cur|on|right|correct|success|blue)([-_ ]|$)/i.test(classText)) {
      return true;
    }

    const marker = optionScope.querySelector([
      '.examquestions-answer',
      '.is-checked',
      '.checked',
      '.selected',
      '.active',
      '.cur',
      '.on',
      '.right',
      '.correct',
      '.success',
      '.blue',
      '[class*="checked"]',
      '[class*="selected"]',
      '[class*="active"]',
      '[class*="right"]',
      '[class*="correct"]',
      '[class*="success"]',
      '[class*="blue"]'
    ].join(', '));

    if (marker) {
      return true;
    }

    return this.hasZhihuishuSelectedStyle(optionScope);
  }

  hasZhihuishuSelectedStyle(element) {
    const candidates = [element, ...Array.from(element.querySelectorAll('*'))];

    return candidates.some((node) => {
      const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      if (!style) {
        return false;
      }

      return this.isZhihuishuSelectedColor(style.color) ||
        this.isZhihuishuSelectedColor(style.backgroundColor) ||
        this.isZhihuishuSelectedColor(style.borderColor);
    });
  }

  isZhihuishuSelectedColor(color) {
    const match = String(color || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) {
      return false;
    }

    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);

    return blue >= 180 && red <= 120 && green >= 80;
  }

  collectClassText(element) {
    const classes = [];
    const collect = (node) => {
      if (!node || !node.classList) {
        return;
      }

      classes.push(...Array.from(node.classList));
      Array.from(node.children || []).forEach(collect);
    };

    collect(element);
    return classes.join(' ');
  }

  formatZhihuishuCheckedAnswer(type, checkedOptions) {
    if (type === '多选题') {
      return checkedOptions.map((option) => option.label).join('');
    }

    if (type === '判断题') {
      const option = checkedOptions[0];
      return option ? `${option.label}. ${option.text}` : null;
    }

    return checkedOptions
      .map((option) => `${option.label}. ${option.text}`)
      .join('、');
  }

  normalizeZhihuishuFallbackAnswer(type, answer, options) {
    const text = this.cleanAnswerText(answer || '')
      .replace(/^(答案|正确答案|参考答案)[:：]?\s*/i, '')
      .trim();

    if (!text) {
      return null;
    }

    if (type === '判断题') {
      if (/^(正确|错误)$/.test(text)) {
        return null;
      }

      const labelMatch = text.match(/^([AB])$/i);
      if (labelMatch) {
        const option = options.find((item) => item.label === labelMatch[1].toUpperCase());
        return option ? `${option.label}. ${option.text}` : labelMatch[1].toUpperCase();
      }

      const textMatch = text.match(/^(对|错)$/);
      if (textMatch) {
        const option = options.find((item) => item.text === textMatch[1]);
        return option ? `${option.label}. ${option.text}` : textMatch[1];
      }
    }

    return text;
  }

  cleanZhihuishuTitleText(text) {
    return this.cleanText(this.decryptText(text))
      .replace(/^\d+[\.\s、:：)]*\s*/, '')
      .replace(/^【(单选题|多选题|判断题|填空题|简答题|名词解释|论述题)】\s*/, '')
      .replace(/^（?[\d.]+分）?\s*/, '')
      .replace(/^AI解析\s*/, '')
      .replace(/\s*(正确|错误|本题的得分|我的答案|参考答案|答案解析|解析).*$/i, '')
      .trim();
  }

  isKetangpaiQuestionElement(element) {
    if (!element || !element.classList) {
      return false;
    }

    return element.classList.contains('student-detail-question-block') ||
      Array.from(element.classList).some((className) => className.startsWith('plugins-testType-')) ||
      Boolean(element.querySelector('[class*="plugins-testType-"]'));
  }

  getKetangpaiTypeComponent(element) {
    if (element.matches && element.matches('[class*="plugins-testType-"]')) {
      return element;
    }

    return element.querySelector('[class*="plugins-testType-"]') || element;
  }

  extractKetangpaiTitle(element) {
    const component = this.getKetangpaiTypeComponent(element);
    const titleElement = component.querySelector('.content-box');

    if (titleElement) {
      const text = this.cleanTitleText(titleElement.innerText || titleElement.textContent || '');
      if (text) {
        return text;
      }
    }

    const fullText = this.cleanText(this.decryptText(component.innerText || component.textContent || ''));
    const withoutPrefix = fullText.replace(/^\d+[\.\s、:：)]*\s*(名词解释|单选题|多选题|判断题|填空题|简答题|主观题)?\s*（?[\d.]+分）?\s*难度[:：]\S+\s*/i, '');
    const title = withoutPrefix
      .replace(/\s*(我的答案|未作答|参考答案|试题解析).*$/i, '')
      .trim();

    return title || '未找到题目';
  }

  extractKetangpaiOptions(element) {
    const component = this.getKetangpaiTypeComponent(element);
    const optionElements = Array.from(component.querySelectorAll(
      '.SingleChoice-radio .el-radio__label, ' +
      '.Multiplechoice-radio .el-checkbox__label, ' +
      '.Judge-content .el-radio__label, ' +
      '.choice .radio-title, ' +
      '.radio-title'
    )).filter((node) => this.cleanText(node.innerText || node.textContent || ''));

    if (optionElements.length >= 2) {
      return this.buildOptions(optionElements);
    }

    return this.findOptionsByText(component);
  }

  extractKetangpaiAnswer(element) {
    const component = this.getKetangpaiTypeComponent(element);
    const answerElement = component.querySelector('.answer-correct-type');

    if (answerElement) {
      const text = this.cleanKetangpaiAnswerText(answerElement.innerText || answerElement.textContent || '');
      if (text) {
        return text;
      }
    }

    const referenceElements = Array.from(component.querySelectorAll('.DocumentTitle-reference'));
    const referenceAnswer = referenceElements
      .map((node) => this.cleanKetangpaiAnswerText(node.innerText || node.textContent || ''))
      .find((text) => text && text !== '我的答案');

    if (referenceAnswer) {
      return referenceAnswer;
    }

    const fullText = this.cleanText(this.decryptText(component.innerText || component.textContent || ''));
    const match = fullText.match(/参考答案\s*(.+?)(?:\s*试题解析|$)/);
    return match ? this.cleanText(match[1]) : null;
  }

  cleanKetangpaiAnswerText(text) {
    return this.cleanAnswerText(text)
      .replace(/^未作答\s*/i, '')
      .replace(/^我的答案\s*/i, '')
      .replace(/^参考答案\s*/i, '')
      .replace(/\s*试题解析\s*$/i, '')
      .trim();
  }

  inferKetangpaiQuestionType(element, question) {
    const component = this.getKetangpaiTypeComponent(element);
    const className = component.className || '';
    const fullText = this.cleanText(component.innerText || component.textContent || '');

    if (/DocumentTitle|名词解释/.test(className) || /名词解释/.test(fullText)) {
      return '名词解释';
    }

    if (/Multiplechoice|多选题/i.test(className) || /多选题/.test(fullText)) {
      return '多选题';
    }

    if (/Judge|判断题/i.test(className) || /判断题/.test(fullText)) {
      return '判断题';
    }

    if (/SingleChoice|单选题/i.test(className) || /单选题/.test(fullText)) {
      return '单选题';
    }

    return this.inferQuestionType(question, element);
  }

  extractPageTitle() {
    for (const selector of this.selectors.pageTitle) {
      const titleElement = document.querySelector(selector);
      if (titleElement) {
        const text = this.cleanText(this.decryptText(titleElement.innerText || titleElement.textContent || ''));
        if (text && text.length >= 2) {
          return this.sanitizePageTitle(text);
        }
      }
    }

    return this.sanitizePageTitle(document.title || '题目导出');
  }

  sanitizePageTitle(title) {
    return this.cleanText(
      title
        .replace(/[-_|\s]*(学习通|超星|长江雨课堂|雨课堂).*$/i, '')
        .replace(/[-_|\s]*(课堂派|ketangpai).*$/i, '')
        .replace(/[-_|\s]*(智慧树|知到|zhihuishu).*$/i, '')
        .replace(/\s*多次答题取\s*最高成绩\s*$/i, '')
        .replace(/\s*用时[:：].*$/i, '')
    ) || '题目导出';
  }

  extractTitle(element) {
    for (const selector of this.selectors.questionTitle) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        const text = this.cleanTitleText(titleElement.innerText || titleElement.textContent || '');
        if (text && !this.isQuestionTypeOnlyText(text)) {
          return text;
        }
      }
    }

    const candidate = this.extractTitleFromText(element);
    return candidate || '未找到题目';
  }

  extractTitleFromText(element) {
    const clone = element.cloneNode(true);
    const noiseSelectors = [
      ...this.selectors.options,
      ...this.selectors.answerBox,
      'input',
      'textarea',
      'button',
      'script',
      'style'
    ];

    noiseSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((node) => node.remove());
    });

    const texts = Array.from(clone.querySelectorAll('*'))
      .map((node) => this.cleanTitleText(node.innerText || node.textContent || ''))
      .filter((text) => text && text.length >= 6 && !this.isOptionLikeText(text));

    if (texts.length > 0) {
      return texts.sort((a, b) => b.length - a.length)[0];
    }

    return this.cleanTitleText(clone.innerText || clone.textContent || '');
  }

  extractOptions(element) {
    for (const selector of this.mergedOptionSelectors) {
      const optionElements = Array.from(element.querySelectorAll(selector))
        .filter((node) => this.isUsefulOptionNode(node));

      if (optionElements.length >= 2) {
        return this.buildOptions(optionElements);
      }
    }

    const fallbackOptions = this.findOptionsByText(element);
    if (fallbackOptions.length >= 2) {
      return fallbackOptions;
    }

    return [];
  }

  isUsefulOptionNode(node) {
    const text = this.cleanText(this.decryptText(node.innerText || node.textContent || ''));
    if (!text) {
      return false;
    }

    if (text.length > 200) {
      return false;
    }

    return this.isOptionLikeText(text) || node.querySelector('input, [role="radio"], [role="checkbox"]');
  }

  findOptionsByText(element) {
    const candidates = Array.from(element.querySelectorAll('*'))
      .map((node) => this.cleanText(this.decryptText(node.innerText || node.textContent || '')))
      .filter((text) => this.isOptionLikeText(text));

    const uniqueCandidates = Array.from(new Set(candidates)).slice(0, 8);

    return uniqueCandidates.map((text, index) => {
      const parsed = this.parseOptionText(text);
      return {
        label: parsed.label || String.fromCharCode(65 + index),
        text: parsed.text,
        isChecked: false
      };
    });
  }

  buildOptions(optionElements) {
    const seen = new Set();
    const options = [];

    optionElements.forEach((optionElement, index) => {
      const rawText = this.cleanText(this.decryptText(optionElement.innerText || optionElement.textContent || ''));
      const parsed = this.parseOptionText(rawText);
      const dedupeKey = `${parsed.label || index}-${parsed.text}`;

      if (!parsed.text || seen.has(dedupeKey)) {
        return;
      }

      seen.add(dedupeKey);
      options.push({
        label: parsed.label || String.fromCharCode(65 + index),
        text: parsed.text,
        isChecked: this.isOptionChecked(optionElement)
      });
    });

    return options;
  }

  parseOptionText(text) {
    const normalized = this.cleanText(text);
    const match = normalized.match(/^([A-H])[\.\s、:：\)]\s*(.+)$/i);

    if (match) {
      return {
        label: match[1].toUpperCase(),
        text: this.cleanText(match[2])
      };
    }

    if (/^[A-H]$/.test(normalized)) {
      return {
        label: normalized,
        text: normalized
      };
    }

    return {
      label: null,
      text: normalized
    };
  }

  isOptionChecked(optionElement) {
    const result = this.selectors.checkedMarker.some((selector) => {
      return optionElement.matches(selector) || optionElement.querySelector(selector);
    });

    if (result) {
      return true;
    }

    const container = optionElement.closest('li, label, .el-radio, .el-checkbox');
    if (!container) {
      return false;
    }

    return this.selectors.checkedMarker.some((selector) => {
      return container.matches(selector) || container.querySelector(selector);
    });
  }

  estimateOptionCount(element) {
    const selectors = [
      ...this.selectors.options,
      '[class*="option"]',
      '[role="radio"]',
      '[role="checkbox"]'
    ];

    for (const selector of selectors) {
      const count = element.querySelectorAll(selector).length;
      if (count >= 2) {
        return count;
      }
    }

    const textMatches = Array.from(element.querySelectorAll('*'))
      .map((node) => this.cleanText(this.decryptText(node.innerText || node.textContent || '')))
      .filter((text) => this.isOptionLikeText(text));

    return textMatches.length;
  }

  extractAnswer(element) {
    for (const selector of this.selectors.answerBox) {
      const answerElement = element.querySelector(selector);
      if (answerElement) {
        const text = this.cleanAnswerText(answerElement.innerText || answerElement.textContent || '');
        if (text) {
          return text;
        }
      }
    }

    const textCandidates = Array.from(element.querySelectorAll('*'))
      .map((node) => this.cleanAnswerText(node.innerText || node.textContent || ''))
      .filter((text) => this.isAnswerLikeText(text));

    return textCandidates[0] || null;
  }

  inferQuestionType(question, element) {
    const title = question.title || '';
    const answer = question.answer || '';
    const optionCount = question.options.length;
    const checkedCount = question.options.filter((option) => option.isChecked).length;
    const interactiveTypes = Array.from(element.querySelectorAll('input'))
      .map((input) => input.type.toLowerCase());

    if (/判断|true|false|对|错/i.test(title) || (optionCount === 2 && question.options.some((option) => /^(对|错|true|false)$/i.test(option.text)))) {
      return '判断题';
    }

    if (/填空/i.test(title) || interactiveTypes.includes('text') || interactiveTypes.includes('textarea')) {
      return '填空题';
    }

    if (/简答|问答|主观/i.test(title) || /简答|解析/i.test(answer)) {
      return '简答题';
    }

    if (/多选/i.test(title) || interactiveTypes.includes('checkbox') || checkedCount > 1) {
      return '多选题';
    }

    if (optionCount > 0) {
      return '单选题';
    }

    return '未知题型';
  }

  hasQuestionTypeKeyword(text) {
    return /(单选题|多选题|判断题|填空题|简答题|主观题|题目|问题|习题|试卷|作业|测验|考试)/.test(text);
  }

  isOptionLikeText(text) {
    return /^([A-H])[\.\s、:：\)]\s*\S+/i.test(text);
  }

  isQuestionTypeOnlyText(text) {
    return /^\d+\.(单选题|多选题|判断题|填空题|简答题|主观题)(\s*\(\d+分\))?$/i.test(text);
  }

  isAnswerLikeText(text) {
    return /^(答案|正确答案|参考答案|解析)[:：]?\s*/.test(text);
  }

  cleanTitleText(text) {
    const normalized = this.cleanText(this.decryptText(text));
    return normalized
      .replace(/^\d+[\.\s、:：)]\s*/, '')
      .replace(/^(单选题|多选题|判断题|填空题|简答题|主观题)\s*/, '')
      .trim();
  }

  cleanAnswerText(text) {
    return this.cleanText(this.decryptText(text))
      .replace(/\s+/g, ' ')
      .trim();
  }

  cleanText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  decryptText(text) {
    if (window.fontDecryptor && window.fontDecryptor.isReady()) {
      return window.fontDecryptor.decrypt(text);
    }

    return text;
  }

  debugPageStructure() {
    const info = {
      platform: this.platform,
      url: window.location.href,
      title: document.title,
      possibleContainers: []
    };

    this.allQuestionContainerSelectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          info.possibleContainers.push({
            selector,
            count: elements.length,
            sampleClass: elements[0].className || null,
            sampleId: elements[0].id || null
          });
        }
      } catch (error) {
        console.warn('调试选择器失败:', selector, error);
      }
    });

    return info;
  }

  getNoQuestionMessage() {
    if (this.platform === 'yuketang' && document.querySelector('.btn-quiz')) {
      return '当前是长江雨课堂的考试总览页，不是试卷详情页。请先点击“查看试卷”进入题目页，再使用扩展导出。';
    }

    return '未找到题目，请确认当前页面是学习通、长江雨课堂、课堂派或智慧树的答题/作业/试卷页面。请打开浏览器控制台（F12）查看详细信息。';
  }
}
