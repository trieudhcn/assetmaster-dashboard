import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart, History, PieChart as PieChartIcon, Search, SlidersHorizontal } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { matchesVietnameseSearch } from "@/lib/catalogUi";
import { SearchableSelect } from "@/components/SearchableSelect";
import { formatCompactVnd, type CurrencyDisplayMode } from "@/lib/formatters";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { openRetirementPdf } from "@/lib/retirementPdf";

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

export function ReportsManagementView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [departmentId, setDepartmentId] = useState("all");
  const [divisionId, setDivisionId] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [currencyMode, setCurrencyMode] = useState<CurrencyDisplayMode>("full");
  const [exporting, setExporting] = useState<"inventory" | "returned" | "retired" | "retiredPdf" | null>(null);
  const [retirementYear, setRetirementYear] = useState("all");
  const [selectedRetirementIds, setSelectedRetirementIds] = useState<Set<number>>(() => new Set());
  const assetsQuery = trpc.assets.list.useQuery();
  const handoversQuery = trpc.handovers.list.useQuery();
  const maintenanceQuery = trpc.maintenance.list.useQuery();
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isAdmin });
  const divisionsQuery = trpc.departments.listAllDivisions.useQuery(undefined, { enabled: isAdmin });
  const brandsQuery = trpc.brands.list.useQuery();
  const assetCategoriesQuery = trpc.assetCategories.list.useQuery();
  const companyQuery = trpc.company.get.useQuery();
  const activitiesQuery = trpc.activity.list.useQuery({ limit: 150 }, { enabled: isAdmin });

  const departments = departmentsQuery.data || [];
  const divisions = divisionsQuery.data || [];
  const employees = employeesQuery.data || [];
  const employeeById = new Map(employees.map((item) => [item.id, item]));
  const departmentById = new Map(departments.map((item) => [item.id, item]));
  const divisionById = new Map(divisions.map((item) => [item.id, item]));
  const brandById = new Map((brandsQuery.data || []).map((item) => [item.id, item]));
  const categoryById = new Map((assetCategoriesQuery.data || []).map((item) => [item.id, item]));
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
  const retirementValueByYear = useMemo(() => {
    const buckets = new Map<string, { year: string; count: number; value: number }>();
    retiredAssets.forEach((asset) => {
      const date = asset.retiredAt ? new Date(asset.retiredAt) : null;
      const year = date && Number.isFinite(date.getTime()) ? String(date.getFullYear()) : "Chưa ghi nhận ngày";
      const current = buckets.get(year) || { year, count: 0, value: 0 };
      current.count += 1;
      current.value += Number(asset.purchaseValue || 0);
      buckets.set(year, current);
    });
    return [...buckets.values()].sort((left, right) => right.year.localeCompare(left.year));
  }, [retiredAssets]);
  const retiredTotalValue = retiredAssets.reduce((sum, asset) => sum + Number(asset.purchaseValue || 0), 0);
  const selectedRetirementAssets = retiredAssets.filter((asset) => selectedRetirementIds.has(asset.id));
  const allRetiredAssetsSelected = retiredAssets.length > 0 && selectedRetirementAssets.length === retiredAssets.length;
  const selectedHandoverCount = (handoversQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedMaintenanceCount = (maintenanceQuery.data || []).filter((item) => selectedAssetIds.has(item.assetId)).length;
  const selectedValue = inventoryAssets.reduce((sum, item) => sum + Number(item.purchaseValue || 0), 0);
  const repairCostReport = useMemo(() => {
    const assetById = new Map(selectedAssets.map((asset) => [asset.id, asset]));
    const byAsset = new Map<number, { assetCode: string; assetName: string; departmentName: string; cost: number; ticketCount: number }>();
    const byDepartment = new Map<string, { departmentName: string; cost: number; assetIds: Set<number>; ticketCount: number }>();
    (maintenanceQuery.data || []).filter((ticket) => (ticket.serviceChannel || "repair") === "repair" && assetById.has(ticket.assetId)).forEach((ticket) => {
      const cost = Number(ticket.actualCost || 0);
      if (!Number.isFinite(cost) || cost <= 0) return;
      const asset = assetById.get(ticket.assetId)!;
      const departmentName = asset.departmentId ? departmentById.get(asset.departmentId)?.name || "Chưa gán Phòng Ban" : "Chưa gán Phòng Ban";
      const assetRow = byAsset.get(asset.id) || { assetCode: asset.assetCode, assetName: asset.name, departmentName, cost: 0, ticketCount: 0 };
      assetRow.cost += cost;
      assetRow.ticketCount += 1;
      byAsset.set(asset.id, assetRow);
      const departmentRow = byDepartment.get(departmentName) || { departmentName, cost: 0, assetIds: new Set<number>(), ticketCount: 0 };
      departmentRow.cost += cost;
      departmentRow.assetIds.add(asset.id);
      departmentRow.ticketCount += 1;
      byDepartment.set(departmentName, departmentRow);
    });
    return { totalCost: [...byAsset.values()].reduce((total, item) => total + item.cost, 0), byAsset: [...byAsset.values()].sort((left, right) => right.cost - left.cost), byDepartment: [...byDepartment.values()].map((item) => ({ ...item, assetCount: item.assetIds.size })).sort((left, right) => right.cost - left.cost) };
  }, [selectedAssets, maintenanceQuery.data, departmentById]);
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
  const filteredActivities = useMemo(() => (activitiesQuery.data || []).filter((item) => (activityType === "all" || item.entityType === activityType) && matchesVietnameseSearch(`${item.summary || ""} ${item.actorName || ""} ${item.action}`, activityQuery)), [activitiesQuery.data, activityType, activityQuery]);
  const hasOrgError = departmentsQuery.isError || divisionsQuery.isError || employeesQuery.isError;

  useEffect(() => {
    const eligibleIds = new Set(retiredAssets.map((asset) => asset.id));
    setSelectedRetirementIds((current) => {
      const filtered = [...current].filter((id) => eligibleIds.has(id));
      return filtered.length === current.size ? current : new Set(filtered);
    });
  }, [retiredAssets]);

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

  const exportRetirementExcel = () => {
    if (!retiredAssets.length || exporting) return;
    setExporting("retired");
    const loadingToast = toast.loading("Đang tạo danh sách tài sản thanh lý...");
    window.setTimeout(() => { void (async () => {
      try {
        const rows = retiredAssets.map((asset) => {
          const holder = asset.holderUserId ? employeeById.get(asset.holderUserId) : undefined;
          const division = holder?.divisionId ? divisionById.get(holder.divisionId) : undefined;
          const department = asset.departmentId ? departmentById.get(asset.departmentId) : undefined;
          return {
            "Số biên bản thanh lý": asset.retirementCertificateNumber || "Chưa được cấp",
            "Năm biên bản": asset.retirementCertificateYear || "",
            "Số thứ tự": asset.retirementCertificateSequence || "",
            "Mã tài sản": asset.assetCode,
            "Tên tài sản": asset.name,
            "Phân loại": asset.categoryId ? categoryById.get(asset.categoryId)?.name || "Chưa phân loại" : "Chưa phân loại",
            "Phòng Ban": department?.name || "Chưa gán",
            "Bộ Phận": division?.name || "Chưa gán",
            "Người/Phòng giữ": asset.holderName || "Khấu hao - Thanh lý",
            "Ngày mua": asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "",
            "Ngày thanh lý": asset.retiredAt ? new Date(asset.retiredAt).toLocaleDateString("vi-VN") : "",
            "Lý do thanh lý": asset.retirementReason || "",
            "Giá trị nguyên giá (VNĐ)": Number(asset.purchaseValue || 0),
            "Serial/IMEI": asset.serialNumber || "",
            "Vị trí": asset.location || "",
            "Nhà cung cấp": asset.vendor || "",
            "Chứng từ đính kèm": asset.retirementAttachmentName || "Không đính kèm",
            "Ghi chú": asset.note || "",
          };
        });
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = [{ wch: 23 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 15 }, { wch: 16 }, { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 30 }, { wch: 32 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Tài sản thanh lý");
        const scope = selectedDivision?.name || selectedDepartment?.name || "tat-ca";
        await writeBrandedWorkbook(workbook, {
          documentTitle: "DANH SÁCH TÀI SẢN KHẤU HAO / THANH LÝ",
          fileName: `assetmaster-danh-sach-thanh-ly-${scope.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`,
          description: `Danh sách ${rows.length} tài sản thanh lý, gồm số biên bản, ngày/lý do thanh lý và chứng từ đính kèm theo phạm vi lọc hiện tại.`,
        });
        toast.success(`Đã xuất ${rows.length} tài sản thanh lý.`, { id: loadingToast });
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

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2666A8]"><span className="h-1.5 w-1.5 rounded-full bg-[#2666A8]" />Live management data</div><h1 className="font-display text-[30px] font-extrabold tracking-[-0.04em] text-[#102A43]">Báo cáo tài sản</h1><p className="mt-1 text-sm text-[#71869A]">Thống kê, trực quan hóa và xuất danh mục tài sản theo Phòng Ban hoặc Bộ Phận của người sử dụng.</p></div>
    {hasOrgError ? <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5"><div className="font-bold text-[#A86B00]">Không thể tải bộ lọc cơ cấu tổ chức</div><button onClick={() => { void employeesQuery.refetch(); void departmentsQuery.refetch(); void divisionsQuery.refetch(); }} className="mt-3 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00]">Thử lại</button></section> : <>
      <section className={`${card} p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0 max-w-xl"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><SlidersHorizontal size={16} className="text-[#2666A8]" />Phạm vi thống kê</div><p className="mt-1 text-xs text-[#71869A]">Bộ Phận được lọc theo nhân sự đang giữ tài sản và luôn thuộc Phòng Ban đã chọn.</p></div><div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[680px] xl:grid-cols-4"><SearchableSelect value={currencyMode} onChange={(value) => setCurrencyMode(value as CurrencyDisplayMode)} className="min-w-0" placeholder="Đơn vị tiền" searchPlaceholder="Tìm đơn vị tiền..." options={[{ value: "full", label: "Đầy đủ (VNĐ)" }, { value: "million", label: "Triệu đồng" }, { value: "billion", label: "Tỷ đồng" }]} /><SearchableSelect value={departmentId} onChange={(value) => { setDepartmentId(value); setDivisionId("all"); }} disabled={!isAdmin || departmentsQuery.isLoading} className="min-w-0" placeholder="Tất cả Phòng Ban" searchPlaceholder="Tìm Phòng Ban..." options={[{ value: "all", label: "Tất cả Phòng Ban" }, ...departments.filter((item) => item.isActive).map((department) => ({ value: String(department.id), label: department.name }))]} /><SearchableSelect value={divisionId} onChange={setDivisionId} disabled={!isAdmin || divisionsQuery.isLoading} className="min-w-0" placeholder="Tất cả Bộ Phận" searchPlaceholder="Tìm Bộ Phận..." options={[{ value: "all", label: "Tất cả Bộ Phận" }, ...availableDivisions.map((division) => ({ value: String(division.id), label: division.name }))]} /><button onClick={() => { setDepartmentId("all"); setDivisionId("all"); }} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#DDE7F0] bg-white px-4 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button></div></div></section>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tài sản trong phạm vi" value={String(inventoryAssets.length)} /><Metric label="Giá trị tài sản" value={currency(selectedValue, currencyMode)} /><Metric label="Phiếu bàn giao liên quan" value={String(selectedHandoverCount)} /><Metric label="Yêu cầu bảo trì liên quan" value={String(selectedMaintenanceCount)} /></div>
      <section className={`mt-5 ${card} overflow-hidden`}><div className="flex flex-col gap-3 border-b border-[#E7EEF3] px-5 py-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><FileBarChart size={17} className="text-[#5B5BD6]" />Tổng chi phí Sửa chữa phát sinh</div><p className="mt-1 text-xs text-[#71869A]">Chỉ tổng hợp chi phí thực tế của phiếu Sửa chữa theo phạm vi Phòng Ban/Bộ Phận đang chọn.</p></div><div className="rounded-lg bg-[#EEF0FF] px-3 py-2 text-right"><div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#5B5BD6]">Tổng chi phí</div><div className="mt-1 text-sm font-extrabold text-[#3730A3]">{currency(repairCostReport.totalCost, currencyMode)}</div></div></div>{maintenanceQuery.isLoading ? <div className="grid min-h-40 place-items-center text-sm text-[#71869A]">Đang tổng hợp chi phí Sửa chữa...</div> : repairCostReport.byAsset.length ? <div className="grid gap-5 p-5 xl:grid-cols-2"><div><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#5B5BD6]">Theo tài sản</div><div className="overflow-x-auto rounded-lg border border-[#E0E3FF]"><table className="w-full min-w-[460px] text-left text-xs"><thead className="bg-[#F7F7FF] text-[10px] uppercase tracking-[0.08em] text-[#5B5BD6]"><tr><th className="px-3 py-2.5">Tài sản</th><th className="px-3 py-2.5">Phòng Ban</th><th className="px-3 py-2.5 text-right">Chi phí</th></tr></thead><tbody>{repairCostReport.byAsset.map((item) => <tr key={item.assetCode} className="border-t border-[#EEF0FF]"><td className="px-3 py-2.5"><div className="font-bold text-[#193B57]">{item.assetName}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{item.assetCode} · {item.ticketCount} phiếu</div></td><td className="px-3 py-2.5 text-[#60758A]">{item.departmentName}</td><td className="px-3 py-2.5 text-right font-extrabold text-[#3730A3]">{currency(item.cost, currencyMode)}</td></tr>)}</tbody></table></div></div><div><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#5B5BD6]">Theo Phòng Ban</div><div className="space-y-2">{repairCostReport.byDepartment.map((item) => <div key={item.departmentName} className="rounded-lg border border-[#E0E3FF] bg-[#F9F9FF] px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{item.departmentName}</div><div className="mt-1 text-[10px] text-[#71869A]">{item.assetCount} tài sản · {item.ticketCount} phiếu Sửa chữa</div></div><div className="shrink-0 text-sm font-extrabold text-[#3730A3]">{currency(item.cost, currencyMode)}</div></div></div>)}</div></div></div> : <div className="px-5 py-10 text-center text-sm text-[#71869A]">Chưa có chi phí thực tế của phiếu Sửa chữa trong phạm vi báo cáo.</div>}</section>
      <DivisionValueChart data={divisionValueData} totalValue={selectedValue} isLoading={assetsQuery.isLoading || employeesQuery.isLoading || divisionsQuery.isLoading} scope={selectedDivision?.name || selectedDepartment?.name || "Tất cả cơ cấu"} currencyMode={currencyMode} />
      <BrandValueChart data={brandValueData} totalValue={selectedValue} isLoading={assetsQuery.isLoading || brandsQuery.isLoading} currencyMode={currencyMode} />
      <BrandValueChart title="Phân bổ giá trị theo Nhà cung cấp" description="Giá trị nguyên giá được nhóm theo Nhà cung cấp đã gán trong hồ sơ tài sản." data={supplierValueData} totalValue={selectedValue} isLoading={assetsQuery.isLoading} currencyMode={currencyMode} />
      <section className={`mt-5 ${card} p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Download size={16} className="text-[#087A6A]" />Xuất tài sản theo cơ cấu</div><p className="mt-1 text-xs text-[#71869A]">{selectedDepartment ? `Phòng Ban: ${selectedDepartment.name}` : "Tất cả Phòng Ban"}{selectedDivision ? ` · Bộ Phận: ${selectedDivision.name}` : ""}</p></div><button onClick={exportExcel} disabled={!isAdmin || !inventoryAssets.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "inventory" ? "animate-pulse" : ""} />{exporting === "inventory" ? "Đang xuất..." : `Xuất Excel (${inventoryAssets.length})`}</button></div></section>
      <section className={`mt-5 ${card} border-[#F3C4C4] p-5`}><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#B44545]"><History size={16} />Tài sản đã trả nhà cung cấp</div><p className="mt-1 text-xs text-[#71869A]">Báo cáo riêng gồm ngày trả, lý do, giá trị và thông tin nhận diện của từng tài sản. Hiện có <b className="text-[#B44545]">{supplierReturnedAssets.length}</b> tài sản trong phạm vi lọc.</p></div><button onClick={exportSupplierReturnExcel} disabled={!isAdmin || !supplierReturnedAssets.length || exporting !== null} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7A6A6] bg-[#FFF7F7] px-4 py-2.5 text-xs font-bold text-[#B44545] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={exporting === "returned" ? "animate-pulse" : ""} />{exporting === "returned" ? "Đang xuất..." : "Xuất báo cáo trả NCC"}</button></div></section>
      <section className={`mt-5 ${card} border-[#E7D9B9] p-5`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><FileBarChart size={16} />Giá trị tài sản Khấu hao/Thanh lý theo năm</div><p className="mt-1 text-xs text-[#71869A]">Tổng hợp theo ngày thanh lý đã ghi nhận trong hồ sơ tài sản, theo phạm vi lọc hiện tại.</p></div><div className="rounded-lg bg-[#FFF7E3] px-3 py-2 text-right"><div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A86B00]">Tổng giá trị thanh lý</div><div className="mt-1 text-sm font-extrabold text-[#8F5A00]">{currency(retiredTotalValue, currencyMode)}</div></div></div>{assetsQuery.isLoading ? <div className="mt-4 grid min-h-24 place-items-center text-xs text-[#71869A]">Đang tổng hợp giá trị thanh lý...</div> : retirementValueByYear.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{retirementValueByYear.map((item) => <div key={item.year} className="rounded-lg border border-[#F0DFC0] bg-[#FFFDF7] px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold text-[#8F5A00]">Năm {item.year}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#A86B00]">{item.count} tài sản</span></div><div className="mt-3 text-lg font-extrabold text-[#193B57]">{currency(item.value, currencyMode)}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">Tổng theo nguyên giá tài sản</div></div>)}</div> : <div className="mt-4 rounded-lg border border-dashed border-[#E7D9B9] bg-[#FFFDF7] px-4 py-6 text-center text-xs text-[#8A7140]">Chưa có tài sản Khấu hao/Thanh lý trong phạm vi lọc.</div>}</section>
      <DisposalExportPanel assets={retiredAssets} years={retirementYearOptions} retirementYear={retirementYear} onRetirementYearChange={setRetirementYear} selectedIds={selectedRetirementIds} allSelected={allRetiredAssetsSelected} totalValue={retiredTotalValue} currencyMode={currencyMode} excelExporting={exporting === "retired"} pdfExporting={exporting === "retiredPdf"} excelDisabled={!isAdmin || !retiredAssets.length || exporting !== null} pdfDisabled={!isAdmin || !selectedRetirementAssets.length || exporting !== null} onToggleAll={() => setSelectedRetirementIds(allRetiredAssetsSelected ? new Set() : new Set(retiredAssets.map((asset) => asset.id)))} onToggleAsset={(id) => setSelectedRetirementIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} onExportExcel={exportRetirementExcel} onExportPdf={exportSelectedRetirementPdf} />
    </>}
    {isAdmin && <ActivityLog data={filteredActivities} loading={activitiesQuery.isLoading} query={activityQuery} type={activityType} onQueryChange={setActivityQuery} onTypeChange={setActivityType} allActivities={activitiesQuery.data || []} />}
  </div></div>;
}

function DisposalExportPanel({ assets, years, retirementYear, onRetirementYearChange, selectedIds, allSelected, totalValue, currencyMode, excelExporting, pdfExporting, excelDisabled, pdfDisabled, onToggleAll, onToggleAsset, onExportExcel, onExportPdf }: { assets: Array<{ id: number; assetCode: string; name: string; retirementCertificateNumber: string | null; retiredAt: Date | null }>; years: number[]; retirementYear: string; onRetirementYearChange: (value: string) => void; selectedIds: Set<number>; allSelected: boolean; totalValue: number; currencyMode: CurrencyDisplayMode; excelExporting: boolean; pdfExporting: boolean; excelDisabled: boolean; pdfDisabled: boolean; onToggleAll: () => void; onToggleAsset: (id: number) => void; onExportExcel: () => void; onExportPdf: () => void }) {
  const selectedCount = assets.filter((asset) => selectedIds.has(asset.id)).length;
  return <section className={`mt-5 ${card} border-[#E7D9B9] p-5`}><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-extrabold text-[#8F5A00]"><Download size={16} />Xuất danh sách & biên bản thanh lý</div><p className="mt-1 max-w-3xl text-xs text-[#71869A]">Lọc theo năm trước khi xuất Excel. Chọn một hoặc nhiều tài sản để mở bản xem trước PDF gộp; chỉ tải tệp sau khi đã kiểm tra nội dung.</p></div><div className="w-full xl:w-52"><label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8A7140]">Năm thanh lý</label><SearchableSelect value={retirementYear} onChange={onRetirementYearChange} options={[{ value: "all", label: "Tất cả năm" }, ...years.map((year) => ({ value: String(year), label: `Năm ${year}` }))]} placeholder="Tất cả năm" searchPlaceholder="Tìm năm thanh lý..." /></div></div><div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#F0DFC0] bg-[#FFFDF7] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex items-center gap-2 text-xs font-bold text-[#5E470D]"><input type="checkbox" checked={allSelected} disabled={!assets.length} onChange={onToggleAll} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" />Chọn tất cả trong phạm vi lọc</label><div className="text-xs text-[#8A7140]">Đã chọn <b className="text-[#8F5A00]">{selectedCount}/{assets.length}</b> · Tổng nguyên giá {currency(totalValue, currencyMode)}</div></div>{assets.length ? <div className="max-h-56 overflow-auto rounded-lg border border-[#F0DFC0] bg-white"><table className="w-full min-w-[640px] text-left text-xs"><thead className="sticky top-0 bg-[#FFF7E3] text-[10px] uppercase tracking-[0.08em] text-[#8A7140]"><tr><th className="w-12 px-3 py-2.5 text-center">Chọn</th><th className="px-3 py-2.5">Số biên bản</th><th className="px-3 py-2.5">Tài sản</th><th className="px-3 py-2.5">Ngày thanh lý</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id} className="border-t border-[#F6EBD4] hover:bg-[#FFFCF5]"><td className="px-3 py-2.5 text-center"><input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => onToggleAsset(asset.id)} className="h-4 w-4 rounded border-[#D6B86E] accent-[#A86B00]" aria-label={`Chọn biên bản ${asset.retirementCertificateNumber || asset.assetCode}`} /></td><td className="px-3 py-2.5 font-mono font-bold text-[#8F5A00]">{asset.retirementCertificateNumber || "Chưa cấp số"}</td><td className="px-3 py-2.5"><div className="font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 font-mono text-[10px] text-[#8AA0B6]">{asset.assetCode}</div></td><td className="px-3 py-2.5 text-[#60758A]">{asset.retiredAt ? new Date(asset.retiredAt).toLocaleDateString("vi-VN") : "Chưa ghi nhận"}</td></tr>)}</tbody></table></div> : <p className="rounded-lg border border-dashed border-[#E7D9B9] bg-white px-3 py-4 text-center text-xs text-[#8A7140]">Chưa có tài sản thanh lý trong năm hoặc phạm vi đã chọn.</p>}<div className="flex flex-col justify-end gap-2 border-t border-[#F0DFC0] pt-3 sm:flex-row"><button onClick={onExportExcel} disabled={excelDisabled} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7D9B9] bg-[#FFF7E3] px-4 py-2.5 text-xs font-bold text-[#8F5A00] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Download size={15} className={excelExporting ? "animate-pulse" : ""} />{excelExporting ? "Đang xuất Excel..." : `Xuất Excel (${assets.length})`}</button><button onClick={onExportPdf} disabled={pdfDisabled} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8F5A00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#774A00] disabled:cursor-not-allowed disabled:opacity-60"><FileBarChart size={15} className={pdfExporting ? "animate-pulse" : ""} />{pdfExporting ? "Đang tạo PDF..." : `Xem trước PDF gộp (${selectedCount})`}</button></div></div></section>;
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

function ActivityLog({ data, loading, query, type, onQueryChange, onTypeChange, allActivities }: { data: Array<{ id: number; createdAt: Date | number | string; actorName: string | null; entityType: string; entityId: number; action: string; summary: string | null }>; loading: boolean; query: string; type: string; onQueryChange: (value: string) => void; onTypeChange: (value: string) => void; allActivities: Array<{ entityType: string }> }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedActivities = data.slice(startIndex, startIndex + pageSize);
  const startRecord = data.length ? startIndex + 1 : 0;
  const endRecord = Math.min(startIndex + pageSize, data.length);
  const entityTypeOptions = [...new Set(allActivities.map((item) => item.entityType))].map((entityType) => ({ value: entityType, label: activityEntityLabel(entityType) }));

  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);

  const updateQuery = (value: string) => { setPage(1); onQueryChange(value); };
  const updateType = (value: string) => { setPage(1); onTypeChange(value); };
  const updatePageSize = (value: number) => { setPageSize(value); setPage(1); };

  return <section className={`mt-5 overflow-hidden ${card}`}>
    <div className="border-b border-[#E7EEF3] px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><History size={16} className="text-[#2666A8]" />Nhật ký hoạt động</div>
      <p className="mt-1 text-xs text-[#71869A]">Theo dõi các thay đổi tài sản, bàn giao, bảo trì, kiểm kê và quản trị tài khoản.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_210px]">
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#DDE7F0] bg-white px-3 text-[#8AA0B6] transition focus-within:border-[#0F8C8C] focus-within:ring-2 focus-within:ring-[#0F8C8C]/10">
          <Search size={16} className="shrink-0" aria-hidden="true" />
          <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Tìm người thực hiện hoặc thao tác..." className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-[#193B57] outline-none placeholder:text-[#9BAEC0]" aria-label="Tìm kiếm nhật ký hoạt động" />
        </label>
        <SearchableSelect value={type} onChange={updateType} placeholder="Tất cả loại hoạt động" searchPlaceholder="Tìm loại hoạt động..." options={[{ value: "all", label: "Tất cả loại hoạt động" }, ...entityTypeOptions]} />
      </div>
    </div>
    <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[10px] uppercase tracking-[.12em] text-[#8AA0B6]"><tr><th className="px-5 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3">Chi tiết</th></tr></thead><tbody>{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#71869A]">Đang tải nhật ký...</td></tr>}{!loading && pagedActivities.map((item) => <tr key={item.id} className="border-t border-[#EDF2F5]"><td className="px-5 py-3 text-[#60758A]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-semibold text-[#193B57]">{item.actorName || "Hệ thống"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{activityEntityLabel(item.entityType)} #{item.entityId}</span></td><td className="px-4 py-3 font-mono text-[10px] text-[#0F8C8C]">{item.action}</td><td className="px-5 py-3 text-[#60758A]">{item.summary || "—"}</td></tr>)}{!loading && !data.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#8AA0B6]">Không có nhật ký phù hợp.</td></tr>}</tbody></table></div>
    {!loading && <div className="flex flex-col gap-3 border-t border-[#E7EEF3] bg-[#FBFCFD] px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[#71869A]">Hiển thị <b className="text-[#193B57]">{startRecord}–{endRecord}</b> trên <b className="text-[#193B57]">{data.length}</b> hoạt động</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]">Mỗi trang<select value={pageSize} onChange={(event) => updatePageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#DDE7F0] bg-white px-2 text-xs font-bold text-[#193B57] outline-none focus:border-[#0F8C8C]"><option value={10}>10 dòng</option><option value={20}>20 dòng</option><option value={50}>50 dòng</option></select></label><span className="text-xs font-semibold text-[#60758A]">Trang {currentPage}/{totalPages}</span><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Trang nhật ký trước" className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-sm font-bold text-[#60758A] transition hover:bg-[#F0F5F8] disabled:cursor-not-allowed disabled:opacity-40">‹</button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} aria-label="Trang nhật ký sau" className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] bg-white text-sm font-bold text-[#60758A] transition hover:bg-[#F0F5F8] disabled:cursor-not-allowed disabled:opacity-40">›</button></div></div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className={`${card} p-5`}><FileBarChart size={19} className="text-[#2666A8]" /><div className="mt-5 text-xs font-semibold text-[#7890A5]">{label}</div><div className="mt-1 break-words font-display text-2xl font-extrabold text-[#102A43]">{value}</div></div>; }
