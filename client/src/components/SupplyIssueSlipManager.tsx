import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { BarChart3, Building2, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Loader2, Printer, RotateCcw, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { openSupplyIssueSlipPdf } from "@/lib/supplyIssueSlipPdf";
import { openHandoverAssetPdf } from "@/lib/handoverAssetPdf";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const numberText = (value: string | number | null | undefined) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const handoverPdfFileNameStorageKey = (referenceCode: string) => `assetmaster-pdf-filename:bg:${referenceCode}`;

export function SupplyIssueSlipManager() {
  const utils = trpc.useUtils();
  const slipsQuery = trpc.supplies.issueSlips.useQuery();
  const analyticsQuery = trpc.supplies.issueAnalytics.useQuery();
  const reportQuery = trpc.supplies.historyReport.useQuery(undefined, { enabled: false });
  const [selectedSlipId, setSelectedSlipId] = useState<number | null>(null);
  const [returnItemId, setReturnItemId] = useState<number | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [slipPage, setSlipPage] = useState(1);
  const itemsQuery = trpc.supplies.issueSlipItems.useQuery({ issueSlipId: selectedSlipId || 0 }, { enabled: selectedSlipId !== null });
  const slips = slipsQuery.data || [];
  const slipsPageSize = 10;
  const slipsPageCount = Math.max(1, Math.ceil(slips.length / slipsPageSize));
  const activeSlipPage = Math.min(slipPage, slipsPageCount);
  const pagedSlips = slips.slice((activeSlipPage - 1) * slipsPageSize, activeSlipPage * slipsPageSize);
  const selectedSlip = useMemo(() => (slipsQuery.data || []).find((slip) => slip.id === selectedSlipId) || null, [slipsQuery.data, selectedSlipId]);
  const returningItem = (itemsQuery.data || []).find((item: any) => item.id === returnItemId) || null;

  const returnItem = trpc.supplies.returnIssueItem.useMutation({
    onSuccess: (result) => {
      toast.success(result.fullyReturned ? "Đã hoàn trả toàn bộ phiếu về kho." : "Đã ghi nhận hoàn trả phụ kiện về kho.");
      setReturnItemId(null);
      setReturnQuantity("");
      setReturnNote("");
      void utils.supplies.list.invalidate();
      void utils.supplies.issueSlips.invalidate();
      void utils.supplies.issueSlipItems.invalidate();
      void utils.supplies.history.invalidate();
    },
    onError: (error) => toast.error(error.message || "Không thể hoàn trả phụ kiện."),
  });

  const previewSlipPdf = async () => {
    if (!selectedSlip) return;
    if (itemsQuery.isLoading) return toast.message("Đang tải danh sách phụ kiện trong phiếu.");
    if (!itemsQuery.data?.length) return toast.error("Phiếu cấp phát chưa có phụ kiện để xuất PDF.");
    setIsPreparingPdf(true);
    try {
      await openSupplyIssueSlipPdf(selectedSlip, itemsQuery.data);
      toast.success("Đã tạo bản xem trước PDF. Chọn In để ký nhận bản cứng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo PDF phiếu cấp phát.");
    } finally { setIsPreparingPdf(false); }
  };

  const exportReport = async () => {
    const result = await reportQuery.refetch();
    const rows = result.data || [];
    if (!rows.length) return toast.error("Chưa có lịch sử nhập–xuất để xuất báo cáo.");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      "Thời gian": new Date(row.createdAt).toLocaleString("vi-VN"),
      "Mã phiếu": row.issueReferenceCode || "—",
      "Loại giao dịch": row.movementType === "receipt" ? "Nhập kho" : row.movementType === "issue" ? "Cấp phát" : row.movementType === "return" ? "Hoàn trả" : "Điều chỉnh",
      "Mã phụ kiện": row.supplyCode,
      "Tên phụ kiện": row.supplyName,
      "Số lượng": Number(row.quantity),
      "Đơn vị": row.unit,
      "Tồn trước": Number(row.quantityBefore),
      "Tồn sau": Number(row.quantityAfter),
      "Người nhận": row.recipientName || "—",
      "Người thực hiện": row.createdByName || "—",
      "Ghi chú": row.note || "",
    })));
    sheet["!cols"] = [20, 16, 16, 18, 32, 13, 12, 13, 13, 24, 24, 42].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, "Lịch sử nhập xuất phụ kiện");
    await writeBrandedWorkbook(workbook, {
      documentTitle: "BÁO CÁO LỊCH SỬ NHẬP XUẤT PHỤ KIỆN",
      fileName: `lich-su-phu-kien-${new Date().toISOString().slice(0, 10)}.xlsx`,
      description: "Toàn bộ giao dịch nhập kho, cấp phát, hoàn trả và điều chỉnh tồn kho.",
    });
    toast.success("Đã tạo báo cáo Excel lịch sử phụ kiện.");
  };

  const issueSlipDrawer = selectedSlip ? (
    <>
      <button type="button" aria-label="Đóng chi tiết phiếu cấp phát" onClick={() => setSelectedSlipId(null)} className="fixed inset-0 z-[86] bg-[#102A43]/25 backdrop-blur-[1px]" />
      <aside className="fixed inset-y-0 right-0 z-[87] w-full max-w-xl overflow-y-auto border-l border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex justify-between gap-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Phiếu cấp phát</div>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{selectedSlip.referenceCode}</h3>
            <p className="mt-1 text-xs text-[#71869A]">Người nhận: <b>{selectedSlip.recipientName}</b></p>
          </div>
          <button type="button" aria-label="Đóng chi tiết phiếu" onClick={() => setSelectedSlipId(null)} className="drawer-close-action"><X size={18} /></button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void previewSlipPdf()} disabled={isPreparingPdf || itemsQuery.isLoading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-3 text-xs font-extrabold text-white transition hover:bg-[#087A6A] disabled:opacity-50"><Printer size={15} />{isPreparingPdf ? "Đang tạo PDF..." : "Xem & in PDF"}</button><span className="self-center text-[11px] text-[#71869A]">PDF có thông tin công ty và vùng ký nhận.</span></div>
        <div className="mt-5 space-y-3">
          {itemsQuery.isLoading && <p className="text-sm text-[#71869A]">Đang tải phụ kiện đã cấp...</p>}
          {(itemsQuery.data || []).map((item: any) => {
            const remaining = Number(item.issuedQuantity) - Number(item.returnedQuantity);
            return <article key={item.id} className="rounded-xl border border-[#E7EEF3] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-extrabold text-[#193B57]">{item.supplyName}</div><div className="mt-1 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode} · {item.unit}</div></div>
                <span className="text-sm font-extrabold text-[#087A6A]">Còn giữ: {numberText(remaining)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div><span className="block text-[#8AA0B6]">Đã cấp</span><b>{numberText(item.issuedQuantity)}</b></div>
                <div><span className="block text-[#8AA0B6]">Đã trả</span><b>{numberText(item.returnedQuantity)}</b></div>
                <div><span className="block text-[#8AA0B6]">Còn lại</span><b>{numberText(remaining)}</b></div>
              </div>
              {remaining > 0 && selectedSlip.status === "active" && <button type="button" onClick={() => { setReturnItemId(item.id); setReturnQuantity(String(remaining)); }} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-2 text-xs font-extrabold text-[#087A6A]"><RotateCcw size={14} />Hoàn trả về kho</button>}
            </article>;
          })}
          {!itemsQuery.isLoading && !(itemsQuery.data || []).length && <p className="rounded-lg border border-dashed border-[#DDE7F0] p-4 text-center text-sm text-[#8AA0B6]">Phiếu chưa có dòng phụ kiện.</p>}
        </div>
      </aside>
    </>
  ) : null;

  const returnDialog = returningItem ? (
    <>
      <button type="button" aria-label="Đóng hoàn trả phụ kiện" onClick={() => setReturnItemId(null)} className="fixed inset-0 z-[90] bg-[#102A43]/30 backdrop-blur-[1px]" />
      <section role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Hoàn trả phụ kiện</div><h3 className="mt-1 font-display text-lg font-extrabold text-[#102A43]">{returningItem.supplyName}</h3></div><button type="button" onClick={() => setReturnItemId(null)} className="drawer-close-action"><X size={18} /></button></div>
        <label className="mt-5 block text-xs font-bold text-[#526779]">Số lượng hoàn trả<input inputMode="decimal" value={returnQuantity} onChange={(event) => setReturnQuantity(event.target.value)} className="field-input mt-1" /></label>
        <label className="mt-3 block text-xs font-bold text-[#526779]">Ghi chú hoàn trả *<textarea value={returnNote} onChange={(event) => setReturnNote(event.target.value)} className="field-input mt-1 min-h-20" placeholder="Nêu tình trạng hoặc lý do hoàn trả..." /></label>
        <button type="button" disabled={returnItem.isPending} onClick={() => { if (!returnQuantity || !returnNote.trim()) return toast.error("Vui lòng nhập số lượng và ghi chú hoàn trả."); returnItem.mutate({ issueSlipItemId: returningItem.id, quantity: Number(returnQuantity), note: returnNote.trim() }); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><RotateCcw size={15} />{returnItem.isPending ? "Đang hoàn trả..." : "Xác nhận hoàn trả"}</button>
      </section>
    </>
  ) : null;

  return <section className="rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.05)]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]"><FileText size={14} />Cấp phát & hoàn trả</div><h2 className="mt-1 font-display text-lg font-extrabold text-[#193B57]">Phiếu cấp phát phụ kiện</h2><p className="mt-1 text-xs text-[#71869A]">Theo dõi mã PK-NĂM-001, số lượng đã cấp và phần hoàn trả về kho.</p></div>
      <button type="button" onClick={() => void exportReport()} disabled={reportQuery.isFetching} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3 text-xs font-extrabold text-[#087A6A] disabled:opacity-50"><Download size={15} />{reportQuery.isFetching ? "Đang xuất..." : "Xuất Excel lịch sử"}</button>
    </div>
    <SupplyIssueAnalytics rows={analyticsQuery.data || []} loading={analyticsQuery.isLoading} />
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-y border-[#E7EEF3] bg-[#F8FBFC] text-[10px] uppercase tracking-[.09em] text-[#8AA0B6]"><tr><th className="px-3 py-3">Mã phiếu</th><th className="px-3 py-3">Người nhận</th><th className="px-3 py-3">Thời gian cấp</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody>{slipsQuery.isLoading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-[#71869A]">Đang tải phiếu cấp phát...</td></tr> : pagedSlips.map((slip) => <tr key={slip.id} className="border-b border-[#EDF2F5]"><td className="px-3 py-3 font-mono font-extrabold text-[#193B57]">{slip.referenceCode}</td><td className="px-3 py-3 text-[#60758A]">{slip.recipientName}</td><td className="px-3 py-3 text-[#60758A]">{new Date(slip.issuedAt).toLocaleString("vi-VN")}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-extrabold ${slip.status === "returned" ? "border-[#C7DDF8] bg-[#EAF3FF] text-[#2666A8]" : "border-[#CDE5E5] bg-[#ECF8F7] text-[#087A6A]"}`}>{slip.status === "returned" ? "Đã hoàn trả" : "Đang cấp phát"}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => setSelectedSlipId(slip.id)} className="rounded-lg border border-[#DDE7F0] px-3 py-1.5 font-extrabold text-[#60758A] hover:bg-[#F7FAFC]">Chi tiết</button></td></tr>)}{!slipsQuery.isLoading && !slips.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#8AA0B6]">Chưa có phiếu cấp phát. Tạo phiếu từ thao tác Xuất/Cấp phát của phụ kiện.</td></tr>}</tbody></table></div>
    {!slipsQuery.isLoading && slips.length > 0 && <div className="flex flex-col gap-3 border-t border-[#E7EEF3] bg-[#FBFCFD] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-semibold text-[#60758A]">Hiển thị {(activeSlipPage - 1) * slipsPageSize + 1}–{Math.min(activeSlipPage * slipsPageSize, slips.length)} / {slips.length} phiếu</span><div className="flex items-center gap-2"><button type="button" aria-label="Trang phiếu cấp phát trước" disabled={activeSlipPage <= 1} onClick={() => setSlipPage((page) => Math.max(1, page - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button><span className="min-w-[82px] text-center text-xs font-bold text-[#193B57]">Trang {activeSlipPage}/{slipsPageCount}</span><button type="button" aria-label="Trang phiếu cấp phát sau" disabled={activeSlipPage >= slipsPageCount} onClick={() => setSlipPage((page) => Math.min(slipsPageCount, page + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DDE7F0] bg-white text-[#60758A] transition hover:border-[#8BCDC6] hover:text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button></div></div>}
    {issueSlipDrawer}
    {returnDialog}
  </section>;
}

type SupplyAnalyticsRow = { recipientUserId: number | null; recipientName: string; departmentName: string | null; supplyId: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: number | string; returnedQuantity: number | string; outstandingQuantity: number | string };

type HoldingSourceItem = { supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string; outstandingQuantity: number };
type HoldingSource = { source: "handover" | "issue-slip"; sourceId: number; referenceCode: string; issuedAt: Date; recipientName: string; issuedByName: string | null; note: string | null; items: HoldingSourceItem[] };

function HoldingSourceCard({ source, onPreview }: { source: HoldingSource; onPreview: (source: HoldingSource) => void }) {
  const [expanded, setExpanded] = useState(false);
  const total = source.items.reduce((sum, item) => sum + item.outstandingQuantity, 0);
  return (
    <div className="holding-source-card px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">
            {source.source === "handover" ? "Cấp kèm bàn giao tài sản" : "Phiếu cấp phát phụ kiện riêng"}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-[#193B57]">
            <span>{new Date(source.issuedAt).toLocaleDateString("vi-VN")}</span>
            <span className="text-[#8AA0B6]">·</span>
            <span>Tổng đang giữ: <strong className="text-[#087A6A]">{numberText(total)}</strong></span>
            <span className="text-[#71869A]">/ {source.items.length} loại</span>
          </div>
        </div>
        <div className="holding-source-card__actions grid w-full grid-cols-2 gap-2 self-stretch sm:flex sm:w-auto sm:items-center sm:self-auto">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="holding-source-card__action inline-flex h-10 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-[#D8E8E5] bg-white px-2.5 text-xs font-extrabold leading-none text-[#526779] whitespace-nowrap hover:bg-[#F4FBFA] sm:h-8 sm:w-auto sm:text-[10px]"
            aria-expanded={expanded}
          >
            <ChevronDown size={13} className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
            <span className="truncate">{expanded ? "Thu gọn" : `Chi tiết (${source.items.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => onPreview(source)}
            className="holding-source-card__action inline-flex h-10 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-[#CDE5E5] bg-[#ECF8F7] px-2.5 text-xs font-extrabold leading-none text-[#087A6A] whitespace-nowrap hover:bg-[#DDF3F0] sm:h-8 sm:w-auto sm:text-[10px]"
            title={source.source === "handover" ? "Xem trước biên bản bàn giao" : "Xem trước phiếu cấp phát phụ kiện"}
          >
            <FileText size={13} className="shrink-0" />
            <span className="truncate">{source.referenceCode}</span>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 grid gap-2 border-t border-[#EDF4F2] pt-3 sm:grid-cols-2">
          {source.items.map((item) => (
            <div key={`${source.sourceId}-${item.supplyCode}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#EDF4F2] bg-[#FBFEFE] px-2.5 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-[#193B57]">{item.supplyName}</div>
                <div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</div>
              </div>
              <div className="shrink-0 text-right text-xs font-extrabold text-[#087A6A]">Còn {numberText(item.outstandingQuantity)} {item.unit}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyInlineHandoverPreviewDialog({ handoverId, onClose }: { handoverId: number | null; onClose: () => void }) {
  const input = useMemo(() => ({ id: handoverId || 0 }), [handoverId]);
  const handoverQuery = trpc.handovers.get.useQuery(input, { enabled: handoverId !== null });
  const companyQuery = trpc.company.get.useQuery();
  const [preparingPdf, setPreparingPdf] = useState<"print" | "export" | null>(null);
  const handover = handoverQuery.data;
  const supplyItems = (handover?.supplyItems || []) as Array<{ id: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string | null }>;
  const createPdf = async (autoPrint: boolean) => {
    if (!handover) return;
    setPreparingPdf(autoPrint ? "print" : "export");
    try {
      const company = companyQuery.data;
      await openHandoverAssetPdf({ referenceCode: handover.referenceCode, assetCode: handover.assetCode, assetName: handover.assetName, recipientName: handover.recipientName, recipientDepartmentName: handover.recipientDepartmentName, handoverByName: handover.handoverByName, handedOverAt: handover.handedOverAt, conditionOut: handover.conditionOut, accessories: handover.accessories, note: handover.note, status: handover.status, supplyItems }, { name: company?.name, address: company?.address, taxCode: company?.taxCode, phone: company?.phone, logoUrl: company?.logoUrl }, { autoPrint });
      toast.success(autoPrint ? "Đã mở bản in biên bản." : "Đã mở bản xem trước PDF.");
    } catch { toast.error("Không thể tạo PDF biên bản. Vui lòng thử lại."); } finally { setPreparingPdf(null); }
  };
  return <Dialog open={handoverId !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-lg font-extrabold text-[#193B57]">{handover ? `Biên bản bàn giao ${handover.referenceCode}` : "Biên bản bàn giao"}</DialogTitle><div className="flex flex-wrap gap-2 pt-1"><button disabled={!handover || preparingPdf !== null} onClick={() => void createPdf(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CDE5E5] bg-white px-2.5 text-[10px] font-extrabold text-[#087A6A] disabled:opacity-55"><Printer size={13} />{preparingPdf === "print" ? "Đang chuẩn bị..." : "In"}</button><button disabled={!handover || preparingPdf !== null} onClick={() => void createPdf(false)} className="inline-flex h-8 items-center gap-1 rounded-md bg-[#0F8C8C] px-2.5 text-[10px] font-extrabold text-white disabled:opacity-55"><Download size={13} />{preparingPdf === "export" ? "Đang tạo..." : "Xuất PDF"}</button></div></DialogHeader>{handoverQuery.isLoading ? <p className="py-10 text-center text-xs text-[#71869A]">Đang tải biên bản bàn giao...</p> : handover ? <div className="space-y-4"><div className="rounded-xl bg-[#102A43] p-4 text-white"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A5C3D2]">Tài sản bàn giao</div><div className="mt-1 text-base font-extrabold">{handover.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{handover.assetCode}</div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Người nhận</div><div className="mt-1 text-sm font-bold text-[#193B57]">{handover.recipientName}</div><div className="mt-1 text-xs text-[#71869A]">{handover.recipientDepartmentName || "Chưa gán phòng ban"}</div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Thông tin bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{new Date(handover.handedOverAt).toLocaleDateString("vi-VN")}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {handover.handoverByName || "Quản trị viên"}</div></div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Phụ kiện còn theo biên bản</div><div className="mt-2 space-y-2">{supplyItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#193B57]">{item.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</span></span><span className="shrink-0 font-extrabold text-[#087A6A]">Còn {numberText(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} {item.unit}</span></div>)}</div></div>{handover.note && <div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Ghi chú</div><p className="mt-1 text-xs leading-5 text-[#526779]">{handover.note}</p></div>}</div> : <p className="py-10 text-center text-xs text-[#71869A]">Không thể tải biên bản bàn giao.</p>}</DialogContent></Dialog>;
}

function LegacyDialogInlineHandoverPreview({ handoverId, onClose }: { handoverId: number | null; onClose: () => void }) {
  const input = useMemo(() => ({ id: handoverId || 0 }), [handoverId]);
  const handoverQuery = trpc.handovers.get.useQuery(input, { enabled: handoverId !== null });
  const companyQuery = trpc.company.get.useQuery();
  const [preparingPdf, setPreparingPdf] = useState<"print" | "export" | null>(null);
  const [fileNames, setFileNames] = useState<Record<number, string>>({});
  const handover = handoverQuery.data;
  const supplyItems = (handover?.supplyItems || []) as Array<{ id: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string | null }>;
  const defaultFileBaseName = handover ? `${handover.referenceCode}-phieu-cap-phat-tai-san` : "bien-ban-ban-giao";
  const fileBaseName = handover ? fileNames[handover.id] ?? defaultFileBaseName : defaultFileBaseName;
  useEffect(() => {
    if (!handover || typeof window === "undefined") return;
    const rememberedName = window.localStorage.getItem(handoverPdfFileNameStorageKey(handover.referenceCode));
    if (rememberedName) setFileNames((current) => current[handover.id] ? current : { ...current, [handover.id]: rememberedName });
  }, [handover?.id, handover?.referenceCode]);
  const createPdf = async (autoPrint: boolean) => {
    if (!handover) return;
    setPreparingPdf(autoPrint ? "print" : "export");
    try {
      const company = companyQuery.data;
      if (typeof window !== "undefined") window.localStorage.setItem(handoverPdfFileNameStorageKey(handover.referenceCode), fileBaseName);
      await openHandoverAssetPdf({ referenceCode: handover.referenceCode, assetCode: handover.assetCode, assetName: handover.assetName, recipientName: handover.recipientName, recipientDepartmentName: handover.recipientDepartmentName, handoverByName: handover.handoverByName, handedOverAt: handover.handedOverAt, conditionOut: handover.conditionOut, accessories: handover.accessories, note: handover.note, status: handover.status, supplyItems }, { name: company?.name, address: company?.address, taxCode: company?.taxCode, phone: company?.phone, logoUrl: company?.logoUrl }, { autoPrint, fileName: fileBaseName });
      toast.success(autoPrint ? "Đã mở bản in biên bản." : "Đã mở bản xem trước PDF.");
    } catch { toast.error("Không thể tạo PDF biên bản. Vui lòng thử lại."); } finally { setPreparingPdf(null); }
  };
  return <Dialog open={handoverId !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="handover-inline-preview-dialog max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-lg font-extrabold text-[#193B57]">{handover ? `Biên bản bàn giao ${handover.referenceCode}` : "Biên bản bàn giao"}</DialogTitle><p className="text-xs text-[#71869A]">Xem nhanh thông tin phiếu, sau đó đặt tên file trước khi lưu hoặc in.</p></DialogHeader>{handoverQuery.isLoading ? <p className="py-10 text-center text-xs text-[#71869A]">Đang tải biên bản bàn giao...</p> : handover ? <div className="space-y-4"><div className="rounded-xl border border-[#DCEBE9] bg-[#F4FBFA] p-3"><label className="block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#498C87]">Tên file PDF</label><div className="mt-2 flex items-center rounded-lg border border-[#CDE5E5] bg-white px-3"><input value={fileBaseName} onChange={(event) => setFileNames((current) => ({ ...current, [handover.id]: event.target.value }))} className="h-9 min-w-0 flex-1 bg-transparent text-xs font-bold text-[#193B57] outline-none" aria-label="Tên file PDF" /><span className="shrink-0 text-xs font-bold text-[#8AA0B6]">.pdf</span></div><p className="mt-1.5 text-[10px] text-[#71869A]">Tên không hợp lệ sẽ được hệ thống tự làm sạch khi tạo file.</p></div><div className="rounded-xl bg-[#102A43] p-4 text-white"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A5C3D2]">Tài sản bàn giao</div><div className="mt-1 text-base font-extrabold">{handover.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{handover.assetCode}</div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Người nhận</div><div className="mt-1 text-sm font-bold text-[#193B57]">{handover.recipientName}</div><div className="mt-1 text-xs text-[#71869A]">{handover.recipientDepartmentName || "Chưa gán phòng ban"}</div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Thông tin bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{new Date(handover.handedOverAt).toLocaleDateString("vi-VN")}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {handover.handoverByName || "Quản trị viên"}</div></div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Phụ kiện còn theo biên bản</div><div className="mt-2 space-y-2">{supplyItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#193B57]">{item.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</span></span><span className="shrink-0 font-extrabold text-[#087A6A]">Còn {numberText(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} {item.unit}</span></div>)}</div></div>{handover.note && <div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Ghi chú</div><p className="mt-1 text-xs leading-5 text-[#526779]">{handover.note}</p></div>}<div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] bg-white pt-3"><button disabled={preparingPdf !== null} onClick={() => void createPdf(true)} className="inline-flex h-9 items-center gap-1 rounded-md border border-[#CDE5E5] bg-white px-3 text-[10px] font-extrabold text-[#087A6A] disabled:opacity-55"><Printer size={13} />{preparingPdf === "print" ? "Đang chuẩn bị..." : "In"}</button><button disabled={preparingPdf !== null} onClick={() => void createPdf(false)} className="inline-flex h-9 items-center gap-1 rounded-md bg-[#0F8C8C] px-3 text-[10px] font-extrabold text-white disabled:opacity-55"><Download size={13} />{preparingPdf === "export" ? "Đang tạo..." : "Xuất PDF"}</button></div></div> : <p className="py-10 text-center text-xs text-[#71869A]">Không thể tải biên bản bàn giao.</p>}</DialogContent></Dialog>;
}

export function InlineHandoverPreviewDialog({ handoverId, onClose }: { handoverId: number | null; onClose: () => void }) {
  const input = useMemo(() => ({ id: handoverId || 0 }), [handoverId]);
  const handoverQuery = trpc.handovers.get.useQuery(input, { enabled: handoverId !== null });
  const assetsQuery = trpc.assets.list.useQuery();
  const branchesQuery = trpc.branches.list.useQuery();
  const companyQuery = trpc.company.get.useQuery();
  const [preparingPdf, setPreparingPdf] = useState<"print" | "export" | null>(null);
  const [fileNames, setFileNames] = useState<Record<number, string>>({});
  const handover = handoverQuery.data;
  const handoverAsset = handover ? assetsQuery.data?.find((asset) => asset.assetCode === handover.assetCode) : undefined;
  const branchName = handoverAsset?.branchId ? branchesQuery.data?.find((branch) => branch.id === handoverAsset.branchId)?.name : undefined;
  const supplyItems = (handover?.supplyItems || []) as Array<{ id: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string | null }>;
  const defaultFileBaseName = handover ? `${handover.referenceCode}-phieu-cap-phat-tai-san` : "bien-ban-ban-giao";
  const fileBaseName = handover ? fileNames[handover.id] ?? defaultFileBaseName : defaultFileBaseName;

  useEffect(() => {
    if (!handover || typeof window === "undefined") return;
    const rememberedName = window.localStorage.getItem(handoverPdfFileNameStorageKey(handover.referenceCode));
    if (rememberedName) setFileNames((current) => current[handover.id] ? current : { ...current, [handover.id]: rememberedName });
  }, [handover?.id, handover?.referenceCode]);

  useEffect(() => {
    if (handoverId === null) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handoverId, onClose]);

  const createPdf = async (autoPrint: boolean) => {
    if (!handover) return;
    setPreparingPdf(autoPrint ? "print" : "export");
    try {
      const company = companyQuery.data;
      if (typeof window !== "undefined") window.localStorage.setItem(handoverPdfFileNameStorageKey(handover.referenceCode), fileBaseName);
      await openHandoverAssetPdf({ referenceCode: handover.referenceCode, assetCode: handover.assetCode, assetName: handover.assetName, branchName, recipientName: handover.recipientName, recipientDepartmentName: handover.recipientDepartmentName, handoverByName: handover.handoverByName, handedOverAt: handover.handedOverAt, conditionOut: handover.conditionOut, accessories: handover.accessories, note: handover.note, status: handover.status, supplyItems }, { name: company?.name, address: company?.address, taxCode: company?.taxCode, phone: company?.phone, logoUrl: company?.logoUrl }, { autoPrint, fileName: fileBaseName });
      toast.success(autoPrint ? "Đã mở bản in biên bản." : "Đã mở bản xem trước PDF.");
    } catch { toast.error("Không thể tạo PDF biên bản. Vui lòng thử lại."); } finally { setPreparingPdf(null); }
  };

  if (handoverId === null || typeof document === "undefined") return null;

  return createPortal(
    <div className="bg-handover-preview-overlay fixed inset-0 z-[320] flex min-h-dvh items-center justify-center bg-[#102A43]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bg-handover-preview-panel flex max-h-[calc(100dvh-2rem)] w-[min(45rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#D7E5EC] bg-white shadow-[0_26px_70px_rgba(16,42,67,0.32)]" role="dialog" aria-modal="true" aria-label={handover ? `Biên bản bàn giao ${handover.referenceCode}` : "Biên bản bàn giao"}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="min-w-0"><h2 className="font-display text-lg font-extrabold text-[#193B57]">{handover ? `Biên bản bàn giao ${handover.referenceCode}` : "Biên bản bàn giao"}</h2><p className="mt-1 text-xs text-[#71869A]">Xem nhanh thông tin phiếu, sau đó đặt tên file trước khi lưu hoặc in.</p></div><button type="button" onClick={onClose} className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#DDE7F0] text-lg text-[#60758A] transition hover:border-[#8BCDC6] hover:bg-[#E6F6F2] hover:text-[#087A6A]" aria-label="Đóng biên bản bàn giao" title="Đóng">×</button></header>
        {handoverQuery.isLoading ? <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-5 py-12 text-center" role="status" aria-live="polite"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#E6F6F2] text-[#087A6A]"><Loader2 size={20} className="animate-spin" /></span><div><p className="text-sm font-extrabold text-[#193B57]">Đang mở biên bản...</p><p className="mt-1 text-xs text-[#71869A]">Đang tải thông tin phiếu bàn giao.</p></div></div> : handover ? <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"><div className="space-y-4"><div className="rounded-xl border border-[#DCEBE9] bg-[#F4FBFA] p-3"><label className="block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#498C87]">Tên file PDF</label><div className="mt-2 flex items-center rounded-lg border border-[#CDE5E5] bg-white px-3"><input value={fileBaseName} onChange={(event) => setFileNames((current) => ({ ...current, [handover.id]: event.target.value }))} className="h-9 min-w-0 flex-1 bg-transparent text-xs font-bold text-[#193B57] outline-none" aria-label="Tên file PDF" /><span className="shrink-0 text-xs font-bold text-[#8AA0B6]">.pdf</span></div><p className="mt-1.5 text-[10px] text-[#71869A]">Tên không hợp lệ sẽ được hệ thống tự làm sạch khi tạo file.</p></div><div className="rounded-xl bg-[#102A43] p-4 text-white"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A5C3D2]">Tài sản bàn giao</div><div className="mt-1 text-base font-extrabold">{handover.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{handover.assetCode}</div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Người nhận</div><div className="mt-1 text-sm font-bold text-[#193B57]">{handover.recipientName}</div><div className="mt-1 text-xs text-[#71869A]">{handover.recipientDepartmentName || "Chưa gán phòng ban"}</div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Thông tin bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{new Date(handover.handedOverAt).toLocaleDateString("vi-VN")}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {handover.handoverByName || "Quản trị viên"}</div><div className="mt-1 text-[11px] text-[#71869A]">Cập nhật lần cuối: {new Date(handover.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</div></div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Phụ kiện còn theo biên bản</div><div className="mt-2 space-y-2">{supplyItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#193B57]">{item.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</span></span><span className="shrink-0 font-extrabold text-[#087A6A]">Còn {numberText(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} {item.unit}</span></div>)}</div></div>{handover.note && <div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Ghi chú</div><p className="mt-1 text-xs leading-5 text-[#526779]">{handover.note}</p></div>}</div></div> : <p className="px-5 py-12 text-center text-xs text-[#71869A]">Không thể tải biên bản bàn giao.</p>}
        {handover && <div className="shrink-0 border-t border-[#E7EEF3] bg-[#F4FBFA] px-5 py-2 text-xs font-semibold text-[#087A6A] sm:px-6">Chi nhánh tài sản: {branchName || "Chưa gán"}</div>}
        {handover && <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E7EEF3] bg-white px-5 py-3 sm:px-6"><button type="button" onClick={onClose} className="modal-close-action">Đóng</button><button disabled={preparingPdf !== null} onClick={() => void createPdf(true)} className="inline-flex h-9 items-center gap-1 rounded-md border border-[#CDE5E5] bg-white px-3 text-[10px] font-extrabold text-[#087A6A] disabled:opacity-55"><Printer size={13} />{preparingPdf === "print" ? "Đang chuẩn bị..." : "In"}</button><button disabled={preparingPdf !== null} onClick={() => void createPdf(false)} className="inline-flex h-9 items-center gap-1 rounded-md bg-[#0F8C8C] px-3 text-[10px] font-extrabold text-white disabled:opacity-55"><Download size={13} />{preparingPdf === "export" ? "Đang tạo..." : "Xuất PDF"}</button></footer>}
      </section>
    </div>,
    document.body,
  );
}

function SupplyIssueAnalytics({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [previewHandoverId, setPreviewHandoverId] = useState<number | null>(null);
  const employeesQuery = trpc.employees.list.useQuery();
  const options = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = options.find((employee) => employee.value === selectedEmployeeId);
  const employeeInput = useMemo(() => ({ userId: Number(selectedEmployeeId) }), [selectedEmployeeId]);
  const historyQuery = trpc.employees.supplyHistory.useQuery(employeeInput, { enabled: mode === "recipient" && Boolean(selectedEmployeeId) });
  const recipientPending = mode === "recipient" && !selectedEmployeeId;
  const summary = useMemo(() => { const totals = new Map<string, { issued: number; returned: number; outstanding: number }>(); rows.forEach((row) => { if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return; const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định"; const old = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 }; totals.set(key, { issued: old.issued + Number(row.issuedQuantity || 0), returned: old.returned + Number(row.returnedQuantity || 0), outstanding: old.outstanding + Number(row.outstandingQuantity || 0) }); }); return [...totals.entries()].map(([label, value]) => ({ label, ...value })).sort((left, right) => right.outstanding - left.outstanding); }, [mode, rows, selectedEmployeeId]);
  const holdingSources = useMemo(() => { const groups = new Map<string, HoldingSource>(); (historyQuery.data || []).forEach((entry) => { const outstandingQuantity = Math.max(0, Number(entry.issuedQuantity) - Number(entry.returnedQuantity || 0)); if (!outstandingQuantity) return; const source = entry.source === "handover" ? "handover" as const : "issue-slip" as const; const key = `${source}-${entry.issueSlipId}`; const group = groups.get(key) || { source, sourceId: entry.issueSlipId, referenceCode: entry.referenceCode, issuedAt: entry.issuedAt, recipientName: entry.recipientName, issuedByName: entry.issuedByName, note: entry.note, items: [] }; group.items.push({ supplyCode: entry.supplyCode, supplyName: entry.supplyName, unit: entry.unit, issuedQuantity: entry.issuedQuantity, returnedQuantity: entry.returnedQuantity, outstandingQuantity }); groups.set(key, group); }); return [...groups.values()].sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime()); }, [historyQuery.data]);
  const previewSource = async (source: HoldingSource) => { if (source.source === "handover") { setPreviewHandoverId(source.sourceId); return; } await openSupplyIssueSlipPdf({ referenceCode: source.referenceCode, recipientName: source.recipientName, issuedByName: source.issuedByName, issuedAt: source.issuedAt, note: source.note }, source.items.map((item) => ({ supplyCode: item.supplyCode, supplyName: item.supplyName, unit: item.unit, issuedQuantity: item.issuedQuantity, returnedQuantity: item.returnedQuantity }))); };
  const totalOutstanding = summary.reduce((sum, item) => sum + item.outstanding, 0);
  return <><section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem tổng và nguồn phụ kiện còn đang giữ."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={options} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPending ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem phụ kiện đang giữ.</p> : summary.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{numberText(item.outstanding)} đang giữ · {numberText(item.returned)} đã trả</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5]" style={{ width: `${(item.outstanding / Math.max(1, ...summary.map((entry) => entry.outstanding))) * 100}%` }} /></div></div>)}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự"}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{recipientPending ? "—" : numberText(mode === "department" ? totalOutstanding : summary[0]?.outstanding)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">đơn vị phụ kiện</div></div></div>{mode === "recipient" && selectedEmployee && !loading && <section className="mt-4 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#DCEBE9] bg-[#F4FBFA] px-3 py-2.5"><div><div className="text-xs font-extrabold text-[#193B57]">Phụ kiện còn đang giữ theo phiếu</div><p className="mt-0.5 text-[10px] text-[#71869A]">Mỗi thẻ là một biên bản BG hoặc phiếu PK; chỉ hiển thị phụ kiện còn giữ.</p></div><span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{holdingSources.length} phiếu</span></div>{historyQuery.isLoading ? <p className="px-3 py-5 text-center text-xs text-[#71869A]">Đang tải phụ kiện còn giữ...</p> : holdingSources.length ? <div className="divide-y divide-[#EDF4F2]">{holdingSources.map((source) => <HoldingSourceCard key={`${source.source}-${source.sourceId}`} source={source} onPreview={(item) => void previewSource(item)} />)}</div> : <p className="px-3 py-5 text-center text-xs text-[#71869A]">Nhân sự này hiện không còn phụ kiện nào đang giữ.</p>}</section>}</section><InlineHandoverPreviewDialog handoverId={previewHandoverId} onClose={() => setPreviewHandoverId(null)} /></>;
}

function LegacySupplyIssueAnalyticsV6({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [previewHandoverId, setPreviewHandoverId] = useState<number | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const employeesQuery = trpc.employees.list.useQuery();
  const employeeOptions = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = employeeOptions.find((employee) => employee.value === selectedEmployeeId);
  const employeeInput = useMemo(() => ({ userId: Number(selectedEmployeeId) }), [selectedEmployeeId]);
  const historyQuery = trpc.employees.supplyHistory.useQuery(employeeInput, { enabled: mode === "recipient" && Boolean(selectedEmployeeId) });
  const previewInput = useMemo(() => ({ id: previewHandoverId || 0 }), [previewHandoverId]);
  const previewQuery = trpc.handovers.get.useQuery(previewInput, { enabled: previewHandoverId !== null });
  const recipientPendingSelection = mode === "recipient" && !selectedEmployeeId;
  const grouped = useMemo(() => {
    if (mode === "recipient" && !selectedEmployeeId) return [];
    const totals = new Map<string, { issued: number; returned: number; outstanding: number }>();
    rows.forEach((row) => {
      if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return;
      const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định";
      const previous = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 };
      totals.set(key, { issued: previous.issued + Number(row.issuedQuantity || 0), returned: previous.returned + Number(row.returnedQuantity || 0), outstanding: previous.outstanding + Number(row.outstandingQuantity || 0) });
    });
    return [...totals.entries()].map(([label, total]) => ({ label, ...total })).sort((left, right) => right.outstanding - left.outstanding).slice(0, 6);
  }, [mode, rows, selectedEmployeeId]);
  const holdingSources = useMemo(() => {
    const groups = new Map<string, HoldingSource>();
    (historyQuery.data || []).forEach((entry) => {
      const outstandingQuantity = Math.max(0, Number(entry.issuedQuantity) - Number(entry.returnedQuantity || 0));
      if (!outstandingQuantity) return;
      const source = entry.source === "handover" ? "handover" as const : "issue-slip" as const;
      const key = `${source}-${entry.issueSlipId}`;
      const group = groups.get(key) || { source, sourceId: entry.issueSlipId, referenceCode: entry.referenceCode, issuedAt: entry.issuedAt, recipientName: entry.recipientName, issuedByName: entry.issuedByName, note: entry.note, items: [] };
      group.items.push({ supplyCode: entry.supplyCode, supplyName: entry.supplyName, unit: entry.unit, issuedQuantity: entry.issuedQuantity, returnedQuantity: entry.returnedQuantity, outstandingQuantity });
      groups.set(key, group);
    });
    return [...groups.values()].sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime());
  }, [historyQuery.data]);
  const totalOutstanding = grouped.reduce((sum, item) => sum + item.outstanding, 0);
  const selectedTotals = grouped[0];
  const summaryValue = mode === "department" ? totalOutstanding : selectedTotals?.outstanding;
  const previewSource = async (source: HoldingSource) => {
    if (source.source === "handover") { setPreviewHandoverId(source.sourceId); return; }
    await openSupplyIssueSlipPdf({ referenceCode: source.referenceCode, recipientName: source.recipientName, issuedByName: source.issuedByName, issuedAt: source.issuedAt, note: source.note }, source.items.map((item) => ({ supplyCode: item.supplyCode, supplyName: item.supplyName, unit: item.unit, issuedQuantity: item.issuedQuantity, returnedQuantity: item.returnedQuantity })));
  };
  const preview = previewQuery.data;
  const previewItems = (preview?.supplyItems || []) as Array<{ id: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string | null }>;

  return <><section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem tổng và các nguồn phụ kiện còn đang giữ."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={employeeOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPendingSelection ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.</p> : grouped.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{mode === "department" ? `${numberText(item.outstanding)} đang cấp` : `${numberText(item.outstanding)} đang giữ · ${numberText(item.returned)} đã trả`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5] transition-[width] duration-300" style={{ width: `${(item.outstanding / Math.max(1, ...grouped.map((entry) => entry.outstanding))) * 100}%` }} /></div></div>)}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự"}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{summaryValue === undefined ? "—" : numberText(summaryValue)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">{mode === "recipient" && selectedTotals ? `${numberText(selectedTotals.returned)} đã trả` : "đơn vị phụ kiện"}</div></div></div>{mode === "recipient" && selectedEmployee && !loading && <section className="mt-4 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#DCEBE9] bg-[#F4FBFA] px-3 py-2.5"><div><div className="text-xs font-extrabold text-[#193B57]">Phụ kiện còn đang giữ theo phiếu</div><p className="mt-0.5 text-[10px] text-[#71869A]">Mỗi thẻ là một biên bản BG hoặc phiếu PK; nhấn Chi tiết để mở hoặc thu gọn danh sách.</p></div><span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{holdingSources.length} phiếu</span></div>{historyQuery.isLoading ? <p className="px-3 py-5 text-center text-xs text-[#71869A]">Đang tải phụ kiện còn giữ...</p> : holdingSources.length ? <div className="divide-y divide-[#EDF4F2]">{holdingSources.map((source) => { const sourceKey = `${source.source}-${source.sourceId}`; const expanded = Boolean(expandedSources[sourceKey]); const quantityTotal = source.items.reduce((sum, item) => sum + item.outstandingQuantity, 0); return <div key={sourceKey} className="px-3 py-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">{source.source === "handover" ? "Cấp kèm bàn giao tài sản" : "Phiếu cấp phát phụ kiện riêng"}</div><div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-[#193B57]"><span>{new Date(source.issuedAt).toLocaleDateString("vi-VN")}</span><span className="text-[#8AA0B6]">·</span><span>Tổng đang giữ: <strong className="text-[#087A6A]">{numberText(quantityTotal)}</strong></span><span className="text-[#71869A]">/ {source.items.length} loại</span></div></div><div className="flex items-center gap-2 self-start sm:self-auto"><button type="button" onClick={() => setExpandedSources((current) => ({ ...current, [sourceKey]: !expanded }))} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#D8E8E5] bg-white px-2.5 text-[10px] font-extrabold text-[#526779] hover:bg-[#F4FBFA]" aria-expanded={expanded}><ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />{expanded ? "Thu gọn" : `Chi tiết (${source.items.length})`}</button><button type="button" onClick={() => void previewSource(source)} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CDE5E5] bg-[#ECF8F7] px-2.5 text-[10px] font-extrabold text-[#087A6A] hover:bg-[#DDF3F0]" title={source.source === "handover" ? "Xem trước biên bản bàn giao" : "Xem trước phiếu cấp phát phụ kiện"}><FileText size={13} />{source.referenceCode}</button></div></div>{expanded && <div className="mt-3 grid gap-2 border-t border-[#EDF4F2] pt-3 sm:grid-cols-2">{source.items.map((item) => <div key={`${sourceKey}-${item.supplyCode}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#EDF4F2] bg-[#FBFEFE] px-2.5 py-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{item.supplyName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</div></div><div className="shrink-0 text-right text-xs font-extrabold text-[#087A6A]">Còn {numberText(item.outstandingQuantity)} {item.unit}</div></div>)}</div>}</div>; })}</div> : <p className="px-3 py-5 text-center text-xs text-[#71869A]">Nhân sự này hiện không còn phụ kiện nào đang giữ.</p>}</section>}</section><Dialog open={previewHandoverId !== null} onOpenChange={(open) => { if (!open) setPreviewHandoverId(null); }}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-lg font-extrabold text-[#193B57]">{preview ? `Biên bản bàn giao ${preview.referenceCode}` : "Biên bản bàn giao"}</DialogTitle></DialogHeader>{previewQuery.isLoading ? <p className="py-10 text-center text-xs text-[#71869A]">Đang tải biên bản bàn giao...</p> : preview ? <div className="space-y-4"><div className="rounded-xl bg-[#102A43] p-4 text-white"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A5C3D2]">Tài sản bàn giao</div><div className="mt-1 text-base font-extrabold">{preview.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{preview.assetCode}</div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Người nhận</div><div className="mt-1 text-sm font-bold text-[#193B57]">{preview.recipientName}</div><div className="mt-1 text-xs text-[#71869A]">{preview.recipientDepartmentName || "Chưa gán phòng ban"}</div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Thông tin bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{new Date(preview.handedOverAt).toLocaleDateString("vi-VN")}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {preview.handoverByName || "Quản trị viên"}</div></div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Phụ kiện còn theo biên bản</div><div className="mt-2 space-y-2">{previewItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#193B57]">{item.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</span></span><span className="shrink-0 font-extrabold text-[#087A6A]">Còn {numberText(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} {item.unit}</span></div>)}</div></div></div> : <p className="py-10 text-center text-xs text-[#71869A]">Không thể tải biên bản bàn giao.</p>}</DialogContent></Dialog></>;
}

function LegacySupplyIssueAnalyticsV5({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [previewHandoverId, setPreviewHandoverId] = useState<number | null>(null);
  const employeesQuery = trpc.employees.list.useQuery();
  const employeeOptions = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = employeeOptions.find((employee) => employee.value === selectedEmployeeId);
  const employeeInput = useMemo(() => ({ userId: Number(selectedEmployeeId) }), [selectedEmployeeId]);
  const historyQuery = trpc.employees.supplyHistory.useQuery(employeeInput, { enabled: mode === "recipient" && Boolean(selectedEmployeeId) });
  const handoverPreviewInput = useMemo(() => ({ id: previewHandoverId || 0 }), [previewHandoverId]);
  const handoverPreviewQuery = trpc.handovers.get.useQuery(handoverPreviewInput, { enabled: previewHandoverId !== null });
  const recipientPendingSelection = mode === "recipient" && !selectedEmployeeId;
  const grouped = useMemo(() => {
    if (mode === "recipient" && !selectedEmployeeId) return [];
    const totals = new Map<string, { issued: number; returned: number; outstanding: number }>();
    rows.forEach((row) => {
      if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return;
      const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định";
      const previous = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 };
      totals.set(key, { issued: previous.issued + Number(row.issuedQuantity || 0), returned: previous.returned + Number(row.returnedQuantity || 0), outstanding: previous.outstanding + Number(row.outstandingQuantity || 0) });
    });
    return [...totals.entries()].map(([label, total]) => ({ label, ...total })).sort((left, right) => (mode === "department" ? right.outstanding - left.outstanding : right.issued - left.issued)).slice(0, 6);
  }, [mode, rows, selectedEmployeeId]);
  const holdingSources = useMemo(() => {
    const groups = new Map<string, { source: "handover" | "issue-slip"; sourceId: number; referenceCode: string; issuedAt: Date; recipientName: string; issuedByName: string | null; note: string | null; items: Array<{ supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string; outstandingQuantity: number }> }>();
    (historyQuery.data || []).forEach((entry) => {
      const outstandingQuantity = Math.max(0, Number(entry.issuedQuantity) - Number(entry.returnedQuantity || 0));
      if (!outstandingQuantity) return;
      const source = entry.source === "handover" ? "handover" as const : "issue-slip" as const;
      const key = `${source}-${entry.issueSlipId}`;
      const group = groups.get(key) || { source, sourceId: entry.issueSlipId, referenceCode: entry.referenceCode, issuedAt: entry.issuedAt, recipientName: entry.recipientName, issuedByName: entry.issuedByName, note: entry.note, items: [] };
      group.items.push({ supplyCode: entry.supplyCode, supplyName: entry.supplyName, unit: entry.unit, issuedQuantity: entry.issuedQuantity, returnedQuantity: entry.returnedQuantity, outstandingQuantity });
      groups.set(key, group);
    });
    return [...groups.values()].sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime());
  }, [historyQuery.data]);
  const max = Math.max(1, ...grouped.map((item) => mode === "department" ? item.outstanding : item.issued));
  const totalOutstanding = grouped.reduce((sum, item) => sum + item.outstanding, 0);
  const selectedTotals = grouped[0];
  const summaryLabel = mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự";
  const summaryValue = mode === "department" ? totalOutstanding : selectedTotals?.outstanding;
  const previewSource = async (source: typeof holdingSources[number]) => {
    if (source.source === "handover") { setPreviewHandoverId(source.sourceId); return; }
    await openSupplyIssueSlipPdf({ referenceCode: source.referenceCode, recipientName: source.recipientName, issuedByName: source.issuedByName, issuedAt: source.issuedAt, note: source.note }, source.items.map((item) => ({ supplyCode: item.supplyCode, supplyName: item.supplyName, unit: item.unit, issuedQuantity: item.issuedQuantity, returnedQuantity: item.returnedQuantity })));
  };
  const previewHandover = handoverPreviewQuery.data;

  const previewSupplyItems = (previewHandover?.supplyItems || []) as Array<{ id: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string | null }>;
  return <><section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem tổng, phụ kiện còn giữ và từng nguồn cấp phát."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={employeeOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPendingSelection ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.</p> : grouped.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{mode === "department" ? `${numberText(item.outstanding)} đang cấp` : `${numberText(item.outstanding)} đang giữ · ${numberText(item.returned)} đã trả`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5] transition-[width] duration-300" style={{ width: `${((mode === "department" ? item.outstanding : item.issued) / max) * 100}%` }} /></div></div>)}{!loading && !recipientPendingSelection && !grouped.length && <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chưa có phụ kiện cấp phát của đối tượng được chọn.</p>}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{summaryLabel}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{summaryValue === undefined ? "—" : numberText(summaryValue)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">{mode === "recipient" && selectedTotals ? `${numberText(selectedTotals.returned)} đã trả` : "đơn vị phụ kiện"}</div></div></div>{mode === "recipient" && selectedEmployee && !loading && <section className="mt-4 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#DCEBE9] bg-[#F4FBFA] px-3 py-2.5"><div><div className="text-xs font-extrabold text-[#193B57]">Phụ kiện còn đang giữ theo phiếu</div><p className="mt-0.5 text-[10px] text-[#71869A]">Gộp mỗi biên bản BG hoặc phiếu cấp phát PK thành một nhóm; chỉ hiển thị phụ kiện còn giữ.</p></div><span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{holdingSources.length} phiếu</span></div>{historyQuery.isLoading ? <p className="px-3 py-5 text-center text-xs text-[#71869A]">Đang tải phụ kiện còn giữ...</p> : holdingSources.length ? <div className="divide-y divide-[#EDF4F2]">{holdingSources.map((source) => <div key={`${source.source}-${source.sourceId}`} className="px-3 py-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">{source.source === "handover" ? "Cấp kèm bàn giao tài sản" : "Phiếu cấp phát phụ kiện riêng"}</div><div className="mt-0.5 text-xs font-bold text-[#193B57]">{new Date(source.issuedAt).toLocaleDateString("vi-VN")} · {source.items.length} loại phụ kiện còn giữ</div></div><button type="button" onClick={() => void previewSource(source)} className="inline-flex h-8 items-center gap-1 self-start rounded-md border border-[#CDE5E5] bg-[#ECF8F7] px-2.5 text-[10px] font-extrabold text-[#087A6A] hover:bg-[#DDF3F0] sm:self-auto" title={source.source === "handover" ? "Xem trước biên bản bàn giao" : "Xem trước phiếu cấp phát phụ kiện"}><FileText size={13} />{source.referenceCode}</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{source.items.map((item) => <div key={`${source.sourceId}-${item.supplyCode}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#EDF4F2] bg-[#FBFEFE] px-2.5 py-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{item.supplyName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</div></div><div className="shrink-0 text-right text-xs font-extrabold text-[#087A6A]">Còn {numberText(item.outstandingQuantity)} {item.unit}</div></div>)}</div></div>)}</div> : <p className="px-3 py-5 text-center text-xs text-[#71869A]">Nhân sự này hiện không còn phụ kiện nào đang giữ.</p>}</section>}</section><Dialog open={previewHandoverId !== null} onOpenChange={(open) => { if (!open) setPreviewHandoverId(null); }}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-lg font-extrabold text-[#193B57]">{previewHandover ? `Biên bản bàn giao ${previewHandover.referenceCode}` : "Biên bản bàn giao"}</DialogTitle></DialogHeader>{handoverPreviewQuery.isLoading ? <p className="py-10 text-center text-xs text-[#71869A]">Đang tải biên bản bàn giao...</p> : previewHandover ? <div className="space-y-4"><div className="rounded-xl bg-[#102A43] p-4 text-white"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#A5C3D2]">Tài sản bàn giao</div><div className="mt-1 text-base font-extrabold">{previewHandover.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{previewHandover.assetCode}</div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Người nhận</div><div className="mt-1 text-sm font-bold text-[#193B57]">{previewHandover.recipientName}</div><div className="mt-1 text-xs text-[#71869A]">{previewHandover.recipientDepartmentName || "Chưa gán phòng ban"}</div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Thông tin bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{new Date(previewHandover.handedOverAt).toLocaleDateString("vi-VN")}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {previewHandover.handoverByName || "Quản trị viên"}</div></div></div><div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Phụ kiện còn theo biên bản</div><div className="mt-2 space-y-2">{previewSupplyItems.filter((item) => Number(item.issuedQuantity) - Number(item.returnedQuantity || 0) > 0).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-[#193B57]">{item.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</span></span><span className="shrink-0 font-extrabold text-[#087A6A]">Còn {numberText(Number(item.issuedQuantity) - Number(item.returnedQuantity || 0))} {item.unit}</span></div>)}</div></div>{previewHandover.note && <div className="rounded-xl border border-[#E7EEF3] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Ghi chú</div><p className="mt-1 text-xs leading-5 text-[#526779]">{previewHandover.note}</p></div>}</div> : <p className="py-10 text-center text-xs text-[#71869A]">Không thể tải biên bản bàn giao.</p>}</DialogContent></Dialog></>;
}

function LegacySupplyIssueAnalyticsV4({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const employeesQuery = trpc.employees.list.useQuery();
  const employeeOptions = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = employeeOptions.find((employee) => employee.value === selectedEmployeeId);
  const holdingInput = useMemo(() => ({ userId: Number(selectedEmployeeId) }), [selectedEmployeeId]);
  const handoverHoldingsQuery = trpc.supplies.handoverHoldings.useQuery(holdingInput, { enabled: mode === "recipient" && Boolean(selectedEmployeeId) });
  const recipientPendingSelection = mode === "recipient" && !selectedEmployeeId;
  const grouped = useMemo(() => {
    if (mode === "recipient" && !selectedEmployeeId) return [];
    const totals = new Map<string, { issued: number; returned: number; outstanding: number }>();
    rows.forEach((row) => {
      if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return;
      const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định";
      const previous = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 };
      totals.set(key, { issued: previous.issued + Number(row.issuedQuantity || 0), returned: previous.returned + Number(row.returnedQuantity || 0), outstanding: previous.outstanding + Number(row.outstandingQuantity || 0) });
    });
    return [...totals.entries()].map(([label, total]) => ({ label, ...total })).sort((left, right) => (mode === "department" ? right.outstanding - left.outstanding : right.issued - left.issued)).slice(0, 6);
  }, [mode, rows, selectedEmployeeId]);
  const max = Math.max(1, ...grouped.map((item) => mode === "department" ? item.outstanding : item.issued));
  const totalOutstanding = grouped.reduce((sum, item) => sum + item.outstanding, 0);
  const selectedTotals = grouped[0];
  const summaryLabel = mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự";
  const summaryValue = mode === "department" ? totalOutstanding : selectedTotals?.outstanding;
  const openHandover = (handoverId: number) => { sessionStorage.setItem("assetmaster-open-handover-id", String(handoverId)); window.location.assign("/?view=handovers"); };

  return <section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem tổng, phụ kiện còn giữ và biên bản bàn giao tương ứng."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={employeeOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPendingSelection ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.</p> : grouped.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{mode === "department" ? `${numberText(item.outstanding)} đang cấp` : `${numberText(item.outstanding)} đang giữ · ${numberText(item.returned)} đã trả`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5] transition-[width] duration-300" style={{ width: `${((mode === "department" ? item.outstanding : item.issued) / max) * 100}%` }} /></div></div>)}{!loading && !recipientPendingSelection && !grouped.length && <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chưa có phụ kiện cấp phát của đối tượng được chọn.</p>}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{summaryLabel}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{summaryValue === undefined ? "—" : numberText(summaryValue)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">{mode === "recipient" && selectedTotals ? `${numberText(selectedTotals.returned)} đã trả` : "đơn vị phụ kiện"}</div></div></div>{mode === "recipient" && selectedEmployee && !loading && <section className="mt-4 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#DCEBE9] bg-[#F4FBFA] px-3 py-2.5"><div><div className="text-xs font-extrabold text-[#193B57]">Phụ kiện còn đang giữ kèm biên bản</div><p className="mt-0.5 text-[10px] text-[#71869A]">Chỉ hiển thị phụ kiện còn số lượng giữ; nhấn mã BG để mở biên bản gốc.</p></div><span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{handoverHoldingsQuery.data?.length || 0} dòng</span></div>{handoverHoldingsQuery.isLoading ? <p className="px-3 py-5 text-center text-xs text-[#71869A]">Đang tải phụ kiện kèm biên bản...</p> : handoverHoldingsQuery.data?.length ? <div className="divide-y divide-[#EDF4F2]">{handoverHoldingsQuery.data.map((item) => <div key={`${item.handoverId}-${item.supplyId}`} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{item.supplyName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><div className="text-sm font-extrabold text-[#087A6A]">Còn {numberText(item.outstandingQuantity)} {item.unit}</div><div className="mt-0.5 text-[10px] text-[#71869A]">Bàn giao {new Date(item.handedOverAt).toLocaleDateString("vi-VN")}</div></div><button type="button" onClick={() => openHandover(item.handoverId)} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#CDE5E5] bg-[#ECF8F7] px-2.5 text-[10px] font-extrabold text-[#087A6A] hover:bg-[#DDF3F0]" title="Mở biên bản bàn giao" aria-label={`Mở biên bản bàn giao ${item.referenceCode}`}><FileText size={13} />{item.referenceCode}</button></div></div>)}</div> : <p className="px-3 py-5 text-center text-xs text-[#71869A]">Không có phụ kiện kèm biên bản nào còn đang giữ.</p>}</section>}</section>;
}

function LegacySupplyIssueAnalyticsV2({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const employeesQuery = trpc.employees.list.useQuery();
  const employeeOptions = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = employeeOptions.find((employee) => employee.value === selectedEmployeeId);
  const recipientPendingSelection = mode === "recipient" && !selectedEmployeeId;
  const grouped = useMemo(() => {
    if (mode === "recipient" && !selectedEmployeeId) return [];
    const totals = new Map<string, { issued: number; returned: number; outstanding: number }>();
    rows.forEach((row) => {
      if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return;
      const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định";
      const previous = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 };
      totals.set(key, { issued: previous.issued + Number(row.issuedQuantity || 0), returned: previous.returned + Number(row.returnedQuantity || 0), outstanding: previous.outstanding + Number(row.outstandingQuantity || 0) });
    });
    return [...totals.entries()].map(([label, total]) => ({ label, ...total })).sort((left, right) => (mode === "department" ? right.outstanding - left.outstanding : right.issued - left.issued)).slice(0, 6);
  }, [mode, rows, selectedEmployeeId]);
  const holdingsBySupply = useMemo(() => {
    if (mode !== "recipient" || !selectedEmployeeId) return [];
    return rows.filter((row) => row.recipientUserId === Number(selectedEmployeeId)).map((row) => ({ ...row, issued: Number(row.issuedQuantity || 0), returned: Number(row.returnedQuantity || 0), outstanding: Math.max(0, Number(row.outstandingQuantity || 0)) })).filter((row) => row.outstanding > 0).sort((left, right) => right.outstanding - left.outstanding || left.supplyCode.localeCompare(right.supplyCode, "vi"));
  }, [mode, rows, selectedEmployeeId]);
  const max = Math.max(1, ...grouped.map((item) => mode === "department" ? item.outstanding : item.issued));
  const totalOutstanding = grouped.reduce((sum, item) => sum + item.outstanding, 0);
  const selectedTotals = grouped[0];
  const summaryLabel = mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự";
  const summaryValue = mode === "department" ? totalOutstanding : selectedTotals?.outstanding;

  return <section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem tổng và từng mã phụ kiện còn đang giữ."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={employeeOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPendingSelection ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.</p> : grouped.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{mode === "department" ? `${numberText(item.outstanding)} đang cấp` : `${numberText(item.outstanding)} đang giữ · ${numberText(item.returned)} đã trả`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5] transition-[width] duration-300" style={{ width: `${((mode === "department" ? item.outstanding : item.issued) / max) * 100}%` }} /></div></div>)}{!loading && !recipientPendingSelection && !grouped.length && <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chưa có phụ kiện cấp phát của đối tượng được chọn.</p>}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{summaryLabel}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{summaryValue === undefined ? "—" : numberText(summaryValue)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">{mode === "recipient" && selectedTotals ? `${numberText(selectedTotals.returned)} đã trả` : "đơn vị phụ kiện"}</div></div></div>{mode === "recipient" && selectedEmployee && !loading && <div className="mt-4 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white"><div className="flex items-center justify-between gap-3 border-b border-[#DCEBE9] bg-[#F4FBFA] px-3 py-2.5"><div><div className="text-xs font-extrabold text-[#193B57]">Chi tiết phụ kiện đang giữ</div><p className="mt-0.5 text-[10px] text-[#71869A]">Phân tách theo từng mã phụ kiện của {selectedEmployee.label}.</p></div><span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{holdingsBySupply.length} mã</span></div>{holdingsBySupply.length ? <div className="divide-y divide-[#EDF4F2]">{holdingsBySupply.map((item) => <div key={`${item.supplyId}-${item.supplyCode}`} className="flex items-center justify-between gap-4 px-3 py-2.5"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{item.supplyName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.supplyCode}</div></div><div className="shrink-0 text-right"><div className="text-sm font-extrabold text-[#087A6A]">{numberText(item.outstanding)} {item.unit}</div><div className="mt-0.5 text-[10px] text-[#71869A]">Nhận {numberText(item.issued)} · Trả {numberText(item.returned)}</div></div></div>)}</div> : <p className="px-3 py-5 text-center text-xs text-[#71869A]">Nhân sự này hiện không còn giữ phụ kiện nào.</p>}</div>}</section>;
}

function LegacySupplyIssueAnalytics({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
  const [mode, setMode] = useState<"department" | "recipient">("department");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const employeesQuery = trpc.employees.list.useQuery();
  const employeeOptions = useMemo(() => (employeesQuery.data || []).map((employee) => ({ value: String(employee.id), label: employee.name || "Nhân sự chưa đặt tên", searchText: employee.email || "" })), [employeesQuery.data]);
  const selectedEmployee = employeeOptions.find((employee) => employee.value === selectedEmployeeId);
  const grouped = useMemo(() => {
    if (mode === "recipient" && !selectedEmployee) return [];
    const totals = new Map<string, { issued: number; returned: number; outstanding: number }>();
    rows.forEach((row) => {
      const key = mode === "department" ? row.departmentName || "Chưa gán phòng ban" : row.recipientName || "Chưa xác định";
      if (mode === "recipient" && row.recipientUserId !== Number(selectedEmployeeId)) return;
      const previous = totals.get(key) || { issued: 0, returned: 0, outstanding: 0 };
      totals.set(key, { issued: previous.issued + Number(row.issuedQuantity || 0), returned: previous.returned + Number(row.returnedQuantity || 0), outstanding: previous.outstanding + Number(row.outstandingQuantity || 0) });
    });
    return [...totals.entries()].map(([label, total]) => ({ label, ...total })).sort((a, b) => (mode === "department" ? b.outstanding - a.outstanding : b.issued - a.issued)).slice(0, 6);
  }, [mode, rows, selectedEmployee]);
  const max = Math.max(1, ...grouped.map((item) => mode === "department" ? item.outstanding : item.issued));
  const totalOutstanding = grouped.reduce((sum, item) => sum + item.outstanding, 0);
  const selectedTotals = grouped[0];
  const recipientPendingSelection = mode === "recipient" && !selectedEmployeeId;
  const summaryLabel = mode === "department" ? "Đang cấp" : selectedEmployee ? "Đang giữ" : "Chọn nhân sự";
  const summaryValue = mode === "department" ? totalOutstanding : selectedTotals?.outstanding;
  return <section className="mt-5 rounded-xl border border-[#DCEBE9] bg-[#FBFEFE] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]"><BarChart3 size={14} />Thống kê cấp phát</div><h3 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Số lượng phụ kiện đã cấp phát</h3><p className="mt-1 text-xs text-[#71869A]">{mode === "department" ? "Theo dõi số lượng phụ kiện đang cấp theo từng phòng ban." : "Chọn nhân sự để xem số lượng phụ kiện đang giữ và đã trả."}</p></div><div className="inline-flex rounded-lg border border-[#CDE5E5] bg-white p-1"><button type="button" onClick={() => setMode("department")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "department" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><Building2 size={13} />Phòng ban</button><button type="button" onClick={() => setMode("recipient")} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold ${mode === "recipient" ? "bg-[#E6F6F2] text-[#087A6A]" : "text-[#71869A] hover:text-[#193B57]"}`}><UsersRound size={13} />Nhân sự</button></div></div>{mode === "recipient" && <div className="mt-4 max-w-md"><label className="field-label">Nhân sự cần kiểm tra</label><SearchableSelect value={selectedEmployeeId} onChange={setSelectedEmployeeId} options={employeeOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm tên, email hoặc phòng ban..." emptyText="Không tìm thấy nhân sự phù hợp" /></div>}<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]"><div className="space-y-3">{loading ? <p className="py-6 text-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu cấp phát...</p> : recipientPendingSelection ? <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chọn một nhân sự để xem số lượng phụ kiện đang giữ và đã trả.</p> : grouped.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-[#526779]">{item.label}</span><span className="shrink-0 font-extrabold text-[#087A6A]">{mode === "department" ? `${numberText(item.outstanding)} đang cấp` : `${numberText(item.outstanding)} đang giữ · ${numberText(item.returned)} đã trả`}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#E6EFF1]"><div className="h-full rounded-full bg-gradient-to-r from-[#0F8C8C] to-[#69BBB5] transition-[width] duration-300" style={{ width: `${((mode === "department" ? item.outstanding : item.issued) / max) * 100}%` }} /></div></div>)}{!loading && !recipientPendingSelection && !grouped.length && <p className="rounded-lg border border-dashed border-[#CDE5E5] px-4 py-6 text-center text-xs text-[#71869A]">Chưa có phiếu cấp phát của đối tượng được chọn.</p>}</div><div className="rounded-xl bg-[#E6F6F2] p-4 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#498C87]">{summaryLabel}</div><div className="mt-2 font-display text-3xl font-extrabold text-[#087A6A]">{summaryValue === undefined ? "—" : numberText(summaryValue)}</div><div className="mt-1 text-[11px] font-semibold text-[#60758A]">{mode === "recipient" && selectedTotals ? `${numberText(selectedTotals.returned)} đã trả` : "đơn vị phụ kiện"}</div></div></div></section>;
}
