import { useEffect, useMemo, useState } from "react";
import { Clock3, Pencil, RotateCcw, Save, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const labelCatalog = [
  { key: "dashboard-operations", area: "Tổng quan", defaultValue: "Asset Operations" },
  { key: "asset-registry", area: "Danh mục tài sản", defaultValue: "Asset Registry" },
  { key: "asset-taxonomy", area: "Phân loại tài sản", defaultValue: "Asset Taxonomy" },
  { key: "workforce-allocation", area: "Quản lý nhân sự", defaultValue: "Workforce allocation" },
  { key: "organization-structure", area: "Phòng ban & Bộ phận", defaultValue: "Organization structure" },
  { key: "vendor-brand-directory", area: "Nhà cung cấp & Hãng", defaultValue: "Vendor & brand directory" },
  { key: "maintenance-control", area: "Bảo trì & Báo hỏng", defaultValue: "Maintenance control" },
  { key: "audit-control", area: "Kiểm kê", defaultValue: "Audit control" },
  { key: "reporting-center", area: "Báo cáo", defaultValue: "Reporting center" },
  { key: "handover-workflow", area: "Bàn giao & Cấp phát", defaultValue: "Handover workflow" },
  { key: "knowledge-base", area: "Trợ giúp & hướng dẫn", defaultValue: "Knowledge base" },
  { key: "brand-settings", area: "Cài đặt hệ thống", defaultValue: "Brand settings" },
] as const;

export function UiLabelManagementPanel() {
  const utils = trpc.useUtils();
  const labelsQuery = trpc.uiLabels.list.useQuery();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const savedLabels = useMemo(() => new Map((labelsQuery.data || []).map((label) => [label.labelKey, label])), [labelsQuery.data]);
  const saveLabel = trpc.uiLabels.save.useMutation({
    onSuccess: async () => {
      await utils.uiLabels.list.invalidate();
      toast.success("Đã cập nhật nhãn giao diện.");
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật nhãn giao diện."),
  });

  useEffect(() => {
    setDrafts(Object.fromEntries(labelCatalog.map((label) => [label.key, savedLabels.get(label.key)?.value || label.defaultValue])));
  }, [savedLabels]);

  const visibleLabels = labelCatalog.filter((label) => `${label.area} ${label.defaultValue} ${drafts[label.key] || ""}`.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN")));
  const save = (labelKey: string, fallback: string) => {
    const value = (drafts[labelKey] || fallback).trim();
    if (value.length < 2) { toast.error("Nhãn cần có ít nhất 2 ký tự."); return; }
    saveLabel.mutate({ labelKey, value });
  };

  return <section className="mt-5 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,.045)]">
    <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6"><div className="flex min-w-0 gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Tags size={19} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Nhãn giao diện</div><h2 className="mt-1 font-display text-lg font-extrabold text-[#102A43]">Quản lý nhãn tập trung</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#71869A]">Theo dõi và chỉnh sửa các nhãn định danh cấp trang. Thay đổi ở đây sẽ áp dụng ngay trên toàn bộ hệ thống.</p></div></div><div className="w-full sm:w-[250px]"><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input h-9 pl-9 text-xs" placeholder="Tìm nhãn hoặc khu vực..." aria-label="Tìm nhãn giao diện" /></div><div className="mt-1.5 text-right text-[10px] font-semibold text-[#8AA0B6]">Hiển thị {visibleLabels.length}/{labelCatalog.length} nhãn</div></div></div>
    <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] font-extrabold uppercase tracking-[.11em] text-[#8AA0B6]"><tr><th className="px-5 py-3.5 sm:px-6">Khu vực</th><th className="px-4 py-3.5">Nhãn mặc định</th><th className="px-4 py-3.5">Nội dung hiển thị</th><th className="px-4 py-3.5">Cập nhật gần nhất</th><th className="px-5 py-3.5 text-right sm:px-6">Thao tác</th></tr></thead><tbody>{labelsQuery.isLoading && <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-[#71869A]">Đang tải cấu hình nhãn...</td></tr>}{!labelsQuery.isLoading && visibleLabels.map((label) => { const saved = savedLabels.get(label.key); const value = drafts[label.key] ?? label.defaultValue; const hasCustomValue = Boolean(saved && saved.value !== label.defaultValue); return <tr key={label.key} className="border-t border-[#EDF2F5] align-top hover:bg-[#FBFDFE]"><td className="px-5 py-4 font-bold text-[#193B57] sm:px-6">{label.area}<div className="mt-1 font-mono text-[10px] font-medium text-[#8AA0B6]">{label.key}</div></td><td className="px-4 py-4 text-[#60758A]">{label.defaultValue}</td><td className="px-4 py-3"><div className="relative"><Pencil size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0F8C8C]" /><input value={value} onChange={(event) => setDrafts((current) => ({ ...current, [label.key]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") save(label.key, label.defaultValue); }} className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-8 pr-2.5 text-xs font-semibold text-[#193B57] outline-none transition focus:border-[#0F8C8C] focus:ring-2 focus:ring-[#D7F0ED]" aria-label={`Nội dung nhãn ${label.area}`} /></div></td><td className="px-4 py-4 text-[11px] text-[#71869A]">{saved?.updatedAt ? <span className="inline-flex items-center gap-1.5"><Clock3 size={12} />{new Date(saved.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span> : <span className="text-[#9AAEBD]">Chưa tùy chỉnh</span>}{saved?.updatedByName && <div className="mt-1 text-[10px] text-[#8AA0B6]">Bởi {saved.updatedByName}</div>}</td><td className="px-5 py-3 text-right sm:px-6"><div className="flex justify-end gap-2"><button type="button" onClick={() => save(label.key, label.defaultValue)} disabled={saveLabel.isPending || value.trim() === (saved?.value || label.defaultValue)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-2.5 text-[11px] font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-45"><Save size={13} />Lưu</button>{hasCustomValue && <button type="button" onClick={() => { setDrafts((current) => ({ ...current, [label.key]: label.defaultValue })); saveLabel.mutate({ labelKey: label.key, value: label.defaultValue }); }} disabled={saveLabel.isPending} className="grid h-8 w-8 place-items-center rounded-lg border border-[#DDE7F0] text-[#60758A] transition hover:bg-[#F0F5F8] hover:text-[#193B57] disabled:cursor-not-allowed disabled:opacity-45" title="Khôi phục nhãn mặc định" aria-label={`Khôi phục nhãn mặc định cho ${label.area}`}><RotateCcw size={14} /></button>}</div></td></tr>; })}{!labelsQuery.isLoading && visibleLabels.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-[#71869A]">Không tìm thấy nhãn phù hợp với từ khóa tìm kiếm.</td></tr>}</tbody></table></div>
  </section>;
}
