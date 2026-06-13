import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer, BorderStyle } from 'docx';

const FILL_IN_TYPES = new Set(['填空题', '简答题', '名词解释', '论述题', '主观题', '问答题']);

export default class DocxGenerator {
  generate(data) {
    const { title, questions } = data;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          ...this.generateQuestions(questions)
        ]
      }]
    });

    return doc;
  }

  generateQuestions(questions) {
    const paragraphs = [];

    questions.forEach((q, index) => {
      const isFillIn = FILL_IN_TYPES.has(q.type);

      if (isFillIn) {
        paragraphs.push(...this.generateFillInQuestion(q));
      } else {
        paragraphs.push(...this.generateChoiceQuestion(q));
      }

      // 题目间分隔
      if (index < questions.length - 1) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    });

    return paragraphs;
  }

  // ── 选择/判断题（紧凑格式）──────────────────────────────────────
  generateChoiceQuestion(q) {
    const paragraphs = [];

    // 题干
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${q.number}. `, bold: true }),
          new TextRun({ text: `[${q.type}]  ` }),
          new TextRun({ text: q.title })
        ],
        spacing: { before: 200, after: 100 }
      })
    );

    // 选项
    (q.options || []).forEach(opt => {
      paragraphs.push(
        new Paragraph({
          text: `   ${opt.label}. ${opt.text}`,
          spacing: { after: 50 },
          indent: { left: 400 }
        })
      );
    });

    // 我的答案（如果有且与 answer 不同）
    const myAns = q.myAnswer;
    const stdAns = q.answer;
    if (myAns && stdAns && myAns !== stdAns) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: '   我的答案: ', italics: true, color: '444444' }),
            new TextRun({ text: myAns, italics: true, color: '444444' })
          ],
          spacing: { after: 30 },
          indent: { left: 400 }
        })
      );
    }

    // 答案
    if (stdAns) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: '   答案: ', italics: true }),
            new TextRun({ text: stdAns, italics: true, color: '0070C0' })
          ],
          spacing: { after: 50 },
          indent: { left: 400 }
        })
      );
    }

    // 解析
    if (q.analysis) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: '   解析: ', italics: true }),
            new TextRun({ text: q.analysis, italics: true, color: '888888' })
          ],
          spacing: { after: 100 },
          indent: { left: 400 }
        })
      );
    }

    return paragraphs;
  }

  // ── 填空/主观题（分章节富文本格式）──────────────────────────────
  generateFillInQuestion(q) {
    const paragraphs = [];

    // ── 标题行：【第N题】（题型）
    const scoreNote = q.score ? `，得分：${q.score}` : '';
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `【第${q.number}题】（${q.type || '主观题'}${scoreNote}）`,
            bold: true,
            size: 24
          })
        ],
        spacing: { before: 300, after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
        }
      })
    );

    // ── 【题目内容】
    paragraphs.push(this._sectionHeader('【题目内容】'));
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: q.title })],
        spacing: { after: 160 },
        indent: { left: 200 }
      })
    );

    if (Array.isArray(q.optionGroups) && q.optionGroups.length > 0) {
      paragraphs.push(this._sectionHeader('【选项】'));
      q.optionGroups.forEach(group => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${group.number || ''} 选项`,
                bold: true,
                color: '333333'
              })
            ],
            spacing: { before: 80, after: 50 },
            indent: { left: 200 }
          })
        );

        (group.options || []).forEach(opt => {
          paragraphs.push(
            new Paragraph({
              text: `${opt.label}. ${opt.text}`,
              spacing: { after: 40 },
              indent: { left: 500 }
            })
          );
        });
      });
    }

    // ── 【我的答案】（如果有）
    if (q.myAnswer) {
      const scoreTag = q.score ? `（得分：${q.score}）` : '';
      paragraphs.push(this._sectionHeader(`【我的答案】${scoreTag}`));
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: q.myAnswer, color: '333333' })],
          spacing: { after: 160 },
          indent: { left: 200 }
        })
      );
    }

    // ── 【正确答案】/ 【参考答案】
    const refAnswer = q.correctAnswer || q.answer;
    if (refAnswer) {
      paragraphs.push(this._sectionHeader('【正确答案】'));
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: refAnswer, color: '0070C0' })],
          spacing: { after: 160 },
          indent: { left: 200 }
        })
      );
    }

    // ── 【答案解析】
    if (q.analysis) {
      paragraphs.push(this._sectionHeader('【答案解析】'));
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: q.analysis, color: '555555' })],
          spacing: { after: 200 },
          indent: { left: 200 }
        })
      );
    }

    return paragraphs;
  }

  _sectionHeader(text) {
    return new Paragraph({
      children: [new TextRun({ text, bold: true, color: '2E74B5' })],
      spacing: { before: 160, after: 80 }
    });
  }

  async toBlob(doc) {
    return await Packer.toBlob(doc);
  }
}
