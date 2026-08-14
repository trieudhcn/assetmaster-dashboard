import { useMemo, useState } from "react";
import { Download, FileBarChart, History, PieChart as PieChartIcon, Search, SlidersHorizontal } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const card = "rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";
const divisionColors = ["#0F8C8C", "#2666A8", "#E59B24", "#7666B3", "#CF5C4B", "#3F9C6D", "#5B7FA3"];
const currency = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
type DivisionValue = { id: string; name: string; value: number; assetCount: number; color: string };
type BrandValue = { id: string; name: string; value: number; assetCount: number; color: string };

export function ReportsManagementView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departmentId, setDepartmentId] = useState("all");
  const [divisionId, setDivisionId] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const assetsQuery = trpc.assets.list.useQuery();
  const handoversQuery = trpc.handovers.list.useQuery();
  const maintenanceQuery = trpc.maintenance.list.useQuery();
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isAdmin });
  const divisionsQuery = trpc.departments.listAllDivisions.useQuery(undefined, { enabled: isAdmin });
  const brandsQuery = trpc.brands.list.useQuery();
  const activitiesQuery = trpc.activity.list.useQuery({ limit: 150 }, { enabled: isAdmin });

  const departments = departmentsQuery.data || [];
  const divisions = divisionsQuery.data || [];
  const employees = employeesQuery.data || [];
  const employeeById = new Map(employees.map((item) => [item.id, item]));
  const departmentById = new Map(departments.map((item) => [item.id, item]));
  const divisionById = new Map(divisions.map((item) => [item.id, item]));
  const brandById = new Map((brandsQuery.data || []).map((item) => [item.id, item]));
  const availableDivisions = divisions.filter((item) => item.isActive && (departmentId === "all" || item.departmentId === Number(departmentId)));
  const selectedDepartment = departmentId === "all" ? undefined : departmentById.get(Number(departmentId));
  const selectedDivision = divisionId === "all" ? undefined : divisionById.get(Number(divisionId));

  const selectedAssets = useMemo(() => (assetsQuery.data || []).filter((asset) => {
    const assetDivisionId = asset.holderUserId ? employeeById.get(asset.holderUserId)?.divisionId : null;
    return (departmentId === "all" || asset.departmentId === Number(departmentId)) && (divisionId === "all" || assetDivisionId === Number(divisionId));
  }), [assetsQuery.data, employeeById, departmentId, divisionId]);
  const selectedAssetIds = new Set(selectedAssets.map((item) => item.id));
  const selectedHandoverCount = (handoversQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedMaintenanceCount = (maintenanceQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedValue = selectedAssets.reduce((sum, item) => sum + Number(item.purchaseValue || 0), 0);
  const divisionValueData = useMemo<DivisionValue[]>(() => {
    const buckets = new Map<string, Omit<DivisionValue, "color">>();
    selectedAssets.forEach((asset) => {
      const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
      const division = holder?.divisionId ? divisionById.get(holder.divisionId) : undefined;
      const id = division ? String(division.id) : "unassigned";
      const name = division?.name || "Chưa gán Bộ Phận";
      const current = buckets.get(id) || { id, name, value: 0, assetCount: 0 };
      current.value += Number(asset.purchaseValue || 0);
      current.assetCount += 1;
      buckets.set(id, current);
    });
    return [...buckets.values()].sort((left, right) => right.value - left.value).map((item, index) => ({ ...item, color: divisionColors[index % divisionColors.length] }));
  }, [selectedAssets, employeeById, divisionById]);
  const brandValueData = useMemo<BrandValue[]>(() => {
    const buckets = new Map<string, Omit<BrandValue, "color">>();
    selectedAssets.forEach((asset) => {
      const brand = asset.brandId ? brandById.get(asset.brandId) : undefined;
      const id = brand ? String(brand.id) : "unassigned";
      const name = brand?.name || "Chưa gán Hãng";
      const current = buckets.get(id) || { id, name, value: 0, assetCount: 0 };
      current.value += Number(asset.purchaseValue || 0);
      current.assetCount += 1;
      buckets.set(id, current);
    });
    return [...buckets.values()].sort((left, right) => right.value - left.value).map((item, index) => ({ ...item, color: divisionColors[index % divisionColors.length] }));
  }, [selectedAssets, brandById]);
  const filteredActivities = useMemo(() => (activitiesQuery.data || []).filter((item) => (activityType === "all" || item.entityType === activityType) && `${item.summary || ""} ${item.actorName || ""} ${item.action}`.toLowerCase().includes(activityQuery.toLowerCase())), [activitiesQuery.data, activityType, activityQuery]);
  const hasOrgError = departmentsQuery.isError || divisionsQuery.isError || employeesQuery.isError;

  const exportExcel = () => {
    if (!selectedAssets.length) return;
    const rows = selectedAssets.map((asset) => {
      const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
      const division = holder?.divisionId ? divisionById.get(holder.divisionId) : undefined;
      const department = asset.departmentId ? departmentById.get(asset.departmentId) : undefined;
      return { "Mã tài sản": asset.assetCode, "Tên tài sản": asset.name, "Phòng Ban": department?.name || "Chưa gán", "Bộ Phận": division?.name || "Chưa gán", "Người giữ": asset.holderName || "Chưa cấp phát", "Trạng thái": asset.status, "Tình trạng": asset.condition, "Vị trí": asset.location || "", "Serial/IMEI": asset.serialNumber || "", "Giá trị (VNĐ)": Number(asset.purchaseValue || 0), "Hạn bảo hành": asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "" };
    });
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 24 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Tài sản");
    const scope = selectedDivision?.name || selectedDepartment?.name || "tat-ca";
    XLSX.writeFile(workbook, `assetmaster-${scope.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`);
    toast.success(`Đã xuất ${selectedAssets.length} tài sản theo phạm vi lọc.`);
  };

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo tài sản</h1><p className="mt-1 text-sm text-[#71869A]">Thống kê, trực quan hóa và xuất danh mục tài sản theo Phòng Ban hoặc Bộ Phận của người sử dụng.</p></div>
    {hasOrgError ? <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5"><div className="font-bold text-[#A86B00]">Không thể tải bộ lọc cơ cấu tổ chức</div><button onClick={() => { void employeesQuery.refetch(); void departmentsQuery.refetch(); void divisionsQuery.refetch(); }} className="mt-3 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00]">Thử lại</button></section> : <>
      <section className={`${card} p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><SlidersHorizontal size={16} className="text-[#2666A8]" />Phạm vi thống kê</div><p className="mt-1 text-xs text-[#71869A]">Bộ Phận được lọc theo nhân sự đang giữ tài sản và luôn thuộc Phòng Ban đã chọn.</p></div><div className="grid gap-2 sm:grid-cols-3"><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setDivisionId("all"); }} disabled={!isAdmin || departmentsQuery.isLoading} className="field-input min-w-[200px]"><option value="all">Tất cả Phòng Ban</option>{departments.filter((item) => item.isActive).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select value={divisionId} onChange={(event) => setDivisionId(event.target.value)} disabled={!isAdmin || divisionsQuery.isLoading} className="field-input min-w-[200px]"><option value="all">Tất cả Bộ Phận</option>{availableDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select><button onClick={() => { setDepartmentId("all"); setDivisionId("all"); }} className="rounded-lg border border-[#DDE7F0] bg-white px-4 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đặt lại</button></div></div></section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tài sản trong phạm vi" value={String(selectedAssets.length)} /><Metric label="Giá trị tài sản" value={currency(selectedValue)} /><Metric label="Phiếu bàn giao liên quan" value={String(selectedHandoverCount)} /><Metric label="Yêu cầu bảo trì liên quan" value={String(selectedMaintenanceCount)} /></div>
      <DivisionValueChart data={divisionValueData} totalValue={selectedValue} isLoading={assetsQuery.isLoading || employeesQuery.isLoading || divisionsQuery.isLoading} scope={selectedDivision?.name || selectedDepartment?.name || "Tất cả cơ cấu"} />
      <BrandValueChart data={brandValueData} totalValue={selectedValue} isLoading={assetsQuery.isLoading || brandsQuery.isLoading} />
      <section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo cơ cấu</div><p className="mt-1 text-xs text-[#71869A]">{selectedDepartment ? `Phòng Ban: ${selectedDepartment.name}` : "Tất cả Phòng Ban"}{selectedDivision ? ` · Bộ Phận: ${selectedDivision.name}` : ""}</p></div><button onClick={exportExcel} disabled={!isAdmin || !selectedAssets.length} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />Xuất Excel ({selectedAssets.length})</button></div></section>
    </>}
    {isAdmin && <ActivityLog data={filteredActivities} loading={activitiesQuery.isLoading} query={activityQuery} type={activityType} onQueryChange={setActivityQuery} onTypeChange={setActivityType} allActivities={activitiesQuery.data || []} />}
  </div></div>;
}

function DivisionValueChart({ data, totalValue, isLoading, scope }: { data: DivisionValue[]; totalValue: number; isLoading: boolean; scope: string }) {
  let cursor = 0;
  const gradient = data.map((item) => {
    const start = cursor;
    cursor += totalValue ? (item.value / totalValue) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");
  return <section className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><PieChartIcon size={17} className="text-[#7666B3]" />Phân bổ giá trị theo Bộ Phận</div><p className="mt-1 text-xs text-[#71869A]">Phạm vi: {scope}. Tài sản chưa có người giữ hoặc nhân sự chưa gán Bộ Phận được nhóm riêng.</p></div><div className="rounded-lg bg-[#F2EDFF] px-3 py-2 text-xs font-extrabold text-[#6750A4]">Tổng giá trị: {currency(totalValue)}</div></div>{isLoading ? <div className="grid min-h-[300px] place-items-center text-sm text-[#71869A]">Đang tổng hợp dữ liệu theo Bộ Phận...</div> : !data.length || totalValue <= 0 ? <div className="grid min-h-[300px] place-items-center px-6 text-center"><div><PieChartIcon size={28} className="mx-auto text-[#9CB0C2]" /><p className="mt-3 font-bold text-[#60758A]">Chưa có giá trị tài sản để phân bổ</p><p className="mt-1 text-xs leading-5 text-[#8AA0B6]">Hãy cấp phát tài sản cho nhân sự đã được gán Bộ Phận hoặc điều chỉnh phạm vi lọc.</p></div></div> : <div className="grid gap-5 p-5 lg:grid-cols-[minmax(280px,.85fr)_minmax(360px,1.15fr)]"><div className="flex h-[260px] min-w-0 items-center justify-center"><div className="grid h-52 w-52 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(16,42,67,.06)]" style={{ background: `conic-gradient(${gradient})` }}><div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-[0_4px_16px_rgba(16,42,67,.08)]"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8AA0B6]">Tổng giá trị</span><span className="px-3 text-sm font-extrabold text-[#102A43]">{currency(totalValue)}</span></div></div></div><div className="min-w-0 space-y-3">{data.map((item) => { const percentage = totalValue ? Math.round((item.value / totalValue) * 100) : 0; return <div key={item.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-[#193B57]">{item.name}</span></div><span className="shrink-0 text-xs font-extrabold text-[#102A43]">{percentage}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAF0F4]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, percentage)}%`, backgroundColor: item.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#71869A]"><span>{item.assetCount} tài sản</span><span className="font-bold text-[#60758A]">{currency(item.value)}</span></div></div>; })}</div></div>}</section>;
}

function BrandValueChart({ data, totalValue, isLoading }: { data: BrandValue[]; totalValue: number; isLoading: boolean }) {
  return <section className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><PieChartIcon size={17} className="text-[#0F8C8C]" />Phân bổ giá trị theo Hãng</div><p className="mt-1 text-xs text-[#71869A]">Giá trị nguyên giá được nhóm theo Hãng đã gán trong hồ sơ tài sản.</p></div><div className="rounded-lg bg-[#ECF8F7] px-3 py-2 text-xs font-extrabold text-[#087A6A]">Tổng giá trị: {currency(totalValue)}</div></div>{isLoading ? <div className="grid min-h-[220px] place-items-center text-sm text-[#71869A]">Đang tổng hợp dữ liệu theo Hãng...</div> : !data.length || totalValue <= 0 ? <div className="grid min-h-[220px] place-items-center px-6 text-center"><div><PieChartIcon size={28} className="mx-auto text-[#9CB0C2]" /><p className="mt-3 font-bold text-[#60758A]">Chưa có giá trị tài sản để phân bổ theo Hãng</p><p className="mt-1 text-xs leading-5 text-[#8AA0B6]">Hãy gán Hãng trong hồ sơ tài sản để xem thống kê.</p></div></div> : <div className="grid gap-5 p-5 lg:grid-cols-[minmax(260px,.75fr)_minmax(360px,1.25fr)]"><div className="flex h-[250px] items-center justify-center"><div className="grid h-48 w-48 place-items-center rounded-full border-[18px] border-[#D9F0EC] bg-white text-center shadow-[inset_0_0_0_1px_rgba(16,42,67,.04)]"><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8AA0B6]">Số hãng</div><div className="mt-1 font-display text-4xl font-extrabold text-[#087A6A]">{data.length}</div><div className="mt-1 text-[11px] text-[#71869A]">trong phạm vi lọc</div></div></div></div><div className="space-y-3">{data.map((item) => { const percentage = totalValue ? Math.round((item.value / totalValue) * 100) : 0; return <div key={item.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-[#193B57]">{item.name}</span></div><span className="shrink-0 text-xs font-extrabold text-[#102A43]">{percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EAF0F4]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, percentage)}%`, backgroundColor: item.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#71869A]"><span>{item.assetCount} tài sản</span><span className="font-bold text-[#60758A]">{currency(item.value)}</span></div></div>; })}</div></div>}</section>;
}

function ActivityLog({ data, loading, query, type, onQueryChange, onTypeChange, allActivities }: { data: Array<{ id: number; createdAt: Date | number | string; actorName: string | null; entityType: string; entityId: number; action: string; summary: string | null }>; loading: boolean; query: string; type: string; onQueryChange: (value: string) => void; onTypeChange: (value: string) => void; allActivities: Array<{ entityType: string }> }) { return <section className={`mt-5 overflow-hidden ${card}`}><div className="border-b border-[#E7EEF3] px-5 py-4"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_190px]"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-[#8AA0B6]" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm người thực hiện hoặc thao tác..." className="field-input pl-9" /></div><select value={type} onChange={(event) => onTypeChange(event.target.value)} className="field-input"><option value="all">Tất cả đối tượng</option>{[...new Set(allActivities.map((item) => item.entityType))].map((entityType) => <option key={entityType} value={entityType}>{entityType}</option>)}</select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!loading && data.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{item.entityType} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!loading && !data.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div></section>; }

function Metric({ label, value }: { label: string; value: string }) { return <div className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{label}</div><div className="mt-1 break-words font-display text-2xl font-extrabold text-[#102A43]">{value}</div></div>; }
