import {
  Clock3,
  Download,
  History,
  PackageCheck,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { openSupplyReturnReceiptPdf } from "@/lib/supplyReturnReceiptPdf";

type SupplyTab = "holding" | "returns";

type EmployeeSupplyHoldingsPanelProps = {
  history: any[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

function formatDate(value: Date | string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "Chưa cập nhật";
}

function numberText(value: number | string) {
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function statusPresentation(status: string) {
  if (status === "pending") return { label: "Đang chờ duyệt", className: "border-[#F0DCA4] bg-[#FFF7E2] text-[#9A6800]" };
  if (status === "approved") return { label: "Đã hoàn trả", className: "border-[#B8E9DD] bg-[#ECF8F7] text-[#087A6A]" };
  if (status === "rejected") return { label: "Bị từ chối", className: "border-[#F1CCCC] bg-[#FFF4F4] text-[#B44545]" };
  return { label: "Đã hủy", className: "border-[#DDE7F0] bg-[#F7FAFC] text-[#71869A]" };
}

function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${active ? "bg-white text-[#087A6A] shadow-sm ring-1 ring-[#CDE5E5]" : "text-[#71869A] hover:bg-white/70 hover:text-[#193B57]"}`}
    >
      {label}
      <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-[#E6F6F2]" : "bg-[#E8EEF3]"}`}>{count}</span>
    </button>
  );
}

export function EmployeeSupplyHoldingsPanel({ history, isLoading, isError, onRetry }: EmployeeSupplyHoldingsPanelProps) {
  const utils = trpc.useUtils();
  const returnRequestsQuery = trpc.supplies.myReturnRequests.useQuery(undefined, { refetchInterval: 30_000 });
  const [activeTab, setActiveTab] = useState<SupplyTab>("holding");
  const [returnTarget, setReturnTarget] = useState<any | null>(null);
  const createReturnRequest = trpc.supplies.createReturnRequest.useMutation({
    onSuccess: result => {
      toast.success(`Đã gửi yêu cầu hoàn trả ${result.requestCode}.`);
      setReturnTarget(null);
      setActiveTab("returns");
      void utils.supplies.myReturnRequests.invalidate();
    },
    onError: error => toast.error(error.message || "Không thể gửi yêu cầu hoàn trả phụ kiện."),
  });
  const cancelReturnRequest = trpc.supplies.cancelReturnRequest.useMutation({
    onSuccess: () => {
      toast.success("Đã hủy yêu cầu hoàn trả phụ kiện.");
      void utils.supplies.myReturnRequests.invalidate();
    },
    onError: error => toast.error(error.message || "Không thể hủy yêu cầu hoàn trả."),
  });

  const grouped = new Map<string, any>();
  history.forEach(entry => {
    const outstanding = Math.max(0, Number(entry.issuedQuantity || 0) - Number(entry.returnedQuantity || 0));
    if (!outstanding) return;
    const key = `${entry.source || "issue-slip"}-${entry.issueSlipId}`;
    const group = grouped.get(key) || { ...entry, key, items: [] };
    group.items.push({ ...entry, outstanding });
    grouped.set(key, group);
  });
  const slips: any[] = Array.from(grouped.values());
  const totalOutstanding = slips.reduce((total, slip) => total + slip.items.reduce((sum: number, item: any) => sum + item.outstanding, 0), 0);
  const supplyTotals = Array.from(
    slips.reduce<Map<string, { supplyCode: string; supplyName: string; unit: string; quantity: number }>>((totals, slip) => {
      slip.items.forEach((item: any) => {
        const current = totals.get(item.supplyCode) || { supplyCode: item.supplyCode, supplyName: item.supplyName, unit: item.unit, quantity: 0 };
        current.quantity += item.outstanding;
        totals.set(item.supplyCode, current);
      });
      return totals;
    }, new Map()).values()
  );
  const returnRequests = returnRequestsQuery.data || [];
  const pendingRequestFor = (slip: any) => returnRequests.find(request => request.sourceId === slip.issueSlipId && request.sourceType === (slip.source === "handover" ? "handover" : "issue_slip") && request.status === "pending");

  return (
    <>
      <section id="employee-supplies" className="mt-6 scroll-mt-6 overflow-hidden rounded-2xl border border-[#CDE5E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]">
        <div className="border-b border-[#DCEDEA] px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-base font-extrabold text-[#193B57]"><PackageCheck size={18} className="text-[#0F8C8C]" />Phụ kiện của bạn</div>
              <p className="mt-1 text-xs leading-5 text-[#71869A]">Theo dõi số lượng đang giữ và toàn bộ yêu cầu hoàn trả trong cùng một khu vực.</p>
            </div>
            <div className="flex gap-2 text-center">
              <div className="rounded-xl bg-[#E6F6F2] px-3 py-2"><div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]">Đang giữ</div><div className="mt-0.5 font-display text-lg font-extrabold text-[#087A6A]">{numberText(totalOutstanding)}</div></div>
              <div className="rounded-xl bg-[#EAF3FF] px-3 py-2"><div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#4A79A9]">Hoàn trả</div><div className="mt-0.5 font-display text-lg font-extrabold text-[#2666A8]">{returnRequests.length}</div></div>
            </div>
          </div>
          <div role="tablist" aria-label="Phụ kiện của bạn" className="mt-4 inline-flex rounded-xl bg-[#F0F5F8] p-1">
            <TabButton active={activeTab === "holding"} label="Đang giữ" count={slips.length} onClick={() => setActiveTab("holding")} />
            <TabButton active={activeTab === "returns"} label="Hoàn trả" count={returnRequests.length} onClick={() => setActiveTab("returns")} />
          </div>
          {activeTab === "holding" && supplyTotals.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {supplyTotals.map(item => <span key={item.supplyCode} className="rounded-full border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-1.5 text-[11px] font-bold text-[#526779]">{item.supplyName}: <b className="text-[#087A6A]">{numberText(item.quantity)} {item.unit}</b></span>)}
            </div>
          ) : null}
        </div>

        {activeTab === "holding" ? (
          isLoading ? <div className="px-6 py-12 text-center text-sm text-[#71869A]">Đang tải phụ kiện được cấp...</div> :
          isError ? <div className="px-6 py-12 text-center"><div className="text-sm font-bold text-[#B44545]">Không thể tải phụ kiện đã cấp.</div><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]">Thử lại</button></div> :
          slips.length ? (
            <div role="tabpanel" className="divide-y divide-[#EDF2F5]">
              {slips.map(slip => {
                const pendingRequest = pendingRequestFor(slip);
                const returnable = slip.items.some((item: any) => Number.isInteger(item.sourceItemId));
                return (
                  <article key={slip.key} className="px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div><div className="text-sm font-extrabold text-[#193B57]">{slip.referenceCode}</div><div className="mt-1 text-[11px] text-[#71869A]">{slip.source === "handover" ? "Bàn giao ngày" : "Cấp phát ngày"} {formatDate(slip.issuedAt)}</div></div>
                      {pendingRequest ? (
                        <button type="button" onClick={() => setActiveTab("returns")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0DCA4] bg-[#FFF7E2] px-3 py-2 text-[10px] font-extrabold text-[#9A6800]"><Clock3 size={13} />Đang chờ duyệt · Xem</button>
                      ) : (
                        <button type="button" disabled={!returnable} title={returnable ? "Tạo yêu cầu hoàn trả phụ kiện về kho" : "Dữ liệu cấp phát cũ chưa có dòng phiếu để hoàn tự động"} onClick={() => setReturnTarget(slip)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-[10px] font-extrabold text-[#087A6A] hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw size={13} />Yêu cầu hoàn trả</button>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      {slip.items.map((item: any) => <div key={`${slip.key}-${item.supplyCode}-${item.sourceItemId || "legacy"}`} className="flex items-start justify-between gap-4 rounded-xl bg-[#F7FAFC] p-3 text-xs"><div className="min-w-0"><div className="font-extrabold text-[#193B57]">{item.supplyName}</div><div className="mt-1 font-mono text-[10px] font-bold text-[#0F8C8C]">{item.supplyCode}</div></div><div className="shrink-0 text-right text-[#60758A]">Còn <b className="text-[#087A6A]">{numberText(item.outstanding)}</b> {item.unit}<div className="mt-1 text-[10px] text-[#8AA0B6]">Đã cấp {numberText(item.issuedQuantity)} · Đã trả {numberText(item.returnedQuantity)}</div></div></div>)}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><PackageCheck size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Bạn chưa được cấp phụ kiện nào</div><p className="mt-1 text-xs text-[#71869A]">Khi có phụ kiện được cấp hoặc bàn giao, thông tin sẽ xuất hiện tại đây.</p></div>
        ) : returnRequestsQuery.isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-[#71869A]">Đang tải lịch sử hoàn trả...</div>
        ) : returnRequestsQuery.isError ? (
          <div className="px-6 py-12 text-center"><div className="text-sm font-bold text-[#B44545]">Không thể tải yêu cầu hoàn trả.</div><button type="button" onClick={() => void returnRequestsQuery.refetch()} className="mt-3 rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]">Thử lại</button></div>
        ) : returnRequests.length ? (
          <div role="tabpanel" className="divide-y divide-[#EDF2F5]">
            {returnRequests.map(request => {
              const status = statusPresentation(request.status);
              return (
                <article key={request.id} className="px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-extrabold text-[#193B57]">{request.requestCode}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${status.className}`}>{status.label}</span></div><div className="mt-1 text-[11px] text-[#71869A]">Nguồn {request.sourceReferenceCode} · Gửi ngày {formatDate(request.createdAt)}</div></div>
                    <div className="flex flex-wrap gap-2">
                      {request.status === "pending" ? <button type="button" disabled={cancelReturnRequest.isPending} onClick={() => cancelReturnRequest.mutate({ id: request.id })} className="rounded-lg border border-[#F1CCCC] bg-white px-3 py-2 text-[10px] font-extrabold text-[#B44545] hover:bg-[#FFF4F4] disabled:opacity-50">Hủy yêu cầu</button> : null}
                      {request.status === "approved" && request.returnReceiptCode ? <button type="button" onClick={() => void openSupplyReturnReceiptPdf(request, request.items).catch(error => toast.error(error instanceof Error ? error.message : "Không thể mở biên bản hoàn trả."))} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#B8E9DD] bg-white px-3 text-[10px] font-extrabold text-[#087A6A]"><Download size={13} />Biên bản PDF</button> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {request.items.map((item: any) => <div key={item.id} className="rounded-xl bg-[#F7FAFC] p-3 text-[11px]"><div className="font-extrabold text-[#193B57]">{item.supplyName}</div><div className="mt-1 text-[#71869A]">Yêu cầu trả <b className="text-[#193B57]">{numberText(item.requestedQuantity)} {item.unit}</b></div>{request.status === "approved" ? <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#60758A]"><span>Tốt {numberText(item.goodQuantity)}</span><span>Hỏng {numberText(item.damagedQuantity)}</span><span>Thiếu {numberText(item.missingQuantity)}</span><span>Cần sửa {numberText(item.repairQuantity)}</span></div> : null}</div>)}
                  </div>
                  {request.note || request.reviewNote ? <div className="mt-3 rounded-lg bg-[#F7FAFC] px-3 py-2 text-[11px] leading-5 text-[#71869A]">{request.note ? <div><b className="text-[#526779]">Ghi chú:</b> {request.note}</div> : null}{request.reviewNote ? <div><b className="text-[#526779]">Phản hồi:</b> {request.reviewNote}</div> : null}</div> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><History size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">Chưa có yêu cầu hoàn trả phụ kiện</div><p className="mt-1 text-xs text-[#71869A]">Các yêu cầu và biên bản hoàn trả sẽ được lưu tại đây.</p></div>
        )}
      </section>
      {returnTarget ? <SupplyReturnRequestDialog slip={returnTarget} pending={createReturnRequest.isPending} onClose={() => setReturnTarget(null)} onSubmit={(items, note) => createReturnRequest.mutate({ sourceType: returnTarget.source === "handover" ? "handover" : "issue-slip", sourceId: returnTarget.issueSlipId, note: note || null, items })} /> : null}
    </>
  );
}

function SupplyReturnRequestDialog({ slip, pending, onClose, onSubmit }: { slip: any; pending: boolean; onClose: () => void; onSubmit: (items: Array<{ sourceItemId: number; quantity: number }>, note: string) => void }) {
  const returnableItems = slip.items.filter((item: any) => Number.isInteger(item.sourceItemId));
  const [quantities, setQuantities] = useState<Record<number, string>>(() => Object.fromEntries(returnableItems.map((item: any) => [item.sourceItemId, String(item.outstanding)])));
  const [note, setNote] = useState("");
  const rows = returnableItems.map((item: any) => {
    const quantity = Number(quantities[item.sourceItemId] || 0);
    return { item, quantity, valid: Number.isFinite(quantity) && quantity >= 0 && quantity <= item.outstanding };
  });
  const canSubmit = rows.some(row => row.quantity > 0) && rows.every(row => row.valid);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#DDE7F0] bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E7EEF3] px-5 py-5"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Hoàn trả phụ kiện về kho</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">{slip.referenceCode}</h2><p className="mt-1 text-xs text-[#71869A]">Chọn số lượng thực tế muốn hoàn. Kho chỉ được cộng sau khi quản trị viên duyệt.</p></div><button type="button" onClick={onClose} disabled={pending} className="rounded-lg p-2 text-[#71869A] hover:bg-[#F0F5F8]"><X size={17} /></button></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {rows.map(({ item, quantity, valid }) => <div key={item.sourceItemId} className={`grid gap-3 rounded-xl border bg-[#F8FBFC] p-3 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-end ${valid ? "border-[#E3EDF2]" : "border-[#F2B7B7]"}`}><div><div className="text-xs font-extrabold text-[#193B57]">{item.supplyName}</div><div className="mt-1 text-[10px] text-[#71869A]">{item.supplyCode} · Đang giữ {numberText(item.outstanding)} {item.unit}</div></div><label><span className="text-[10px] font-bold text-[#60758A]">Số lượng hoàn</span><input type="number" min="0" max={item.outstanding} step="any" value={quantities[item.sourceItemId] || ""} onChange={event => setQuantities(current => ({ ...current, [item.sourceItemId]: event.target.value }))} className="field-input mt-1 text-right font-extrabold text-[#087A6A]" /></label></div>)}
          <label className="block"><span className="text-[10px] font-bold text-[#60758A]">Ghi chú hoàn trả</span><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} placeholder="Ví dụ: Không còn nhu cầu sử dụng, phụ kiện còn tốt..." className="field-input mt-1 min-h-[80px] resize-y" /></label>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-[#E7EEF3] px-5 py-4"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button type="button" disabled={!canSubmit || pending} onClick={() => onSubmit(rows.filter(row => row.quantity > 0).map(row => ({ sourceItemId: row.item.sourceItemId, quantity: row.quantity })), note.trim())} className="inline-flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-45"><Send size={14} />{pending ? "Đang gửi..." : "Gửi yêu cầu hoàn trả"}</button></div>
      </div>
    </div>
  );
}
