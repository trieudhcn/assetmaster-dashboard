import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { drawPdfCorporateFooter, drawPdfCorporateHeader, registerVietnamesePdfFont, vietnamesePdfFontFamily } from "../client/src/lib/handoverPdf";

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

  it("draws one compact corporate header with contact details above the divider", () => {
    const fontBytes = readFileSync("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    const fontBuffer = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerVietnamesePdfFont(doc, fontBuffer);
    const header = drawPdfCorporateHeader(doc, {
      name: "Công Ty TNHH Vi Tính Thái Thịnh",
      address: "83 Hiệp Bình, Phường Hiệp Bình, TPHCM",
      taxCode: "0101010101",
      phone: "0987894432",
      email: "contact@vitinhthaithinh.site",
      websiteUrl: "vitinhthaithinh.site",
    });
    expect(header.contentY).toBeGreaterThan(header.dividerY);
    const headerSource = readFileSync("client/src/lib/handoverPdf.ts", "utf8");
    expect(headerSource).toContain("const primaryContactLine");
    expect(headerSource).toContain("const emailLine = company.email");
    expect(headerSource).toContain("const showWebsite = options.showWebsite ?? !company.hideWebsiteOnInternalPdf");
    expect(headerSource).toContain("doc.text(emailLines, textX, lineY)");
    expect(headerSource).toContain("doc.text(websiteLines, textX, lineY)");
    const directory = mkdtempSync(join(tmpdir(), "assetmaster-pdf-header-"));
    const pdfPath = join(directory, "header.pdf");
    try {
      writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
      expect(extracted).toContain("Công Ty TNHH Vi Tính Thái Thịnh");
      expect(extracted).toContain("MST: 0101010101");
      expect(extracted).toContain("Website: vitinhthaithinh.site");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("hides the Website line when internal-document preference is enabled", () => {
    const fontBytes = readFileSync("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
    const fontBuffer = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerVietnamesePdfFont(doc, fontBuffer);
    drawPdfCorporateHeader(doc, {
      name: "Công ty AssetMaster",
      email: "contact@assetmaster.vn",
      websiteUrl: "https://assetmaster.vn",
      hideWebsiteOnInternalPdf: true,
    });
    const directory = mkdtempSync(join(tmpdir(), "assetmaster-pdf-internal-header-"));
    const pdfPath = join(directory, "internal-header.pdf");
    try {
      writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));
      const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
      expect(extracted).toContain("Email: contact@assetmaster.vn");
      expect(extracted).not.toContain("Website: https://assetmaster.vn");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uses the shared corporate header in core PDF records", () => {
    const consumers = [
      "client/src/lib/supplyIssueSlipPdf.ts",
      "client/src/lib/handoverAssetPdf.ts",
      "client/src/lib/serviceTicketPdf.ts",
      "client/src/lib/retirementPdf.ts",
      "client/src/pages/OperationsModules.tsx",
      "client/src/pages/Home.tsx",
    ];
    consumers.forEach((file) => expect(readFileSync(file, "utf8")).toContain("drawPdfCorporateHeader"));
  });

  it("keeps the handover number below the title and both signers on centered axes", () => {
    const source = readFileSync("client/src/pages/Home.tsx", "utf8");
    expect(source).toContain("doc.text(`Số phiếu: ${item.referenceCode}`, 105, y, { align: \"center\" })");
    expect(source).toContain("doc.setFontSize(10);");
    expect(source).toContain("const handoverSignatureCenter = 61.5");
    expect(source).toContain("const recipientSignatureCenter = 148.5");
    expect(source).toContain('doc.text("Người giao", handoverSignatureCenter, y, { align: "center" })');
    expect(source).toContain('doc.text("Người nhận", recipientSignatureCenter, y, { align: "center" })');
    expect(source).toContain("recipientSignatureCenter - recipientSignatureWidth / 2");
    expect(source).toContain("doc.text(item.handoverBy, handoverSignatureCenter, y + 39, { align: \"center\" })");
    expect(source).toContain('doc.text(item.recipient, recipientSignatureCenter, y + 39, { align: "center" })');
  });

  it("keeps both return-confirmation signers centered in their respective columns", () => {
    const source = readFileSync("client/src/pages/Home.tsx", "utf8");
    expect(source).toContain("const recoveryReturnerCenter = 61.5");
    expect(source).toContain("const recoveryReceiverCenter = 148.5");
    expect(source).toContain('doc.text(item.recipient, recoveryReturnerCenter, y + 33, { align: "center" })');
    expect(source).toContain('doc.text(item.handoverBy || "Quản trị viên", recoveryReceiverCenter, y + 33, { align: "center" })');
  });
});
