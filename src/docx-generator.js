import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, Packer } from 'docx';

export default class DocxGenerator {
  generate(data) {
    const { title, questions } = data;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // 题目列表
          ...this.generateQuestions(questions)
        ]
      }]
    });

    return doc;
  }

  generateQuestions(questions) {
    const paragraphs = [];

    questions.forEach((q, index) => {
      // 题目序号和题干
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${q.number}. `,
              bold: true
            }),
            new TextRun({
              text: `[${q.type}] ${q.title}`
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      // 选项
      q.options.forEach(opt => {
        paragraphs.push(
          new Paragraph({
            text: `   ${opt.label}. ${opt.text}`,
            spacing: { after: 50 },
            indent: { left: 400 }
          })
        );
      });

      // 答案（如果有）
      if (q.answer) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '   答案: ',
                italics: true
              }),
              new TextRun({
                text: q.answer,
                italics: true,
                color: '666666'
              })
            ],
            spacing: { after: 100 },
            indent: { left: 400 }
          })
        );
      }

      // 题目间分隔
      if (index < questions.length - 1) {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 }
          })
        );
      }
    });

    return paragraphs;
  }

  async toBlob(doc) {
    return await Packer.toBlob(doc);
  }
}
