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
          '.Zy_TItle',
          '.Cy_TItle',
          '.TiMuDiv',
          '.e-q-body',
          '.subject_tab',
          '.questionInfo',
          '[class*="TiMu"]',
          '[class*="questionLi"]',
          '[class*="Zy_TItle"]',
          '[class*="Cy_TItle"]',
          'div[id^="question"]'
        ],
        questionTitle: [
          '.qtContent',
          '.Zy_TItle .clearfix',
          '.Zy_TItle',
          '.newZy_TItle',
          '.Cy_TItle',
          '.TiMu .clearfix',
          '.TiMu',
          '.questionTitle',
          '.question-title',
          '.stem',
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
          '.Py_answer',
          '.Zy_answer',
          '.Cy_answer',
          '.answerCon',
          '.answerContent',
          '.score_info',
          '.analysis',
          '.jiexitxt',
          '.jiexi',
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
    // 学习通：优先按 .mark_item 题型块拆题（题型从块头精准读取）
    if (this.platform === 'chaoxing') {
      const blockQuestions = this.findChaoxingQuestionsByBlocks();
      const globalBest = this.findBestContainerSet();
      const blockLen = blockQuestions ? blockQuestions.length : 0;
      const globalLen = globalBest ? globalBest.length : 0;

      // 取拆出题目更多的一组（块级与全局通常一致，块级额外携带题型上下文）
      if (blockLen > 0 && blockLen >= globalLen) {
        return blockQuestions;
      }
      if (globalLen > 0) {
        return globalBest;
      }

      const textQuestions = this.findChaoxingQuestionsByText();
      if (textQuestions.length > 0) {
        return textQuestions;
      }

      return this.findQuestionsByInteractiveElements();
    }

    const best = this.findBestContainerSet();
    if (best) {
      return best;
    }

    return this.findQuestionsByInteractiveElements();
  }

  findBestContainerSet() {
    const attempts = [];

    for (const selector of this.selectors.questionContainer) {
      const elements = this.normalizePlatformQuestionRoots(Array.from(document.querySelectorAll(selector)));
      const normalized = this.normalizeQuestionCandidates(elements);

      if (normalized.length === 0) {
        continue;
      }

      const score = this.scoreQuestionSet(normalized);
      attempts.push({ selector, elements: normalized, score });
    }

    attempts.sort((a, b) => b.score - a.score);
    return attempts.length > 0 ? attempts[0].elements : null;
  }

  // 遍历 .mark_item 题型块，在每块内拆出单题
  findChaoxingQuestionsByBlocks() {
    const blocks = Array.from(document.querySelectorAll('.mark_item'));
    if (blocks.length === 0) {
      return null;
    }

    const all = [];
    for (const block of blocks) {
      this.findChaoxingSubQuestions(block).forEach((element) => all.push(element));
    }

    return all.length > 0 ? this.normalizeQuestionCandidates(all) : null;
  }

  // 在单个题型块内，尝试各候选单题容器选择器，选出拆分最合理的一组
  findChaoxingSubQuestions(block) {
    const selectors = [
      '.questionLi',
      '.TiMu',
      '.Py_tk',
      '.TiMuDiv',
      '.subject_tab',
      '.questionInfo',
      '[class*="TiMu"]',
      '[class*="questionLi"]',
      'dl'
    ];

    let best = [];
    let bestScore = -Infinity;

    for (const selector of selectors) {
      const roots = Array.from(block.querySelectorAll(selector))
        .map((element) => this.getChaoxingQuestionRoot(element))
        .filter((element) => element && block.contains(element));
      const normalized = this.normalizeQuestionCandidates(roots);

      if (normalized.length === 0) {
        continue;
      }

      const score = this.scoreQuestionSet(normalized);
      if (score > bestScore) {
        bestScore = score;
        best = normalized;
      }
    }

    // 兜底：块内未命中任何单题容器时，整块作为一题
    if (best.length === 0 && this.isQuestionCandidate(block)) {
      return [block];
    }

    return best;
  }

  // 从题目所在的 .mark_item 块头读取权威题型（如「三、填空题」→ 填空题）
  getChaoxingBlockType(element) {
    if (!element || !element.closest) {
      return null;
    }

    const block = element.closest('.mark_item');
    if (!block) {
      return null;
    }

    const headEl = block.querySelector('.mark_name, .type_tit, .mark_title, h3, h4, strong');
    let headText = headEl ? this.cleanText(headEl.innerText || headEl.textContent || '') : '';

    if (!headText) {
      headText = this.cleanText((block.innerText || '').split('\n')[0] || '');
    }

    const match = headText.match(/(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)/);
    return match ? match[1] : null;
  }

  findChaoxingQuestionsByText() {
    const candidates = Array.from(document.querySelectorAll('div, li, section, article, dd, dl'))
      .filter((element) => {
        const text = this.cleanText(this.decryptText(element.innerText || ''));
        if (!/【(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)】/.test(text)) {
          return false;
        }

        if (text.length < 20 || text.length > 5000) {
          return false;
        }

        return /我的答案|正确答案|参考答案|答案/.test(text) || this.estimateOptionCount(element) >= 2;
      });

    return this.normalizeQuestionCandidates(candidates);
  }

  normalizePlatformQuestionRoots(elements) {
    if (this.platform !== 'chaoxing') {
      return elements;
    }

    return elements.map((element) => this.getChaoxingQuestionRoot(element));
  }

  getChaoxingQuestionRoot(element) {
    if (!element) {
      return element;
    }

    if (element.matches('.Zy_TItle, .Cy_TItle, .newZy_TItle, .qtContent, .fontLabel')) {
      return element.parentElement && (
        element.parentElement.closest('.TiMu, .questionLi, .Py_tk, .TiMuDiv, [class*="TiMu"], li') ||
        element.parentElement
      );
    }

    // .subject_tab 和 .questionInfo 自身即为题目根节点，但若嵌套在 .mark_item 中也无妨
    if (element.matches('.subject_tab, .questionInfo')) {
      return element;
    }

    return element.closest('.TiMu, .questionLi, .Py_tk, .TiMuDiv, [class*="TiMu"], .subject_tab, .questionInfo') || element;
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

    if (this.platform === 'chaoxing' && this.isChaoxingQuestionElement(element, plainText)) {
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
    if (this.platform === 'chaoxing') {
      return this.parseChaoxingQuestion(questionElement, index);
    }

    if (this.platform === 'ketangpai') {
      return this.parseKetangpaiQuestion(questionElement, index);
    }

    if (this.platform === 'zhihuishu') {
      return this.parseZhihuishuQuestion(questionElement, index);
    }

    const title = this.extractTitle(questionElement);
    const typeHint = this.inferQuestionType({ title, options: [], answer: null }, questionElement);
    const isFillIn = typeHint === '填空题' || typeHint === '简答题';

    const question = {
      number: index + 1,
      title,
      options: isFillIn ? [] : this.extractOptions(questionElement),
      myAnswer: this.extractMyAnswer(questionElement),
      correctAnswer: isFillIn ? this.extractCorrectAnswer(questionElement) : null,
      answer: isFillIn ? this.extractFillInAnswer(questionElement) : this.extractAnswer(questionElement),
      analysis: this.extractAnalysis(questionElement),
      score: this.extractScore(questionElement),
      type: null
    };

    question.type = this.inferQuestionType(question, questionElement);
    return question;
  }

  parseChaoxingQuestion(questionElement, index) {
    const blockType = this.getChaoxingBlockType(questionElement);
    const rawTitle = this.extractChaoxingTitle(questionElement);
    const optionGroups = this.extractChaoxingEmbeddedOptionGroups(questionElement, rawTitle);
    const title = optionGroups.length > 0
      ? this.stripChaoxingEmbeddedOptions(rawTitle, optionGroups)
      : rawTitle;
    // 块头题型为权威来源，缺失时回退到文本推断
    const typeHint = blockType || this.inferChaoxingQuestionType({ title, options: [], answer: null }, questionElement);
    const hintedWritten = this.isChaoxingWrittenQuestionType(typeHint);

    const options = hintedWritten ? [] : this.extractChaoxingOptions(questionElement);
    const questionType = blockType || (hintedWritten
      ? typeHint
      : this.inferChaoxingQuestionType({ title, options, answer: null }, questionElement));
    const isWritten = this.isChaoxingWrittenQuestionType(questionType);
    const answer = isWritten
      ? this.extractChaoxingWrittenAnswer(questionElement)
      : this.extractChaoxingAnswer(questionElement, options, questionType);

    const question = {
      number: index + 1,
      title,
      options,
      optionGroups: hintedWritten ? optionGroups : [],
      myAnswer: isWritten
        ? (this.extractChaoxingRawMyAnswer(questionElement) || this.extractMyAnswer(questionElement))
        : (this.extractChaoxingMyAnswer(questionElement, options) || this.extractMyAnswer(questionElement)),
      correctAnswer: isWritten ? (this.extractChaoxingRawStandardAnswer(questionElement) || this.extractCorrectAnswer(questionElement)) : null,
      answer,
      analysis: this.extractAnalysis(questionElement),
      score: this.extractScore(questionElement),
      type: questionType
    };

    return question;
  }

  isChaoxingQuestionElement(element, text = null) {
    if (!element) {
      return false;
    }

    const plainText = text || this.cleanText(this.decryptText(element.innerText || ''));
    return element.classList.contains('questionLi') ||
      element.classList.contains('TiMu') ||
      element.classList.contains('Py_tk') ||
      element.classList.contains('TiMuDiv') ||
      element.classList.contains('subject_tab') ||
      element.classList.contains('questionInfo') ||
      /^(第?\d+[\.\s、:：)]|[\(\[【]?(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释))/i.test(plainText) ||
      Boolean(element.querySelector('.Zy_TItle, .Cy_TItle, .qtContent, .Py_answer, .Zy_answer, .score_info, textarea'));
  }

  extractChaoxingTitle(element) {
    const titleSelectors = [
      '.qtContent',
      '.Zy_TItle .clearfix',
      '.Zy_TItle',
      '.newZy_TItle',
      '.Cy_TItle',
      '.TiMu .clearfix',
      '.questionTitle',
      '.question-title',
      '.fontLabel',
      '.stem',
      '.topic-title',
      '.e-q-q'
    ];

    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        // 优先用 innerText：尊重 CSS 可见性，inline <span>/<i> 能正确拼接；
        // 避免 textContent 把隐藏的填空占位符等内容混入
        const rawText = titleElement.innerText || this.extractReadableText(titleElement);
        const text = this.cleanChaoxingTitleText(rawText);
        if (text && !this.isQuestionTypeOnlyText(text)) {
          return text;
        }
      }
    }

    return this.cleanChaoxingTitleText(this.extractTitleFromText(element)) || '未找到题目';
  }

  extractChaoxingOptions(element) {
    const optionSelectors = [
      '.mark_letter li',
      '.mark_letter .clearfix',
      '.answerList li',
      '.Zy_ulTop li',
      '.Cy_ulTop li',
      '.ulTop li',
      '.optionLi',
      '.option-item',
      '.e-q-options li',
      'label'
    ];

    for (const selector of optionSelectors) {
      const optionElements = Array.from(element.querySelectorAll(selector))
        .filter((node) => this.isChaoxingOptionNode(node));

      if (optionElements.length >= 2) {
        return this.buildOptions(optionElements);
      }
    }

    return this.findChaoxingOptionsByText(element);
  }

  extractChaoxingEmbeddedOptionGroups(element, titleText = null) {
    const sourceText = this.cleanText(titleText || this.extractChaoxingTitle(element));
    if (!sourceText) {
      return [];
    }

    const subQuestionMatches = Array.from(sourceText.matchAll(/(?:^|\s)([（(]\d+[）)])\s*/g));
    if (subQuestionMatches.length === 0) {
      return [];
    }

    const groups = [];
    for (let index = 0; index < subQuestionMatches.length; index += 1) {
      const match = subQuestionMatches[index];
      const nextMatch = subQuestionMatches[index + 1];
      const leadingSpaceLength = (match[0].match(/^\s*/) || [''])[0].length;
      const start = match.index + leadingSpaceLength;
      const end = nextMatch ? nextMatch.index : sourceText.length;
      const segment = sourceText.slice(start, end).trim();
      const options = this.extractChaoxingOptionsFromSegment(segment);

      if (options.length < 2) {
        continue;
      }

      const firstOptionIndex = options[0].index;
      const stem = this.cleanText(segment.slice(0, firstOptionIndex));
      groups.push({
        number: match[1],
        stem,
        options: options.map(({ index: _index, ...option }) => option),
        start,
        end
      });
    }

    return groups;
  }

  extractChaoxingOptionsFromSegment(segment) {
    const matches = Array.from(segment.matchAll(/(?:^|\s)([A-H])[\.\s、:：\)]\s*/gi));
    return matches.map((match, index) => {
      const labelIndex = match.index + match[0].search(/[A-H]/i);
      const textStart = match.index + match[0].length;
      const nextMatch = matches[index + 1];
      const textEnd = nextMatch ? nextMatch.index : segment.length;
      const text = this.cleanText(segment.slice(textStart, textEnd));

      return {
        label: match[1].toUpperCase(),
        text,
        isChecked: false,
        index: labelIndex
      };
    }).filter((option) => {
      return option.text &&
        option.text.length <= 500 &&
        !/^(正确答案|参考答案|标准答案|答案|解析|我的答案)/.test(option.text);
    });
  }

  stripChaoxingEmbeddedOptions(title, optionGroups) {
    if (!title || optionGroups.length === 0) {
      return title;
    }

    let result = '';
    let cursor = 0;
    for (const group of optionGroups) {
      result += title.slice(cursor, group.start);
      result += group.stem;
      cursor = group.end;
    }
    result += title.slice(cursor);

    return this.cleanChaoxingTitleText(result);
  }

  isChaoxingOptionNode(node) {
    const text = this.cleanText(this.decryptText(this.extractReadableText(node)));
    // 判断题选项可能是纯"对"/"错"（无 A/B 前缀），需特殊放行
    const isJudgeOption = /^(对|错|正确|错误)$/.test(text);
    if (!isJudgeOption && (!this.isOptionLikeText(text) || text.length > 260)) {
      return false;
    }

    if (this.isAnswerLikeText(text) || /^(解析|答案解析|我的答案|参考答案|正确答案)/.test(text)) {
      return false;
    }

    if (/\s+[A-H][\.\s、:：\)]\s*\S+/.test(text)) {
      return false;
    }

    const childOptionCount = Array.from(node.children || [])
      .filter((child) => this.isOptionLikeText(this.cleanText(this.decryptText(this.extractReadableText(child)))))
      .length;

    return childOptionCount <= 1;
  }

  findChaoxingOptionsByText(element) {
    const clone = element.cloneNode(true);
    [
      ...this.selectors.answerBox,
      '.mark_answer',
      '.rightAnswerContent',
      '.newAnswerBx',
      '.answerBx',
      '.Py_answer',
      '.Zy_answer',
      '.Cy_answer',
      '.analysis',
      '.jiexitxt',
      '.jiexi',
      'textarea'
    ].forEach((selector) => {
      clone.querySelectorAll(selector).forEach((node) => node.remove());
    });

    const text = this.cleanText(this.decryptText(this.extractReadableText(clone)));
    const optionMatches = Array.from(text.matchAll(/(?:^|\s)([A-H])[\.\s、:：\)]\s*(.*?)(?=\s+[A-H][\.\s、:：\)]\s*|$)/gi))
      .map((match) => ({
        label: match[1].toUpperCase(),
        text: this.cleanText(match[2]),
        isChecked: false
      }))
      .filter((option) => option.text && !/^(正确答案|参考答案|答案|解析)/.test(option.text));

    const seen = new Set();
    return optionMatches.filter((option) => {
      const key = `${option.label}-${option.text}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  extractChaoxingAnswer(element, options = [], questionType = null) {
    const resolvedQuestionType = questionType || this.inferChaoxingQuestionType(
      { title: this.extractChaoxingTitle(element), options, answer: null },
      element
    );
    const standardAnswer = this.extractChaoxingStandardAnswer(element, options);
    if (standardAnswer) {
      return standardAnswer;
    }

    const resultStatus = this.getChaoxingAnswerResultStatus(element);
    const myAnswer = this.extractChaoxingMyAnswer(element, options);
    if (resultStatus === 'correct' && myAnswer) {
      return myAnswer;
    }

    if (resolvedQuestionType === '判断题') {
      const markerAnswer = this.extractChaoxingJudgeAnswerByMarker(element, options);
      if (markerAnswer) {
        return markerAnswer;
      }
    }

    const answerSelectors = [
      '.mark_answer',
      '.rightAnswerContent',
      '.newAnswerBx',
      '.answerBx',
      '.Py_answer',
      '.Zy_answer',
      '.Cy_answer',
      '.answerCon',
      '.answerContent',
      '.score_info',
      '.lookAnswer',
      '.correctAnswer',
      '.analysis',
      '.jiexitxt',
      '.jiexi'
    ];

    for (const selector of answerSelectors) {
      const answerElement = element.querySelector(selector);
      if (answerElement) {
        const answerText = this.cleanText(this.extractReadableText(answerElement));
        if (/我的答案/.test(answerText)) {
          continue;
        }

        const text = this.normalizeChaoxingAnswerText(
          this.cleanChaoxingAnswerText(answerText),
          options
        );
        if (text) {
          return text;
        }
      }
    }

    if (resultStatus !== 'incorrect' && myAnswer) {
      return myAnswer;
    }

    if (resultStatus === 'incorrect' && myAnswer) {
      return this.formatChaoxingWrongAnswer(myAnswer);
    }

    const fullText = this.cleanText(this.decryptText(this.extractReadableText(element)));
    const answerMatch = fullText.match(/(?:标准答案|参考答案|正确答案)[:：]?\s*(.+?)(?:\s*(?:解析|答案解析|我的答案|收起解析|知识点|\d+\.?\d*\s*分)|$)/);
    return answerMatch ? this.normalizeChaoxingAnswerText(this.cleanChaoxingAnswerText(answerMatch[1]), options) : null;
  }

  extractChaoxingWrittenAnswer(element) {
    const standardAnswer = this.extractChaoxingRawStandardAnswer(element);
    if (standardAnswer) {
      return standardAnswer;
    }

    const resultStatus = this.getChaoxingAnswerResultStatus(element);
    const myAnswer = this.extractChaoxingRawMyAnswer(element);

    if (resultStatus === 'incorrect' && myAnswer) {
      return this.formatChaoxingWrongAnswer(myAnswer);
    }

    if (myAnswer) {
      return myAnswer;
    }

    return this.extractFillInAnswer(element);
  }

  extractChaoxingMyAnswer(element, options = []) {
    const answer = this.extractChaoxingRawMyAnswer(element);
    return answer ? this.normalizeChaoxingAnswerText(answer, options) : null;
  }

  getChaoxingAnswerResultStatus(element) {
    const fillStatus = this.getChaoxingFillAnswerStatus(element);
    if (fillStatus !== 'unknown') {
      return fillStatus;
    }

    const fullText = this.cleanText(this.decryptText(this.extractReadableText(element)));

    if (/(^|\s)0(?:\.0+)?\s*分/.test(fullText)) {
      return 'incorrect';
    }

    if (/我的答案[:：]?.{0,20}(正确|答对|得分|满分)/.test(fullText) || /[1-9]\d*(?:\.\d+)?\s*分/.test(fullText)) {
      return 'correct';
    }

    const answerNode = Array.from(element.querySelectorAll('*')).find((node) => {
      const text = this.cleanText(this.extractReadableText(node));
      return /^我的答案[:：]?/.test(text);
    });

    if (!answerNode) {
      return 'unknown';
    }

    const scope = answerNode.closest('li, div, dd, dl, section, article') || answerNode.parentElement || answerNode;
    const classText = this.collectClassText(scope).toLowerCase();

    if (/(wrong|error|cuo|false|red|fail|incorrect)/i.test(classText)) {
      return 'incorrect';
    }

    if (/(dui|right|correct|success|green|true)/i.test(classText)) {
      return 'correct';
    }

    return 'unknown';
  }

  extractChaoxingStandardAnswer(element, options = []) {
    const standardAnswer = this.extractChaoxingRawStandardAnswer(element);
    return standardAnswer ? this.normalizeChaoxingAnswerText(standardAnswer, options) : null;
  }

  /**
   * 通过查找含"我的答案"/"正确答案"文字的节点定位答案区容器。
   * 比依赖 class 名更健壮：超星各版本 class 可能不同。
   */
  findChaoxingAnswerBlock(element) {
    const allNodes = Array.from(element.querySelectorAll('*'));
    for (const node of allNodes) {
      if (!node.innerText || (node.children && node.children.length > 10)) continue;
      const text = this.cleanText(node.innerText);
      // 找到一个"标签节点"：文字仅为答案标签（如"我的答案："）
      if (/^(我的答案|正确答案|参考答案|标准答案)[:：]?$/.test(text)) {
        // 向上找同时含"我的答案"和"正确答案"的最近祖先
        let ancestor = node.parentElement;
        while (ancestor && ancestor !== element) {
          const ancestorText = this.cleanText(ancestor.innerText || '');
          if (/(我的答案)/.test(ancestorText) &&
              /(正确答案|参考答案|标准答案)/.test(ancestorText) &&
              ancestorText.length < 1200) {
            return ancestor;
          }
          ancestor = ancestor.parentElement;
        }
        return node.parentElement || null;
      }
    }
    return null;
  }

  extractChaoxingRawStandardAnswer(element) {
    const fillAnswer = this.extractChaoxingMarkFillAnswer(element, 'standard');
    if (fillAnswer) {
      return fillAnswer;
    }

    // 先尝试文字定位答案块（不依赖 class 名）
    const answerBlock = this.findChaoxingAnswerBlock(element);
    if (answerBlock) {
      const blockText = this.cleanText(answerBlock.innerText || '');
      const match = blockText.match(/(?:标准答案|正确答案|参考答案)[:：]?\s*(.+?)(?=\s*(?:解析|答案解析|我的答案|知识点|\d+\.?\d*\s*分)|$)/i);
      if (match && this.cleanText(match[1])) {
        return this.cleanChaoxingAnswerText(match[1]);
      }
    }

    const answer = this.extractChaoxingLabeledAnswer(element, /标准答案|正确答案|参考答案/);
    return answer ? this.cleanChaoxingAnswerText(answer) : null;
  }

  extractChaoxingRawMyAnswer(element) {
    const fillAnswer = this.extractChaoxingMarkFillAnswer(element, 'mine');
    if (fillAnswer) {
      return fillAnswer;
    }

    // 先尝试文字定位答案块（不依赖 class 名）
    const answerBlock = this.findChaoxingAnswerBlock(element);
    if (answerBlock) {
      const blockText = this.cleanText(answerBlock.innerText || '');
      const match = blockText.match(/我的答案[:：]?\s*(.+?)(?=\s*(?:正确答案|参考答案|标准答案|答案解析|解析|知识点|\d+\.?\d*\s*分)|$)/i);
      if (match && this.cleanText(match[1])) {
        return this.cleanChaoxingAnswerText(match[1]);
      }
    }

    const answer = this.extractChaoxingLabeledAnswer(element, /我的答案/);
    return answer ? this.cleanChaoxingAnswerText(answer) : null;
  }

  extractChaoxingMarkFillAnswer(element, kind) {
    const answerArea = element.querySelector('.mark_answer') || element;
    const selectors = kind === 'standard'
      ? ['dl.mark_fill.colorGreen', 'dl.colorGreen']
      : ['dl.mark_fill.colorDeep', 'dl[id^="qb"].mark_fill'];

    for (const selector of selectors) {
      const answerList = Array.from(answerArea.querySelectorAll(selector));

      for (const list of answerList) {
        const labelText = this.cleanText(this.extractReadableText(list.querySelector('dt')));

        if (kind === 'standard' && !/(正确答案|参考答案|标准答案)/.test(labelText)) {
          continue;
        }

        if (kind === 'mine' && !/(我的答案|作答答案)/.test(labelText)) {
          continue;
        }

        const parts = Array.from(list.children)
          .filter((child) => child.tagName && child.tagName.toLowerCase() === 'dd')
          .map((child) => this.cleanChaoxingAnswerText(this.extractReadableText(child)))
          .filter(Boolean);

        if (parts.length > 0) {
          return parts.join(' ');
        }
      }
    }

    return null;
  }

  getChaoxingFillAnswerStatus(element) {
    const answerArea = element.querySelector('.mark_answer') || element;
    const myFill = answerArea.querySelector('dl.mark_fill.colorDeep, dl[id^="qb"].mark_fill');
    if (!myFill) {
      return 'unknown';
    }

    if (myFill.querySelector('.marking_cuo, .marking_ban, .marking_error, .marking_wrong')) {
      return 'incorrect';
    }

    const answerItems = Array.from(myFill.children)
      .filter((child) => child.tagName && child.tagName.toLowerCase() === 'dd');

    if (answerItems.length > 0 && answerItems.every((item) => item.querySelector('.marking_dui'))) {
      return 'correct';
    }

    const scoreText = this.cleanText(this.extractReadableText(myFill.querySelector('.totalScore')));
    if (/^0(?:\.0+)?\s*分?$/.test(scoreText)) {
      return 'incorrect';
    }

    if (/^[1-9]\d*(?:\.\d+)?\s*分?$/.test(scoreText)) {
      return 'correct';
    }

    return 'unknown';
  }

  extractChaoxingLabeledAnswer(element, labelPattern) {
    const fullText = this.cleanText(this.decryptText(this.extractReadableText(element)));
    const source = labelPattern.source;
    const match = fullText.match(new RegExp(`(?:${source})[:：]?\\s*(.+?)(?=\\s*(?:标准答案|正确答案|参考答案|我的答案|答案解析|解析|收起解析|AI讲解|知识点|本题得分|得分|\\d+\\.?\\d*\\s*分)|$)`, 'i'));

    if (match && this.cleanText(match[1])) {
      return this.cleanChaoxingAnswerText(match[1]);
    }

    const labelNode = Array.from(element.querySelectorAll('*')).find((node) => {
      const text = this.cleanText(this.extractReadableText(node));
      return new RegExp(`^(${source})[:：]?$`, 'i').test(text);
    });

    if (labelNode) {
      const fieldValues = this.extractChaoxingFieldValues(labelNode.parentElement || element);
      if (fieldValues.length > 0) {
        return this.cleanChaoxingAnswerText(fieldValues.join('；'));
      }

      const siblings = [];
      let current = labelNode.nextElementSibling;
      while (current) {
        const text = this.cleanText(this.extractReadableText(current));
        if (/^(标准答案|正确答案|参考答案|我的答案|答案解析|解析|收起解析|AI讲解|本题得分|得分)/.test(text) || /^\d+(?:\.\d+)?\s*分$/.test(text)) {
          break;
        }

        if (text) {
          siblings.push(text);
        }

        current = current.nextElementSibling;
      }

      if (siblings.length > 0) {
        return this.cleanChaoxingAnswerText(siblings.join('；'));
      }
    }

    return null;
  }

  extractChaoxingFieldValues(scope) {
    return Array.from((scope || document).querySelectorAll('input, textarea'))
      .map((field) => this.cleanText(field.value || field.getAttribute('value') || field.innerText || field.textContent || ''))
      .filter(Boolean);
  }

  extractChaoxingJudgeAnswerByMarker(element, options = []) {
    const marker = element.querySelector('.marking_dui, span.marking_dui, i.marking_dui');
    if (!marker) {
      return null;
    }

    const optionElement = marker.closest('li, label, .clearfix, .subject_node, .optionLi, .option-item, [class*="option"]') || marker.parentElement;
    if (!optionElement) {
      return null;
    }

    const rawText = this.cleanText(this.decryptText(this.extractReadableText(optionElement)));
    const parsed = this.parseOptionText(rawText);

    if (parsed.label && parsed.text) {
      return `${parsed.label}. ${parsed.text}`;
    }

    const inferredText = /错|错误/.test(rawText) ? '错' : '对';
    const matchedOption = options.find((option) => option.text === inferredText);
    return matchedOption ? `${matchedOption.label}. ${matchedOption.text}` : inferredText;
  }

  inferChaoxingQuestionType(question, element) {
    const text = this.cleanText(`${element.innerText || ''} ${question.title || ''}`);

    const markedType = text.match(/【(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)】/);
    if (markedType) {
      return markedType[1];
    }

    if (/多选题/.test(text)) {
      return '多选题';
    }

    if (/单选题/.test(text)) {
      return '单选题';
    }

    if (/判断题/.test(text)) {
      return '判断题';
    }

    if (/填空题/.test(text)) {
      return '填空题';
    }

    if (/名词解释/.test(text)) {
      return '名词解释';
    }

    if (/论述题/.test(text)) {
      return '论述题';
    }

    if (/问答题|简答题|主观题/.test(text)) {
      return '简答题';
    }

    return this.inferQuestionType(question, element);
  }

  isChaoxingWrittenQuestionType(type) {
    return /^(填空题|简答题|主观题|问答题|论述题|名词解释)$/.test(type || '');
  }

  cleanChaoxingTitleText(text) {
    return this.cleanText(this.decryptText(text))
      .replace(/^\d+[\.\s、:：)]*\s*/, '')
      .replace(/^[\(\[【]?(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)[\)\]】]?\s*/i, '')
      .replace(/^（?[\d.]+分）?\s*/, '')
      .replace(/\s*(正确答案|参考答案|答案|我的答案|解析|答案解析|收起解析).*$/i, '')
      .trim();
  }

  cleanChaoxingAnswerText(text) {
    return this.cleanAnswerText(text)
      .replace(/^(标准答案|正确答案|参考答案|我的答案|答案)[:：]?\s*/i, '')
      .replace(/\s*(答案解析|解析|收起解析|AI讲解)\s*$/i, '')
      .replace(/\s*(本题得分|得分)[:：]?\s*\d+(?:\.\d+)?\s*分?\s*$/i, '')
      .trim();
  }

  normalizeChaoxingAnswerText(answer, options = []) {
    const originalAnswer = this.cleanChaoxingAnswerText(answer);
    const text = this.cleanText(originalAnswer)
      .replace(/^[:：]\s*/, '')
      .replace(/[，,、\s]+/g, '')
      .replace(/[.。]+$/g, '')
      .toUpperCase();

    if (!text) {
      return null;
    }

    if (/^(正确|对)$/.test(text)) {
      const option = options.find((item) => /^(对|正确)$/.test(item.text));
      return option ? `${option.label}. ${option.text}` : '对';
    }

    if (/^(错误|错)$/.test(text)) {
      const option = options.find((item) => /^(错|错误)$/.test(item.text));
      return option ? `${option.label}. ${option.text}` : '错';
    }

    const labeledTextMatch = this.cleanText(originalAnswer).match(/^([A-H])\s*[:：]\s*(.+?)[;；]?$/i);
    if (labeledTextMatch) {
      const label = labeledTextMatch[1].toUpperCase();
      const option = options.find((item) => item.label === label);
      return option ? `${option.label}. ${option.text}` : `${label}. ${this.cleanText(labeledTextMatch[2])}`;
    }

    if (/^[A-H]+$/.test(text)) {
      const matchedOptions = text
        .split('')
        .map((label) => options.find((option) => option.label === label))
        .filter(Boolean);

      if (matchedOptions.length > 0) {
        return this.formatChaoxingAnswerFromOptions(matchedOptions);
      }

      return text.split('').join('、');
    }

    return originalAnswer;
  }

  formatChaoxingAnswerFromOptions(options) {
    return options.map((option) => `${option.label}. ${option.text}`).join('、');
  }

  formatChaoxingWrongAnswer(answer) {
    return `我的答案（错误）：${answer}`;
  }

  parseKetangpaiQuestion(questionElement, index) {
    const title = this.extractKetangpaiTitle(questionElement);
    const typeHint = this.inferKetangpaiQuestionType(questionElement, { title, options: [], answer: null });
    const isFillIn = typeHint === '填空题' || typeHint === '简答题' || typeHint === '名词解释';

    const question = {
      number: index + 1,
      title,
      options: isFillIn ? [] : this.extractKetangpaiOptions(questionElement),
      myAnswer: this.extractMyAnswer(questionElement),
      correctAnswer: isFillIn ? this.extractCorrectAnswer(questionElement) : null,
      answer: isFillIn
        ? this.extractFillInAnswer(questionElement)
        : this.extractKetangpaiAnswer(questionElement),
      analysis: this.extractAnalysis(questionElement),
      score: this.extractScore(questionElement),
      type: null
    };

    question.type = this.inferKetangpaiQuestionType(questionElement, question);
    return question;
  }

  parseZhihuishuQuestion(questionElement, index) {
    const title = this.extractZhihuishuTitle(questionElement);
    const type = this.extractZhihuishuType(questionElement);
    const isFillIn = type === '填空题' || type === '简答题' || type === '名词解释' || type === '论述题';

    let options = [];
    let answer = null;

    if (isFillIn) {
      answer = this.extractFillInAnswer(questionElement);
    } else {
      options = type === '判断题'
        ? this.extractZhihuishuJudgeOptions(questionElement)
        : this.extractZhihuishuOptions(questionElement);

      const checkedOptions = options.filter((o) => o.isChecked);
      if (checkedOptions.length > 0) {
        answer = this.formatZhihuishuCheckedAnswer(type, checkedOptions);
      } else {
        answer = this.normalizeZhihuishuFallbackAnswer(type, this.extractAnswer(questionElement), options);
      }
    }

    return {
      number: index + 1,
      title,
      options,
      myAnswer: this.extractMyAnswer(questionElement),
      correctAnswer: isFillIn ? this.extractCorrectAnswer(questionElement) : null,
      answer,
      analysis: this.extractAnalysis(questionElement),
      score: this.extractScore(questionElement),
      type: type || this.inferQuestionType({ title, options, answer }, questionElement)
    };
  }

  isZhihuishuQuestionElement(element, text = null) {
    if (!element) {
      return false;
    }

    const plainText = text || this.cleanText(this.decryptText(element.innerText || ''));
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

    const text = this.cleanZhihuishuTitleText(clone.innerText || '');
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

  extractMyAnswer(element) {
    // Look for "我的答案" labeled node
    const myAnswerNode = Array.from(element.querySelectorAll('*')).find((node) => {
      if (node.children && node.children.length > 6) return false;
      const text = this.cleanText(this.extractReadableText(node));
      return /^我的答案[:：]?/.test(text);
    });

    if (myAnswerNode) {
      const text = this.cleanText(this.extractReadableText(myAnswerNode))
        .replace(/^我的答案[:：]?\s*/i, '')
        .replace(/\s*(正确答案|参考答案|标准答案|答案解析|解析|得分|本题得分).*$/i, '')
        .trim();
      if (text) return text;

      const parts = [];
      let sibling = myAnswerNode.nextElementSibling;
      while (sibling) {
        const sibText = this.cleanText(this.extractReadableText(sibling));
        if (/^(正确答案|参考答案|标准答案|答案解析|解析|得分|本题得分)/.test(sibText)) break;
        if (sibText) parts.push(sibText);
        sibling = sibling.nextElementSibling;
      }
      if (parts.length > 0) return parts.join(' ');
    }

    // Fall back to input/textarea values
    const inputs = Array.from(element.querySelectorAll('input[type="text"], input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea'));
    const inputValues = inputs.map((input) => this.cleanText(input.value || '')).filter(Boolean);
    if (inputValues.length > 0) return inputValues.join(' / ');

    return null;
  }

  extractCorrectAnswer(element) {
    const labelPatterns = ['正确答案', '参考答案', '标准答案'];

    for (const label of labelPatterns) {
      const node = Array.from(element.querySelectorAll('*')).find((n) => {
        if (n.children && n.children.length > 8) return false;
        const text = this.cleanText(this.extractReadableText(n));
        return new RegExp(`^${label}[:：]?`).test(text);
      });

      if (node) {
        const text = this.cleanText(this.extractReadableText(node))
          .replace(new RegExp(`^${label}[:：]?\\s*`, 'i'), '')
          .replace(/\s*(答案解析|解析|得分|本题得分).*$/i, '')
          .trim();
        if (text) return text;
      }
    }

    // Try dedicated selectors
    const refSelectors = [
      '.mark_answer', '.rightAnswerContent', '.newAnswerBx',
      '.Zy_answer', '.Cy_answer', '.examPaper_answer',
      '.subject_answer', '.correctAnswer', '.right-answer',
      '.answer-correct', '.standard-answer', '.reference-answer'
    ];

    for (const selector of refSelectors) {
      const node = element.querySelector(selector);
      if (node) {
        const text = this.cleanText(this.extractReadableText(node))
          .replace(/^(正确答案|参考答案|标准答案|答案)[:：]?\s*/i, '')
          .replace(/\s*(解析|答案解析).*$/i, '')
          .trim();
        if (text && !/^我的答案/.test(text)) return text;
      }
    }

    // Regex fallback
    const fullText = this.cleanText(this.extractReadableText(element));
    const match = fullText.match(/(?:参考答案|正确答案|标准答案)[:：]?\s*(.+?)(?=\s*(?:解析|答案解析|我的答案|收起|$))/i);
    return match ? this.cleanText(match[1]) : null;
  }

  extractScore(element) {
    const fullText = this.cleanText(this.extractReadableText(element));
    const match = fullText.match(/(?:得分|本题得分)[:：]?\s*(\d+(?:\.\d+)?)\s*分/);
    if (match) return `${match[1]}分`;

    // Look for fraction patterns like "1.9/2分" or "1.9分"
    const scoreMatch = fullText.match(/[（(]得分[:：]?\s*(\d+(?:\.\d+)?)\s*分[）)]/);
    return scoreMatch ? `${scoreMatch[1]}分` : null;
  }

  extractFillInAnswer(element) {
    // Use correct answer as reference
    const correctAnswer = this.extractCorrectAnswer(element);
    if (correctAnswer) return correctAnswer;

    // Fall back to input/textarea values
    const inputs = Array.from(element.querySelectorAll('input[type="text"], input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea'));
    const inputValues = inputs.map((input) => this.cleanText(input.value || '')).filter(Boolean);
    if (inputValues.length > 0) return inputValues.join(' / ');

    return null;
  }

  extractAnalysis(element) {
    // 先尝试从答案块的 innerText 中用正则提取解析（不依赖 class）
    const answerBlock = this.platform === 'chaoxing' ? this.findChaoxingAnswerBlock(element) : null;
    if (answerBlock) {
      const blockText = this.cleanText(answerBlock.innerText || '');
      const match = blockText.match(/(?:解析|答案解析|试题解析)[:：]\s*(.+?)(?=\s*(?:知识点|我的答案|参考答案|正确答案|收起|AI讲解|$))/i);
      if (match && this.cleanText(match[1])) {
        return this.cleanText(match[1]);
      }
    }

    const analysisSelectors = [
      '.analysis',
      '.jiexitxt',
      '.jiexi',
      '.subject_analysis',
      '.answer-analysis',
      '.question-analysis',
      '.DocumentTitle-reference',
      '[class*="analysis"]',
      '[class*="jiexi"]'
    ];

    for (const selector of analysisSelectors) {
      const node = element.querySelector(selector);
      if (node) {
        const text = this.cleanText(this.extractReadableText(node));
        if (text && !/^(答案|正确答案|参考答案|标准答案)[:：]?\s*[A-H]/.test(text)) {
          const cleaned = text.replace(/^(解析|答案解析|试题解析)[:：]?\s*/i, '').trim();
          if (cleaned) return cleaned;
        }
      }
    }

    const fullText = this.cleanText(this.extractReadableText(element));
    const match = fullText.match(/(?:解析|答案解析|试题解析)[:：]\s*(.+?)(?=\s*(?:参考答案|正确答案|我的答案|收起|AI讲解|知识点|$))/i);
    return match ? this.cleanText(match[1]) : null;
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
    return /(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释|材料题|阅读题|题目|问题|习题|试卷|作业|测验|考试)/.test(text);
  }

  isOptionLikeText(text) {
    return /^([A-H])[\.\s、:：\)]\s*\S+/i.test(text);
  }

  isQuestionTypeOnlyText(text) {
    return /^\d+\.(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)(\s*\(\d+分\))?$/i.test(text);
  }

  isAnswerLikeText(text) {
    return /^(答案|正确答案|参考答案|标准答案|解析)[:：]?\s*/.test(text);
  }

  cleanTitleText(text) {
    const normalized = this.cleanText(this.decryptText(text));
    return normalized
      .replace(/^\d+[\.\s、:：)]\s*/, '')
      .replace(/^(单选题|多选题|判断题|填空题|简答题|主观题|问答题|论述题|名词解释)\s*/, '')
      .trim();
  }

  cleanAnswerText(text) {
    return this.cleanText(this.decryptText(text))
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractReadableText(node) {
    const blockTags = new Set([
      'DIV', 'P', 'LI', 'UL', 'OL', 'DL', 'DT', 'DD', 'SECTION', 'ARTICLE',
      'HEADER', 'FOOTER', 'TABLE', 'TR', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4',
      'H5', 'H6'
    ]);
    const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'CANVAS']);

    const read = (current) => {
      if (!current) {
        return '';
      }

      if (current.nodeType === 3) {
        return current.nodeValue || '';
      }

      if (current.nodeType !== 1) {
        return '';
      }

      const tagName = current.tagName;
      if (skipTags.has(tagName)) {
        return '';
      }

      if (tagName === 'BR') {
        return '\n';
      }

      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return current.value || current.getAttribute('value') || current.textContent || '';
      }

      if (tagName === 'SELECT') {
        const selected = current.options && current.selectedIndex >= 0
          ? current.options[current.selectedIndex]
          : null;
        return selected ? selected.textContent || selected.value || '' : '';
      }

      if (tagName === 'IMG') {
        return current.getAttribute('alt') || current.getAttribute('title') || '';
      }

      const childText = Array.from(current.childNodes || [])
        .map((child) => read(child))
        .filter((text) => text !== '')
        .join('');

      return blockTags.has(tagName) ? `\n${childText}\n` : childText;
    };

    return this.cleanText(read(node));
  }

  cleanText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]*\n+[ \t]*/g, ' ')
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

window.QuestionExportParser = QuestionExportParser;
