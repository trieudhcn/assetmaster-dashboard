import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from "lucide-react";
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

  return (
    <section className="mx-auto mt-5 max-w-6xl rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Dữ liệu chuẩn</div>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Đơn vị tính chuẩn</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71869A]">Danh sách này được dùng trong template import Phụ kiện. Trước khi xóa, hệ thống hiển thị số phụ kiện đang sử dụng đơn vị để quản trị viên xác nhận an toàn.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); const name = newName.trim(); if (name) createUnit.mutate({ name }); }} className="flex w-full gap-2 lg:w-auto">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={32} placeholder="VD: Tấm" aria-label="Tên đơn vị tính mới" className="field-input h-10 min-w-0 flex-1 lg:w-48" />
          <button type="submit" disabled={!newName.trim() || isSaving} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={15} />Thêm đơn vị</button>
        </form>
      </div>

      {unitsQuery.isLoading ? <p className="mt-5 text-xs text-[#71869A]">Đang tải danh sách đơn vị tính...</p> : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => {
            const isEditing = editing?.id === unit.id;
            const isPendingDelete = pendingDelete === unit.id;
            const usageCount = Number(unit.usageCount || 0);
            return (
              <article key={unit.id} className={`rounded-xl border p-3 ${unit.isActive ? "border-[#DDE7F0] bg-[#FBFCFD]" : "border-[#F2D596] bg-[#FFF9EB]"}`}>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input autoFocus value={editing.name} onChange={(event) => setEditing({ id: unit.id, name: event.target.value })} maxLength={32} aria-label={`Sửa đơn vị ${unit.name}`} className="field-input h-8 flex-1" />
                    <button type="button" disabled={!editing.name.trim() || isSaving} onClick={() => updateUnit.mutate({ id: unit.id, name: editing.name.trim() })} className="grid h-8 w-8 place-items-center rounded-md bg-[#0F8C8C] text-white disabled:opacity-50" aria-label="Lưu đơn vị"><Check size={14} /></button>
                    <button type="button" disabled={isSaving} onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#60758A]" aria-label="Hủy sửa"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-[#193B57]">{unit.name}</div>
                        <div className={`mt-1 text-[10px] font-bold ${unit.isActive ? "text-[#087A6A]" : "text-[#A86B00]"}`}>{unit.isActive ? "Đang dùng trong template" : "Đã ngừng dùng"}</div>
                        <div className={`mt-1 text-[10px] font-semibold ${usageCount ? "text-[#9E5A12]" : "text-[#71869A]"}`}>{usageCount ? `Đang được ${usageCount} phụ kiện sử dụng` : "Chưa có phụ kiện sử dụng"}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" disabled={isSaving} onClick={() => setEditing({ id: unit.id, name: unit.name })} className="grid h-8 w-8 place-items-center rounded-md text-[#2666A8] hover:bg-[#EAF3FF] disabled:opacity-50" aria-label={`Sửa đơn vị ${unit.name}`}><Pencil size={14} /></button>
                        <button type="button" disabled={isSaving} onClick={() => updateUnit.mutate({ id: unit.id, isActive: !unit.isActive })} className="rounded-md px-2 text-[10px] font-extrabold text-[#8A7140] hover:bg-[#FFF2C8] disabled:opacity-50">{unit.isActive ? "Ngừng dùng" : "Kích hoạt"}</button>
                        <button type="button" disabled={isSaving} onClick={() => setPendingDelete(unit.id)} className="grid h-8 w-8 place-items-center rounded-md text-[#B44545] hover:bg-[#FDEDEE] disabled:opacity-50" aria-label={`Xóa đơn vị ${unit.name}`}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isPendingDelete && (
                      <div className="mt-3 rounded-lg border border-[#F2B18B] bg-[#FFF2E9] p-2.5">
                        <div className="flex gap-2 text-[#9E3F12]"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><p className="text-[11px] font-semibold leading-4">{usageCount ? <>Cảnh báo: đơn vị “{unit.name}” đang được <strong>{usageCount} phụ kiện</strong> sử dụng. Dữ liệu đã lưu vẫn giữ nguyên, nhưng đơn vị sẽ không còn xuất hiện trong template import.</> : <>Xóa “{unit.name}” khỏi danh sách chuẩn? Dữ liệu Phụ kiện đã lưu vẫn được giữ nguyên.</>}</p></div>
                        <div className="mt-2 flex justify-end gap-2"><button type="button" disabled={isSaving} onClick={() => setPendingDelete(null)} className="text-[10px] font-bold text-[#60758A]">Hủy</button><button type="button" disabled={isSaving} onClick={() => removeUnit.mutate({ id: unit.id, confirmUsage: usageCount > 0 })} className="rounded-md bg-[#B44545] px-2.5 py-1 text-[10px] font-extrabold text-white disabled:opacity-50">Xác nhận xóa</button></div>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!unitsQuery.isLoading && units.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-[#DDE7F0] p-5 text-center text-xs text-[#8AA0B6]">Chưa có đơn vị tính chuẩn. Hãy thêm đơn vị đầu tiên.</p>}
    </section>
  );
}
