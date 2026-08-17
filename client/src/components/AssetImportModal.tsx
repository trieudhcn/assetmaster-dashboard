import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, LoaderCircle, Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { assetImportHeaders, parseAssetImportRows, type AssetImportCandidate, type AssetImportIssue } from "@/lib/assetImport";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";

type ParsedFile = ReturnType<typeof parseAssetImportRows> & { fileName: string; sourceRows: number; rawRows: Array<Record<string, unknown>> };
const exampleRow = ["Laptop mẫu", "Laptop", "Sẵn có", "", "Tốt", "15/08/2026", "25000000", "Nhà cung cấp mẫu", "", "SN-001", "Kho CNTT", "15/08/2028", "Điền một tài sản trên mỗi dòng"];

async function downloadTemplate() {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...assetImportHeaders], exampleRow]);
  sheet["!cols"] = [34, 18, 25, 38, 18, 22, 18, 26, 22, 20, 24, 25, 38].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(book, sheet, "Danh sách tài sản");
  const guide = XLSX.utils.aoa_to_sheet([["HƯỚNG DẪN IMPORT TÀI SẢN"], ["Cột có dấu * là bắt buộc. Không đổi tên dòng tiêu đề."], ["Mã tài sản được hệ thống tự sinh theo tiền tố của Phân loại. Hãy tạo Phân loại trước khi import."], ["Trạng thái chỉ nhận Sẵn có hoặc Bảo trì. Tài sản đang cấp phát phải được tạo qua Bàn giao."]]);
  guide["!cols"] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(book, guide, "Hướng dẫn");
  await writeBrandedWorkbook(book, {
    documentTitle: "TEMPLATE IMPORT TÀI SẢN",
    fileName: "AssetMaster-Template-Import-TaiSan.xlsx",
    description: "Mẫu nhập nhiều tài sản theo phân loại; mã tài sản được hệ thống tự sinh.",
  });
}

export function AssetImportModal({ onClose: closeModal, onImported }: { onClose: () => void; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [draftRows, setDraftRows] = useState<AssetImportCandidate[]>([]);
  const [serverIssues, setServerIssues] = useState<AssetImportIssue[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "reading" | "ready" | "importing" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isExportingErrors, setIsExportingErrors] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const onClose = () => {
    if (phase === "reading" || phase === "importing") return;
    if (parsed || draftRows.length || confirmStep > 0) {
      toast.warning("Đóng phiên import?", { description: "Dữ liệu xem trước chưa được nhập sẽ bị hủy.", action: { label: "Bỏ dữ liệu", onClick: closeModal } });
      return;
    }
    closeModal();
  };
  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const importModal = document.querySelector<HTMLElement>('[aria-label="Import tài sản từ Excel"]');
      const importContent = importModal?.firstElementChild;
      const confirmation = Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).find((element) => element.textContent?.includes("Xác nhận cập nhật hàng loạt"));
      if (confirmStep > 0 && confirmation && event.target === confirmation) { setConfirmStep(0); return; }
      if (confirmStep === 0 && phase !== "reading" && phase !== "importing" && importContent && !importContent.contains(target)) onClose();
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [confirmStep, phase, onClose]);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmStep > 0) { setConfirmStep(0); return; }
      if (phase !== "reading" && phase !== "importing") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmStep, phase, onClose]);
  const importMutation = trpc.assets.import.useMutation({
    onSuccess: (result) => { setServerIssues(result.errors); setConfirmStep(0); setProgress(100); setPhase("complete"); if (result.created || result.updated) { toast.success(`Đã tạo ${result.created} và cập nhật ${result.updated} tài sản.`); onImported(); } if (result.errors.length) toast.warning(`Có ${result.errors.length} dòng chưa được xử lý.`); },
    onError: (error) => { setPhase("ready"); setProgress(100); toast.error(error.message || "Không thể import tài sản."); },
  });
  const processFile = (file?: File) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { toast.error("Chỉ hỗ trợ tệp Excel định dạng .xlsx."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Tệp import không được vượt quá 2 MB."); return; }
    setParsed(null); setDraftRows([]); setServerIssues([]); setPreviewPage(1); setPhase("reading"); setProgress(8);
    const reader = new FileReader();
    reader.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.max(8, Math.min(72, Math.round((event.loaded / event.total) * 72)))); };
    reader.onload = () => { try { const book = XLSX.read(reader.result, { type: "array" }); const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: "", raw: false }); if (!rows.length) throw new Error("empty"); if (rows.length > 100) throw new Error("limit"); const result = parseAssetImportRows(rows); setParsed({ ...result, fileName: file.name, sourceRows: rows.length, rawRows: rows }); setDraftRows(result.candidates); setProgress(100); setPhase("ready"); } catch (error) { setPhase("idle"); setProgress(0); toast.error(error instanceof Error && error.message === "limit" ? "Mỗi lần chỉ import tối đa 100 tài sản." : "Không thể đọc tệp Excel. Hãy dùng template chuẩn."); } };
    reader.onerror = () => { setPhase("idle"); setProgress(0); toast.error("Không thể đọc tệp đã chọn."); };
    reader.readAsArrayBuffer(file);
  };
  const patchRow = (rowNumber: number, patch: Partial<AssetImportCandidate>) => setDraftRows((rows) => rows.map((row) => row.rowNumber === rowNumber ? { ...row, ...patch } : row));
  const draftIssues: AssetImportIssue[] = draftRows.flatMap((row) => {
    const messages: string[] = [];
    if (row.name.trim().length < 2 || row.category.trim().length < 2) messages.push("Tên tài sản và Phân loại phải có ít nhất 2 ký tự.");
    if (row.status === "maintenance" && !row.maintenanceReason?.trim()) messages.push("Tài sản Bảo trì cần có Lý do bảo trì.");
    return messages.map((message) => ({ rowNumber: row.rowNumber, message }));
  });
  const previewRows = draftRows.map((row) => ({ ...row, action: "create" as const }));
  const previewPageCount = Math.max(1, Math.ceil(previewRows.length / 10));
  const activePreviewPage = Math.min(previewPage, previewPageCount);
  const pagedPreviewRows = previewRows.slice((activePreviewPage - 1) * 10, activePreviewPage * 10);
  const creates = previewRows.filter((row) => row.action === "create").length;
  const updates = 0;
  const duplicates = 0;
  const rowsForImport = previewRows.map(({ action, ...row }) => row);
  const issues = [...(parsed?.issues || []), ...draftIssues, ...serverIssues];
  const exportErrors = () => {
    if (!parsed || !issues.length || isExportingErrors) return;
    setIsExportingErrors(true);
    const loadingToast = toast.loading("Đang tạo tệp Excel các dòng lỗi...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = issues.map((issue) => ({ ...(parsed.rawRows[issue.rowNumber - 2] || {}), "Dòng lỗi": issue.rowNumber, "Lý do lỗi": issue.message }));
        const book = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(book, sheet, "Dòng lỗi");
        await writeBrandedWorkbook(book, {
          documentTitle: "DANH SÁCH DÒNG LỖI IMPORT TÀI SẢN",
          fileName: `AssetMaster-Loi-Import-${new Date().toISOString().slice(0, 10)}.xlsx`,
          description: `${rows.length} dòng cần chỉnh sửa trước khi nhập lại vào hệ thống.`,
        });
        toast.success(`Đã xuất ${rows.length} dòng lỗi ra Excel.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất tệp Excel lỗi. Vui lòng thử lại.", { id: loadingToast });
      } finally {
        setIsExportingErrors(false);
      }
    })(); }, 180);
  };
  const doImport = () => { if (!rowsForImport.length || draftIssues.length) return; setPhase("importing"); setProgress(76); importMutation.mutate({ rows: rowsForImport, updateExisting }); };
  const isWorking = phase === "reading" || phase === "importing";
  const actionBadge = (action: "create" | "update" | "duplicate") => action === "create" ? <span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">Tạo mới</span> : action === "update" ? <span className="rounded-full bg-[#EAF3FF] px-2 py-1 text-[10px] font-extrabold text-[#2666A8]">Cập nhật</span> : <span className="rounded-full bg-[#FFF5DC] px-2 py-1 text-[10px] font-extrabold text-[#A86B00]">Trùng mã</span>;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Import tài sản từ Excel"><div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.24)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087A6A]"><FileSpreadsheet size={14} />Nhập dữ liệu hàng loạt</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Xem trước và chỉnh sửa import</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Mã tài sản được tạo tự động sau khi xác nhận, theo tiền tố Phân loại của từng dòng.</p></div><button onClick={onClose} disabled={isWorking} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8] disabled:opacity-50" aria-label="Đóng import Excel"><X size={18} /></button></div><div className="space-y-5 p-6"><section className="grid gap-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4 sm:grid-cols-[1fr_auto]"><div><div className="text-sm font-extrabold text-[#193B57]">1. Tải template chuẩn</div><p className="mt-1 text-xs text-[#4B8884]">Không cần nhập Mã tài sản; Phân loại quyết định tiền tố mã tự sinh.</p></div><button onClick={downloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A]"><Download size={15} />Tải template</button></section><section className="rounded-xl border border-dashed border-[#9ADBD3] bg-[#FBFEFD] p-4 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Upload size={19} /></div><div className="mt-2 text-sm font-extrabold text-[#193B57]">2. Chọn tệp Excel</div><button disabled={isWorking} onClick={() => inputRef.current?.click()} className="mt-3 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Chọn tệp Excel</button><input ref={inputRef} className="sr-only" type="file" accept=".xlsx" onChange={(event) => { processFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></section>{isWorking || phase === "complete" ? <section className="rounded-xl border border-[#CDE5E5] bg-[#F9FEFD] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]">{isWorking ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{phase === "reading" ? "Đang đọc và kiểm tra tệp..." : phase === "importing" ? "Đang lưu dữ liệu..." : "Đã hoàn tất xử lý tệp."}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DCEDEA]"><div className="h-full rounded-full bg-[#0F8C8C] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></section> : null}{phase === "reading" && <section className="overflow-hidden rounded-xl border border-[#DFE9F0] bg-white"><ModalTableSkeleton rows={6} columns={7} /></section>}{parsed && <section className="overflow-hidden rounded-xl border border-[#DFE9F0]"><div className="flex flex-col gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-extrabold text-[#193B57]"><Pencil size={14} className="text-[#0F8C8C]" />3. Chỉnh sửa và xem trước đầy đủ · {parsed.fileName}</div><p className="mt-1 text-[11px] text-[#71869A]">{parsed.sourceRows} dòng · dự kiến {creates} tạo mới. Mã sẽ sinh khi import.</p></div><span className="rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[10px] font-extrabold text-[#2666A8]">Nhấp vào ô để sửa</span></div><div className="max-h-[390px] overflow-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="sticky top-0 bg-white text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="px-3 py-3">Dòng</th><th className="px-3 py-3">Mã tự sinh</th><th className="px-3 py-3">Tên tài sản</th><th className="px-3 py-3">Phân loại</th><th className="px-3 py-3">Vị trí</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Lý do bảo trì</th><th className="px-3 py-3">Hành động</th></tr></thead><tbody>{pagedPreviewRows.map((row) => <tr key={row.rowNumber} className="border-t border-[#EDF2F5]"><td className="px-3 py-2.5 font-mono text-[#0F8C8C]">{row.rowNumber}</td><td className="px-3 py-2 font-mono text-[11px] font-bold text-[#8AA0B6]">Tự sinh</td><td className="px-3 py-2"><input value={row.name} onChange={(event) => patchRow(row.rowNumber, { name: event.target.value })} className="h-8 w-48 rounded border border-[#DDE7F0] px-2 font-semibold text-[#193B57] focus:border-[#0F8C8C] focus:outline-none" /></td><td className="px-3 py-2"><input value={row.category} onChange={(event) => patchRow(row.rowNumber, { category: event.target.value })} className="h-8 w-36 rounded border border-[#DDE7F0] px-2 text-[#60758A] focus:border-[#0F8C8C] focus:outline-none" /></td><td className="px-3 py-2"><input value={row.location || ""} onChange={(event) => patchRow(row.rowNumber, { location: event.target.value || null })} className="h-8 w-36 rounded border border-[#DDE7F0] px-2 text-[#60758A] focus:border-[#0F8C8C] focus:outline-none" /></td><td className="px-3 py-2"><SearchableSelect value={row.status} onChange={(value) => patchRow(row.rowNumber, { status: value as "available" | "maintenance", maintenanceReason: value === "maintenance" ? row.maintenanceReason : null })} className="min-w-[150px]" searchPlaceholder="Tìm trạng thái..." options={[{ value: "available", label: "Sẵn có" }, { value: "maintenance", label: "Bảo trì" }]} /></td><td className="px-3 py-2"><input disabled={row.status !== "maintenance"} value={row.maintenanceReason || ""} onChange={(event) => patchRow(row.rowNumber, { maintenanceReason: event.target.value || null })} placeholder={row.status === "maintenance" ? "Bắt buộc" : "—"} className="h-8 w-48 rounded border border-[#DDE7F0] px-2 text-[#60758A] disabled:bg-[#F6F8FA] focus:border-[#0F8C8C] focus:outline-none" /></td><td className="px-3 py-2">{actionBadge(row.action)}</td></tr>)}</tbody></table></div>{previewRows.length > 0 && <div className="flex flex-col gap-2 border-t border-[#E7EEF3] bg-[#FBFCFD] px-4 py-2.5 text-[11px] text-[#60758A] sm:flex-row sm:items-center sm:justify-between"><span>Hiển thị {(activePreviewPage - 1) * 10 + 1}–{Math.min(activePreviewPage * 10, previewRows.length)} / {previewRows.length} dòng</span><div className="flex items-center gap-2"><button type="button" aria-label="Trang preview import tài sản trước" disabled={activePreviewPage <= 1} onClick={() => setPreviewPage((page) => Math.max(1, page - 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /></button><span className="min-w-[64px] text-center font-bold text-[#193B57]">{activePreviewPage}/{previewPageCount}</span><button type="button" aria-label="Trang preview import tài sản sau" disabled={activePreviewPage >= previewPageCount} onClick={() => setPreviewPage((page) => Math.min(previewPageCount, page + 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={14} /></button></div></div>}</section>}{issues.length > 0 && <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs font-extrabold text-[#8F5A00]"><AlertTriangle size={15} />Các dòng cần xử lý</div><button onClick={exportErrors} disabled={isExportingErrors} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#E7C981] bg-white px-3 py-2 text-xs font-bold text-[#A86B00] disabled:cursor-not-allowed disabled:opacity-60"><Download size={14} className={isExportingErrors ? "animate-pulse" : ""} />{isExportingErrors ? "Đang xuất..." : "Xuất Excel lỗi"}</button></div><div className="mt-3 max-h-28 space-y-1 overflow-auto text-xs leading-5 text-[#9B7131]">{issues.slice(0, 20).map((issue, index) => <div key={`${issue.rowNumber}-${index}`}><b>Dòng {issue.rowNumber}:</b> {issue.message}</div>)}</div></section>}<div className="flex flex-col-reverse justify-end gap-2 border-t border-[#E7EEF3] pt-4 sm:flex-row"><button onClick={onClose} disabled={isWorking} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button disabled={!rowsForImport.length || isWorking || draftIssues.length > 0} onClick={doImport} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Upload size={15} />{phase === "importing" ? "Đang import..." : `Import ${rowsForImport.length} tài sản`}</button></div></div></div></div>;
}
