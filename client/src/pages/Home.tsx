// Corporate Clarity: calm Swiss enterprise information design, navy structure, teal actions, amber exceptions.
// This page owns the AssetMaster dashboard composition and local interaction states.

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import QRCodeGenerator from "qrcode";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { buildFilteredAssetExportRows, buildMaintenanceExportRows, canCreateCatalogOption, filterNamedCatalogOptions, getAssetStatusFilterCounts, getHandoverActionTooltip, getMaintenanceBadgeCount, getNewMaintenanceRequestBadge, getPaginationWindow, matchesVietnameseSearch, toggleMaintenanceStatusFilter } from "@/lib/catalogUi";
import { getNotificationTargetLabel, type NotificationTarget } from "@/lib/notificationLinks";
import { drawPdfCorporateFooter, drawPdfCorporateHeader, handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";
import { formatVnd } from "@/lib/formatters";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import { applyPdfLogoWatermark, createPdfLogoWatermark, openPdfPreview } from "@/lib/pdfExport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AuditPage, MaintenancePage, ReportsPage } from "./OperationsModules";
import { EmployeeManagementView } from "./EmployeeManagementView";
import { ReportsManagementView } from "./ReportsManagementView";
import { RetirementManagementView } from "./RetirementManagementView";
import { OrganizationManagementPage } from "./OrganizationManagementPage";
import { VendorBrandManagementPage } from "./VendorBrandManagementPage";
import { ProcurementManagementView } from "./ProcurementManagementView";
import { AssetCategoryManagementPage } from "./AssetCategoryManagementPage";
import { SuppliesInventoryView } from "./SuppliesInventoryView";
import { LoginGateway } from "./LoginGateway";
import { UserDashboard } from "./UserDashboard";
import { HelpCenter } from "./HelpCenter";
import { AssetImportModal } from "@/components/AssetImportModal";
import { AssetFieldHistoryDrawer } from "@/components/AssetImportRecovery";
import { ImportHistoryLauncher } from "@/components/ImportHistoryDrawer";
import { AssetCatalogDropdowns } from "@/components/AssetCatalogDropdowns";
import { AssetCategoryPicker } from "@/components/AssetCategoryPicker";
import { CompanyBrandSettings } from "@/components/CompanyBrandSettings";
import { ModuleEmptyState } from "@/components/ModuleEmptyState";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";
import { BrandEnhancementsPanel } from "@/components/BrandEnhancementsPanel";
import { SupplyUnitSettings } from "@/components/SupplyUnitSettings";
import { BranchSettings } from "@/components/BranchSettings";
import { MenuOrderSettings } from "@/components/MenuOrderSettings";
import { DatePickerField } from "@/components/DatePickerField";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SearchableSelect } from "@/components/SearchableSelect";
import { FloatingActionTooltip } from "@/components/FloatingActionTooltip";
import { ExportPreviewHost } from "@/components/ExportPreviewHost";
import { EditableSectionLabel } from "@/components/EditableSectionLabel";
import {
  Archive,
  AlertTriangle,
  ArrowDownUp,
  Bell,
  Box,
  Building2,
  Columns3,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileBarChart,
  FileText,
  ReceiptText,
  History,
  Printer,
  ShieldCheck,
  Signature,
  UserCheck,
  Undo2,
  Clock3,
  CheckCircle2,
  Filter,
  Laptop,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageCheck,
  Paperclip,
  PanelLeft,
  Plus,
  PackagePlus,
  QrCode,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Wrench,
  UserRound,
  UsersRound,
  LockKeyhole,
  Loader2,
  Landmark,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "sonner";

function normalizePurchaseDate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  const vietnameseDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalized = vietnameseDate ? `${vietnameseDate[3]}-${vietnameseDate[2].padStart(2, "0")}-${vietnameseDate[1].padStart(2, "0")}T00:00:00` : raw;
  const parsed = typeof value === "number" ? new Date(value) : new Date(normalized.includes("T") || normalized.includes("-") ? normalized : `${normalized}T00:00:00`);
  const timestamp = parsed.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function dateInputValue(value: unknown): string {
  const timestamp = normalizePurchaseDate(value);
  return timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);
}

function handoverCreateErrorMessage(error: { message?: string }) {
  const message = error.message || "";
  if (/failed query|insert into|duplicate entry|er_dup_entry|constraint/i.test(message)) return "Không thể tạo phiếu bàn giao do mã phiếu đang được đồng bộ. Vui lòng thử lại.";
  return message || "Không thể tạo phiếu bàn giao.";
}

type WarrantyState = "none" | "active" | "expiring" | "expired";
function getWarrantyState(value: unknown, now = new Date()): WarrantyState {
  const timestamp = normalizePurchaseDate(value);
  if (timestamp === null) return "none";
  const remainingDays = (timestamp - now.getTime()) / 86_400_000;
  return remainingDays < 0 ? "expired" : remainingDays <= 30 ? "expiring" : "active";
}

const navItems = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Danh mục tài sản", icon: Archive },
  { label: "Phân loại tài sản", icon: Tags },
  { label: "Nhà cung cấp & Hãng", icon: Tags },
  { label: "Hợp đồng & Hóa đơn", icon: FileText },
  { label: "Phụ kiện", icon: Box },
  { label: "Bàn giao & Cấp phát", icon: PackageCheck },
  { label: "Bảo hành & Sửa chữa", icon: Wrench },
  { label: "Phòng Ban & Bộ Phận", icon: Building2 },
  { label: "Quản lý nhân viên", icon: UserRound },
  { label: "Khấu hao & Thanh lý", icon: Landmark },
  { label: "Kiểm kê", icon: ClipboardCheck },
  { label: "Báo Cáo", icon: FileBarChart },
];

const defaultSidebarMenuOrder = navItems.map((item) => item.label);
function normalizeSidebarMenuOrder(value: unknown): string[] {
  const saved = Array.isArray(value) ? value.filter((label): label is string => typeof label === "string" && defaultSidebarMenuOrder.includes(label)) : [];
  return [...new Set([...saved, ...defaultSidebarMenuOrder])];
}

type Asset = {
  code: string;
  branchId?: number | null;
  branchLabel?: string;
  holderUserId?: number | null;
  qrToken?: string;
  name: string;
  category: string;
  categoryId?: number;
  holder: string;
  status: string;
  statusType: "active" | "available" | "maintenance" | "returned" | "retired";
  date: string;
  purchaseDate?: string;
  value: string;
  purchaseContractId?: number | null;
  purchaseInvoiceId?: number | null;
  invoiceKey?: string | null;
  purchaseInvoiceLineId?: number | null;
  repairCost?: number;
  location?: string;
  serial?: string;
  maintenanceReason?: string;
  supplier?: string;
  vendorId?: number;
  brand?: string;
  brandId?: number;
  note?: string;
  warrantyUntil?: string | number | Date | null;
  supplierReturnedAt?: string | number | Date | null;
  supplierReturnReason?: string;
  retiredAt?: string | number | Date | null;
  retirementReason?: string;
  retirementCertificateNumber?: string | null;
  retirementCertificateYear?: number | null;
  retirementCertificateSequence?: number | null;
  retirementAttachmentUrl?: string | null;
  retirementAttachmentName?: string | null;
  retirementAttachmentContentType?: string | null;
  supplierReturnAttachmentUrl?: string | null;
  supplierReturnAttachmentName?: string | null;
  supplierReturnAttachmentContentType?: string | null;
};

type SupplierReturnAttachment = { fileName: string; contentType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp"; dataUrl: string };
type RetirementAttachment = SupplierReturnAttachment;
type AssetSaveAttachments = { supplierReturn?: SupplierReturnAttachment; retirement?: RetirementAttachment };

type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  phone: string;
  email: string;
  websiteUrl: string;
  hideWebsiteOnInternalPdf: boolean;
  websiteTitle: string;
  logoUrl: string;
  brandColor: string;
  faviconUrl: string;
  loginBackgroundUrl: string;
  loginGreeting: string;
  loginBackgroundOverlay: "light" | "dark";
};

type HeaderNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  kind: "assignment" | "maintenance" | "return";
  target: NotificationTarget;
};

type NotificationPreferences = {
  maintenanceEnabled: boolean;
  handoverEnabled: boolean;
  returnRequestEnabled: boolean;
};

const defaultNotificationPreferences: NotificationPreferences = {
  maintenanceEnabled: true,
  handoverEnabled: true,
  returnRequestEnabled: true,
};

const defaultCompanyInfo: CompanyInfo = {
  name: "Công ty Cổ phần AssetMaster",
  address: "Tầng 5, Tòa nhà Innovation, Quận Cầu Giấy, Hà Nội",
  taxCode: "0101234567",
  phone: "024 3789 2468",
  email: "",
  websiteUrl: "",
  hideWebsiteOnInternalPdf: false,
  websiteTitle: "AssetMaster – Hệ thống Quản lý Tài sản",
  logoUrl: "",
  brandColor: "#0F8C8C",
  faviconUrl: "",
  loginBackgroundUrl: "",
  loginGreeting: "",
  loginBackgroundOverlay: "light",
};

function readCompanyInfo(): CompanyInfo {
  try {
    const stored = localStorage.getItem("assetmaster-company-info");
    return stored ? { ...defaultCompanyInfo, ...JSON.parse(stored) } : defaultCompanyInfo;
  } catch {
    return defaultCompanyInfo;
  }
}

const assets: Asset[] = [
  { code: "TS-00124", name: "MacBook Pro 14-inch M3", category: "CNTT", holder: "Nguyễn Minh Anh", status: "Đang cấp phát", statusType: "active", date: "12/01/2025", value: "42.500.000" },
  { code: "TS-00123", name: "Màn hình Dell UltraSharp 27\"", category: "CNTT", holder: "Trần Hoàng Nam", status: "Đang cấp phát", statusType: "active", date: "10/01/2025", value: "12.900.000" },
  { code: "TS-00122", name: "Bàn làm việc Workstation", category: "Văn phòng", holder: "Phòng Thiết kế", status: "Sẵn có", statusType: "available", date: "08/01/2025", value: "8.200.000" },
  { code: "TS-00121", name: "Dell Latitude 7440", category: "CNTT", holder: "Lê Thu Hà", status: "Bảo trì", statusType: "maintenance", date: "05/01/2025", value: "31.800.000" },
  { code: "TS-00120", name: "Máy in HP LaserJet Pro", category: "Thiết bị", holder: "Phòng Hành chính", status: "Đang cấp phát", statusType: "active", date: "21/12/2024", value: "6.450.000" },
  { code: "TS-00119", name: "Ghế công thái học Ergohuman", category: "Văn phòng", holder: "Phạm Quốc Bảo", status: "Sẵn có", statusType: "available", date: "18/12/2024", value: "16.200.000" },
];

const kpis = [
  { label: "Tổng tài sản", value: "1,240", detail: "+12% tháng này", icon: Box, tone: "teal", trend: true },
  { label: "Đang sử dụng", value: "890", detail: "71,8% tổng tài sản", icon: UsersRound, tone: "blue" },
  { label: "Đang bảo trì / Hỏng", value: "45", detail: "3,6% tổng tài sản", icon: Wrench, tone: "amber" },
  { label: "Tổng giá trị", value: "5.2 Tỷ", detail: "Giá trị nguyên giá", icon: Tags, tone: "navy" },
];

const statusStyles = {
  active: "bg-[#E6F6F2] text-[#087A6A] ring-[#B8E9DD]",
  available: "bg-[#EAF3FF] text-[#2666A8] ring-[#C7DDF8]",
  maintenance: "bg-[#FFF5DC] text-[#A86B00] ring-[#F2D596]",
  returned: "bg-[#FDEDEE] text-[#B44545] ring-[#F3C4C4]",
  retired: "bg-[#F4ECF7] text-[#7A3E88] ring-[#DEC6E5]",
};

function EmployeeManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [accountStatusDialogOpen, setAccountStatusDialogOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const usersQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const assetHistory = trpc.employees.assetHistory.useQuery({ userId: selectedEmployeeId ?? 0 }, { enabled: Boolean(selectedEmployeeId) });
  const utils = trpc.useUtils();
  const updateRole = trpc.employees.updateRole.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Đã cập nhật vai trò nhân viên."); },
    onError: (error) => toast.error(error.message || "Không thể cập nhật vai trò nhân viên."),
  });
  const updateActiveStatus = trpc.employees.updateActiveStatus.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Đã cập nhật trạng thái tài khoản."); },
    onError: (error) => toast.error(error.message || "Không thể cập nhật trạng thái tài khoản."),
  });
  const updateDepartment = trpc.employees.updateDepartment.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Đã cập nhật phòng ban nhân viên."); },
    onError: (error) => toast.error(error.message || "Không thể cập nhật phòng ban nhân viên."),
  });
  const departments = departmentsQuery.data || [];
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const allEmployees = usersQuery.data || [];
  const employees = allEmployees.filter((employee) => {
    const matchesRole = roleFilter === "all" || employee.role === roleFilter;
    const matchesStatus = accountStatusFilter === "all" || (accountStatusFilter === "active" ? employee.isActive : !employee.isActive);
    const matchesDepartment = departmentFilter === "all" || (departmentFilter === "unassigned" ? !employee.departmentId : employee.departmentId === Number(departmentFilter));
    const matchesSearch = matchesVietnameseSearch(`${employee.name || ""} ${employee.email || ""}`, searchTerm);
    return matchesRole && matchesStatus && matchesDepartment && matchesSearch;
  });
  const selectedEmployee = allEmployees.find((employee) => employee.id === selectedEmployeeId);
  const selectedDepartment = selectedEmployee?.departmentId ? departmentsById.get(selectedEmployee.departmentId) : undefined;
  const hasSelectedDepartmentInList = Boolean(selectedEmployee?.departmentId && selectedDepartment);
  const accountActionLabel = selectedEmployee?.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản";
  const handoverStatusLabel: Record<string, string> = { draft: "Nháp", pending_signature: "Chờ ký", active: "Đang cấp phát", returned: "Đã hoàn trả", cancelled: "Đã hủy" };

  if (authLoading) return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9"><div className="mx-auto max-w-[1500px] text-sm text-[#71869A]">Đang kiểm tra quyền truy cập...</div></div>;
  if (!isAdmin) return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9"><div className="mx-auto max-w-[720px] rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-6"><div className="flex items-center gap-3 text-[#A86B00]"><ShieldCheck size={22} /><h1 className="font-display text-xl font-extrabold">Không có quyền truy cập</h1></div><p className="mt-3 text-sm leading-6 text-[#71869A]">Chỉ quản trị viên mới có thể xem và thay đổi thông tin nhân viên.</p></div></div>;

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="font-display text-3xl font-extrabold text-[#102A43]">Quản lý nhân viên</h1><p className="mt-1 text-sm text-[#71869A]">Quản lý tài khoản, vai trò, phòng ban và quyền truy cập hệ thống.</p></div><div className="text-xs text-[#71869A]">Hiển thị <span className="font-extrabold text-[#193B57]">{employees.length}</span> trên {allEmployees.length} tài khoản</div></div><div className="mt-5 grid gap-3 rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)] lg:grid-cols-[minmax(0,1.5fr)_0.75fr_0.85fr_0.9fr]"><div className="relative"><Search className="absolute left-3 top-2.5 text-[#8AA0B6]" size={16} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="field-input pl-9" placeholder="Tìm tên hoặc email..." /></div><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="field-input"><option value="all">Tất cả vai trò</option><option value="admin">Quản trị viên</option><option value="user">Nhân viên</option></select><select value={accountStatusFilter} onChange={(e) => setAccountStatusFilter(e.target.value)} className="field-input"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Đã khóa</option></select><select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="field-input"><option value="all">Tất cả phòng ban</option><option value="unassigned">Chưa gán phòng ban</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div><div className="mt-4 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-[#FBFCFD] text-[#8AA0B6]"><tr className="uppercase tracking-[0.1em]"><th className="p-4">Nhân viên</th><th className="px-3 py-4">Email</th><th className="px-3 py-4">Phòng ban</th><th className="px-3 py-4">Vai trò</th><th className="px-3 py-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead><tbody>{usersQuery.isLoading && <tr><td colSpan={6} className="p-8 text-center text-sm text-[#71869A]">Đang tải danh sách nhân viên...</td></tr>}{!usersQuery.isLoading && employees.map((employee) => { const employeeDepartment = employee.departmentId ? departmentsById.get(employee.departmentId) : undefined; return <tr key={employee.id} className="border-t border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="p-4 font-bold text-[#193B57]">{employee.name || "Chưa đặt tên"}</td><td className="px-3 py-4 text-[#60758A]">{employee.email || "—"}</td><td className="px-3 py-4 text-[#60758A]">{employeeDepartment?.name || (employee.departmentId ? "Phòng ban đã ngừng hoạt động" : "Chưa gán")}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${employee.role === "admin" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]"}`}>{employee.role === "admin" ? "Quản trị viên" : "Nhân viên"}</span></td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-extrabold ${employee.isActive ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FDEDEE] text-[#B44545]"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{employee.isActive ? "Đang hoạt động" : "Đã khóa"}</span></td><td className="p-4 text-right"><button onClick={() => setSelectedEmployeeId(employee.id)} className="mr-2 rounded-md border border-[#DDE7F0] px-3 py-1.5 font-bold text-[#2666A8] hover:bg-[#EAF3FF]">Xem thông tin</button><button disabled={updateRole.isPending} onClick={() => updateRole.mutate({ id: employee.id, role: employee.role === "admin" ? "user" : "admin" })} className="rounded-md border border-[#CDE5E5] px-3 py-1.5 font-bold text-[#087A6A] hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50">Đổi vai trò</button></td></tr>; })}{!usersQuery.isLoading && employees.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-sm text-[#8AA0B6]">Không tìm thấy nhân viên phù hợp với bộ lọc.</td></tr>}</tbody></table></div></div></div>{selectedEmployee && <><button onClick={() => setSelectedEmployeeId(null)} className="fixed inset-0 z-40 bg-[#102A43]/20 backdrop-blur-[1px]" aria-label="Đóng hồ sơ nhân viên" /><aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6"><button onClick={() => setSelectedEmployeeId(null)} className="float-right rounded-md px-2 py-1 text-xs font-bold text-[#71869A] hover:bg-[#F0F5F8]">Đóng</button><div className="pr-16"><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">Hồ sơ nhân viên</div><h2 className="mt-2 font-display text-2xl font-extrabold text-[#102A43]">{selectedEmployee.name || "Nhân viên"}</h2><p className="mt-1 break-all text-sm text-[#71869A]">{selectedEmployee.email || "Chưa có email"}</p></div><div className="mt-5 grid grid-cols-2 gap-2"><div className={`rounded-lg px-3 py-2 text-xs font-bold ${selectedEmployee.role === "admin" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#F0F5F8] text-[#60758A]"}`}>{selectedEmployee.role === "admin" ? "Quản trị viên" : "Nhân viên"}</div><div className={`rounded-lg px-3 py-2 text-xs font-bold ${selectedEmployee.isActive ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FDEDEE] text-[#B44545]"}`}>{selectedEmployee.isActive ? "Đang hoạt động" : "Tài khoản đã khóa"}</div></div><section className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-[#193B57]">Phòng ban</h3><p className="mt-1 text-xs leading-5 text-[#71869A]">Được quản trị viên gán thủ công.</p></div><Building2 size={18} className="text-[#0F8C8C]" /></div><select value={selectedEmployee.departmentId ? String(selectedEmployee.departmentId) : "unassigned"} disabled={updateDepartment.isPending || departmentsQuery.isLoading} onChange={(event) => updateDepartment.mutate({ id: selectedEmployee.id, departmentId: event.target.value === "unassigned" ? null : Number(event.target.value) })} className="field-input mt-3 disabled:cursor-not-allowed disabled:opacity-60"><option value="unassigned">Chưa gán phòng ban</option>{selectedEmployee.departmentId && !hasSelectedDepartmentInList && <option value={selectedEmployee.departmentId} disabled>Phòng ban đã ngừng hoạt động</option>}{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{departments.length === 0 && !departmentsQuery.isLoading && <p className="mt-2 text-xs text-[#A86B00]">Chưa có phòng ban đang hoạt động để gán.</p>}</section><section className="mt-4 rounded-xl border border-[#E7EEF3] p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-[#193B57]">Bảo mật tài khoản</h3><p className="mt-1 text-xs leading-5 text-[#71869A]">Tài khoản bị khóa không thể gọi các API được bảo vệ.</p></div><ShieldCheck size={18} className="text-[#0F8C8C]" /></div><button disabled={updateActiveStatus.isPending || (selectedEmployee.id === user?.id && selectedEmployee.isActive)} onClick={() => setAccountStatusDialogOpen(true)} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedEmployee.isActive ? "bg-[#FDEDEE] text-[#B44545] hover:bg-[#F9DCDD]" : "bg-[#E6F6F2] text-[#087A6A] hover:bg-[#D4F0E9]"}`}>{selectedEmployee.isActive ? <LockKeyhole size={15} /> : <Unlock size={15} />}{updateActiveStatus.isPending ? "Đang cập nhật..." : accountActionLabel}</button>{selectedEmployee.id === user?.id && selectedEmployee.isActive && <p className="mt-2 text-xs text-[#8AA0B6]">Bạn không thể tự khóa tài khoản quản trị đang sử dụng.</p>}</section><section className="mt-5 border-t border-[#E7EEF3] pt-5"><div className="flex items-center justify-between"><h3 className="font-bold text-[#193B57]">Lịch sử tài sản</h3><span className="text-xs font-semibold text-[#71869A]">{assetHistory.data?.length || 0} phiếu</span></div>{assetHistory.isLoading && <p className="mt-3 text-sm text-[#71869A]">Đang tải lịch sử tài sản...</p>}{assetHistory.data?.map((item) => <div key={item.id} className="mt-3 rounded-lg border border-[#E7EEF3] p-3 text-sm"><div className="font-bold text-[#193B57]">{item.assetCode} · {item.assetName}</div><div className="mt-1.5 inline-flex rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-extrabold text-[#60758A]">{handoverStatusLabel[item.status] || item.status}</div><div className="mt-2 space-y-1 text-xs text-[#71869A]"><div>Bàn giao: {new Date(item.handedOverAt).toLocaleDateString("vi-VN")}</div>{item.returnedAt && <div>Hoàn trả: {new Date(item.returnedAt).toLocaleDateString("vi-VN")}</div>}</div></div>)}{!assetHistory.isLoading && !assetHistory.data?.length && <p className="mt-3 text-sm text-[#8AA0B6]">Chưa có lịch sử tài sản.</p>}</section></aside><AlertDialog open={accountStatusDialogOpen} onOpenChange={setAccountStatusDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{accountActionLabel}?</AlertDialogTitle><AlertDialogDescription>{selectedEmployee.isActive ? `Tài khoản của ${selectedEmployee.name || "nhân viên này"} sẽ không thể truy cập các chức năng yêu cầu đăng nhập cho đến khi được mở khóa.` : `Khôi phục quyền truy cập cho tài khoản của ${selectedEmployee.name || "nhân viên này"}.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => updateActiveStatus.mutate({ id: selectedEmployee.id, isActive: !selectedEmployee.isActive })} className={selectedEmployee.isActive ? "bg-[#B44545] text-white hover:bg-[#933737]" : "bg-[#087A6A] text-white hover:bg-[#066254]"}>{accountActionLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}</div>;
}

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activeNav, setActiveNav] = useState(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    const deepLinks: Record<string, string> = { assets: "Danh mục tài sản", supplies: "Phụ kiện", categories: "Phân loại tài sản", maintenance: "Bảo hành & Sửa chữa", audit: "Kiểm kê", retirement: "Khấu hao & Thanh lý", reports: "Báo Cáo", employees: "Quản lý nhân viên", organization: "Phòng Ban & Bộ Phận", vendors: "Nhà cung cấp & Hãng", contracts: "Hợp đồng & Hóa đơn", invoices: "Hợp đồng & Hóa đơn", handovers: "Bàn giao & Cấp phát", settings: "Cài đặt", help: "Trợ giúp & hướng dẫn" };
    return view ? deepLinks[view] || "Tổng quan" : "Tổng quan";
  });
  const [sidebarMenuOrder, setSidebarMenuOrder] = useState<string[]>(defaultSidebarMenuOrder);
  const menuPreferencesQuery = trpc.menuPreferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveMenuPreferences = trpc.menuPreferences.save.useMutation({ onError: (error) => toast.error(error.message || "Không thể lưu thứ tự menu."), onSuccess: () => toast.success("Đã đồng bộ thứ tự menu.") });
  useEffect(() => { if (menuPreferencesQuery.data) setSidebarMenuOrder(normalizeSidebarMenuOrder(menuPreferencesQuery.data.menuOrder)); }, [menuPreferencesQuery.data]);
  const saveSidebarMenuOrder = (next: string[]) => { setSidebarMenuOrder(next); saveMenuPreferences.mutate({ menuOrder: next }); };
  const moveSidebarMenu = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sidebarMenuOrder.length) return;
    const next = [...sidebarMenuOrder];
    [next[index], next[target]] = [next[target], next[index]];
    saveSidebarMenuOrder(next);
  };
  const reorderSidebarMenu = (next: string[]) => saveSidebarMenuOrder(normalizeSidebarMenuOrder(next));
  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [assetModal, setAssetModal] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [returnInvoiceId, setReturnInvoiceId] = useState<number | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [handoverAssetCode, setHandoverAssetCode] = useState<string | null>(null);
  const [qrLookupOpen, setQrLookupOpen] = useState(false);
  const [assetImportOpen, setAssetImportOpen] = useState(false);
  const [assetHistoryId, setAssetHistoryId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Asset>({ code: "", name: "", category: "", holder: "", status: "Sẵn có", statusType: "available", date: new Date().toISOString().slice(0, 10), value: "", location: "", serial: "", supplier: "", note: "" });
  const pendingSupplierReturnAttachmentRef = useRef<SupplierReturnAttachment | null>(null);
  const pendingRetirementAttachmentRef = useRef<RetirementAttachment | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả loại tài sản");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [department, setDepartment] = useState("Tất cả phòng ban");
  const [vendorFilter, setVendorFilter] = useState("Tất cả nhà cung cấp");
  const [brandFilter, setBrandFilter] = useState("Tất cả hãng");
  const [warrantyFilter, setWarrantyFilter] = useState("Tất cả bảo hành");
  const [branchFilter, setBranchFilter] = useState("Tất cả chi nhánh");
  const [invoiceFilter, setInvoiceFilter] = useState("Tất cả Hóa đơn");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsClosing, setNotificationsClosing] = useState(false);
  const sidebarProfileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const headerProfileRef = useRef<HTMLDivElement>(null);
  const notificationsOpenRef = useRef(false);
  const notificationCloseTimerRef = useRef<number | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("assetmaster-read-notification-ids") || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(readCompanyInfo);
  const [maintenanceChartYear, setMaintenanceChartYear] = useState(() => new Date().getFullYear());
  const [selectedMaintenanceChartMonth, setSelectedMaintenanceChartMonth] = useState<number | null>(null);
  const [maintenanceTicketCostSort, setMaintenanceTicketCostSort] = useState<"desc" | "asc">("desc");
  const isAdmin = user?.role === "admin";
  const assetQuery = trpc.assets.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const dashboardInvoicesQuery = trpc.purchaseInvoices.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const suppliesQuery = trpc.supplies.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const assetCategoriesQuery = trpc.assetCategories.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const maintenanceTicketsQuery = trpc.maintenance.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const repairCostByAssetId = useMemo(() => (maintenanceTicketsQuery.data || []).filter((ticket) => (ticket.serviceChannel || "repair") === "repair").reduce((totals, ticket) => totals.set(ticket.assetId, (totals.get(ticket.assetId) || 0) + Number(ticket.actualCost ?? 0)), new Map<number, number>()), [maintenanceTicketsQuery.data]);
  const totalMaintenanceServiceCost = useMemo(() => (maintenanceTicketsQuery.data || []).reduce((total, ticket) => total + Number(ticket.actualCost ?? 0), 0), [maintenanceTicketsQuery.data]);
  const maintenanceBudgetsQuery = trpc.maintenance.monthlyBudgets.useQuery({ year: maintenanceChartYear }, { enabled: isAuthenticated && isAdmin });
  const retirementCertificatesQuery = trpc.retirementCertificates.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const vendorsQuery = trpc.vendors.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const brandsQuery = trpc.brands.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const branchesQuery = trpc.branches.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const companyQuery = trpc.company.get.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const notificationHandoversQuery = trpc.handovers.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const notificationPreferencesQuery = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const operationalRemindersQuery = trpc.reminders.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  type OperationalReminder = NonNullable<typeof operationalRemindersQuery.data>[number];
  const overdueAuditReminders = (operationalRemindersQuery.data || []).filter((reminder): reminder is Extract<OperationalReminder, { kind: "audit" }> => reminder.kind === "audit" && reminder.isOverdue);
  useEffect(() => {
    if (!assetQuery.isError) return;
    const message = assetQuery.error instanceof Error ? assetQuery.error.message : "Vui lòng kiểm tra kết nối và thử lại.";
    toast.error("Không thể tải Danh mục tài sản", {
      description: message,
      action: { label: "Thử lại", onClick: () => void assetQuery.refetch() },
    });
  }, [assetQuery.error, assetQuery.isError, assetQuery.refetch]);
  const maintenanceBadgeCount = getMaintenanceBadgeCount(assetRows);
  const newMaintenanceRequestBadge = getNewMaintenanceRequestBadge(maintenanceTicketsQuery.data || []);
  const monthlyMaintenanceCosts = (() => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const key = `${maintenanceChartYear}-${String(index + 1).padStart(2, "0")}`;
      return { key, month: index + 1, label: `T${index + 1}`, total: 0, warrantyTotal: 0, repairTotal: 0, tickets: [] as Array<NonNullable<typeof maintenanceTicketsQuery.data>[number]> };
    });
    const byKey = new Map(months.map((month) => [month.key, month]));
    (maintenanceTicketsQuery.data || []).forEach((ticket) => {
      const date = ticket.resolvedAt || ticket.openedAt;
      if (!date) return;
      const occurredAt = new Date(date);
      const key = `${occurredAt.getFullYear()}-${String(occurredAt.getMonth() + 1).padStart(2, "0")}`;
      const month = byKey.get(key);
      const amount = Number(ticket.actualCost ?? ticket.estimatedCost ?? 0);
      if (month && Number.isFinite(amount) && amount >= 0) {
        month.total += amount;
        if (ticket.serviceChannel === "warranty") month.warrantyTotal += amount;
        else month.repairTotal += amount;
        month.tickets?.push(ticket);
      }
    });
    const budgets = new Map((maintenanceBudgetsQuery.data || []).map((budget) => [budget.month, Number(budget.amount)]));
    return months.map((month) => ({ ...month, budget: budgets.get(month.month) ?? null }));
  })();
  const maintenanceChartYears = Array.from(new Set([
    ...Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index),
    ...(maintenanceTicketsQuery.data || []).map((ticket) => new Date(ticket.resolvedAt || ticket.openedAt).getFullYear()).filter(Number.isFinite),
  ])).sort((a, b) => b - a);
  const maintenanceRequestBadgeTone = { low: "bg-[#EAF3FF] text-[#2666A8]", medium: "bg-[#FFF0C9] text-[#A86B00]", high: "bg-[#FFE7CF] text-[#B85B16]", critical: "bg-[#FDEDEE] text-[#B44545]" }[newMaintenanceRequestBadge.priority || "low"];
  const sidebarNavItems = sidebarMenuOrder.map((label) => navItems.find((item) => item.label === label)).filter((item): item is (typeof navItems)[number] => Boolean(item)).map((item) => ({ ...item, maintenanceAssetCount: item.label === "Bảo hành & Sửa chữa" ? maintenanceBadgeCount : 0, maintenanceRequestCount: item.label === "Bảo hành & Sửa chữa" ? newMaintenanceRequestBadge.count : 0 }));
  const trpcUtils = trpc.useUtils();
  const saveMaintenanceBudgetMutation = trpc.maintenance.saveMonthlyBudget.useMutation({
    onSuccess: (_result, variables) => {
      void maintenanceBudgetsQuery.refetch();
      toast.success(`Đã lưu ngân sách tháng ${variables.month}/${variables.year}.`);
    },
    onError: (error) => toast.error(error.message || "Không thể lưu ngân sách bảo trì."),
  });
  const saveCompanyMutation = trpc.company.save.useMutation({ onSuccess: () => companyQuery.refetch() });
  const saveNotificationPreferencesMutation = trpc.notifications.savePreferences.useMutation({
    onSuccess: (_result, nextPreferences) => {
      trpcUtils.notifications.preferences.setData(undefined, nextPreferences);
      toast.success("Đã lưu tùy chọn thông báo.");
    },
    onError: (error) => toast.error(error.message || "Không thể lưu tùy chọn thông báo."),
  });
  const uploadSupplierReturnAttachmentMutation = trpc.assets.uploadSupplierReturnAttachment.useMutation({ onSuccess: () => { void assetQuery.refetch(); toast.success("Đã lưu tệp xác nhận trả nhà cung cấp."); }, onError: (error) => toast.error(error.message || "Không thể lưu tệp xác nhận trả nhà cung cấp.") });
  const uploadRetirementAttachmentMutation = trpc.assets.uploadRetirementAttachment.useMutation({ onSuccess: () => { void assetQuery.refetch(); toast.success("Đã lưu chứng từ thanh lý."); }, onError: (error) => toast.error(error.message || "Không thể lưu chứng từ thanh lý.") });
  const createAssetMutation = trpc.assets.create.useMutation({ onSuccess: (result) => { void assetQuery.refetch(); setAssetModal(null); toast.success("Đã tạo tài sản và lưu vào hệ thống."); if (pendingRetirementAttachmentRef.current) { const attachment = pendingRetirementAttachmentRef.current; pendingRetirementAttachmentRef.current = null; uploadRetirementAttachmentMutation.mutate({ id: result.id, ...attachment }); } }, onError: (error) => { pendingRetirementAttachmentRef.current = null; toast.error(error.message || "Không thể tạo tài sản."); } });
  const updateAssetMutation = trpc.assets.update.useMutation({ onSuccess: (_result, variables) => { void assetQuery.refetch(); void maintenanceTicketsQuery.refetch(); setAssetModal(null); toast.success("Đã cập nhật tài sản thành công!"); if (variables.id && pendingSupplierReturnAttachmentRef.current) { const attachment = pendingSupplierReturnAttachmentRef.current; pendingSupplierReturnAttachmentRef.current = null; uploadSupplierReturnAttachmentMutation.mutate({ id: variables.id, ...attachment }); } if (variables.id && pendingRetirementAttachmentRef.current) { const attachment = pendingRetirementAttachmentRef.current; pendingRetirementAttachmentRef.current = null; uploadRetirementAttachmentMutation.mutate({ id: variables.id, ...attachment }); } }, onError: (error) => { pendingSupplierReturnAttachmentRef.current = null; pendingRetirementAttachmentRef.current = null; toast.error(error.message || "Không thể cập nhật tài sản."); } });

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const anchor = document.querySelector<HTMLElement>("[data-dashboard-alert-row]");
    if (!anchor) return;
    const existing = document.querySelector<HTMLElement>("[data-maintenance-monthly-cost-chart]");
    existing?.remove();
    const max = Math.max(...monthlyMaintenanceCosts.map((item) => Math.max(item.total, item.budget || 0)), 1);
    const total = monthlyMaintenanceCosts.reduce((sum, item) => sum + item.total, 0);
    const warrantyTotal = monthlyMaintenanceCosts.reduce((sum, item) => sum + item.warrantyTotal, 0);
    const repairTotal = monthlyMaintenanceCosts.reduce((sum, item) => sum + item.repairTotal, 0);
    const selectedMonth = selectedMaintenanceChartMonth ? monthlyMaintenanceCosts.find((item) => item.month === selectedMaintenanceChartMonth) : null;
    const chart = document.createElement("section");
    chart.dataset.maintenanceMonthlyCostChart = "true";
    chart.className = "mt-5 rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]";
    chart.innerHTML = `<div class="flex flex-wrap items-start justify-between gap-3"><div><div class="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><span class="grid h-7 w-7 place-items-center rounded-lg bg-[#FFF5DC] text-[#A86B00]">₫</span>Chi phí Bảo hành/Sửa chữa theo tháng</div><p class="mt-1 text-xs text-[#71869A]">Cột xếp chồng hiển thị riêng hai Kênh xử lý; nhấp tháng để xem phiếu chi tiết và thiết lập ngân sách.</p></div><div class="flex items-center gap-2"><label class="sr-only" for="maintenance-chart-year">Chọn năm</label><select id="maintenance-chart-year" class="h-9 rounded-lg border border-[#D7E3EB] bg-white px-3 text-xs font-extrabold text-[#193B57] focus:border-[#0F8C8C] focus:outline-none"></select><div class="rounded-lg bg-[#FFF9EB] px-3 py-2 text-right"><div class="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#8F6A31]">Tổng năm ${maintenanceChartYear}</div><div class="mt-1 text-sm font-extrabold text-[#A86B00]">${formatVnd(total)} VNĐ</div><div class="mt-1 flex justify-end gap-2 text-[10px] font-bold"><span class="text-[#087A6A]">BH ${formatVnd(warrantyTotal)}</span><span class="text-[#3855A6]">SC ${formatVnd(repairTotal)}</span></div></div></div></div><div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#71869A]"><span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-[#0F8C8C]"></span>Bảo hành</span><span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-[#3855A6]"></span>Sửa chữa</span><span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm border-2 border-[#B44545]"></span>Vượt ngân sách</span><span class="inline-flex items-center gap-1"><span class="h-px w-4 border-t border-dashed border-[#A86B00]"></span>Mức ngân sách</span></div><div class="mt-4 grid h-48 grid-cols-6 items-end gap-2 sm:gap-3 lg:grid-cols-12" aria-label="Biểu đồ chi phí Bảo hành và Sửa chữa theo tháng"></div>`;
    const yearSelect = chart.querySelector<HTMLSelectElement>("#maintenance-chart-year");
    maintenanceChartYears.forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = `Năm ${year}`;
      option.selected = year === maintenanceChartYear;
      yearSelect?.append(option);
    });
    yearSelect?.addEventListener("change", () => {
      setMaintenanceChartYear(Number(yearSelect.value));
      setSelectedMaintenanceChartMonth(null);
    });
    const bars = chart.querySelector("[aria-label]");
    monthlyMaintenanceCosts.forEach((item) => {
      const isOverBudget = item.budget !== null && item.total > item.budget;
      const column = document.createElement("button");
      column.type = "button";
      column.className = "flex h-full min-w-0 flex-col items-center justify-end gap-1.5 rounded-md px-0.5 text-left transition hover:bg-[#F5FAFA] focus:outline-none focus:ring-2 focus:ring-[#0F8C8C]/35";
      column.setAttribute("aria-label", `Xem phiếu Bảo hành/Sửa chữa tháng ${item.month}/${maintenanceChartYear}`);
      const value = document.createElement("span");
      value.className = `hidden max-w-full truncate text-[10px] font-bold sm:block ${isOverBudget ? "text-[#B44545]" : "text-[#60758A]"}`;
      value.textContent = item.total ? `${Math.round(item.total / 1000).toLocaleString("vi-VN")}k` : "0";
      const plot = document.createElement("div");
      plot.className = "relative flex h-[154px] w-full items-end";
      const bar = document.createElement("div");
      bar.className = `flex w-full min-h-1 flex-col justify-end overflow-hidden rounded-t-md transition-[height] duration-300 ${isOverBudget ? "ring-2 ring-inset ring-[#B44545]" : ""}`;
      bar.style.height = `${item.total ? Math.max((item.total / max) * 100, 6) : 3}%`;
      bar.title = `${item.label}: ${formatVnd(item.total)} VNĐ · Bảo hành: ${formatVnd(item.warrantyTotal)} VNĐ · Sửa chữa: ${formatVnd(item.repairTotal)} VNĐ${item.budget !== null ? ` · Ngân sách: ${formatVnd(item.budget)} VNĐ` : " · Chưa đặt ngân sách"}`;
      if (item.warrantyTotal > 0) {
        const warrantySegment = document.createElement("span");
        warrantySegment.className = "w-full bg-gradient-to-t from-[#087A6A] to-[#69BBB5]";
        warrantySegment.style.height = `${(item.warrantyTotal / item.total) * 100}%`;
        bar.append(warrantySegment);
      }
      if (item.repairTotal > 0) {
        const repairSegment = document.createElement("span");
        repairSegment.className = "w-full bg-gradient-to-t from-[#3855A6] to-[#8CA2E8]";
        repairSegment.style.height = `${(item.repairTotal / item.total) * 100}%`;
        bar.append(repairSegment);
      }
      plot.append(bar);
      if (item.budget !== null) {
        const budgetLine = document.createElement("span");
        budgetLine.className = "pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#A86B00]";
        budgetLine.style.bottom = `${Math.min((item.budget / max) * 100, 100)}%`;
        budgetLine.title = `Ngân sách: ${formatVnd(item.budget)} VNĐ`;
        plot.append(budgetLine);
      }
      const label = document.createElement("span");
      label.className = `text-[10px] font-extrabold ${isOverBudget ? "text-[#B44545]" : "text-[#71869A]"}`;
      label.textContent = item.label;
      column.append(value, plot, label);
      column.addEventListener("click", () => setSelectedMaintenanceChartMonth(item.month));
      bars?.append(column);
    });
    if (selectedMonth) {
      const details = document.createElement("section");
      details.className = `mt-5 rounded-xl border p-4 ${selectedMonth.budget !== null && selectedMonth.total > selectedMonth.budget ? "border-[#F2C1C4] bg-[#FFF7F7]" : "border-[#E1EAEE] bg-[#F8FBFC]"}`;
      const detailsHeader = document.createElement("div");
      detailsHeader.className = "flex flex-wrap items-start justify-between gap-3";
      const titleBlock = document.createElement("div");
      const title = document.createElement("h3");
      title.className = "font-bold text-[#193B57]";
      title.textContent = `Phiếu Bảo hành/Sửa chữa tháng ${selectedMonth.month}/${maintenanceChartYear}`;
      const summary = document.createElement("p");
      summary.className = "mt-1 text-xs text-[#60758A]";
      summary.textContent = `${selectedMonth.tickets.length} phiếu · Bảo hành ${formatVnd(selectedMonth.warrantyTotal)} VNĐ · Sửa chữa ${formatVnd(selectedMonth.repairTotal)} VNĐ · Tổng ${formatVnd(selectedMonth.total)} VNĐ${selectedMonth.budget !== null ? ` · Ngân sách ${formatVnd(selectedMonth.budget)} VNĐ` : " · Chưa đặt ngân sách"}`;
      titleBlock.append(title, summary);
      const detailActions = document.createElement("div");
      detailActions.className = "flex items-center gap-2";
      const sortSelect = document.createElement("select");
      sortSelect.className = "h-8 rounded-md border border-[#D7E3EB] bg-white px-2 text-[11px] font-bold text-[#60758A] outline-none focus:border-[#0F8C8C]";
      sortSelect.setAttribute("aria-label", "Sắp xếp phiếu theo chi phí");
      sortSelect.innerHTML = '<option value="desc">Chi phí cao → thấp</option><option value="asc">Chi phí thấp → cao</option>';
      sortSelect.value = maintenanceTicketCostSort;
      sortSelect.addEventListener("change", () => setMaintenanceTicketCostSort(sortSelect.value === "asc" ? "asc" : "desc"));
      const close = document.createElement("button");
      close.type = "button";
      close.className = "rounded-md px-2 py-1 text-xs font-bold text-[#60758A] hover:bg-white";
      close.textContent = "Đóng";
      close.addEventListener("click", () => setSelectedMaintenanceChartMonth(null));
      detailActions.append(sortSelect, close);
      detailsHeader.append(titleBlock, detailActions);
      const budgetForm = document.createElement("div");
      budgetForm.className = "mt-4 grid gap-2 rounded-lg border border-[#E1EAEE] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end";
      const budgetField = document.createElement("label");
      budgetField.className = "flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-bold text-[#60758A]";
      budgetField.textContent = "Ngân sách tháng (VNĐ)";
      const budgetInput = document.createElement("input");
      budgetInput.inputMode = "numeric";
      budgetInput.autocomplete = "off";
      budgetInput.value = selectedMonth.budget === null ? "" : formatVnd(selectedMonth.budget);
      budgetInput.placeholder = "Ví dụ: 5.000.000";
      budgetInput.className = "h-9 rounded-lg border border-[#D7E3EB] bg-white px-3 text-sm font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]";
      budgetInput.addEventListener("input", () => { budgetInput.value = budgetInput.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."); });
      budgetField.append(budgetInput);
      const saveBudget = document.createElement("button");
      saveBudget.type = "button";
      saveBudget.className = "h-9 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white transition hover:bg-[#087A7A] disabled:cursor-not-allowed disabled:opacity-60";
      saveBudget.textContent = "Lưu ngân sách";
      saveBudget.disabled = saveMaintenanceBudgetMutation.isPending;
      saveBudget.addEventListener("click", () => {
        const rawAmount = budgetInput.value.replace(/\D/g, "");
        if (!rawAmount) { toast.error("Vui lòng nhập ngân sách bằng số."); return; }
        saveMaintenanceBudgetMutation.mutate({ year: maintenanceChartYear, month: selectedMonth.month, amount: rawAmount });
      });
      budgetForm.append(budgetField, saveBudget);
      details.append(detailsHeader, budgetForm);
      const ticketList = document.createElement("div");
      ticketList.className = "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      if (selectedMonth.tickets.length === 0) {
        const empty = document.createElement("p");
        empty.className = "rounded-lg border border-dashed border-[#D7E3EB] bg-white px-3 py-4 text-center text-xs text-[#71869A]";
        empty.textContent = "Không có phiếu Bảo hành/Sửa chữa phát sinh trong tháng này.";
        ticketList.append(empty);
      } else {
        const sortedTickets = [...selectedMonth.tickets].sort((left, right) => {
          const difference = Number(left.actualCost ?? left.estimatedCost ?? 0) - Number(right.actualCost ?? right.estimatedCost ?? 0);
          return maintenanceTicketCostSort === "asc" ? difference : -difference;
        });
        sortedTickets.forEach((ticket) => {
          const row = document.createElement("article");
          row.className = "flex min-h-[118px] flex-col rounded-lg border border-[#E1EAEE] bg-white p-3 shadow-[0_2px_8px_rgba(16,42,67,0.025)]";
          const code = document.createElement("div");
          code.className = "text-xs font-extrabold text-[#193B57]";
          code.textContent = `${ticket.ticketCode} · ${ticket.serviceChannel === "warranty" ? "Bảo hành" : "Sửa chữa"} · ${ticket.status === "closed" ? "Đã đóng" : ticket.status === "resolved" ? "Đã xử lý" : ticket.status === "in_progress" ? "Đang xử lý" : "Mới mở"}`;
          const description = document.createElement("p");
          description.className = "mt-1 line-clamp-2 text-xs leading-5 text-[#60758A]";
          description.textContent = ticket.description;
          const costs = document.createElement("p");
          costs.className = "mt-auto pt-2 text-[11px] font-semibold leading-5 text-[#71869A]";
          costs.textContent = `Dự kiến: ${ticket.estimatedCost === null ? "—" : `${formatVnd(ticket.estimatedCost)} VNĐ`} · Thực tế: ${ticket.actualCost === null ? "—" : `${formatVnd(ticket.actualCost)} VNĐ`}`;
          const openTicket = document.createElement("button");
          openTicket.type = "button";
          openTicket.className = "mt-2 inline-flex h-7 w-fit items-center rounded-md border border-[#CDE5E5] bg-[#F4FBFA] px-2.5 text-[10px] font-extrabold text-[#087A6A] transition hover:bg-[#E6F6F2]";
          openTicket.textContent = "Mở nhanh";
          openTicket.addEventListener("click", () => {
            sessionStorage.setItem("assetmaster-open-maintenance-ticket-id", String(ticket.id));
            setActiveNav("Bảo hành & Sửa chữa");
            setMobileNavOpen(false);
            window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
          });
          row.append(code, description, costs, openTicket);
          ticketList.append(row);
        });
      }
      details.append(ticketList);
      chart.append(details);
    }
    anchor.insertAdjacentElement("afterend", chart);
    return () => chart.remove();
  }, [isAuthenticated, isAdmin, maintenanceChartYear, maintenanceChartYears, maintenanceTicketCostSort, monthlyMaintenanceCosts, saveMaintenanceBudgetMutation, selectedMaintenanceChartMonth]);

  useEffect(() => {
    const openImport = () => setAssetImportOpen(true);
    window.addEventListener("assetmaster:open-asset-import", openImport);
    return () => window.removeEventListener("assetmaster:open-asset-import", openImport);
  }, []);

  useEffect(() => {
    const openHistory = (event: Event) => setAssetHistoryId(Number((event as CustomEvent<number>).detail) || null);
    window.addEventListener("assetmaster:open-asset-history", openHistory);
    return () => window.removeEventListener("assetmaster:open-asset-history", openHistory);
  }, []);

  useEffect(() => {
    if (!assetQuery.data) return;
    setAssetRows(assetQuery.data.map((asset) => ({
      code: asset.assetCode, qrToken: asset.qrToken, branchId: asset.branchId ?? null, branchLabel: asset.branchId ? (() => { const branch = (branchesQuery.data || []).find((item) => item.id === asset.branchId); return branch ? `${branch.name} · ${branch.code}` : "Chưa gán"; })() : "Chưa gán", holderUserId: asset.holderUserId ?? null, name: asset.name, category: asset.categoryId ? assetCategoriesQuery.data?.find((category) => category.id === asset.categoryId)?.name || "Chưa phân loại" : typeof (asset.metadata as { category?: unknown } | null)?.category === "string" ? String((asset.metadata as { category?: unknown }).category) : "Chưa phân loại", categoryId: asset.categoryId || undefined, holder: asset.holderName || (asset.status === "retired" ? "Khấu hao - Thanh lý" : asset.status === "maintenance" ? "Bảo hành/Sửa chữa" : asset.status === "available" ? "Chưa bàn giao" : "Chưa cấp phát"), status: asset.status === "assigned" ? "Đang cấp phát" : asset.status === "maintenance" ? "Bảo hành/Sửa chữa" : asset.status === "returned_to_vendor" ? "Trả nhà cung cấp" : asset.status === "retired" ? "Khấu hao/Thanh lý" : "Sẵn có", statusType: asset.status === "assigned" ? "active" : asset.status === "maintenance" ? "maintenance" : asset.status === "returned_to_vendor" ? "returned" : asset.status === "retired" ? "retired" : "available", date: asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "—", purchaseDate: asset.purchaseDate ? dateInputValue(asset.purchaseDate) : "", value: asset.purchaseValue ? String(asset.purchaseValue) : "0", purchaseContractId: asset.purchaseContractId ?? null, repairCost: repairCostByAssetId.get(asset.id) || 0, location: asset.location || "", serial: asset.serialNumber || "", maintenanceReason: asset.maintenanceReason || "", supplier: asset.vendor || vendorsQuery.data?.find((vendor) => vendor.id === asset.vendorId)?.name || "", vendorId: asset.vendorId || undefined, brand: brandsQuery.data?.find((brand) => brand.id === asset.brandId)?.name || "", brandId: asset.brandId || undefined, note: asset.note || "", warrantyUntil: asset.warrantyUntil ? new Date(asset.warrantyUntil).toISOString().slice(0, 10) : "", supplierReturnedAt: asset.supplierReturnedAt ? new Date(asset.supplierReturnedAt).toISOString().slice(0, 10) : "", supplierReturnReason: asset.supplierReturnReason || "", retirementCertificateNumber: asset.retirementCertificateNumber || null, retirementCertificateYear: asset.retirementCertificateYear || null, retirementCertificateSequence: asset.retirementCertificateSequence || null, retirementAttachmentUrl: asset.retirementAttachmentUrl || null, retirementAttachmentName: asset.retirementAttachmentName || null, retirementAttachmentContentType: asset.retirementAttachmentContentType || null, supplierReturnAttachmentUrl: asset.supplierReturnAttachmentUrl || null, supplierReturnAttachmentName: asset.supplierReturnAttachmentName || null, supplierReturnAttachmentContentType: asset.supplierReturnAttachmentContentType || null,
    })));
  }, [assetQuery.data, vendorsQuery.data, brandsQuery.data, assetCategoriesQuery.data, branchesQuery.data, repairCostByAssetId]);

  useEffect(() => {
    if (!assetQuery.data) return;
    const invoiceByCode = new Map(assetQuery.data.map((asset) => [asset.assetCode, { purchaseInvoiceId: asset.purchaseInvoiceId ?? null, purchaseInvoiceLineId: asset.purchaseInvoiceLineId ?? null }]));
    setAssetRows((current) => current.map((asset) => {
      const invoice = invoiceByCode.get(asset.code);
      return invoice ? { ...asset, ...invoice } : asset;
    }));
  }, [assetQuery.data]);

  useEffect(() => {
    if (!dashboardInvoicesQuery.data) return;
    const invoiceKeyById = new Map(dashboardInvoicesQuery.data.map((invoice) => [invoice.id, invoice.invoiceKey]));
    setAssetRows((current) => current.map((asset) => ({ ...asset, invoiceKey: asset.purchaseInvoiceId ? invoiceKeyById.get(asset.purchaseInvoiceId) || null : null })));
  }, [dashboardInvoicesQuery.data]);

  useEffect(() => {
    const persistedAssets = new Map((assetQuery.data || []).filter((asset) => asset.status === "retired" || asset.status === "maintenance").map((asset) => [asset.assetCode, asset]));
    if (!persistedAssets.size) return;
    setAssetRows((current) => current.map((asset) => {
      const persistedAsset = persistedAssets.get(asset.code);
      if (!persistedAsset) return asset;
      if (persistedAsset.status === "maintenance") return { ...asset, holder: "Bảo hành/Sửa chữa", status: "Bảo hành/Sửa chữa", statusType: "maintenance" };
      return { ...asset, holder: "Khấu hao - Thanh lý", status: "Khấu hao/Thanh lý", statusType: "retired", retiredAt: persistedAsset.retiredAt ? dateInputValue(persistedAsset.retiredAt) : "", retirementReason: persistedAsset.retirementReason || "", retirementCertificateNumber: persistedAsset.retirementCertificateNumber || null, retirementCertificateYear: persistedAsset.retirementCertificateYear || null, retirementCertificateSequence: persistedAsset.retirementCertificateSequence || null, retirementAttachmentUrl: persistedAsset.retirementAttachmentUrl || null, retirementAttachmentName: persistedAsset.retirementAttachmentName || null, retirementAttachmentContentType: persistedAsset.retirementAttachmentContentType || null };
    }));
  }, [assetQuery.data]);

  useEffect(() => {
    if (!companyQuery.data) return;
    const next: CompanyInfo = { name: companyQuery.data.name, address: companyQuery.data.address || "", taxCode: companyQuery.data.taxCode || "", phone: companyQuery.data.phone || "", email: companyQuery.data.email || "", websiteUrl: companyQuery.data.websiteUrl || "", hideWebsiteOnInternalPdf: companyQuery.data.hideWebsiteOnInternalPdf ?? false, websiteTitle: companyQuery.data.websiteTitle || "AssetMaster – Hệ thống Quản lý Tài sản", logoUrl: companyQuery.data.logoUrl || "", brandColor: companyQuery.data.brandColor || "#0F8C8C", faviconUrl: companyQuery.data.faviconUrl || "", loginBackgroundUrl: companyQuery.data.loginBackgroundUrl || "", loginGreeting: companyQuery.data.loginGreeting || "", loginBackgroundOverlay: companyQuery.data.loginBackgroundOverlay === "dark" ? "dark" : "light" };
    setCompanyInfo(next);
    document.title = next.websiteTitle;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || Object.assign(document.createElement("link"), { rel: "icon", type: "image/png" });
    if (next.faviconUrl) {
      favicon.href = `${next.faviconUrl}${next.faviconUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(next.faviconUrl)}`;
      if (!favicon.parentNode) document.head.appendChild(favicon);
    }
    localStorage.setItem("assetmaster-company-info", JSON.stringify(next));
  }, [companyQuery.data]);

  useEffect(() => {
    document.title = companyInfo.websiteTitle;
    if (!companyInfo.faviconUrl) return;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || Object.assign(document.createElement("link"), { rel: "icon", type: "image/png" });
    favicon.href = `${companyInfo.faviconUrl}${companyInfo.faviconUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(companyInfo.faviconUrl)}`;
    if (!favicon.parentNode) document.head.appendChild(favicon);
  }, [companyInfo.websiteTitle, companyInfo.faviconUrl]);

  useEffect(() => {
    const searchableInputs = 'input[placeholder*="Tìm"], input[placeholder*="tìm"]';
    const updateInputValue = (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const attachClearButtons = () => {
      document.querySelectorAll<HTMLInputElement>(searchableInputs).forEach((input) => {
        if (input.dataset.clearSearchReady === "true") return;
        const container = input.parentElement;
        if (!container) return;
        input.dataset.clearSearchReady = "true";
        input.classList.add("pr-11");
        if (getComputedStyle(container).position === "static") container.classList.add("relative");
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.dataset.clearSearchButton = "true";
        clearButton.className = `absolute top-1/2 -translate-y-1/2 rounded-md p-1 text-[#8AA0B6] transition hover:bg-[#EDF4F6] hover:text-[#193B57] ${container.querySelector("kbd") ? "right-9" : "right-2"}`;
        clearButton.setAttribute("aria-label", "Xóa nội dung tìm kiếm");
        clearButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 6 12 12M18 6 6 18"/></svg>';
        const syncVisibility = () => clearButton.classList.toggle("hidden", !input.value);
        input.addEventListener("input", syncVisibility);
        clearButton.addEventListener("click", () => { updateInputValue(input, ""); input.focus(); syncVisibility(); });
        syncVisibility();
        container.appendChild(clearButton);
      });
    };
    attachClearButtons();
    const observer = new MutationObserver(attachClearButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handoverTooltipMap: Record<string, string> = {
      "Xem biên bản": getHandoverActionTooltip("document"),
      "Xuất biên bản": getHandoverActionTooltip("print"),
      "Xem lịch sử": getHandoverActionTooltip("history"),
    };
    const iconFallbackLabels: Record<string, string> = {
      x: "Đóng",
      "x-circle": "Đóng",
      "more-horizontal": "Mở menu tùy chọn",
      "refresh-cw": "Làm mới dữ liệu",
      "chevron-left": "Quay lại",
      "chevron-right": "Tiếp tục",
    };
    const compactTooltipLabel = (value: string) => {
      const normalized = value.replace(/\s+/g, " ").trim();
      if (normalized.length <= 48) return normalized;
      const breakAt = normalized.lastIndexOf(" ", 45);
      const end = breakAt > 24 ? breakAt : 45;
      return `${normalized.slice(0, end).trimEnd()}…`;
    };
    const decorateActionTooltips = () => {
      document.querySelectorAll<HTMLElement>("button, a, span[title], div[title], td[title], dd[title]").forEach((element) => {
        const isAction = element.matches("button, a");
        if (element.dataset.suppressIconTooltip === "true") {
          element.classList.remove("icon-action-tooltip");
          element.removeAttribute("data-tooltip");
          return;
        }
        const sourceLabel = element.getAttribute("aria-label")?.trim();
        if (sourceLabel === "Mở menu người dùng") {
          element.classList.remove("icon-action-tooltip");
          element.removeAttribute("data-tooltip");
          element.removeAttribute("title");
          return;
        }
        const iconName = element.querySelector("svg")?.getAttribute("data-lucide") || "";
        const visibleText = element.textContent?.trim() || "";
        const nativeTitle = element.getAttribute("title")?.trim();
        const fallbackLabel = isAction && !sourceLabel && !visibleText ? iconFallbackLabels[iconName] : undefined;
        const cancelLabel = isAction && !sourceLabel && /^(Hủy|Quay lại|Đóng)$/.test(visibleText) ? (visibleText === "Hủy" ? "Hủy thao tác" : visibleText) : undefined;
        const label = compactTooltipLabel(nativeTitle || (sourceLabel ? handoverTooltipMap[sourceLabel] || sourceLabel : fallbackLabel || cancelLabel || ""));
        if (!label) return;
        if (isAction && !sourceLabel) element.setAttribute("aria-label", label);
        element.dataset.tooltip = label;
        element.removeAttribute("title");
        if (isAction) element.classList.add("icon-action-tooltip");
      });
    };
    decorateActionTooltips();
    const observer = new MutationObserver(decorateActionTooltips);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  const filteredAssets = useMemo(() => assetRows.filter((asset) => {
    const matchesQuery = matchesVietnameseSearch(`${asset.code} ${asset.name} ${asset.holder} ${asset.invoiceKey || ""}`, query);
    const matchesCategory = category === "Tất cả loại tài sản" || asset.category === category;
    const normalizedStatus = status === "Bảo trì" ? "Bảo hành/Sửa chữa" : status;
    const matchesStatus = normalizedStatus === "Tất cả trạng thái" || asset.status === normalizedStatus || (normalizedStatus === "Bảo hành/Sửa chữa" && asset.statusType === "maintenance");
    const matchesDepartment = department === "Tất cả phòng ban" || asset.holder.includes(department);
    const matchesVendor = vendorFilter === "Tất cả nhà cung cấp" || asset.supplier === vendorFilter;
    const matchesBrand = brandFilter === "Tất cả hãng" || asset.brand === brandFilter;
    const warrantyState = getWarrantyState(asset.warrantyUntil);
    const matchesWarranty = warrantyFilter === "Tất cả bảo hành" || (warrantyFilter === "Đang bảo hành" && warrantyState === "active") || (warrantyFilter === "Sắp hết hạn" && warrantyState === "expiring") || (warrantyFilter === "Đã hết hạn" && warrantyState === "expired");
    const selectedBranchId = branchesQuery.data?.find((branch) => branch.name === branchFilter)?.id;
    const matchesBranch = branchFilter === "Tất cả chi nhánh" || (selectedBranchId !== undefined && asset.branchId === selectedBranchId);
    const matchesInvoice = invoiceFilter === "Tất cả Hóa đơn" || matchesVietnameseSearch(asset.invoiceKey || "", invoiceFilter);
    return matchesQuery && matchesCategory && matchesStatus && matchesDepartment && matchesVendor && matchesBrand && matchesWarranty && matchesBranch && matchesInvoice;
  }), [assetRows, query, category, status, department, vendorFilter, brandFilter, warrantyFilter, branchFilter, invoiceFilter, branchesQuery.data]);
  const invoiceFilterOptions = useMemo(() => ["Tất cả Hóa đơn", ...Array.from(new Set(assetRows.map((asset) => asset.invoiceKey?.trim()).filter((invoiceKey): invoiceKey is string => Boolean(invoiceKey)))).sort((left, right) => left.localeCompare(right, "vi"))], [assetRows]);
  const assetStatusFilterCounts = useMemo(() => getAssetStatusFilterCounts(assetRows), [assetRows]);
  const branchFilterCounts = useMemo(() => {
    const counts: Record<string, number> = { "Tất cả chi nhánh": assetRows.length };
    (branchesQuery.data || []).forEach((branch) => { counts[branch.name] = assetRows.filter((asset) => asset.branchId === branch.id).length; });
    return counts;
  }, [assetRows, branchesQuery.data]);
  const inventoryAssetRows = useMemo(() => assetRows.filter((asset) => asset.statusType !== "returned" && asset.statusType !== "retired"), [assetRows]);
  const branchAssetValueSummary = useMemo(() => {
    const branchesById = new Map((branchesQuery.data || []).map((branch) => [branch.id, branch]));
    const summary = new Map<string, { name: string; code: string; count: number; value: number }>();
    inventoryAssetRows.forEach((asset) => {
      const branch = asset.branchId ? branchesById.get(asset.branchId) : undefined;
      const key = branch ? String(branch.id) : "unassigned";
      const current = summary.get(key) || { name: branch?.name || "Chưa gán Chi nhánh", code: branch?.code || "CHƯA GÁN", count: 0, value: 0 };
      current.count += 1;
      current.value += Number(asset.value || 0);
      summary.set(key, current);
    });
    return Array.from(summary.values()).sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "vi"));
  }, [inventoryAssetRows, branchesQuery.data]);
  const assetValueTotal = inventoryAssetRows.reduce((total, asset) => total + Number(asset.value || 0), 0);
  const totalRetirementValue = useMemo(() => (retirementCertificatesQuery.data || []).filter((certificate) => certificate.status !== "draft").reduce((total, certificate) => total + certificate.items.reduce((itemTotal, item) => itemTotal + Number(item.salvageValue || 0), 0), 0), [retirementCertificatesQuery.data]);
  const profileName = user?.name || "Người dùng";
  const profileRole = user?.role === "admin" ? "Quản trị viên" : "Nhân viên";
  const profileInitials = profileName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "AM";
  useEffect(() => { notificationsOpenRef.current = notificationsOpen; }, [notificationsOpen]);
  const closeNotifications = () => {
    if (!notificationsOpenRef.current || notificationCloseTimerRef.current) return;
    setNotificationsClosing(true);
    notificationCloseTimerRef.current = window.setTimeout(() => { setNotificationsOpen(false); setNotificationSettingsOpen(false); setNotificationsClosing(false); notificationCloseTimerRef.current = null; }, 170);
  };
  useEffect(() => {
    const closeOutsidePopups = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!sidebarProfileRef.current?.contains(target)) setProfileOpen(false);
      if (!notificationsRef.current?.contains(target)) closeNotifications();
      if (!headerProfileRef.current?.contains(target)) setHeaderProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeOutsidePopups);
    return () => document.removeEventListener("pointerdown", closeOutsidePopups);
  }, []);
  const requestLogout = () => {
    setProfileOpen(false);
    setHeaderProfileOpen(false);
    toast.warning("Xác nhận đăng xuất", { description: "Nhấn Đăng xuất để kết thúc phiên làm việc hiện tại.", action: { label: "Đăng xuất", onClick: async () => { await logout(); toast.success("Đã đăng xuất khỏi AssetMaster."); } } });
  };
  const notificationPreferences: NotificationPreferences = notificationPreferencesQuery.data || defaultNotificationPreferences;
  const headerNotifications = useMemo<HeaderNotification[]>(() => {
    const maintenanceNotifications = notificationPreferences.maintenanceEnabled ? assetRows.filter((asset) => asset.statusType === "maintenance").slice(0, 2).map((asset) => ({
      id: `maintenance-${asset.code}`,
      title: `${asset.code} đang Bảo hành/Sửa chữa`,
      description: asset.maintenanceReason?.trim() || `Theo dõi tiến độ xử lý cho ${asset.name}.`,
      createdAt: assetQuery.data?.find((item) => item.assetCode === asset.code)?.updatedAt || new Date(),
      kind: "maintenance" as const,
      target: { type: "asset" as const, assetCode: asset.code },
    })) : [];
    const warrantyExpiryNotifications = notificationPreferences.maintenanceEnabled ? assetRows.filter((asset) => getWarrantyState(asset.warrantyUntil) === "expiring").slice(0, 3).map((asset) => {
      const warrantyUntil = normalizePurchaseDate(asset.warrantyUntil);
      const remainingDays = warrantyUntil === null ? 0 : Math.max(0, Math.ceil((warrantyUntil - Date.now()) / 86_400_000));
      return {
        id: `warranty-expiry-${asset.code}-${warrantyUntil || "unknown"}`,
        title: `${asset.code} sắp hết hạn bảo hành`,
        description: `${asset.name} còn ${remainingDays} ngày bảo hành (đến ${warrantyUntil ? new Date(warrantyUntil).toLocaleDateString("vi-VN") : "chưa xác định"}).`,
        createdAt: assetQuery.data?.find((item) => item.assetCode === asset.code)?.updatedAt || new Date(),
        kind: "maintenance" as const,
        target: { type: "asset" as const, assetCode: asset.code },
      };
    }) : [];
    const handoverNotifications = notificationPreferences.handoverEnabled ? (notificationHandoversQuery.data || []).filter((handover) => handover.status !== "returned" && handover.status !== "cancelled" && handover.returnRequestStatus !== "pending").slice(0, 3).map((handover) => {
      const asset = assetQuery.data?.find((item) => item.id === handover.assetId);
      const statusLabel = handover.status === "active" ? "đã bàn giao" : handover.status === "pending_signature" ? "chờ ký xác nhận" : "đang ở trạng thái nháp";
      return {
        id: `handover-${handover.id}`,
        title: `Phiếu ${handover.referenceCode} ${statusLabel}`,
        description: `${asset?.assetCode || `Tài sản #${handover.assetId}`} · ${asset?.name || "Tài sản"} — ${handover.recipientName}.`,
        createdAt: handover.updatedAt,
        kind: "assignment" as const,
        target: { type: "handover" as const, handoverId: handover.id },
      };
    }) : [];
    const returnRequestNotifications = notificationPreferences.returnRequestEnabled ? (notificationHandoversQuery.data || []).filter((handover) => handover.returnRequestStatus === "pending").map((handover) => {
      const asset = assetQuery.data?.find((item) => item.id === handover.assetId);
      return {
        id: `return-request-${handover.id}-${handover.returnRequestedAt?.getTime() || "pending"}`,
        title: `Yêu cầu hoàn trả đang chờ duyệt`,
        description: `${handover.recipientName} yêu cầu hoàn trả ${asset?.assetCode || `tài sản #${handover.assetId}`}${handover.returnRequestNote ? `: ${handover.returnRequestNote}` : "."}`,
        createdAt: handover.returnRequestedAt || handover.updatedAt,
        kind: "return" as const,
        target: { type: "handover" as const, handoverId: handover.id },
      };
    }) : [];
    const maintenanceRequestNotifications = notificationPreferences.maintenanceEnabled ? (maintenanceTicketsQuery.data || []).filter((ticket) => ticket.status === "open").slice(0, 3).map((ticket) => {
      const asset = assetQuery.data?.find((item) => item.id === ticket.assetId);
      return {
        id: `maintenance-ticket-${ticket.id}`,
        title: `${ticket.ticketCode} cần xử lý`,
        description: `${asset?.assetCode || `Tài sản #${ticket.assetId}`} · ${ticket.description}`,
        createdAt: ticket.openedAt,
        kind: "maintenance" as const,
        target: { type: "asset" as const, assetCode: asset?.assetCode || "" },
      };
    }) : [];
    return [...warrantyExpiryNotifications, ...returnRequestNotifications, ...maintenanceRequestNotifications, ...maintenanceNotifications, ...handoverNotifications].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [assetQuery.data, assetRows, maintenanceTicketsQuery.data, notificationHandoversQuery.data, notificationPreferences]);
  const unreadNotifications = headerNotifications.filter((notification) => !readNotificationIds.includes(notification.id));
  const hasUnreadNotifications = unreadNotifications.length > 0;
  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((previous) => {
      if (previous.includes(notificationId)) return previous;
      const next = [...previous, notificationId];
      localStorage.setItem("assetmaster-read-notification-ids", JSON.stringify(next));
      return next;
    });
  };
  const markAllNotificationsRead = () => {
    const next = Array.from(new Set([...readNotificationIds, ...headerNotifications.map((notification) => notification.id)]));
    setReadNotificationIds(next);
    localStorage.setItem("assetmaster-read-notification-ids", JSON.stringify(next));
    toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
  };
  const updateNotificationPreference = (key: keyof NotificationPreferences) => {
    saveNotificationPreferencesMutation.mutate({ ...notificationPreferences, [key]: !notificationPreferences[key] });
  };
  const formatNotificationTime = (value: Date) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value);
  const openNotificationTarget = (notification: HeaderNotification) => {
    markNotificationRead(notification.id);
    closeNotifications();
    const target = notification.target;
    if (target.type === "asset") {
      const asset = assetRows.find((item) => item.code === target.assetCode);
      if (!asset) {
        toast.error("Không tìm thấy tài sản liên quan đến thông báo này.");
        return;
      }
      navigateTo("Danh mục tài sản");
      openDetailModal(asset);
      return;
    }
    sessionStorage.setItem("assetmaster-open-handover-id", String(target.handoverId));
    navigateTo("Bàn giao & Cấp phát");
  };
  const maintenanceAssetCount = inventoryAssetRows.filter((asset) => asset.statusType === "maintenance").length;
  const dashboardKpis = [
    { label: "Tổng tài sản", value: String(inventoryAssetRows.length), detail: "Tài sản còn thuộc công ty", icon: Box, tone: "teal" },
    { label: "Đang sử dụng", value: String(inventoryAssetRows.filter((asset) => asset.statusType === "active").length), detail: "Tài sản đã cấp phát", icon: UsersRound, tone: "blue" },
    { label: "Bảo hành/Sửa chữa", value: String(maintenanceAssetCount), alertValue: maintenanceAssetCount > 0, subDetail: `Tổng chi phí: ${formatVnd(totalMaintenanceServiceCost)} VNĐ`, icon: Wrench, tone: "amber" },
    { label: "Tổng giá trị", value: `${formatVnd(assetValueTotal)} VNĐ`, detail: "Giá trị nguyên giá", compactValue: true, icon: Tags, tone: "navy" },
    { label: "Giá trị thanh lý", value: `${formatVnd(totalRetirementValue)} VNĐ`, detail: "Giá trị thu hồi đã ghi nhận", icon: Landmark, tone: "blue" },
  ];
  const lowStockSupplies = useMemo(() => (suppliesQuery.data || []).filter((supply) => Number(supply.stockQuantity) <= Number(supply.minimumQuantity)).sort((left, right) => (Number(left.stockQuantity) - Number(left.minimumQuantity)) - (Number(right.stockQuantity) - Number(right.minimumQuantity))), [suppliesQuery.data]);
  const lowStockSupplyPreview = lowStockSupplies.slice(0, 5);
  const formatSupplyQuantity = (value: string | number | null | undefined) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  const dashboardLastSyncedAt = assetQuery.dataUpdatedAt ? new Date(assetQuery.dataUpdatedAt) : null;
  const dashboardSyncLabel = dashboardLastSyncedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(dashboardLastSyncedAt) : "Đang tải dữ liệu...";
  const refreshDashboardData = async () => {
    const refreshToast = toast.loading("Đang đồng bộ dữ liệu dashboard...");
    try {
      await Promise.all([assetQuery.refetch(), maintenanceTicketsQuery.refetch(), retirementCertificatesQuery.refetch(), suppliesQuery.refetch()]);
      toast.success("Dữ liệu dashboard đã được đồng bộ.", { id: refreshToast });
    } catch {
      toast.error("Không thể đồng bộ dữ liệu dashboard. Vui lòng thử lại.", { id: refreshToast });
    }
  };

  const openCreateModal = () => { setFormData({ code: "", name: "", category: "", holder: "", status: "Sẵn có", statusType: "available", date: new Date().toISOString().slice(0, 10), value: "", location: "", serial: "", maintenanceReason: "", supplier: "", warrantyUntil: "", supplierReturnedAt: "", supplierReturnReason: "", retiredAt: "", retirementReason: "", note: "", branchId: undefined }); setSelectedAsset(null); setAssetModal("create"); };
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("previewAssetCreate") !== "1") return;
    openCreateModal();
    url.searchParams.delete("previewAssetCreate");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("previewAssetDetail") !== "1" || !assetRows.length) return;
    const nonEmployeeHolders = ["Chưa bàn giao", "Bảo hành/Sửa chữa", "Đã trả NCC", "Khấu hao - Thanh lý"];
    const previewAsset = assetRows.find((item) => Boolean(item.holder) && !nonEmployeeHolders.includes(item.holder) && item.statusType !== "returned" && item.statusType !== "retired") || assetRows[0];
    openDetailModal(previewAsset);
    url.searchParams.delete("previewAssetDetail");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [assetRows]);
  const openEditModal = (asset: Asset) => { if (asset.statusType === "retired" || asset.statusType === "returned") { toast.error("Tài sản đã Trả nhà cung cấp hoặc Khấu hao/Thanh lý đã được khóa và không thể chỉnh sửa."); return; } setSelectedAsset(asset); setFormData({ ...asset, date: dateInputValue(asset.purchaseDate || asset.date) }); setAssetModal("edit"); };
  const openDetailModal = (asset: Asset, invoiceId: number | null = null) => { setSelectedAsset(asset); setReturnInvoiceId(invoiceId); setAssetModal("detail"); };
  useEffect(() => {
    const url = new URL(window.location.href);
    const assetCode = url.searchParams.get("openAsset");
    if (!assetCode || !assetRows.length) return;
    const invoiceId = Number(url.searchParams.get("returnInvoice"));
    const target = assetRows.find((asset) => asset.code === assetCode);
    if (target) openDetailModal(target, Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null);
    else toast.error("Không tìm thấy tài sản cần mở.");
    url.searchParams.delete("openAsset");
    url.searchParams.delete("returnInvoice");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [assetRows]);
  const saveAsset = (attachments?: AssetSaveAttachments) => {
    if (!formData.name.trim() || !formData.value.trim()) { toast.error("Vui lòng nhập tên tài sản và giá trị."); return; }
    if (!formData.categoryId || !formData.code) { toast.error("Vui lòng chọn Phân loại để hệ thống tạo mã tài sản."); return; }
    if (formData.statusType === "maintenance" && !formData.maintenanceReason?.trim()) { toast.error("Vui lòng nhập lý do bảo trì trước khi lưu."); return; }
    if (formData.statusType === "retired" && (!formData.retiredAt || !formData.retirementReason?.trim())) { toast.error("Vui lòng nhập ngày và lý do thanh lý trước khi lưu."); return; }
    const payload = {
      assetCode: formData.code,
      name: formData.name,
      branchId: formData.branchId ?? null,
      holderName: formData.statusType === "active" ? formData.holder || null : formData.statusType === "retired" ? "Khấu hao - Thanh lý" : null,
      status: formData.statusType === "active" ? "assigned" as const : formData.statusType === "maintenance" ? "maintenance" as const : formData.statusType === "returned" ? "returned_to_vendor" as const : formData.statusType === "retired" ? "retired" as const : "available" as const,
      condition: "good" as const,
      purchaseValue: formData.value.replace(/[^0-9.]/g, "") || "0",
      purchaseContractId: formData.purchaseContractId ?? null,
      purchaseInvoiceId: formData.purchaseInvoiceId ?? null,
      purchaseInvoiceLineId: formData.purchaseInvoiceLineId ?? null,
      vendor: formData.supplier || null,
      vendorId: formData.vendorId || null,
      brandId: formData.brandId || null,
      serialNumber: formData.serial || null,
      location: formData.location || null,
      note: formData.note || null,
      maintenanceReason: formData.statusType === "maintenance" ? (formData.maintenanceReason || "").trim() : null,
      purchaseDate: normalizePurchaseDate(formData.date),
      warrantyUntil: normalizePurchaseDate(formData.warrantyUntil),
      supplierReturnedAt: normalizePurchaseDate(formData.supplierReturnedAt),
      supplierReturnReason: formData.statusType === "returned" ? (formData.supplierReturnReason || "").trim() || null : formData.supplierReturnReason || null,
      retiredAt: normalizePurchaseDate(formData.retiredAt),
      retirementReason: formData.statusType === "retired" ? (formData.retirementReason || "").trim() || null : formData.retirementReason || null,
      categoryId: formData.categoryId,
      departmentId: null,
    };
    if (assetModal === "edit") {
      const target = assetQuery.data?.find((asset) => asset.assetCode === formData.code);
      if (!target) { toast.error("Không tìm thấy tài sản để cập nhật."); return; }
      if (target.status === "retired" || target.status === "returned_to_vendor") { toast.error("Tài sản đã Trả nhà cung cấp hoặc Khấu hao/Thanh lý đã được khóa và không thể chỉnh sửa."); return; }
      pendingSupplierReturnAttachmentRef.current = attachments?.supplierReturn || null;
      pendingRetirementAttachmentRef.current = attachments?.retirement || null;
      updateAssetMutation.mutate({ id: target.id, ...payload });
    } else {
      pendingRetirementAttachmentRef.current = attachments?.retirement || null;
      createAssetMutation.mutate(payload);
    }
  };
  const showComingSoon = (label: string) => toast.info(`${label} sẽ được mở trong phiên bản tiếp theo.`, { description: "Bản xem trước hiện đang dùng dữ liệu mẫu để minh họa giao diện." });
  const navigateTo = (label: string) => {
    const viewByNav: Record<string, string> = { "Danh mục tài sản": "assets", "Phân loại tài sản": "categories", "Bàn giao & Cấp phát": "handovers", "Bảo hành & Sửa chữa": "maintenance", "Kiểm kê": "audit", "Khấu hao & Thanh lý": "retirement", "Báo Cáo": "reports", "Quản lý nhân viên": "employees", "Phòng Ban & Bộ Phận": "organization", "Nhà cung cấp & Hãng": "vendors", "Hợp đồng & Hóa đơn": "contracts", "Cài đặt": "settings", "Trợ giúp & hướng dẫn": "help" };
    const url = new URL(window.location.href);
    const view = viewByNav[label];
    url.searchParams.delete("vendorId");
    url.searchParams.delete("create");
    url.searchParams.delete("contractId");
    if (view) url.searchParams.set("view", view); else url.searchParams.delete("view");
    window.history.replaceState({}, "", url);
    setActiveNav(label);
    setMobileNavOpen(false);
  };
  const openAuditSessionFromReminder = (sessionId: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "audit");
    url.searchParams.set("auditSession", String(sessionId));
    window.history.pushState({}, "", url);
    setActiveNav("Kiểm kê");
    setMobileNavOpen(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };
  useEffect(() => {
    const handleOpenAuditSession = (event: Event) => {
      const sessionId = Number((event as CustomEvent<{ sessionId?: unknown }>).detail?.sessionId);
      if (Number.isInteger(sessionId) && sessionId > 0) openAuditSessionFromReminder(sessionId);
    };
    window.addEventListener("assetmaster:open-audit-session", handleOpenAuditSession);
    return () => window.removeEventListener("assetmaster:open-audit-session", handleOpenAuditSession);
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#F4F7FB] px-6"><div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0F8C8C] text-white shadow-[0_10px_22px_rgba(15,140,140,.24)]"><Box size={22} /></div><div className="mt-4 text-sm font-extrabold text-[#193B57]">Đang kiểm tra phiên đăng nhập...</div></div></div>;
  if (!isAuthenticated) return <LoginGateway onLogin={startLogin} />;
  if (!isAdmin && user) return <UserDashboard user={user} onLogout={logout} companyInfo={companyInfo} />;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102A43] antialiased">
      <FloatingActionTooltip />
      <ExportPreviewHost />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-hidden border-r border-[#DDE7F0] bg-[#102A43] px-4 py-5 shadow-[8px_0_30px_rgba(16,42,67,0.16)] transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center gap-3 px-3 pb-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center">
            <img src={companyInfo.logoUrl || "/manus-storage/assetmaster-logo_f5d79b06.png"} alt="Logo công ty" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <div title={companyInfo.websiteTitle} className="max-w-[158px] truncate font-display text-[16px] font-extrabold tracking-[-0.04em] text-white">{companyInfo.websiteTitle}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A5C3D2]">{companyInfo.name}</div>
          </div>
          <button className="ml-auto rounded-lg p-1 text-[#8AA0B6] hover:bg-[#F0F5F8] lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu"><X size={18} /></button>
        </div>

        <div className="mb-3 shrink-0 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7FA0B8]">Workspace</div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1" aria-label="Điều hướng chính">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;
            return <button key={item.label} onClick={() => navigateTo(item.label)} className={`group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-150 ${active ? "bg-[#E8F7F5] text-[#087A6A] shadow-[inset_3px_0_0_#0F8C8C]" : "text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.9} /><span className="flex-1">{item.label}</span>{item.maintenanceAssetCount > 0 && <span title={`${item.maintenanceAssetCount} tài sản đang bảo trì`} className="rounded-full bg-[#FFF0C9] px-1.5 py-0.5 text-[10px] font-bold text-[#A86B00]">{item.maintenanceAssetCount}</span>}{item.maintenanceRequestCount > 0 && <span title={`${item.maintenanceRequestCount} yêu cầu bảo trì mới · ưu tiên ${newMaintenanceRequestBadge.priority === "critical" ? "khẩn cấp" : newMaintenanceRequestBadge.priority === "high" ? "cao" : newMaintenanceRequestBadge.priority === "medium" ? "trung bình" : "thấp"}`} aria-label={`${item.maintenanceRequestCount} yêu cầu bảo trì mới`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${maintenanceRequestBadgeTone}`}>{item.maintenanceRequestCount}</span>}</button>;
          })}
        </nav>

        <div className="mt-3 shrink-0 space-y-1 border-t border-[#2A4D67] pt-3">
          <button onClick={() => navigateTo("Trợ giúp & hướng dẫn")} className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold transition ${activeNav === "Trợ giúp & hướng dẫn" ? "bg-[#E8F7F5] text-[#087A6A]" : "text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"}`}><CircleHelp size={17} />Trợ giúp & hướng dẫn</button>
          <button onClick={() => navigateTo("Cài đặt")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"><Settings2 size={17} />Cài đặt hệ thống</button>
          <div ref={sidebarProfileRef} className="relative mt-3">
            {profileOpen && <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-full overflow-hidden rounded-xl border border-[#31566F] bg-[#102A43] shadow-[0_18px_40px_rgba(4,20,35,0.38)]"><div className="border-b border-[#2A4D67] px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#7FA0B8]">Tài khoản đang đăng nhập</div><div className="mt-2 truncate text-xs font-bold text-white">{profileName}</div><div className="mt-1 truncate text-[11px] text-[#B5C8D5]">{user?.email || "Chưa có email"}</div><div className="mt-2 inline-flex rounded-full bg-[#1D4A67] px-2 py-1 text-[10px] font-bold text-[#BDF1E8]">{profileRole}</div></div><button onClick={requestLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-[#FFD3D3] transition hover:bg-[#3A2430] hover:text-white"><LogOut size={15} />Đăng xuất</button></div>}
            <button onClick={() => setProfileOpen((current) => !current)} className="flex w-full items-center gap-3 rounded-xl bg-[#173A56] p-3 text-left transition hover:bg-[#1D4664]" aria-expanded={profileOpen} aria-haspopup="menu">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#DCEFEF] text-[11px] font-extrabold text-[#087A6A]">{profileInitials}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">{profileName}</div><div className="truncate text-[10px] text-[#9BB8C8]">{profileRole}</div></div><MoreHorizontal size={17} className={`text-[#9BAEC0] transition ${profileOpen ? "text-white" : ""}`} />
            </button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-[#102A43]/20 backdrop-blur-[2px] lg:hidden" />}

      <main className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-[#DDE7F0] bg-[#FFFFFF]/95 px-4 shadow-[0_5px_20px_rgba(16,42,67,0.03)] backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-2 text-[#527089] hover:bg-[#F0F5F8] lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
            <div className="hidden items-center gap-2 text-sm text-[#8AA0B6] sm:flex"><span>Workspace</span><span className="text-[#C2D0DC]">/</span><span className="font-semibold text-[#193B57]">{activeNav}</span></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setQrLookupOpen(true)} className="hidden h-9 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] sm:flex"><QrCode size={16} />Quét mã QR</button>
            <button onClick={openCreateModal} className="hidden h-9 items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] sm:flex"><Plus size={16} />Thêm tài sản mới</button>
            <div ref={notificationsRef} className="relative z-[120]">
              <button data-suppress-icon-tooltip="true" onClick={() => { if (notificationsOpen) closeNotifications(); else { setNotificationsClosing(false); setNotificationsOpen(true); } setHeaderProfileOpen(false); }} className={`notification-bell relative rounded-lg p-2 text-[#60758A] hover:bg-[#F0F5F8] ${hasUnreadNotifications ? "notification-bell--unread" : ""}`} aria-label="Thông báo" aria-expanded={notificationsOpen}>
                <Bell size={19} />
                {hasUnreadNotifications && <span aria-label={`${unreadNotifications.length} thông báo chưa đọc`} className="notification-pulse absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-[#F0A516] px-1 text-[9px] font-extrabold leading-none text-[#102A43] ring-2 ring-white">{unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}</span>}
              </button>
              {notificationsOpen && <div className={`absolute right-0 top-[calc(100%+10px)] z-[130] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#DDE7F0] bg-white shadow-[0_18px_42px_rgba(16,42,67,0.18)] ${notificationsClosing ? "popup-surface--closing" : ""}`}>
                <div className="flex items-center justify-between gap-3 border-b border-[#E7EEF3] px-4 py-3"><div><div className="text-xs font-extrabold text-[#193B57]">Thông báo</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{hasUnreadNotifications ? `${unreadNotifications.length} thông báo chưa đọc` : "Tất cả đã được đọc"}</div></div><div className="flex items-center gap-1"><button aria-label="Tùy chọn thông báo" onClick={() => setNotificationSettingsOpen((current) => !current)} className={`grid h-7 w-7 place-items-center rounded-md text-[#527089] transition hover:bg-[#EEF5F8] hover:text-[#193B57] ${notificationSettingsOpen ? "bg-[#EAF3FF] text-[#2666A8]" : ""}`}><Settings2 size={15} /></button><button aria-label="Đánh dấu tất cả đã đọc" disabled={!hasUnreadNotifications} onClick={markAllNotificationsRead} className="grid h-7 w-7 place-items-center rounded-md text-[#087A6A] transition hover:bg-[#E6F6F2] disabled:text-[#9BAEC0]"><CheckCheck size={16} /></button></div></div>
                {notificationSettingsOpen && <div className="border-b border-[#E7EEF3] bg-[#F8FBFC] px-4 py-3"><div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#527089]">Loại thông báo nhận</div><div className="mt-2 space-y-1">{([{ key: "returnRequestEnabled", label: "Yêu cầu hoàn trả" }, { key: "maintenanceEnabled", label: "Bảo trì" }, { key: "handoverEnabled", label: "Bàn giao" }] as Array<{ key: keyof NotificationPreferences; label: string }>).map((option) => <button key={option.key} type="button" role="switch" aria-checked={notificationPreferences[option.key]} disabled={saveNotificationPreferencesMutation.isPending} onClick={() => updateNotificationPreference(option.key)} className="flex w-full items-center justify-between rounded-md px-1 py-1.5 text-left text-[11px] font-semibold text-[#527089] hover:bg-white disabled:cursor-not-allowed"><span>{option.label}</span><span className={`relative h-4 w-7 rounded-full transition ${notificationPreferences[option.key] ? "bg-[#0F8C8C]" : "bg-[#C9D5DF]"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${notificationPreferences[option.key] ? "translate-x-3.5" : "translate-x-0.5"}`} /></span></button>)}</div></div>}
                <div className="max-h-[360px] overflow-y-auto p-2">
                  {headerNotifications.length > 0 ? headerNotifications.map((notification) => {
                    const isRead = readNotificationIds.includes(notification.id);
                    const Icon = notification.kind === "maintenance" ? Wrench : notification.kind === "return" ? Undo2 : PackageCheck;
                    const targetLabel = getNotificationTargetLabel(notification.target);
                    return <div key={notification.id} className={`flex gap-3 rounded-lg p-3 transition ${isRead ? "bg-white" : "bg-[#F2FAF8]"}`}><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${notification.kind === "maintenance" ? "bg-[#FFF5DC] text-[#A86B00]" : notification.kind === "return" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#E6F6F2] text-[#087A6A]"}`}><Icon size={15} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className={`text-xs ${isRead ? "font-semibold text-[#527089]" : "font-extrabold text-[#193B57]"}`}>{notification.title}</div>{!isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F8C8C]" aria-label="Chưa đọc" />}</div><p className="mt-1 text-[11px] leading-5 text-[#71869A]">{notification.description}</p><div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-[#8AA0B6]"><Clock3 size={11} />{formatNotificationTime(notification.createdAt)}</div><div className="mt-2 flex items-center gap-2 whitespace-nowrap"><button aria-label={targetLabel} onClick={() => openNotificationTarget(notification)} className="inline-flex items-center gap-1 text-[9px] font-bold leading-none text-[#2666A8] hover:text-[#1E5084]">{targetLabel}<span aria-hidden="true">→</span></button>{!isRead && <button aria-label="Đánh dấu đã đọc" onClick={() => markNotificationRead(notification.id)} className="inline-flex items-center gap-1 text-[9px] font-bold leading-none text-[#087A6A] hover:text-[#066254]"><Check size={12} aria-hidden="true" />Đã đọc</button>}</div></div></div>;
                  }) : <div className="p-4 text-center"><div className="text-xs font-bold text-[#193B57]">Chưa có thông báo mới</div><p className="mt-1 text-[11px] leading-5 text-[#71869A]">Các cập nhật bàn giao và bảo trì sẽ xuất hiện tại đây.</p></div>}
                </div>
              </div>}
            </div>
            <div ref={headerProfileRef} className="relative"><button onClick={() => { setHeaderProfileOpen((current) => !current); closeNotifications(); }} aria-label="Mở menu người dùng" aria-expanded={headerProfileOpen} className="grid h-8 w-8 place-items-center rounded-full bg-[#CFE7E4] text-[11px] font-extrabold text-[#087A6A] hover:ring-2 hover:ring-[#8BCDC6]">{profileInitials}</button>{headerProfileOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[250px] overflow-hidden rounded-xl border border-[#DDE7F0] bg-white shadow-[0_18px_42px_rgba(16,42,67,0.18)]"><div className="border-b border-[#E7EEF3] px-4 py-3"><div className="text-xs font-extrabold text-[#193B57]">{profileName}</div><div className="mt-1 truncate text-[10px] text-[#71869A]">{user?.email || "Chưa có email"}</div><div className="mt-2 inline-flex rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-bold text-[#087A6A]">{profileRole}</div></div><button onClick={() => { setHeaderProfileOpen(false); navigateTo("Cài đặt"); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-[#527089] hover:bg-[#F7FAFC]"><UserRound size={15} />Hồ sơ & cài đặt</button><button onClick={requestLogout} className="flex w-full items-center gap-2 border-t border-[#E7EEF3] px-4 py-3 text-left text-xs font-bold text-[#B44545] hover:bg-[#FFF5F5]"><LogOut size={15} />Đăng xuất</button></div>}</div>
          </div>
        </header>

        {activeNav === "Bàn giao & Cấp phát" ? <AssignmentsPage showComingSoon={showComingSoon} companyInfo={companyInfo} /> : null}
        {activeNav === "Phân loại tài sản" ? <AssetCategoryManagementPage /> : null}
        {activeNav === "Phụ kiện" ? <SuppliesInventoryView canEditSectionLabels={isAdmin} /> : null}
        {activeNav === "Cài đặt" ? <><MenuOrderSettings items={sidebarNavItems.map((item) => ({ label: item.label }))} onMove={moveSidebarMenu} onReorder={reorderSidebarMenu} onReset={() => saveSidebarMenuOrder(defaultSidebarMenuOrder)} isSaving={saveMenuPreferences.isPending} /><CompanyBrandSettings companyInfo={companyInfo} onSave={(next) => { setCompanyInfo(next); localStorage.setItem("assetmaster-company-info", JSON.stringify(next)); document.title = next.websiteTitle; saveCompanyMutation.mutate({ name: next.name, address: next.address || null, taxCode: next.taxCode || null, phone: next.phone || null, email: next.email || null, websiteUrl: next.websiteUrl || null, hideWebsiteOnInternalPdf: next.hideWebsiteOnInternalPdf, logoUrl: next.logoUrl || null, websiteTitle: next.websiteTitle || null, brandColor: next.brandColor || "#0F8C8C", faviconUrl: next.faviconUrl || null, loginBackgroundUrl: next.loginBackgroundUrl || null, loginGreeting: next.loginGreeting || null, loginBackgroundOverlay: next.loginBackgroundOverlay }, { onSuccess: () => { void companyQuery.refetch(); toast.success("Đã lưu cài đặt thương hiệu."); }, onError: (error) => toast.error(error.message || "Không thể lưu cài đặt thương hiệu.") }); }} /><BrandEnhancementsPanel info={companyInfo} onSave={(next) => { setCompanyInfo(next); localStorage.setItem("assetmaster-company-info", JSON.stringify(next)); document.documentElement.style.setProperty("--assetmaster-brand", next.brandColor); const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || Object.assign(document.createElement("link"), { rel: "icon" }); if (next.faviconUrl) { favicon.href = next.faviconUrl; if (!favicon.parentNode) document.head.appendChild(favicon); } saveCompanyMutation.mutate({ name: next.name, address: next.address || null, taxCode: next.taxCode || null, phone: next.phone || null, email: next.email || null, websiteUrl: next.websiteUrl || null, hideWebsiteOnInternalPdf: next.hideWebsiteOnInternalPdf, logoUrl: next.logoUrl || null, websiteTitle: next.websiteTitle || null, brandColor: next.brandColor || "#0F8C8C", faviconUrl: next.faviconUrl || null, loginBackgroundUrl: next.loginBackgroundUrl || null, loginGreeting: next.loginGreeting || null, loginBackgroundOverlay: next.loginBackgroundOverlay }, { onSuccess: () => { void companyQuery.refetch(); } }); }} /></> : null}
        {activeNav === "Cài đặt" ? <><BranchSettings /><SupplyUnitSettings /></> : null}
        {activeNav === "Bảo hành & Sửa chữa" ? <MaintenancePage /> : null}
        {activeNav === "Kiểm kê" ? <AuditPage /> : null}
        {activeNav === "Khấu hao & Thanh lý" ? <RetirementManagementView canEditSectionLabels={isAdmin} /> : null}
        {activeNav === "Báo Cáo" ? <ReportsManagementView /> : null}
        {activeNav === "Quản lý nhân viên" ? <EmployeeManagementView /> : null}
        {activeNav === "Phòng Ban & Bộ Phận" ? <OrganizationManagementPage /> : null}
        {activeNav === "Nhà cung cấp & Hãng" ? <VendorBrandManagementPage /> : null}
        {activeNav === "Hợp đồng & Hóa đơn" ? <ProcurementManagementView /> : null}
        {activeNav === "Trợ giúp & hướng dẫn" ? <HelpCenter /> : null}
        {activeNav === "Danh mục tài sản" ? assetQuery.isLoading && !assetQuery.data ? <AssetCatalogLoadingPanel /> : assetQuery.isError && !assetQuery.data ? <AssetCatalogUnavailablePanel onRetry={() => void assetQuery.refetch()} /> : <PaginatedAssetCatalogPage assets={filteredAssets} statusCounts={assetStatusFilterCounts} query={query} category={category} status={status} department={department} vendor={vendorFilter} brand={brandFilter} warranty={warrantyFilter} branch={branchFilter} invoice={invoiceFilter} invoiceOptions={invoiceFilterOptions} vendorOptions={["Tất cả nhà cung cấp", ...(vendorsQuery.data || []).map((item) => item.name)]} brandOptions={["Tất cả hãng", ...(brandsQuery.data || []).map((item) => item.name)]} branchOptions={["Tất cả chi nhánh", ...(branchesQuery.data || []).map((item) => item.name)]} branchCounts={branchFilterCounts} onQueryChange={setQuery} onCategoryChange={setCategory} onStatusChange={setStatus} onDepartmentChange={setDepartment} onVendorChange={setVendorFilter} onBrandChange={setBrandFilter} onWarrantyChange={setWarrantyFilter} onBranchChange={setBranchFilter} onInvoiceChange={setInvoiceFilter} onReset={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); setVendorFilter("Tất cả nhà cung cấp"); setBrandFilter("Tất cả hãng"); setWarrantyFilter("Tất cả bảo hành"); setBranchFilter("Tất cả chi nhánh"); setInvoiceFilter("Tất cả Hóa đơn"); }} onCreate={openCreateModal} onEdit={openEditModal} onOpenDetail={openDetailModal} onOpenQr={setQrAsset} onOpenMaintenance={(asset) => { sessionStorage.setItem("assetmaster-open-maintenance-asset-code", asset.code); navigateTo("Bảo hành & Sửa chữa"); }} onOpenInvoice={(asset) => { if (!asset.purchaseInvoiceId) return; const url = new URL(window.location.href); url.searchParams.set("view", "invoices"); url.searchParams.set("invoiceId", String(asset.purchaseInvoiceId)); window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`); setActiveNav("Hợp đồng & Hóa đơn"); setMobileNavOpen(false); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" })); }} onAssign={(asset) => { if (asset.statusType !== "available") { toast.error("Chỉ có thể bàn giao tài sản đang sẵn có."); return; } setHandoverAssetCode(asset.code); }} canEditSectionLabels={isAdmin} /> : null}
        <div className={`px-4 py-7 sm:px-6 lg:px-9 lg:py-8 ${activeNav === "Tổng quan" ? "" : "hidden"}`}>
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516] shadow-[0_0_0_4px_rgba(240,165,22,0.12)]" /><EditableSectionLabel labelKey="dashboard-operations" fallback="Asset Operations" canEdit={isAdmin} /></div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Tổng quan tài sản</h1><p className="mt-1.5 text-sm text-[#71869A]">Theo dõi, quản lý và tối ưu toàn bộ tài sản doanh nghiệp.</p></div><div data-dashboard-freshness className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE9ED] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(16,42,67,0.045)] sm:min-w-[285px]"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E6F6F2] text-[#087A6A]"><CalendarDays size={15} /></span><div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7890A5]">Trạng thái dữ liệu</div><div className="mt-0.5 truncate text-xs font-bold text-[#193B57]">Đồng bộ lúc {dashboardSyncLabel}</div></div></div><button type="button" onClick={() => void refreshDashboardData()} disabled={assetQuery.isFetching || maintenanceTicketsQuery.isFetching} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#CDE5E5] text-[#087A6A] transition hover:bg-[#E6F6F2] disabled:cursor-not-allowed disabled:opacity-55" aria-label="Đồng bộ lại dữ liệu dashboard" title="Đồng bộ lại dữ liệu"><ArrowDownUp size={15} className={assetQuery.isFetching || maintenanceTicketsQuery.isFetching ? "animate-spin" : ""} /></button></div></div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {dashboardKpis.map((kpi, index) => { const Icon = kpi.icon; const toneMap: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; const valueClass = `font-display font-extrabold tracking-[-0.04em] ${kpi.alertValue ? "text-[#C75419]" : "text-[#102A43]"} ${kpi.compactValue ? "whitespace-nowrap text-[18px]" : "text-[24px]"}`; return <div key={kpi.label} className="animate-kpi group rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,42,67,0.08)]" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start justify-between"><div className={`grid h-9 w-9 place-items-center rounded-[11px] ${toneMap[kpi.tone]}`}><Icon size={17} /></div></div><div className="mt-4 text-[11px] font-semibold text-[#7890A5]">{kpi.label}</div><div className="mt-1 flex items-baseline gap-2">{kpi.alertValue ? <button type="button" onClick={() => { sessionStorage.setItem("assetmaster-maintenance-status-filter", "needs_attention"); navigateTo("Bảo hành & Sửa chữa"); }} className={`${valueClass} cursor-pointer rounded-md outline-none transition hover:text-[#A83F12] focus-visible:ring-2 focus-visible:ring-[#F0A516]`} aria-label="Xem phiếu Bảo hành/Sửa chữa cần xử lý" title="Xem phiếu cần xử lý">{kpi.value}</button> : <span className={valueClass}>{kpi.value}</span>}</div>{kpi.detail && <div className="mt-2 text-[10px] font-medium text-[#9AAEBD]">{kpi.detail}</div>}{kpi.subDetail && <div className="mt-2 text-[9px] font-extrabold text-[#A86B00]">{kpi.subDetail}</div>}</div>; })}
            </section>

            <section data-branch-asset-value-chart className="mt-5 rounded-xl border border-[#CDE5E5] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Building2 size={17} /></span><div><div className="text-sm font-extrabold text-[#193B57]">Giá trị tài sản theo Chi nhánh</div><p className="mt-1 text-xs text-[#71869A]">Tổng nguyên giá của tài sản đang còn thuộc công ty, phân theo Chi nhánh.</p></div></div><div className="rounded-lg bg-[#F4FBFA] px-3 py-2 text-right"><div className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]">Tổng giá trị</div><div className="mt-0.5 text-sm font-extrabold tabular-nums text-[#087A6A]">{formatVnd(assetValueTotal)} VNĐ</div></div></div>
{branchAssetValueSummary.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{branchAssetValueSummary.map((item) => { const maxValue = Math.max(...branchAssetValueSummary.map((entry) => entry.value), 1); const share = item.value ? Math.max(8, (item.value / maxValue) * 100) : 0; const percentage = assetValueTotal ? (item.value / assetValueTotal) * 100 : 0; const canFilter = item.code !== "CHƯA GÁN"; return <button key={item.code} type="button" disabled={!canFilter} onClick={() => { if (!canFilter) return; setBranchFilter(item.name); navigateTo("Danh mục tài sản"); }} className="group relative rounded-xl border border-[#E2ECEF] bg-[#FBFCFD] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#8BCDC6] hover:bg-[#F4FBFA] hover:shadow-[0_8px_18px_rgba(15,140,140,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8C8C] disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-[#E2ECEF] disabled:hover:bg-[#FBFCFD] disabled:hover:shadow-none"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{item.name}</div><div className="mt-0.5 font-mono text-[10px] font-semibold text-[#71869A]">{item.code} · {item.count} tài sản</div></div><div className="shrink-0 text-right text-xs font-extrabold tabular-nums text-[#087A6A]">{formatVnd(item.value)} <span className="text-[10px] text-[#71869A]">VNĐ</span></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EAF2F3]"><div className="h-full rounded-full bg-[#0F8C8C]" style={{ width: String(share) + "%" }} /></div><span role="tooltip" className="pointer-events-none absolute -top-2 left-1/2 z-30 w-max max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-full rounded-lg bg-[#102A43] px-3 py-2 text-center text-[11px] font-semibold leading-5 text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"><span className="block">Tổng giá trị: {formatVnd(item.value)} VNĐ</span><span className="block text-[#B8E9DD]">Tỷ trọng: {percentage.toFixed(1)}% · {item.count} tài sản</span>{canFilter && <span className="mt-1 block text-[10px] text-[#D3F4EE]">Nhấp để xem danh mục đã lọc</span>}</span></button>; })}</div> : <div className="mt-4 rounded-lg border border-dashed border-[#CDE5E5] bg-[#F8FCFB] px-4 py-7 text-center text-xs text-[#71869A]">Chưa có tài sản đủ điều kiện để thống kê theo Chi nhánh.</div>}
</section>

            <div data-dashboard-alert-row className={`mt-5 grid gap-5 ${overdueAuditReminders.length > 0 ? "xl:grid-cols-2" : ""}`}>
              {overdueAuditReminders.length > 0 && <section data-overdue-audit-alert className="min-w-0 overflow-hidden rounded-xl border border-[#F2B18B] bg-[#FFF9F5] shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-3 border-b border-[#F6D7C2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FDEDEE] text-[#B44545]"><AlertTriangle size={16} /></span><div><h2 className="text-sm font-extrabold text-[#9E3F12]">Kiểm kê quá hạn</h2><p className="mt-0.5 text-[11px] text-[#A66B48]">Mở trực tiếp từng đợt để tiếp tục đối chiếu và chốt biên bản.</p></div></div><span className="w-fit rounded-full bg-[#FDEDEE] px-2.5 py-1 text-[10px] font-extrabold text-[#B44545]">{overdueAuditReminders.length} đợt cần xử lý</span></div><div className="divide-y divide-[#F6E3D6]">{overdueAuditReminders.slice(0, 3).map((reminder) => <button key={reminder.id} type="button" onClick={() => openAuditSessionFromReminder(reminder.auditSessionId)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{reminder.title}</div><div className="mt-0.5 font-mono text-[11px] text-[#A66B48]">{reminder.detail}</div></div><span className="shrink-0 text-[11px] font-extrabold text-[#B44545]">Mở đợt →</span></button>)}</div></section>}
              <section className="min-w-0 overflow-hidden rounded-xl border border-[#F2D596] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-3 border-b border-[#F7E4B7] bg-[#FFF9EB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#A86B00] shadow-sm"><Archive size={17} /></div><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]">Phụ kiện chạm mức tồn tối thiểu{lowStockSupplies.length > 0 && <span className="rounded-full bg-[#FFF0C9] px-2 py-0.5 text-[10px] text-[#A86B00]">{lowStockSupplies.length}</span>}</div><p className="mt-1 text-xs text-[#8F6A31]">Theo dõi các phụ kiện cần được nhập thêm để không gián đoạn vận hành.</p></div></div><button onClick={() => navigateTo("Phụ kiện")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00] transition hover:bg-[#FFF5DC]"><Archive size={14} />Mở phụ kiện</button></div>{suppliesQuery.isLoading ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-[#F7FAFC]" />)}</div> : lowStockSupplyPreview.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{lowStockSupplyPreview.map((supply) => <article key={supply.id} className="group min-w-0 rounded-xl border border-[#F2D596] bg-[#FFFDFC] p-3.5 transition hover:-translate-y-0.5 hover:bg-[#FFF9EB] hover:shadow-[0_8px_18px_rgba(168,107,0,0.10)]"><div className="flex min-w-0 items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF0C9] text-[#A86B00]"><AlertTriangle size={16} /></span><span className="min-w-0"><span className="block truncate text-xs font-extrabold text-[#193B57]">{supply.name}</span><span className="mt-1 block truncate font-mono text-[10px] font-semibold text-[#8F6A31]">{supply.code}{supply.location ? ` · ${supply.location}` : ""}</span></span></div><span className="shrink-0 text-right"><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-[#A86B00]">Tồn / tối thiểu</span><span className="mt-1 block text-sm font-extrabold text-[#C75419]">{formatSupplyQuantity(supply.stockQuantity)} <span className="text-[11px] text-[#8F6A31]">/ {formatSupplyQuantity(supply.minimumQuantity)} {supply.unit}</span></span></span></div><button type="button" onClick={() => { sessionStorage.setItem("assetmaster-open-supply-receipt-id", String(supply.id)); navigateTo("Phụ kiện"); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-[11px] font-extrabold text-[#A86B00] transition hover:bg-[#FFF0C9]"><PackagePlus size={14} />Tạo phiếu nhập kho</button></article>)}</div> : <div className="flex flex-col items-center justify-center px-5 py-7 text-center"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><CheckCircle2 size={19} /></div><div className="mt-3 text-sm font-extrabold text-[#087A6A]">Tồn kho phụ kiện đang an toàn</div><p className="mt-1 text-xs text-[#6B8F8D]">Chưa có phụ kiện nào chạm mức tồn tối thiểu.</p></div>}{lowStockSupplies.length > lowStockSupplyPreview.length && <div className="border-t border-[#F7E4B7] bg-[#FFFDFC] px-5 py-3 text-right text-[11px] font-semibold text-[#8F6A31]">Còn {lowStockSupplies.length - lowStockSupplyPreview.length} phụ kiện cần theo dõi · <button onClick={() => navigateTo("Phụ kiện")} className="font-extrabold text-[#A86B00] hover:underline">Xem tất cả</button></div>}</section>
            </div>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
                <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><FileBarChart size={16} className="text-[#0F8C8C]" />Phân bổ vận hành</div><p className="mt-1 text-xs text-[#71869A]">Tỷ trọng tài sản theo tình trạng đang quản lý.</p></div><button onClick={() => navigateTo("Danh mục tài sản")} className="rounded-lg border border-[#CDE5E5] px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7]">Mở danh mục</button></div>
                <div className="mt-5 space-y-4">{[{ label: "Đang cấp phát", count: inventoryAssetRows.filter((asset) => asset.statusType === "active").length, tone: "bg-[#3278BD]" }, { label: "Sẵn có", count: inventoryAssetRows.filter((asset) => asset.statusType === "available").length, tone: "bg-[#0F8C8C]" }, { label: "Bảo trì / hỏng", count: inventoryAssetRows.filter((asset) => asset.statusType === "maintenance").length, tone: "bg-[#F0A516]" }].map((item) => <div key={item.label}><div className="flex justify-between text-xs"><span className="font-bold text-[#60758A]">{item.label}</span><span className="font-extrabold text-[#193B57]">{item.count} tài sản</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDF2F5]"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${inventoryAssetRows.length ? Math.max((item.count / inventoryAssetRows.length) * 100, item.count ? 8 : 0) : 0}%` }} /></div></div>)}</div>
              </div>
              <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Clock3 size={16} className="text-[#A86B00]" />Điều hành hôm nay</div><p className="mt-1 text-xs text-[#71869A]">Lối tắt đến các tác vụ nghiệp vụ thường dùng.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><button onClick={() => navigateTo("Bàn giao & Cấp phát")} className="flex items-center justify-between rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] p-3 text-left transition hover:bg-[#ECF8F7]"><span><span className="block text-xs font-extrabold text-[#087A6A]">Cấp phát thiết bị</span><span className="mt-1 block text-[11px] text-[#6B8F8D]">Lập phiếu, ký và in biên bản.</span></span><PackageCheck size={17} className="text-[#0F8C8C]" /></button><button onClick={() => navigateTo("Bảo hành & Sửa chữa")} className="flex items-center justify-between rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-left transition hover:bg-[#FFF5DC]"><span><span className="block text-xs font-extrabold text-[#A86B00]">Bảo hành & Sửa chữa</span><span className="mt-1 block text-[11px] text-[#8F6A31]">Tạo và theo dõi các phiếu xử lý.</span></span><Wrench size={17} className="text-[#A86B00]" /></button><button onClick={() => navigateTo("Kiểm kê")} className="flex items-center justify-between rounded-lg border border-[#DDE7F0] bg-[#FBFCFD] p-3 text-left transition hover:bg-[#F4F7FB]"><span><span className="block text-xs font-extrabold text-[#193B57]">Kiểm kê tài sản</span><span className="mt-1 block text-[11px] text-[#71869A]">Lập đợt và đối chiếu thực tế.</span></span><ClipboardCheck size={17} className="text-[#527089]" /></button></div></div>
            </section>

            <section className="mt-8 hidden overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
              <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh mục tài sản</h2><p className="mt-1 text-xs text-[#8AA0B6]">Quản lý và tra cứu tài sản trong doanh nghiệp</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button><button onClick={() => showComingSoon("Bộ lọc nâng cao")} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><Filter size={14} />Bộ lọc nâng cao</button></div></div>
              <div className="grid gap-3 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"><div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={category} onChange={setCategory} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={setStatus} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo hành/Sửa chữa", "Trả nhà cung cấp"]} /><FilterSelect value={department} onChange={setDepartment} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /></div>
              <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th><th className="px-4 py-3.5">Phân loại</th><th className="px-4 py-3.5">Người / Phòng giữ</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Ngày mua</th><th className="px-4 py-3.5 text-right">Giá trị</th><th className="px-5 py-3.5 text-right">Hành động</th></tr></thead><tbody>{filteredAssets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">Tài sản cố định</div></div></div></td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.category}</td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType as keyof typeof statusStyles]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{asset.date}</td><td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{formatVnd(asset.value)} <span className="text-[10px] font-semibold text-[#9BAEC0]">VNĐ</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100"><button onClick={() => openEditModal(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Chỉnh sửa"><Settings2 size={15} /></button><button onClick={() => setQrAsset(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label={`Mã QR ${asset.code}`}><QrCode size={15} /></button><button onClick={() => showComingSoon(`Bàn giao ${asset.code}`)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Bàn giao"><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{filteredAssets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div>
              <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row"><div className="text-xs text-[#8AA0B6]">Hiển thị <span className="font-bold text-[#60758A]">{filteredAssets.length}</span> trên <span className="font-bold text-[#60758A]">{assetRows.length}</span> tài sản</div><div className="flex items-center gap-1"><button className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#B1C0CC]" disabled>‹</button><button className="grid h-8 w-8 place-items-center rounded-md bg-[#102A43] text-xs font-bold text-white">1</button><button onClick={() => showComingSoon("Phân trang sẽ mở khi danh mục có nhiều hơn một trang")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">›</button></div></div>
            </section>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><Sparkles size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Kiểm kê và đối soát tài sản</div><div className="mt-0.5 text-[11px] text-[#4B8884]">{inventoryAssetRows.length} tài sản còn thuộc công ty; mở Kiểm kê để lập đợt và ghi nhận kết quả thực tế.</div></div></div><button onClick={() => navigateTo("Kiểm kê")} className="hidden text-xs font-extrabold text-[#087A6A] underline decoration-[#8BCDC6] underline-offset-4 sm:block">Mở kiểm kê <span className="no-underline">→</span></button></div>
          </div>
        </div>
        {assetModal && <AssetModal mode={assetModal} asset={selectedAsset} formData={formData} setFormData={setFormData} isSaving={createAssetMutation.isPending || updateAssetMutation.isPending} onClose={() => { setAssetModal(null); setReturnInvoiceId(null); }} onSave={saveAsset} onEdit={() => selectedAsset && openEditModal(selectedAsset)} onStartHandover={(assetCode) => { setAssetModal(null); setHandoverAssetCode(assetCode); }} onReturnToInvoice={returnInvoiceId ? () => { const url = new URL(window.location.href); url.searchParams.set("view", "invoices"); url.searchParams.set("invoiceId", String(returnInvoiceId)); window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`); setAssetModal(null); setReturnInvoiceId(null); setActiveNav("Hợp đồng & Hóa đơn"); } : undefined} />}
        {assetImportOpen && <AssetImportModal onClose={() => setAssetImportOpen(false)} onImported={() => { void assetQuery.refetch(); }} />}
        {isAdmin && <ImportHistoryLauncher onUndone={() => { void assetQuery.refetch(); }} />}
        {assetHistoryId && <AssetFieldHistoryDrawer assetId={assetHistoryId} onClose={() => setAssetHistoryId(null)} />}
        {qrAsset && <AssetQrModal asset={qrAsset} onClose={() => setQrAsset(null)} />}
        {qrLookupOpen && <QrLookupModal assets={assetRows} onClose={() => setQrLookupOpen(false)} onOpenAsset={(asset) => { setQrLookupOpen(false); setSelectedAsset(asset); setAssetModal("detail"); }} />}
        {handoverAssetCode && <AssetQuickHandoverModal assetCode={handoverAssetCode} onClose={() => setHandoverAssetCode(null)} />}
      </main>
    </div>
  );
}

function AssetCatalogPage({ assets, totalAssets, statusCounts, branchCounts, query, category, status, department, vendor, brand, warranty, branch, invoice, invoiceOptions, vendorOptions, brandOptions, branchOptions, onQueryChange, onCategoryChange, onStatusChange, onDepartmentChange, onVendorChange, onBrandChange, onWarrantyChange, onBranchChange, onInvoiceChange, onReset, onCreate, onEdit, onOpenDetail, onOpenQr, onOpenMaintenance, onOpenInvoice, onAssign, onExportFilteredAssets, canExportFilteredAssets, isExportingFilteredAssets, onOpenImport, onOpenImportHistory, canEditSectionLabels = false }: { assets: Asset[]; totalAssets: number; statusCounts: Record<string, number>; branchCounts: Record<string, number>; query: string; category: string; status: string; department: string; vendor: string; brand: string; warranty: string; branch: string; invoice: string; invoiceOptions: string[]; vendorOptions: string[]; brandOptions: string[]; branchOptions: string[]; onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void; onStatusChange: (value: string) => void; onDepartmentChange: (value: string) => void; onVendorChange: (value: string) => void; onBrandChange: (value: string) => void; onWarrantyChange: (value: string) => void; onBranchChange: (value: string) => void; onInvoiceChange: (value: string) => void; onReset: () => void; onCreate: () => void; onEdit: (asset: Asset) => void; onOpenDetail: (asset: Asset) => void; onOpenQr: (asset: Asset) => void; onOpenMaintenance: (asset: Asset) => void; onOpenInvoice: (asset: Asset) => void; onAssign: (asset: Asset) => void; onExportFilteredAssets: () => void; canExportFilteredAssets: boolean; isExportingFilteredAssets: boolean; onOpenImport: () => void; onOpenImportHistory: () => void; canEditSectionLabels?: boolean }) {
  type OptionalAssetColumn = "holder" | "branch" | "status" | "location" | "invoice" | "value";
  const defaultVisibleColumns: Record<OptionalAssetColumn, boolean> = { holder: true, branch: true, status: true, location: true, invoice: false, value: true };
  const columnOptions: Array<{ key: OptionalAssetColumn; label: string }> = [
    { key: "holder", label: "Người giữ" },
    { key: "branch", label: "Chi nhánh" },
    { key: "status", label: "Trạng thái" },
    { key: "location", label: "Vị trí / Serial" },
    { key: "invoice", label: "Mã Hóa đơn" },
    { key: "value", label: "Giá trị" },
  ];
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalAssetColumn, boolean>>(defaultVisibleColumns);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!columnPickerOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!columnPickerRef.current?.contains(event.target as Node)) setColumnPickerOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [columnPickerOpen]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("assetmaster-asset-catalog-visible-columns");
      if (saved) setVisibleColumns((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch { /* Giữ cấu hình mặc định nếu bộ nhớ cục bộ không khả dụng. */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("assetmaster-asset-catalog-visible-columns", JSON.stringify(visibleColumns)); } catch { /* Không chặn trải nghiệm khi không lưu được cấu hình. */ }
  }, [visibleColumns]);
  useEffect(() => {
    if (!visibleColumns.invoice) return;
    const header = Array.from(document.querySelectorAll<HTMLTableCellElement>("th")).find((cell) => cell.textContent?.trim() === "Mã Hóa đơn");
    const invoiceColumnIndex = header?.cellIndex;
    if (invoiceColumnIndex === undefined || invoiceColumnIndex < 0) return;
    document.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      const assetCode = row.cells.item(0)?.textContent?.trim();
      const asset = assets.find((item) => item.code === assetCode);
      const cell = row.cells.item(invoiceColumnIndex);
      const badge = cell?.querySelector<HTMLSpanElement>("span");
      if (!asset?.purchaseInvoiceId || !asset.invoiceKey || !badge || badge.dataset.invoiceLinkReady === "true") return;
      const invoiceLink = document.createElement("button");
      invoiceLink.type = "button";
      invoiceLink.dataset.invoiceLinkReady = "true";
      invoiceLink.className = "inline-flex max-w-[170px] truncate rounded-md bg-[#EAF3FF] px-2 py-1 font-mono text-[9px] font-semibold text-[#2666A8] underline-offset-2 transition hover:bg-[#DCEEFF] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2666A8]";
      invoiceLink.textContent = asset.invoiceKey;
      invoiceLink.title = `Mở Hóa đơn ${asset.invoiceKey}`;
      invoiceLink.setAttribute("aria-label", `Mở Hóa đơn ${asset.invoiceKey}`);
      invoiceLink.addEventListener("click", () => onOpenInvoice(asset));
      badge.replaceWith(invoiceLink);
    });
  }, [assets, onOpenInvoice, visibleColumns.invoice]);
  const tableMinWidth = 570 + (visibleColumns.holder ? 105 : 0) + (visibleColumns.branch ? 150 : 0) + (visibleColumns.status ? 115 : 0) + (visibleColumns.location ? 145 : 0) + (visibleColumns.invoice ? 170 : 0) + (visibleColumns.value ? 125 : 0);
  const assignedCount = assets.filter((asset) => asset.statusType === "active").length;
  const maintenanceCount = assets.filter((asset) => asset.statusType === "maintenance").length;
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#0F8C8C]" /><EditableSectionLabel labelKey="asset-catalog" fallback="Danh mục tài sản" canEdit={canEditSectionLabels} /></div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Danh mục tài sản</h1><p className="mt-1.5 text-sm text-[#71869A]">Tra cứu, phân loại và thực hiện các thao tác quản trị trên từng tài sản.</p></div><button onClick={onCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A]"><Plus size={16} />Thêm tài sản mới</button></div>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="text-[11px] font-bold text-[#8AA0B6]">Tài sản hiển thị</div><div className="mt-2 font-display text-2xl font-extrabold text-[#102A43]">{assets.length}<span className="ml-1 text-xs font-semibold text-[#8AA0B6]">/ {totalAssets}</span></div></div><div className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="text-[11px] font-bold text-[#4B8884]">Đang cấp phát trong phạm vi</div><div className="mt-2 font-display text-2xl font-extrabold text-[#087A6A]">{assignedCount}</div></div><div className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4"><div className="text-[11px] font-bold text-[#8F6A31]">Bảo hành/Sửa chữa trong phạm vi</div><div className="mt-2 font-display text-2xl font-extrabold text-[#A86B00]">{maintenanceCount}</div></div></section>
    <section className="mt-5 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh sách quản trị</h2><p className="mt-1 text-xs text-[#8AA0B6]">Tìm đúng tài sản trước khi xem hồ sơ, điều chỉnh thông tin, tạo QR hoặc cấp phát.</p></div><div className="flex flex-wrap items-center gap-2"><div ref={columnPickerRef} className="relative shrink-0"><button type="button" onClick={() => setColumnPickerOpen((open) => !open)} aria-expanded={columnPickerOpen} aria-controls="asset-catalog-column-picker" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]"><Columns3 size={14} />Cột</button>{columnPickerOpen && <div id="asset-catalog-column-picker" data-asset-column-picker className="absolute left-0 top-full z-40 mt-2 w-52 rounded-xl border border-[#D7E5EC] bg-white p-2 shadow-[0_16px_36px_rgba(16,42,67,0.16)]"><div className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#71869A]">Cột hiển thị</div>{columnOptions.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#526779] hover:bg-[#F4FBFA]"><input type="checkbox" checked={visibleColumns[column.key]} onChange={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))} className="h-3.5 w-3.5 rounded border-[#9FC8C4] text-[#0F8C8C] focus:ring-[#0F8C8C]" />{column.label}</label>)}<button type="button" onClick={() => setVisibleColumns(defaultVisibleColumns)} className="mt-1 w-full rounded-lg border border-[#DDE7F0] px-2 py-1.5 text-[10px] font-extrabold text-[#60758A] transition hover:bg-[#F7FAFC]">Khôi phục mặc định</button></div>}</div><button type="button" onClick={onExportFilteredAssets} disabled={!canExportFilteredAssets || isExportingFilteredAssets} title={canExportFilteredAssets ? "Xuất toàn bộ tài sản đang hiển thị sau khi áp dụng bộ lọc" : "Không có tài sản phù hợp với bộ lọc hiện tại"} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#C7DDF8] bg-white px-3 text-xs font-bold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-50">{isExportingFilteredAssets ? "Đang xuất..." : `Xuất danh sách (${assets.length})`}</button><button type="button" onClick={onOpenImport} title="Tải template và import nhiều tài sản từ Excel" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A]">Nhập Excel</button><button onClick={onReset} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại bộ lọc</button></div></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4"><div className="relative min-w-0 flex-[1_1_260px]"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm mã, tên hoặc người giữ..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={invoice} onChange={onInvoiceChange} options={invoiceOptions} /><FilterSelect value={category} onChange={onCategoryChange} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={onStatusChange} counts={statusCounts} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo trì", "Trả nhà cung cấp"]} /><FilterSelect value={department} onChange={onDepartmentChange} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /><FilterSelect value={branch} onChange={onBranchChange} options={branchOptions} counts={branchCounts} /><FilterSelect value={vendor} onChange={onVendorChange} options={vendorOptions} /><FilterSelect value={brand} onChange={onBrandChange} options={brandOptions} /><FilterSelect value={warranty} onChange={onWarrantyChange} options={["Tất cả bảo hành", "Đang bảo hành", "Sắp hết hạn", "Đã hết hạn"]} /><button type="button" onClick={onOpenImportHistory} title="Lịch sử import thành công" aria-label="Mở lịch sử import" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#CDE5E5] bg-white text-sm font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7]">↶</button></div>
      <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left" style={{ minWidth: tableMinWidth }}><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th>{visibleColumns.holder && <th className="px-4 py-3.5">Người giữ</th>}{visibleColumns.branch && <th className="px-4 py-3.5">Chi nhánh</th>}{visibleColumns.status && <th className="px-4 py-3.5">Trạng thái</th>}{visibleColumns.location && <th className="px-4 py-3.5">Vị trí / Serial</th>}{visibleColumns.invoice && <th className="px-4 py-3.5">Mã Hóa đơn</th>}{visibleColumns.value && <th className="px-4 py-3.5 text-right">Giá trị</th>}<th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">{asset.category}</div></div></div></td>{visibleColumns.holder && <td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td>}{visibleColumns.branch && <td className="px-4 py-4"><span data-asset-branch-badge className="inline-flex max-w-[150px] truncate rounded-full bg-[#F0F5F8] px-2.5 py-1 text-[10px] font-extrabold text-[#526779]" title={asset.branchLabel || "Chưa gán"}>{asset.branchLabel || "Chưa gán"}</span></td>}{visibleColumns.status && <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td>}{visibleColumns.location && <td className="px-4 py-4 text-xs text-[#60758A]"><div>{asset.location || "Chưa cập nhật"}</div><div className="mt-1 font-mono text-[10px] text-[#9BAEC0]">{asset.serial || "Chưa có serial"}</div></td>}{visibleColumns.invoice && <td className="px-4 py-4"><span className="inline-flex max-w-[170px] truncate rounded-md bg-[#F0F5F8] px-2 py-1 font-mono text-[10px] font-bold text-[#526779]" title={asset.invoiceKey || "Chưa liên kết"}>{asset.invoiceKey || "—"}</span></td>}{visibleColumns.value && <td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{formatVnd(asset.value)} <span className="text-[10px] font-semibold text-[#9BAEC0]">VNĐ</span></td>}<td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={() => onOpenDetail(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#F0F5F8] hover:text-[#193B57]" aria-label={`Hồ sơ ${asset.code}`}><FileText size={15} /></button>{asset.statusType === "maintenance" && <button onClick={() => onOpenMaintenance(asset)} className="rounded-md p-2 text-[#A86B00] hover:bg-[#FFF5DC]" aria-label={`Mở phiếu Bảo hành/Sửa chữa ${asset.code}`}><Wrench size={15} /></button>}<button onClick={() => onEdit(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label={`Chỉnh sửa ${asset.code}`}><Settings2 size={15} /></button><button onClick={() => onOpenQr(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label={`Mã QR ${asset.code}`}><QrCode size={15} /></button><button onClick={() => onAssign(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label={`Cấp phát ${asset.code}`}><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{assets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản phù hợp</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử đặt lại bộ lọc hoặc thay đổi từ khóa tìm kiếm.</p></div>}</div>
      <div className="flex items-center justify-between gap-3 px-5 py-4 text-xs text-[#8AA0B6]"><span>Hiển thị <b className="text-[#60758A]">{assets.length}</b> trên <b className="text-[#60758A]">{totalAssets}</b> tài sản</span><span className="font-bold text-[#0F8C8C]">Dữ liệu đồng bộ từ hệ thống</span></div>
    </section>
  </div></div>;
}

function AssetCatalogLoadingPanel() {
  return <div data-asset-catalog-loading className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7"><div className="h-3 w-32 animate-pulse rounded bg-[#DCE9ED]" /><div className="mt-3 h-9 w-64 animate-pulse rounded bg-[#E7EEF3]" /><div className="mt-3 h-4 w-[min(440px,85vw)] animate-pulse rounded bg-[#E7EEF3]" /></div><section role="status" aria-live="polite" className="overflow-hidden rounded-xl border border-[#CDE5E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="border-b border-[#E7EEF3] px-5 py-5"><div className="text-sm font-extrabold text-[#193B57]">Đang tải Danh mục tài sản...</div><p className="mt-1 text-xs text-[#71869A]">Hệ thống đang kết nối dữ liệu. Vui lòng chờ trong giây lát.</p></div><ModalTableSkeleton rows={7} columns={7} /></section></div></div>;
}

function AssetCatalogUnavailablePanel({ onRetry }: { onRetry: () => void }) {
  return <div data-asset-catalog-unavailable className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><section role="alert" className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#A86B00]"><AlertTriangle size={17} /></span><div><div className="text-sm font-extrabold text-[#8F5A00]">Chưa thể kết nối Danh mục tài sản</div><p className="mt-1 text-xs leading-5 text-[#8F6A31]">Dịch vụ có thể đang khởi động lại. Hệ thống đã tự thử lại; bạn có thể thử kết nối lại ngay.</p><button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-[#F2D596] bg-white px-3 py-2 text-xs font-bold text-[#A86B00] transition hover:bg-[#FFF5DC]">Thử lại dữ liệu</button></div></div></section></div></div>;
}

function PaginatedAssetCatalogPage({ assets, statusCounts, branchCounts, query, category, status, department, vendor, brand, warranty, branch, invoice, invoiceOptions, vendorOptions, brandOptions, branchOptions, onQueryChange, onCategoryChange, onStatusChange, onDepartmentChange, onVendorChange, onBrandChange, onWarrantyChange, onBranchChange, onInvoiceChange, onReset, onCreate, onEdit, onOpenDetail, onOpenQr, onOpenMaintenance, onOpenInvoice, onAssign, canEditSectionLabels = false }: { assets: Asset[]; statusCounts: Record<string, number>; branchCounts: Record<string, number>; query: string; category: string; status: string; department: string; vendor: string; brand: string; warranty: string; branch: string; invoice: string; invoiceOptions: string[]; vendorOptions: string[]; brandOptions: string[]; branchOptions: string[]; onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void; onStatusChange: (value: string) => void; onDepartmentChange: (value: string) => void; onVendorChange: (value: string) => void; onBrandChange: (value: string) => void; onWarrantyChange: (value: string) => void; onBranchChange: (value: string) => void; onInvoiceChange: (value: string) => void; onReset: () => void; onCreate: () => void; onEdit: (asset: Asset) => void; onOpenDetail: (asset: Asset) => void; onOpenQr: (asset: Asset) => void; onOpenMaintenance: (asset: Asset) => void; onOpenInvoice: (asset: Asset) => void; onAssign: (asset: Asset) => void; canEditSectionLabels?: boolean }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const { currentPage, totalPages, startIndex, startRecord, endRecord } = getPaginationWindow(assets.length, page, pageSize);
  const pageAssets = assets.slice(startIndex, startIndex + pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((pageNumber) => totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1);
  const allFilteredAssets = assets;
  const filteredAssetExportRows = useMemo(() => buildFilteredAssetExportRows(allFilteredAssets), [allFilteredAssets]);
  const maintenanceExportRows = useMemo(() => buildMaintenanceExportRows(assets), [assets]);
  const [isExportingFilteredAssets, setIsExportingFilteredAssets] = useState(false);
  const [isExportingMaintenance, setIsExportingMaintenance] = useState(false);
  const exportFilteredAssetsExcel = () => {
    if (!filteredAssetExportRows.length) { toast.info("Không có tài sản phù hợp với bộ lọc hiện tại để xuất Excel."); return; }
    if (isExportingFilteredAssets) return;
    setIsExportingFilteredAssets(true);
    const loadingToast = toast.loading("Đang tạo danh sách tài sản theo bộ lọc...");
    window.setTimeout(async () => {
      try {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(filteredAssetExportRows);
        sheet["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 36 }];
        sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(workbook, sheet, "Danh sách tài sản");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "DANH SÁCH TÀI SẢN THEO BỘ LỌC",
          fileName: `assetmaster-danh-sach-tai-san-da-loc-${new Date().toISOString().slice(0, 10)}.xlsx`,
          description: `Danh sách ${filteredAssetExportRows.length} tài sản theo toàn bộ bộ lọc hiện tại.`
        });
        toast.success(`Đã xuất ${filteredAssetExportRows.length} tài sản theo bộ lọc ra Excel.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất danh sách tài sản theo bộ lọc.", { id: loadingToast });
      } finally {
        setIsExportingFilteredAssets(false);
      }
    }, 180);
  };
  useEffect(() => {
    const exportButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.title.startsWith("Xuất toàn bộ tài sản đang hiển thị"));
    if (!exportButton) return;
    exportButton.textContent = isExportingFilteredAssets ? "Đang xuất..." : `Xuất danh sách (${filteredAssetExportRows.length})`;
    exportButton.setAttribute("aria-label", `Xuất toàn bộ ${filteredAssetExportRows.length} tài sản theo bộ lọc`);
  }, [filteredAssetExportRows.length, isExportingFilteredAssets]);

  const exportMaintenanceExcel = () => {
    if (!maintenanceExportRows.length) { toast.info("Không có tài sản đang bảo trì trong phạm vi lọc hiện tại."); return; }
    if (isExportingMaintenance) return;
    setIsExportingMaintenance(true);
    const loadingToast = toast.loading("Đang tạo danh sách tài sản bảo trì...");
    window.setTimeout(async () => {
      try {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(maintenanceExportRows);
        sheet["!cols"] = [{ wch: 16 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 42 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 34 }];
        XLSX.utils.book_append_sheet(workbook, sheet, "Tài sản bảo trì");
        await writeBrandedWorkbook(workbook, {
          documentTitle: "DANH SÁCH TÀI SẢN ĐANG BẢO TRÌ",
          fileName: `assetmaster-tai-san-bao-tri-${new Date().toISOString().slice(0, 10)}.xlsx`,
          description: `Danh sách ${maintenanceExportRows.length} tài sản theo bộ lọc hiện tại.`,
        });
        toast.success(`Đã xuất ${maintenanceExportRows.length} tài sản đang bảo trì ra Excel.`, { id: loadingToast });
      } catch (error) {
        console.error(error);
        toast.error("Không thể xuất danh sách tài sản bảo trì.", { id: loadingToast });
      } finally {
        setIsExportingMaintenance(false);
      }
    }, 180);
  };
  useEffect(() => { setPage(1); }, [query, category, status, department, vendor, brand, warranty, branch, invoice, pageSize]);
  useEffect(() => { setJumpPage(String(currentPage)); }, [currentPage]);
  useEffect(() => {
    const refreshMaintenanceLabels = () => {
      document.querySelectorAll<HTMLElement>("div, p, button, [role=option]").forEach((element) => {
          const text = element.textContent?.trim();
        if (text === "Bảo trì / hỏng trong phạm vi") element.textContent = "Bảo hành/Sửa chữa trong phạm vi";
        if (text === "Tài sản bảo trì") element.textContent = "Tài sản Bảo hành/Sửa chữa";
      });
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (button.title === "Chỉ hiển thị tài sản đang bảo trì") button.title = "Chỉ hiển thị tài sản Bảo hành/Sửa chữa";
        if (button.title === "Bỏ lọc tài sản đang bảo trì") button.title = "Bỏ lọc tài sản Bảo hành/Sửa chữa";
        if (button.title === "Xuất danh sách tài sản đang bảo trì ra Excel") button.title = "Xuất danh sách tài sản Bảo hành/Sửa chữa ra Excel";
      });
    };
    refreshMaintenanceLabels();
    const observer = new MutationObserver(refreshMaintenanceLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pageAssets.length, isExportingMaintenance]);
  useEffect(() => {
    const tooltipByPrefix: Array<[string, string]> = [["Hồ sơ", "Xem hồ sơ tài sản"], ["Chỉnh sửa", "Chỉnh sửa tài sản"], ["Mã QR", "Tạo / xem mã QR"], ["Cấp phát", "Tạo phiếu bàn giao"]];
    document.querySelectorAll<HTMLButtonElement>("button[aria-label]").forEach((button) => {
      const label = button.getAttribute("aria-label") || "";
      const tooltip = tooltipByPrefix.find(([prefix]) => label.startsWith(prefix))?.[1];
      if (tooltip) button.title = tooltip;
    });
  }, [pageAssets]);
  useEffect(() => {
    const legacyFooter = document.querySelector("section.overflow-hidden > div:last-child");
    legacyFooter?.classList.add("hidden");
    return () => legacyFooter?.classList.remove("hidden");
  }, []);
  useEffect(() => {
    const warrantyTone = { active: "border-[#8BCDC6] bg-[#ECF8F7] text-[#087A6A]", expiring: "border-[#F2D596] bg-[#FFF9EB] text-[#A86B00]", expired: "border-[#F6C7C7] bg-[#FDEDEE] text-[#B44545]" } as const;
    pageAssets.forEach((asset) => {
      const row = Array.from(document.querySelectorAll<HTMLTableRowElement>("tbody tr")).find((candidate) => candidate.textContent?.includes(asset.code));
      if (asset.statusType === "retired" || asset.statusType === "returned") {
        const editButton = row?.querySelector<HTMLButtonElement>(`button[aria-label="Chỉnh sửa ${asset.code}"]`);
        if (editButton) { const lockReason = asset.statusType === "returned" ? "Tài sản đã Trả nhà cung cấp được khóa chỉnh sửa" : "Tài sản đã Khấu hao/Thanh lý được khóa chỉnh sửa"; editButton.disabled = true; editButton.title = lockReason; editButton.classList.add("cursor-not-allowed", "opacity-35"); editButton.setAttribute("aria-label", `${lockReason}: ${asset.code}`); }
      }
      const nameNode = Array.from(row?.querySelectorAll<HTMLElement>("td:nth-child(2) div") || []).find((candidate) => candidate.textContent?.trim() === asset.name);
      const metadata = nameNode?.nextElementSibling as HTMLElement | null;
      if (!metadata) return;
      const warrantyState = getWarrantyState(asset.warrantyUntil);
      if (warrantyState !== "none" && !metadata.querySelector("[data-asset-warranty-until]")) {
        const warrantyUntil = new Date(asset.warrantyUntil as string | number | Date);
        if (!Number.isNaN(warrantyUntil.getTime())) {
          const badge = document.createElement("span");
          badge.dataset.assetWarrantyUntil = "true";
          badge.className = `ml-2 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${warrantyTone[warrantyState]}`;
          badge.textContent = `BH: ${warrantyUntil.toLocaleDateString("vi-VN")}${warrantyState === "expired" ? " · Hết hạn BH" : warrantyState === "expiring" ? " · Sắp hết hạn" : ""}`;
          badge.title = warrantyState === "expired" ? "Bảo hành đã hết hạn" : warrantyState === "expiring" ? "Bảo hành sắp hết hạn trong 30 ngày" : "Tài sản còn thời hạn bảo hành";
          metadata.append(badge);
        }
      }
      if (asset.repairCost && asset.repairCost > 0 && !metadata.querySelector("[data-asset-repair-cost]")) {
        const repairCost = document.createElement("span");
        repairCost.dataset.assetRepairCost = "true";
        repairCost.className = "ml-2 inline-flex items-center rounded-full border border-[#C7DDF8] bg-[#EFF7FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2666A8]";
        repairCost.textContent = `SC: ${formatVnd(asset.repairCost)} VNĐ`;
        repairCost.title = "Tổng chi phí Sửa chữa đã phát sinh cho tài sản";
        metadata.append(repairCost);
      }
    });
  }, [pageAssets]);
  const resetAndGoFirst = () => {
    setPage(1);
    onReset();
  };
  const submitJumpPage = (value = jumpPage) => {
    const requestedPage = Number.parseInt(value, 10);
    if (!Number.isFinite(requestedPage) || requestedPage < 1 || requestedPage > totalPages) {
      toast.error(`Nhập số trang từ 1 đến ${totalPages}.`);
      setJumpPage(String(currentPage));
      return;
    }
    setPage(requestedPage);
  };
  useEffect(() => {
    const nextButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Sau");
    const controls = nextButton?.parentElement;
    if (!controls || controls.querySelector("[data-page-jump]")) return;

    const jumpControl = document.createElement("div");
    jumpControl.dataset.pageJump = "true";
    jumpControl.className = "flex items-center gap-1";
    const label = document.createElement("label");
    label.className = "text-xs font-semibold text-[#60758A]";
    label.textContent = "Đến trang";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(totalPages);
    input.value = String(currentPage);
    input.inputMode = "numeric";
    input.setAttribute("aria-label", "Nhập số trang");
    input.className = "h-8 w-12 rounded-md border border-[#DDE7F0] bg-white px-2 text-center text-xs font-bold text-[#193B57] outline-none focus:border-[#0F8C8C]";
    const submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.textContent = "Đi";
    submitButton.className = "h-8 rounded-md border border-[#CDE5E5] px-2.5 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7]";
    const submit = () => { setJumpPage(input.value); submitJumpPage(input.value); };
    submitButton.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") submit(); });
    jumpControl.append(label, input, submitButton);
    controls.insertBefore(jumpControl, controls.firstChild?.nextSibling || nextButton);
    return () => jumpControl.remove();
  }, [currentPage, totalPages, assets.length]);
  return <div className="relative"><AssetCatalogPage assets={pageAssets} totalAssets={assets.length} statusCounts={statusCounts} branchCounts={branchCounts} query={query} category={category} status={status} department={department} vendor={vendor} brand={brand} warranty={warranty} branch={branch} invoice={invoice} invoiceOptions={invoiceOptions} vendorOptions={vendorOptions} brandOptions={brandOptions} branchOptions={branchOptions} onQueryChange={onQueryChange} onCategoryChange={onCategoryChange} onStatusChange={onStatusChange} onDepartmentChange={onDepartmentChange} onVendorChange={onVendorChange} onBrandChange={onBrandChange} onWarrantyChange={onWarrantyChange} onBranchChange={onBranchChange} onInvoiceChange={onInvoiceChange} onReset={resetAndGoFirst} onCreate={onCreate} onEdit={onEdit} onOpenDetail={onOpenDetail} onOpenQr={onOpenQr} onOpenMaintenance={onOpenMaintenance} onOpenInvoice={onOpenInvoice} onAssign={onAssign} onExportFilteredAssets={exportFilteredAssetsExcel} canExportFilteredAssets={filteredAssetExportRows.length > 0} isExportingFilteredAssets={isExportingFilteredAssets} onOpenImport={() => window.dispatchEvent(new Event("assetmaster:open-asset-import"))} onOpenImportHistory={() => window.dispatchEvent(new Event("assetmaster:open-import-history"))} canEditSectionLabels={canEditSectionLabels} /><div className="relative z-10 px-4 pb-8 pt-4 sm:px-6 lg:px-9 lg:pb-9"><div className="mx-auto flex max-w-[1500px] flex-col gap-3 rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.06)] sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[#71869A]">Hiển thị <span className="font-bold text-[#193B57]">{startRecord}–{endRecord}</span> trên <span className="font-bold text-[#193B57]">{assets.length}</span> tài sản phù hợp</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]">Mỗi trang<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#DDE7F0] bg-white px-2 text-xs font-bold text-[#193B57]"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><button disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-8 rounded-md border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40">Trước</button>{pageNumbers.map((pageNumber, index) => <span key={pageNumber} className="flex items-center gap-1">{index > 0 && pageNumber - pageNumbers[index - 1] > 1 ? <span className="px-1 text-xs text-[#8AA0B6]">…</span> : null}<button onClick={() => setPage(pageNumber)} className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-bold ${currentPage === pageNumber ? "bg-[#102A43] text-white" : "border border-[#DDE7F0] text-[#60758A] hover:bg-[#F7FAFC]"}`}>{pageNumber}</button></span>)}<button disabled={currentPage === totalPages || assets.length === 0} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="h-8 rounded-md border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40">Sau</button></div></div></div></div>;
}

function CompanySettingsPage({ companyInfo, onSave }: { companyInfo: CompanyInfo; onSave: (next: CompanyInfo) => void }) {
  const [draft, setDraft] = useState(companyInfo);
  const update = (key: keyof CompanyInfo, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1000px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Workspace settings</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Cài đặt hệ thống</h1><p className="mt-1.5 text-sm text-[#71869A]">Quản lý thông tin doanh nghiệp hiển thị trên tiêu đề biên bản bàn giao PDF.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]"><section className="rounded-xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Building2 size={19} /></div><div><h2 className="font-display text-base font-extrabold text-[#102A43]">Thông tin công ty</h2><p className="mt-1 text-xs text-[#8AA0B6]">Các trường này sẽ được tự động điền vào phần đầu biên bản PDF.</p></div></div><div className="mt-5 space-y-4"><div><label className="field-label">Tên công ty <span className="text-[#0F8C8C]">*</span></label><input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Ví dụ: Công ty Cổ phần AssetMaster" className="field-input" /></div><div><label className="field-label">Địa chỉ trụ sở <span className="text-[#0F8C8C]">*</span></label><textarea value={draft.address} onChange={(e) => update("address", e.target.value)} placeholder="Nhập địa chỉ đầy đủ" className="field-input min-h-[76px] resize-y" /></div><div><label className="field-label">Mã số thuế</label><input value={draft.taxCode} onChange={(e) => update("taxCode", e.target.value)} placeholder="0101234567" className="field-input" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Số điện thoại</label><input value={draft.phone} onChange={(e) => update("phone", e.target.value)} placeholder="024 3789 2468" className="field-input" /></div><div><label className="field-label">Email công ty</label><input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} placeholder="contact@company.vn" className="field-input" /></div></div></div><div className="mt-6 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={() => { if (!draft.name.trim() || !draft.address.trim()) { toast.error("Vui lòng nhập tên công ty và địa chỉ."); return; } onSave(draft); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A]"><CheckCircle2 size={15} />Lưu thông tin công ty</button></div></section><aside className="rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-6"><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">PDF header preview</div><div className="mt-4 rounded-xl bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.06)]"><div className="flex items-center gap-3"><img src="/manus-storage/assetmaster-logo_f5d79b06.png" alt="AssetMaster" className="h-11 w-11 rounded-xl bg-[#102A43] p-1.5" /><div><div className="font-display text-base font-extrabold text-[#102A43]">{draft.name || "Tên công ty"}</div><div className="mt-1 text-[10px] font-semibold text-[#0F8C8C]">HỆ THỐNG QUẢN LÝ TÀI SẢN DOANH NGHIỆP</div></div></div><div className="mt-5 border-t border-[#E7EEF3] pt-4 text-[11px] leading-5 text-[#60758A]"><div>{draft.address || "Địa chỉ công ty"}</div><div> MST: {draft.taxCode || "Chưa cập nhật"} · ĐT: {draft.phone || "Chưa cập nhật"} · Email: {draft.email || "Chưa cập nhật"}</div></div><div className="mt-5 text-center font-display text-sm font-extrabold text-[#193B57]">BIÊN BẢN BÀN GIAO TÀI SẢN</div></div><p className="mt-4 text-xs leading-5 text-[#4B8884]">Thông tin được lưu trong trình duyệt này và sẽ được dùng cho các lần xuất biên bản tiếp theo.</p></aside></div></div></div>;
}

type Handover = { id: number; referenceCode: string; assetCode: string; assetName: string; recipient: string; department: string; branch?: string; date: string; dueBackAt?: Date | string | null; returnedAt?: Date | string | null; recoveryCertificateNumber?: string | null; recoveryCertificateYear?: number | null; recoveryCertificateMonth?: number | null; recoveryCertificateSequence?: number | null; conditionIn?: string | null; returnRequestStatus?: "none" | "pending" | "approved" | "rejected"; returnRequestedAt?: Date | null; returnRequestNote?: string | null; status: "Đã bàn giao" | "Chờ ký" | "Nháp" | "Đã hoàn trả"; condition: string; handoverBy: string; note: string; accessories: string; supplyItems?: Array<{ id: number; supplyId: number; supplyCode: string; supplyName: string; unit: string; issuedQuantity: string | number; returnedQuantity: string | number }>; recipientUserId?: number | null; recipientDepartmentId?: number | null; recipientSignatureUrl?: string | null; };
type HandoverSupplyItem = { supplyId: number; quantity: number };

function PartialAccessoryReturnPanel({ supplyItems, quantities, onQuantityChange }: { supplyItems: NonNullable<Handover["supplyItems"]>; quantities: Record<number, string>; onQuantityChange: (id: number, quantity: string) => void }) {
  const outstandingItems = supplyItems.map((item) => ({ ...item, outstanding: Math.max(0, Number(item.issuedQuantity) - Number(item.returnedQuantity || 0)) })).filter((item) => item.outstanding > 0);
  const missingItems = outstandingItems.filter((item) => Math.min(item.outstanding, Math.max(0, Number(quantities[item.id] ?? item.outstanding))) < item.outstanding);
  if (!outstandingItems.length) return <div className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-2 text-xs font-bold text-[#087A6A]">Không còn phụ kiện kho nào cần hoàn trả.</div>;
  return <div className="mt-4 rounded-xl border border-[#F0DFC0] bg-[#FFFDF7] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#A86B00]">Số lượng phụ kiện thực tế hoàn về kho</div><p className="mt-1 text-[11px] leading-5 text-[#8A7140]">Kiểm tra từng phụ kiện trước khi xác nhận. Có thể hoàn một phần; số còn lại sẽ được ghi nhận là chưa hoàn.</p><div className="mt-3 space-y-2">{outstandingItems.map((supplyItem) => <div key={supplyItem.id} className="grid grid-cols-[minmax(0,1fr)_116px] items-center gap-3 rounded-lg border border-[#F0E1BF] bg-white px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{supplyItem.supplyName} <span className="font-mono text-[10px] text-[#8AA0B6]">{supplyItem.supplyCode}</span></div><div className="mt-1 text-[10px] text-[#71869A]">Đang giữ: <b className="text-[#A86B00]">{Math.floor(supplyItem.outstanding)} {supplyItem.unit}</b></div></div><label className="text-[10px] font-bold text-[#60758A]">Hoàn kho<input type="number" inputMode="numeric" min="0" max={Math.floor(supplyItem.outstanding)} step="1" value={quantities[supplyItem.id] ?? String(Math.floor(supplyItem.outstanding))} onChange={(event) => onQuantityChange(supplyItem.id, event.target.value.replace(/\D/g, ""))} className="mt-1 h-8 w-full rounded-md border border-[#DDE7F0] bg-white px-2 text-right text-xs font-extrabold text-[#193B57] outline-none focus:border-[#0F8C8C]" aria-label={`Số lượng hoàn kho ${supplyItem.supplyName}`} /></label></div>)}</div>{missingItems.length > 0 && <div className="mt-3 rounded-lg border border-[#F2C6A2] bg-[#FFF3E8] px-3 py-2 text-[11px] font-semibold leading-5 text-[#A94B12]">Cảnh báo: còn {missingItems.length} loại phụ kiện chưa hoàn đủ. Số còn thiếu sẽ tiếp tục hiển thị là đang giữ sau khi thu hồi.</div>}</div>;
}

function AssetQuickHandoverModal({ assetCode, onClose }: { assetCode: string; onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: isAdmin });
  const suppliesQuery = trpc.supplies.list.useQuery(undefined, { enabled: isAdmin });
  const recipientsQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const selectedAsset = assetsQuery.data?.find((asset) => asset.assetCode === assetCode);
  const [form, setForm] = useState<Handover>({ id: 0, referenceCode: "", assetCode, assetName: "", recipient: "", department: "", date: new Date().toLocaleDateString("vi-VN"), status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null });
  const [supplyItems, setSupplyItems] = useState<HandoverSupplyItem[]>([]);
  useEffect(() => { if (selectedAsset) setForm((current) => ({ ...current, assetCode: selectedAsset.assetCode, assetName: selectedAsset.name })); }, [selectedAsset?.id, selectedAsset?.assetCode, selectedAsset?.name]);
  const createHandover = trpc.handovers.create.useMutation({
    onSuccess: () => { void utils.handovers.list.invalidate(); void utils.assets.list.invalidate(); void utils.supplies.list.invalidate(); void utils.employees.assetHistory.invalidate(); void utils.employees.myAssetHistory.invalidate(); toast.success("Đã tạo phiếu bàn giao cho tài sản đã chọn."); onClose(); },
    onError: (error) => toast.error(handoverCreateErrorMessage(error)),
  });
  const update = (key: keyof Handover, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const chooseRecipient = (userId: number) => {
    const recipient = recipientsQuery.data?.find((employee) => employee.id === userId);
    const department = recipient?.departmentId ? departmentsQuery.data?.find((item) => item.id === recipient.departmentId) : undefined;
    setForm((current) => ({ ...current, recipientUserId: recipient?.id || null, recipient: recipient?.name || recipient?.email || "", recipientDepartmentId: department?.id || null, department: department?.name || "" }));
  };
  const save = () => {
    if (!selectedAsset || selectedAsset.status !== "available" || !form.recipientUserId || !form.recipient.trim()) { toast.error("Vui lòng chọn nhân viên nhận hợp lệ và kiểm tra tài sản còn sẵn có."); return; }
    createHandover.mutate({ assetId: selectedAsset.id, recipientName: form.recipient, recipientDepartmentName: form.department || null, handedOverAt: Date.now(), dueBackAt: normalizePurchaseDate(form.dueBackAt), conditionOut: form.condition, accessories: form.accessories || null, supplyItems, note: form.note || null, recipientUserId: form.recipientUserId, recipientDepartmentId: form.recipientDepartmentId || null });
  };
  if (assetsQuery.isLoading || recipientsQuery.isLoading || departmentsQuery.isLoading) return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102A43]/40 p-4"><div className="rounded-xl bg-white px-5 py-4 text-sm font-bold text-[#193B57]">Đang chuẩn bị phiếu bàn giao...</div></div>;
  if (!selectedAsset || selectedAsset.status !== "available") return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102A43]/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl"><div className="text-base font-extrabold text-[#102A43]">Tài sản không còn sẵn có</div><p className="mt-2 text-sm text-[#71869A]">Vui lòng làm mới Danh mục và chọn một tài sản đang sẵn có.</p><button onClick={onClose} className="modal-close-action">Đóng</button></div></div>;
  return <PersistedHandoverCreateModal form={form} assets={[selectedAsset]} employees={recipientsQuery.data || []} departments={departmentsQuery.data || []} supplies={suppliesQuery.data || []} supplyItems={supplyItems} onSupplyItemsChange={setSupplyItems} update={update} onRecipientChange={chooseRecipient} onClose={onClose} onSave={save} saving={createHandover.isPending} />;
}

function AssignmentsPage({ showComingSoon, companyInfo }: { showComingSoon: (label: string) => void; companyInfo: CompanyInfo }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const handoversQuery = trpc.handovers.list.useQuery();
  const assignmentAssetsQuery = trpc.assets.list.useQuery();
  const handoverBranchesQuery = trpc.branches.list.useQuery();
  const handoverSuppliesQuery = trpc.supplies.list.useQuery(undefined, { enabled: isAdmin });
  const recipientsQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const handoverDepartmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const handoverFilterDepartmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const refreshHandoverData = () => { void utils.handovers.list.invalidate(); void utils.assets.list.invalidate(); void utils.supplies.list.invalidate(); void utils.employees.assetHistory.invalidate(); void utils.employees.myAssetHistory.invalidate(); };
  const createHandoverMutation = trpc.handovers.create.useMutation({ onSuccess: () => { refreshHandoverData(); toast.success("Đã lưu phiếu bàn giao nháp vào hệ thống."); }, onError: (error) => toast.error(handoverCreateErrorMessage(error)) });
  const resolveReturnRequest = trpc.handovers.resolveReturnRequest.useMutation({ onSuccess: () => { refreshHandoverData(); toast.success("Đã cập nhật yêu cầu hoàn trả."); }, onError: (error) => toast.error(error.message || "Không thể xử lý yêu cầu hoàn trả.") });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [handoverYearFilter, setHandoverYearFilter] = useState("Tất cả các năm");
  const [handoverDepartmentFilter, setHandoverDepartmentFilter] = useState("Tất cả phòng ban");
  const [handoverBranchFilter, setHandoverBranchFilter] = useState("Tất cả chi nhánh");
  const [handoverRecipientFilter, setHandoverRecipientFilter] = useState("Tất cả người nhận");
  const [handoverPage, setHandoverPage] = useState(1);
  const [isExportingHandovers, setIsExportingHandovers] = useState(false);
  const [handoverKpisCollapsed, setHandoverKpisCollapsed] = useState(true);
  const [modal, setModal] = useState<"create" | "detail" | null>(null);
  const [selected, setSelected] = useState<Handover | null>(null);
  const [recoveryPdfRequest, setRecoveryPdfRequest] = useState<string | null>(null);
  const [preparingRecoveryCertificate, setPreparingRecoveryCertificate] = useState<string | null>(null);
  const [returnDecision, setReturnDecision] = useState<{ item: Handover; decision: "approved" | "rejected" } | null>(null);
  const [form, setForm] = useState<Handover>({ id: 0, referenceCode: "", assetCode: "", assetName: "", recipient: "", department: "", date: "", status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null });
  const [supplyItems, setSupplyItems] = useState<HandoverSupplyItem[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("previewHandoverCreate") !== "1") return;
    setModal("create");
    params.delete("previewHandoverCreate");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);
  useEffect(() => { if (!handoversQuery.data) return; setHandovers(handoversQuery.data.map((item) => ({ id: item.id, referenceCode: item.referenceCode, assetCode: assignmentAssetsQuery.data?.find((asset) => asset.id === item.assetId)?.assetCode || `TS-${item.assetId}`, assetName: assignmentAssetsQuery.data?.find((asset) => asset.id === item.assetId)?.name || "Tài sản", recipient: item.recipientName, department: item.recipientDepartmentName || "Chưa xác định", date: new Date(item.handedOverAt).toLocaleDateString("vi-VN"), status: item.status === "active" ? "Đã bàn giao" : item.status === "pending_signature" ? "Chờ ký" : item.status === "returned" ? "Đã hoàn trả" : "Nháp", condition: item.conditionOut || "Tốt", handoverBy: item.handoverByName || "Quản trị viên", note: item.note || "", accessories: item.accessories || "", recipientSignatureUrl: item.recipientSignatureUrl, recoveryCertificateNumber: item.recoveryCertificateNumber, recoveryCertificateYear: item.recoveryCertificateYear, recoveryCertificateMonth: item.recoveryCertificateMonth, recoveryCertificateSequence: item.recoveryCertificateSequence }))); }, [handoversQuery.data, assignmentAssetsQuery.data]);
  useEffect(() => { if (!handoversQuery.data) return; setHandovers((current) => current.map((item) => { const source = handoversQuery.data.find((handover) => handover.id === item.id); return source ? { ...item, dueBackAt: source.dueBackAt, returnRequestStatus: source.returnRequestStatus, returnRequestedAt: source.returnRequestedAt, returnRequestNote: source.returnRequestNote } : item; })); }, [handoversQuery.data]);
  useEffect(() => {
    if (!assignmentAssetsQuery.data || !handoverBranchesQuery.data) return;
    setHandovers((current) => current.map((item) => {
      const asset = assignmentAssetsQuery.data.find((candidate) => candidate.assetCode === item.assetCode);
      const branch = asset?.branchId ? handoverBranchesQuery.data.find((candidate) => candidate.id === asset.branchId) : undefined;
      return { ...item, branch: branch?.name || "Chưa gán" };
    }));
  }, [assignmentAssetsQuery.data, handoverBranchesQuery.data]);
  useEffect(() => {
    const selectedHandoverId = Number(sessionStorage.getItem("assetmaster-open-handover-id"));
    if (!selectedHandoverId || handovers.length === 0) return;
    const handover = handovers.find((item) => item.id === selectedHandoverId);
    if (!handover) return;
    setSelected(handover);
    setModal("detail");
    sessionStorage.removeItem("assetmaster-open-handover-id");
  }, [handovers]);
  useEffect(() => {
    if (typeof window === "undefined" || handovers.length === 0) return;
    const handoverId = Number(new URLSearchParams(window.location.search).get("handoverId"));
    if (!Number.isInteger(handoverId) || handoverId <= 0) return;
    const handover = handovers.find((item) => item.id === handoverId);
    if (!handover) return;
    setSelected(handover);
    setModal("detail");
  }, [handovers]);
  useEffect(() => {
    const openRecoveryCertificate = (event: Event) => {
      const certificate = (event as CustomEvent<{ certificate?: string }>).detail?.certificate;
      if (!certificate) return;
      const handover = handovers.find((item) => item.recoveryCertificateNumber === certificate);
      if (!handover) {
        window.dispatchEvent(new CustomEvent("assetmaster-recovery-pdf-preparation-complete", { detail: { certificate, success: false } }));
        toast.error("Không tìm thấy phiếu tương ứng với mã biên bản thu hồi.");
        return;
      }
      void utils.handovers.get.fetch({ id: handover.id }).then((detail) => {
        const pdfItem: Handover = {
          ...handover,
          referenceCode: detail.referenceCode,
          assetCode: detail.assetCode,
          assetName: detail.assetName,
          recipient: detail.recipientName,
          department: detail.recipientDepartmentName || "Chưa xác định",
          date: new Date(detail.handedOverAt).toLocaleDateString("vi-VN"),
          returnedAt: detail.returnedAt,
          recoveryCertificateNumber: detail.recoveryCertificateNumber,
          recoveryCertificateYear: detail.recoveryCertificateYear,
          recoveryCertificateMonth: detail.recoveryCertificateMonth,
          recoveryCertificateSequence: detail.recoveryCertificateSequence,
          conditionIn: detail.conditionIn,
          condition: detail.conditionOut || "Tốt",
          handoverBy: detail.handoverByName || "Quản trị viên",
          note: detail.note || "",
          accessories: detail.accessories || "",
          supplyItems: detail.supplyItems,
        };
        return downloadAssetRecoveryPdf(pdfItem, companyInfo, { skipFilenamePrompt: true });
      }).then(() => {
        window.dispatchEvent(new CustomEvent("assetmaster-recovery-pdf-preparation-complete", { detail: { certificate, success: true } }));
        toast.success("Đã mở biên bản thu hồi. Bạn có thể in hoặc tải PDF từ màn hình xem trước.");
      }).catch(() => {
        window.dispatchEvent(new CustomEvent("assetmaster-recovery-pdf-preparation-complete", { detail: { certificate, success: false } }));
        toast.error("Không thể mở bản xem trước biên bản thu hồi.");
      });
    };
    window.addEventListener("assetmaster-open-recovery-certificate", openRecoveryCertificate);
    return () => window.removeEventListener("assetmaster-open-recovery-certificate", openRecoveryCertificate);
  }, [handovers, utils, companyInfo]);
  useEffect(() => {
    const onPreparationComplete = (event: Event) => {
      const certificate = (event as CustomEvent<{ certificate?: string }>).detail?.certificate;
      if (certificate) setPreparingRecoveryCertificate((current) => current === certificate ? null : current);
    };
    window.addEventListener("assetmaster-recovery-pdf-preparation-complete", onPreparationComplete);
    return () => window.removeEventListener("assetmaster-recovery-pdf-preparation-complete", onPreparationComplete);
  }, []);
  const requestRecoveryCertificate = (certificate: string) => {
    if (preparingRecoveryCertificate) return;
    setPreparingRecoveryCertificate(certificate);
    window.dispatchEvent(new CustomEvent("assetmaster-open-recovery-certificate", { detail: { certificate } }));
  };
  const handoverYears = Array.from(new Set(handovers.map((item) => item.referenceCode.match(/^BG-(\\d{4})-/)?.[1] || item.date.split("/").at(-1)).filter((year): year is string => Boolean(year)))).sort((left, right) => Number(right) - Number(left));
  const handoverDepartments = Array.from(new Set([...(handoverFilterDepartmentsQuery.data || []).map((department) => department.name), ...handovers.filter((item) => item.department === "Chưa xác định").map((item) => item.department)])).sort((left, right) => left.localeCompare(right, "vi"));
  const handoverDepartmentCounts = Object.fromEntries(handoverDepartments.map((department) => [department, handovers.filter((item) => item.department === department).length]));
  const handoverDepartmentOptionLabels = Object.fromEntries((handoverFilterDepartmentsQuery.data || []).map((department) => [department.name, department.isActive ? department.name : `${department.name} · Ngừng hoạt động`]));
  const visibleHandoverDepartments = handoverDepartments;
  const handoverBranches = Array.from(new Set([...(handoverBranchesQuery.data || []).map((branch) => branch.name), ...handovers.map((item) => item.branch || "Chưa gán")])).sort((left, right) => left.localeCompare(right, "vi"));
  const handoverRecipients = Array.from(new Set(handovers.map((item) => item.recipient).filter(Boolean))).sort((left, right) => left.localeCompare(right, "vi"));
  const filtered = handovers.filter((item) => {
    const itemYear = item.referenceCode.match(/^BG-(\d{4})-/)?.[1] || item.date.split("/").at(-1);
    const hasRecoveryCertificate = Boolean(item.recoveryCertificateNumber);
    const matchesStatus = statusFilter === "Tất cả trạng thái" || (statusFilter === "Đã có mã biên bản thu hồi" ? hasRecoveryCertificate : item.status === statusFilter);
    return matchesVietnameseSearch(`${item.referenceCode} ${item.recoveryCertificateNumber || ""}`, query) && matchesStatus && (handoverYearFilter === "Tất cả các năm" || itemYear === handoverYearFilter) && (handoverDepartmentFilter === "Tất cả phòng ban" || item.department === handoverDepartmentFilter) && (handoverBranchFilter === "Tất cả chi nhánh" || (item.branch || "Chưa gán") === handoverBranchFilter) && (handoverRecipientFilter === "Tất cả người nhận" || item.recipient === handoverRecipientFilter);
  });
  const hasActiveHandoverFilters = Boolean(query.trim()) || statusFilter !== "Tất cả trạng thái" || handoverYearFilter !== "Tất cả các năm" || handoverDepartmentFilter !== "Tất cả phòng ban" || handoverBranchFilter !== "Tất cả chi nhánh" || handoverRecipientFilter !== "Tất cả người nhận";
  const resetHandoverFilters = () => { setQuery(""); setStatusFilter("Tất cả trạng thái"); setHandoverYearFilter("Tất cả các năm"); setHandoverDepartmentFilter("Tất cả phòng ban"); setHandoverBranchFilter("Tất cả chi nhánh"); setHandoverRecipientFilter("Tất cả người nhận"); };
  const handoverPageSize = 10;
  const handoverTotalPages = Math.max(1, Math.ceil(filtered.length / handoverPageSize));
  const pagedHandovers = filtered.slice((handoverPage - 1) * handoverPageSize, handoverPage * handoverPageSize);
  useEffect(() => { setHandoverPage(1); }, [query, statusFilter, handoverYearFilter, handoverDepartmentFilter, handoverBranchFilter, handoverRecipientFilter]);
  useEffect(() => { setHandoverPage((current) => Math.min(current, handoverTotalPages)); }, [handoverTotalPages]);
  const exportHandovers = async () => {
    if (!filtered.length) { toast.info("Không có phiếu bàn giao phù hợp để xuất."); return; }
    setIsExportingHandovers(true);
    try {
      const rows = filtered.map((item) => ({ "Mã phiếu": item.referenceCode, "Mã tài sản": item.assetCode, "Tên tài sản": item.assetName, "Người nhận": item.recipient, "Phòng ban": item.department, "Chi nhánh": item.branch || "Chưa gán", "Ngày bàn giao": item.date, "Trạng thái": item.status, "Tình trạng khi giao": item.condition, "Người lập phiếu": item.handoverBy, "Ghi chú": item.note || "" }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 36 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Phiếu bàn giao");
      const yearSuffix = handoverYearFilter === "Tất cả các năm" ? "tat-ca-cac-nam" : handoverYearFilter;
      await writeBrandedWorkbook(workbook, {
        documentTitle: "DANH SÁCH PHIẾU BÀN GIAO",
        fileName: `danh-sach-phieu-ban-giao-${yearSuffix}.xlsx`,
        description: `Danh sách ${rows.length} phiếu bàn giao theo phạm vi lọc hiện tại.`,
      });
      toast.success(`Đã xuất ${rows.length} phiếu bàn giao.`);
    } finally { setIsExportingHandovers(false); }
  };
  const update = (key: keyof Handover, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const createHandover = () => { const asset = assignmentAssetsQuery.data?.find((item) => item.assetCode === form.assetCode); if (!form.recipient.trim() || !form.recipientUserId || !asset) { toast.error("Vui lòng chọn tài sản và nhân viên nhận hợp lệ."); return; } createHandoverMutation.mutate({ assetId: asset.id, recipientName: form.recipient, recipientDepartmentName: form.department || null, handedOverAt: Date.now(), dueBackAt: null, conditionOut: form.condition, accessories: form.accessories || null, supplyItems, note: form.note || null, recipientUserId: form.recipientUserId, recipientDepartmentId: form.recipientDepartmentId || null }); setModal(null); };
  const openCreate = () => { const firstAsset = assignmentAssetsQuery.data?.find((asset) => asset.status === "available"); if (!firstAsset) { toast.error("Cần có ít nhất một tài sản sẵn có trước khi lập phiếu bàn giao."); return; } setForm({ id: 0, referenceCode: "", assetCode: firstAsset.assetCode, assetName: firstAsset.name, recipient: "", department: "", date: new Date().toLocaleDateString("vi-VN"), status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null }); setSupplyItems([]); setModal("create"); };
  const statusClass: Record<Handover["status"], string> = { "Đã bàn giao": "bg-[#E6F6F2] text-[#087A6A] ring-[#B8E9DD]", "Chờ ký": "bg-[#FFF5DC] text-[#A86B00] ring-[#F2D596]", "Nháp": "bg-[#F0F5F8] text-[#60758A] ring-[#DDE7F0]", "Đã hoàn trả": "bg-[#EAF3FF] text-[#2666A8] ring-[#C7DDF8]" };
  const statusCount = (status: Handover["status"]) => handovers.filter((item) => item.status === status).length;
  const handoverDepartmentStats = useMemo(() => Array.from(handovers.reduce((counts, item) => counts.set(item.department || "Chưa xác định", (counts.get(item.department || "Chưa xác định") || 0) + 1), new Map<string, number>())).map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "vi")), [handovers]);
  const maxDepartmentCount = Math.max(1, ...handoverDepartmentStats.map((item) => item.count));
  const pendingReturnRequests = handovers.filter((item) => item.returnRequestStatus === "pending");
  const returnRequestKey = pendingReturnRequests.map((item) => `${item.id}-${item.returnRequestedAt?.toString() || ""}`).join("|");
  useEffect(() => {
    document.getElementById("assetmaster-return-request-queue")?.remove();
    if (!isAdmin || !pendingReturnRequests.length) return;
    const heading = Array.from(document.querySelectorAll("h2")).find((element) => element.textContent === "Danh sách phiếu bàn giao");
    const listPanel = heading?.closest("div.mt-8");
    if (!listPanel?.parentElement) return;
    const queue = document.createElement("section");
    queue.id = "assetmaster-return-request-queue";
    queue.className = "mb-5 overflow-hidden rounded-xl border border-[#F2D596] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]";
    const headingRow = document.createElement("div");
    headingRow.className = "flex items-center justify-between gap-3 border-b border-[#F6DEAF] bg-[#FFF9EB] px-5 py-4";
    headingRow.innerHTML = `<div><div class="text-sm font-extrabold text-[#8F5A00]">Yêu cầu hoàn trả chờ xử lý</div><p class="mt-1 text-xs text-[#9B7131]">Nhân viên đã chủ động gửi yêu cầu trả lại thiết bị.</p></div><div class="rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-[#A86B00]">${pendingReturnRequests.length} yêu cầu</div>`;
    queue.appendChild(headingRow);
    pendingReturnRequests.forEach((item) => {
      const row = document.createElement("div");
      row.className = "flex flex-col gap-3 border-b border-[#F6EBD2] px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between";
      const requestedAt = item.returnRequestedAt ? new Date(item.returnRequestedAt).toLocaleDateString("vi-VN") : "Hôm nay";
      row.innerHTML = `<div><div class="text-sm font-bold text-[#193B57]">${item.assetName}</div><div class="mt-1 font-mono text-[10px] font-bold text-[#0F8C8C]">${item.assetCode} · ${item.referenceCode}</div><div class="mt-2 text-xs text-[#71869A]">Người gửi: <b>${item.recipient}</b> · ${requestedAt}${item.returnRequestNote ? `<br/>Ghi chú: ${item.returnRequestNote}` : ""}</div></div>`;
      const actions = document.createElement("div");
      actions.className = "flex shrink-0 gap-2";
      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "rounded-lg border border-[#F2B7B7] px-3 py-2 text-xs font-bold text-[#B44545] hover:bg-[#FDEDEE]";
      rejectButton.textContent = "Từ chối";
      rejectButton.onclick = () => setReturnDecision({ item, decision: "rejected" });
      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.className = "rounded-lg bg-[#0F8C8C] px-3 py-2 text-xs font-bold text-white hover:bg-[#087A6A]";
      approveButton.textContent = "Duyệt hoàn trả";
      approveButton.onclick = () => setReturnDecision({ item, decision: "approved" });
      actions.append(rejectButton, approveButton);
      row.appendChild(actions);
      queue.appendChild(row);
    });
    listPanel.parentElement.insertBefore(queue, listPanel);
    return () => queue.remove();
  }, [isAdmin, returnRequestKey, resolveReturnRequest]);
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Assignment operations</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Bàn giao & Cấp phát</h1><p className="mt-1.5 max-w-xl text-sm text-[#71869A]">Theo dõi tài sản đang cấp phát, xác nhận người nhận và lưu trữ biên bản bàn giao.</p></div><div className="flex gap-2"><button onClick={() => showComingSoon("Quét QR để bàn giao")} className="hidden h-10 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] sm:flex"><QrCode size={16} />Quét mã QR</button><button disabled={!isAdmin || assignmentAssetsQuery.isLoading || recipientsQuery.isLoading} onClick={openCreate} className="flex h-10 items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />Tạo phiếu bàn giao</button></div></div><div className="lg:hidden"><button type="button" onClick={() => setHandoverKpisCollapsed((current) => !current)} aria-expanded={!handoverKpisCollapsed} aria-controls="handover-kpis" className="flex h-9 w-full items-center justify-between rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7]"><span>{handoverKpisCollapsed ? "Hiển thị KPI" : "Thu gọn KPI"}</span><ChevronDown size={15} className={`transition-transform ${handoverKpisCollapsed ? "" : "rotate-180"}`} /></button></div><div id="handover-kpis" className={`gap-3 sm:grid-cols-2 xl:grid-cols-4 ${handoverKpisCollapsed ? "hidden lg:grid" : "grid"}`}><AssignmentKpi label="Tổng phiếu" value={String(handovers.length)} icon={FileText} tone="navy" /><AssignmentKpi label="Đã bàn giao" value={String(statusCount("Đã bàn giao"))} icon={CheckCircle2} tone="teal" /><AssignmentKpi label="Chờ ký xác nhận" value={String(statusCount("Chờ ký"))} icon={Signature} tone="amber" /><AssignmentKpi label="Đã hoàn trả" value={String(statusCount("Đã hoàn trả"))} icon={Undo2} tone="blue" /></div><section className="mt-5"><HandoverSummaryCard title="Phiếu theo phòng ban" subtitle="Phân bổ số phiếu bàn giao theo đơn vị nhận tài sản." icon={Building2} items={handoverDepartmentStats} maxCount={maxDepartmentCount} tone="teal" emptyText="Chưa có dữ liệu phòng ban." /></section><div className="mt-8 overflow-visible rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="relative z-20 flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh sách phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Mỗi phiếu lưu lại tài sản, người nhận và trạng thái xác nhận.</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap"><div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã phiếu, tài sản..." className="h-9 w-full rounded-lg sm:w-[220px] border border-[#DDE7F0] bg-[#F7FAFC] pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={statusFilter} onChange={setStatusFilter} options={["Tất cả trạng thái", "Đã bàn giao", "Chờ ký", "Nháp", "Đã hoàn trả"]} /><FilterSelect value={handoverYearFilter} onChange={setHandoverYearFilter} options={["Tất cả các năm", ...handoverYears]} /><FilterSelect value={handoverDepartmentFilter} onChange={setHandoverDepartmentFilter} options={["Tất cả phòng ban", ...visibleHandoverDepartments]} counts={handoverDepartmentCounts} optionLabels={handoverDepartmentOptionLabels} /><SearchableSelect value={handoverBranchFilter} onChange={setHandoverBranchFilter} className="min-w-[180px] shrink-0" placeholder="Tất cả Chi nhánh" searchPlaceholder="Tìm tên Chi nhánh..." options={[{ value: "Tất cả chi nhánh", label: "Tất cả Chi nhánh" }, ...handoverBranches.map((branch) => ({ value: branch, label: branch }))]} /><FilterSelect value={handoverRecipientFilter} onChange={setHandoverRecipientFilter} options={["Tất cả người nhận", ...handoverRecipients]} /><button type="button" onClick={resetHandoverFilters} disabled={!hasActiveHandoverFilters} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-50"><X size={14} />Xóa bộ lọc</button><button type="button" onClick={exportHandovers} disabled={isExportingHandovers || filtered.length === 0} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} className={isExportingHandovers ? "animate-pulse" : ""} />{isExportingHandovers ? "Đang xuất..." : "Xuất Excel"}</button></div></div>{handoversQuery.isError ? <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5 text-sm"><div className="font-bold text-[#A86B00]">Không thể tải phiếu bàn giao</div><p className="mt-1 text-[#71869A]">{handoversQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p><button onClick={() => handoversQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button></div> : <><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[1000px] table-fixed border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="w-[168px] px-3 py-3.5">Mã phiếu</th><th className="px-4 py-3.5">Tài sản</th><th className="px-4 py-3.5">Chi nhánh</th><th className="px-4 py-3.5">Người nhận</th><th className="px-4 py-3.5">Ngày bàn giao</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody>{handoversQuery.isLoading && <tr><td colSpan={7}><ModalTableSkeleton rows={5} columns={7} /></td></tr>}{!handoversQuery.isLoading && pagedHandovers.map((item) => <tr key={item.id} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="w-[168px] px-3 py-4 align-top"><div data-handover-reference className="w-[144px] space-y-1"><span className="block overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] font-bold text-[#0F8C8C]" title={item.referenceCode}>{item.referenceCode}</span>{item.recoveryCertificateNumber && <button type="button" onClick={() => requestRecoveryCertificate(String(item.recoveryCertificateNumber))} disabled={preparingRecoveryCertificate === item.recoveryCertificateNumber} aria-busy={preparingRecoveryCertificate === item.recoveryCertificateNumber} title={`Mở biên bản thu hồi ${item.recoveryCertificateNumber}`} aria-label={`Mở biên bản thu hồi ${item.recoveryCertificateNumber}`} className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#FFF6D8] px-1.5 py-1 font-mono text-[9px] font-extrabold text-[#8F5A00] transition hover:bg-[#FFEDB8]">{preparingRecoveryCertificate === item.recoveryCertificateNumber ? <><Loader2 size={10} className="shrink-0 animate-spin" /><span className="overflow-hidden text-ellipsis whitespace-nowrap">Đang chuẩn bị PDF...</span></> : <><FileText size={10} className="shrink-0" /><span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.recoveryCertificateNumber}</span></>}</button>}</div></td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><PackageCheck size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{item.assetName}</div><div className="mt-0.5 font-mono text-[10px] text-[#9BAEC0]">{item.assetCode}</div></div></div></td><td className="px-4 py-4"><span className="inline-flex max-w-[190px] truncate rounded-full bg-[#F0F5F8] px-2.5 py-1 text-[10px] font-extrabold text-[#526779]" title={item.branch || "Chưa gán"}>{item.branch || "Chưa gán"}</span></td><td className="px-4 py-4"><div className="text-xs font-semibold text-[#60758A]">{item.recipient}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">{item.department}</div></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{item.date}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusClass[item.status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{item.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label="Xem biên bản"><FileText size={15} /></button><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Xuất biên bản"><Printer size={15} /></button><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Xem lịch sử"><History size={15} /></button></div></td></tr>)}</tbody></table>{!handoversQuery.isLoading && filtered.length === 0 && <ModuleEmptyState module="handover" title="Chưa có phiếu bàn giao phù hợp" description="Khi có phiếu mới hoặc bộ lọc được thay đổi, dữ liệu sẽ hiển thị tại đây." />}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EEF3] px-5 py-4 text-xs text-[#8AA0B6]"><span>Hiển thị <b className="text-[#60758A]">{filtered.length ? (handoverPage - 1) * handoverPageSize + 1 : 0}–{Math.min(handoverPage * handoverPageSize, filtered.length)}</b> / {filtered.length} phiếu</span><div className="flex items-center gap-2"><span className="font-semibold">Trang {handoverPage}/{handoverTotalPages}</span><button type="button" onClick={() => setHandoverPage((page) => Math.max(1, page - 1))} disabled={handoverPage === 1} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước">‹</button><button type="button" onClick={() => setHandoverPage((page) => Math.min(handoverTotalPages, page + 1))} disabled={handoverPage === handoverTotalPages} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] font-bold text-[#60758A] transition hover:bg-[#EAF3FF] hover:text-[#2666A8] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau">›</button></div></div></>}</div><div className="mt-5 flex items-center gap-3 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><ShieldCheck size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Quy trình kiểm soát bàn giao</div><div className="mt-0.5 text-[11px] text-[#4B8884]">Phiếu, chữ ký và trạng thái tài sản được lưu tập trung trong hệ thống.</div></div></div></div>{modal === "create" && <PersistedHandoverCreateModal form={form} assets={assignmentAssetsQuery.data || []} employees={recipientsQuery.data || []} departments={handoverDepartmentsQuery.data || []} supplies={handoverSuppliesQuery.data || []} supplyItems={supplyItems} onSupplyItemsChange={setSupplyItems} update={update} onRecipientChange={(userId) => { const recipient = recipientsQuery.data?.find((employee) => employee.id === userId); const departmentItem = recipient?.departmentId ? handoverDepartmentsQuery.data?.find((department) => department.id === recipient.departmentId) : undefined; setForm((current) => ({ ...current, recipientUserId: recipient?.id || null, recipient: recipient?.name || recipient?.email || "", recipientDepartmentId: departmentItem?.id || null, department: departmentItem?.name || "" })); }} onClose={() => setModal(null)} onSave={createHandover} saving={createHandoverMutation.isPending} />}{modal === "detail" && selected && <HandoverDetailModal item={selected} companyInfo={companyInfo} onClose={() => setModal(null)} onDataChanged={refreshHandoverData} autoOpenRecoveryCertificate={recoveryPdfRequest} onRecoveryPdfHandled={() => setRecoveryPdfRequest(null)} />}{returnDecision && <ReturnDecisionModal item={returnDecision.item} decision={returnDecision.decision} pending={resolveReturnRequest.isPending} onClose={() => setReturnDecision(null)} onSubmit={(payload) => resolveReturnRequest.mutate({ id: returnDecision.item.id, ...payload }, { onSuccess: () => setReturnDecision(null) })} />}</div>;
}

function HandoverSummaryCard({ title, subtitle, icon: Icon, items, maxCount, tone, emptyText }: { title: string; subtitle: string; icon: React.ElementType; items: Array<{ label: string; count: number }>; maxCount: number; tone: "teal" | "blue"; emptyText: string }) {
  const tones = tone === "teal" ? { icon: "bg-[#E6F6F2] text-[#0F8C8C]", bar: "bg-[#0F8C8C]", count: "text-[#087A6A]" } : { icon: "bg-[#EAF3FF] text-[#3278BD]", bar: "bg-[#3278BD]", count: "text-[#2666A8]" };
  return <section className="overflow-hidden rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tones.icon}`}><Icon size={17} /></div><div className="min-w-0"><h2 className="text-sm font-extrabold text-[#193B57]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-[#8AA0B6]">{subtitle}</p></div></div>{items.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#DDE7F0] bg-[#F8FBFC] px-3 py-5 text-center text-xs font-semibold text-[#8AA0B6]">{emptyText}</div> : <div className="mt-5 max-h-[220px] space-y-3 overflow-y-auto pr-1">{items.map((item) => <div key={item.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-semibold text-[#60758A]" title={item.label}>{item.label}</span><span className={`shrink-0 font-extrabold ${tones.count}`}>{item.count} phiếu</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EEF3F6]"><div className={`h-full rounded-full ${tones.bar} transition-[width] duration-300`} style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }} /></div></div>)}</div>}</section>;
}

function AssignmentKpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: string }) { const tones: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; return <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className={`grid h-10 w-10 place-items-center rounded-[11px] ${tones[tone]}`}><Icon size={19} /></div><div className="mt-5 text-[12px] font-semibold text-[#7890A5]">{label}</div><div className="mt-1 font-display text-[26px] font-extrabold tracking-[-0.04em] text-[#102A43]">{value}</div></div>; }

type ReturnDecisionPayload = {
  decision: "approved" | "rejected";
  conditionIn: string | null;
  resolution: string | null;
  returnedSupplyItems?: Array<{ handoverSupplyItemId: number; quantity: number }>;
  conditionPhoto: { fileName: string; contentType: "image/png" | "image/jpeg" | "image/webp"; dataUrl: string } | null;
};

function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function ReturnDecisionModal({ item, decision, pending, onClose, onSubmit }: { item: Handover; decision: "approved" | "rejected"; pending: boolean; onClose: () => void; onSubmit: (payload: ReturnDecisionPayload) => void }) {
  const [conditionIn, setConditionIn] = useState("Tốt");
  const [resolution, setResolution] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const approved = decision === "approved";
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const handoverDetailQuery = trpc.handovers.get.useQuery({ id: item.id }, { enabled: approved });
  useEffect(() => { const supplyItems = handoverDetailQuery.data?.supplyItems; if (!supplyItems?.length) return; setReturnQuantities((current) => Object.fromEntries(supplyItems.map((supplyItem: NonNullable<Handover["supplyItems"]>[number]) => [supplyItem.id, current[supplyItem.id] ?? String(Math.floor(Math.max(0, Number(supplyItem.issuedQuantity) - Number(supplyItem.returnedQuantity || 0))))]))); }, [handoverDetailQuery.data?.supplyItems]);
  useModalDismiss(onClose);
  const submit = () => {
    if (approved && !conditionIn.trim()) { toast.error("Vui lòng ghi nhận tình trạng thực tế của tài sản."); return; }
    const returnedSupplyItems = approved && handoverDetailQuery.data ? (handoverDetailQuery.data.supplyItems || []).map((supplyItem: NonNullable<Handover["supplyItems"]>[number]) => { const outstanding = Math.floor(Math.max(0, Number(supplyItem.issuedQuantity) - Number(supplyItem.returnedQuantity || 0))); return { handoverSupplyItemId: supplyItem.id, quantity: Math.min(outstanding, Math.floor(Math.max(0, Number(returnQuantities[supplyItem.id] ?? outstanding)))) }; }) : undefined;
    const base: Omit<ReturnDecisionPayload, "conditionPhoto"> = { decision, conditionIn: approved ? conditionIn.trim() : null, resolution: resolution.trim() || null, returnedSupplyItems };
    if (!photo) { onSubmit({ ...base, conditionPhoto: null }); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(photo.type)) { toast.error("Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP."); return; }
    if (photo.size > 5 * 1024 * 1024) { toast.error("Ảnh tình trạng không được vượt quá 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => onSubmit({ ...base, conditionPhoto: { fileName: photo.name, contentType: photo.type as "image/png" | "image/jpeg" | "image/webp", dataUrl: String(reader.result) } });
    reader.onerror = () => toast.error("Không thể đọc ảnh tình trạng đã chọn.");
    reader.readAsDataURL(photo);
  };
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }} className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102A43]/50 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.25)]">
      <div className={`border-b px-5 py-4 ${approved ? "border-[#CDE5E5] bg-[#ECF8F7]" : "border-[#F4D1D1] bg-[#FFF5F5]"}`}>
        <div className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${approved ? "text-[#087A6A]" : "text-[#B44545]"}`}>{approved ? "Xác nhận duyệt hoàn trả" : "Xác nhận từ chối hoàn trả"}</div>
        <h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{item.assetCode} · {item.assetName}</h2>
        <p className="mt-1 text-xs text-[#60758A]">{approved ? "Tài sản sẽ trở về trạng thái sẵn có sau khi xác nhận." : "Nhân viên sẽ nhận được kết quả và có thể gửi giải trình bổ sung."}</p>
      </div>
      <div className="space-y-4 p-5">
        {approved ? <>
          <label className="block text-xs font-bold text-[#60758A]">Tình trạng thực tế khi nhận lại <span className="text-[#B44545]">*</span><input value={conditionIn} onChange={(event) => setConditionIn(event.target.value)} className="field-input mt-2" placeholder="Ví dụ: Tốt" autoFocus /></label>
          {handoverDetailQuery.isLoading ? <div className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-3 text-xs text-[#71869A]">Đang tải phụ kiện để đối chiếu...</div> : <PartialAccessoryReturnPanel supplyItems={(handoverDetailQuery.data?.supplyItems || []) as NonNullable<Handover["supplyItems"]>} quantities={returnQuantities} onQuantityChange={(id, quantity) => setReturnQuantities((current) => ({ ...current, [id]: quantity }))} />}
          <label className="block text-xs font-bold text-[#60758A]">Ảnh tình trạng <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-[#60758A] file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF3FF] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2666A8]" /></label>
        </> : <label className="block text-xs font-bold text-[#60758A]">Lý do từ chối <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><textarea value={resolution} onChange={(event) => setResolution(event.target.value)} className="field-input mt-2 min-h-[100px] resize-y" placeholder="Nêu rõ thông tin nhân viên cần bổ sung..." maxLength={1000} autoFocus /></label>}
        <div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] disabled:opacity-50">Hủy</button><button type="button" onClick={submit} disabled={pending || (approved && handoverDetailQuery.isLoading)} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${approved ? "bg-[#0F8C8C] hover:bg-[#087A6A]" : "bg-[#B44545] hover:bg-[#933737]"}`}>{pending ? "Đang xử lý..." : approved ? "Xác nhận duyệt" : "Xác nhận từ chối"}</button></div>
      </div>
    </div>
  </div>;
}

function HandoverCreateModal({ form, assets, update, onClose, onSave, saving }: { form: Handover; assets: Array<{ assetCode: string; name: string; status: string }>; update: (key: keyof Handover, value: string) => void; onClose: () => void; onSave: () => void; saving: boolean }) { const availableAssets = assets.filter((asset) => asset.status === "available"); return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">New handover record</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">Tạo phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Ghi nhận tài sản, người nhận và điều kiện bàn giao.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="mb-5 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#0F8C8C]"><PackageCheck size={17} /></div><div><div className="text-xs font-bold text-[#087A6A]">Tài sản được cấp phát</div><div className="mt-0.5 text-xs font-semibold text-[#193B57]">{form.assetName} <span className="font-mono text-[10px] text-[#0F8C8C]">· {form.assetCode}</span></div></div></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label">Tài sản <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.assetCode} onChange={(value) => { const asset = availableAssets.find((candidate) => candidate.assetCode === value); update("assetCode", value); update("assetName", asset?.name || ""); }} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...availableAssets.map((asset) => ({ value: asset.assetCode, label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} /></div><div><label className="field-label">Người nhận <span className="text-[#0F8C8C]">*</span></label><input value={form.recipient} onChange={(e) => update("recipient", e.target.value)} placeholder="Nhập họ tên người nhận" className="field-input" /></div><div><label className="field-label">Phòng ban <span className="text-[#0F8C8C]">*</span></label><input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Ví dụ: Phòng Kinh doanh" className="field-input" /></div><div><label className="field-label">Ngày bàn giao</label><input value={form.date} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><div><label className="field-label">Tình trạng tài sản</label><SearchableSelect value={form.condition} onChange={(value) => update("condition", value)} searchPlaceholder="Tìm tình trạng..." options={[{ value: "Tốt", label: "Tốt" }, { value: "Có hao mòn nhẹ", label: "Có hao mòn nhẹ" }, { value: "Cần kiểm tra", label: "Cần kiểm tra" }]} /></div><div className="sm:col-span-2"><label className="field-label">Phụ kiện đi kèm</label><input value={form.accessories} onChange={(e) => update("accessories", e.target.value)} placeholder="Ví dụ: Sạc, túi chống sốc, chuột không dây" className="field-input" /></div><div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung lưu ý khi bàn giao..." className="field-input min-h-[76px] resize-y" /></div></div><div className="mt-4 grid gap-3 rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã kiểm tra ngoại quan</label><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã hướng dẫn sử dụng</label></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button disabled={saving || availableAssets.length === 0} onClick={onSave} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu phiếu nháp"}</button></div></div></div></div>; }

function HandoverBranchAutoField({ selectedRecipient, selectedBranch, isLoading, isError, onRetry }: { selectedRecipient?: { id: number } | undefined; selectedBranch?: { code: string; name: string } | undefined; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  const branchValue = isLoading ? "Đang tải Chi nhánh..." : isError ? "Không thể tải Chi nhánh" : selectedRecipient ? selectedBranch ? `${selectedBranch.name} · ${selectedBranch.code}` : "Chưa gán Chi nhánh" : "Chọn nhân viên để tự điền";
  return <div data-handover-branch-field><label className="field-label">Chi nhánh</label><div aria-live="polite" className={`field-input flex items-center bg-[#F5F8FB] ${isError ? "border-[#F2C6A2] text-[#B44545]" : "text-[#60758A]"}`}><span className="truncate">{branchValue}</span></div>{selectedRecipient && !isLoading && !isError && <p className="mt-1 text-[10px] text-[#8AA0B6]">Tự động lấy theo hồ sơ nhân sự.</p>}{isError && <button type="button" onClick={onRetry} className="mt-1 text-[10px] font-bold text-[#B44545] underline">Thử lại</button>}</div>;
}

function PersistedHandoverCreateModal({ form, assets, employees, departments, supplies, supplyItems, onSupplyItemsChange, update, onRecipientChange, onClose: dismiss, onSave, saving }: { form: Handover; assets: Array<{ assetCode: string; name: string; status: string }>; employees: Array<{ id: number; name: string | null; email: string | null; departmentId: number | null; branchId: number | null; isActive: boolean }>; departments: Array<{ id: number; name: string }>; supplies: Array<{ id: number; code: string; name: string; unit: string; stockQuantity: string | number; isActive: boolean }>; supplyItems: HandoverSupplyItem[]; onSupplyItemsChange: (items: HandoverSupplyItem[]) => void; update: (key: keyof Handover, value: string) => void; onRecipientChange: (userId: number) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  const availableAssets = assets.filter((asset) => asset.status === "available");
  const recipients = employees.filter((employee) => employee.isActive);
  const activeSupplies = supplies.filter((supply) => supply.isActive && Number(supply.stockQuantity) > 0);
  const selectedDepartment = departments.find((department) => department.id === form.recipientDepartmentId);
  const handoverBranchesQuery = trpc.branches.list.useQuery();
  const selectedRecipient = recipients.find((employee) => employee.id === form.recipientUserId);
  const selectedBranch = selectedRecipient?.branchId ? handoverBranchesQuery.data?.find((branch) => branch.id === selectedRecipient.branchId) : undefined;
  const nextReferenceQuery = trpc.handovers.nextReferenceCode.useQuery();
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [selectedSupplyQuantity, setSelectedSupplyQuantity] = useState("1");
  const initialFormRef = useRef(JSON.stringify(form));
  const addSupplyItem = () => {
    const supplyId = Number(selectedSupplyId);
    const quantity = Number(selectedSupplyQuantity);
    const supply = activeSupplies.find((item) => item.id === supplyId);
    if (!supply || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Chọn phụ kiện và nhập số lượng hợp lệ."); return; }
    const existing = supplyItems.find((item) => item.supplyId === supplyId);
    const total = (existing?.quantity || 0) + quantity;
    if (total > Number(supply.stockQuantity)) { toast.error(`Tồn kho ${supply.name} chỉ còn ${supply.stockQuantity} ${supply.unit}.`); return; }
    onSupplyItemsChange(existing ? supplyItems.map((item) => item.supplyId === supplyId ? { ...item, quantity: total } : item) : [...supplyItems, { supplyId, quantity }]);
    setSelectedSupplyId("");
    setSelectedSupplyQuantity("1");
  };
  const onClose = () => {
    if (initialFormRef.current !== JSON.stringify(form)) { toast.warning("Đóng phiếu chưa lưu?", { description: "Thông tin bàn giao đang nhập sẽ bị hủy.", action: { label: "Bỏ thay đổi", onClick: dismiss } }); return; }
    dismiss();
  };
  useModalDismiss(onClose);
  useEffect(() => {
    const dateLabel = Array.from(document.querySelectorAll("label")).find((label) => label.textContent?.trim() === "Ngày lập phiếu");
    const dateField = dateLabel?.parentElement;
    if (!dateField) return;
    let preview = dateField.parentElement?.querySelector<HTMLElement>("[data-handover-reference-preview]");
    const created = !preview;
    if (!preview) {
      preview = document.createElement("div");
      preview.dataset.handoverReferencePreview = "true";
      preview.className = "sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-3.5 py-3";
      dateField.parentElement?.append(preview);
    }
    const code = nextReferenceQuery.data?.referenceCode;
    preview.innerHTML = `<span class="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]">Mã BG dự kiến</span><span class="font-mono text-sm font-extrabold text-[#0F8C8C]">${code || (nextReferenceQuery.isError ? "Chưa thể lấy mã" : "Đang lấy mã...")}</span>`;
    return () => { if (created) preview?.remove(); };
  }, [nextReferenceQuery.data?.referenceCode, nextReferenceQuery.isError]);
  useEffect(() => {
    const recipientLabel = Array.from(document.querySelectorAll("label")).find((label) => label.textContent?.includes("Nhân viên nhận"));
    const container = recipientLabel?.parentElement;
    const select = container?.querySelector("select");
    if (!container || !select || container.querySelector("[data-recipient-search-picker]")) return;

    select.classList.add("hidden");
    const picker = document.createElement("div");
    picker.dataset.recipientSearchPicker = "true";
    picker.className = "relative";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "field-input flex w-full items-center justify-between gap-2 text-left";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const triggerText = document.createElement("span");
    const selectedEmployee = recipients.find((employee) => employee.id === form.recipientUserId);
    triggerText.textContent = selectedEmployee?.name || selectedEmployee?.email || "Chọn nhân viên";
    const triggerIcon = document.createElement("span");
    triggerIcon.className = "text-base text-[#60758A]";
    triggerIcon.textContent = "⌄";
    trigger.append(triggerText, triggerIcon);

    const menu = document.createElement("div");
    menu.className = "absolute z-[70] mt-1 hidden w-full overflow-hidden rounded-xl border border-[#CDE5E5] bg-white p-2 shadow-[0_14px_34px_rgba(16,42,67,0.16)]";
    menu.setAttribute("role", "listbox");
    const search = document.createElement("input");
    search.type = "search";
    search.className = "h-9 w-full rounded-lg border border-[#DDE7F0] bg-[#FBFCFD] px-3 text-xs font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]";
    search.placeholder = "Tìm tên hoặc email nhân viên...";
    search.setAttribute("aria-label", "Tìm Nhân viên nhận");
    const options = document.createElement("div");
    options.className = "mt-2 max-h-52 overflow-y-auto";
    const renderOptions = (keyword = "") => {
      const matches = recipients.filter((employee) => matchesVietnameseSearch(`${employee.name || ""} ${employee.email || ""}`, keyword));
      options.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "px-3 py-3 text-center text-xs font-semibold text-[#8AA0B6]";
        empty.textContent = "Không tìm thấy nhân viên phù hợp";
        options.appendChild(empty);
      }
      matches.forEach((employee) => {
        const option = document.createElement("button");
        option.type = "button";
        option.setAttribute("role", "option");
        option.className = `flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-[#ECF8F7] ${employee.id === form.recipientUserId ? "bg-[#E6F6F2]" : ""}`;
        const name = document.createElement("span");
        name.className = "text-xs font-bold text-[#193B57]";
        name.textContent = employee.name || employee.email || `Nhân viên #${employee.id}`;
        option.appendChild(name);
        if (employee.email) { const email = document.createElement("span"); email.className = "mt-0.5 text-[10px] text-[#71869A]"; email.textContent = employee.email; option.appendChild(email); }
        option.onclick = () => { select.value = String(employee.id); select.dispatchEvent(new Event("change", { bubbles: true })); menu.classList.add("hidden"); trigger.setAttribute("aria-expanded", "false"); };
        options.appendChild(option);
      });
    };
    renderOptions();
    search.oninput = () => renderOptions(search.value);
    trigger.onclick = () => {
      const isOpen = !menu.classList.contains("hidden");
      menu.classList.toggle("hidden", isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
      if (!isOpen) window.setTimeout(() => search.focus(), 0);
    };
    const closeOnOutside = (event: PointerEvent) => { if (!picker.contains(event.target as Node)) { menu.classList.add("hidden"); trigger.setAttribute("aria-expanded", "false"); } };
    document.addEventListener("pointerdown", closeOnOutside);
    picker.append(trigger, menu);
    menu.append(search, options);
    select.after(picker);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); picker.remove(); select.classList.remove("hidden"); };
  }, [recipients, form.recipientUserId]);
  useEffect(() => {
    const accessoryLabel = Array.from(document.querySelectorAll<HTMLLabelElement>("label")).find((label) => label.textContent?.trim() === "Phụ kiện đi kèm");
    const field = accessoryLabel?.parentElement;
    if (!field || field.querySelector("[data-handover-supply-picker]")) return;
    accessoryLabel.textContent = "Phụ kiện ghi tay (không trừ kho)";
    const panel = document.createElement("div");
    panel.dataset.handoverSupplyPicker = "true";
    panel.className = "mb-3 rounded-xl border border-[#CDE5E5] bg-[#F8FCFC] p-3";
    panel.innerHTML = '<div class="flex items-start justify-between gap-3"><div><div class="text-xs font-extrabold text-[#087A6A]">Phụ kiện lấy từ kho</div><p class="mt-0.5 text-[10px] text-[#4B8884]">Số lượng sẽ tự trừ khỏi kho khi tạo phiếu.</p></div></div>';
    const controls = document.createElement("div");
    controls.className = "mt-3 grid gap-2 sm:grid-cols-[1fr_92px_auto]";
    const supplySelect = document.createElement("select");
    supplySelect.className = "h-9 min-w-0 rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]";
    supplySelect.setAttribute("aria-label", "Chọn phụ kiện từ kho");
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = activeSupplies.length ? "Chọn phụ kiện trong kho..." : "Kho phụ kiện không còn hàng"; supplySelect.append(placeholder);
    activeSupplies.forEach((supply) => { const option = document.createElement("option"); option.value = String(supply.id); option.textContent = `${supply.code} · ${supply.name} (còn ${supply.stockQuantity} ${supply.unit})`; supplySelect.append(option); });
    const quantityInput = document.createElement("input");
    quantityInput.type = "number"; quantityInput.min = "0.01"; quantityInput.step = "0.01"; quantityInput.value = "1"; quantityInput.className = "h-9 rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]"; quantityInput.setAttribute("aria-label", "Số lượng phụ kiện");
    const addButton = document.createElement("button");
    addButton.type = "button"; addButton.textContent = "Thêm"; addButton.disabled = !activeSupplies.length; addButton.className = "h-9 rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50";
    const list = document.createElement("div"); list.className = "mt-3 space-y-1.5";
    const renderList = () => {
      list.replaceChildren();
      if (!supplyItems.length) { const empty = document.createElement("div"); empty.className = "rounded-lg border border-dashed border-[#CDE5E5] bg-white px-3 py-2 text-[10px] font-semibold text-[#8AA0B6]"; empty.textContent = "Chưa chọn phụ kiện từ kho."; list.append(empty); return; }
      supplyItems.forEach((item) => {
        const supply = supplies.find((candidate) => candidate.id === item.supplyId);
        if (!supply) return;
        const row = document.createElement("div"); row.className = "flex items-center justify-between gap-2 rounded-lg border border-[#DDE7F0] bg-white px-3 py-2";
        row.innerHTML = `<span class="min-w-0 truncate text-[11px] font-bold text-[#193B57]">${supply.code} · ${supply.name}</span><span class="shrink-0 text-[10px] font-extrabold text-[#2666A8]">× ${item.quantity} ${supply.unit}</span>`;
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.className = "ml-1 grid h-5 w-5 place-items-center rounded text-sm text-[#B44545] hover:bg-[#FDEDEE]"; remove.title = `Bỏ ${supply.name}`; remove.onclick = () => onSupplyItemsChange(supplyItems.filter((candidate) => candidate.supplyId !== item.supplyId)); row.append(remove); list.append(row);
      });
    };
    addButton.onclick = () => {
      const supplyId = Number(supplySelect.value); const quantity = Number(quantityInput.value); const supply = activeSupplies.find((item) => item.id === supplyId);
      if (!supply || !Number.isFinite(quantity) || quantity <= 0) { toast.error("Chọn phụ kiện và nhập số lượng hợp lệ."); return; }
      const currentQuantity = supplyItems.find((item) => item.supplyId === supplyId)?.quantity || 0;
      if (currentQuantity + quantity > Number(supply.stockQuantity)) { toast.error(`Tồn kho ${supply.name} chỉ còn ${supply.stockQuantity} ${supply.unit}.`); return; }
      onSupplyItemsChange(supplyItems.some((item) => item.supplyId === supplyId) ? supplyItems.map((item) => item.supplyId === supplyId ? { ...item, quantity: item.quantity + quantity } : item) : [...supplyItems, { supplyId, quantity }]);
    };
    controls.append(supplySelect, quantityInput, addButton); panel.append(controls, list); field.before(panel); renderList();
    return () => { accessoryLabel.textContent = "Phụ kiện đi kèm"; panel.remove(); };
  }, [activeSupplies, supplyItems, supplies, onSupplyItemsChange]);
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">Dữ liệu bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">Tạo phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Người nhận được liên kết với hồ sơ nhân viên để cập nhật lịch sử tài sản.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div><div className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label">Tài sản <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.assetCode} onChange={(value) => { const asset = availableAssets.find((candidate) => candidate.assetCode === value); update("assetCode", value); update("assetName", asset?.name || ""); }} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...availableAssets.map((asset) => ({ value: asset.assetCode, label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} /></div><div className="sm:col-span-2"><label className="field-label">Nhân viên nhận <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.recipientUserId ? String(form.recipientUserId) : ""} onChange={(value) => onRecipientChange(Number(value))} placeholder="Chọn nhân viên" searchPlaceholder="Tìm tên hoặc email nhân viên..." options={[{ value: "", label: "Chọn nhân viên" }, ...recipients.map((employee) => ({ value: String(employee.id), label: employee.name || employee.email || `Nhân viên #${employee.id}`, searchText: employee.email || "" }))]} /></div><div><label className="field-label">Phòng ban</label><input value={selectedDepartment?.name || form.department || "Chưa gán phòng ban"} disabled className="field-input bg-[#F5F8FB] text-[#60758A]" /></div><HandoverBranchAutoField selectedRecipient={selectedRecipient} selectedBranch={selectedBranch} isLoading={handoverBranchesQuery.isLoading} isError={handoverBranchesQuery.isError} onRetry={() => { void handoverBranchesQuery.refetch(); }} /><div><label className="field-label">Tình trạng tài sản</label><SearchableSelect value={form.condition} onChange={(value) => update("condition", value)} searchPlaceholder="Tìm tình trạng..." options={[{ value: "Tốt", label: "Tốt" }, { value: "Có hao mòn nhẹ", label: "Có hao mòn nhẹ" }, { value: "Cần kiểm tra", label: "Cần kiểm tra" }]} /></div><div><label className="field-label">Ngày lập phiếu</label><input value={form.date} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><div className="sm:col-span-2"><label className="field-label">Hạn dự kiến hoàn trả</label><DatePickerField value={form.dueBackAt ? new Date(form.dueBackAt).toISOString().slice(0, 10) : ""} onChange={(value) => update("dueBackAt", value)} aria-label="Hạn dự kiến hoàn trả" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Hiển thị cho nhân viên tại tài sản đang giữ.</p></div><div className="sm:col-span-2"><label className="field-label">Phụ kiện đi kèm</label><input value={form.accessories} onChange={(e) => update("accessories", e.target.value)} placeholder="Ví dụ: Sạc, túi chống sốc, chuột không dây" className="field-input" /></div><div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung lưu ý khi bàn giao..." className="field-input min-h-[76px] resize-y" /></div></div>{recipients.length === 0 && <div className="rounded-lg bg-[#FFF9EB] p-3 text-xs text-[#A86B00]">Chưa có nhân viên đang hoạt động để nhận tài sản.</div>}{confirmCreate && <div className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-xs text-[#8F5A00]">Vui lòng kiểm tra lại tài sản, người nhận và tình trạng. Nhấn <b>Xác nhận tạo</b> để lưu phiếu.</div>}<div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={() => confirmCreate ? setConfirmCreate(false) : onClose()} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">{confirmCreate ? "Quay lại chỉnh sửa" : "Hủy"}</button><button disabled={saving || !form.recipientUserId || availableAssets.length === 0} onClick={() => confirmCreate ? onSave() : setConfirmCreate(true)} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : confirmCreate ? "Xác nhận tạo" : "Lưu phiếu nháp"}</button></div></div></div></div>;
}

function HandoverDetailModalLegacy({ item, onClose, onPrint, onHistory }: { item: Handover; onClose: () => void; onPrint: () => void; onHistory: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">Biên bản chi tiết và lịch sử người nhận của tài sản.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button><button onClick={onPrint} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />In biên bản</button><button onClick={() => toast.success("Đã gửi yêu cầu ký xác nhận.")} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi ký xác nhận</button></div></div></div></div>; }

async function loadImageData(url: string) { const response = await fetch(url); if (!response.ok) throw new Error("Không thể tải ảnh dùng cho biên bản."); const blob = await response.blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }

async function loadHandoverPdfFont() { const response = await fetch(handoverPdfFontUrl); if (!response.ok) throw new Error("Không thể tải phông chữ tiếng Việt cho biên bản."); return response.arrayBuffer(); }

function drawHandoverBrandMark(doc: jsPDF, x: number, y: number, logoDataUrl?: string) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", x, y - 12, 18, 18, undefined, "FAST");
      return;
    } catch {
      // Fall back to the branded vector mark when the configured image cannot be embedded.
    }
  }
  doc.setFillColor(15, 140, 140);
  doc.roundedRect(x, y - 12, 18, 18, 3, 3, "F");
  doc.setFillColor(16, 42, 67);
  doc.roundedRect(x + 3, y - 9, 12, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text("AM", x + 9, y - 1, { align: "center" });
}

async function downloadHandoverPdf(item: Handover, signature: string | undefined, companyInfo: CompanyInfo) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontBuffer = await loadHandoverPdfFont();
  registerVietnamesePdfFont(doc, fontBuffer);
  const logoDataUrl = companyInfo.logoUrl ? await loadImageData(companyInfo.logoUrl).catch(() => undefined) : undefined;
  const left = 18;
  const header = drawPdfCorporateHeader(doc, companyInfo, { logoDataUrl, left, right: 192 });
  let y = header.contentY + 4;
  doc.setFontSize(15);
  doc.text("BIÊN BẢN BÀN GIAO TÀI SẢN", 105, y, { align: "center" });
  y += 12;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(14);
  doc.text(`Số phiếu: ${item.referenceCode}`, left, y);
  y += 12;
  doc.setFontSize(10);
  const rows = [
    ["Tài sản", `${item.assetName} (${item.assetCode})`],
    ["Chi nhánh", item.branch || "Chưa gán"],
    ["Người nhận", item.recipient],
    ["Phòng ban", item.department],
    ["Ngày bàn giao", item.date],
    ["Người lập", item.handoverBy],
    ["Tình trạng", item.condition],
    ["Phụ kiện", item.accessories || "Không có"],
    ["Ghi chú", item.note || "Không có"],
    ["Trạng thái", item.status],
  ];
  rows.forEach(([label, value]) => {
    const wrappedValue = doc.splitTextToSize(String(value), 118);
    doc.setTextColor(112, 134, 154);
    doc.text(label, left, y);
    doc.setTextColor(25, 59, 87);
    doc.text(wrappedValue, 70, y);
    y += Math.max(9, wrappedValue.length * 5 + 3);
  });
  y += 8;
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, 192, y);
  y += 15;
  doc.setFontSize(11);
  doc.text("XÁC NHẬN CỦA CÁC BÊN", left, y);
  y += 8;
  const recipientSignatureCenter = 150;
  const recipientSignatureWidth = 52;
  doc.setFontSize(9);
  doc.setTextColor(112, 134, 154);
  doc.text("Người giao", left + 18, y);
  doc.text("Người nhận", recipientSignatureCenter, y, { align: "center" });
  if (signature) {
    try {
      const signatureImage = signature.startsWith("data:image/") ? signature : await loadImageData(signature);
      doc.addImage(signatureImage, recipientSignatureCenter - recipientSignatureWidth / 2, y + 4, recipientSignatureWidth, 24);
    } catch {
      // The biên bản remains downloadable even when a stored signature cannot be retrieved.
    }
  }
  doc.setTextColor(25, 59, 87);
  doc.text(item.handoverBy, left + 12, y + 39);
  doc.text(item.recipient, recipientSignatureCenter, y + 39, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(138, 160, 182);
  doc.text(`Biên bản được tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 282);
  const watermark = await createPdfLogoWatermark(companyInfo.logoUrl).catch(() => null);
  applyPdfLogoWatermark(doc, watermark);
  drawPdfCorporateFooter(doc, companyInfo, "Biên bản bàn giao tài sản");
  openPdfPreview(doc, `${item.referenceCode}-phieu-cap-phat-tai-san.pdf`, `Phiếu cấp phát tài sản ${item.referenceCode}`);
}

async function downloadAssetRecoveryPdf(item: Handover, companyInfo: CompanyInfo, options?: { skipFilenamePrompt?: boolean }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerVietnamesePdfFont(doc, await loadHandoverPdfFont());
  const logoDataUrl = companyInfo.logoUrl ? await loadImageData(companyInfo.logoUrl).catch(() => undefined) : undefined;
  const left = 18;
  const right = 192;
  const header = drawPdfCorporateHeader(doc, companyInfo, { logoDataUrl, left, right, fallbackName: "Doanh nghiệp" });
  let y = header.contentY + 4;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(15);
  doc.text("BIÊN BẢN THU HỒI TÀI SẢN", 105, y, { align: "center" });
  y += 12;
  doc.setFontSize(9);
  doc.setTextColor(112, 134, 154);
  doc.text(`Căn cứ theo phiếu bàn giao: ${item.referenceCode}`, 105, y, { align: "center" });
  y += 13;
  const rows = [
    ["Số biên bản thu hồi", item.recoveryCertificateNumber || "Đang cấp số"],
    ["Tài sản", `${item.assetName} (${item.assetCode})`],
    ["Người bàn giao lại", item.recipient],
    ["Phòng Ban", item.department],
    ["Ngày bàn giao", item.date],
    ["Ngày thu hồi", item.returnedAt ? new Date(item.returnedAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")],
    ["Tình trạng khi nhận", item.conditionIn || "Chưa cập nhật"],
    ["Ghi chú", item.note || "Không có"],
  ];
  doc.setFontSize(9.5);
  rows.forEach(([label, value]) => {
    const wrapped = doc.splitTextToSize(String(value), 120);
    doc.setTextColor(112, 134, 154);
    doc.text(label, left, y);
    doc.setTextColor(25, 59, 87);
    doc.text(wrapped, 72, y);
    y += Math.max(8, wrapped.length * 4.5 + 2.5);
  });
  y += 5;
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, right, y);
  y += 10;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(11);
  doc.text("DANH SÁCH PHỤ KIỆN THỰC TẾ", left, y);
  y += 7;
  const columns = { name: left, issued: 112, returned: 139, outstanding: 166 };
  doc.setFillColor(240, 248, 247);
  doc.roundedRect(left, y - 5, right - left, 8, 1.5, 1.5, "F");
  doc.setTextColor(8, 122, 106);
  doc.setFontSize(8);
  doc.text("Phụ kiện", columns.name + 2, y);
  doc.text("Đã cấp", columns.issued, y, { align: "right" });
  doc.text("Đã hoàn", columns.returned, y, { align: "right" });
  doc.text("Còn giữ", columns.outstanding, y, { align: "right" });
  y += 8;
  const supplyItems = item.supplyItems || [];
  if (!supplyItems.length) {
    doc.setTextColor(112, 134, 154);
    doc.setFontSize(9);
    doc.text("Không có phụ kiện được lấy từ kho kèm theo phiếu này.", left, y + 2);
    y += 12;
  } else {
    supplyItems.forEach((supplyItem) => {
      const issued = Number(supplyItem.issuedQuantity);
      const returned = Number(supplyItem.returnedQuantity || 0);
      const outstanding = Math.max(0, issued - returned);
      const lines = doc.splitTextToSize(`${supplyItem.supplyName} (${supplyItem.supplyCode})`, 82);
      const rowHeight = Math.max(8, lines.length * 4 + 3);
      if (y + rowHeight > 255) { doc.addPage(); y = 22; }
      doc.setDrawColor(232, 238, 243);
      doc.line(left, y + rowHeight - 2, right, y + rowHeight - 2);
      doc.setTextColor(25, 59, 87);
      doc.setFontSize(8.5);
      doc.text(lines, columns.name + 2, y + 2);
      doc.setTextColor(96, 117, 138);
      doc.text(`${issued} ${supplyItem.unit}`, columns.issued, y + 2, { align: "right" });
      doc.setTextColor(8, 122, 106);
      doc.text(`${returned} ${supplyItem.unit}`, columns.returned, y + 2, { align: "right" });
      doc.setTextColor(outstanding > 0 ? 168 : 8, outstanding > 0 ? 107 : 122, outstanding > 0 ? 0 : 106);
      doc.text(`${outstanding} ${supplyItem.unit}`, columns.outstanding, y + 2, { align: "right" });
      y += rowHeight;
    });
  }
  y += 10;
  if (y > 240) { doc.addPage(); y = 28; }
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, right, y);
  y += 13;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(10);
  doc.text("XÁC NHẬN THU HỒI", left, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(112, 134, 154);
  doc.text("Người bàn giao lại", left + 18, y);
  doc.text("Người thu hồi / Đại diện đơn vị", 125, y);
  doc.setTextColor(25, 59, 87);
  doc.text(item.recipient, left + 10, y + 33);
  doc.text(item.handoverBy || "Quản trị viên", 119, y + 33);
  const watermark = await createPdfLogoWatermark(companyInfo.logoUrl).catch(() => null);
  applyPdfLogoWatermark(doc, watermark);
  drawPdfCorporateFooter(doc, companyInfo, "Biên bản thu hồi tài sản");
  const recoveryCertificateNumber = item.recoveryCertificateNumber || item.referenceCode;
  openPdfPreview(doc, `${recoveryCertificateNumber}-bien-ban-thu-hoi-tai-san.pdf`, `Biên bản thu hồi tài sản ${recoveryCertificateNumber}`, { skipFilenamePrompt: options?.skipFilenamePrompt });
}

async function downloadAssetRetirementPdf(asset: Asset, companyInfo: CompanyInfo) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerVietnamesePdfFont(doc, await loadHandoverPdfFont());
  const logoDataUrl = companyInfo.logoUrl ? await loadImageData(companyInfo.logoUrl).catch(() => undefined) : undefined;
  const left = 18;
  const header = drawPdfCorporateHeader(doc, companyInfo, { logoDataUrl, left, right: 192 });
  let y = header.contentY + 4;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(15);
  doc.text("BIÊN BẢN KHẤU HAO / THANH LÝ TÀI SẢN", 105, y, { align: "center" });
  y += 14;
  doc.setFontSize(10);
  const rows = [
    ["Số biên bản thanh lý", asset.retirementCertificateNumber || "Đang cấp số"],
    ["Mã tài sản", asset.code],
    ["Tên tài sản", asset.name],
    ["Phân loại", asset.category || "Chưa phân loại"],
    ["Ngày mua", asset.date || "Chưa ghi nhận"],
    ["Nguyên giá", `${formatVnd(asset.value)} VNĐ`],
    ["Số serial / IMEI", asset.serial || "Chưa cập nhật"],
    ["Vị trí lưu trữ", asset.location || "Chưa cập nhật"],
    ["Ngày thanh lý", asset.retiredAt ? new Date(asset.retiredAt).toLocaleDateString("vi-VN") : "Chưa ghi nhận"],
    ["Lý do thanh lý", asset.retirementReason || "Chưa ghi nhận"],
    ["Chứng từ đính kèm", asset.retirementAttachmentName || "Không đính kèm"],
    ["Ghi chú", asset.note || "Không có"],
  ];
  rows.forEach(([label, value]) => {
    const wrapped = doc.splitTextToSize(String(value), 120);
    doc.setTextColor(112, 134, 154);
    doc.text(label, left, y);
    doc.setTextColor(25, 59, 87);
    doc.text(wrapped, 72, y);
    y += Math.max(9, wrapped.length * 5 + 3);
  });
  y += 10;
  doc.setDrawColor(221, 231, 240);
  doc.line(left, y, 192, y);
  y += 16;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(10);
  doc.text("XÁC NHẬN CỦA CÁC BÊN", left, y);
  doc.setFontSize(8);
  doc.setTextColor(112, 134, 154);
  doc.text("Người lập biên bản", 42, y + 10, { align: "center" });
  doc.text("Đại diện bộ phận quản lý", 105, y + 10, { align: "center" });
  doc.text("Người phê duyệt", 168, y + 10, { align: "center" });
  doc.setTextColor(138, 160, 182);
  doc.text(`Biên bản được tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 282);
  applyPdfLogoWatermark(doc, await createPdfLogoWatermark(companyInfo.logoUrl).catch(() => null));
  drawPdfCorporateFooter(doc, companyInfo, "Biên bản thanh lý tài sản");
  openPdfPreview(doc, `${asset.retirementCertificateNumber || asset.code}-bien-ban-thanh-ly.pdf`, `Biên bản thanh lý ${asset.retirementCertificateNumber || asset.code}`);
}

function HandoverDetailModalLegacyPersisted({ item, companyInfo, onClose, onDataChanged }: { item: Handover; companyInfo: CompanyInfo; onClose: () => void; onDataChanged: () => void }) {
  const [signature, setSignature] = useState(item.recipientSignatureUrl || "");
  const [signed, setSigned] = useState(Boolean(item.recipientSignatureUrl));
  const saveRecipientSignature = trpc.handovers.saveRecipientSignature.useMutation({
    onSuccess: ({ url }) => { setSignature(url); setSigned(true); onDataChanged(); toast.success("Đã lưu chữ ký điện tử trên biên bản."); },
    onError: (error) => toast.error(error.message || "Không thể lưu chữ ký điện tử."),
  });
  const updateHandoverStatus = trpc.handovers.updateStatus.useMutation({
    onSuccess: () => { onDataChanged(); toast.success("Đã xác nhận bàn giao và đồng bộ trạng thái tài sản."); },
    onError: (error) => toast.error(error.message || "Không thể cập nhật trạng thái bàn giao."),
  });
  useEffect(() => { setSignature(item.recipientSignatureUrl || ""); setSigned(Boolean(item.recipientSignatureUrl)); }, [item.id, item.recipientSignatureUrl]);
  const handleSigned = (dataUrl: string) => saveRecipientSignature.mutate({ id: item.id, dataUrl });
  const onHistory = () => undefined;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{companyInfo.name} · Biên bản chi tiết, chữ ký và lịch sử người nhận.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><Signature size={14} />Ký tên điện tử</div><div className="mt-1 text-[11px] text-[#6B8F8D]">Người nhận ký trực tiếp trên vùng bên dưới.</div></div>{signed && <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"><CheckCircle2 size={13} />Đã ký</span>}</div><SignaturePad onSigned={handleSigned} /></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button><button onClick={() => { void downloadHandoverPdf(item, signature, companyInfo); toast.success("Đã tải biên bản PDF."); }} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />Xuất PDF</button><button onClick={() => { if (!signed) { toast.error("Vui lòng ký tên trước khi gửi xác nhận."); return; } toast.success("Đã gửi biên bản kèm chữ ký để xác nhận."); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi xác nhận</button></div></div></div></div>;
}

function HandoverDetailModal({ item: listItem, companyInfo, onClose, onDataChanged, autoOpenRecoveryCertificate, onRecoveryPdfHandled }: { item: Handover; companyInfo: CompanyInfo; onClose: () => void; onDataChanged: () => void; autoOpenRecoveryCertificate: string | null; onRecoveryPdfHandled: () => void }) {
  const [signature, setSignature] = useState(listItem.recipientSignatureUrl || "");
  const [signed, setSigned] = useState(Boolean(listItem.recipientSignatureUrl));
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const handoverDetailQuery = trpc.handovers.get.useQuery({ id: listItem.id });
  const returnDecisionHistoryQuery = trpc.handovers.returnDecisionHistory.useQuery({ id: listItem.id });
  const item = handoverDetailQuery.data ? { ...listItem, id: handoverDetailQuery.data.id, referenceCode: handoverDetailQuery.data.referenceCode, assetCode: handoverDetailQuery.data.assetCode, assetName: handoverDetailQuery.data.assetName, recipient: handoverDetailQuery.data.recipientName, department: handoverDetailQuery.data.recipientDepartmentName || "Chưa xác định", date: new Date(handoverDetailQuery.data.handedOverAt).toLocaleDateString("vi-VN"), returnedAt: handoverDetailQuery.data.returnedAt, recoveryCertificateNumber: handoverDetailQuery.data.recoveryCertificateNumber, recoveryCertificateYear: handoverDetailQuery.data.recoveryCertificateYear, recoveryCertificateMonth: handoverDetailQuery.data.recoveryCertificateMonth, recoveryCertificateSequence: handoverDetailQuery.data.recoveryCertificateSequence, conditionIn: handoverDetailQuery.data.conditionIn, status: handoverDetailQuery.data.status === "active" ? "Đã bàn giao" as const : handoverDetailQuery.data.status === "pending_signature" ? "Chờ ký" as const : handoverDetailQuery.data.status === "returned" ? "Đã hoàn trả" as const : "Nháp" as const, condition: handoverDetailQuery.data.conditionOut || "Tốt", handoverBy: handoverDetailQuery.data.handoverByName || "Quản trị viên", note: handoverDetailQuery.data.note || "", accessories: handoverDetailQuery.data.accessories || "", supplyItems: handoverDetailQuery.data.supplyItems, recipientUserId: handoverDetailQuery.data.recipientUserId, recipientDepartmentId: handoverDetailQuery.data.recipientDepartmentId, recipientSignatureUrl: handoverDetailQuery.data.recipientSignatureUrl } : listItem;
  const saveRecipientSignature = trpc.handovers.saveRecipientSignature.useMutation({
    onSuccess: ({ url }) => { setSignature(url); setSigned(true); void handoverDetailQuery.refetch(); onDataChanged(); toast.success("Đã lưu chữ ký điện tử."); },
    onError: (error) => toast.error(error.message || "Không thể lưu chữ ký điện tử."),
  });
  const updateHandoverStatus = trpc.handovers.updateStatus.useMutation({
    onSuccess: (result, variables) => {
      onDataChanged();
      toast.success(variables.status === "returned" ? (result.outstandingAccessoryCount ? "Đã hoàn trả · còn phụ kiện chưa đủ." : "Đã hoàn trả.") : "Đã cập nhật phiếu bàn giao.");
      onClose();
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật trạng thái phiếu."),
  });
  useEffect(() => { setSignature(item.recipientSignatureUrl || ""); setSigned(Boolean(item.recipientSignatureUrl)); }, [item.id, item.recipientSignatureUrl]);
  useEffect(() => { if (!item.supplyItems?.length) return; setReturnQuantities((current) => Object.fromEntries(item.supplyItems!.map((supplyItem: NonNullable<Handover["supplyItems"]>[number]) => [supplyItem.id, current[supplyItem.id] ?? String(Math.floor(Math.max(0, Number(supplyItem.issuedQuantity) - Number(supplyItem.returnedQuantity || 0))))]))); }, [item.id, item.supplyItems]);
  useEffect(() => {
    if (!autoOpenRecoveryCertificate || handoverDetailQuery.isLoading) return;
    const notifyPreparationComplete = (success: boolean) => window.dispatchEvent(new CustomEvent("assetmaster-recovery-pdf-preparation-complete", { detail: { certificate: autoOpenRecoveryCertificate, success } }));
    if (!handoverDetailQuery.data || item.status !== "Đã hoàn trả" || item.recoveryCertificateNumber !== autoOpenRecoveryCertificate) {
      onRecoveryPdfHandled();
      notifyPreparationComplete(false);
      toast.error("Không thể chuẩn bị bản xem trước biên bản thu hồi.");
      return;
    }
    onRecoveryPdfHandled();
    void downloadAssetRecoveryPdf(item, companyInfo).then(() => { notifyPreparationComplete(true); toast.success("Đã mở xem trước PDF."); }).catch(() => { notifyPreparationComplete(false); toast.error("Không thể mở bản xem trước biên bản thu hồi."); });
  }, [autoOpenRecoveryCertificate, handoverDetailQuery.isLoading, handoverDetailQuery.data, item.id, item.status, item.recoveryCertificateNumber, companyInfo, onRecoveryPdfHandled]);
  useModalDismiss(onClose);
  const preparePdf = (kind: "handover" | "recovery") => {
    if (isPreparingPdf) return;
    setIsPreparingPdf(true);
    const pdf = kind === "recovery" ? downloadAssetRecoveryPdf(item, companyInfo) : downloadHandoverPdf(item, signature, companyInfo);
    void pdf.then(() => toast.success("Đã mở xem trước PDF.")).catch(() => toast.error("Không thể chuẩn bị bản xem trước PDF.")).finally(() => setIsPreparingPdf(false));
  };
  const isBusy = saveRecipientSignature.isPending || updateHandoverStatus.isPending || isPreparingPdf;
  const saveSignature = (dataUrl: string) => saveRecipientSignature.mutate({ id: item.id, dataUrl });
  const updateStatus = (status: "draft" | "pending_signature" | "active" | "returned") => {
    const returnedSupplyItems = status === "returned" ? (item.supplyItems || []).map((supplyItem: NonNullable<Handover["supplyItems"]>[number]) => { const outstanding = Math.floor(Math.max(0, Number(supplyItem.issuedQuantity) - Number(supplyItem.returnedQuantity || 0))); return { handoverSupplyItemId: supplyItem.id, quantity: Math.min(outstanding, Math.floor(Math.max(0, Number(returnQuantities[supplyItem.id] ?? outstanding)))) }; }) : undefined;
    updateHandoverStatus.mutate({ id: item.id, status, recipientSignatureUrl: signature || null, handoverSignatureUrl: null, returnedSupplyItems });
  };
  const nextAction = item.status === "Nháp" ? { label: "Gửi ký xác nhận", status: "pending_signature" as const } : item.status === "Chờ ký" ? { label: "Xác nhận bàn giao", status: "active" as const } : item.status === "Đã bàn giao" ? { label: "Ghi nhận hoàn trả", status: "returned" as const } : null;

  if (handoverDetailQuery.isLoading) return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102A43]/40 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-7 text-center text-sm font-semibold text-[#71869A] shadow-2xl">Đang tải chi tiết phiếu bàn giao...</div></div>;
  if (handoverDetailQuery.isError) return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102A43]/40 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><h2 className="font-display text-xl font-extrabold text-[#102A43]">Không thể tải biên bản</h2><p className="mt-2 text-sm leading-6 text-[#71869A]">{handoverDetailQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="modal-close-action">Đóng</button><button onClick={() => handoverDetailQuery.refetch()} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white">Thử lại</button></div></div></div>;

  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !isBusy) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Biên bản bàn giao">
    <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]">
      <div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.referenceCode}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{companyInfo.name} · Biên bản được lấy từ dữ liệu hệ thống.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      <div className="space-y-5 p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]">Người nhận</div><div className="mt-3 text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div><div className="mt-2 border-t border-[#E7EEF3] pt-2 text-xs font-semibold text-[#526779]">Chi nhánh: <span className="font-bold text-[#193B57]">{item.branch || "Chưa gán"}</span></div></section><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]">Thông tin bàn giao</div><div className="mt-3 text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></section></div>
        {item.status === "Đã hoàn trả" && <section className="rounded-xl border border-[#F0DFC0] bg-[#FFFDF7] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8F5A00]">Số biên bản thu hồi</div><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div className="font-mono text-base font-extrabold text-[#8F5A00]">{item.recoveryCertificateNumber || "Đang cấp số"}</div><div className="text-[11px] text-[#8A7140]">Mã tự sinh theo năm và tháng</div></div></section>}
        <section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng, phụ kiện và ghi chú</div><div className="mt-3 grid gap-4 sm:grid-cols-3"><div><div className="text-xs text-[#8AA0B6]">Tình trạng</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện ghi tay</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.accessories || "Không có"}</div></div><div><div className="text-xs text-[#8AA0B6]">Ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có"}</div></div></div>{item.supplyItems?.length ? <div className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-3"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]">Phụ kiện lấy từ kho</div><div className="mt-2 space-y-2">{item.supplyItems.map((supplyItem: NonNullable<Handover["supplyItems"]>[number]) => { const issued = Number(supplyItem.issuedQuantity); const returned = Number(supplyItem.returnedQuantity || 0); const outstanding = issued - returned; return <div key={supplyItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><span className="font-bold text-[#193B57]">{supplyItem.supplyName} <span className="font-mono text-[10px] text-[#71869A]">{supplyItem.supplyCode}</span></span><span className="text-[#60758A]">Cấp: <b>{issued} {supplyItem.unit}</b>{returned > 0 && <> · Hoàn: <b className="text-[#087A6A]">{returned} {supplyItem.unit}</b></>}{outstanding > 0 && <span className="ml-1 text-[#A86B00]">· Đang giữ: <b>{outstanding} {supplyItem.unit}</b></span>}</span></div>; })}</div></div> : null}</section>
        <section className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#527089]"><History size={14} />Lịch sử quyết định hoàn trả</div>{returnDecisionHistoryQuery.isLoading ? <p className="text-xs text-[#71869A]">Đang tải lịch sử quyết định...</p> : returnDecisionHistoryQuery.data?.length ? <div className="space-y-3">{returnDecisionHistoryQuery.data.map((entry) => { const approved = entry.action === "return_approved"; return <div key={entry.id} className="flex gap-3"><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${approved ? "bg-[#0F8C8C]" : "bg-[#D26767]"}`} /><div><div className={`text-xs font-extrabold ${approved ? "text-[#087A6A]" : "text-[#B44545]"}`}>{approved ? "Đã duyệt yêu cầu hoàn trả" : "Đã từ chối yêu cầu hoàn trả"}</div><div className="mt-1 text-[11px] text-[#60758A]">{entry.summary}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">{entry.actorName || "Quản trị viên"} · {new Date(entry.createdAt).toLocaleString("vi-VN")}</div></div></div>; })}</div> : <p className="text-xs text-[#71869A]">Chưa có quyết định hoàn trả nào cho phiếu này.</p>}</section>
        {nextAction?.status === "returned" && <PartialAccessoryReturnPanel supplyItems={item.supplyItems || []} quantities={returnQuantities} onQuantityChange={(id, quantity) => setReturnQuantities((current) => ({ ...current, [id]: quantity }))} />}
        <section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><Signature size={14} />Ký tên điện tử</div><p className="mt-1 text-[11px] text-[#6B8F8D]">Chữ ký được lưu an toàn cùng phiếu bàn giao.</p></div>{signed && <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"><CheckCircle2 size={13} />Đã ký</span>}</div><SignaturePad onSigned={saveSignature} /></section>
        {item.status === "Đã hoàn trả" && <div className="flex justify-end"><button disabled={isBusy} onClick={() => preparePdf("recovery")} className="flex items-center gap-2 rounded-lg border border-[#F0DFC0] bg-[#FFFDF7] px-4 py-2.5 text-xs font-bold text-[#8F5A00] transition hover:bg-white disabled:opacity-50">{isPreparingPdf ? <><Loader2 size={14} className="animate-spin" />Đang chuẩn bị PDF...</> : <><Printer size={14} />Biên bản thu hồi / In PDF</>}</button></div>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button><button disabled={isBusy} onClick={() => preparePdf("handover")} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A] disabled:opacity-50">{isPreparingPdf ? <><Loader2 size={14} className="animate-spin" />Đang chuẩn bị PDF...</> : <><FileText size={14} />Xem trước PDF</>}</button>{nextAction?.status === "returned" ? <AlertDialog><AlertDialogTrigger asChild><button disabled={isBusy} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Signature size={14} />{nextAction.label}</button></AlertDialogTrigger><AlertDialogContent className="max-w-md border-[#CDE5E5] bg-white"><AlertDialogHeader><div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF2E9] text-[#C75419]"><AlertTriangle size={19} /></div><AlertDialogTitle className="font-display text-xl font-extrabold text-[#102A43]">Xác nhận ghi nhận hoàn trả?</AlertDialogTitle><AlertDialogDescription className="text-sm leading-6 text-[#60758A]">Tài sản sẽ được chuyển về trạng thái sẵn có; phụ kiện kho đang giữ cũng tự động được hoàn về kho.</AlertDialogDescription></AlertDialogHeader><div className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3 text-xs"><div className="font-extrabold text-[#193B57]">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71869A]">{item.assetCode}</div><div className="mt-2 text-[#60758A]">Người đang nhận: <span className="font-bold text-[#193B57]">{item.recipient}</span></div></div><AlertDialogFooter><AlertDialogCancel disabled={isBusy}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isBusy} onClick={() => updateStatus("returned")} className="bg-[#0F8C8C] hover:bg-[#087A6A]">{isBusy ? "Đang ghi nhận..." : "Xác nhận hoàn trả"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : nextAction && <button disabled={isBusy || (nextAction.status === "active" && !signed)} onClick={() => updateStatus(nextAction.status)} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Signature size={14} />{isBusy ? "Đang lưu..." : nextAction.label}</button>}</div>
      </div>
    </div>
  </div>;
}

function SignaturePad({ onSigned }: { onSigned: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas) return null; const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }; };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const p = point(event); if (!canvas || !ctx || !p) return; drawing.current = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const p = point(event); if (!drawing.current || !ctx || !p) return; ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#102A43"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.stroke(); };
  const stop = () => { drawing.current = false; };
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); };
  const confirm = () => { const canvas = canvasRef.current; if (!canvas) return; const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data || []; const hasInk = Array.from(pixels).some((value, index) => index % 4 === 3 && value > 0); if (!hasInk) { toast.error("Vui lòng ký vào vùng chữ ký trước."); return; } onSigned(canvas.toDataURL("image/png")); };
  return <div><div className="overflow-hidden rounded-lg border border-dashed border-[#8BCDC6] bg-white"><canvas ref={canvasRef} width={900} height={180} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerLeave={stop} className="h-[120px] w-full touch-none cursor-crosshair" aria-label="Vùng ký điện tử" /></div><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-[#8AA0B6]">Dùng chuột hoặc ngón tay để ký</span><div className="flex gap-2"><button onClick={clear} className="text-[11px] font-bold text-[#60758A] hover:text-[#193B57]">Xóa / ký lại</button><button onClick={confirm} className="rounded-md bg-[#0F8C8C] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#087A6A]">Xác nhận chữ ký</button></div></div></div>;
}

function AssetModal({ mode, asset, formData, setFormData, isSaving, onClose: dismiss, onSave, onEdit, onStartHandover, onReturnToInvoice }: { mode: "create" | "edit" | "detail"; asset: Asset | null; formData: Asset; setFormData: React.Dispatch<React.SetStateAction<Asset>>; isSaving: boolean; onClose: () => void; onSave: (attachments?: AssetSaveAttachments) => void; onEdit: () => void; onStartHandover: (assetCode: string) => void; onReturnToInvoice?: () => void }) {
  const isDetail = mode === "detail";
  const preservePurchaseDate = mode === "edit" && Boolean(asset?.code);
  const [repairOpen, setRepairOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [supplierReturnConfirmOpen, setSupplierReturnConfirmOpen] = useState(false);
  const [supplierReturnFile, setSupplierReturnFile] = useState<File | null>(null);
  const [retirementAttachmentFile, setRetirementAttachmentFile] = useState<File | null>(null);
  const [supplierReturnPreviewUrl, setSupplierReturnPreviewUrl] = useState("");
  useEffect(() => { if (!supplierReturnFile) { setSupplierReturnPreviewUrl(""); return; } const url = URL.createObjectURL(supplierReturnFile); setSupplierReturnPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [supplierReturnFile]);
  useEffect(() => { setFormDirty(false); setSupplierReturnFile(null); setRetirementAttachmentFile(null); }, [mode, asset?.code]);
  const onClose = () => {
    if (isSaving) return;
    if (!isDetail && formDirty) { toast.warning("Đóng form chưa lưu?", { description: "Các thay đổi tài sản hiện tại sẽ bị hủy.", action: { label: "Bỏ thay đổi", onClick: dismiss } }); return; }
    dismiss();
  };
  const prepareSupplierReturnAttachment = async (): Promise<SupplierReturnAttachment | undefined> => {
    if (!supplierReturnFile) return undefined;
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Không thể đọc tệp.")); reader.readAsDataURL(supplierReturnFile); });
    return { fileName: supplierReturnFile.name, contentType: supplierReturnFile.type as SupplierReturnAttachment["contentType"], dataUrl };
  };
  const prepareRetirementAttachment = async (): Promise<RetirementAttachment | undefined> => {
    if (!retirementAttachmentFile) return undefined;
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Không thể đọc chứng từ thanh lý.")); reader.readAsDataURL(retirementAttachmentFile); });
    return { fileName: retirementAttachmentFile.name, contentType: retirementAttachmentFile.type as RetirementAttachment["contentType"], dataUrl };
  };
  const saveWithAttachments = async (supplierReturn?: SupplierReturnAttachment) => {
    const retirement = await prepareRetirementAttachment();
    onSave({ ...(supplierReturn ? { supplierReturn } : {}), ...(retirement ? { retirement } : {}) });
  };
  const requestSave = () => {
    if (isSaving) return;
    if (formData.statusType === "retired" && (!formData.retiredAt || !formData.retirementReason?.trim())) { toast.error("Vui lòng nhập ngày và lý do thanh lý trước khi lưu."); return; }
    if (formData.statusType !== "returned" || mode !== "edit") { void saveWithAttachments(); return; }
    if (!formData.supplierReturnedAt || !formData.supplierReturnReason?.trim()) { toast.error("Vui lòng nhập ngày và lý do trả nhà cung cấp trước khi xác nhận."); return; }
    setSupplierReturnConfirmOpen(true);
  };
  const confirmSupplierReturn = async () => {
    try { const attachment = await prepareSupplierReturnAttachment(); setSupplierReturnConfirmOpen(false); await saveWithAttachments(attachment); } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể đọc tệp đính kèm."); }
  };
  useModalDismiss(onClose);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPriority, setRepairPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: Boolean(asset) });
  const branchesQuery = trpc.branches.list.useQuery();
  const assetEmployeesQuery = trpc.employees.list.useQuery();
  const inheritedEmployee = useMemo(() => {
    const employees = assetEmployeesQuery.data || [];
    if (formData.holderUserId) {
      const linkedEmployee = employees.find((item) => item.id === formData.holderUserId);
      if (linkedEmployee) return linkedEmployee;
    }
    const normalizeEmployeeName = (value: string | null | undefined) => value?.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi-VN") || "";
    const holder = normalizeEmployeeName(formData.holder);
    return holder ? employees.find((item) => normalizeEmployeeName(item.name) === holder) || null : null;
  }, [formData.holder, formData.holderUserId, assetEmployeesQuery.data]);
  const inheritedEmployeeBranchId = inheritedEmployee?.branchId || null;
  useEffect(() => {
    if (!inheritedEmployeeBranchId || formData.branchId === inheritedEmployeeBranchId) return;
    setFormData((current) => ({ ...current, branchId: inheritedEmployeeBranchId }));
  }, [inheritedEmployeeBranchId, formData.branchId]);
  const employeesQuery = trpc.employees.list.useQuery(undefined, { enabled: isDetail });
  const employeeDepartmentsQuery = trpc.departments.listAll.useQuery(undefined, { enabled: isDetail });
  const employeeBranchForAsset = useMemo(() => {
    const holder = asset?.holder?.trim();
    const nonEmployeeHolders = ["Chưa bàn giao", "Bảo hành/Sửa chữa", "Đã trả NCC", "Khấu hao - Thanh lý"];
    if (!holder || nonEmployeeHolders.includes(holder)) return "Chưa có Nhân sự nhận";
    const employee = (employeesQuery.data || []).find((item) => item.name?.trim().toLocaleLowerCase("vi-VN") === holder.toLocaleLowerCase("vi-VN"));
    if (!employee) return "Không tìm thấy trong hồ sơ Nhân sự";
    const branch = (branchesQuery.data || []).find((item) => item.id === employee.branchId);
    return branch ? `${branch.name} · ${branch.code}` : "Chưa gán Chi nhánh";
  }, [asset?.holder, employeesQuery.data, branchesQuery.data]);
  const employeeDepartmentForAsset = useMemo(() => {
    const holder = asset?.holder?.trim();
    const nonEmployeeHolders = ["Chưa bàn giao", "Bảo hành/Sửa chữa", "Đã trả NCC", "Khấu hao - Thanh lý"];
    if (!holder || nonEmployeeHolders.includes(holder)) return "Chưa có Nhân sự nhận";
    const employee = (employeesQuery.data || []).find((item) => item.name?.trim().toLocaleLowerCase("vi-VN") === holder.toLocaleLowerCase("vi-VN"));
    if (!employee) return "Không tìm thấy trong hồ sơ Nhân sự";
    const department = (employeeDepartmentsQuery.data || []).find((item) => item.id === employee.departmentId);
    return department?.name || "Chưa gán Phòng ban";
  }, [asset?.holder, employeesQuery.data, employeeDepartmentsQuery.data]);
  const retirementCompanyQuery = trpc.company.get.useQuery(undefined, { enabled: isDetail && asset?.statusType === "retired" });
  const persistedAsset = assetsQuery.data?.find((candidate) => candidate.assetCode === asset?.code);
  useEffect(() => {
    if (isDetail) return;
    const activeBranches = (branchesQuery.data || []).filter((branch) => branch.isActive);
    const headOffice = activeBranches.find((branch) => branch.code === "HO" || branch.code === "HO-HEAD OFFICE");
    if (mode === "create" && headOffice && !formData.branchId) setFormData((current) => ({ ...current, branchId: headOffice.id }));
    if (mode === "edit" && !formData.branchId && persistedAsset?.branchId) setFormData((current) => ({ ...current, branchId: persistedAsset.branchId }));
  }, [mode, isDetail, branchesQuery.data, persistedAsset?.branchId, formData.branchId]);
  const maintenanceHistoryQuery = trpc.maintenance.byAsset.useQuery({ assetId: persistedAsset?.id || 0 }, { enabled: isDetail && Boolean(persistedAsset?.id) });
  const assetFieldHistoryQuery = trpc.assets.history.useQuery({ assetId: persistedAsset?.id || 0 }, { enabled: isDetail && Boolean(persistedAsset?.id) });
  const latestAssetChange = assetFieldHistoryQuery.data?.items?.[0];
  const latestUpdateActorTooltip = assetFieldHistoryQuery.isLoading
    ? "Người thực hiện: Đang tải..."
    : latestAssetChange?.actorName?.trim()
      ? `Người thực hiện: ${latestAssetChange.actorName.trim()}`
      : "Người thực hiện: Chưa xác định";
  useEffect(() => {
    if (!isDetail || !persistedAsset?.id) return;
    const dialog = document.querySelector('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const closeButton = dialog?.querySelector('button[aria-label="Đóng"]');
    const header = closeButton?.parentElement;
    if (!header || header.querySelector("[data-asset-field-history]")) return;
    const historyButton = document.createElement("button");
    historyButton.type = "button";
    historyButton.dataset.assetFieldHistory = "true";
    const totalChanges = assetFieldHistoryQuery.data?.total;
    const countLabel = assetFieldHistoryQuery.isLoading ? "…" : String(totalChanges ?? 0);
    historyButton.innerHTML = `Lịch sử thay đổi <span class="ml-1 inline-grid min-w-5 place-items-center rounded-full bg-[#0F8C8C] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">${countLabel}</span>`;
    historyButton.setAttribute("aria-label", `Mở lịch sử thay đổi (${totalChanges ?? 0} bản ghi)`);
    historyButton.className = "mr-2 inline-flex min-h-10 items-center rounded-lg border border-[#CDE5E5] px-3 py-2 text-[11px] font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] active:scale-[0.98]";
    const openHistory = () => window.dispatchEvent(new CustomEvent("assetmaster:open-asset-history", { detail: persistedAsset.id }));
    historyButton.addEventListener("click", openHistory);
    header.insertBefore(historyButton, closeButton);
    return () => { historyButton.removeEventListener("click", openHistory); historyButton.remove(); };
  }, [isDetail, persistedAsset?.id, assetFieldHistoryQuery.data?.total, assetFieldHistoryQuery.isLoading]);
  useEffect(() => {
    if (!isDetail || !onReturnToInvoice) return;
    const dialog = document.querySelector('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const closeButton = dialog?.querySelector('button[aria-label="Đóng"]');
    const header = closeButton?.parentElement;
    if (!header || header.querySelector("[data-return-to-invoice]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.returnToInvoice = "true";
    button.className = "mr-2 inline-flex min-h-10 items-center rounded-lg border border-[#B8D6F5] bg-[#F2F8FF] px-3 py-2 text-[11px] font-bold text-[#2666A8] transition hover:bg-[#EAF3FF] active:scale-[0.98]";
    button.textContent = "Quay lại Hóa đơn";
    button.setAttribute("aria-label", "Quay lại Hóa đơn trước đó");
    button.addEventListener("click", onReturnToInvoice);
    header.insertBefore(button, closeButton);
    return () => { button.removeEventListener("click", onReturnToInvoice); button.remove(); };
  }, [isDetail, onReturnToInvoice]);
  useEffect(() => {
    if (!isDetail) return;
    const dialog = document.querySelector('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const updateText = Array.from(dialog?.querySelectorAll("span") || []).find((element) => element.textContent?.startsWith("Lần cập nhật gần nhất:"));
    const tooltipTarget = updateText?.parentElement;
    if (!tooltipTarget) return;
    const originalTitle = tooltipTarget.getAttribute("title");
    tooltipTarget.classList.add("icon-action-tooltip", "cursor-help", "outline-none");
    tooltipTarget.dataset.tooltip = latestUpdateActorTooltip;
    tooltipTarget.tabIndex = 0;
    tooltipTarget.setAttribute("aria-label", latestUpdateActorTooltip);
    tooltipTarget.removeAttribute("title");
    return () => {
      tooltipTarget.classList.remove("icon-action-tooltip", "cursor-help", "outline-none");
      delete tooltipTarget.dataset.tooltip;
      tooltipTarget.removeAttribute("aria-label");
      tooltipTarget.removeAttribute("tabindex");
      if (originalTitle) tooltipTarget.setAttribute("title", originalTitle);
    };
  }, [isDetail, persistedAsset?.id, latestUpdateActorTooltip]);
  useEffect(() => {
    if (!isDetail || asset?.statusType !== "retired") return;
    const dialog = document.querySelector('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const closeButton = dialog?.querySelector('button[aria-label="Đóng"]');
    const header = closeButton?.parentElement;
    if (!header || header.querySelector("[data-retirement-pdf]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.retirementPdf = "true";
    button.className = "mr-2 inline-flex min-h-10 items-center rounded-lg border border-[#E7D9B9] bg-[#FFFDF7] px-3 py-2 text-[11px] font-bold text-[#8F5A00] transition hover:bg-[#FFF7E3] active:scale-[0.98]";
    button.textContent = "Xuất biên bản PDF";
    button.setAttribute("aria-label", "Xuất biên bản thanh lý PDF");
    const handleExport = () => {
      const company = retirementCompanyQuery.data;
      const companyInfo: CompanyInfo = { name: company?.name || "AssetMaster", address: company?.address || "", taxCode: company?.taxCode || "", phone: company?.phone || "", email: company?.email || "", websiteUrl: company?.websiteUrl || "", hideWebsiteOnInternalPdf: company?.hideWebsiteOnInternalPdf ?? false, websiteTitle: company?.websiteTitle || "AssetMaster", logoUrl: company?.logoUrl || "", brandColor: company?.brandColor || "#0F8C8C", faviconUrl: "", loginBackgroundUrl: "", loginGreeting: "", loginBackgroundOverlay: "light" };
      void downloadAssetRetirementPdf(asset, companyInfo).then(() => toast.success("Đã mở xem trước biên bản thanh lý PDF.")).catch(() => toast.error("Không thể tạo biên bản thanh lý PDF."));
    };
    button.addEventListener("click", handleExport);
    header.insertBefore(button, closeButton);
    return () => { button.removeEventListener("click", handleExport); button.remove(); };
  }, [isDetail, asset, retirementCompanyQuery.data]);
  useEffect(() => {
    if (!isDetail || asset?.statusType !== "retired") return;
    const dialog = document.querySelector('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const historySection = Array.from(dialog?.querySelectorAll("section") || []).find((section) => section.textContent?.includes("Lịch sử quyết định trả nhà cung cấp"));
    if (!historySection || dialog?.querySelector("[data-retirement-record]")) return;
    const certificateNumber = persistedAsset?.retirementCertificateNumber || asset.retirementCertificateNumber || "Đang cấp số";
    const retirementDate = persistedAsset?.retiredAt || asset.retiredAt;
    const retirementReason = persistedAsset?.retirementReason || asset.retirementReason || "Chưa ghi nhận";
    const attachmentUrl = persistedAsset?.retirementAttachmentUrl || asset.retirementAttachmentUrl;
    const attachmentName = persistedAsset?.retirementAttachmentName || asset.retirementAttachmentName || "Mở chứng từ thanh lý";
    const record = document.createElement("section");
    record.dataset.retirementRecord = "true";
    record.className = "rounded-xl border border-[#E7D9B9] bg-[#FFFDF7] p-4";
    const title = document.createElement("div");
    title.className = "text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8F5A00]";
    title.textContent = "Hồ sơ thanh lý";
    const grid = document.createElement("div");
    grid.className = "mt-3 grid gap-3 sm:grid-cols-2";
    [["Số biên bản", certificateNumber], ["Ngày thanh lý", retirementDate ? new Date(retirementDate).toLocaleDateString("vi-VN") : "Chưa ghi nhận"], ["Lý do", retirementReason]].forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "rounded-lg border border-[#F1E5C7] bg-white px-3 py-2.5";
      const itemLabel = document.createElement("div");
      itemLabel.className = "text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A7A38]";
      itemLabel.textContent = label;
      const itemValue = document.createElement("div");
      itemValue.className = "mt-1 text-xs font-bold leading-5 text-[#5E470D]";
      itemValue.textContent = String(value);
      item.append(itemLabel, itemValue);
      grid.append(item);
    });
    const attachment = document.createElement("div");
    attachment.className = "mt-3 border-t border-[#F1E5C7] pt-3";
    const attachmentLabel = document.createElement("div");
    attachmentLabel.className = "text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9A7A38]";
    attachmentLabel.textContent = "Chứng từ đính kèm";
    attachment.append(attachmentLabel);
    if (attachmentUrl) {
      const link = document.createElement("a");
      link.href = attachmentUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className = "mt-2 inline-flex items-center gap-2 rounded-lg border border-[#E7D9B9] bg-white px-3 py-2 text-xs font-bold text-[#8F5A00] hover:bg-[#FFF7E3]";
      link.textContent = attachmentName;
      attachment.append(link);
    } else {
      const empty = document.createElement("p");
      empty.className = "mt-2 text-xs text-[#8AA0B6]";
      empty.textContent = "Chưa có chứng từ đính kèm.";
      attachment.append(empty);
    }
    record.append(title, grid, attachment);
    historySection.before(record);
    return () => record.remove();
  }, [isDetail, asset?.statusType, asset?.retirementCertificateNumber, asset?.retiredAt, asset?.retirementReason, asset?.retirementAttachmentUrl, asset?.retirementAttachmentName, persistedAsset?.retirementCertificateNumber, persistedAsset?.retiredAt, persistedAsset?.retirementReason, persistedAsset?.retirementAttachmentUrl, persistedAsset?.retirementAttachmentName]);
  const utils = trpc.useUtils();
  const [quickEntryType, setQuickEntryType] = useState<"vendor" | "brand" | null>(null);
  const [quickEntryName, setQuickEntryName] = useState("");
  const quickEntryNameRef = useRef("");
  const createVendorMutation = trpc.vendors.create.useMutation({
    onSuccess: async (result) => {
      const created = await vendorsQuery.refetch();
      const vendor = created.data?.find((item) => item.id === result.id);
      setFormData((current) => ({ ...current, vendorId: result.id, supplier: vendor?.name || quickEntryNameRef.current }));
      quickEntryNameRef.current = "";
      setQuickEntryName("");
      setQuickEntryType(null);
      toast.success("Đã thêm và chọn Nhà cung cấp mới.");
    },
    onError: (error) => toast.error(error.message || "Không thể thêm Nhà cung cấp."),
  });
  const createBrandMutation = trpc.brands.create.useMutation({
    onSuccess: async (result) => {
      const created = await brandsQuery.refetch();
      const brand = created.data?.find((item) => item.id === result.id);
      setFormData((current) => ({ ...current, brandId: result.id, brand: brand?.name || quickEntryNameRef.current }));
      quickEntryNameRef.current = "";
      setQuickEntryName("");
      setQuickEntryType(null);
      toast.success("Đã thêm và chọn Hãng mới.");
    },
    onError: (error) => toast.error(error.message || "Không thể thêm Hãng."),
  });
  const vendorsQuery = trpc.vendors.list.useQuery();
  const brandsQuery = trpc.brands.list.useQuery();
  const purchaseInvoicesQuery = trpc.purchaseInvoices.list.useQuery();
  const categoriesQuery = trpc.assetCategories.list.useQuery(undefined, { enabled: !isDetail });
  const [categoryCreatorOpen, setCategoryCreatorOpen] = useState(false);
  const categoryDraftRef = useRef({ name: "", code: "", description: "" });
  const nextAssetCodeQuery = trpc.assetCategories.nextCode.useQuery({ categoryId: formData.categoryId || 0 }, { enabled: !isDetail && mode === "create" && Boolean(formData.categoryId) });
  const createCategoryMutation = trpc.assetCategories.create.useMutation({
    onSuccess: (result, variables) => {
      setFormData((current) => ({ ...current, categoryId: result.id, category: variables.name, code: "" }));
      categoryDraftRef.current = { name: "", code: "", description: "" };
      setFormDirty(true);
      setCategoryCreatorOpen(false);
      void utils.assetCategories.list.invalidate();
      toast.success("Đã thêm Phân loại và áp dụng tiền tố mã mới.");
    },
    onError: (error) => toast.error(error.message || "Không thể thêm Phân loại."),
  });
  useEffect(() => {
    if (isDetail || mode !== "create" || !nextAssetCodeQuery.data?.assetCode) return;
    setFormData((current) => current.code === nextAssetCodeQuery.data!.assetCode ? current : { ...current, code: nextAssetCodeQuery.data!.assetCode });
  }, [isDetail, mode, nextAssetCodeQuery.data?.assetCode, setFormData]);
  const createRepairMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      setRepairDescription("");
      setRepairOpen(false);
      void maintenanceHistoryQuery.refetch();
      void utils.maintenance.list.invalidate();
      toast.success("Đã tạo yêu cầu sửa chữa cho tài sản.");
    },
    onError: (error) => toast.error(error.message || "Không thể tạo yêu cầu sửa chữa."),
  });
  const update = (key: keyof Asset, value: string) => { setFormDirty(true); setFormData((current) => ({ ...current, [key]: key === "value" ? value.replace(/\D/g, "") : value })); };
  const selectPurchaseInvoice = (value: string) => {
    const nextId = value ? Number(value) : null;
    const invoice = (purchaseInvoicesQuery.data || []).find((item) => item.id === nextId) || null;
    const invoiceVendor = invoice ? (vendorsQuery.data || []).find((vendor) => vendor.id === invoice.vendorId) : null;
    setFormDirty(true);
    setFormData((current) => ({ ...current, purchaseContractId: null, purchaseInvoiceId: nextId, purchaseInvoiceLineId: null, ...(invoiceVendor ? { vendorId: invoiceVendor.id, supplier: invoiceVendor.name } : {}) }));
  };
  useEffect(() => {
    if (isDetail) return;
    const dialog = document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${mode === "create" ? "Thêm tài sản mới" : "Chỉnh sửa tài sản"}"]`);
    const serialInput = dialog?.querySelector<HTMLInputElement>('input[placeholder="Nhập số serial"]');
    const serialField = serialInput?.parentElement;
    const grid = serialField?.parentElement;
    if (!serialField || !grid || grid.querySelector("[data-asset-purchase-invoice]")) return;
    const field = document.createElement("div");
    field.dataset.assetPurchaseInvoice = "true";
    field.className = "min-w-0";
    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = "Hóa đơn mua bán";
    const select = document.createElement("select");
    select.className = "field-input mt-1";
    select.setAttribute("aria-label", "Hóa đơn mua bán");
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = purchaseInvoicesQuery.isLoading ? "Đang tải Hóa đơn..." : "Chưa liên kết Hóa đơn";
    select.append(placeholder);
    (purchaseInvoicesQuery.data || []).filter((invoice) => invoice.status !== "cancelled").forEach((invoice) => {
      const option = document.createElement("option");
      option.value = String(invoice.id);
      option.textContent = invoice.invoiceKey;
      select.append(option);
    });
    select.value = formData.purchaseInvoiceId ? String(formData.purchaseInvoiceId) : "";
    select.disabled = purchaseInvoicesQuery.isLoading;
    const onChange = () => selectPurchaseInvoice(select.value);
    select.addEventListener("change", onChange);
    field.append(label, select);
    serialField.after(field);
    return () => { select.removeEventListener("change", onChange); field.remove(); };
  }, [isDetail, mode, formData.purchaseInvoiceId, purchaseInvoicesQuery.data, purchaseInvoicesQuery.isLoading]);
  useEffect(() => {
    if (!isDetail || !asset) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Chi tiết tài sản"]');
    const vendorLabel = Array.from(dialog?.querySelectorAll<HTMLElement>("div") || []).find((element) => element.textContent?.trim() === "Nhà cung cấp");
    const vendorCard = vendorLabel?.parentElement;
    const grid = vendorCard?.parentElement;
    if (!grid || grid.querySelector("[data-asset-invoice-detail]")) return;
    const block = document.createElement("div");
    block.dataset.assetInvoiceDetail = "true";
    block.className = "min-w-0 rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3.5 py-3";
    const label = document.createElement("div");
    label.className = "text-[10px] font-bold uppercase tracking-[0.1em] text-[#4B8884]";
    label.textContent = "Hóa đơn mua bán";
    const value = document.createElement("div");
    value.className = "mt-1.5 break-words text-sm font-semibold leading-5 text-[#193B57]";
    const invoice = (purchaseInvoicesQuery.data || []).find((item) => item.id === asset.purchaseInvoiceId);
    value.textContent = asset.purchaseInvoiceId ? invoice ? invoice.invoiceKey : "Đang tải hoặc Hóa đơn không còn khả dụng" : "Chưa liên kết Hóa đơn";
    block.append(label, value);
    grid.append(block);
    return () => block.remove();
  }, [isDetail, asset?.purchaseInvoiceId, purchaseInvoicesQuery.data]);
  useEffect(() => {
    if (isDetail) return;
    const holderLabel = Array.from(document.querySelectorAll("label")).find((label) => label.textContent?.trim().startsWith("Người / Phòng giữ"));
    const holderInput = holderLabel?.parentElement?.querySelector("input") as HTMLInputElement | null;
    if (!holderInput) return;
    const statusLabel = formData.statusType === "available" ? "Chưa bàn giao" : formData.statusType === "maintenance" ? "Bảo hành/Sửa chữa" : formData.statusType === "returned" ? "Đã trả NCC" : formData.statusType === "retired" ? "Khấu hao - Thanh lý" : "";
    const displayStatus = formData.statusType === "maintenance" ? "Bảo hành/Sửa chữa" : formData.statusType === "retired" ? "Khấu hao/Thanh lý" : formData.status;
    if (statusLabel && (formData.holder !== statusLabel || formData.status !== displayStatus)) {
      setFormData((current) => ({ ...current, holder: statusLabel, status: displayStatus, retiredAt: formData.statusType === "retired" && !current.retiredAt ? new Date().toISOString().slice(0, 10) : current.retiredAt }));
      return;
    }
    if (formData.statusType === "active" && ["Chưa bàn giao", "Bảo hành/Sửa chữa", "Đã trả NCC", "Khấu hao - Thanh lý"].includes(formData.holder)) {
      setFormData((current) => ({ ...current, holder: "" }));
      return;
    }
    holderInput.placeholder = formData.statusType === "active" ? "Nhập người hoặc phòng ban" : statusLabel;
    holderInput.readOnly = formData.statusType !== "active";
    holderInput.classList.toggle("bg-[#F5F8FB]", formData.statusType !== "active");
    holderInput.classList.toggle("text-[#60758A]", formData.statusType !== "active");
    holderInput.title = formData.statusType === "active" ? "Nhập người hoặc phòng ban đang giữ tài sản" : `Tự động cập nhật theo trạng thái ${formData.status}`;
  }, [isDetail, formData.statusType, formData.status, formData.holder, setFormData]);
  useEffect(() => {
    if (isDetail || formData.statusType !== "retired") return;
    const holderInput = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find((input) => input.value === "Khấu hao - Thanh lý");
    if (!holderInput) return;
    holderInput.readOnly = true;
    holderInput.setAttribute("aria-readonly", "true");
    holderInput.classList.add("bg-[#F5F8FB]", "text-[#60758A]");
    holderInput.title = "Tự động cập nhật theo trạng thái Khấu hao/Thanh lý";
  }, [isDetail, formData.statusType, formData.holder]);
  useEffect(() => {
    if (isDetail) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    if (!dialog) return;
    const refreshMaintenanceCopy = () => {
      dialog.querySelectorAll<HTMLElement>("button").forEach((button) => {
        if (button.textContent?.trim() === "Bảo trì") button.textContent = "Bảo hành/Sửa chữa";
      });
      if (formData.statusType === "maintenance") {
        dialog.querySelectorAll<HTMLLabelElement>("label").forEach((label) => {
          if (label.textContent?.includes("Nội dung cần bảo trì")) label.innerHTML = 'Lý do Bảo hành/Sửa chữa <span class="text-[#B44545]">*</span>';
        });
        dialog.querySelectorAll<HTMLTextAreaElement>('textarea[aria-label="Nội dung cần bảo trì"]').forEach((textarea) => {
          textarea.setAttribute("aria-label", "Lý do Bảo hành/Sửa chữa");
          textarea.placeholder = "Mô tả lý do cần bảo hành hoặc sửa chữa...";
        });
      }
    };
    refreshMaintenanceCopy();
    const observer = new MutationObserver(refreshMaintenanceCopy);
    observer.observe(dialog, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isDetail, formData.statusType, formData.status]);
  useEffect(() => {
    if (isDetail) return;
    const assetDialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const statusLabel = Array.from(assetDialog?.querySelectorAll("label") || []).find((label) => label.textContent?.trim() === "Trạng thái");
    const statusField = statusLabel?.parentElement;
    const grid = statusField?.parentElement;
    if (!statusField || !grid) return;
    grid.querySelector("[data-maintenance-reason]")?.remove();
    grid.querySelector("[data-retirement-details]")?.remove();
    if (formData.statusType === "retired") {
      const field = document.createElement("div");
      field.dataset.retirementDetails = "true";
      field.className = "sm:col-span-2 grid gap-4 rounded-xl border border-[#E7D9B9] bg-[#FFFDF7] p-3 sm:grid-cols-2";
      const dateBlock = document.createElement("div");
      const dateLabel = document.createElement("label");
      dateLabel.className = "field-label";
      dateLabel.innerHTML = 'Ngày thanh lý <span class="text-[#B44545]">*</span>';
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.value = dateInputValue(formData.retiredAt) || new Date().toISOString().slice(0, 10);
      dateInput.className = "field-input mt-1";
      dateInput.setAttribute("aria-label", "Ngày thanh lý");
      dateInput.addEventListener("input", () => { setFormDirty(true); setFormData((current) => ({ ...current, retiredAt: dateInput.value })); });
      const dateHelp = document.createElement("p");
      dateHelp.className = "mt-1 text-[10px] text-[#8AA0B6]";
      dateHelp.textContent = "Ngày chính thức đưa tài sản ra khỏi sử dụng.";
      dateBlock.append(dateLabel, dateInput, dateHelp);
      const reasonBlock = document.createElement("div");
      const reasonLabel = document.createElement("label");
      reasonLabel.className = "field-label";
      reasonLabel.innerHTML = 'Lý do thanh lý <span class="text-[#B44545]">*</span>';
      const reasonInput = document.createElement("textarea");
      reasonInput.required = true;
      reasonInput.value = formData.retirementReason || "";
      reasonInput.placeholder = "Ví dụ: Hết khấu hao, hư hỏng không thể sửa chữa...";
      reasonInput.className = "field-input mt-1 min-h-[76px] resize-y";
      reasonInput.setAttribute("aria-label", "Lý do thanh lý");
      reasonInput.addEventListener("input", () => { setFormDirty(true); setFormData((current) => ({ ...current, retirementReason: reasonInput.value })); });
      const reasonTemplates = document.createElement("div");
      reasonTemplates.className = "mt-2 flex flex-wrap gap-1.5";
      const templateHint = document.createElement("span");
      templateHint.className = "w-full text-[10px] font-semibold text-[#8A7140]";
      templateHint.textContent = "Chọn mẫu để điền nhanh; bạn vẫn có thể chỉnh sửa nội dung.";
      reasonTemplates.append(templateHint);
      ["Hư hỏng nặng, không thể sửa chữa", "Hết hạn sử dụng hoặc đã khấu hao hết", "Lỗi thời, không còn đáp ứng nhu cầu sử dụng", "Không còn nhu cầu sử dụng", "Chi phí sửa chữa vượt giá trị còn lại"].forEach((template) => {
        const templateButton = document.createElement("button");
        templateButton.type = "button";
        templateButton.textContent = template;
        templateButton.className = "rounded-full border border-[#E7D9B9] bg-white px-2.5 py-1 text-[10px] font-bold text-[#8F5A00] transition hover:bg-[#FFF3D5] focus:outline-none focus:ring-2 focus:ring-[#E8C56B]";
        templateButton.setAttribute("aria-label", `Chọn mẫu lý do thanh lý: ${template}`);
        templateButton.addEventListener("click", () => {
          reasonInput.value = template;
          reasonInput.dispatchEvent(new Event("input", { bubbles: true }));
          reasonInput.focus();
        });
        reasonTemplates.append(templateButton);
      });
      reasonBlock.append(reasonLabel, reasonInput, reasonTemplates);
      const attachmentBlock = document.createElement("div");
      attachmentBlock.className = "sm:col-span-2";
      const attachmentLabel = document.createElement("label");
      attachmentLabel.className = "field-label";
      attachmentLabel.textContent = "Chứng từ đính kèm";
      const attachmentHint = document.createElement("span");
      attachmentHint.className = "ml-1 text-[10px] font-normal text-[#8AA0B6]";
      attachmentHint.textContent = "(PDF, PNG, JPG, WEBP; tối đa 5 MB)";
      attachmentLabel.append(attachmentHint);
      const attachmentInput = document.createElement("input");
      attachmentInput.type = "file";
      attachmentInput.accept = "application/pdf,image/png,image/jpeg,image/webp";
      attachmentInput.className = "mt-1 block w-full text-xs text-[#60758A] file:mr-3 file:rounded-md file:border-0 file:bg-[#FFF3D5] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#8F5A00]";
      attachmentInput.setAttribute("aria-label", "Chứng từ thanh lý đính kèm");
      attachmentInput.addEventListener("change", () => {
        const selected = attachmentInput.files?.[0] || null;
        const supported = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
        if (selected && (!supported.includes(selected.type) || selected.size > 5 * 1024 * 1024)) {
          toast.error(selected.size > 5 * 1024 * 1024 ? "Tệp không được vượt quá 5 MB." : "Chỉ hỗ trợ tệp PDF, PNG, JPG hoặc WEBP.");
          attachmentInput.value = "";
          setRetirementAttachmentFile(null);
          return;
        }
        setRetirementAttachmentFile(selected);
        setFormDirty(true);
      });
      attachmentBlock.append(attachmentLabel, attachmentInput);
      if (retirementAttachmentFile) {
        const selectedName = document.createElement("p");
        selectedName.className = "mt-1 text-[10px] font-semibold text-[#8F5A00]";
        selectedName.textContent = `Đã chọn: ${retirementAttachmentFile.name}`;
        attachmentBlock.append(selectedName);
      }
      field.append(dateBlock, reasonBlock, attachmentBlock);
      statusField.after(field);
      return () => field.remove();
    }
    return;
  }, [isDetail, formData.statusType, retirementAttachmentFile, setFormData]);
  useEffect(() => {
    if (isDetail || formData.statusType !== "maintenance") return;
    setFormData((current) => current.status === "Bảo hành/Sửa chữa" ? current : { ...current, status: "Bảo hành/Sửa chữa" });
    const ariaLabel = mode === "create" ? "Thêm tài sản mới" : "Chỉnh sửa tài sản";
    const dialog = document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${ariaLabel}"]`);
    if (!dialog) return;
    const replacements = new Map([
      ["Nội dung cần bảo trì", "Nội dung Bảo hành/Sửa chữa"],
      ["Thông tin này sẽ được lưu cùng tài sản để theo dõi và hiển thị trong thông báo bảo trì.", "Thông tin này sẽ được lưu cùng tài sản để theo dõi và hiển thị trong thông báo Bảo hành/Sửa chữa."],
    ]);
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const replacement = replacements.get(textNode.nodeValue?.trim() || "");
      if (replacement) textNode.nodeValue = replacement;
    }
    dialog.querySelectorAll<HTMLElement>("[aria-label]").forEach((element) => {
      if (element.getAttribute("aria-label") === "Nội dung cần bảo trì") element.setAttribute("aria-label", "Nội dung Bảo hành/Sửa chữa");
    });
  }, [formData.statusType, formData.status, isDetail, mode]);
  const title = mode === "create" ? "Thêm tài sản mới" : mode === "edit" ? "Chỉnh sửa tài sản" : "Chi tiết tài sản";
  const fields: Array<{ key: keyof Asset; label: string; placeholder: string }> = [
    { key: "name", label: "Tên tài sản", placeholder: "Ví dụ: MacBook Pro 14-inch M3" },
    { key: "holder", label: "Người / Phòng giữ", placeholder: "Nhập người hoặc phòng ban" },
    { key: "value", label: "Giá trị nguyên giá (VNĐ)", placeholder: "Ví dụ: 42.500.000" },
    { key: "location", label: "Vị trí lưu trữ", placeholder: "Ví dụ: Tầng 5 · Khu A" },
    { key: "serial", label: "Số serial / IMEI", placeholder: "Nhập số serial" },
  ];
  return <div data-asset-modal onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)] ${isDetail ? "max-w-[560px]" : "max-w-[720px]"}`}>
      <div className="relative border-b border-[#E7EEF3] px-6 py-5"><div className="min-w-0 pr-14"><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">Asset catalog</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{title}</h2><p className="mt-1 max-w-full truncate whitespace-nowrap text-xs leading-5 text-[#8AA0B6]" title={isDetail ? "Thông tin định danh và vòng đời của tài sản." : "Cập nhật dữ liệu để hệ thống luôn chính xác."}>{isDetail ? "Thông tin định danh và vòng đời của tài sản." : "Cập nhật dữ liệu để hệ thống luôn chính xác."}</p>{isDetail && <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#F5F9FB] px-2 py-1 text-[10px] font-semibold text-[#71869A]" title="Thời điểm bản ghi tài sản được cập nhật gần nhất"><Clock3 size={12} className="shrink-0 text-[#0F8C8C]" aria-hidden="true" /><span className="truncate">Lần cập nhật gần nhất: {persistedAsset?.updatedAt ? new Date(persistedAsset.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : assetsQuery.isLoading ? "Đang tải..." : "Chưa ghi nhận"}</span></div>}</div><button onClick={onClose} className="absolute right-6 top-5 shrink-0 rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      {isDetail && asset ? <div className="space-y-5 p-6"><div className="flex items-center gap-4 rounded-xl bg-[#F5F9FB] p-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Laptop size={24} /></div><div className="min-w-0 flex-1"><div className="font-display text-base font-extrabold text-[#193B57]">{asset.name}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType]}`}>{asset.status}</span></div><div className="grid gap-4 sm:grid-cols-2">{[["Phân loại", asset.category], ["Người / Phòng giữ", asset.holder || "Chưa cấp phát"], ["Chi nhánh nhân sự", employeeBranchForAsset], ["Phòng ban người giữ", employeeDepartmentForAsset], ["Ngày mua", asset.date], ["Giá trị", `${formatVnd(asset.value)} VNĐ`], ["Vị trí", asset.location || "Chưa cập nhật"], ["Serial / IMEI", asset.serial || "Chưa cập nhật"], ["Nhà cung cấp", asset.supplier || "Chưa cập nhật"], ["Ngày trả nhà cung cấp", asset.supplierReturnedAt ? dateInputValue(asset.supplierReturnedAt) : "Chưa ghi nhận"], ["Lý do trả nhà cung cấp", asset.supplierReturnReason || "Chưa ghi nhận"], ["Ghi chú", asset.note || "Không có ghi chú"]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-[#E7EEF3] px-3.5 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9BAEC0]">{label}</div><div className="mt-1.5 break-words text-sm font-semibold leading-5 text-[#193B57]">{value}</div></div>)}</div><AssetAllocationHistory assetId={persistedAsset?.id || 0} branches={branchesQuery.data || []} /><section className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4"><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#B44545]"><History size={14} />Lịch sử quyết định trả nhà cung cấp</div>{asset.statusType === "returned" ? <><p className="mt-1 text-xs text-[#71869A]">Các thay đổi trạng thái, ngày trả và lý do được ghi nhận từ database.</p><div className="mt-3 space-y-2">{(assetFieldHistoryQuery.data?.items || []).filter((change) => ["status", "supplierReturnedAt", "supplierReturnReason"].includes(change.fieldName)).map((change) => <div key={change.id} className="rounded-lg border border-[#E7EEF3] bg-white px-3 py-2.5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#193B57]">{change.fieldName === "status" ? "Trạng thái" : change.fieldName === "supplierReturnedAt" ? "Ngày trả nhà cung cấp" : "Lý do trả nhà cung cấp"}</span><span className="text-[10px] text-[#8AA0B6]">{new Date(change.createdAt).toLocaleString("vi-VN")}</span></div><div className="mt-1 text-xs text-[#60758A]">{change.fieldName === "status" ? `${change.previousValue || "—"} → ${change.nextValue || "—"}` : change.nextValue || "—"}</div><div className="mt-1 text-[10px] text-[#9BAEC0]">Người thực hiện: {change.actorName || "Quản trị viên"}</div></div>)}</div><div className="mt-4 border-t border-[#E7EEF3] pt-3"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9BAEC0]">Tệp xác nhận đã tải lên</div>{asset.supplierReturnAttachmentUrl ? <a href={asset.supplierReturnAttachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7]"><Paperclip size={14} />{asset.supplierReturnAttachmentName || "Mở tệp xác nhận"}</a> : <p className="mt-2 text-xs text-[#8AA0B6]">Chưa có tệp xác nhận.</p>}</div></> : <p className="mt-2 text-xs text-[#8AA0B6]">Chưa có quyết định trả nhà cung cấp.</p>}</section><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#A86B00]"><Wrench size={14} />Lịch sử bảo trì & sửa chữa</div><p className="mt-1 text-xs text-[#71869A]">Các yêu cầu kỹ thuật phát sinh cho riêng tài sản này.</p></div><button disabled={!persistedAsset || createRepairMutation.isPending} onClick={() => setRepairOpen((current) => !current)} className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white disabled:opacity-50">{repairOpen ? "Đóng form" : "Tạo yêu cầu sửa chữa"}</button></div>{repairOpen && <div className="mt-4 rounded-lg border border-[#F2D596] bg-[#FFFDF7] p-3"><label className="field-label">Mô tả sự cố <span className="text-[#B44545]">*</span></label><textarea value={repairDescription} onChange={(event) => setRepairDescription(event.target.value)} placeholder="Ví dụ: Thiết bị không khởi động, cần kiểm tra nguồn và bo mạch..." className="field-input min-h-[74px] resize-y" /><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={repairPriority} onChange={(event) => setRepairPriority(event.target.value as typeof repairPriority)} className="field-input sm:max-w-[170px]"><option value="low">Ưu tiên thấp</option><option value="medium">Ưu tiên trung bình</option><option value="high">Ưu tiên cao</option><option value="critical">Ưu tiên khẩn cấp</option></select><button disabled={!persistedAsset || createRepairMutation.isPending} onClick={() => { if (!persistedAsset || repairDescription.trim().length < 5) { toast.error("Nhập mô tả sự cố tối thiểu 5 ký tự."); return; } createRepairMutation.mutate({ assetId: persistedAsset.id, issueType: "damage", priority: repairPriority, description: repairDescription.trim(), estimatedCost: null, dueAt: null, recurrenceDays: null }); }} className="rounded-lg bg-[#A86B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#8A5900] disabled:opacity-50">{createRepairMutation.isPending ? "Đang tạo..." : "Gửi yêu cầu sửa chữa"}</button></div></div>}{assetsQuery.isLoading || maintenanceHistoryQuery.isLoading ? <p className="mt-4 text-xs text-[#71869A]">Đang tải lịch sử bảo trì...</p> : maintenanceHistoryQuery.isError ? <p className="mt-4 rounded-lg bg-[#FDEDEE] px-3 py-2 text-xs font-semibold text-[#B44545]">Không thể tải lịch sử. <button onClick={() => maintenanceHistoryQuery.refetch()} className="underline">Thử lại</button></p> : maintenanceHistoryQuery.data?.length ? <div className="mt-4 space-y-2">{maintenanceHistoryQuery.data.map((ticket) => <div key={ticket.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-bold text-[#A86B00]">{ticket.ticketCode}</div><div className="mt-1 text-xs font-bold text-[#193B57]">{ticket.issueType === "damage" ? "Sửa chữa" : ticket.issueType === "maintenance" ? "Bảo trì định kỳ" : "Sự cố"}</div><p className="mt-1 text-xs leading-5 text-[#60758A]">{ticket.description}</p></div><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{ticket.status === "resolved" ? "Đã xử lý" : ticket.status === "closed" ? "Đã đóng" : ticket.status === "in_progress" ? "Đang xử lý" : "Mới tiếp nhận"}</span></div><div className="mt-2 text-[10px] text-[#8AA0B6]">Tạo ngày {new Date(ticket.openedAt).toLocaleDateString("vi-VN")}{ticket.resolution ? ` · Kết quả: ${ticket.resolution}` : ""}</div></div>)}</div> : <p className="mt-4 text-xs text-[#8AA0B6]">Chưa có lịch sử bảo trì hoặc sửa chữa cho tài sản này.</p>}</section><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button><button onClick={onEdit} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Chỉnh sửa tài sản</button></div></div> : <div className="p-6"><div className="mb-5 grid gap-4 sm:grid-cols-2"><div><label className="field-label">Mã tài sản</label><input value={formData.code} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><AssetCategoryPicker value={formData.categoryId} fallbackValue={formData.category} categories={categoriesQuery.data || []} onChange={(selected, rawValue) => { setFormDirty(true); setFormData((current) => ({ ...current, categoryId: selected?.id, category: selected?.name || rawValue || "", code: "" })); }} onCreate={(name) => createCategoryMutation.mutate({ name, code: "CAT", description: null })} creating={createCategoryMutation.isPending} /><div><label className="field-label">Ngày mua</label><DatePickerField value={dateInputValue(formData.date)} onChange={(value) => update("date", value)} disabled={preservePurchaseDate} data-purchase-date-picker aria-label="Ngày mua" className={preservePurchaseDate ? "bg-[#F5F8FB] text-[#71869A]" : ""} /><p className="mt-1 text-[10px] text-[#8AA0B6]">{preservePurchaseDate ? "Được giữ nguyên sau khi tài sản được tạo." : "Ngày gốc của tài sản."}</p></div><div><label className="field-label">Hạn bảo hành</label><DatePickerField value={dateInputValue(formData.warrantyUntil)} onChange={(value) => update("warrantyUntil", value)} aria-label="Hạn bảo hành" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Ngày hết hiệu lực bảo hành.</p></div>{formData.statusType === "returned" && <><div><label className="field-label">Ngày trả nhà cung cấp <span className="text-[#B44545]">*</span></label><DatePickerField value={dateInputValue(formData.supplierReturnedAt)} onChange={(value) => update("supplierReturnedAt", value)} aria-label="Ngày trả nhà cung cấp" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Ngày thực tế gửi trả hàng.</p></div><div><label className="field-label">Lý do trả nhà cung cấp <span className="text-[#B44545]">*</span></label><textarea value={formData.supplierReturnReason || ""} onChange={(e) => update("supplierReturnReason", e.target.value)} placeholder="Ví dụ: Hàng lỗi khi tiếp nhận, sai cấu hình..." className="field-input min-h-[74px] resize-y" /><label className="mt-2 block text-[10px] font-bold text-[#60758A]">Ảnh hoặc biên bản xác nhận <span className="font-normal text-[#8AA0B6]">(PDF, PNG, JPG, WEBP; tối đa 5 MB)</span></label><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { toast.error("Tệp không được vượt quá 5 MB."); e.currentTarget.value = ""; setSupplierReturnFile(null); return; } setSupplierReturnFile(file); setFormDirty(true); }} className="mt-1 block w-full text-xs text-[#60758A] file:mr-3 file:rounded-md file:border-0 file:bg-[#ECF8F7] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#087A6A]" />{supplierReturnFile && <p className="mt-1 text-[10px] font-semibold text-[#087A6A]">Đã chọn: {supplierReturnFile.name}</p>}</div></>}{fields.slice(0, 2).flatMap((field) => [<div key={field.key}><label className="field-label">{field.label}<span className="text-[#0F8C8C]"> *</span></label><input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" /></div>, ...(field.key === "holder" ? [<AssetBranchSelector key="asset-branch" value={formData.branchId ?? null} branches={branchesQuery.data || []} isLoading={branchesQuery.isLoading || assetEmployeesQuery.isLoading} isError={branchesQuery.isError || assetEmployeesQuery.isError} onRetry={() => { void branchesQuery.refetch(); void assetEmployeesQuery.refetch(); }} isLocked={Boolean(inheritedEmployeeBranchId)} onChange={(branchId) => setFormData((current) => ({ ...current, branchId }))} />, <div key="asset-status"><label className="field-label">Trạng thái</label><SearchableSelect value={formData.statusType} onChange={(value) => { const next = value as Asset["statusType"]; const label = next === "available" ? "Sẵn có" : next === "maintenance" ? "Bảo trì" : next === "returned" ? "Trả nhà cung cấp" : "Đang cấp phát"; update("status", label); update("statusType", next); if (next === "active" && formData.statusType !== "active") window.setTimeout(() => onStartHandover(formData.code), 0); }} options={[{ value: "available", label: "Sẵn có" }, { value: "active", label: "Đang cấp phát" }, { value: "maintenance", label: "Bảo trì" }, { value: "returned", label: "Trả nhà cung cấp" }]} placeholder="Chọn trạng thái" searchPlaceholder="Tìm trạng thái..." /></div>] : [])])}<AssetCatalogDropdowns vendorId={formData.vendorId} brandId={formData.brandId} vendorOptions={vendorsQuery.data || []} brandOptions={brandsQuery.data || []} quickEntryType={quickEntryType} quickEntryName={quickEntryName} onQuickEntryTypeChange={setQuickEntryType} onQuickEntryNameChange={(value) => { quickEntryNameRef.current = value; setQuickEntryName(value); }} onVendorChange={(item) => { setFormDirty(true); setFormData((current) => ({ ...current, vendorId: item?.id, supplier: item?.name || "" })); }} onBrandChange={(item) => { setFormDirty(true); setFormData((current) => ({ ...current, brandId: item?.id, brand: item?.name || "" })); }} onCreateVendor={(name) => createVendorMutation.mutate({ name, contactName: null, phone: null, email: null })} onCreateBrand={(name) => createBrandMutation.mutate({ name })} creatingVendor={createVendorMutation.isPending} creatingBrand={createBrandMutation.isPending} />{formData.statusType === "maintenance" && <div className="sm:col-span-2 rounded-xl border border-[#F2D596] bg-[#FFFDF7] p-3"><label className="field-label">Nội dung cần bảo trì <span className="text-[#B44545]">*</span></label><textarea value={formData.maintenanceReason || ""} onChange={(event) => update("maintenanceReason", event.target.value)} placeholder="Mô tả nội dung cần kiểm tra hoặc sửa chữa..." className="field-input min-h-[76px] resize-y" aria-label="Nội dung cần bảo trì" /><p className="mt-1 text-[10px] text-[#A86B00]">Thông tin này sẽ được lưu cùng tài sản để theo dõi và hiển thị trong thông báo bảo trì.</p></div>}{fields.slice(2).map((field) => <div key={field.key}><label className="field-label">{field.label}</label>{field.key === "value" ? <CurrencyInput value={String(formData.value || "")} onChange={(value) => update("value", value)} placeholder={field.placeholder} aria-label={field.label} showWords /> : <input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" />}</div>)}<div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={formData.note || ""} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung thông tin cần lưu ý..." className="field-input min-h-[80px] resize-y" /></div></div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button disabled={isSaving} onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-wait disabled:opacity-60">Hủy</button><button disabled={isSaving} aria-busy={isSaving} onClick={requestSave} className="inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A] disabled:cursor-wait disabled:opacity-75">{isSaving ? <><Loader2 size={15} className="animate-spin" />Đang lưu...</> : mode === "edit" ? "Lưu thay đổi" : "Tạo tài sản"}</button></div></div>}
          </div>
      <AlertDialog open={supplierReturnConfirmOpen} onOpenChange={setSupplierReturnConfirmOpen}><AlertDialogContent onPointerDownOutside={() => setSupplierReturnConfirmOpen(false)} onEscapeKeyDown={() => setSupplierReturnConfirmOpen(false)}><AlertDialogHeader><AlertDialogTitle>Xác nhận trả nhà cung cấp</AlertDialogTitle><AlertDialogDescription>Thao tác này sẽ chuyển tài sản <strong>{formData.code}</strong> sang Trả nhà cung cấp và loại khỏi các luồng cấp phát đang hoạt động. Hãy kiểm tra kỹ trước khi tiếp tục.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2 rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-xs text-[#7A5A00]"><div><b>Ngày trả:</b> {formData.supplierReturnedAt ? dateInputValue(formData.supplierReturnedAt) : "Chưa nhập"}</div><div><b>Lý do:</b> {formData.supplierReturnReason || "Chưa nhập"}</div><div><b>Tệp xác nhận:</b> {supplierReturnFile?.name || "Không đính kèm"}</div></div>{supplierReturnFile && supplierReturnPreviewUrl && <div className="overflow-hidden rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-2"><div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#60758A]">Xem trước tệp</div>{supplierReturnFile.type === "application/pdf" ? <iframe src={supplierReturnPreviewUrl} title="Xem trước biên bản trả nhà cung cấp" className="h-56 w-full rounded border-0" /> : <img src={supplierReturnPreviewUrl} alt="Xem trước hình ảnh xác nhận trả nhà cung cấp" className="max-h-56 w-full rounded object-contain" />}</div>}<AlertDialogFooter><AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel><AlertDialogAction onClick={() => { void confirmSupplierReturn(); }}>Xác nhận chuyển trạng thái</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function AssetAllocationHistory({ assetId, branches }: { assetId: number; branches: Array<{ id: number; code: string; name: string }> }) {
  const historyQuery = trpc.assets.history.useQuery({ assetId }, { enabled: Boolean(assetId) });
  const allocationChanges = useMemo(() => (historyQuery.data?.items || []).filter((item) => ["holder", "branchId", "branch_id"].includes(item.fieldName)), [historyQuery.data?.items]);
  const formatFieldValue = (fieldName: string, value: string | null) => {
    if (!value?.trim()) return "Chưa có thông tin";
    if (fieldName === "holder") return value;
    const branch = branches.find((item) => item.id === Number(value));
    return branch ? branch.name + " · " + branch.code : value;
  };
  return <section data-asset-allocation-history className="rounded-xl border border-[#CDE5E5] bg-[#F8FCFB] p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><History size={14} />Lịch sử người giữ & Chi nhánh</div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-extrabold text-[#087A6A] ring-1 ring-inset ring-[#CDE5E5]">{historyQuery.isLoading ? "…" : allocationChanges.length}</span></div><p className="mt-1 text-xs text-[#71869A]">Theo dõi các thay đổi phân bổ đã được ghi nhận cho tài sản.</p>{historyQuery.isLoading ? <div className="mt-3 rounded-lg bg-white px-3 py-3 text-xs text-[#71869A]">Đang tải lịch sử phân bổ...</div> : allocationChanges.length ? <div className="mt-3 space-y-2">{allocationChanges.map((item) => { const label = item.fieldName === "holder" ? "Người giữ" : "Chi nhánh"; return <div key={item.id} className="rounded-lg border border-[#DDEBEA] bg-white px-3 py-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold text-[#193B57]">{label}</span><span className="text-[10px] font-semibold text-[#8AA0B6]">{new Date(item.createdAt).toLocaleString("vi-VN")}</span></div><div className="mt-1.5 text-xs leading-5 text-[#60758A]"><span className="line-through decoration-[#C6D4DE]">{formatFieldValue(item.fieldName, item.previousValue)}</span><span className="mx-1.5 text-[#0F8C8C]">→</span><span className="font-bold text-[#193B57]">{formatFieldValue(item.fieldName, item.nextValue)}</span></div>{item.actorName && <div className="mt-1 text-[10px] text-[#8AA0B6]">Cập nhật bởi: {item.actorName}</div>}</div>; })}</div> : <div className="mt-3 rounded-lg border border-dashed border-[#CDE5E5] bg-white px-3 py-4 text-center text-xs text-[#71869A]">Chưa có thay đổi người giữ hoặc Chi nhánh được ghi nhận.</div>}</section>;
}

function AssetBranchSelector({ value, branches, isLoading, isError, onRetry, onChange, isLocked = false }: { value: number | null; branches: Array<{ id: number; code: string; name: string; isActive: boolean }>; isLoading: boolean; isError: boolean; onRetry: () => void; onChange: (branchId: number | null) => void; isLocked?: boolean }) {
  const activeBranches = branches.filter((branch) => branch.isActive);
  const defaultBranch = activeBranches.find((branch) => branch.code === "HO" || branch.code === "HO-HEAD OFFICE");
  useEffect(() => {
    if (value === null && defaultBranch) onChange(defaultBranch.id);
  }, [defaultBranch?.id, onChange, value]);
  const selectedValue = value ? String(value) : String(defaultBranch?.id || "");
  return <div data-asset-branch className="min-w-0"><div className="flex items-center justify-between gap-2"><label className="field-label">Chi nhánh</label>{isLocked && <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]" title="Chi nhánh được tự điền theo Nhân sự và không thể thay đổi"><LockKeyhole size={11} />Theo Nhân sự</span>}</div>{isLoading ? <div className="field-input flex items-center text-xs text-[#71869A]">Đang tải Chi nhánh...</div> : isError ? <div className="field-input flex items-center gap-2 text-xs text-[#B44545]">Không thể tải <button type="button" onClick={onRetry} className="font-bold underline">Thử lại</button></div> : activeBranches.length === 0 ? <div className="field-input flex items-center text-xs text-[#A86B00]">Chưa có Chi nhánh hoạt động</div> : <SearchableSelect value={selectedValue} onChange={(next) => onChange(next ? Number(next) : null)} placeholder="Chọn Chi nhánh" searchPlaceholder="Tìm tên hoặc mã Chi nhánh..." options={activeBranches.map((branch) => ({ value: String(branch.id), label: `${branch.name} · ${branch.code}`, searchText: `${branch.name} ${branch.code}` }))} disabled={isLocked} />}{isLocked && <p className="mt-1 text-[10px] text-[#71869A]">Chi nhánh được lấy từ hồ sơ Nhân sự đã chọn.</p>}</div>;
}

function AssetQrModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const payload = `ASSETMASTER|${asset.qrToken || asset.code}`;

  useEffect(() => {
    let active = true;
    setQrDataUrl("");
    setError("");
    void QRCodeGenerator.toDataURL(payload, { width: 720, margin: 2, errorCorrectionLevel: "M", color: { dark: "#102A43", light: "#FFFFFF" } })
      .then((dataUrl) => { if (active) setQrDataUrl(dataUrl); })
      .catch(() => { if (active) setError("Không thể tạo mã QR cho tài sản này."); });
    return () => { active = false; };
  }, [payload]);

  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Mã QR ${asset.code}`}>
    <div className="w-full max-w-md rounded-2xl border border-[#DDE7F0] bg-white p-6 shadow-[0_24px_70px_rgba(16,42,67,0.24)]">
      <div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><QrCode size={14} />Mã QR tài sản</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">{asset.name}</h2><p className="mt-1 font-mono text-xs font-bold text-[#0F8C8C]">{asset.code}</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      <div className="mt-6 grid min-h-[260px] place-items-center rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-5">{qrDataUrl ? <img src={qrDataUrl} alt={`Mã QR tài sản ${asset.code}`} className="h-56 w-56 rounded-lg bg-white p-2 shadow-sm" /> : error ? <p className="text-center text-sm font-semibold text-[#B44545]">{error}</p> : <p className="text-sm text-[#71869A]">Đang tạo mã QR...</p>}</div>
      <p className="mt-4 text-center text-xs leading-5 text-[#71869A]">Quét mã này để định danh tài sản trong AssetMaster. Payload: <span className="font-mono font-bold text-[#193B57]">{payload}</span></p>
      <div className="mt-5 flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button>{qrDataUrl && <a href={qrDataUrl} download={`AssetMaster-${asset.code}.png`} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Tải PNG</a>}</div>
    </div>
  </div>;
}

function QrLookupModal({ assets, onClose, onOpenAsset }: { assets: Asset[]; onClose: () => void; onOpenAsset: (asset: Asset) => void }) {
  const [input, setInput] = useState("");
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [message, setMessage] = useState("");

  const findAsset = () => {
    const candidate = input.trim().replace(/^ASSETMASTER\|/i, "");
    if (!candidate) { setMessage("Hãy quét hoặc nhập mã QR tài sản."); setMatchedAsset(null); return; }
    const matched = assets.find((asset) => asset.qrToken === candidate || asset.code.toLowerCase() === candidate.toLowerCase()) || null;
    setMatchedAsset(matched);
    setMessage(matched ? "" : "Không tìm thấy tài sản tương ứng với mã đã nhập.");
  };

  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Quét mã QR tài sản">
    <div className="w-full max-w-md rounded-2xl border border-[#DDE7F0] bg-white p-6 shadow-[0_24px_70px_rgba(16,42,67,0.24)]"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><QrCode size={14} />Nhận diện tài sản</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">Quét hoặc nhập mã QR</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Dùng camera/hardware scanner để đưa chuỗi QR vào ô bên dưới, hoặc dán mã token AssetMaster.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div><div className="mt-4 rounded-lg border border-[#CDE5E5] bg-[#ECF8F7] px-3 py-2 text-[11px] font-semibold leading-5 text-[#087A6A]">Mã QR được định danh bằng token duy nhất đã lưu cùng tài sản trong hệ thống.</div><div className="mt-5"><label className="field-label">Mã QR hoặc mã tài sản</label><input autoFocus value={input} onChange={(event) => { setInput(event.target.value); setMessage(""); setMatchedAsset(null); }} onKeyDown={(event) => { if (event.key === "Enter") findAsset(); }} placeholder="Ví dụ: ASSETMASTER|a1b2c3..." className="field-input font-mono" /></div><button onClick={findAsset} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A]"><Search size={15} />Nhận diện tài sản</button>{message && <p className="mt-3 rounded-lg bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#A86B00]">{message}</p>}{matchedAsset && <div className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]">Đã nhận diện</div><div className="mt-2 font-display text-base font-extrabold text-[#193B57]">{matchedAsset.name}</div><div className="mt-1 font-mono text-xs font-bold text-[#0F8C8C]">{matchedAsset.code}</div><div className="mt-1 text-xs text-[#60758A]">Trạng thái: {matchedAsset.status}</div><button onClick={() => onOpenAsset(matchedAsset)} className="mt-4 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#F7FFFE]">Mở chi tiết tài sản</button></div>}<div className="mt-5 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="modal-close-action">Đóng</button></div></div>
  </div>;
}

function FilterSelect({ value, onChange, options, counts, optionLabels }: { value: string; onChange: (value: string) => void; options: string[]; counts?: Record<string, number>; optionLabels?: Record<string, string> }) {
  const assetStatusOptions = options.includes("Trả nhà cung cấp") && !options.includes("Khấu hao/Thanh lý") ? [...options, "Khấu hao/Thanh lý"] : options;
  const normalizedOptions = assetStatusOptions.includes("Đã hoàn trả") && !assetStatusOptions.includes("Đã có mã biên bản thu hồi") ? [...assetStatusOptions, "Đã có mã biên bản thu hồi"] : assetStatusOptions;
  return <SearchableSelect value={value} onChange={onChange} options={normalizedOptions.map((option) => { const label = optionLabels?.[option] || (option === "Bảo trì" ? "Bảo hành/Sửa chữa" : option); const count = counts?.[option]; return { value: option, label: typeof count === "number" ? `${label} (${count})` : label, searchText: label }; })} placeholder={normalizedOptions[0] || "Chọn một giá trị"} searchPlaceholder="Tìm trong dropdown..." className="w-full shrink-0 sm:w-[180px]" />;
}
