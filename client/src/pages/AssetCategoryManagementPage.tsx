import { ChevronLeft, ChevronRight, Pencil, Plus, Power, Save, Tags, Trash2, X } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { matchesVietnameseSearch } from "@/lib/catalogUi";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";

type CategoryDraft = { name: string; code: string; description: string };
type Category = CategoryDraft & { id: number; isActive: boolean };
type CategoryAssetStats = { total: number; assigned: number; maintenance: number; damaged: number };

const emptyDraft: CategoryDraft = { name: "", code: "", description: "" };
const PAGE_SIZE = 5;

export function AssetCategoryManagementPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const categoriesQuery = trpc.assetCategories.listAll.useQuery(undefined, { enabled: isAdmin });
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: isAdmin });
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [editor, setEditor] = useState<Category | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");
  const [assetFilter, setAssetFilter] = useState<"all" | "with-assets" | "empty">("all");
  const [moveSource, setMoveSource] = useState<Category | null>(null);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const categories = (categoriesQuery.data || []) as Category[];
  const assetStatsByCategory = new Map<number, CategoryAssetStats>();
  (assetsQuery.data || []).forEach((asset) => {
    if (!asset.categoryId || asset.status === "returned_to_vendor") return;
    const current = assetStatsByCategory.get(asset.categoryId) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 };
    current.total += 1;
    if (asset.status === "assigned") current.assigned += 1;
    if (asset.status === "maintenance") current.maintenance += 1;
    if (asset.condition === "damaged") current.damaged += 1;
    assetStatsByCategory.set(asset.categoryId, current);
  });
  const filteredCategories = categories.filter((category) => {
    const stats = assetStatsByCategory.get(category.id) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 };
    const matchesActivity = activityFilter === "all" || (activityFilter === "active" ? category.isActive : !category.isActive);
    const matchesAssets = assetFilter === "all" || (assetFilter === "with-assets" ? stats.total > 0 : stats.total === 0);
    return matchesActivity && matchesAssets && matchesVietnameseSearch(`${category.name} ${category.code} ${category.description || ""}`, query);
  });
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const pageStart = (activePage - 1) * PAGE_SIZE;
  const pageCategories = filteredCategories.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => setPage((current) => Math.min(Math.max(1, current), totalPages)), [totalPages]);
  useEffect(() => setPage(1), [query, activityFilter, assetFilter]);

  const refresh = () => {
    void utils.assetCategories.list.invalidate();
    void utils.assetCategories.listAll.invalidate();
  };
  const create = trpc.assetCategories.create.useMutation({
    onSuccess: () => {
      setDraft(emptyDraft);
      setPage(1);
      refresh();
      toast.success("Đã thêm Phân loại tài sản.");
    },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.assetCategories.update.useMutation({
    onSuccess: () => {
      setEditor(null);
      refresh();
      toast.success("Đã cập nhật Phân loại.");
    },
    onError: (error) => toast.error(error.message),
  });
  const bulkMove = trpc.assetCategories.bulkMoveAssets.useMutation({
    onSuccess: ({ moved }) => {
      const sourceId = moveSource?.id;
      setMoveSource(null);
      setMoveTargetId("");
      void utils.assets.list.invalidate();
      refresh();
      if (sourceId) remove.mutate({ id: sourceId });
      else toast.success(`Đã chuyển ${moved} tài sản sang Phân loại mới.`);
    },
    onError: (error) => toast.error(error.message || "Không thể chuyển tài sản."),
  });
  const remove = trpc.assetCategories.delete.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Đã xóa Phân loại.");
    },
    onError: (error) => toast.error(error.message),
  });
  const isValid = (value: CategoryDraft) => value.name.trim().length >= 2 && /^[A-Z0-9-]{1,12}$/.test(value.code.trim());
  const exportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const loadingToast = toast.loading("Đang tạo file Excel...");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 160));
      const rows = filteredCategories.map((category) => {
        const stats = assetStatsByCategory.get(category.id) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 };
        return { "Tên Phân loại": category.name, "Tiền tố": category.code, "Trạng thái": category.isActive ? "Đang hoạt động" : "Ngừng hoạt động", "Tổng tài sản": stats.total, "Đang sử dụng": stats.assigned, "Hỏng": stats.damaged, "Bảo trì": stats.maintenance, "Mô tả": category.description || "" };
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Phân loại tài sản");
      await writeBrandedWorkbook(workbook, {
        documentTitle: "BÁO CÁO PHÂN LOẠI TÀI SẢN",
        fileName: `bao-cao-phan-loai-${new Date().toISOString().slice(0, 10)}.xlsx`,
        description: `Báo cáo ${rows.length} phân loại theo bộ lọc đang áp dụng.`,
      });
      toast.success(`Đã xuất ${rows.length} Phân loại ra Excel.`, { id: loadingToast });
    } catch (error) {
      console.error("[AssetCategoryManagementPage] Excel export failed", error);
      toast.error("Không thể xuất file Excel. Vui lòng thử lại.", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <State text="Đang kiểm tra quyền truy cập..." />;
  if (!isAdmin) return <State text="Chỉ quản trị viên mới có thể quản lý Phân loại tài sản." />;
  if (categoriesQuery.isError) return <State text={categoriesQuery.error?.message || "Không thể tải Phân loại tài sản."} />;

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Asset taxonomy</div>
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Phân loại tài sản</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[#71869A]">Định nghĩa nhóm tài sản và tiền tố để hệ thống tự sinh mã, ví dụ Laptop với tiền tố LT tạo mã LT00001.</p>
        </div>
        <div className="rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4B8884]">Đang hoạt động</div><div className="mt-1 font-display text-xl font-extrabold text-[#087A6A]">{categories.filter((item) => item.isActive).length}</div></div>
      </header>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <section className="min-h-[35rem] rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-6">
          <div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ECF8F7] text-[#087A6A]"><Tags size={19} /></div><div><h2 className="font-display text-lg font-extrabold text-[#102A43]">Thêm Phân loại</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Tiền tố chỉ nhận chữ in hoa, số và dấu gạch ngang; tối đa 12 ký tự.</p></div></div>
          <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); if (!isValid(draft)) return toast.error("Nhập tên và tiền tố mã hợp lệ."); create.mutate({ name: draft.name.trim(), code: draft.code.trim(), description: draft.description.trim() || null }); }}>
            <input className="field-input" placeholder="Tên Phân loại * (ví dụ: Laptop)" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <input className="field-input font-mono uppercase" placeholder="Tiền tố * (ví dụ: LT)" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} />
            <input className="field-input" placeholder="Mô tả (không bắt buộc)" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <div className="rounded-lg bg-[#F4FBFA] px-3 py-2 text-xs text-[#4B8884]">Mã tiếp theo dự kiến: <b className="font-mono text-[#087A6A]">{draft.code || "PREFIX"}00001</b></div>
            <button disabled={create.isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] text-xs font-extrabold text-white disabled:opacity-60"><Plus size={15} />{create.isPending ? "Đang thêm..." : "Thêm Phân loại"}</button>
          </form>
        </section>

        <section className="flex min-h-[35rem] flex-col overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
          <div className="border-b border-[#E7EEF3] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-2"><Tags size={17} className="text-[#2666A8]" /><div><h2 className="font-display text-lg font-extrabold text-[#102A43]">Danh sách Phân loại</h2><p className="mt-0.5 text-[10px] font-semibold text-[#8AA0B6]">Hiển thị 5 Phân loại trên mỗi trang</p></div></div><button type="button" onClick={() => void exportReport()} disabled={isExporting} aria-busy={isExporting} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#CDE5E5] px-3 py-2 text-[11px] font-extrabold text-[#087A6A] transition-colors hover:bg-[#ECF8F7] disabled:cursor-wait disabled:opacity-60">{isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}{isExporting ? "Đang xuất..." : "Xuất Excel"}</button></div>
            <div className="relative mt-3"><input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input h-9" placeholder="Tìm tên hoặc tiền tố Phân loại..." aria-label="Tìm kiếm Phân loại" /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><SearchableSelect value={activityFilter} onChange={(value) => setActivityFilter(value as typeof activityFilter)} options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "active", label: "Đang hoạt động" }, { value: "inactive", label: "Ngừng hoạt động" }]} placeholder="Tất cả trạng thái" searchPlaceholder="Tìm trạng thái..." className="min-w-0" /><SearchableSelect value={assetFilter} onChange={(value) => setAssetFilter(value as typeof assetFilter)} options={[{ value: "all", label: "Tất cả số lượng" }, { value: "with-assets", label: "Có tài sản" }, { value: "empty", label: "Chưa có tài sản" }]} placeholder="Tất cả số lượng" searchPlaceholder="Tìm phạm vi số lượng..." className="min-w-0" /></div>
          </div>
          {categoriesQuery.isLoading ? <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#71869A]">Đang tải Phân loại...</p> : !categories.length ? <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#8AA0B6]">Chưa có Phân loại. Hãy tạo Phân loại đầu tiên ở cột bên trái.</p> : !filteredCategories.length ? <p className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#8AA0B6]">Không tìm thấy Phân loại phù hợp.</p> : <>
            <div className="min-h-[25.5rem] flex-1 divide-y divide-[#E7EEF3]">
              {pageCategories.map((category) => editor?.id === category.id ? <CategoryEditor key={category.id} value={editor} onChange={setEditor} onCancel={() => setEditor(null)} saving={update.isPending} onSave={() => { if (!isValid(editor)) return toast.error("Nhập tên và tiền tố mã hợp lệ."); update.mutate({ id: editor.id, name: editor.name.trim(), code: editor.code.trim(), description: editor.description.trim() || null }); }} /> : <CategoryRow key={category.id} category={category} stats={assetStatsByCategory.get(category.id) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 }} onEdit={() => setEditor({ ...category })} onToggle={() => { const stats = assetStatsByCategory.get(category.id) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 }; if (category.isActive && stats.total > 0) { toast.warning("Vô hiệu hóa Phân loại đang có tài sản?", { description: `“${category.name}” đang gắn với ${stats.total} tài sản. Các tài sản hiện tại không bị thay đổi, nhưng không thể chọn Phân loại này khi tạo mới.`, action: { label: "Vẫn vô hiệu hóa", onClick: () => update.mutate({ id: category.id, isActive: false }) } }); return; } update.mutate({ id: category.id, isActive: !category.isActive }); }} onDelete={() => { const stats = assetStatsByCategory.get(category.id) || { total: 0, assigned: 0, maintenance: 0, damaged: 0 }; if (stats.total > 0) { setMoveSource(category); setMoveTargetId(""); return; } toast.warning("Xóa Phân loại?", { description: `Phân loại “${category.name}” sẽ bị xóa vĩnh viễn.`, action: { label: "Xóa", onClick: () => remove.mutate({ id: category.id }) } }); }} />)}
            </div>
            <footer className="flex items-center justify-between border-t border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3"><span className="text-[11px] font-semibold text-[#71869A]">Trang {activePage}/{totalPages} · {filteredCategories.length}/{categories.length} Phân loại</span><div className="flex items-center gap-1"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={activePage <= 1} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang Phân loại trước"><ChevronLeft size={15} /></button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={activePage >= totalPages} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang Phân loại sau"><ChevronRight size={15} /></button></div></footer>
          </>}
        </section>
      </div>
      {moveSource && <div className="fixed inset-0 z-[90] grid place-items-center bg-[#102A43]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="move-category-title"><div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4"><div><h2 id="move-category-title" className="font-display text-lg font-extrabold text-[#102A43]">Chuyển tài sản trước khi xóa</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Phân loại “{moveSource.name}” đang có tài sản. Chọn nơi nhận để chuyển toàn bộ dữ liệu, sau đó hệ thống sẽ xóa Phân loại nguồn.</p></div><button type="button" onClick={() => setMoveSource(null)} className="rounded-md p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng hộp thoại chuyển tài sản"><X size={17} /></button></div><div className="space-y-4 px-5 py-5"><div className="rounded-lg bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#A86B00]">Tổng tài sản cần chuyển: {(assetStatsByCategory.get(moveSource.id) || { total: 0 }).total}</div><label className="block text-xs font-bold text-[#193B57]">Phân loại đích<select value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)} className="field-input mt-2"><option value="">Chọn Phân loại đang hoạt động</option>{categories.filter((category) => category.id !== moveSource.id && category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name} ({category.code})</option>)}</select></label></div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] px-5 py-4"><button type="button" onClick={() => setMoveSource(null)} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button type="button" disabled={!moveTargetId || bulkMove.isPending} onClick={() => { if (!moveTargetId) return; bulkMove.mutate({ sourceCategoryId: moveSource.id, targetCategoryId: Number(moveTargetId) }); }} className="inline-flex items-center gap-2 rounded-lg bg-[#B44545] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={14} />{bulkMove.isPending ? "Đang chuyển..." : "Chuyển và xóa Phân loại"}</button></div></div></div>}
    </div>
  </div>;
}

function CategoryRow({ category, stats, onEdit, onToggle, onDelete }: { category: Category; stats: CategoryAssetStats; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const statusTooltip = `Tổng: ${stats.total} tài sản · Đang sử dụng: ${stats.assigned} · Hỏng: ${stats.damaged} · Bảo trì: ${stats.maintenance}`;
  return <article className={`flex min-h-[5.1rem] items-start justify-between gap-3 px-5 py-3 ${category.isActive ? "" : "bg-[#FFF9FA]"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#193B57]">{category.name}</h3><span className="rounded-full bg-[#EAF3FF] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#2666A8]">{category.code}xxxxx</span><span className="group/status relative inline-flex"><button type="button" data-suppress-icon-tooltip="true" aria-label={statusTooltip} className="rounded-full bg-[#ECF8F7] px-2 py-0.5 text-[10px] font-extrabold text-[#087A6A]">{stats.total} tài sản</button><span role="tooltip" className="pointer-events-none absolute left-1/2 top-[calc(100%+0.4rem)] z-[120] w-max max-w-[min(92vw,23rem)] -translate-x-1/2 rounded-lg bg-[#102A43] px-3 py-2 text-[10px] font-bold leading-4 text-white opacity-0 shadow-[0_10px_24px_rgba(16,42,67,0.22)] transition-opacity duration-150 group-hover/status:opacity-100">{statusTooltip}</span></span>{!category.isActive && <span className="rounded-full bg-[#FDEDEE] px-2 py-0.5 text-[10px] font-bold text-[#B44545]">Ngừng hoạt động</span>}</div><p className="mt-1 text-xs text-[#71869A]">{category.description || "Chưa có mô tả"}</p></div><div className="flex shrink-0 gap-1"><button onClick={onEdit} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label={`Chỉnh sửa ${category.name}`}><Pencil size={14} /></button><button onClick={onToggle} className={`rounded-md p-2 ${category.isActive ? "text-[#A86B00] hover:bg-[#FFF9EB]" : "text-[#087A6A] hover:bg-[#ECF8F7]"}`} aria-label={category.isActive ? `Vô hiệu hóa ${category.name}` : `Kích hoạt ${category.name}`}><Power size={14} /></button><button onClick={onDelete} className="rounded-md p-2 text-[#B44545] hover:bg-[#FDEDEE]" aria-label={`Xóa ${category.name}`}><Trash2 size={14} /></button></div></article>;
}

function CategoryEditor({ value, onChange, onCancel, saving, onSave }: { value: Category; onChange: (value: Category) => void; onCancel: () => void; saving: boolean; onSave: () => void }) {
  return <article className="grid min-h-[5.1rem] gap-2 bg-[#F4FBFA] px-5 py-3 sm:grid-cols-[1fr_130px_1fr_auto]"><input className="field-input h-9" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /><input className="field-input h-9 font-mono uppercase" value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} /><input className="field-input h-9" placeholder="Mô tả" value={value.description || ""} onChange={(event) => onChange({ ...value, description: event.target.value })} /><div className="flex gap-2"><button onClick={onCancel} className="rounded-md border border-[#DDE7F0] px-3 text-[#60758A]" aria-label="Hủy chỉnh sửa Phân loại"><X size={13} /></button><button disabled={saving} onClick={onSave} className="rounded-md bg-[#0F8C8C] px-3 text-white disabled:opacity-60" aria-label="Lưu Phân loại"><Save size={13} /></button></div></article>;
}

function State({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7"><div className="mx-auto max-w-xl rounded-xl border border-[#DFE9F0] bg-white p-6 text-sm font-semibold text-[#60758A]">{text}</div></div>;
}
