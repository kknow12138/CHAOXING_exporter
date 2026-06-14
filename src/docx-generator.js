import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer, BorderStyle, ImageRun } from 'docx';

const FILL_IN_TYPES = new Set(['填空题', '简答题', '名词解释', '论述题', '主观题', '问答题']);
const MAX_IMAGE_WIDTH = 520;
const MAX_IMAGE_HEIGHT = 360;

export default class DocxGenerator {
  async generate(data) {
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
          ...await this.generateQuestions(questions)
        ]
      }]
    });

    return doc;
  }

  async generateQuestions(questions) {
    const paragraphs = [];

    for (let index = 0; index < questions.length; index += 1) {
      const q = questions[index];
      const isFillIn = FILL_IN_TYPES.has(q.type);

      if (isFillIn) {
        paragraphs.push(...await this.generateFillInQuestion(q));
      } else {
        paragraphs.push(...await this.generateChoiceQuestion(q));
      }

      // 题目间分隔
      if (index < questions.length - 1) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    }

    return paragraphs;
  }

  // ── 选择/判断题（紧凑格式）──────────────────────────────────────
  async generateChoiceQuestion(q) {
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
    paragraphs.push(...await this.generateImageParagraphs(q.titleImages, { indent: { left: 400 } }));

    // 选项
    for (const opt of q.options || []) {
      paragraphs.push(
        new Paragraph({
          text: `   ${opt.label}. ${opt.text}`,
          spacing: { after: 50 },
          indent: { left: 400 }
        })
      );
      paragraphs.push(...await this.generateImageParagraphs(opt.images, { indent: { left: 800 } }));
    }

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
    paragraphs.push(...await this.generateImageParagraphs(q.answerImages, { indent: { left: 400 } }));

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
  async generateFillInQuestion(q) {
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
    paragraphs.push(...await this.generateImageParagraphs(q.titleImages, { indent: { left: 200 } }));

    if (Array.isArray(q.optionGroups) && q.optionGroups.length > 0) {
      paragraphs.push(this._sectionHeader('【选项】'));
      for (const group of q.optionGroups) {
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

        for (const opt of group.options || []) {
          paragraphs.push(
            new Paragraph({
              text: `${opt.label}. ${opt.text}`,
              spacing: { after: 40 },
              indent: { left: 500 }
            })
          );
          paragraphs.push(...await this.generateImageParagraphs(opt.images, { indent: { left: 700 } }));
        }
      }
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
    paragraphs.push(...await this.generateImageParagraphs(q.answerImages, { indent: { left: 200 } }));

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

  async generateImageParagraphs(images, paragraphOptions = {}) {
    const paragraphs = [];
    const imageList = Array.isArray(images) ? images : [];

    for (const image of imageList) {
      const run = await this.createImageRun(image);
      if (run) {
        paragraphs.push(
          new Paragraph({
            children: [run],
            spacing: { before: 80, after: 80 },
            ...paragraphOptions
          })
        );
      } else if (image && image.src) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: `   [图片加载失败] ${image.src}`, color: '888888', italics: true })
            ],
            spacing: { after: 50 },
            ...paragraphOptions
          })
        );
      }
    }

    return paragraphs;
  }

  async createImageRun(image) {
    if (!image || !image.src) {
      return null;
    }

    try {
      const data = await this.fetchImageData(image.src);
      if (!data) {
        return null;
      }

      const size = this.fitImageSize(image.width, image.height);
      return new ImageRun({
        data,
        transformation: size,
        altText: {
          name: image.alt || '题目图片',
          title: image.alt || '题目图片',
          description: image.src
        }
      });
    } catch (error) {
      console.warn('图片加载失败:', image.src, error);
      return null;
    }
  }

  async fetchImageData(src) {
    if (src.startsWith('data:image/')) {
      return src;
    }

    const response = await fetch(src, { credentials: 'include' });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }

    return await response.arrayBuffer();
  }

  fitImageSize(width, height) {
    const rawWidth = Number(width) || MAX_IMAGE_WIDTH;
    const rawHeight = Number(height) || Math.round(rawWidth * 0.6);
    const scale = Math.min(1, MAX_IMAGE_WIDTH / rawWidth, MAX_IMAGE_HEIGHT / rawHeight);

    return {
      width: Math.max(40, Math.round(rawWidth * scale)),
      height: Math.max(30, Math.round(rawHeight * scale))
    };
  }
}
