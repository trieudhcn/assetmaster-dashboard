import * as XLSX from "xlsx";
import { openExportPreview } from "@/components/ExportPreviewHost";

export type ExportCompanyInfo = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteTitle?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
};

type BrandedWorkbookOptions = {
  company?: ExportCompanyInfo | null;
  documentTitle: string;
  fileName: string;
  description?: string;
  prepareWorkbook?: (workbook: any) => void | Promise<void>;
};

const infoSheetName = "Thông tin doanh nghiệp";
const toHexColor = (color?: string | null) => (color || "#0F8C8C").replace("#", "").toUpperCase();

function getStoredCompanyInfo(): ExportCompanyInfo {
  try {
    return JSON.parse(localStorage.getItem("assetmaster-company-info") || "{}") as ExportCompanyInfo;
  } catch {
    return {};
  }
}

async function loadLogoBase64(logoUrl: string) {
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error("Không thể tải logo doanh nghiệp.");
  let blob = await response.blob();
  let extension: "png" | "jpeg" = blob.type === "image/jpeg" ? "jpeg" : "png";
  if (blob.type === "image/webp") {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể chuyển đổi logo WebP.");
    context.drawImage(bitmap, 0, 0);
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể chuyển đổi logo WebP.")), "image/png"));
    extension = "png";
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return { base64: btoa(binary), extension };
}

function copySourceSheets(sourceWorkbook: XLSX.WorkBook, targetWorkbook: any, brandColor: string) {
  sourceWorkbook.SheetNames.filter((name) => name !== infoSheetName).forEach((sheetName) => {
    const sourceSheet = sourceWorkbook.Sheets[sheetName];
    const targetSheet = targetWorkbook.addWorksheet(sheetName);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sourceSheet, { header: 1, defval: "", raw: true });
    rows.forEach((row) => targetSheet.addRow(row));
    if (!rows.length) targetSheet.addRow([]);
    const sourceColumns = (sourceSheet["!cols"] || []) as Array<{ wch?: number; wpx?: number }>;
    sourceColumns.forEach((column, index) => { targetSheet.getColumn(index + 1).width = column.wch || (column.wpx ? Math.max(8, column.wpx / 7) : 16); });
    const freeze = sourceSheet["!freeze"] as { xSplit?: number; ySplit?: number } | undefined;
    if (freeze?.xSplit || freeze?.ySplit) targetSheet.views = [{ state: "frozen", xSplit: freeze.xSplit || 0, ySplit: freeze.ySplit || 0 }];
    targetSheet.getRow(1).font = { bold: true, color: { argb: "FF193B57" } };
    targetSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandColor}1A` } };
    targetSheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  });
}

async function addCompanyInfoSheet(workbook: any, options: BrandedWorkbookOptions, company: ExportCompanyInfo, brandColor: string) {
  const infoSheet = workbook.addWorksheet(infoSheetName);
  const rows = [
    [options.documentTitle],
    [company.name || "Thông tin doanh nghiệp chưa được cập nhật"],
    [company.websiteTitle || "AssetMaster – Hệ thống Quản lý Tài sản"],
    ["Địa chỉ", company.address || "Chưa cập nhật"],
    ["Mã số thuế", company.taxCode || "Chưa cập nhật"],
    ["Điện thoại", company.phone || "Chưa cập nhật"],
    ["Email", company.email || "Chưa cập nhật"],
    ["Thời điểm xuất", new Date().toLocaleString("vi-VN")],
    ...(options.description ? [["Phạm vi / ghi chú", options.description]] : []),
  ];
  rows.forEach((row) => infoSheet.addRow(row));
  infoSheet.mergeCells("A1:B1");
  infoSheet.mergeCells("A2:B2");
  infoSheet.mergeCells("A3:B3");
  infoSheet.getColumn(1).width = 24;
  infoSheet.getColumn(2).width = 82;
  infoSheet.getRow(1).height = 30;
  infoSheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  infoSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandColor}` } };
  infoSheet.getCell("A1").alignment = { vertical: "middle" };
  infoSheet.getCell("A2").font = { bold: true, size: 13, color: { argb: "FF102A43" } };
  infoSheet.getCell("A3").font = { italic: true, size: 10, color: { argb: `FF${brandColor}` } };
  for (let row = 4; row <= infoSheet.rowCount; row += 1) {
    const label = infoSheet.getCell(row, 1);
    label.font = { bold: true, color: { argb: "FF193B57" } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7FB" } };
    label.alignment = { vertical: "top", wrapText: true };
    infoSheet.getCell(row, 2).alignment = { vertical: "top", wrapText: true };
  }
  if (company.logoUrl) {
    try {
      const logo = await loadLogoBase64(company.logoUrl);
      const imageId = workbook.addImage({ base64: logo.base64, extension: logo.extension });
      infoSheet.addImage(imageId, { tl: { col: 2.05, row: 0.2 }, ext: { width: 116, height: 58 } });
      infoSheet.getRow(1).height = 46;
      infoSheet.getRow(2).height = 18;
    } catch {
      infoSheet.getCell("B1").value = "Logo doanh nghiệp";
    }
  } else {
    infoSheet.getCell("B1").value = "Logo doanh nghiệp chưa được cập nhật";
  }
}

export async function writeBrandedWorkbook(workbook: XLSX.WorkBook, options: BrandedWorkbookOptions) {
  const { Workbook } = await import("exceljs");
  const brandedWorkbook = new Workbook();
  const company = options.company || getStoredCompanyInfo();
  const brandColor = toHexColor(company.brandColor);
  await addCompanyInfoSheet(brandedWorkbook, options, company, brandColor);
  copySourceSheets(workbook, brandedWorkbook, brandColor);
  if (options.prepareWorkbook) await options.prepareWorkbook(brandedWorkbook);
  const bytes = await brandedWorkbook.xlsx.writeBuffer();
  openExportPreview({
    blob: new Blob([bytes as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName: options.fileName,
    title: options.documentTitle,
    kind: "excel",
  });
}
