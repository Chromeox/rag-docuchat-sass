import jsPDF from "jspdf";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Formats a date for the export header
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generates a conversation title from the first user message
 */
function generateTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    // Truncate to first 50 chars
    const truncated = firstUserMessage.content.slice(0, 50);
    return truncated.length < firstUserMessage.content.length
      ? `${truncated}...`
      : truncated;
  }
  return "DocuChat Conversation";
}

/**
 * Exports conversation to Markdown format
 */
export function exportToMarkdown(messages: Message[]): void {
  const title = generateTitle(messages);
  const exportDate = formatDate(new Date());

  let markdown = `# ${title}\n`;
  markdown += `*Exported on ${exportDate}*\n\n`;
  markdown += `---\n\n`;

  // Skip the initial welcome message (first assistant message)
  const conversationMessages = messages.slice(1);

  conversationMessages.forEach((msg) => {
    const speaker = msg.role === "user" ? "**You**" : "**Assistant**";
    markdown += `### ${speaker}\n\n`;
    markdown += `${msg.content}\n\n`;
    markdown += `---\n\n`;
  });

  markdown += `\n*Exported from DocuChat*`;

  // Create and download the file
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `docuchat-${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports conversation to PDF format
 */
export function exportToPDF(messages: Message[]): void {
  const title = generateTitle(messages);
  const exportDate = formatDate(new Date());

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 8 + 5;

  // Export date
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Exported on ${exportDate}`, margin, yPosition);
  yPosition += 10;

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Skip the initial welcome message
  const conversationMessages = messages.slice(1);

  conversationMessages.forEach((msg) => {
    checkPageBreak(40);

    // Speaker header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (msg.role === "user") {
      doc.setTextColor(37, 99, 235); // blue-600
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
    }
    const speaker = msg.role === "user" ? "You" : "Assistant";
    doc.text(speaker, margin, yPosition);
    yPosition += 7;

    // Message content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // slate-700

    // Split text to fit page width
    const contentLines = doc.splitTextToSize(msg.content, contentWidth);

    contentLines.forEach((line: string) => {
      checkPageBreak(7);
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 8;

    // Divider
    checkPageBreak(5);
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  });

  // Footer
  checkPageBreak(15);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Exported from DocuChat", margin, yPosition);

  // Save the PDF
  doc.save(`docuchat-${Date.now()}.pdf`);
}
