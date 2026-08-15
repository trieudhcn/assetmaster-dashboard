import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { registerVietnamesePdfFont } from "../client/src/lib/handoverPdf";

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
});
