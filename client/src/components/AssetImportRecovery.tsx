import { useEffect, useState } from "react";
import { AlertTriangle, Clock3, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function LatestImportUndo({ onUndone }: { onUndone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const latest = trpc.assets.latestImport.useQuery();
  const undo = trpc.assets.undoLatestImport.useMutation({ onSuccess: () => { toast.success("Đã hoàn tác phiên import gần nhất."); setConfirm(false); void latest.refetch(); onUndone(); }, onError: (error) => toast.error(error.message || "Không thể hoàn tác phiên import.") });
  const requestCloseConfirmation = () => toast.warning("Hủy thao tác hoàn tác?", { description: "Phiên import vẫn có thể được hoàn tác cho đến hết thời hạn.", action: { label: "Hủy hoàn tác", onClick: () => setConfirm(false) } });
  useEffect(() => {
    if (!confirm) return;
    const closeOutside = (event: PointerEvent) => {
      const layer = Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).find((element) => element.textContent?.includes("Hoàn tác import gần nhất?"));
      if (layer && event.target === layer && !undo.isPending) requestCloseConfirmation();
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [confirm, undo.isPending]);
  useEffect(() => {
    if (!confirm) return;
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !undo.isPending) requestCloseConfirmation(); };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [confirm, undo.isPending]);
  const session = latest.data;
  if (!session || session.isUndone || (session.createdCount + session.updatedCount === 0)) return null;
  const canUndo = session.canUndo;
  const deadline = new Date(session.undoDeadline).toLocaleString("vi-VN");
  const remainingMs = new Date(session.undoDeadline).getTime() - Date.now();
  const isExpiringSoon = canUndo && remainingMs <= 2 * 60 * 60 * 1000;
  const remainingHours = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
  return <aside className={`fixed bottom-5 left-5 z-[85] w-[min(23rem,calc(100vw-2.5rem))] rounded-xl border bg-white p-4 shadow-[0_16px_42px_rgba(16,42,67,0.20)] ${isExpiringSoon ? "border-[#E87D34]" : canUndo ? "border-[#F2D596]" : "border-[#DDE7F0]"}`}><div className="flex gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isExpiringSoon ? "bg-[#FDEDE4] text-[#C75419]" : canUndo ? "bg-[#FFF5DC] text-[#A86B00]" : "bg-[#F0F5F8] text-[#71869A]"}`}>{isExpiringSoon ? <AlertTriangle size={18} /> : <Clock3 size={18} />}</div><div className="min-w-0"><div className="text-xs font-extrabold text-[#193B57]">{isExpiringSoon ? "Sắp hết hạn hoàn tác import" : canUndo ? "Có thể hoàn tác import gần nhất" : "Đã hết hạn hoàn tác import"}</div><p className="mt-1 text-[11px] leading-5 text-[#71869A]">{session.referenceCode} · tạo {session.createdCount}, cập nhật {session.updatedCount} tài sản.</p><p className={`mt-1 text-[10px] font-bold ${isExpiringSoon ? "text-[#C75419]" : canUndo ? "text-[#A86B00]" : "text-[#8AA0B6]"}`}>{isExpiringSoon ? `Còn khoảng ${remainingHours} giờ. Hãy kiểm tra và hoàn tác nếu cần.` : canUndo ? `Cho phép hoàn tác đến ${deadline}` : `Hết hiệu lực từ ${deadline}`}</p></div></div><button disabled={!canUndo} onClick={() => setConfirm(true)} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:border-[#DDE7F0] disabled:bg-[#F7FAFC] disabled:text-[#8AA0B6] ${isExpiringSoon ? "border-[#F2B18B] bg-[#FFF2E9] text-[#C75419] hover:bg-[#FDEDE4]" : "border-[#E7C981] bg-[#FFF9EB] text-[#A86B00] hover:bg-[#FFF5DC]"}`}><RotateCcw size={14} />{canUndo ? "Hoàn tác phiên import này" : "Thời hạn hoàn tác đã kết thúc"}</button>{confirm && <div className="fixed inset-0 z-[95] grid place-items-center bg-[#102A43]/50 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF5DC] text-[#A86B00]"><AlertTriangle size={20} /></div><div><h3 className="font-display text-lg font-extrabold text-[#102A43]">Hoàn tác import gần nhất?</h3><p className="mt-2 text-sm leading-6 text-[#60758A]">Các tài sản được tạo sẽ được lưu trữ; các tài sản được cập nhật sẽ khôi phục lại giá trị trước import. Thời hạn thao tác đến {deadline}.</p></div></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setConfirm(false)} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button disabled={undo.isPending} onClick={() => undo.mutate({ sessionId: session.id })} className="inline-flex items-center gap-2 rounded-lg bg-[#B76C00] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><RotateCcw size={14} />{undo.isPending ? "Đang hoàn tác..." : "Xác nhận hoàn tác"}</button></div></div></div>}</aside>;
}

const labels: Record<string, string> = { name: "Tên tài sản", status: "Trạng thái", condition: "Tình trạng", purchaseDate: "Ngày mua", purchaseValue: "Giá trị", vendor: "Nhà cung cấp", brandId: "Hãng", serialNumber: "Serial/IMEI", location: "Vị trí", warrantyUntil: "Hạn bảo hành", metadata: "Phân loại", note: "Ghi chú", maintenanceReason: "Lý do bảo trì", isArchived: "Trạng thái lưu trữ" };
const sourceLabels: Record<string, string> = { import: "Import Excel", manual: "Chỉnh sửa thủ công", undo: "Hoàn tác import" };
const statusLabels: Record<string, string> = { available: "Sẵn có", assigned: "Đang cấp phát", maintenance: "Bảo trì", retired: "Đã thanh lý", lost: "Báo mất", good: "Tốt", damaged: "Hỏng" };
const cleanValue = (value: string | null) => value || "—";
type AssetFieldChangeRecord = { id: number; fieldName: string; previousValue: string | null; nextValue: string | null; source: string; actorName: string | null; createdAt: Date | string };
function formatHistoryValue(fieldName: string, value: string | null) {
  if (!value) return "—";
  if (fieldName === "status" || fieldName === "condition") return statusLabels[value] || value;
  if (fieldName === "purchaseDate" || fieldName === "warrantyUntil") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toLocaleDateString("vi-VN");
  }
  return cleanValue(value);
}

export function AssetFieldHistoryDrawer({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const [historyPage, setHistoryPage] = useState(1);
  const history = trpc.assets.history.useQuery({ assetId, page: historyPage, pageSize: 10 });
  const historyTotalPages = history.data?.totalPages ?? 1;
  const [historyItems, setHistoryItems] = useState<AssetFieldChangeRecord[]>([]);
  useEffect(() => {
    if (!history.data) return;
    setHistoryItems((current) => historyPage === 1 ? history.data.items : [...current, ...history.data.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
  }, [history.data, historyPage]);
  useEffect(() => {
    setHistoryPage(1);
    setHistoryItems([]);
  }, [assetId]);
  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);
  return <><button aria-label="Đóng lịch sử thay đổi" onClick={onClose} className="fixed inset-0 z-[86] bg-[#102A43]/25 backdrop-blur-[1px]" /><aside className="fixed inset-y-0 right-0 z-[87] w-full max-w-xl overflow-y-auto border-l border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Nhật ký tài sản</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Lịch sử thay đổi chi tiết</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Theo dõi từng trường đã thay đổi từ import, chỉnh sửa và hoàn tác.</p></div><button onClick={onClose} className="drawer-close-action" aria-label="Đóng lịch sử thay đổi"><X size={18} /></button></div><div className="mt-6 space-y-3">{history.isLoading && <p aria-live="polite" className="modal-loading-state text-sm text-[#71869A]">Đang tải lịch sử thay đổi...</p>}{historyItems.map((change) => <article key={change.id} className="rounded-xl border border-[#E7EEF3] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold text-[#193B57]">{labels[change.fieldName] || change.fieldName}</span><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{sourceLabels[change.source] || change.source}</span></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-[#FDEDEE] p-2.5 text-[#9C4141]"><div className="text-[10px] font-bold uppercase">Trước</div><div className="mt-1 break-words">{formatHistoryValue(change.fieldName, change.previousValue)}</div></div><div className="rounded-lg bg-[#E6F6F2] p-2.5 text-[#087A6A]"><div className="text-[10px] font-bold uppercase">Sau</div><div className="mt-1 break-words">{formatHistoryValue(change.fieldName, change.nextValue)}</div></div></div><div className="mt-3 text-[11px] text-[#8AA0B6]">{new Date(change.createdAt).toLocaleString("vi-VN")} · {change.actorName || "Quản trị viên"}</div></article>)}{!history.isLoading && !historyItems.length && <div className="modal-empty-state rounded-xl border border-dashed border-[#DDE7F0] p-6 text-center text-sm text-[#8AA0B6]">Chưa có thay đổi nào được ghi nhận cho tài sản này.</div>}{historyTotalPages > 1 && <div className="space-y-3 border-t border-[#E7EEF3] pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#71869A]">Đã hiển thị {historyItems.length}/{history.data?.total ?? 0} thay đổi</span><div className="flex items-center gap-1"><button type="button" onClick={() => setHistoryPage((current) => Math.max(1, current - 1))} disabled={historyPage <= 1 || history.isFetching} className="rounded-md px-2.5 py-1.5 text-xs font-bold text-[#60758A] hover:bg-[#ECF8F7] disabled:opacity-40" aria-label="Trang lịch sử trước">‹</button><button type="button" onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} disabled={historyPage >= historyTotalPages || history.isFetching} className="rounded-md px-2.5 py-1.5 text-xs font-bold text-[#60758A] hover:bg-[#ECF8F7] disabled:opacity-40" aria-label="Trang lịch sử sau">›</button></div></div><button type="button" onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))} disabled={historyPage >= historyTotalPages || history.isFetching} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-[#F7FCFC] px-3 py-2 text-xs font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50">{history.isFetching ? "Đang tải thêm..." : historyPage >= historyTotalPages ? "Đã hiển thị toàn bộ" : "Tải thêm"}</button></div>}</div></aside></>;
}
