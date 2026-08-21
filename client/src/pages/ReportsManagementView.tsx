import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileBarChart, History, PieChart as PieChartIcon, Search, SlidersHorizontal, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { matchesVietnameseSearch } from "@/lib/catalogUi";
import { SearchableSelect } from "@/components/SearchableSelect";
import { formatCompactVnd, type CurrencyDisplayMode } from "@/lib/formatters";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { openRetirementPdf } from "@/lib/retirementPdf";
import { buildRetirementDetailWorkbook, serviceCostsByAsset } from "@/lib/retirementExcel";
import { InteractiveValueAllocation, type AllocationGroup } from "@/components/InteractiveValueAllocation";
import { InteractiveAllocationAssetDetails } from "@/components/InteractiveAllocationAssetDetails";
import { QuickServiceTicketPreview } from "@/components/QuickServiceTicketPreview";
import { previewServiceTicketPdf } from "@/lib/serviceTicketPdf";

const card = "rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";
const divisionColors = ["#0F8C8C", "#2666A8", "#E59B24", "#7666B3", "#CF5C4B", "#3F9C6D", "#5B7FA3"];
const currency = (value: number, mode: CurrencyDisplayMode = "full") => formatCompactVnd(value, mode);
type DivisionValue = { id: string; name: string; value: number; assetCount: number; color: string };
type BrandValue = { id: string; name: string; value: number; assetCount: number; color: string };

const activityEntityLabels: Record<string, string> = {
  asset: "Tài sản",
  assets: "Tài sản",
  handover: "Bàn giao",
  handovers: "Bàn giao",
  maintenance: "Bảo trì",
  audit: "Kiểm kê",
  audits: "Kiểm kê",
  category: "Phân loại",
  categories: "Phân loại",
  department: "Phòng ban",
  division: "Bộ phận",
  employee: "Nhân sự",
  vendor: "Nhà cung cấp",
  brand: "Hãng",
  user: "Người dùng",
  company: "Doanh nghiệp",
};

const activityEntityLabel = (entityType: string) => activityEntityLabels[entityType] || entityType;
const serviceTicketStatusLabel = (status: string) => ({ pending: "Chờ xử lý", in_progress: "Đang xử lý", resolved: "Đã xử lý", closed: "Đã đóng", cancelled: "Đã hủy" }[status] || status || "—");

function ServiceCostTrendChart({ data, maxCost, yearLabel, currencyMode, selectedMonth, onSelectMonth }: { data: Array<{ month: string; repairCost: number; warrantyCost: number; totalCost: number; repairTicketCount: number; warrantyTicketCount: number; totalTicketCount: number }>; maxCost: number; yearLabel: string; currencyMode: CurrencyDisplayMode; selectedMonth: number | null; onSelectMonth: (monthIndex: number) => void }) {
  return <div className="rounded-xl border border-[#E0E8F0] bg-[#FBFCFE] p-3 sm:p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-extrabold text-[#193B57]">Biến động chi phí theo tháng</div><div className="mt-1 text-[10px] font-semibold text-[#71869A]"><span className="sm:hidden">Chọn tháng để xem phiếu</span><span className="hidden sm:inline">{yearLabel} · Nhấn cột để xem phiếu</span></div></div><div className="flex items-center gap-2 text-[10px] font-semibold text-[#60758A]"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#E59B24]" />Sửa chữa</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#2666A8]" />Bảo hành</span></div></div><div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">{data.map((item, index) => { const total = Math.max(item.totalCost, 0); const repairRatio = total > 0 ? Math.round((item.repairCost / total) * 100) : 0; const isSelected = selectedMonth === index; return <button type="button" key={item.month} onClick={() => onSelectMonth(index)} aria-label={`Xem phiếu chi phí ${item.month}`} className={`rounded-lg border p-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#2666A8] ${isSelected ? "border-[#2666A8] bg-[#EAF3FB] shadow-[0_3px_10px_rgba(38,102,168,0.12)]" : "border-[#DFE9F0] bg-white hover:border-[#9EC0E2]"}`}><div className="flex items-center justify-between"><span className="text-[10px] font-extrabold text-[#193B57]">{item.month}</span><span className="h-1.5 w-8 overflow-hidden rounded-full bg-[#E8EDF2]"><span className="block h-full bg-[#E59B24]" style={{ width: `${repairRatio}%` }} /><span className="-mt-1.5 block h-full bg-[#2666A8]" style={{ width: `${100 - repairRatio}%`, marginLeft: `${repairRatio}%`, opacity: item.warrantyCost > 0 ? 1 : 0 }} /></span></div><div className="mt-1 truncate text-[10px] font-extrabold text-[#2666A8]">{currency(total, currencyMode)}</div><div className="mt-1 flex flex-wrap gap-x-1.5 text-[9px] font-bold"><span className="text-[#2666A8]">BH {item.warrantyTicketCount}</span><span className="text-[#A86B00]">SC {item.repairTicketCount}</span><span className="text-[#71869A]">· {item.totalTicketCount} phiếu</span></div></button>; })}</div><div className="mt-4 hidden sm:block"><div className="flex h-36 items-end gap-2 border-b border-[#DCE7EF] pb-1">{data.map((item, index) => { const height = maxCost > 0 ? Math.max(3, Math.round((item.totalCost / maxCost) * 100)) : 3; const repairHeight = item.totalCost > 0 ? Math.round((item.repairCost / item.totalCost) * 100) : 0; const isSelected = selectedMonth === index; return <button type="button" key={item.month} onClick={() => onSelectMonth(index)} className={`group relative flex h-full min-w-9 flex-1 items-end rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#2666A8] ${isSelected ? "bg-[#EAF3FB]" : "hover:bg-[#F0F6FA]"}`} title={`${item.month}: ${currency(item.totalCost, currencyMode)} · Sửa chữa ${currency(item.repairCost, currencyMode)} · Bảo hành ${currency(item.warrantyCost, currencyMode)}`} aria-label={`Xem phiếu chi phí ${item.month}`}><div className={`relative w-full overflow-hidden rounded-t-[4px] bg-[#E8EDF2] transition-transform duration-150 group-hover:-translate-y-1 ${isSelected ? "ring-2 ring-[#2666A8]" : ""}`} style={{ height: `${height}%` }}><div className="absolute inset-x-0 bottom-0 bg-[#E59B24]" style={{ height: `${repairHeight}%` }} /><div className="absolute inset-x-0 top-0 bg-[#2666A8]" style={{ height: `${100 - repairHeight}%`, opacity: item.warrantyCost > 0 ? 1 : 0 }} /></div></button>; })}</div><div className="mt-2 flex gap-2">{data.map((item, index) => <button type="button" key={item.month} onClick={() => onSelectMonth(index)} className={`h-7 min-w-9 flex-1 rounded-md text-center text-[10px] font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-[#2666A8] ${selectedMonth === index ? "bg-[#EAF3FB] text-[#2666A8]" : "text-[#71869A] hover:bg-[#F0F6FA]"}`}>{item.month}</button>)}</div></div>{selectedMonth !== null && <p className="mt-2 text-[10px] font-bold text-[#2666A8]">Đang chọn {data[selectedMonth]?.month || `tháng ${selectedMonth + 1}`} · Danh sách phiếu hiển thị bên dưới.</p>}{maxCost === 0 && <p className="mt-3 text-center text-xs text-[#8AA0B6]">Chưa có chi phí trong năm đã chọn.</p>}</div>;
}

export function ReportsManagementView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departmentId, setDepartmentId] = useState("all");
  const [divisionId, setDivisionId] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [currencyMode, setCurrencyMode] = useState<CurrencyDisplayMode>("full");
  const [exporting, setExporting] = useState<"inventory" | "returned" | "retired" | "retiredPdf" | "repairCosts" | null>(null);
  const [serviceCostYear, setServiceCostYear] = useState("all");
  const [serviceCostChannel, setServiceCostChannel] = useState<"all" | "warranty" | "repair">("all");
  const [selectedServiceCostMonth, setSelectedServiceCostMonth] = useState<number | null>(null);
  const [monthlyServiceTicketPage, setMonthlyServiceTicketPage] = useState(1);
  const [quickPreviewServiceTicketId, setQuickPreviewServiceTicketId] = useState<number | null>(null);
  const [quickPreviewPdfAction, setQuickPreviewPdfAction] = useState<"preview" | "print" | null>(null);
  const [retirementYear, setRetirementYear] = useState("all");
  const [selectedRetirementIds, setSelectedRetirementIds] = useState<Set<number>>(() => new Set());
  const [allocationSelection, setAllocationSelection] = useState<{ type: "division" | "brand" | "supplier"; id: string; name: string } | null>(null);
  const [returnAssetPopupId, setReturnAssetPopupId] = useState<number | null>(null);
  const assetsQuery = trpc.assets.list.useQuery();
  const handoversQuery = trpc.handovers.list.useQuery();
  const maintenanceQuery = trpc.maintenance.list.useQuery();
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isAdmin });
  const divisionsQuery = trpc.departments.listAllDivisions.useQuery(undefined, { enabled: isAdmin });
  const brandsQuery = trpc.brands.list.useQuery();
  const assetCategoriesQuery = trpc.assetCategories.list.useQuery();
  const companyQuery = trpc.company.get.useQuery();
  const retirementCertificatesQuery = trpc.retirementCertificates.list.useQuery();
  const activitiesQuery = trpc.activity.list.useQuery({ limit: 150 }, { enabled: isAdmin });

  const departments = departmentsQuery.data || [];
  const divisions = divisionsQuery.data || [];
  const employees = employeesQuery.data || [];
  const employeeById = new Map(employees.map((item) => [item.id, item]));
  const departmentById = new Map(departments.map((item) => [item.id, item]));
  const divisionById = new Map(divisions.map((item) => [item.id, item]));
  const brandById = new Map((brandsQuery.data || []).map((item) => [item.id, item]));
  const categoryById = new Map((assetCategoriesQuery.data || []).map((item) => [item.id, item]));
  const quickPreviewServiceTicket = (maintenanceQuery.data || []).find((ticket) => ticket.id === quickPreviewServiceTicketId);
  const quickPreviewAsset = quickPreviewServiceTicket ? (assetsQuery.data || []).find((asset) => asset.id === quickPreviewServiceTicket.assetId) : undefined;
  const quickPreviewAssigneeName = quickPreviewServiceTicket?.assigneeUserId ? employeeById.get(quickPreviewServiceTicket.assigneeUserId)?.name || undefined : undefined;
  const quickPreviewReporter = quickPreviewServiceTicket?.reporterUserId ? employeeById.get(quickPreviewServiceTicket.reporterUserId) : undefined;
  const quickPreviewReporterDepartment = quickPreviewReporter?.departmentId ? departmentById.get(quickPreviewReporter.departmentId) : undefined;
  const quickPreviewReporterDivision = quickPreviewReporter?.divisionId ? divisionById.get(quickPreviewReporter.divisionId) : undefined;
  const availableDivisions = divisions.filter((item) => item.isActive && (departmentId === "all" || item.departmentId === Number(departmentId)));
  const selectedDepartment = departmentId === "all" ? undefined : departmentById.get(Number(departmentId));
  const selectedDivision = divisionId === "all" ? undefined : divisionById.get(Number(divisionId));

  const selectedAssets = useMemo(() => (assetsQuery.data || []).filter((asset) => {
    const assetDivisionId = asset.holderUserId ? employeeById.get(asset.holderUserId)?.divisionId : null;
    return (departmentId === "all" || asset.departmentId === Number(departmentId)) && (divisionId === "all" || assetDivisionId === Number(divisionId));
  }), [assetsQuery.data, employeeById, departmentId, divisionId]);
  const inventoryAssets = useMemo(() => selectedAssets.filter((asset) => asset.status !== "returned_to_vendor" && asset.status !== "retired"), [selectedAssets]);
  const selectedAssetIds = new Set(inventoryAssets.map((item) => item.id));
  const supplierReturnedAssets = useMemo(() => selectedAssets.filter((asset) => asset.status === "returned_to_vendor"), [selectedAssets]);
  const retirementCandidates = useMemo(() => selectedAssets.filter((asset) => asset.status === "retired"), [selectedAssets]);
  const retirementYearOptions = useMemo(() => [...new Set(retirementCandidates.map((asset) => asset.retiredAt ? new Date(asset.retiredAt).getFullYear() : NaN).filter(Number.isFinite))].sort((left, right) => right - left), [retirementCandidates]);
  const retiredAssets = useMemo(() => retirementCandidates.filter((asset) => retirementYear === "all" || (asset.retiredAt && String(new Date(asset.retiredAt).getFullYear()) === retirementYear)), [retirementCandidates, retirementYear]);
  const retiredCertificateGroups = useMemo(() => {
    const groups = new Map<string, { key: string; referenceCode: string; retiredAt: Date | null; assets: typeof retiredAssets }>();
    retiredAssets.forEach((asset) => {
      const key = asset.retirementCertificateNumber || `asset-${asset.id}`;
      const current = groups.get(key) || { key, referenceCode: asset.retirementCertificateNumber || "Chưa cấp số", retiredAt: asset.retiredAt || null, assets: [] };
      current.assets.push(asset);
      if (!current.retiredAt && asset.retiredAt) current.retiredAt = asset.retiredAt;
      groups.set(key, current);
    });
    return [...groups.values()].sort((left, right) => right.referenceCode.localeCompare(left.referenceCode));
  }, [retiredAssets]);
  const salvageValueByAssetId = useMemo(() => {
    const values = new Map<number, number>();
    (retirementCertificatesQuery.data || []).filter((certificate) => certificate.status !== "draft").forEach((certificate) => certificate.items.forEach((item) => values.set(item.assetId, Number(item.salvageValue || 0))));
    return values;
  }, [retirementCertificatesQuery.data]);
  const retirementServiceCostByAssetId = useMemo(() => serviceCostsByAsset(maintenanceQuery.data || []), [maintenanceQuery.data]);
  const retirementValueByYear = useMemo(() => {
    const buckets = new Map<string, { year: string; count: number; value: number }>();
    retiredAssets.forEach((asset) => {
      const date = asset.retiredAt ? new Date(asset.retiredAt) : null;
      const year = date && Number.isFinite(date.getTime()) ? String(date.getFullYear()) : "Chưa ghi nhận ngày";
      const current = buckets.get(year) || { year, count: 0, value: 0 };
      current.count += 1;
      current.value += salvageValueByAssetId.get(asset.id) || 0;
      buckets.set(year, current);
    });
    return [...buckets.values()].sort((left, right) => right.year.localeCompare(left.year));
  }, [retiredAssets, salvageValueByAssetId]);
  const retiredTotalValue = retiredAssets.reduce((sum, asset) => sum + (salvageValueByAssetId.get(asset.id) || 0), 0);
  const selectedRetirementAssets = retiredAssets.filter((asset) => selectedRetirementIds.has(asset.id));
  const allRetiredAssetsSelected = retiredAssets.length > 0 && selectedRetirementAssets.length === retiredAssets.length;
  const selectedHandoverCount = (handoversQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedMaintenanceCount = (maintenanceQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedValue = inventoryAssets.reduce((sum, item) => sum + Number(item.purchaseValue || 0), 0);
  const serviceCostYears = useMemo(() => [...new Set((maintenanceQuery.data || []).filter((ticket) => selectedAssets.some((asset) => asset.id === ticket.assetId) && Number(ticket.actualCost || 0) > 0).map((ticket) => ticket.ticketYear || new Date(ticket.openedAt).getFullYear()))].sort((left, right) => right - left), [maintenanceQuery.data, selectedAssets]);
  const serviceCostReport = useMemo(() => {
    const assetById = new Map(selectedAssets.map((asset) => [asset.id, asset]));
    const allRows = (maintenanceQuery.data || []).filter((ticket) => {
      const cost = Number(ticket.actualCost || 0);
      const ticketYear = ticket.ticketYear || new Date(ticket.openedAt).getFullYear();
      return assetById.has(ticket.assetId) && Number.isFinite(cost) && cost > 0 && (serviceCostYear === "all" || String(ticketYear) === serviceCostYear);
    }).map((ticket) => {
      const asset = assetById.get(ticket.assetId)!;
      return {
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        channel: ticket.serviceChannel === "warranty" ? "Bảo hành" : "Sửa chữa",
        assetCode: asset.assetCode,
        assetName: asset.name,
        departmentName: asset.departmentId ? departmentById.get(asset.departmentId)?.name || "Chưa gán Phòng Ban" : "Chưa gán Phòng Ban",
        openedAt: ticket.openedAt,
        resolvedAt: ticket.resolvedAt,
        status: ticket.status,
        description: ticket.description,
        actualCost: Number(ticket.actualCost || 0),
      };
    }).sort((left, right) => right.actualCost - left.actualCost || new Date(right.openedAt).getTime() - new Date(left.openedAt).getTime());
    const rows = serviceCostChannel === "all" ? allRows : allRows.filter((item) => serviceCostChannel === "warranty" ? item.channel === "Bảo hành" : item.channel === "Sửa chữa");
    const repairCost = allRows.filter((item) => item.channel === "Sửa chữa").reduce((total, item) => total + item.actualCost, 0);
    const warrantyCost = allRows.filter((item) => item.channel === "Bảo hành").reduce((total, item) => total + item.actualCost, 0);
    return { totalCost: repairCost + warrantyCost, repairCost, warrantyCost, filteredTotalCost: rows.reduce((total, item) => total + item.actualCost, 0), ticketCount: rows.length, assetCount: new Set(rows.map((item) => item.assetCode)).size, rows, allRows };
  }, [selectedAssets, maintenanceQuery.data, departmentById, serviceCostYear, serviceCostChannel]);
  const monthlyServiceCostTrend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({ month: `T${index + 1}`, repairCost: 0, warrantyCost: 0, totalCost: 0, repairTicketCount: 0, warrantyTicketCount: 0, totalTicketCount: 0 }));
    serviceCostReport.allRows.forEach((item) => {
      const date = new Date(item.openedAt);
      if (!Number.isFinite(date.getTime())) return;
      const month = months[date.getMonth()];
      if (!month) return;
      if (item.channel === "Bảo hành") { month.warrantyCost += item.actualCost; month.warrantyTicketCount += 1; }
      else { month.repairCost += item.actualCost; month.repairTicketCount += 1; }
      month.totalCost += item.actualCost;
      month.totalTicketCount += 1;
    });
    return months;
  }, [serviceCostReport.allRows]);
  const monthlyServiceCostMax = Math.max(...monthlyServiceCostTrend.map((item) => item.totalCost), 0);
  const selectedMonthlyServiceTickets = useMemo(() => selectedServiceCostMonth === null ? [] : serviceCostReport.rows.filter((item) => new Date(item.openedAt).getMonth() === selectedServiceCostMonth), [selectedServiceCostMonth, serviceCostReport.rows]);
  const monthlyServiceTicketPageSize = 5;
  const monthlyServiceTicketTotalPages = Math.max(1, Math.ceil(selectedMonthlyServiceTickets.length / monthlyServiceTicketPageSize));
  const visibleMonthlyServiceTickets = selectedMonthlyServiceTickets.slice((monthlyServiceTicketPage - 1) * monthlyServiceTicketPageSize, monthlyServiceTicketPage * monthlyServiceTicketPageSize);
  const divisionValueData = useMemo<DivisionValue[]>(() => {
    const buckets = new Map<string, Omit<DivisionValue, "color">>();
    inventoryAssets.forEach((asset) => {
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
  }, [inventoryAssets, employeeById, divisionById]);
  const supplierValueData = useMemo<BrandValue[]>(() => {
    const buckets = new Map<string, Omit<BrandValue, "color">>();
    inventoryAssets.forEach((asset) => {
      const id = asset.vendorId ? String(asset.vendorId) : "unassigned";
      const name = asset.vendor || "Chưa gán Nhà cung cấp";
      const current = buckets.get(id) || { id, name, value: 0, assetCount: 0 };
      current.value += Number(asset.purchaseValue || 0);
      current.assetCount += 1;
      buckets.set(id, current);
    });
    return [...buckets.values()].sort((left, right) => right.value - left.value).map((item, index) => ({ ...item, color: divisionColors[index % divisionColors.length] }));
  }, [inventoryAssets]);
  const brandValueData = useMemo<BrandValue[]>(() => {
    const buckets = new Map<string, Omit<BrandValue, "color">>();
    inventoryAssets.forEach((asset) => {
      const brand = asset.brandId ? brandById.get(asset.brandId) : undefined;
      const id = brand ? String(brand.id) : "unassigned";
      const name = brand?.name || "Chưa gán Hãng";
      const current = buckets.get(id) || { id, name, value: 0, assetCount: 0 };
      current.value += Number(asset.purchaseValue || 0);
      current.assetCount += 1;
      buckets.set(id, current);
    });
    return [...buckets.values()].sort((left, right) => right.value - left.value).map((item, index) => ({ ...item, color: divisionColors[index % divisionColors.length] }));
  }, [inventoryAssets, brandById]);
  const selectedAllocationAssets = useMemo(() => {
    if (!allocationSelection) return [];
    return inventoryAssets.filter((asset) => {
      if (allocationSelection.type === "division") {
        const assetDivisionId = asset.holderUserId ? employeeById.get(asset.holderUserId)?.divisionId : null;
        return allocationSelection.id === "unassigned" ? !assetDivisionId : String(assetDivisionId) === allocationSelection.id;
      }
      if (allocationSelection.type === "brand") return allocationSelection.id === "unassigned" ? !asset.brandId : String(asset.brandId) === allocationSelection.id;
      return allocationSelection.id === "unassigned" ? !asset.vendorId : String(asset.vendorId) === allocationSelection.id;
    }).map((asset) => {
      const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
      return {
        ...asset,
        departmentName: asset.departmentId ? departmentById.get(asset.departmentId)?.name || "Chưa gán" : "Chưa gán",
        divisionName: holder?.divisionId ? divisionById.get(holder.divisionId)?.name || "Chưa gán" : "Chưa gán",
        categoryName: asset.categoryId ? categoryById.get(asset.categoryId)?.name || "Chưa phân loại" : "Chưa phân loại",
        brandName: asset.brandId ? brandById.get(asset.brandId)?.name || "Chưa gán Hãng" : "Chưa gán Hãng",
      };
    });
  }, [allocationSelection, inventoryAssets, employeeById, departmentById, divisionById, categoryById, brandById]);
  const filteredActivities = useMemo(() => (activitiesQuery.data || []).filter((item) => (activityType === "all" || item.entityType === activityType) && matchesVietnameseSearch(`${item.summary || ""} ${item.actorName || ""} ${item.action}`, activityQuery)), [activitiesQuery.data, activityType, activityQuery]);
  const hasOrgError = departmentsQuery.isError || divisionsQuery.isError || employeesQuery.isError;

  useEffect(() => {
    const eligibleIds = new Set(retiredAssets.map((asset) => asset.id));
    setSelectedRetirementIds((current) => {
      const filtered = [...current].filter((id) => eligibleIds.has(id));
      return filtered.length === current.size ? current : new Set(filtered);
    });
  }, [retiredAssets]);

  useEffect(() => { setAllocationSelection(null); }, [departmentId, divisionId]);

  useEffect(() => { setMonthlyServiceTicketPage(1); }, [selectedServiceCostMonth, serviceCostYear, serviceCostChannel]);
  useEffect(() => { setMonthlyServiceTicketPage((page) => Math.min(page, monthlyServiceTicketTotalPages)); }, [monthlyServiceTicketTotalPages]);

  useEffect(() => {
    const rawContext = sessionStorage.getItem("assetmaster-return-asset-popup");
    if (!rawContext || assetsQuery.isLoading) return;
    sessionStorage.removeItem("assetmaster-return-asset-popup");
    try {
      const context = JSON.parse(rawContext) as { assetId?: number };
      const asset = (assetsQuery.data || []).find((item) => item.id === context.assetId);
      if (!asset) { toast.error("Không tìm thấy tài sản để quay lại popup chi tiết."); return; }
      const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
      const division = holder?.divisionId ? divisionById.get(holder.divisionId) : undefined;
      setAllocationSelection({ type: "division", id: division ? String(division.id) : "unassigned", name: division?.name || "Chưa gán Bộ Phận" });
      setReturnAssetPopupId(asset.id);
    } catch {
      toast.error("Không thể khôi phục popup chi tiết tài sản.");
    }
  }, [assetsQuery.data, assetsQuery.isLoading, employeeById, divisionById]);

  const exportSupplierReturnExcel = () => {
    if (!supplierReturnedAssets.length || exporting) return;
    setExporting("returned");
    const loadingToast = toast.loading("Đang tạo báo cáo tài sản trả nhà cung cấp...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = supplierReturnedAssets.map((asset) => ({
          "Mã tài sản": asset.assetCode,
          "Tên tài sản": asset.name,
          "Nhà cung cấp": asset.vendor || "Chưa cập nhật",
          "Ngày mua": asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "",
          "Ngày trả nhà cung cấp": asset.supplierReturnedAt ? new Date(asset.supplierReturnedAt).toLocaleDateString("vi-VN") : "",
          "Lý do trả nhà cung cấp": asset.supplierReturnReason || "",
          "Giá trị (VNĐ)": Number(asset.purchaseValue || 0),
          "Serial/IMEI": asset.serialNumber || "",
          "Vị trí": asset.location || "",
        }));
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 42 }, { wch: 18 }, { wch: 20 }, { wch: 22 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Trả nhà cung cấp");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "BÁO CÁO TÀI SẢN ĐÃ TRẢ NHÀ CUNG CẤP",
          fileName: "assetmaster-tai-san-tra-nha-cung-cap.xlsx",
          description: `Báo cáo ${rows.length} tài sản trả nhà cung cấp theo phạm vi lọc hiện tại.`,
        });
        toast.success(`Đã xuất ${rows.length} tài sản trả nhà cung cấp.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất báo cáo trả nhà cung cấp.", { id: loadingToast });
      } finally {
        setExporting(null);
      }
    })(); }, 180);
  };

  const exportRepairCostExcel = () => {
    if (!serviceCostReport.rows.length || exporting) return;
    setExporting("repairCosts");
    const loadingToast = toast.loading("Đang chuẩn bị bản xem trước chi phí Bảo hành/Sửa chữa...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = serviceCostReport.rows.map((item) => ({ "Mã phiếu": item.ticketCode, "Kênh xử lý": item.channel, "Mã tài sản": item.assetCode, "Tên tài sản": item.assetName, "Phòng Ban": item.departmentName, "Ngày mở phiếu": new Date(item.openedAt).toLocaleDateString("vi-VN"), "Ngày hoàn tất": item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString("vi-VN") : "", "Trạng thái": item.status, "Nội dung": item.description, "Chi phí thực tế (VNĐ)": item.actualCost }));
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 34 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 46 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Chi phí dịch vụ");
        const scope = (selectedDivision?.name || selectedDepartment?.name || "tat-ca").replace(/[^a-zA-Z0-9]/g, "-");
        const channelLabel = serviceCostChannel === "warranty" ? "Bảo hành" : serviceCostChannel === "repair" ? "Sửa chữa" : "Bảo hành và Sửa chữa";
        await writeBrandedWorkbook(workbook, { documentTitle: "DANH SÁCH CHI PHÍ BẢO HÀNH / SỬA CHỮA", fileName: `assetmaster-chi-phi-${serviceCostChannel}-${serviceCostYear === "all" ? "tat-ca-nam" : serviceCostYear}-${scope}.xlsx`, description: `Kênh: ${channelLabel} · Năm ${serviceCostYear === "all" ? "tất cả" : serviceCostYear} · ${serviceCostReport.ticketCount} phiếu · ${serviceCostReport.assetCount} tài sản · Tổng chi phí ${serviceCostReport.filteredTotalCost.toLocaleString("vi-VN")} VNĐ.` });
        toast.success(`Đã mở xem trước ${serviceCostReport.ticketCount} phiếu có chi phí.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể tạo bản xem trước chi phí Bảo hành/Sửa chữa.", { id: loadingToast });
      } finally {
        setExporting(null);
      }
    })(); }, 180);
  };

  const exportRetirementExcel = () => {
    if (!retiredAssets.length || exporting) return;
    setExporting("retired");
    const loadingToast = toast.loading("Đang tạo danh sách tài sản thanh lý...");
    window.setTimeout(() => { void (async () => {
      try {
        const { workbook, summary, totalRowNumber } = buildRetirementDetailWorkbook({ assets: retiredAssets, salvageValueByAssetId, serviceCostByAssetId: retirementServiceCostByAssetId });
        const scope = selectedDivision?.name || selectedDepartment?.name || "tat-ca";
        await writeBrandedWorkbook(workbook, {
          company: companyQuery.data,
          documentTitle: "DANH SÁCH TÀI SẢN KHẤU HAO / THANH LÝ",
          fileName: `assetmaster-danh-sach-thanh-ly-chi-tiet-${retirementYear === "all" ? "tat-ca-nam" : retirementYear}-${scope.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`,
          description: `Năm ${retirementYear === "all" ? "tất cả" : retirementYear} · ${retiredAssets.length} tài sản · Tổng giá mua ${summary.totalPurchaseValue.toLocaleString("vi-VN")} VNĐ · Tổng phí BH/SC ${(summary.totalWarrantyCost + summary.totalRepairCost).toLocaleString("vi-VN")} VNĐ · Tổng giá thanh lý ${summary.totalSalvageValue.toLocaleString("vi-VN")} VNĐ.`,
          prepareWorkbook: (brandedWorkbook) => { const sheet = brandedWorkbook.getWorksheet("Danh sách thanh lý"); if (!sheet) return; const totalRow = sheet.getRow(totalRowNumber); totalRow.font = { bold: true, color: { argb: "FF087A6A" } }; totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F6F2" } }; [6, 7, 8, 9].forEach((column) => { sheet.getColumn(column).numFmt = "#,##0"; }); },
        });
        toast.success(`Đã xuất ${retiredAssets.length} tài sản thanh lý.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất danh sách tài sản thanh lý.", { id: loadingToast });
      } finally {
        setExporting(null);
      }
    })(); }, 180);
  };

  const exportSelectedRetirementPdf = async () => {
    if (!selectedRetirementAssets.length || exporting) return;
    setExporting("retiredPdf");
    const loadingToast = toast.loading("Đang tạo PDF gộp biên bản thanh lý...");
    try {
      await openRetirementPdf(selectedRetirementAssets.map((asset) => {
        const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
        const division = holder?.divisionId ? divisionById.get(holder.divisionId) : undefined;
        const department = asset.departmentId ? departmentById.get(asset.departmentId) : undefined;
        return {
          code: asset.assetCode,
          name: asset.name,
          category: asset.categoryId ? categoryById.get(asset.categoryId)?.name || "Chưa phân loại" : "Chưa phân loại",
          purchaseDate: asset.purchaseDate,
          value: asset.purchaseValue,
          serial: asset.serialNumber,
          location: asset.location,
          retiredAt: asset.retiredAt,
          retirementReason: asset.retirementReason,
          retirementCertificateNumber: asset.retirementCertificateNumber,
          retirementAttachmentName: asset.retirementAttachmentName,
          note: [asset.note, department?.name && `Phòng Ban: ${department.name}`, division?.name && `Bộ Phận: ${division.name}`].filter(Boolean).join(" · ") || null,
        };
      }), companyQuery.data || {}, `assetmaster-bien-ban-thanh-ly-${retirementYear === "all" ? "tong-hop" : retirementYear}.pdf`, `Biên bản thanh lý gộp (${selectedRetirementAssets.length} tài sản)`);
      toast.success(`Đã mở PDF gộp ${selectedRetirementAssets.length} biên bản thanh lý.`, { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error("Không thể tạo PDF gộp biên bản thanh lý.", { id: loadingToast });
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = () => {
    if (!inventoryAssets.length || exporting) return;
    setExporting("inventory");
    const loadingToast = toast.loading("Đang tạo báo cáo tài sản...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = inventoryAssets.map((asset) => {
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
        await writeBrandedWorkbook(workbook, {
          documentTitle: "BÁO CÁO TÀI SẢN THEO CƠ CẤU",
          fileName: `assetmaster-${scope.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`,
          description: `Phạm vi: ${selectedDepartment?.name || "Tất cả Phòng Ban"}${selectedDivision ? ` · ${selectedDivision.name}` : ""}.`,
        });
        toast.success(`Đã xuất ${rows.length} tài sản theo phạm vi lọc.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất báo cáo tài sản.", { id: loadingToast });
      } finally {
        setExporting(null);
      }
    })(); }, 180);
  };
  const openMonthlyServiceTicket = (ticketId: number) => {
    setQuickPreviewServiceTicketId(ticketId);
  };
  const openQuickPreviewPdf = async (autoPrint = false) => {
    if (!quickPreviewServiceTicket || quickPreviewPdfAction) return;
    const action = autoPrint ? "print" : "preview";
    setQuickPreviewPdfAction(action);
    const loadingToast = toast.loading(autoPrint ? `Đang chuẩn bị in phiếu ${quickPreviewServiceTicket.ticketCode}...` : `Đang tạo PDF phiếu ${quickPreviewServiceTicket.ticketCode}...`);
    try {
      await previewServiceTicketPdf({ ticket: quickPreviewServiceTicket, asset: quickPreviewAsset, assigneeName: quickPreviewAssigneeName, reporterDepartmentName: quickPreviewReporterDepartment?.name, reporterDivisionName: quickPreviewReporterDivision?.name, company: companyQuery.data || {}, autoPrint });
      toast.success(autoPrint ? "Đã mở bản in PDF." : "Đã mở bản xem trước PDF.", { id: loadingToast });
    } catch (error) {
      console.error("[Reports] service ticket PDF export failed", error);
      toast.error(error instanceof Error ? error.message : "Không thể tạo PDF phiếu Bảo hành/Sửa chữa.", { id: loadingToast });
    } finally {
      setQuickPreviewPdfAction(null);
    }
  };

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo tài sản</h1><p className="mt-1 text-sm text-[#71869A]">Thống kê, trực quan hóa và xuất danh mục tài sản theo Phòng Ban hoặc Bộ Phận của người sử dụng.</p></div>
    {hasOrgError ? <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5"><div className="font-bold text-[#A86B00]">Không thể tải bộ lọc cơ cấu tổ chức</div><button onClick={() => { void employeesQuery.refetch(); void departmentsQuery.refetch(); void divisionsQuery.refetch(); }} className="mt-3 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00]">Thử lại</button></section> : <>
      <section className={`${card} p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0 max-w-xl"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><SlidersHorizontal size={16} className="text-[#2666A8]" />Phạm vi thống kê</div><p className="mt-1 text-xs text-[#71869A]">Bộ Phận được lọc theo nhân sự đang giữ tài sản và luôn thuộc Phòng Ban đã chọn.</p></div><div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[680px] xl:grid-cols-4"><SearchableSelect value={currencyMode} onChange={(value) => setCurrencyMode(value as CurrencyDisplayMode)} className="min-w-0" placeholder="Đơn vị tiền" searchPlaceholder="Tìm đơn vị tiền..." options={[{ value: "full", label: "Đầy đủ (VNĐ)" }, { value: "million", label: "Triệu đồng" }, { value: "billion", label: "Tỷ đồng" }]} /><SearchableSelect value={departmentId} onChange={(value) => { setDepartmentId(value); setDivisionId("all"); }} disabled={!isAdmin || departmentsQuery.isLoading} className="min-w-0" placeholder="Tất cả Phòng Ban" searchPlaceholder="Tìm Phòng Ban..." options={[{ value: "all", label: "Tất cả Phòng Ban" }, ...departments.filter((item) => item.isActive).map((department) => ({ value: String(department.id), label: department.name }))]} /><SearchableSelect value={divisionId} onChange={setDivisionId} disabled={!isAdmin || divisionsQuery.isLoading} className="min-w-0" placeholder="Tất cả Bộ Phận" searchPlaceholder="Tìm Bộ Phận..." options={[{ value: "all", label: "Tất cả Bộ Phận" }, ...availableDivisions.map((division) => ({ value: String(division.id), label: division.name }))]} /><button onClick={() => { setDepartmentId("all"); setDivisionId("all"); }} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#DDE7F0] bg-white px-4 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button></div></div></section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tài sản trong phạm vi" value={String(inventoryAssets.length)} /><Metric label="Giá trị tài sản" value={currency(selectedValue, currencyMode)} /><Metric label="Phiếu bàn giao liên quan" value={String(selectedHandoverCount)} /><Metric label="Yêu cầu Bảo hành/Sửa chữa" value={String(selectedMaintenanceCount)} /></div>
      <section className={`mt-5 ${card} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><FileBarChart size={17} className="text-[#5B5BD6]" />Tổng chi phí Bảo hành/Sửa chữa</div><p className="mt-1 text-xs text-[#71869A]">Theo dõi tỷ trọng kênh xử lý và nhấn cột tháng để xem danh sách phiếu chi tiết.</p></div>
          <div className="flex flex-wrap items-center gap-3"><div className="w-44"><SearchableSelect value={serviceCostChannel} onChange={(value) => setServiceCostChannel(value as "all" | "warranty" | "repair")} options={[{ value: "all", label: "Bảo hành & Sửa chữa" }, { value: "warranty", label: "Chỉ Bảo hành" }, { value: "repair", label: "Chỉ Sửa chữa" }]} placeholder="Bảo hành & Sửa chữa" searchPlaceholder="Tìm kênh xử lý..." /></div><div className="w-40"><SearchableSelect value={serviceCostYear} onChange={(value) => { setServiceCostYear(value); setSelectedServiceCostMonth(null); }} options={[{ value: "all", label: "Tất cả các năm" }, ...serviceCostYears.map((year) => ({ value: String(year), label: `Năm ${year}` }))]} placeholder="Tất cả các năm" searchPlaceholder="Tìm năm..." /></div></div>
        </div>
        {maintenanceQuery.isLoading ? <div className="grid min-h-40 place-items-center text-sm text-[#71869A]">Đang tổng hợp chi phí Bảo hành/Sửa chữa...</div> : <div className="p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(290px,0.84fr)]">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#F0D9B8] bg-[#FFF9EB] px-3 py-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#A86B00]">Sửa chữa</div><div className="mt-1 text-xl font-extrabold text-[#8F5A00]">{currency(serviceCostReport.repairCost, currencyMode)}</div><div className="mt-2 text-[10px] font-semibold text-[#8F6B2D]">{serviceCostReport.totalCost ? `${Math.round((serviceCostReport.repairCost / serviceCostReport.totalCost) * 1000) / 10}% tổng cộng` : "0% tổng cộng"}</div></div>
              <div className="rounded-lg border border-[#D9E8F3] bg-[#F8FCFF] px-3 py-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#3278BD]">Bảo hành</div><div className="mt-1 text-xl font-extrabold text-[#193B57]">{currency(serviceCostReport.warrantyCost, currencyMode)}</div><div className="mt-2 text-[10px] font-semibold text-[#507DA6]">{serviceCostReport.totalCost ? `${Math.round((serviceCostReport.warrantyCost / serviceCostReport.totalCost) * 1000) / 10}% tổng cộng` : "0% tổng cộng"}</div></div>
              <div className="rounded-lg border border-[#E0E3FF] bg-[#F9F9FF] px-3 py-3"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#6B66B7]">{serviceCostYear === "all" ? "Tổng cộng" : `Tổng cộng (năm ${serviceCostYear})`}</div><div className="mt-1 text-xl font-extrabold text-[#3730A3]">{currency(serviceCostReport.totalCost, currencyMode)}</div><div className="mt-2 text-[10px] font-semibold text-[#6560A8]">{serviceCostReport.totalCost ? "100% tổng cộng" : "0% tổng cộng"}</div></div>
            </div>
            <ServiceCostTrendChart data={monthlyServiceCostTrend} maxCost={monthlyServiceCostMax} yearLabel={serviceCostYear === "all" ? "Tất cả các năm" : `Năm ${serviceCostYear}`} currencyMode={currencyMode} selectedMonth={selectedServiceCostMonth} onSelectMonth={setSelectedServiceCostMonth} />
          </div>
          {selectedServiceCostMonth !== null && <div className="mt-4 overflow-hidden rounded-xl border border-[#D9E8F3]">
            <div className="flex flex-col gap-2 border-b border-[#D9E8F3] bg-[#F8FCFF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold text-[#193B57]">Phiếu chi phí tháng T{selectedServiceCostMonth + 1}</div><div className="mt-1 text-[10px] font-semibold text-[#71869A]">{serviceCostYear === "all" ? "Tất cả các năm" : `Năm ${serviceCostYear}`} · Theo kênh xử lý đang chọn</div></div><button type="button" onClick={() => setSelectedServiceCostMonth(null)} className="self-start rounded-md border border-[#C9DAE8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#527187] hover:bg-[#F0F6FA]">Đóng danh sách</button></div>
            {selectedMonthlyServiceTickets.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-[#FBFCFE] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]"><tr><th className="px-4 py-2.5">Mã phiếu</th><th className="px-4 py-2.5">Tài sản</th><th className="px-4 py-2.5">Kênh</th><th className="px-4 py-2.5">Ngày mở</th><th className="px-4 py-2.5 text-right">Chi phí</th><th className="px-4 py-2.5">Trạng thái</th><th className="px-4 py-2.5 text-right">Thao tác</th></tr></thead><tbody>{visibleMonthlyServiceTickets.map((item) => <tr key={item.ticketId} className="border-t border-[#E7EEF3]"><td className="px-4 py-3 font-mono text-[11px] font-bold text-[#2666A8]">{item.ticketCode}</td><td className="px-4 py-3"><div className="font-semibold text-[#193B57]">{item.assetName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.assetCode}</div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.channel === "Bảo hành" ? "bg-[#EAF3FB] text-[#2666A8]" : "bg-[#FFF4DE] text-[#A86B00]"}`}>{item.channel}</span></td><td className="px-4 py-3 text-[#60758A]">{new Date(item.openedAt).toLocaleDateString("vi-VN")}</td><td className="px-4 py-3 text-right font-extrabold text-[#3730A3]">{currency(item.actualCost, currencyMode)}</td><td className="px-4 py-3 text-[#60758A]">{serviceTicketStatusLabel(item.status)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => openMonthlyServiceTicket(item.ticketId)} className="inline-flex items-center rounded-md border border-[#C9DAE8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#2666A8] hover:bg-[#EAF3FB]">Mở phiếu</button></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-[#E7EEF3] bg-[#FBFCFE] px-4 py-3"><span className="text-[10px] font-semibold text-[#8AA0B6]">Hiển thị {Math.min((monthlyServiceTicketPage - 1) * monthlyServiceTicketPageSize + 1, selectedMonthlyServiceTickets.length)}–{Math.min(monthlyServiceTicketPage * monthlyServiceTicketPageSize, selectedMonthlyServiceTickets.length)} trên {selectedMonthlyServiceTickets.length} phiếu · Trang {monthlyServiceTicketPage}/{monthlyServiceTicketTotalPages}</span><div className="flex gap-1"><button type="button" disabled={monthlyServiceTicketPage === 1} onClick={() => setMonthlyServiceTicketPage((page) => Math.max(1, page - 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" disabled={monthlyServiceTicketPage >= monthlyServiceTicketTotalPages} onClick={() => setMonthlyServiceTicketPage((page) => Math.min(monthlyServiceTicketTotalPages, page + 1))} className="rounded-md border border-[#DDE7F0] px-2 py-1 text-[10px] font-bold text-[#60758A] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div></> : <div className="px-4 py-7 text-center text-xs text-[#8AA0B6]">Không có phiếu phát sinh chi phí trong tháng này theo bộ lọc hiện tại.</div>}
          </div>}
          <div className="mt-4 flex flex-col gap-3 border-t border-[#E7EEF3] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#71869A]">Bản xem trước Excel áp dụng riêng bộ lọc kênh và năm hiện tại.</p><button onClick={exportRepairCostExcel} disabled={!isAdmin || !serviceCostReport.rows.length || exporting !== null} title={!serviceCostReport.rows.length ? "Không có phiếu phát sinh chi phí theo bộ lọc hiện tại" : "Mở bản xem trước Excel"} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#C9CCF4] bg-[#F7F7FF] px-4 py-2.5 text-xs font-bold text-[#4A45A5] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"><Download size={15} className={exporting === "repairCosts" ? "animate-pulse" : ""} />{exporting === "repairCosts" ? "Đang chuẩn bị..." : `Xem trước Excel (${serviceCostReport.ticketCount})`}</button></div>
          {!serviceCostReport.rows.length && <p className="mt-3 text-xs text-[#8AA0B6]">Không có phiếu phát sinh chi phí theo bộ lọc kênh và năm hiện tại; nút xem trước Excel đang được khóa.</p>}
        </div>}
      </section>
      <InteractiveValueAllocation title="Phân bổ giá trị theo Bộ Phận" context={selectedDivision?.name || selectedDepartment?.name || "Tất cả cơ cấu"} data={divisionValueData as AllocationGroup[]} totalValue={selectedValue} isLoading={assetsQuery.isLoading || employeesQuery.isLoading || divisionsQuery.isLoading} currencyMode={currencyMode} accent="#7666B3" selectedId={allocationSelection?.type === "division" ? allocationSelection.id : null} onSelect={(item) => setAllocationSelection({ type: "division", id: item.id, name: item.name })} />
      <InteractiveValueAllocation title="Phân bổ giá trị theo Hãng" data={brandValueData as AllocationGroup[]} totalValue={selectedValue} isLoading={assetsQuery.isLoading || brandsQuery.isLoading} currencyMode={currencyMode} accent="#0F8C8C" selectedId={allocationSelection?.type === "brand" ? allocationSelection.id : null} onSelect={(item) => setAllocationSelection({ type: "brand", id: item.id, name: item.name })} />
      <InteractiveValueAllocation title="Phân bổ giá trị theo Nhà cung cấp" data={supplierValueData as AllocationGroup[]} totalValue={selectedValue} isLoading={assetsQuery.isLoading} currencyMode={currencyMode} accent="#2666A8" selectedId={allocationSelection?.type === "supplier" ? allocationSelection.id : null} onSelect={(item) => setAllocationSelection({ type: "supplier", id: item.id, name: item.name })} />
      {allocationSelection && <InteractiveAllocationAssetDetails groupLabel={allocationSelection.type === "division" ? "Bộ Phận" : allocationSelection.type === "brand" ? "Hãng" : "Nhà cung cấp"} groupName={allocationSelection.name} assets={selectedAllocationAssets} handovers={handoversQuery.data || []} maintenanceTickets={maintenanceQuery.data || []} currencyMode={currencyMode} autoOpenAssetId={returnAssetPopupId || undefined} onAssetPopupClose={() => setReturnAssetPopupId(null)} onClose={() => { setAllocationSelection(null); setReturnAssetPopupId(null); }} />}
      <section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo cơ cấu</div><p className="mt-1 text-xs text-[#71869A]">{selectedDepartment ? `Phòng Ban: ${selectedDepartment.name}` : "Tất cả Phòng Ban"}{selectedDivision ? ` · Bộ Phận: ${selectedDivision.name}` : ""}</p></div><button onClick={exportExcel} disabled={!isAdmin || !inventoryAssets.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "inventory" ? "animate-pulse" : ""} />{exporting === "inventory" ? "Đang xuất..." : `Xuất Excel (${inventoryAssets.length})`}</button></div></section>
      <section className={`mt-5 ${card} border-[#F3C4C4] p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#B44545]"><History size={16} />Tài sản đã trả nhà cung cấp</div><p className="mt-1 text-xs text-[#71869A]">Báo cáo riêng gồm ngày trả, lý do, giá trị và thông tin nhận diện của từng tài sản. Hiện có <b className="text-[#B44545]">{supplierReturnedAssets.length}</b> tài sản trong phạm vi lọc.</p></div><button onClick={exportSupplierReturnExcel} disabled={!isAdmin || !supplierReturnedAssets.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7A6A6] bg-[#FFF7F7] px-4 py-2.5 text-xs font-bold text-[#B44545] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "returned" ? "animate-pulse" : ""} />{exporting === "returned" ? "Đang xuất..." : "Xuất báo cáo trả NCC"}</button></div></section>
      <section className={`mt-5 ${card} border-[#E7D9B9] p-4`}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Download size={16} />Xuất Excel thanh lý chi tiết</div><p className="mt-1 text-xs text-[#71869A]">Một dòng cho mỗi tài sản, gồm phí Bảo hành/Sửa chữa, giá thanh lý và các dòng tổng cộng.</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"><div className="w-full sm:w-44"><SearchableSelect value={retirementYear} onChange={setRetirementYear} options={[{ value: "all", label: "Tất cả năm" }, ...retirementYearOptions.map((year) => ({ value: String(year), label: `Năm ${year}` }))]} placeholder="Tất cả năm" searchPlaceholder="Tìm năm thanh lý..." /></div><button onClick={exportRetirementExcel} disabled={!isAdmin || !retiredAssets.length || exporting !== null} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E7D9B9] bg-[#FFF7E3] px-4 text-xs font-bold text-[#8F5A00] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "retired" ? "animate-pulse" : ""} />{exporting === "retired" ? "Đang xuất..." : `Xuất Excel (${retiredAssets.length})`}</button></div></div></section>
      <section className={`mt-5 ${card} border-[#E7D9B9] p-5`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><FileBarChart size={16} />Giá trị tài sản Khấu hao/Thanh lý theo năm</div><p className="mt-1 text-xs text-[#71869A]">Tổng hợp giá trị thanh lý đã ghi nhận theo ngày thanh lý và phạm vi lọc hiện tại.</p></div><div className="rounded-lg bg-[#FFF7E3] px-3 py-2 text-right"><div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A86B00]">Tổng giá trị thanh lý</div><div className="mt-1 text-sm font-extrabold text-[#8F5A00]">{currency(retiredTotalValue, currencyMode)}</div></div></div>{assetsQuery.isLoading || retirementCertificatesQuery.isLoading ? <div className="mt-4 grid min-h-24 place-items-center text-xs text-[#71869A]">Đang tổng hợp giá trị thanh lý...</div> : retirementValueByYear.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-lg border border-[#B7D8D4] bg-[#F4FBFA] px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold text-[#087A6A]">Tổng giá trị thanh lý</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#087A6A]">Đã ghi nhận</span></div><div className="mt-3 text-lg font-extrabold text-[#087A6A]">{currency(retiredTotalValue, currencyMode)}</div><div className="mt-1 text-[10px] text-[#4C7E76]">Tổng giá trị thu hồi của tài sản thanh lý</div></div>{retirementValueByYear.map((item) => <div key={item.year} className="rounded-lg border border-[#F0DFC0] bg-[#FFFDF7] px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold text-[#8F5A00]">Năm {item.year}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#A86B00]">{item.count} tài sản</span></div><div className="mt-3 text-lg font-extrabold text-[#193B57]">{currency(item.value, currencyMode)}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">Giá trị thanh lý đã ghi nhận</div></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-[#E7D9B9] bg-[#FFFDF7] px-4 py-6 text-center text-xs text-[#8A7140]">Chưa có tài sản Khấu hao/Thanh lý trong phạm vi lọc.</div>}</section>
    </>}
    {isAdmin && <ActivityLog data={filteredActivities} loading={activitiesQuery.isLoading} query={activityQuery} type={activityType} onQueryChange={setActivityQuery} onTypeChange={setActivityType} allActivities={activitiesQuery.data || []} />}
    {quickPreviewServiceTicket && <QuickServiceTicketPreview ticket={quickPreviewServiceTicket} asset={quickPreviewAsset} assigneeName={quickPreviewAssigneeName} currencyMode={currencyMode} pdfPreparing={quickPreviewPdfAction} onPrint={() => void openQuickPreviewPdf(true)} onExportPdf={() => void openQuickPreviewPdf(false)} onClose={() => setQuickPreviewServiceTicketId(null)} />}
  </div></div>;
}

function DisposalExportPanel({ groups, years, retirementYear, onRetirementYearChange, selectedIds, allSelected, totalValue, currencyMode, excelExporting, pdfExporting, excelDisabled, pdfDisabled, onToggleAll, onToggleGroup, onExportExcel, onExportPdf }: { groups: Array<{ key: string; referenceCode: string; retiredAt: Date | null; assets: Array<{ id: number; assetCode: string; name: string }> }>; years: number[]; retirementYear: string; onRetirementYearChange: (value: string) => void; selectedIds: Set<number>; allSelected: boolean; totalValue: number; currencyMode: CurrencyDisplayMode; excelExporting: boolean; pdfExporting: boolean; excelDisabled: boolean; pdfDisabled: boolean; onToggleAll: () => void; onToggleGroup: (assetIds: number[]) => void; onExportExcel: () => void; onExportPdf: () => void }) {
  const assetCount = groups.reduce((total, group) => total + group.assets.length, 0);
  const selectedCount = groups.reduce((total, group) => total + group.assets.filter((asset) => selectedIds.has(asset.id)).length, 0);
  const selectedGroupCount = groups.filter((group) => group.assets.every((asset) => selectedIds.has(asset.id))).length;
  return <section className={`mt-5 ${card} border-[#E7D9B9] p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Download size={16} />Xuất danh sách & biên bản thanh lý</div><p className="mt-1 max-w-3xl text-xs text-[#71869A]">Mỗi mã TL được gộp thành một dòng. Chọn một biên bản để chọn toàn bộ tài sản thuộc biên bản đó và mở PDF gộp.</p></div><div className="w-full xl:w-52"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8A7140]">Năm thanh lý</label><SearchableSelect value={retirementYear} onChange={onRetirementYearChange} options={[{ value: "all", label: "Tất cả năm" }, ...years.map((year) => ({ value: String(year), label: `Năm ${year}` }))]} placeholder="Tất cả năm" searchPlaceholder="Tìm năm thanh lý..." /></div></div><div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#F0DFC0] bg-[#FFFDF7] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex items-center gap-2 text-xs font-bold text-[#5E470D]"><input type="checkbox" checked={allSelected} disabled={!groups.length} onChange={onToggleAll} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" />Chọn tất cả trong phạm vi lọc</label><div className="text-xs text-[#8A7140]">Đã chọn <b className="text-[#8F5A00]">{selectedGroupCount}/{groups.length} biên bản</b> · {selectedCount}/{assetCount} tài sản · Tổng nguyên giá {currency(totalValue, currencyMode)}</div></div>{groups.length ? <div className="max-h-56 overflow-auto rounded-lg border border-[#F0DFC0] bg-white"><table className="w-full min-w-[640px] text-left text-xs"><thead className="sticky top-0 bg-[#FFF7E3] text-[10px] uppercase tracking-[0.08em] text-[#8A7140]"><tr><th className="w-12 px-3 py-2.5 text-center">Chọn</th><th className="px-3 py-2.5">Số biên bản</th><th className="px-3 py-2.5">Tài sản trong biên bản</th><th className="px-3 py-2.5">Ngày thanh lý</th></tr></thead><tbody>{groups.map((group) => { const groupSelected = group.assets.every((asset) => selectedIds.has(asset.id)); return <tr key={group.key} className="border-t border-[#F6EBD4] hover:bg-[#FFFCF5]"><td className="px-3 py-2.5 text-center"><input type="checkbox" checked={groupSelected} onChange={() => onToggleGroup(group.assets.map((asset) => asset.id))} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" aria-label={`Chọn biên bản ${group.referenceCode}`} /></td><td className="px-3 py-2.5 font-mono font-bold text-[#8F5A00]">{group.referenceCode}</td><td className="px-3 py-2.5"><div className="font-bold text-[#193B57]">{group.assets.length} tài sản</div><div className="mt-0.5 flex flex-wrap gap-1 font-mono text-[10px] text-[#8AA0B6]">{group.assets.slice(0, 4).map((asset) => <span key={asset.id} title={asset.name}>{asset.assetCode}</span>)}{group.assets.length > 4 && <span>+{group.assets.length - 4}</span>}</div></td><td className="px-3 py-2.5 text-[#60758A]">{group.retiredAt ? new Date(group.retiredAt).toLocaleDateString("vi-VN") : "Chưa ghi nhận"}</td></tr>; })}</tbody></table></div> : <p className="rounded-lg border border-dashed border-[#E7D9B9] bg-white px-3 py-4 text-center text-xs text-[#8A7140]">Chưa có tài sản thanh lý trong năm hoặc phạm vi đã chọn.</p>}<div className="flex flex-col justify-end gap-2 border-t border-[#F0DFC0] pt-3 sm:flex-row"><button onClick={onExportExcel} disabled={excelDisabled} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7D9B9] bg-[#FFF7E3] px-4 py-2.5 text-xs font-bold text-[#8F5A00] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={excelExporting ? "animate-pulse" : ""} />{excelExporting ? "Đang xuất Excel..." : `Xuất Excel (${groups.length} biên bản)`}</button><button onClick={onExportPdf} disabled={pdfDisabled} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8F5A00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#774A00] disabled:cursor-not-allowed disabled:opacity-60"><FileBarChart size={15} className={pdfExporting ? "animate-pulse" : ""} />{pdfExporting ? "Đang tạo PDF..." : `Xem trước PDF gộp (${selectedCount} tài sản)`}</button></div></div></section>;
}

function DisposalExcelExportCard({ count, totalValue, currencyMode, exporting, disabled, onExport }: { count: number; totalValue: number; currencyMode: CurrencyDisplayMode; exporting: boolean; disabled: boolean; onExport: () => void }) {
  return <section className={`mt-5 ${card} border-[#E7D9B9] p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Download size={16} />Xuất danh sách tài sản thanh lý</div><p className="mt-1 text-xs text-[#71869A]">File Excel gồm số biên bản TL-NĂM-001, ngày/lý do thanh lý, giá trị, nhận diện tài sản và tên chứng từ đính kèm. Hiện có <b className="text-[#8F5A00]">{count}</b> tài sản, tổng nguyên giá {currency(totalValue, currencyMode)}.</p></div><button onClick={onExport} disabled={disabled} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7D9B9] bg-[#FFF7E3] px-4 py-2.5 text-xs font-bold text-[#8F5A00] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting ? "animate-pulse" : ""} />{exporting ? "Đang xuất..." : `Xuất Excel (${count})`}</button></div>{!count && <p className="mt-3 rounded-lg border border-dashed border-[#E7D9B9] bg-[#FFFDF7] px-3 py-2 text-xs text-[#8A7140]">Chưa có tài sản thanh lý trong phạm vi lọc để xuất file.</p>}</section>;
}

function DivisionValueChart({ data, totalValue, isLoading, scope, currencyMode }: { data: DivisionValue[]; totalValue: number; isLoading: boolean; scope: string; currencyMode: CurrencyDisplayMode }) {
  let cursor = 0;
  const gradient = data.map((item) => {
    const start = cursor;
    cursor += totalValue ? (item.value / totalValue) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");
  return <section className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><PieChartIcon size={17} className="text-[#7666B3]" />Phân bổ giá trị theo Bộ Phận</div><p className="mt-1 text-xs text-[#71869A]">Phạm vi: {scope}. Tài sản chưa có người giữ hoặc nhân sự chưa gán Bộ Phận được nhóm riêng.</p></div><div className="rounded-lg bg-[#F2EDFF] px-3 py-2 text-xs font-extrabold text-[#6750A4]">Tổng giá trị: {currency(totalValue, currencyMode)}</div></div>{isLoading ? <div className="grid min-h-[300px] place-items-center text-sm text-[#71869A]">Đang tổng hợp dữ liệu theo Bộ Phận...</div> : !data.length || totalValue <= 0 ? <div className="grid min-h-[300px] place-items-center px-6 text-center"><div><PieChartIcon size={28} className="mx-auto text-[#9CB0C2]" /><p className="mt-3 font-bold text-[#60758A]">Chưa có giá trị tài sản để phân bổ</p><p className="mt-1 text-xs leading-5 text-[#8AA0B6]">Hãy cấp phát tài sản cho nhân sự đã được gán Bộ Phận hoặc điều chỉnh phạm vi lọc.</p></div></div> : <div className="grid gap-5 p-5 lg:grid-cols-[minmax(280px,.85fr)_minmax(360px,1.15fr)]"><div className="flex h-[260px] min-w-0 items-center justify-center"><div className="grid h-52 w-52 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(16,42,67,.06)]" style={{ background: `conic-gradient(${gradient})` }}><div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-[0_4px_16px_rgba(16,42,67,.08)]"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8AA0B6]">Tổng giá trị</span><span className="px-3 text-sm font-extrabold text-[#102A43]">{currency(totalValue, currencyMode)}</span></div></div></div><div className="min-w-0 space-y-3">{data.map((item) => { const percentage = totalValue ? Math.round((item.value / totalValue) * 100) : 0; return <div key={item.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-[#193B57]">{item.name}</span></div><span className="shrink-0 text-xs font-extrabold text-[#102A43]">{percentage}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAF0F4]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, percentage)}%`, backgroundColor: item.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#71869A]"><span>{item.assetCount} tài sản</span><span className="font-bold text-[#60758A]">{currency(item.value, currencyMode)}</span></div></div>; })}</div></div>}</section>;
}

function BrandValueChart({ data, totalValue, isLoading, currencyMode, title = "Phân bổ giá trị theo Hãng", description = "Giá trị nguyên giá được nhóm theo Hãng đã gán trong hồ sơ tài sản." }: { data: BrandValue[]; totalValue: number; isLoading: boolean; currencyMode: CurrencyDisplayMode; title?: string; description?: string }) {
  return <section className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-2 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><PieChartIcon size={17} className="text-[#0F8C8C]" />{title}</div><p className="mt-1 text-xs text-[#71869A]">{description}</p></div><div className="rounded-lg bg-[#ECF8F7] px-3 py-2 text-xs font-extrabold text-[#087A6A]">Tổng giá trị: {currency(totalValue, currencyMode)}</div></div>{isLoading ? <div className="grid min-h-[220px] place-items-center text-sm text-[#71869A]">Đang tổng hợp dữ liệu theo Hãng...</div> : !data.length || totalValue <= 0 ? <div className="grid min-h-[220px] place-items-center px-6 text-center"><div><PieChartIcon size={28} className="mx-auto text-[#9CB0C2]" /><p className="mt-3 font-bold text-[#60758A]">Chưa có giá trị tài sản để phân bổ theo Hãng</p><p className="mt-1 text-xs leading-5 text-[#8AA0B6]">Hãy gán Hãng trong hồ sơ tài sản để xem thống kê.</p></div></div> : <div className="grid gap-5 p-5 lg:grid-cols-[minmax(260px,.75fr)_minmax(360px,1.25fr)]"><div className="flex h-[250px] items-center justify-center"><div className="grid h-48 w-48 place-items-center rounded-full border-[18px] border-[#D9F0EC] bg-white text-center shadow-[inset_0_0_0_1px_rgba(16,42,67,.04)]"><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8AA0B6]">Số hãng</div><div className="mt-1 font-display text-4xl font-extrabold text-[#087A6A]">{data.length}</div><div className="mt-1 text-[11px] text-[#71869A]">trong phạm vi lọc</div></div></div></div><div className="space-y-3">{data.map((item) => { const percentage = totalValue ? Math.round((item.value / totalValue) * 100) : 0; return <div key={item.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-[#193B57]">{item.name}</span></div><span className="shrink-0 text-xs font-extrabold text-[#102A43]">{percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EAF0F4]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, percentage)}%`, backgroundColor: item.color }} /></div><div className="mt-2 flex justify-between text-[10px] text-[#71869A]"><span>{item.assetCount} tài sản</span><span className="font-bold text-[#60758A]">{currency(item.value, currencyMode)}</span></div></div>; })}</div></div>}</section>;
}

function CompactValueAllocation({ title, context, data, totalValue, isLoading, currencyMode, accent }: { title: string; context?: string; data: Array<DivisionValue | BrandValue>; totalValue: number; isLoading: boolean; currencyMode: CurrencyDisplayMode; accent: string }) {
  let cursor = 0;
  const gradient = data.map((item) => { const start = cursor; cursor += totalValue ? (item.value / totalValue) * 100 : 0; return `${item.color} ${start}% ${cursor}%`; }).join(", ");
  const topItems = data.slice(0, 5);
  const remaining = Math.max(0, data.length - topItems.length);
  return <section className={`mt-5 ${card} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-[#E7EEF3] px-4 py-3"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><PieChartIcon size={16} style={{ color: accent }} />{title}</div>{context && <p className="mt-0.5 truncate text-[11px] text-[#71869A]">Phạm vi: {context}</p>}</div><div className="shrink-0 text-right"><div className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#8AA0B6]">Tổng giá trị</div><div className="mt-0.5 text-xs font-extrabold text-[#102A43]">{currency(totalValue, currencyMode)}</div></div></div>{isLoading ? <div className="grid min-h-32 place-items-center text-xs text-[#71869A]">Đang tổng hợp dữ liệu...</div> : !data.length || totalValue <= 0 ? <div className="grid min-h-32 place-items-center px-5 text-center text-xs text-[#71869A]">Chưa có giá trị tài sản để phân bổ trong phạm vi này.</div> : <div className="grid gap-4 p-4 sm:grid-cols-[124px_minmax(0,1fr)] sm:items-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}><div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center shadow-[0_3px_10px_rgba(16,42,67,.08)]"><span className="text-[9px] font-bold uppercase tracking-[.08em] text-[#8AA0B6]">Nhóm</span><span className="font-display text-xl font-extrabold text-[#102A43]">{data.length}</span></div></div><div className="min-w-0 divide-y divide-[#EDF2F5]">{topItems.map((item) => { const percentage = totalValue ? Math.round((item.value / totalValue) * 100) : 0; return <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 first:pt-0 last:pb-0"><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-xs font-bold text-[#193B57]">{item.name}</span><span className="shrink-0 text-[10px] text-[#8AA0B6]">{item.assetCount} TS</span></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-[#EAF0F4]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, percentage)}%`, backgroundColor: item.color }} /></div></div><div className="text-right"><div className="text-xs font-extrabold text-[#102A43]">{percentage}%</div><div className="mt-0.5 text-[10px] font-semibold text-[#60758A]">{currency(item.value, currencyMode)}</div></div></div>; })}{remaining > 0 && <p className="pt-2 text-[10px] font-semibold text-[#71869A]">+ {remaining} nhóm còn lại được gộp trong biểu đồ.</p>}</div></div>}</section>;
}

function ActivityLog({ data, loading, query, type, onQueryChange, onTypeChange, allActivities }: { data: Array<{ id: number; createdAt: Date | number | string; actorName: string | null; entityType: string; entityId: number; action: string; summary: string | null }>; loading: boolean; query: string; type: string; onQueryChange: (value: string) => void; onTypeChange: (value: string) => void; allActivities: Array<{ entityType: string }> }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const activitySearchInputRef = useRef<HTMLInputElement>(null);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedActivities = data.slice(startIndex, startIndex + pageSize);
  const startRecord = data.length ? startIndex + 1 : 0;
  const endRecord = Math.min(startIndex + pageSize, data.length);
  const entityTypeOptions = [...new Set(allActivities.map((item) => item.entityType))].map((entityType) => ({ value: entityType, label: activityEntityLabel(entityType) }));

  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
  useEffect(() => {
    const focusActivitySearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !window.matchMedia("(min-width: 640px)").matches) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "")) return;
      event.preventDefault();
      activitySearchInputRef.current?.focus();
    };
    document.addEventListener("keydown", focusActivitySearch);
    return () => document.removeEventListener("keydown", focusActivitySearch);
  }, []);

  const updateQuery = (value: string) => { setPage(1); onQueryChange(value); };
  const updateType = (value: string) => { setPage(1); onTypeChange(value); };
  const updatePageSize = (value: number) => { setPageSize(value); setPage(1); };

  return <section className={`mt-5 overflow-hidden ${card}`}>
    <div className="border-b border-[#E7EEF3] px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div>
      <p className="mt-1 text-xs text-[#71869A]">Theo dõi các thay đổi tài sản, bàn giao, bảo trì, kiểm kê và quản trị tài khoản.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_210px]">
        <label className="relative flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#DDE7F0] bg-white px-3 text-[#8AA0B6] transition focus-within:border-[#0F8C8C] focus-within:ring-2 focus-within:ring-[#0F8C8C]/10">
          <Search size={16} className="shrink-0" aria-hidden="true" />
          <input ref={activitySearchInputRef} value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Tìm người thực hiện hoặc thao tác..." className="min-w-0 flex-1 border-0 bg-transparent p-0 pr-7 text-xs text-[#193B57] outline-none placeholder:text-[#9BAEC0]" aria-label="Tìm kiếm nhật ký hoạt động" data-search-clear-managed="true" />
          {query && <button type="button" onClick={() => { updateQuery(""); activitySearchInputRef.current?.focus(); }} className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#71869A] transition hover:bg-[#EEF5F7] hover:text-[#193B57] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8C8C]" aria-label="Xóa từ khóa tìm kiếm" title="Xóa từ khóa"><X size={14} /></button>}
        </label>
        <SearchableSelect value={type} onChange={updateType} placeholder="Tất cả loại hoạt động" searchPlaceholder="Tìm loại hoạt động..." options={[{ value: "all", label: "Tất cả loại hoạt động" }, ...entityTypeOptions]} />
      </div>
    </div>
    <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!loading && pagedActivities.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{activityEntityLabel(item.entityType)} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!loading && !data.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div>
    {!loading && <div className="flex flex-col gap-3 border-t border-[#E7EEF3] bg-[#FBFCFD] px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[#71869A]">Hiển thị <b className="text-[#193B57]">{startRecord}–{endRecord}</b> trên <b className="text-[#193B57]">{data.length}</b> hoạt động</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]">Mỗi trang<select value={pageSize} onChange={(event) => updatePageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#DDE7F0] bg-white px-2 text-xs font-bold text-[#193B57] outline-none focus:border-[#0F8C8C]"><option value={10}>10 dòng</option><option value={20}>20 dòng</option><option value={50}>50 dòng</option></select></label><span className="text-xs font-semibold text-[#60758A]">Trang {currentPage}/{totalPages}</span><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Trang nhật ký trước" className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-sm font-bold text-[#60758A] transition hover:bg-[#F0F5F8] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} aria-label="Trang nhật ký sau" className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-sm font-bold text-[#60758A] transition hover:bg-[#F0F5F8] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{label}</div><div className="mt-1 break-words font-display text-2xl font-extrabold text-[#102A43]">{value}</div></div>; }
