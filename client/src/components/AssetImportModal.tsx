import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { assetImportHeaders, parseAssetImportRows, type AssetImportIssue } from "@/lib/assetImport";

type ParsedFile = ReturnType<typeof parseAssetImportRows> & { fileName: string; sourceRows: number };

const exampleRow = ["TS-2026-001", "Laptop mẫu", "CNTT", "Sẵn có", "", "Tốt", "15/08/2026", "25000000", "Nhà cung cấp mẫu", "", "SN-001", "Kho CNTT", "15/08/2028", "Điền một tài sản trên mỗi dòng"];

function downloadTemplate() {
  const workbook = XLSX.utils.book_new();
  const template = XLSX.utils.aoa_to_sheet([[...assetImportHeaders], exampleRow]);
  template["!cols"] = [{ wch: 18 }, { wch: 34 }, { wch: 18 }, { wch: 25 }, { wch: 38 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 25 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(workbook, template, "Danh sách tài sản");
  const guide = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN IMPORT TÀI SẢN"],
    ["Cột có dấu * là bắt buộc. Không đổi tên dòng tiêu đề của sheet Danh sách tài sản."],
    ["Trạng thái chỉ nhận Sẵn có hoặc Bảo trì. Tài sản đang cấp phát phải được tạo qua quy trình Bàn giao để bảo đảm lịch sử người nhận."],
    ["Tình trạng: Tốt, Khá, Cần kiểm tra hoặc Hư hỏng."],
    ["Ngày mua và Hạn bảo hành dùng định dạng dd/mm/yyyy. Giá trị chỉ nhập số, không dùng dấu phân cách."],
    ["Nếu điền Hãng, hãng phải đã tồn tại và đang hoạt động trong mục Nhà cung cấp & Hãng."],
  ]);
  guide["!cols"] = [{ wch: 112 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Hướng dẫn");
  XLSX.writeFile(workbook, "AssetMaster-Template-Import-TaiSan.xlsx");
}

export function AssetImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [serverIssues, setServerIssues] = useState<AssetImportIssue[]>([]);
  const importMutation = trpc.assets.import.useMutation({
    onSuccess: (result) => {
      setServerIssues(result.errors);
      if (result.created) {
        toast.success(`Đã import ${result.created} tài sản vào hệ thống.`);
        onImported();
      }
      if (result.errors.length) toast.warning(`Có ${result.errors.length} dòng chưa được import. Vui lòng xem chi tiết.`);
    },
    onError: (error) => toast.error(error.message || "Không thể import tài sản."),
  });
  const processFile = (file?: File) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { toast.error("Chỉ hỗ trợ tệp Excel định dạng .xlsx."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Tệp import không được vượt quá 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
        if (!rows.length) { toast.error("Sheet đầu tiên chưa có dòng dữ liệu để import."); return; }
        if (rows.length > 100) { toast.error("Mỗi lần chỉ import tối đa 100 tài sản."); return; }
        const result = parseAssetImportRows(rows);
        setServerIssues([]);
        setParsed({ ...result, fileName: file.name, sourceRows: rows.length });
      } catch {
        toast.error("Không thể đọc tệp Excel. Hãy sử dụng template chuẩn của AssetMaster.");
      }
    };
    reader.onerror = () => toast.error("Không thể đọc tệp đã chọn.");
    reader.readAsArrayBuffer(file);
  };
  const issues = [...(parsed?.issues || []), ...serverIssues];
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Import tài sản từ Excel"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.24)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087A6A]"><FileSpreadsheet size={14} />Nhập dữ liệu hàng loạt</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Import tài sản từ Excel</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Tải template chuẩn, điền dữ liệu và kiểm tra kết quả trước khi lưu vào Danh mục.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng import Excel"><X size={18} /></button></div><div className="space-y-5 p-6"><section className="grid gap-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4 sm:grid-cols-[1fr_auto]"><div><div className="text-sm font-extrabold text-[#193B57]">1. Tải template chuẩn</div><p className="mt-1 text-xs leading-5 text-[#4B8884]">Template gồm sheet nhập dữ liệu, một dòng ví dụ và hướng dẫn định dạng các trường.</p></div><button onClick={downloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#F7FFFE]"><Download size={15} />Tải template</button></section><section className="rounded-xl border border-dashed border-[#9ADBD3] bg-[#FBFEFD] p-5 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Upload size={20} /></div><div className="mt-3 text-sm font-extrabold text-[#193B57]">2. Chọn tệp Excel đã điền</div><p className="mt-1 text-xs text-[#71869A]">Chỉ nhận .xlsx, tối đa 2 MB và 100 dòng mỗi lần import.</p><button onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A]">Chọn tệp Excel</button><input ref={inputRef} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { processFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></section>{parsed && <section className="overflow-hidden rounded-xl border border-[#DFE9F0]"><div className="flex flex-col gap-3 border-b border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold text-[#193B57]">{parsed.fileName}</div><p className="mt-1 text-[11px] text-[#71869A]">{parsed.sourceRows} dòng đọc được · {parsed.candidates.length} dòng hợp lệ trước khi kiểm tra trên hệ thống.</p></div><span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold ${issues.length ? "bg-[#FFF5DC] text-[#A86B00]" : "bg-[#E6F6F2] text-[#087A6A]"}`}>{issues.length ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{issues.length ? `${issues.length} cần xử lý` : "Sẵn sàng import"}</span></div><div className="max-h-52 overflow-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-white text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="px-4 py-3">Dòng</th><th className="px-3 py-3">Mã tài sản</th><th className="px-3 py-3">Tên tài sản</th><th className="px-4 py-3">Trạng thái</th></tr></thead><tbody>{parsed.candidates.slice(0, 8).map((row) => <tr key={row.rowNumber} className="border-t border-[#EDF2F5]"><td className="px-4 py-2.5 font-mono text-[#0F8C8C]">{row.rowNumber}</td><td className="px-3 py-2.5 font-mono text-[#60758A]">{row.assetCode}</td><td className="px-3 py-2.5 font-semibold text-[#193B57]">{row.name}</td><td className="px-4 py-2.5"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.status === "maintenance" ? "bg-[#FFF5DC] text-[#A86B00]" : "bg-[#E6F6F2] text-[#087A6A]"}`}>{row.status === "maintenance" ? "Bảo trì" : "Sẵn có"}</span></td></tr>)}</tbody></table></div></section>}{issues.length > 0 && <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4"><div className="flex items-center gap-2 text-xs font-extrabold text-[#8F5A00]"><AlertTriangle size={15} />Các dòng chưa thể import</div><div className="mt-3 max-h-32 space-y-1 overflow-auto text-xs leading-5 text-[#9B7131]">{issues.slice(0, 20).map((issue, index) => <div key={`${issue.rowNumber}-${index}`}><b>Dòng {issue.rowNumber}:</b> {issue.message}</div>)}</div></section>}<div className="flex flex-col-reverse justify-end gap-2 border-t border-[#E7EEF3] pt-4 sm:flex-row"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng</button><button disabled={!parsed?.candidates.length || importMutation.isPending} onClick={() => parsed && importMutation.mutate({ rows: parsed.candidates })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Upload size={15} />{importMutation.isPending ? "Đang import..." : `Import ${parsed?.candidates.length || 0} tài sản hợp lệ`}</button></div></div></div></div>;
}
