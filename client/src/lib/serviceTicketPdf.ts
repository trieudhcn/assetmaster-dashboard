import { jsPDF } from "jspdf";
import { drawPdfCorporateFooter, handoverPdfFontUrl, registerVietnamesePdfFont, vietnamesePdfFontFamily } from "@/lib/handoverPdf";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";
import { parseVndAmount } from "@/lib/formatters";

export type ServiceTicketPdfCompany = {
  name?: string | null;
  address?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

type ServiceTicketPdfArgs = {
  ticket: any;
  asset?: any;
  assigneeName?: string;
  company?: ServiceTicketPdfCompany | null;
  autoPrint?: boolean;
};

const statusLabels: Record<string, string> = { open: "Mới tiếp nhận", pending: "Chờ xử lý", in_progress: "Đang xử lý", resolved: "Đã xử lý", closed: "Đã đóng", cancelled: "Đã hủy" };
const priorityLabels: Record<string, string> = { low: "Thấp", medium: "Trung bình", high: "Cao", critical: "Khẩn cấp" };
const issueTypeLabels: Record<string, string> = { maintenance: "Bảo trì định kỳ", incident: "Sự cố", damage: "Báo hỏng" };

async function loadPdfImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải logo công ty dùng cho phiếu.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pdfImageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG" as const;
  if (dataUrl.startsWith("data:image/webp")) return "WEBP" as const;
  return "PNG" as const;
}

export async function previewServiceTicketPdf({ ticket, asset, assigneeName, company: suppliedCompany, autoPrint = false }: ServiceTicketPdfArgs) {
  const company = suppliedCompany || {};
  const warranty = ticket.serviceChannel === "warranty";
  const channelLabel = warranty ? "Bảo hành" : "Sửa chữa";
  const documentLabel = `Phiếu ${channelLabel.toLowerCase()} tài sản`;
  const documentTitle = warranty ? "PHIẾU BẢO HÀNH TÀI SẢN" : "PHIẾU SỬA CHỮA TÀI SẢN";
  const fileName = `${ticket.ticketCode}-${warranty ? "phieu-bao-hanh" : "phieu-sua-chua"}.pdf`;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontResponse = await fetch(handoverPdfFontUrl);
  if (!fontResponse.ok) throw new Error("Không thể tải phông chữ tiếng Việt.");
  registerVietnamesePdfFont(doc, await fontResponse.arrayBuffer());
  const logoDataUrl = company.logoUrl ? await loadPdfImage(company.logoUrl).catch(() => undefined) : undefined;
  const left = 16;
  const right = 194;
  const width = right - left;
  let y = 18;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, pdfImageFormat(logoDataUrl), left, y - 7, 18, 18, undefined, "FAST"); } catch { /* Dùng tiêu đề chữ khi logo không tương thích. */ }
  }
  doc.setTextColor(16, 42, 67);
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(12);
  doc.text(company.name || "ĐƠN VỊ QUẢN LÝ TÀI SẢN", logoDataUrl ? left + 22 : left, y);
  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(96, 117, 138);
  const companyMeta = [company.address, company.taxCode ? `MST: ${company.taxCode}` : "", company.phone ? `ĐT: ${company.phone}` : ""].filter(Boolean).join(" · ");
  doc.text(doc.splitTextToSize(companyMeta || "Hệ thống Quản lý Tài sản Doanh nghiệp", logoDataUrl ? width - 22 : width), logoDataUrl ? left + 22 : left, y + 5);
  y += 27;
  doc.setDrawColor(15, 140, 140);
  doc.setLineWidth(0.7);
  doc.line(left, y, right, y);
  y += 11;
  doc.setTextColor(16, 42, 67);
  doc.setFont(vietnamesePdfFontFamily, "bold");
  doc.setFontSize(17);
  doc.text(documentTitle, 105, y, { align: "center" });
  y += 7;
  doc.setFontSize(9.5);
  doc.setTextColor(56, 85, 166);
  doc.text(ticket.ticketCode, 105, y, { align: "center" });
  y += 11;

  const estimated = parseVndAmount(String(ticket.estimatedCost || ""));
  const actual = parseVndAmount(String(ticket.actualCost || ""));
  const fields: Array<[string, string]> = [
    ["Kênh xử lý", channelLabel],
    ["Mã tài sản", asset?.assetCode || `Tài sản #${ticket.assetId}`],
    ["Tên tài sản", asset?.name || "Không còn trong danh mục"],
    ["Loại yêu cầu", issueTypeLabels[ticket.issueType] || ticket.issueType || "Chưa cập nhật"],
    ["Mức ưu tiên", priorityLabels[ticket.priority] || ticket.priority || "Chưa cập nhật"],
    ["Trạng thái", statusLabels[ticket.status] || ticket.status || "Chưa cập nhật"],
    ["Ngày lập phiếu", new Date(ticket.openedAt || ticket.createdAt).toLocaleDateString("vi-VN")],
    ["Hạn xử lý", ticket.dueAt ? new Date(ticket.dueAt).toLocaleDateString("vi-VN") : "Chưa thiết lập"],
    ["Người báo", ticket.reporterName || "Chưa cập nhật"],
    ["Người xử lý", assigneeName || (ticket.assigneeUserId ? `Nhân sự #${ticket.assigneeUserId}` : "Chưa phân công")],
    ["Chi phí dự kiến", estimated ? `${estimated.toLocaleString("vi-VN")} VNĐ` : "Chưa ghi nhận"],
    ["Chi phí thực tế", actual ? `${actual.toLocaleString("vi-VN")} VNĐ` : "Chưa ghi nhận"],
  ];
  doc.setFontSize(9);
  fields.forEach(([label, value], index) => {
    const rowY = y + index * 7;
    doc.setFillColor(index % 2 ? 248 : 240, index % 2 ? 251 : 248, index % 2 ? 252 : 247);
    doc.rect(left, rowY - 4.8, width, 7, "F");
    doc.setFont(vietnamesePdfFontFamily, "bold");
    doc.setTextColor(82, 112, 137);
    doc.text(label, left + 3, rowY);
    doc.setFont(vietnamesePdfFontFamily, "normal");
    doc.setTextColor(25, 59, 87);
    doc.text(doc.splitTextToSize(String(value), 110), left + 62, rowY);
  });
  y += fields.length * 7 + 5;
  const warrantyInfo = warranty ? [ticket.warrantyBrand && `Hãng: ${ticket.warrantyBrand}`, ticket.warrantyVendor && `Đơn vị bảo hành: ${ticket.warrantyVendor}`, ticket.warrantyRequestCode && `Mã yêu cầu: ${ticket.warrantyRequestCode}`].filter(Boolean).join(" · ") || "Chưa cập nhật" : null;
  const notes: Array<[string, string]> = [
    ["Nội dung yêu cầu", ticket.description || "Chưa cập nhật"],
    ...(warrantyInfo ? [["Thông tin bảo hành", warrantyInfo] as [string, string]] : []),
    ["Kết quả xử lý", ticket.resolution || "Chưa ghi nhận kết quả xử lý"],
    ["Chứng từ", ticket.attachmentName || "Chưa đính kèm"],
  ];
  notes.forEach(([label, value]) => {
    const lines = doc.splitTextToSize(value, width - 8);
    const height = Math.max(12, lines.length * 4.5 + 8);
    if (y + height > 244) { doc.addPage(); y = 24; }
    doc.setDrawColor(205, 229, 229);
    doc.setFillColor(250, 253, 253);
    doc.roundedRect(left, y, width, height, 2, 2, "FD");
    doc.setFont(vietnamesePdfFontFamily, "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 140, 140);
    doc.text(label, left + 4, y + 5);
    doc.setFont(vietnamesePdfFontFamily, "normal");
    doc.setTextColor(25, 59, 87);
    doc.text(lines, left + 4, y + 10);
    y += height + 4;
  });
  if (y > 242) { doc.addPage(); y = 26; }
  y += 6;
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, right, y);
  y += 9;
  doc.setFont(vietnamesePdfFontFamily, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(96, 117, 138);
  doc.text("Người lập phiếu", left + 22, y, { align: "center" });
  doc.text("Người xử lý", 105, y, { align: "center" });
  doc.text("Xác nhận quản lý", right - 22, y, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`Tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 286);
  applyPdfLogoWatermark(doc, await createPdfLogoWatermark(company.logoUrl).catch(() => null));
  drawPdfCorporateFooter(doc, company, documentLabel);
  openPdfPreview(doc, fileName, `${warranty ? "Phiếu Bảo hành" : "Phiếu Sửa chữa"} ${ticket.ticketCode}`, { autoPrint });
}
