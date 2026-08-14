import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, FolderTree, Layers3, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type DepartmentDraft = { name: string; code: string };
type DivisionDraft = { name: string; code: string; departmentId: string };

const emptyDepartment: DepartmentDraft = { name: "", code: "" };
const emptyDivision: DivisionDraft = { name: "", code: "", departmentId: "" };

export function OrganizationManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const divisionsQuery = trpc.departments.listDivisions.useQuery(undefined, { enabled: isAdmin });
  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(emptyDepartment);
  const [divisionDraft, setDivisionDraft] = useState<DivisionDraft>(emptyDivision);
  const departments = departmentsQuery.data || [];
  const divisions = divisionsQuery.data || [];

  useEffect(() => {
    if (divisionDraft.departmentId || !departments.length) return;
    setDivisionDraft((current) => ({ ...current, departmentId: String(departments[0].id) }));
  }, [departments, divisionDraft.departmentId]);

  const refreshOrganization = () => {
    void utils.departments.list.invalidate();
    void utils.departments.listDivisions.invalidate();
  };

  const createDepartment = trpc.departments.create.useMutation({
    onSuccess: ({ code }) => {
      refreshOrganization();
      setDepartmentDraft(emptyDepartment);
      toast.success("Đã thêm Phòng Ban mới.", { description: `Mã Phòng Ban: ${code}` });
    },
    onError: (error) => toast.error(error.message || "Không thể thêm Phòng Ban."),
  });

  const createDivision = trpc.departments.createDivision.useMutation({
    onSuccess: ({ code }) => {
      refreshOrganization();
      setDivisionDraft((current) => ({ ...emptyDivision, departmentId: current.departmentId }));
      toast.success("Đã thêm Bộ Phận mới.", { description: `Mã Bộ Phận: ${code}` });
    },
    onError: (error) => toast.error(error.message || "Không thể thêm Bộ Phận."),
  });

  const divisionsByDepartment = useMemo(() => {
    const map = new Map<number, typeof divisions>();
    departments.forEach((department) => map.set(department.id, []));
    divisions.forEach((division) => map.set(division.departmentId, [...(map.get(division.departmentId) || []), division]));
    return map;
  }, [departments, divisions]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 text-sm text-[#71869A] sm:px-6 lg:px-9">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!isAdmin) {
    return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9"><div className="mx-auto max-w-[720px] rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-6"><div className="flex items-center gap-3 text-[#A86B00]"><ShieldCheck size={22} /><h1 className="font-display text-xl font-extrabold">Không có quyền truy cập</h1></div><p className="mt-3 text-sm leading-6 text-[#71869A]">Chỉ quản trị viên mới được thêm Phòng Ban và Bộ Phận trong cơ cấu tổ chức.</p></div></div>;
  }

  if (departmentsQuery.isError || divisionsQuery.isError) {
    const message = departmentsQuery.error?.message || divisionsQuery.error?.message || "Vui lòng kiểm tra kết nối và thử lại.";
    return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9"><div className="mx-auto max-w-[760px] rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-6 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#A86B00]"><AlertTriangle size={20} /></div><div><h1 className="font-display text-xl font-extrabold text-[#A86B00]">Không thể tải cơ cấu tổ chức</h1><p className="mt-2 text-sm leading-6 text-[#71869A]">{message}</p><button onClick={() => { void departmentsQuery.refetch(); void divisionsQuery.refetch(); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-extrabold text-[#A86B00] hover:bg-[#FFFDF8]"><RefreshCw size={14} />Thử lại</button></div></div></div></div>;
  }

  const submitDepartment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!departmentDraft.name.trim()) {
      toast.error("Vui lòng nhập tên Phòng Ban.");
      return;
    }
    createDepartment.mutate({ name: departmentDraft.name.trim(), code: departmentDraft.code.trim() || undefined });
  };

  const submitDivision = (event: React.FormEvent) => {
    event.preventDefault();
    if (!divisionDraft.departmentId) {
      toast.error("Vui lòng chọn Phòng Ban cho Bộ Phận.");
      return;
    }
    if (!divisionDraft.name.trim()) {
      toast.error("Vui lòng nhập tên Bộ Phận.");
      return;
    }
    createDivision.mutate({ departmentId: Number(divisionDraft.departmentId), name: divisionDraft.name.trim(), code: divisionDraft.code.trim() || undefined });
  };

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Organization structure</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Phòng Ban & Bộ Phận</h1><p className="mt-1.5 max-w-2xl text-sm text-[#71869A]">Quản lý cơ cấu tổ chức. Mỗi Bộ Phận được gắn bắt buộc vào đúng một Phòng Ban.</p></div><div className="flex gap-3"><div className="rounded-xl border border-[#DDE7F0] bg-white px-4 py-3 text-center shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Phòng Ban</div><div className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{departments.length}</div></div><div className="rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3 text-center"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4B8884]">Bộ Phận</div><div className="mt-1 font-display text-xl font-extrabold text-[#087A6A]">{divisions.length}</div></div></div></div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-6"><div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><Building2 size={19} /></div><div><h2 className="font-display text-lg font-extrabold text-[#102A43]">Thêm Phòng Ban</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Phòng Ban là đơn vị cấp trên để phân nhóm các Bộ Phận.</p></div></div><form className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]" onSubmit={submitDepartment}><input value={departmentDraft.name} onChange={(event) => setDepartmentDraft((current) => ({ ...current, name: event.target.value }))} className="field-input min-w-0" placeholder="Ví dụ: Ban Kế Toán" aria-label="Tên Phòng Ban" /><input value={departmentDraft.code} onChange={(event) => setDepartmentDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="field-input min-w-0" placeholder="Mã tự sinh" aria-label="Mã Phòng Ban" /><button disabled={createDepartment.isPending} className="sm:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2666A8] px-4 text-xs font-extrabold text-white shadow-[0_5px_14px_rgba(38,102,168,0.18)] hover:bg-[#1F568F] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={15} />{createDepartment.isPending ? "Đang thêm..." : "Thêm Phòng Ban"}</button></form><p className="mt-3 text-[11px] text-[#8AA0B6]">Mã là tùy chọn; hệ thống sẽ tự tạo nếu để trống.</p></section>

      <section className="rounded-xl border border-[#CDE5E5] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] sm:p-6"><div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><FolderTree size={19} /></div><div><h2 className="font-display text-lg font-extrabold text-[#102A43]">Thêm Bộ Phận</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Chọn Phòng Ban trước khi lưu. Một Bộ Phận chỉ thuộc một Phòng Ban.</p></div></div><form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={submitDivision}><div className="sm:col-span-2"><label className="field-label">Phòng Ban <span className="text-[#B44545]">*</span></label><select value={divisionDraft.departmentId} onChange={(event) => setDivisionDraft((current) => ({ ...current, departmentId: event.target.value }))} className="field-input" disabled={!departments.length || createDivision.isPending} aria-label="Chọn Phòng Ban cho Bộ Phận"><option value="">Chọn Phòng Ban</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} · {department.code}</option>)}</select></div><input value={divisionDraft.name} onChange={(event) => setDivisionDraft((current) => ({ ...current, name: event.target.value }))} className="field-input" placeholder="Ví dụ: Bộ Phận Kế Toán Thanh Toán" aria-label="Tên Bộ Phận" disabled={!departments.length} /><input value={divisionDraft.code} onChange={(event) => setDivisionDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="field-input" placeholder="Mã tự sinh" aria-label="Mã Bộ Phận" disabled={!departments.length} /><button disabled={createDivision.isPending || !departments.length} className="sm:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={15} />{createDivision.isPending ? "Đang thêm..." : "Thêm Bộ Phận"}</button></form>{!departmentsQuery.isLoading && departments.length === 0 && <p className="mt-3 rounded-lg bg-[#FFF9EB] px-3 py-2 text-xs text-[#A86B00]">Hãy tạo ít nhất một Phòng Ban trước khi thêm Bộ Phận.</p>}</section>
    </div>

    <section className="mt-5 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-extrabold text-[#102A43]">Sơ đồ cơ cấu</h2><p className="mt-1 text-xs text-[#71869A]">Bộ Phận được hiển thị bên dưới đúng Phòng Ban đang quản lý.</p></div><div className="inline-flex items-center gap-2 text-xs font-bold text-[#0F8C8C]"><Layers3 size={16} />Quan hệ một–nhiều</div></div>{departmentsQuery.isLoading || divisionsQuery.isLoading ? <div className="p-10 text-center text-sm text-[#71869A]">Đang tải cơ cấu tổ chức...</div> : departments.length === 0 ? <div className="p-10 text-center text-sm text-[#8AA0B6]">Chưa có Phòng Ban. Hãy tạo Phòng Ban đầu tiên để bắt đầu thiết lập cơ cấu.</div> : <div className="grid gap-4 p-5 lg:grid-cols-2">{departments.map((department) => { const children = divisionsByDepartment.get(department.id) || []; return <article key={department.id} className="rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF3FF] text-[#2666A8]"><Building2 size={17} /></div><div><h3 className="font-bold text-[#193B57]">{department.name}</h3><p className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{department.code}</p></div></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-[#60758A] ring-1 ring-[#DDE7F0]">{children.length} Bộ Phận</span></div><div className="mt-4 space-y-2 border-l-2 border-[#CDE5E5] pl-4">{children.length ? children.map((division) => <div key={division.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-[#193B57] ring-1 ring-[#E7EEF3]"><FolderTree size={15} className="shrink-0 text-[#0F8C8C]" /><span className="min-w-0 flex-1 truncate font-semibold">{division.name}</span><span className="font-mono text-[10px] text-[#8AA0B6]">{division.code}</span></div>) : <p className="py-2 text-xs text-[#8AA0B6]">Chưa có Bộ Phận trực thuộc.</p>}</div></article>; })}</div>}</section>
  </div></div>;
}
