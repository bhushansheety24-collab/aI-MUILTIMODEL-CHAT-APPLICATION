import PDFParser from "pdf2json";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function extractPdfText(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(errData.parserError));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const text = pdfData.Pages.map((page) =>
          (page.Texts || [])
            .map((t) => {
              if (!t.R) return "";
              return t.R.map((r) => safeDecode(r.T || "")).join("");
            })
            .join(" ")
        ).join("\n");
        resolve(text);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

function extractExcelText(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let allText = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csvText = XLSX.utils.sheet_to_csv(sheet);
    allText += `\n--- Sheet: ${sheetName} ---\n${csvText}\n`;
  });

  return allText;
}

export async function extractText(buffer, fileType) {
  if (fileType === "application/pdf") {
    return await extractPdfText(buffer);
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileType === "application/vnd.ms-excel"
  ) {
    return extractExcelText(buffer);
  }

  if (fileType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  const cleanText = text.replace(/\s+/g, " ").trim();

  let start = 0;
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks.filter((c) => c.trim().length > 20);
}