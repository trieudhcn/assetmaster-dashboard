import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, X } from "lucide-react";

export type ExportPreviewPayload = {
  blob: Blob;
  fileName: string;
  title: string;
  kind: "pdf" | "excel";
};

const exportPreviewEvent = "assetmaster:preview-export";

export function openExportPreview(payload: ExportPreviewPayload) {
  window.dispatchEvent(new CustomEvent<ExportPreviewPayload>(exportPreviewEvent, { detail: payload }));
}

function downloadPreviewFile(payload: ExportPreviewPayload) {
  const url = URL.createObjectURL(payload.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExportPreviewHost() {
  const [payload, setPayload] = useState<ExportPreviewPayload | null>(null);
  const [excelPreview, setExcelPreview] = useState<{ sheets: string[]; rows: unknown[][]; activeSheet: string } | null>(null);
  const [excelPreviewPage, setExcelPreviewPage] = useState(1);
  const fileUrl = useMemo(() => payload?.kind === "pdf" ? URL.createObjectURL(payload.blob) : null, [payload]);

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  useEffect(() => {
    const handlePreview = (event: Event) => setPayload((event as CustomEvent<ExportPreviewPayload>).detail);
    window.addEventListener(exportPreviewEvent, handlePreview);
    return () => window.removeEventListener(exportPreviewEvent, handlePreview);
  }, []);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPayload(null); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);
  useEffect(() => {
    if (!payload || payload.kind !== "excel") { setExcelPreview(null); setExcelPreviewPage(1); return; }
    let active = true;
    payload.blob.arrayBuffer().then((buffer) => {
      const workbook = XLSX.read(buffer, { type: "array" });
      const previewSheetName = workbook.SheetNames.find((sheetName) => sheetName === "Danh sách kiểm kê") || workbook.SheetNames.find((sheetName) => sheetName !== "Thông tin doanh nghiệp") || workbook.SheetNames[0] || "";
      const previewSheet = workbook.Sheets[previewSheetName];
      const rows = previewSheet ? XLSX.utils.sheet_to_json<unknown[]>(previewSheet, { header: 1, defval: "" }).map((row) => row.slice(0, 12)) : [];
      if (active) { setExcelPreview({ sheets: workbook.SheetNames, rows, activeSheet: previewSheetName }); setExcelPreviewPage(1); }
    }).catch(() => { if (active) { setExcelPreview({ sheets: [], rows: [], activeSheet: "" }); setExcelPreviewPage(1); } });
    return () => { active = false; };
  }, [payload]);

  if (!payload) return null;
  const close = () => setPayload(null);
  const excelPreviewPageCount = Math.max(1, Math.ceil((excelPreview?.rows.length || 0) / 10));
  const activeExcelPreviewPage = Math.min(excelPreviewPage, excelPreviewPageCount);
  const pagedExcelRows = excelPreview?.rows.slice((activeExcelPreviewPage - 1) * 10, activeExcelPreviewPage * 10) || [];
  const Icon = payload.kind === "pdf" ? FileText : FileSpreadsheet;
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102A43]/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Xem trước ${payload.title}`}>
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_26px_70px_rgba(16,42,67,0.28)]">
      <div className="flex items-start justify-between gap-4 border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="flex min-w-0 gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${payload.kind === "pdf" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#E6F6F2] text-[#087A6A]"}`}><Icon size={19} /></div><div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">Xem trước trước khi tải</div><h2 className="mt-1 truncate font-display text-lg font-extrabold text-[#102A43]">{payload.title}</h2><p className="mt-1 truncate text-[11px] text-[#71869A]">{payload.fileName}</p></div></div><button onClick={close} className="rounded-lg p-2 text-[#71869A] hover:bg-[#F0F5F8]" aria-label="Đóng xem trước file"><X size={18} /></button></div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#F4F7FB] p-4 sm:p-5">{payload.kind === "pdf" ? <iframe title={`Xem trước ${payload.title}`} src={fileUrl || undefined} className="h-[68vh] w-full rounded-xl border border-[#DDE7F0] bg-white" /> : <div className="overflow-hidden rounded-xl border border-[#DDE7F0] bg-white"><div className="flex flex-wrap gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3">{excelPreview?.sheets.map((sheet, index) => <span key={sheet} className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${sheet === excelPreview?.activeSheet ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#F0F5F8] text-[#60758A]"}`}>{sheet}</span>) || <span className="text-xs text-[#71869A]">Đang đọc workbook...</span>}</div><div className="overflow-auto"><table className="w-full min-w-[720px] text-left text-xs"><tbody>{pagedExcelRows.map((row, rowIndex) => <tr key={(activeExcelPreviewPage - 1) * 10 + rowIndex} className={`border-b border-[#EDF2F5] ${(activeExcelPreviewPage - 1) * 10 + rowIndex === 0 ? "bg-[#F4FBFA] font-extrabold text-[#193B57]" : "text-[#527089]"}`}>{Array.from({ length: Math.max(1, excelPreview?.rows[0]?.length || 1) }, (_, cellIndex) => <td key={cellIndex} className="max-w-[260px] truncate px-3 py-2.5">{String(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table>{excelPreview && excelPreview.rows.length > 0 && <div className="flex flex-col gap-2 border-t border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2.5 text-[11px] text-[#60758A] sm:flex-row sm:items-center sm:justify-between"><span>Hiển thị {(activeExcelPreviewPage - 1) * 10 + 1}–{Math.min(activeExcelPreviewPage * 10, excelPreview.rows.length)} / {excelPreview.rows.length} dòng</span><div className="flex items-center gap-2"><button type="button" aria-label="Trang preview Excel trước" disabled={activeExcelPreviewPage <= 1} onClick={() => setExcelPreviewPage((page) => Math.max(1, page - 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /></button><span className="min-w-[64px] text-center font-bold text-[#193B57]">{activeExcelPreviewPage}/{excelPreviewPageCount}</span><button type="button" aria-label="Trang preview Excel sau" disabled={activeExcelPreviewPage >= excelPreviewPageCount} onClick={() => setExcelPreviewPage((page) => Math.min(excelPreviewPageCount, page + 1))} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#DDE7F0] bg-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={14} /></button></div></div>}{excelPreview && excelPreview.rows.length === 0 && <div className="px-5 py-12 text-center text-sm text-[#71869A]">Không thể hiển thị nội dung xem trước, nhưng bạn vẫn có thể tải file.</div>}</div></div>}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-[#E7EEF3] px-5 py-4 sm:flex-row sm:justify-end"><button onClick={close} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Quay lại</button><button onClick={() => { downloadPreviewFile(payload); close(); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Download size={15} />Tải file</button></div>
    </div>
  </div>;
}
