import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { drawPdfCorporateFooter, registerVietnamesePdfFont, vietnamesePdfFontFamily } from "../client/src/lib/handoverPdf";

describe("Vietnamese handover PDF", () => {
  it("embeds a complete font so Vietnamese text survives PDF extraction", () => {
    const fontBytes = readFileSync("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    const fontBuffer = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerVietnamesePdfFont(doc, fontBuffer);
    doc.text("BIÊN BẢN BÀN GIAO TÀI SẢN — Đặng Hoàng Long", 18, 24);

    const directory = mkdtempSync(join(tmpdir(), "assetmaster-pdf-"));
    const pdfPath = join(directory, "handover.pdf");
    try {
      writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
      expect(extracted).toContain("BIÊN BẢN BÀN GIAO TÀI SẢN");
      expect(extracted).toContain("Đặng Hoàng Long");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps Vietnamese diacritics when repair PDFs use the registered bold face", () => {
    const fontBytes = readFileSync("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    const fontBuffer = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerVietnamesePdfFont(doc, fontBuffer);
    doc.setFont(vietnamesePdfFontFamily, "bold");
    doc.text("PHIẾU SỬA CHỮA TÀI SẢN — Bảo trì định kỳ", 18, 24);

    const directory = mkdtempSync(join(tmpdir(), "assetmaster-repair-pdf-"));
    const pdfPath = join(directory, "repair.pdf");
    try {
      writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
      expect(extracted).toContain("PHIẾU SỬA CHỮA TÀI SẢN");
      expect(extracted).toContain("Bảo trì định kỳ");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("prints a Unicode corporate footer with document identity and page numbering", () => {
    const fontBytes = readFileSync("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    const fontBuffer = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerVietnamesePdfFont(doc, fontBuffer);
    doc.text("Nội dung biên bản kiểm kê", 18, 24);
    drawPdfCorporateFooter(doc, { name: "Công ty Cổ phần Thái Thịnh" }, "Biên bản kiểm kê tài sản");

    const directory = mkdtempSync(join(tmpdir(), "assetmaster-pdf-footer-"));
    const pdfPath = join(directory, "footer.pdf");
    try {
      writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
      expect(extracted).toContain("Công ty Cổ phần Thái Thịnh");
      expect(extracted).toContain("Biên bản kiểm kê tài sản");
      expect(extracted).toContain("Trang 1/1");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
