import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export async function generateDocx(title, content) {
  const paragraphs = content
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((para) => {
      if (para.startsWith("# ")) {
        return new Paragraph({
          text: para.replace(/^#\s*/, ""),
          heading: HeadingLevel.HEADING_1,
        });
      }
      if (para.startsWith("## ")) {
        return new Paragraph({
          text: para.replace(/^##\s*/, ""),
          heading: HeadingLevel.HEADING_2,
        });
      }
      return new Paragraph({
        children: [new TextRun(para.trim())],
        spacing: { after: 200 },
      });
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 300 },
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}