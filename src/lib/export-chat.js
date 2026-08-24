import jsPDF from "jspdf";

export function exportAsMarkdown(messages, chatTitle = "Chat") {
  let markdown = `# ${chatTitle}\n\n`;

  messages
    .filter((m) => m.role === "assistant")
    .forEach((m) => {
      markdown += `${m.content}\n\n---\n\n`;
    });

  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chatTitle.replace(/[^a-z0-9]/gi, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function stripMermaidBlocks(content) {
  // Replace mermaid code blocks with a readable placeholder note
  return content.replace(
    /```mermaid[\s\S]*?```/g,
    "[Diagram — view in chat for the interactive version]"
  );
}

function cleanMarkdownForPdf(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1");
}

export function exportAsPDF(messages, chatTitle = "Chat") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(chatTitle, margin, y);
  y += 12;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");

  const assistantMessages = messages.filter((m) => m.role === "assistant");

  assistantMessages.forEach((m, idx) => {
    const raw = stripMermaidBlocks(m.content || "");
    const cleaned = cleanMarkdownForPdf(raw);
    const paragraphs = cleaned.split(/\n+/).filter((p) => p.trim());

    paragraphs.forEach((para) => {
      const lines = doc.splitTextToSize(para.trim(), maxWidth);
      lines.forEach((line) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 3;
    });

    if (idx < assistantMessages.length - 1) {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }
  });

  doc.save(`${chatTitle.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}