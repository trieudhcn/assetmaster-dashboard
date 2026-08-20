import { Download, Printer } from "lucide-react";
import { formatCompactVnd, type CurrencyDisplayMode } from "@/lib/formatters";

const statusLabel = (status: string) => ({ open: "Mới tạo", pending: "Chờ xử lý", in_progress: "Đang xử lý", resolved: "Đã xử lý", closed: "Đã đóng", cancelled: "Đã hủy" }[status] || status || "—");
const priorityLabel = (priority: string) => ({ low: "Thấp", medium: "Trung bình", high: "Cao", critical: "Khẩn cấp" }[priority] || priority || "—");

type QuickServiceTicketPreviewProps = {
  ticket: any;
  asset: any;
  assigneeName?: string;
  currencyMode: CurrencyDisplayMode;
  pdfPreparing: "preview" | "print" | null;
  onPrint: () => void;
  onExportPdf: () => void;
  onClose: () => void;
};

export function QuickServiceTicketPreview({ ticket, asset, assigneeName, currencyMode, pdfPreparing, onPrint, onExportPdf, onClose }: QuickServiceTicketPreviewProps) {
  const warranty = ticket.serviceChannel === "warranty";
  const money = (value: number) => formatCompactVnd(value, currencyMode);
  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose(); };

  return <div className="fixed inset-0 z-[180] flex items-end justify-center bg-[#102A43]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={closeOnBackdrop}>
    <section className="grid h-[100dvh] max-h-[100dvh] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-none bg-white shadow-[0_24px_60px_rgba(16,42,67,0.28)] sm:h-auto sm:max-h-[92vh] sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={`Xem nhanh phiếu ${ticket.ticketCode}`}>
      <div className="flex items-start justify-between gap-4 border-b border-[#E7EEF3] px-4 py-3 sm:px-5 sm:py-4">
        <div>
          <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${warranty ? "bg-[#EAF3FB] text-[#2666A8]" : "bg-[#FFF4DE] text-[#A86B00]"}`}>{warranty ? "Bảo hành" : "Sửa chữa"}</div>
          <div className="mt-2 font-mono text-xs font-extrabold text-[#0F8C8C]">{ticket.ticketCode}</div>
          <h2 className="mt-1 text-base font-extrabold text-[#193B57] sm:text-lg">Xem nhanh phiếu Bảo hành/Sửa chữa</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-xl text-[#60758A] hover:bg-[#F0F6FA] hover:text-[#2666A8]" aria-label="Đóng xem nhanh">×</button>
      </div>

      <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-[#E0E8F0] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Tài sản</div><div className="mt-1 font-bold text-[#193B57]">{asset?.name || `Tài sản #${ticket.assetId}`}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{asset?.assetCode || "Chưa có mã"}</div></div>
          <div className="rounded-lg border border-[#E0E8F0] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Trạng thái · ưu tiên</div><div className="mt-1 font-bold text-[#193B57]">{statusLabel(ticket.status)} · {priorityLabel(ticket.priority)}</div><div className="mt-1 text-[10px] text-[#71869A]">Người báo: {ticket.reporterName || "Chưa ghi nhận"}</div></div>
          <div className="rounded-lg border border-[#E0E8F0] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Người xử lý</div><div className="mt-1 font-bold text-[#193B57]">{assigneeName || "Chưa phân công"}</div><div className="mt-1 text-[10px] text-[#71869A]">Mở: {new Date(ticket.openedAt).toLocaleDateString("vi-VN")}</div></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#F0D9B8] bg-[#FFFDF7] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#A86B00]">Chi phí dự kiến</div><div className="mt-1 text-xl font-extrabold text-[#8F5A00]">{money(Number(ticket.estimatedCost || 0))}</div></div>
          <div className="rounded-xl border border-[#D9E8F3] bg-[#F8FCFF] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#2666A8]">Chi phí thực tế</div><div className="mt-1 text-xl font-extrabold text-[#193B57]">{money(Number(ticket.actualCost || 0))}</div></div>
        </div>
        <div className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFE] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Nội dung yêu cầu</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#193B57]">{ticket.description || "Chưa có mô tả."}</p></div>
        {ticket.resolution && <div className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#087A6A]">Kết quả xử lý</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#193B57]">{ticket.resolution}</p></div>}
        {warranty && <div className="grid gap-3 rounded-xl border border-[#D9E8F3] bg-[#F8FCFF] p-4 sm:grid-cols-3"><div><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Hãng</div><div className="mt-1 text-sm font-bold text-[#193B57]">{ticket.warrantyBrand || "Chưa cập nhật"}</div></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Đơn vị bảo hành</div><div className="mt-1 text-sm font-bold text-[#193B57]">{ticket.warrantyVendor || "Chưa cập nhật"}</div></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Mã yêu cầu</div><div className="mt-1 break-words font-mono text-sm font-bold text-[#193B57]">{ticket.warrantyRequestCode || "Chưa cập nhật"}</div></div></div>}
        {ticket.attachmentUrl && <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-[#C9DAE8] bg-white px-3 py-2 text-xs font-bold text-[#2666A8] hover:bg-[#EAF3FB]">Mở tệp đính kèm: {ticket.attachmentName || "Chứng từ"}</a>}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[#E7EEF3] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng xem nhanh</button>
        <button type="button" disabled={pdfPreparing !== null} onClick={onPrint} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#C7DDF8] bg-[#EFF7FF] px-4 py-2 text-xs font-bold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-wait disabled:opacity-60"><Printer size={15} />{pdfPreparing === "print" ? "Đang chuẩn bị in..." : "In"}</button>
        <button type="button" disabled={pdfPreparing !== null} onClick={onExportPdf} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-wait disabled:opacity-60"><Download size={15} />{pdfPreparing === "preview" ? "Đang tạo PDF..." : "Xuất PDF"}</button>
      </div>
    </section>
  </div>;
}
