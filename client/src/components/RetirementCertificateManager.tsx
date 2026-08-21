import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Archive, CheckCircle2, Download, FileCheck2, FileUp, LoaderCircle, Printer, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/formatters";
import { openRetirementPdf } from "@/lib/retirementPdf";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";

const DEFAULT_RETIREMENT_REASON = "Thanh lý theo thời gian quy định";
const CERTIFICATE_PAGE_SIZE = 5;
type StatusFilter = "all" | "draft" | "signed" | "closed";
type DraftItem = { reason: string; salvageValue: string; note: string };
type CertificateItem = { id: number; assetId: number; retirementReason: string; salvageValue: string | null; note: string | null; assetCode: string; assetName: string; serialNumber: string | null; purchaseDate: Date | string | null; purchaseValue: string | null };
type Certificate = { id: number; referenceCode: string; status: "draft" | "awaiting_signed_copy" | "closed"; retiredAt: Date | string | number; signedDocumentUrl: string | null; signedDocumentName: string | null; items: CertificateItem[] };
type Company = { name?: string | null; address?: string | null; taxCode?: string | null; phone?: string | null; logoUrl?: string | null };

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").toLowerCase();
const numeric = (value: string | number | null | undefined) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const repairStatusLabel = (status: string) => ({ open: "Mới tạo", in_progress: "Đang xử lý", resolved: "Đã xử lý", closed: "Đã đóng" }[status] || status || "—");

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc tệp."));
    reader.readAsDataURL(file);
  });
}

function CertificateTotals({ items }: { items: CertificateItem[] }) {
  const purchase = items.reduce((total, item) => total + numeric(item.purchaseValue), 0);
  const salvageEntries = items.filter((item) => item.salvageValue !== null && String(item.salvageValue).trim() !== "");
  const salvage = salvageEntries.reduce((total, item) => total + numeric(item.salvageValue), 0);
  return <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2"><div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#8AA0B6]">Tổng nguyên giá</div><div className="mt-1 text-xs font-extrabold text-[#193B57]">{formatVnd(purchase)} VNĐ</div></div><div className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2"><div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#8AA0B6]">Giá trị thu hồi</div><div className={`mt-1 text-xs font-extrabold ${salvageEntries.length ? "text-[#087A6A]" : "text-[#8AA0B6]"}`}>{salvageEntries.length ? `${formatVnd(salvage)} VNĐ` : "Chưa cập nhật"}</div></div></div>;
}

function CertificateCard({ certificate, company, uploading, closing, cancelling, onUpload, onPrint, onClose, onCancel }: { certificate: Certificate; company: Company; uploading: boolean; closing: boolean; cancelling: boolean; onUpload: (file?: File) => void; onPrint: () => void; onClose: () => void; onCancel: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isClosed = certificate.status === "closed";
  const canClose = certificate.status === "awaiting_signed_copy" && Boolean(certificate.signedDocumentUrl);
  const statusText = isClosed ? "Đã đóng" : certificate.status === "awaiting_signed_copy" ? "Đã ký" : "Nháp";
  const statusClass = isClosed ? "bg-[#E6F6F2] text-[#087A6A]" : certificate.status === "awaiting_signed_copy" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#FFF5DC] text-[#A86B00]";

  return <article className="rounded-xl border border-[#DFE9F0] bg-white p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-extrabold text-[#0F8C8C]">{certificate.referenceCode}</span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${statusClass}`}>{statusText}</span></div><p className="mt-1 text-xs text-[#60758A]">{certificate.items.length} tài sản · Ngày thanh lý {new Date(certificate.retiredAt).toLocaleDateString("vi-VN")}</p><div className="mt-3 max-w-md"><CertificateTotals items={certificate.items} /></div><div className="mt-3 flex flex-wrap gap-1.5">{certificate.items.slice(0, 4).map((item) => <span key={item.id} className="rounded bg-[#F0F5F8] px-2 py-1 font-mono text-[9px] font-bold text-[#60758A]">{item.assetCode}</span>)}{certificate.items.length > 4 && <span className="rounded bg-[#F0F5F8] px-2 py-1 text-[9px] font-bold text-[#60758A]">+{certificate.items.length - 4}</span>}</div></div><div className="flex flex-wrap gap-2 lg:justify-end">{!isClosed && <button type="button" onClick={onPrint} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#B7D8D4] bg-white px-3 text-xs font-bold text-[#087A6A]"><Printer size={14} />In nháp</button>}{certificate.signedDocumentUrl && <a href={certificate.signedDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#B7D8D4] bg-white px-3 text-xs font-bold text-[#087A6A]"><FileCheck2 size={14} />Tệp đã ký</a>}{!isClosed && <><button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-bold text-[#2666A8] disabled:opacity-50"><FileUp size={14} />{uploading ? "Đang tải..." : "Tải bản ký tay"}</button><input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />{certificate.status === "draft" && <button type="button" onClick={() => setShowCancelConfirm(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F2CACA] bg-white px-3 text-xs font-bold text-[#B44545]"><Trash2 size={14} />Hủy nháp</button>}{canClose && <button type="button" onClick={() => setShowCloseConfirm(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white"><CheckCircle2 size={14} />Xác nhận đóng</button>}</>}</div></div>{showCancelConfirm && <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#F2CACA] bg-[#FFF7F7] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#B44545]">Hủy nháp sẽ giải phóng toàn bộ tài sản đã chọn. Trạng thái tài sản không thay đổi.</p><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setShowCancelConfirm(false)} className="h-8 rounded-md border border-[#F2CACA] bg-white px-3 text-xs font-bold text-[#B44545]">Không hủy</button><button type="button" disabled={cancelling} onClick={onCancel} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#B44545] px-3 text-xs font-bold text-white disabled:opacity-50">{cancelling && <LoaderCircle size={14} className="animate-spin" />}{cancelling ? "Đang hủy..." : "Xác nhận hủy"}</button></div></div>}{showCloseConfirm && <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#8F5A00]">Đóng biên bản sẽ chuyển toàn bộ tài sản trong biên bản sang Khấu hao/Thanh lý và khóa biên bản.</p><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setShowCloseConfirm(false)} className="h-8 rounded-md border border-[#E7D9B9] bg-white px-3 text-xs font-bold text-[#8F5A00]">Hủy</button><button type="button" disabled={closing} onClick={onClose} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#A86B00] px-3 text-xs font-bold text-white disabled:opacity-50">{closing && <LoaderCircle size={14} className="animate-spin" />}{closing ? "Đang đóng..." : "Đóng biên bản"}</button></div></div>}</article>;
}

export function RetirementCertificateManager() {
  const utils = trpc.useUtils();
  const assetsQuery = trpc.assets.list.useQuery();
  const certificatesQuery = trpc.retirementCertificates.list.useQuery();
  const companyQuery = trpc.company.get.useQuery();
  const maintenanceQuery = trpc.maintenance.list.useQuery();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [certificateSearch, setCertificateSearch] = useState("");
  const [certificatePage, setCertificatePage] = useState(1);
  const [retiredAt, setRetiredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Record<number, DraftItem>>({});
  const [previewRepairTicketId, setPreviewRepairTicketId] = useState<number | null>(null);
  const [isExportingCertificates, setIsExportingCertificates] = useState(false);

  const reservedAssetIds = useMemo(() => new Set((certificatesQuery.data || []).filter((certificate) => certificate.status !== "closed").flatMap((certificate) => certificate.items.map((item) => item.assetId))), [certificatesQuery.data]);
  const candidates = useMemo(() => (assetsQuery.data || []).filter((asset) => !asset.isArchived && !reservedAssetIds.has(asset.id) && (asset.status === "available" || asset.status === "maintenance")), [assetsQuery.data, reservedAssetIds]);
  const selectedIds = useMemo(() => Object.keys(selected).map(Number), [selected]);
  const filteredCandidates = useMemo(() => { const query = normalize(keyword.trim()); return query ? candidates.filter((asset) => [asset.assetCode, asset.name, asset.serialNumber || ""].some((value) => normalize(value).includes(query))) : candidates; }, [candidates, keyword]);
  const selectedItems = useMemo<CertificateItem[]>(() => selectedIds.map((assetId) => { const asset = candidates.find((candidate) => candidate.id === assetId); const detail = selected[assetId]; return { id: assetId, assetId, retirementReason: detail?.reason || DEFAULT_RETIREMENT_REASON, salvageValue: detail?.salvageValue || null, note: detail?.note || null, assetCode: asset?.assetCode || "", assetName: asset?.name || "", serialNumber: asset?.serialNumber || null, purchaseDate: asset?.purchaseDate || null, purchaseValue: asset?.purchaseValue || null }; }), [candidates, selected, selectedIds]);
  const repairInfoByAsset = useMemo(() => {
    const result = new Map<number, { tickets: Array<{ id: number; ticketCode: string }>; totalActualCost: number; hasActualCost: boolean }>();
    (maintenanceQuery.data || []).filter((ticket) => ticket.serviceChannel === "repair").forEach((ticket) => {
      const current = result.get(ticket.assetId) || { tickets: [], totalActualCost: 0, hasActualCost: false };
      current.tickets.push({ id: ticket.id, ticketCode: ticket.ticketCode });
      if (ticket.actualCost !== null && ticket.actualCost !== undefined) { current.totalActualCost += numeric(ticket.actualCost); current.hasActualCost = true; }
      result.set(ticket.assetId, current);
    });
    return result;
  }, [maintenanceQuery.data]);
  const previewRepairTicket = (maintenanceQuery.data || []).find((ticket) => ticket.id === previewRepairTicketId) || null;
  const previewRepairAsset = previewRepairTicket ? candidates.find((asset) => asset.id === previewRepairTicket.assetId) : null;
  const filteredCertificates = useMemo(() => { const query = normalize(certificateSearch.trim()); return (certificatesQuery.data || []).filter((certificate) => { const statusMatches = statusFilter === "all" || (statusFilter === "signed" ? certificate.status === "awaiting_signed_copy" : certificate.status === statusFilter); const searchMatches = !query || [certificate.referenceCode, ...certificate.items.flatMap((item) => [item.assetCode, item.assetName])].some((value) => normalize(value || "").includes(query)); return statusMatches && searchMatches; }); }, [certificateSearch, certificatesQuery.data, statusFilter]);
  const certificatePageCount = Math.max(1, Math.ceil(filteredCertificates.length / CERTIFICATE_PAGE_SIZE));
  const currentCertificatePage = Math.min(certificatePage, certificatePageCount);
  const paginatedCertificates = filteredCertificates.slice((currentCertificatePage - 1) * CERTIFICATE_PAGE_SIZE, currentCertificatePage * CERTIFICATE_PAGE_SIZE);

  const invalidate = async () => { await Promise.all([utils.retirementCertificates.list.invalidate(), utils.assets.list.invalidate()]); };
  const createDraft = trpc.retirementCertificates.createDraft.useMutation({ onSuccess: async ({ referenceCode }) => { toast.success(`Đã tạo nháp ${referenceCode}.`, { description: "In nháp, ký tay rồi tải tệp lên trước khi đóng." }); setSelected({}); setNote(""); await invalidate(); }, onError: (error) => toast.error(error.message || "Không thể tạo nháp biên bản thanh lý.") });
  const uploadSigned = trpc.retirementCertificates.uploadSignedCopy.useMutation({ onSuccess: async () => { toast.success("Đã tải biên bản ký tay. Bạn có thể xác nhận đóng biên bản."); await invalidate(); }, onError: (error) => toast.error(error.message || "Không thể tải biên bản ký tay.") });
  const closeCertificate = trpc.retirementCertificates.close.useMutation({ onSuccess: async ({ referenceCode, assetCount }) => { toast.success(`Đã đóng ${referenceCode}.`, { description: `${assetCount} tài sản đã được chuyển sang Khấu hao/Thanh lý.` }); await invalidate(); }, onError: (error) => toast.error(error.message || "Không thể đóng biên bản.") });
  const cancelDraft = trpc.retirementCertificates.cancelDraft.useMutation({ onSuccess: async ({ referenceCode }) => { toast.success(`Đã hủy nháp ${referenceCode}.`, { description: "Các tài sản đã được giải phóng để chọn lại." }); await invalidate(); }, onError: (error) => toast.error(error.message || "Không thể hủy nháp biên bản.") });

  const toggleAsset = (assetId: number) => setSelected((current) => { if (current[assetId]) { const next = { ...current }; delete next[assetId]; return next; } return { ...current, [assetId]: { reason: DEFAULT_RETIREMENT_REASON, salvageValue: "", note: "" } }; });
  const updateItem = (assetId: number, key: keyof DraftItem, value: string) => setSelected((current) => ({ ...current, [assetId]: { ...current[assetId], [key]: value } }));
  const createDraftFromSelection = () => { if (!selectedIds.length) return toast.error("Chọn ít nhất một tài sản để lập biên bản nháp."); const date = new Date(`${retiredAt}T12:00:00`); if (Number.isNaN(date.getTime())) return toast.error("Vui lòng chọn ngày thanh lý hợp lệ."); createDraft.mutate({ retiredAt: date.getTime(), note: note.trim() || null, items: selectedIds.map((assetId) => ({ assetId, retirementReason: selected[assetId]?.reason.trim() || DEFAULT_RETIREMENT_REASON, salvageValue: selected[assetId]?.salvageValue || null, note: selected[assetId]?.note.trim() || null })) }); };
  const exportFilteredCertificates = async () => {
    if (!filteredCertificates.length) return toast.error("Không có biên bản phù hợp để xuất Excel.");
    setIsExportingCertificates(true);
    const loadingToast = toast.loading("Đang tạo tệp Excel biên bản thanh lý...");
    try {
      const statusLabel = (status: string) => ({ draft: "Nháp", awaiting_signed_copy: "Đã ký", closed: "Đã đóng" }[status] || status);
      const rows = filteredCertificates.flatMap((certificate) => certificate.items.map((item) => ({
        "Mã biên bản": certificate.referenceCode,
        "Trạng thái": statusLabel(certificate.status),
        "Ngày thanh lý": new Date(certificate.retiredAt).toLocaleDateString("vi-VN"),
        "Mã TS": item.assetCode,
        "Tên tài sản": item.assetName,
        "Seri": item.serialNumber || "",
        "Ngày mua": item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("vi-VN") : "",
        "Nguyên giá": numeric(item.purchaseValue),
        "Giá thanh lý": item.salvageValue === null || item.salvageValue === "" ? "" : numeric(item.salvageValue),
        "Lý do thanh lý": item.retirementReason,
        "Ghi chú": item.note || "",
      })));
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [18, 14, 16, 16, 32, 20, 16, 18, 18, 36, 30].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, sheet, "Biên bản thanh lý");
      const filterSummary = `${statusFilter === "all" ? "Tất cả trạng thái" : filterOptions.find((option) => option.key === statusFilter)?.label || statusFilter}${certificateSearch.trim() ? ` · Từ khóa: ${certificateSearch.trim()}` : ""}`;
      await writeBrandedWorkbook(workbook, { company: companyQuery.data || undefined, documentTitle: "DANH SÁCH BIÊN BẢN THANH LÝ", fileName: `AssetMaster-BienBanThanhLy-${new Date().toISOString().slice(0, 10)}.xlsx`, description: `Dữ liệu theo bộ lọc hiện tại: ${filterSummary}. ${filteredCertificates.length} biên bản, ${rows.length} dòng tài sản.`, prepareWorkbook: (brandedWorkbook) => {
        const outputSheet = brandedWorkbook.getWorksheet("Biên bản thanh lý");
        if (!outputSheet) return;
        outputSheet.views = [{ state: "frozen", ySplit: 1 }];
        outputSheet.getRow(1).font = { bold: true, color: { argb: "FF193B57" } };
        outputSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEFF2" } };
        outputSheet.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        [8, 9].forEach((column) => outputSheet.getColumn(column).numFmt = '#,##0 "VNĐ"');
      } });
      toast.success(`Đã tạo Excel ${rows.length} dòng tài sản.`, { id: loadingToast });
    } catch (error) {
      console.error(error); toast.error("Không thể xuất Excel biên bản thanh lý.", { id: loadingToast });
    } finally { setIsExportingCertificates(false); }
  };
  const uploadSignedFile = async (certificateId: number, file?: File) => { if (!file) return; if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) return toast.error("Chỉ hỗ trợ PDF, PNG, JPG, WebP và tối đa 5 MB."); try { uploadSigned.mutate({ id: certificateId, fileName: file.name, contentType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp", dataUrl: await readFileAsDataUrl(file) }); } catch { toast.error("Không thể đọc tệp biên bản ký tay."); } };
  const printDraft = async (certificate: Certificate) => { try { await openRetirementPdf(certificate.items.map((item) => ({ code: item.assetCode, name: item.assetName, purchaseDate: item.purchaseDate, value: item.purchaseValue, salvageValue: item.salvageValue, serial: item.serialNumber, retiredAt: certificate.retiredAt, retirementReason: item.retirementReason, retirementCertificateNumber: certificate.referenceCode, note: item.note })), companyQuery.data || {}, `${certificate.referenceCode}-ban-nhap.pdf`, `Bản nháp biên bản thanh lý ${certificate.referenceCode}`); } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tạo bản in nháp."); } };

  const filterOptions: Array<{ key: StatusFilter; label: string }> = [{ key: "all", label: "Tất cả" }, { key: "draft", label: "Nháp" }, { key: "signed", label: "Đã ký" }, { key: "closed", label: "Đã đóng" }];
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[#D7E8E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
      <header className="flex flex-col gap-3 border-b border-[#E0EEEC] bg-[#F6FCFB] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Archive size={19} /></div>
          <div><h2 className="font-display text-base font-extrabold text-[#102A43]">Biên bản thanh lý gộp</h2><p className="mt-1 text-xs leading-5 text-[#60758A]">Tạo nháp cho nhiều tài sản, in để ký tay, tải tệp ký rồi xác nhận đóng.</p></div>
        </div>
        <div className="shrink-0 rounded-lg border border-[#BFE1DB] bg-white px-3 py-2 text-[10px] font-extrabold text-[#087A6A]">Nháp → Ký tay → Đóng</div>
      </header>

      <div className="grid gap-5 p-5 xl:grid-cols-[1.08fr_.92fr]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="text-sm font-extrabold text-[#193B57]">1. Chọn tài sản cho biên bản nháp</h3><p className="mt-1 text-[11px] text-[#71869A]">Chỉ hiển thị tài sản Sẵn có hoặc đang Bảo hành/Sửa chữa.</p></div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#087A6A]">Đã chọn {selectedIds.length}</span>{selectedIds.length > 0 && <button type="button" onClick={() => setSelected({})} className="h-8 rounded-md border border-[#F2CACA] bg-white px-3 text-[10px] font-extrabold text-[#B44545]">Bỏ chọn tất cả</button>}</div>
          </div>
          <div className="relative mt-3"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#6F8598]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm mã, tên hoặc serial tài sản..." className="retirement-certificate-search field-input h-10 w-full pr-9 text-xs" />{keyword && <button type="button" onClick={() => setKeyword("")} className="absolute right-1.5 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#71869A] hover:bg-[#EEF5F7]" aria-label="Xóa từ khóa tìm tài sản"><X size={14} /></button>}</div>
          <div className="mt-3 max-h-[320px] space-y-2 overflow-auto rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-2">
            {assetsQuery.isLoading ? <div className="grid min-h-28 place-items-center text-xs text-[#71869A]">Đang tải tài sản...</div> : filteredCandidates.length ? filteredCandidates.map((asset) => {
              const item = selected[asset.id];
              return <label key={asset.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${item ? "border-[#8BCDC6] bg-[#F2FBF9]" : "border-transparent bg-white hover:border-[#D7E8E5]"}`}><input type="checkbox" checked={Boolean(item)} onChange={() => toggleAsset(asset.id)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#8BCDC6] accent-[#0F8C8C]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#193B57]">{asset.name}</span><span className="mt-1 block font-mono text-[10px] text-[#8AA0B6]">{asset.assetCode}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${asset.status === "available" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{asset.status === "available" ? "Sẵn có" : "Đang xử lý"}</span></label>;
            }) : <div className="grid min-h-28 place-items-center px-4 text-center text-xs text-[#8AA0B6]">Không có tài sản phù hợp hoặc tài sản đang được giữ trong nháp khác.</div>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#D7E8E5] bg-[#F9FDFC] p-4">
          <h3 className="text-sm font-extrabold text-[#193B57]">2. Hoàn thiện nháp</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]"><div><label className="field-label">Ngày thanh lý</label><input type="date" value={retiredAt} onChange={(event) => setRetiredAt(event.target.value)} className="field-input h-10 w-full text-xs" /></div><div><label className="field-label">Ghi chú chung</label><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Không bắt buộc" className="field-input h-10 w-full text-xs" /></div></div>
          <div className="mt-3 max-h-[286px] space-y-3 overflow-auto">
            {selectedIds.length ? selectedIds.map((assetId) => {
              const asset = candidates.find((candidate) => candidate.id === assetId); const detail = selected[assetId]; const repairInfo = repairInfoByAsset.get(assetId); if (!asset || !detail) return null;
              return <div key={assetId} className="rounded-lg border border-[#D7E8E5] bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{asset.name}</div><div className="mt-1 font-mono text-[10px] text-[#8AA0B6]">{asset.assetCode}</div></div><button type="button" onClick={() => toggleAsset(assetId)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#71869A] hover:bg-[#FDEDEE] hover:text-[#B44545]" aria-label={`Bỏ chọn ${asset.name}`}><X size={14} /></button></div>{repairInfo && <div className="mt-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-[10px] leading-5 text-[#8F5A00]"><span className="font-extrabold">Thông tin sửa chữa tham khảo</span><span className="mx-1">·</span>{repairInfo.tickets.map((ticket, index) => <span key={ticket.id}>{index > 0 && ", "}<button type="button" onClick={() => setPreviewRepairTicketId(ticket.id)} className="font-mono font-extrabold underline decoration-dotted underline-offset-2 hover:text-[#5E3E00]" title="Mở nhanh phiếu sửa chữa">{ticket.ticketCode}</button></span>)}<span className="mx-1">·</span>{repairInfo.hasActualCost ? `Tổng chi phí sửa chữa: ${formatVnd(repairInfo.totalActualCost)} VNĐ` : "Chưa cập nhật chi phí sửa chữa thực tế"}<span className="ml-1 text-[#A48548]">(không đưa vào biên bản)</span></div>}<label className="mt-3 block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">Lý do riêng</label><input value={detail.reason} onChange={(event) => updateItem(assetId, "reason", event.target.value)} className="field-input mt-1 h-9 w-full text-xs" /><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={detail.salvageValue} inputMode="decimal" onChange={(event) => /^\d*(\.\d{0,2})?$/.test(event.target.value) && updateItem(assetId, "salvageValue", event.target.value)} placeholder="Giá trị thu hồi chính thức (cập nhật sau)" className="field-input h-9 w-full text-xs" /><input value={detail.note} onChange={(event) => updateItem(assetId, "note", event.target.value)} placeholder="Ghi chú dòng (nếu có)" className="field-input h-9 w-full text-xs" /></div></div>;
            }) : <div className="rounded-lg border border-dashed border-[#BFE1DB] bg-white px-4 py-7 text-center text-xs text-[#71869A]">Chọn tài sản ở danh sách bên trái để nhập lý do riêng.</div>}
          </div>
          {selectedIds.length > 0 && <div className="mt-3"><CertificateTotals items={selectedItems} /></div>}
          <button type="button" disabled={!selectedIds.length || createDraft.isPending} onClick={createDraftFromSelection} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 size={15} />{createDraft.isPending ? "Đang tạo nháp..." : `Tạo biên bản nháp (${selectedIds.length})`}</button>
        </div>
      </div>

      <div className="border-t border-[#E7EEF3] bg-[#FBFCFD] p-5">
        <div className="flex flex-col gap-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-extrabold text-[#193B57]">Biên bản đã tạo</h3><p className="mt-1 text-[11px] text-[#71869A]">Tìm theo mã TL hoặc tên tài sản; lọc theo trạng thái để theo dõi từng bước xử lý.</p></div><div className="flex flex-wrap items-center gap-1.5"><button type="button" disabled={!filteredCertificates.length || isExportingCertificates} onClick={() => void exportFilteredCertificates()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#8BCDC6] bg-white px-3 text-[10px] font-extrabold text-[#087A6A] hover:bg-[#E6F6F2] disabled:cursor-not-allowed disabled:opacity-50"><Download size={13} />{isExportingCertificates ? "Đang xuất..." : "Xuất Excel"}</button><div className="flex flex-wrap gap-1.5" aria-label="Lọc trạng thái biên bản thanh lý">{filterOptions.map((option) => <button key={option.key} type="button" onClick={() => { setStatusFilter(option.key); setCertificatePage(1); }} className={`h-8 rounded-md border px-3 text-[10px] font-extrabold transition ${statusFilter === option.key ? "border-[#0F8C8C] bg-[#0F8C8C] text-white" : "border-[#DDE7F0] bg-white text-[#60758A] hover:border-[#8BCDC6]"}`}>{option.label}</button>)}</div></div></div><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#6F8598]" /><input value={certificateSearch} onChange={(event) => { setCertificateSearch(event.target.value); setCertificatePage(1); }} placeholder="Tìm mã TL hoặc tên tài sản trong biên bản..." className="retirement-certificate-search field-input h-10 w-full pr-9 text-xs" />{certificateSearch && <button type="button" onClick={() => { setCertificateSearch(""); setCertificatePage(1); }} className="absolute right-1.5 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#71869A] hover:bg-[#EEF5F7]" aria-label="Xóa tìm kiếm biên bản"><X size={14} /></button>}</div></div>
        <div className="mt-3 space-y-3">{certificatesQuery.isLoading ? <div className="py-5 text-center text-xs text-[#71869A]">Đang tải biên bản...</div> : paginatedCertificates.length ? paginatedCertificates.map((certificate) => <CertificateCard key={certificate.id} certificate={certificate as Certificate} company={(companyQuery.data || {}) as Company} uploading={uploadSigned.isPending} closing={closeCertificate.isPending} cancelling={cancelDraft.isPending} onUpload={(file) => { void uploadSignedFile(certificate.id, file); }} onPrint={() => void printDraft(certificate as Certificate)} onClose={() => closeCertificate.mutate({ id: certificate.id })} onCancel={() => cancelDraft.mutate({ id: certificate.id })} />) : <div className="rounded-lg border border-dashed border-[#D7E8E5] bg-white px-4 py-6 text-center text-xs text-[#71869A]">Không có biên bản phù hợp với bộ lọc hoặc từ khóa đã chọn.</div>}</div>
        {filteredCertificates.length > CERTIFICATE_PAGE_SIZE && <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E7EEF3] pt-3"><span className="text-[11px] font-bold text-[#71869A]">Trang {currentCertificatePage}/{certificatePageCount} · {filteredCertificates.length} biên bản</span><div className="flex gap-2"><button type="button" disabled={currentCertificatePage === 1} onClick={() => setCertificatePage((page) => Math.max(1, page - 1))} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-[#526779] disabled:opacity-40" aria-label="Trang trước">‹</button><button type="button" disabled={currentCertificatePage === certificatePageCount} onClick={() => setCertificatePage((page) => Math.min(certificatePageCount, page + 1))} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-[#526779] disabled:opacity-40" aria-label="Trang sau">›</button></div></div>}
      </div>
      {previewRepairTicket && <div className="fixed inset-0 z-[330] flex items-end justify-center bg-[#102A43]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewRepairTicketId(null); }}><section className="w-full max-w-xl rounded-t-2xl bg-white shadow-[0_24px_60px_rgba(16,42,67,0.28)] sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={`Xem nhanh phiếu sửa chữa ${previewRepairTicket.ticketCode}`}><div className="flex items-start justify-between gap-4 border-b border-[#E7EEF3] p-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#A86B00]">Phiếu sửa chữa</div><div className="mt-1 font-mono text-sm font-extrabold text-[#0F8C8C]">{previewRepairTicket.ticketCode}</div><h3 className="mt-1 text-base font-extrabold text-[#193B57]">{previewRepairAsset?.name || `Tài sản #${previewRepairTicket.assetId}`}</h3></div><button type="button" onClick={() => setPreviewRepairTicketId(null)} className="grid h-9 w-9 place-items-center rounded-lg text-xl text-[#60758A] hover:bg-[#F0F6FA]" aria-label="Đóng xem nhanh">×</button></div><div className="space-y-3 p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-[#E0E8F0] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Trạng thái</div><div className="mt-1 text-sm font-bold text-[#193B57]">{repairStatusLabel(previewRepairTicket.status)}</div></div><div className="rounded-lg border border-[#E0E8F0] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Chi phí thực tế</div><div className="mt-1 text-sm font-extrabold text-[#193B57]">{previewRepairTicket.actualCost === null || previewRepairTicket.actualCost === undefined ? "Chưa cập nhật" : `${formatVnd(previewRepairTicket.actualCost)} VNĐ`}</div></div></div><div className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFE] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]">Nội dung yêu cầu</div><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#193B57]">{previewRepairTicket.description || "Chưa có mô tả."}</p></div>{previewRepairTicket.resolution && <div className="rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#087A6A]">Kết quả xử lý</div><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#193B57]">{previewRepairTicket.resolution}</p></div>}</div><div className="border-t border-[#E7EEF3] p-3 text-right"><button type="button" onClick={() => setPreviewRepairTicketId(null)} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng xem nhanh</button></div></section></div>}
    </section>
  );
}
