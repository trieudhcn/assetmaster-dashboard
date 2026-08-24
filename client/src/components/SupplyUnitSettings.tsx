import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, Check, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function SupplyUnitSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const unitsQuery = trpc.supplyUnits.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const refresh = () => void utils.supplyUnits.list.invalidate();
  const createUnit = trpc.supplyUnits.create.useMutation({
    onSuccess: () => { setNewName(""); refresh(); toast.success("Đã thêm đơn vị tính chuẩn."); },
    onError: (error) => toast.error(error.message || "Không thể thêm đơn vị tính."),
  });
  const updateUnit = trpc.supplyUnits.update.useMutation({
    onSuccess: () => { setEditing(null); refresh(); toast.success("Đã cập nhật đơn vị tính."); },
    onError: (error) => toast.error(error.message || "Không thể cập nhật đơn vị tính."),
  });
  const removeUnit = trpc.supplyUnits.remove.useMutation({
    onSuccess: (result) => {
      setPendingDelete(null);
      refresh();
      toast.success(result.usageCount ? `Đã xóa đơn vị tính; ${result.usageCount} phụ kiện lưu trước đó vẫn giữ nguyên đơn vị.` : "Đã xóa đơn vị tính khỏi danh sách chuẩn.");
    },
    onError: (error) => toast.error(error.message || "Không thể xóa đơn vị tính."),
  });

  if (user?.role !== "admin") return null;
  const isSaving = createUnit.isPending || updateUnit.isPending || removeUnit.isPending;
  const units = unitsQuery.data || [];
  const activeUnitCount = units.filter((unit) => unit.isActive).length;

  return (
    <section className="mx-auto mt-5 max-w-[1100px] rounded-2xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Dữ liệu chuẩn</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><h2 className="font-display text-lg font-extrabold text-[#102A43]">Đơn vị tính chuẩn</h2><span className="text-[11px] font-semibold text-[#71869A]">{activeUnitCount}/{units.length} đang dùng cho template</span></div>
          <p className="mt-1 text-[11px] text-[#71869A]">Dùng cho import Phụ kiện; cảnh báo chỉ hiển thị khi xóa đơn vị đang được sử dụng.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); const name = newName.trim(); if (name) createUnit.mutate({ name }); }} className="flex w-full gap-2 sm:w-auto">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={32} placeholder="VD: Tấm" aria-label="Tên đơn vị tính mới" className="field-input h-9 min-w-0 flex-1 text-xs sm:w-44" />
          <button type="submit" disabled={!newName.trim() || isSaving} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-xs font-extrabold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} />Thêm</button>
        </form>
      </div>

      {unitsQuery.isLoading ? <p className="mt-4 text-xs text-[#71869A]">Đang tải danh sách đơn vị tính...</p> : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {units.map((unit) => {
            const isEditing = editing?.id === unit.id;
            const isPendingDelete = pendingDelete === unit.id;
            const usageCount = Number(unit.usageCount || 0);
            return (
              <article key={unit.id} className={`rounded-xl border px-3 py-2.5 transition ${unit.isActive ? "border-[#E1EAF0] bg-[#FCFDFE]" : "border-[#F2D596] bg-[#FFF9EB]"}`}>
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input autoFocus value={editing.name} onChange={(event) => setEditing({ id: unit.id, name: event.target.value })} maxLength={32} aria-label={`Sửa đơn vị ${unit.name}`} className="field-input h-8 min-w-0 flex-1 text-xs" />
                    <button type="button" disabled={!editing.name.trim() || isSaving} onClick={() => updateUnit.mutate({ id: unit.id, name: editing.name.trim() })} className="grid h-8 w-8 place-items-center rounded-md bg-[#0F8C8C] text-white disabled:opacity-50" aria-label="Lưu đơn vị" title="Lưu"><Check size={14} /></button>
                    <button type="button" disabled={isSaving} onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#60758A]" aria-label="Hủy sửa" title="Hủy"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-[#193B57]">{unit.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${unit.isActive ? "bg-[#EAF8F5] text-[#087A6A]" : "bg-[#FFF0C7] text-[#9A6300]"}`}>{unit.isActive ? "Đang dùng" : "Tạm dừng"}</span>{usageCount > 0 && <span className="text-[10px] font-semibold text-[#9E5A12]">{usageCount} phụ kiện</span>}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" disabled={isSaving} onClick={() => setEditing({ id: unit.id, name: unit.name })} className="grid h-7 w-7 place-items-center rounded-md text-[#2666A8] transition hover:bg-[#EAF3FF] disabled:opacity-50" aria-label={`Sửa đơn vị ${unit.name}`} title="Sửa đơn vị"><Pencil size={14} /></button>
                        <button type="button" disabled={isSaving} onClick={() => updateUnit.mutate({ id: unit.id, isActive: !unit.isActive })} className="grid h-7 w-7 place-items-center rounded-md text-[#8A7140] transition hover:bg-[#FFF2C8] disabled:opacity-50" aria-label={unit.isActive ? `Ngừng dùng ${unit.name}` : `Kích hoạt ${unit.name}`} title={unit.isActive ? "Ngừng dùng" : "Kích hoạt"}><Power size={14} /></button>
                        <button type="button" disabled={isSaving} onClick={() => setPendingDelete(unit.id)} className="grid h-7 w-7 place-items-center rounded-md text-[#B44545] transition hover:bg-[#FDEDEE] disabled:opacity-50" aria-label={`Xóa đơn vị ${unit.name}`} title="Xóa đơn vị"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isPendingDelete && (
                      <div className="mt-2 rounded-lg border border-[#F2B18B] bg-[#FFF2E9] p-2">
                        <div className="flex gap-1.5 text-[#9E3F12]"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><p className="text-[10px] font-semibold leading-4">{usageCount ? <>“{unit.name}” đang được <strong>{usageCount} phụ kiện</strong> sử dụng. Dữ liệu cũ vẫn giữ nguyên nhưng đơn vị sẽ bị gỡ khỏi template.</> : <>Xóa “{unit.name}” khỏi danh sách chuẩn?</>}</p></div>
                        <div className="mt-1.5 flex justify-end gap-2"><button type="button" disabled={isSaving} onClick={() => setPendingDelete(null)} className="text-[10px] font-bold text-[#60758A]">Hủy</button><button type="button" disabled={isSaving} onClick={() => removeUnit.mutate({ id: unit.id, confirmUsage: usageCount > 0 })} className="rounded-md bg-[#B44545] px-2 py-1 text-[10px] font-extrabold text-white disabled:opacity-50">Xóa</button></div>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!unitsQuery.isLoading && units.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-[#DDE7F0] p-4 text-center text-xs text-[#8AA0B6]">Chưa có đơn vị tính chuẩn. Hãy thêm đơn vị đầu tiên.</p>}
    </section>
  );
}
