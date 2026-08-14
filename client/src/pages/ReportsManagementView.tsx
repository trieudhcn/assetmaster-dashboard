import { useMemo, useState } from "react";
import { Download, FileBarChart, History, Search, SlidersHorizontal } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const card = "rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";

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
  const auditsQuery = trpc.audits.list.useQuery();
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isAdmin });
  const divisionsQuery = trpc.departments.listAllDivisions.useQuery(undefined, { enabled: isAdmin });
  const activitiesQuery = trpc.activity.list.useQuery({ limit: 150 }, { enabled: isAdmin });
  const departments = departmentsQuery.data || [];
  const divisions = divisionsQuery.data || [];
  const employees = employeesQuery.data || [];
  const employeeById = new Map(employees.map((item) => [item.id, item]));
  const departmentById = new Map(departments.map((item) => [item.id, item]));
  const divisionById = new Map(divisions.map((item) => [item.id, item]));
  const availableDivisions = divisions.filter((item) => item.isActive && (departmentId === "all" || item.departmentId === Number(departmentId)));
  const selectedAssets = useMemo(() => (assetsQuery.data || []).filter((asset) => {
    const assetDivisionId = asset.holderUserId ? employeeById.get(asset.holderUserId)?.divisionId : null;
    return (departmentId === "all" || asset.departmentId === Number(departmentId)) && (divisionId === "all" || assetDivisionId === Number(divisionId));
  }), [assetsQuery.data, employeeById, departmentId, divisionId]);
  const selectedAssetIds = new Set(selectedAssets.map((item) => item.id));
  const selectedHandoverCount = (handoversQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedMaintenanceCount = (maintenanceQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedValue = selectedAssets.reduce((sum, item) => sum + Number(item.purchaseValue || 0), 0);
  const selectedDepartment = departmentId === "all" ? undefined : departmentById.get(Number(departmentId));
  const selectedDivision = divisionId === "all" ? undefined : divisionById.get(Number(divisionId));
  const filteredActivities = useMemo(() => (activitiesQuery.data || []).filter((item) => (activityType === "all" || item.entityType === activityType) && `${item.summary || ""} ${item.actorName || ""} ${item.action}`.toLowerCase().includes(activityQuery.toLowerCase())), [activitiesQuery.data, activityType, activityQuery]);

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

  const hasOrgError = departmentsQuery.isError || divisionsQuery.isError || employeesQuery.isError;
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo tài sản</h1><p className="mt-1 text-sm text-[#71869A]">Thống kê và xuất danh mục tài sản theo Phòng Ban hoặc Bộ Phận của người sử dụng.</p></div>{hasOrgError ? <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5"><div className="font-bold text-[#A86B00]">Không thể tải bộ lọc cơ cấu tổ chức</div><button onClick={() => { void employeesQuery.refetch(); void departmentsQuery.refetch(); void divisionsQuery.refetch(); }} className="mt-3 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00]">Thử lại</button></section> : <><section className={`${card} p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><SlidersHorizontal size={16} className="text-[#2666A8]" />Phạm vi thống kê</div><p className="mt-1 text-xs text-[#71869A]">Bộ Phận được lọc theo nhân sự đang giữ tài sản và luôn thuộc Phòng Ban đã chọn.</p></div><div className="grid gap-2 sm:grid-cols-3"><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setDivisionId("all"); }} disabled={!isAdmin || departmentsQuery.isLoading} className="field-input min-w-[200px]"><option value="all">Tất cả Phòng Ban</option>{departments.filter((item) => item.isActive).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><select value={divisionId} onChange={(event) => setDivisionId(event.target.value)} disabled={!isAdmin || divisionsQuery.isLoading} className="field-input min-w-[200px]"><option value="all">Tất cả Bộ Phận</option>{availableDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select><button onClick={() => { setDepartmentId("all"); setDivisionId("all"); }} className="rounded-lg border border-[#DDE7F0] bg-white px-4 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đặt lại</button></div></div></section><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tài sản trong phạm vi" value={String(selectedAssets.length)} /><Metric label="Giá trị tài sản" value={`${new Intl.NumberFormat("vi-VN").format(selectedValue)} ₫`} /><Metric label="Phiếu bàn giao liên quan" value={String(selectedHandoverCount)} /><Metric label="Yêu cầu bảo trì liên quan" value={String(selectedMaintenanceCount)} /></div><section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo cơ cấu</div><p className="mt-1 text-xs text-[#71869A]">{selectedDepartment ? `Phòng Ban: ${selectedDepartment.name}` : "Tất cả Phòng Ban"}{selectedDivision ? ` · Bộ Phận: ${selectedDivision.name}` : ""}</p></div><button onClick={exportExcel} disabled={!isAdmin || !selectedAssets.length} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} />Xuất Excel ({selectedAssets.length})</button></div></section></>}{isAdmin && <section className={`mt-5 overflow-hidden ${card}`}><div className="border-b border-[#E7EEF3] px-5 py-4"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_190px]"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-[#8AA0B6]" /><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Tìm người thực hiện hoặc thao tác..." className="field-input pl-9" /></div><select value={activityType} onChange={(event) => setActivityType(event.target.value)} className="field-input"><option value="all">Tất cả đối tượng</option>{[...new Set((activitiesQuery.data || []).map((item) => item.entityType))].map((type) => <option key={type} value={type}>{type}</option>)}</select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{activitiesQuery.isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!activitiesQuery.isLoading && filteredActivities.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{item.entityType} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!activitiesQuery.isLoading && !filteredActivities.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div></section>}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{label}</div><div className="mt-1 break-words font-display text-2xl font-extrabold text-[#102A43]">{value}</div></div>; }
