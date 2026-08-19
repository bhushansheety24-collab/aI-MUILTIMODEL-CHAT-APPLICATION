import jsPDF from "jspdf";

export function exportAsMarkdown(messages, chatTitle = "Chat") {
  let markdown = `# ${chatTitle}\n\n`;

  messages.forEach((m) => {
    const speaker = m.role === "user" ? "**You**" : "**Assistant**";
    markdown += `${speaker}:\n\n${m.content}\n\n---\n\n`;
  });

  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chatTitle.replace(/[^a-z0-9]/gi, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsPDF(messages, chatTitle = "Chat") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(chatTitle, margin, y);
  y += 10;

  doc.setFontSize(11);

  messages.forEach((m) => {
    const speaker = m.role === "user" ? "You" : "Assistant";

    doc.setFont(undefined, "bold");
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${speaker}:`, margin, y);
    y += 6;

    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(m.content || "", maxWidth);

    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    y += 6;
  });

  doc.save(`${chatTitle.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}