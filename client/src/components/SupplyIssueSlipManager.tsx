import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { BarChart3, Building2, Download, FileText, Printer, RotateCcw, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { openSupplyIssueSlipPdf } from "@/lib/supplyIssueSlipPdf";
import { SearchableSelect } from "@/components/SearchableSelect";

const numberText = (value: string | number | null | undefined) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

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
  const itemsQuery = trpc.supplies.issueSlipItems.useQuery({ issueSlipId: selectedSlipId || 0 }, { enabled: selectedSlipId !== null });
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
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-y border-[#E7EEF3] bg-[#F8FBFC] text-[10px] uppercase tracking-[.09em] text-[#8AA0B6]"><tr><th className="px-3 py-3">Mã phiếu</th><th className="px-3 py-3">Người nhận</th><th className="px-3 py-3">Thời gian cấp</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody>{slipsQuery.isLoading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-[#71869A]">Đang tải phiếu cấp phát...</td></tr> : (slipsQuery.data || []).map((slip) => <tr key={slip.id} className="border-b border-[#EDF2F5]"><td className="px-3 py-3 font-mono font-extrabold text-[#193B57]">{slip.referenceCode}</td><td className="px-3 py-3 text-[#60758A]">{slip.recipientName}</td><td className="px-3 py-3 text-[#60758A]">{new Date(slip.issuedAt).toLocaleString("vi-VN")}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${slip.status === "returned" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{slip.status === "returned" ? "Đã hoàn trả" : "Đang cấp phát"}</span></td><td className="px-3 py-3 text-right"><button type="button" onClick={() => setSelectedSlipId(slip.id)} className="rounded-lg border border-[#DDE7F0] px-3 py-1.5 font-extrabold text-[#60758A] hover:bg-[#F7FAFC]">Chi tiết</button></td></tr>)}{!slipsQuery.isLoading && !(slipsQuery.data || []).length && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#8AA0B6]">Chưa có phiếu cấp phát. Tạo phiếu từ thao tác Xuất/Cấp phát của phụ kiện.</td></tr>}</tbody></table></div>
    {issueSlipDrawer}
    {returnDialog}
  </section>;
}

type SupplyAnalyticsRow = { recipientName: string; departmentName: string | null; issuedQuantity: number | string; returnedQuantity: number | string; outstandingQuantity: number | string };

function SupplyIssueAnalytics({ rows, loading }: { rows: SupplyAnalyticsRow[]; loading: boolean }) {
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
      if (mode === "recipient" && key !== selectedEmployee?.label) return;
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
