import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Info, Search, ShieldCheck, UsersRound, X } from "lucide-react";

type ExistingEmployee = { id: number; name: string | null; email: string | null };
type SyncState = "matched" | "review" | "new" | "invalid";
type PreviewRecord = { sourceId: string; employeeCode: string; displayName: string; upn: string; jobTitle: string; department: string; branch: string; state: SyncState; matchedEmployee?: ExistingEmployee };

const stateMeta: Record<SyncState, { label: string; className: string }> = {
  matched: { label: "Khớp email", className: "bg-[#E6F6F2] text-[#087A6A]" },
  review: { label: "Cần đối chiếu", className: "bg-[#FFF3D6] text-[#A86B00]" },
  new: { label: "Nhân sự mới", className: "bg-[#EAF3FF] text-[#2666A8]" },
  invalid: { label: "Thiếu UPN/email", className: "bg-[#FDEDEE] text-[#B44545]" },
};

const activeDirectoryCsvTemplate = "\uFEFFemployeeId,userPrincipalName,displayName,jobTitle,department,officeLocation,id\nNV-MAU-001,nhan.su.mau@example.com,Nhân sự mẫu,Chức vụ mẫu,Phòng ban mẫu,Chi nhánh mẫu,00000000-0000-0000-0000-000000000000\n";
const activeDirectoryJsonTemplate = JSON.stringify([{ employeeId: "NV-MAU-001", userPrincipalName: "nhan.su.mau@example.com", displayName: "Nhân sự mẫu", jobTitle: "Chức vụ mẫu", department: "Phòng ban mẫu", officeLocation: "Chi nhánh mẫu", id: "00000000-0000-0000-0000-000000000000" }], null, 2);

const normalizeKey = (value: string) => value.trim().toLocaleLowerCase("en-US").replace(/[\s_-]/g, "");
const valueOf = (row: Record<string, unknown>, ...keys: string[]) => {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const key of keys) {
    const value = normalized[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
};

function parseCsvLine(line: string, separator: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; } else quoted = !quoted;
    } else if (character === separator && !quoted) { values.push(current.trim()); current = ""; } else current += character;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string): Record<string, unknown>[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const separator = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const headers = parseCsvLine(lines[0], separator);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line, separator)[index] || ""])));
}

function readRows(content: string, fileName: string): Record<string, unknown>[] {
  if (!fileName.toLowerCase().endsWith(".json")) return parseCsv(content);
  const parsed = JSON.parse(content) as unknown;
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (parsed && typeof parsed === "object") {
    const payload = parsed as { value?: unknown; users?: unknown; data?: unknown };
    if (Array.isArray(payload.value)) return payload.value as Record<string, unknown>[];
    if (Array.isArray(payload.users)) return payload.users as Record<string, unknown>[];
    if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[];
  }
  throw new Error("JSON phải là mảng nhân sự hoặc chứa mảng value/users/data.");
}

function downloadTemplate(fileName: string, content: string, contentType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ActiveDirectoryPreviewDialog({ employees, onClose }: { employees: ExistingEmployee[]; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<PreviewRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | SyncState>("all");

  const summary = useMemo(() => records.reduce((total, record) => ({ ...total, [record.state]: total[record.state] + 1 }), { matched: 0, review: 0, new: 0, invalid: 0 }), [records]);
  const visibleRecords = useMemo(() => records.filter((record) => {
    const keyword = query.trim().toLocaleLowerCase("vi-VN");
    const matchesSearch = !keyword || `${record.displayName} ${record.employeeCode} ${record.upn} ${record.jobTitle} ${record.department}`.toLocaleLowerCase("vi-VN").includes(keyword);
    return matchesSearch && (stateFilter === "all" || record.state === stateFilter);
  }), [records, query, stateFilter]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|json)$/i.test(file.name)) { setError("Chỉ hỗ trợ bản xuất Active Directory định dạng CSV hoặc JSON."); return; }
    setLoading(true);
    setError("");
    try {
      const rawRows = readRows(await file.text(), file.name);
      if (!rawRows.length) throw new Error("Không tìm thấy dòng dữ liệu hợp lệ trong tệp.");
      const nextRecords = rawRows.map((row, index): PreviewRecord => {
        const upn = valueOf(row, "userPrincipalName", "upn", "mail", "email");
        const displayName = valueOf(row, "displayName", "name", "employeeName", "cn");
        const employeeCode = valueOf(row, "employeeId", "employeeNumber", "employeeCode", "staffId");
        const matchedEmployee = upn ? employees.find((employee) => employee.email?.toLocaleLowerCase("vi-VN") === upn.toLocaleLowerCase("vi-VN")) : undefined;
        const sameName = displayName ? employees.some((employee) => employee.name?.toLocaleLowerCase("vi-VN") === displayName.toLocaleLowerCase("vi-VN")) : false;
        const state: SyncState = !upn ? "invalid" : matchedEmployee ? "matched" : sameName || !employeeCode ? "review" : "new";
        return { sourceId: valueOf(row, "id", "objectId", "objectGUID", "immutableId") || `Dòng ${index + 1}`, employeeCode, displayName: displayName || "Chưa có tên", upn, jobTitle: valueOf(row, "jobTitle", "title", "position"), department: valueOf(row, "department", "departmentName"), branch: valueOf(row, "officeLocation", "branch", "physicalDeliveryOfficeName"), state, matchedEmployee };
      });
      setRecords(nextRecords);
      setFileName(file.name);
      setStateFilter("all");
      setQuery("");
    } catch (fileError) {
      setRecords([]);
      setFileName("");
      setError(fileError instanceof Error ? fileError.message : "Không thể đọc tệp Active Directory.");
    } finally {
      setLoading(false);
    }
  };

  return <><button type="button" className="fixed inset-0 z-[100] bg-[#102A43]/45 backdrop-blur-sm" aria-label="Đóng xem trước Active Directory" onClick={onClose} /><section role="dialog" aria-modal="true" aria-label="Xem trước đồng bộ Active Directory" className="fixed left-1/2 top-1/2 z-[101] max-h-[92vh] w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#DFE9F0] bg-white shadow-2xl"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#087A6A]"><ShieldCheck size={14} />Chế độ kiểm tra an toàn</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Xem trước đồng bộ Active Directory</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#71869A]">Tải bản xuất CSV/JSON từ Active Directory hoặc Microsoft Graph để đối chiếu. Màn hình này chỉ đọc và không ghi bất kỳ dữ liệu Nhân sự nào.</p></div><button type="button" onClick={onClose} className="drawer-close-action" aria-label="Đóng"><X size={18} /></button></header><div className="space-y-5 p-5 sm:p-6"><section className="rounded-xl border border-dashed border-[#8BCDC6] bg-[#F4FBFA] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><FileUp size={17} className="text-[#087A6A]" />Bản xuất Active Directory</div><p className="mt-1 text-xs text-[#4B8884]">Nhận CSV hoặc JSON với các cột khuyến nghị: employeeId, userPrincipalName, displayName, jobTitle, department, officeLocation, id.</p><p className="mt-1 text-[10px] text-[#71869A]">Tệp mẫu dùng dữ liệu minh họa, không chứa dữ liệu Nhân sự thực tế.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => downloadTemplate("active-directory-template.csv", activeDirectoryCsvTemplate, "text/csv;charset=utf-8")} className="filter-action"><Download size={14} />Tải mẫu CSV</button><button type="button" onClick={() => downloadTemplate("active-directory-template.json", activeDirectoryJsonTemplate, "application/json;charset=utf-8")} className="filter-action"><Download size={14} />Tải mẫu JSON</button><button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="primary-action">{loading ? "Đang đọc..." : <><FileUp size={15} />Chọn tệp CSV/JSON</>}</button></div></div><input ref={fileInputRef} type="file" accept=".csv,.json,text/csv,application/json" className="hidden" onChange={(event) => { void loadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />{fileName && <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs text-[#4B8884]"><CheckCircle2 size={14} className="text-[#087A6A]" /><span className="font-bold text-[#193B57]">{fileName}</span><span>· {records.length} dòng đã đọc · chưa áp dụng</span></div>}{error && <div className="mt-3 flex gap-2 rounded-lg border border-[#F2B18B] bg-[#FFF2E9] px-3 py-2 text-xs text-[#9E3F12]"><AlertTriangle size={15} className="shrink-0" />{error}</div>}</section>{records.length > 0 ? <><section className="grid gap-3 sm:grid-cols-4"><PreviewMetric label="Khớp email" value={summary.matched} tone="teal" /><PreviewMetric label="Cần đối chiếu" value={summary.review} tone="amber" /><PreviewMetric label="Nhân sự mới" value={summary.new} tone="blue" /><PreviewMetric label="Thiếu UPN/email" value={summary.invalid} tone="red" /></section><section className="rounded-xl border border-[#DFE9F0] bg-white"><div className="flex flex-col gap-3 border-b border-[#E7EEF3] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input h-9 !pl-9 text-xs" placeholder="Tìm tên, Mã nhân viên, UPN, Chức vụ..." /></div><div className="flex flex-wrap gap-2">{(["all", "matched", "review", "new", "invalid"] as const).map((value) => <button type="button" key={value} onClick={() => setStateFilter(value)} className={`rounded-lg border px-3 py-2 text-[11px] font-extrabold ${stateFilter === value ? "border-[#0F8C8C] bg-[#ECF8F7] text-[#087A6A]" : "border-[#DDE7F0] text-[#60758A] hover:bg-[#F8FBFC]"}`}>{value === "all" ? `Tất cả (${records.length})` : `${stateMeta[value].label} (${summary[value]})`}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead className="bg-[#F8FBFC] text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="px-4 py-3">Nhân sự từ AD</th><th className="px-4 py-3">Mã NV</th><th className="px-4 py-3">UPN / Email</th><th className="px-4 py-3">Chức vụ</th><th className="px-4 py-3">Phòng ban · Chi nhánh</th><th className="px-4 py-3">Đối chiếu</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={`${record.sourceId}-${record.upn}`} className="border-t border-[#EDF2F5]"><td className="px-4 py-3"><div className="font-bold text-[#193B57]">{record.displayName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{record.sourceId}</div></td><td className="px-4 py-3 font-mono text-[#60758A]">{record.employeeCode || "—"}</td><td className="px-4 py-3 text-[#60758A]">{record.upn || "—"}</td><td className="px-4 py-3 text-[#60758A]">{record.jobTitle || "—"}</td><td className="px-4 py-3 text-[#60758A]"><div>{record.department || "—"}</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{record.branch || "Chưa có Chi nhánh"}</div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${stateMeta[record.state].className}`}>{stateMeta[record.state].label}</span>{record.matchedEmployee && <div className="mt-1 text-[10px] text-[#71869A]">Khớp: {record.matchedEmployee.name || record.matchedEmployee.email}</div>}</td></tr>)}{!visibleRecords.length && <tr><td colSpan={6} className="p-8 text-center text-xs text-[#8AA0B6]">Không có dòng phù hợp bộ lọc.</td></tr>}</tbody></table></div></section><section className="flex gap-2 rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-3 text-xs leading-5 text-[#60758A]"><Info size={16} className="mt-0.5 shrink-0 text-[#2666A8]" />Chỉ các trạng thái “Khớp email” nên được tự động cập nhật ở giai đoạn đồng bộ sau. Các dòng “Cần đối chiếu”, “Nhân sự mới” và “Thiếu UPN/email” cần được kiểm tra trước khi áp dụng.</section></> : <section className="rounded-xl border border-dashed border-[#DDE7F0] bg-[#FBFCFD] px-6 py-12 text-center"><UsersRound size={28} className="mx-auto text-[#8AA0B6]" /><h3 className="mt-3 text-sm font-extrabold text-[#193B57]">Chưa có dữ liệu để xem trước</h3><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[#71869A]">Chọn tệp CSV/JSON xuất từ Active Directory để bắt đầu đối chiếu. Không có dữ liệu mẫu được tự tạo.</p></section>}</div><footer className="flex justify-end border-t border-[#E7EEF3] px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="filter-action">Đóng</button></footer></section></>;
}

function PreviewMetric({ label, value, tone }: { label: string; value: number; tone: "teal" | "amber" | "blue" | "red" }) {
  const colors = { teal: "border-[#BEE7DE] bg-[#F4FBFA] text-[#087A6A]", amber: "border-[#F2D596] bg-[#FFF9EB] text-[#A86B00]", blue: "border-[#CFE1F8] bg-[#F4F8FE] text-[#2666A8]", red: "border-[#F2C6CB] bg-[#FFF7F8] text-[#B44545]" }[tone];
  return <div className={`rounded-xl border p-3 ${colors}`}><div className="text-[10px] font-extrabold uppercase tracking-[.08em]">{label}</div><div className="mt-1 font-display text-2xl font-extrabold">{value}</div></div>;
}
