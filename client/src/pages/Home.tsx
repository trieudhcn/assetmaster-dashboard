// Corporate Clarity: calm Swiss enterprise information design, navy structure, teal actions, amber exceptions.
// This page owns the AssetMaster dashboard composition and local interaction states.

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import QRCodeGenerator from "qrcode";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { buildFilteredAssetExportRows, buildMaintenanceExportRows, canCreateCatalogOption, filterNamedCatalogOptions, getHandoverActionTooltip, getMaintenanceBadgeCount, getNewMaintenanceRequestBadge, getPaginationWindow, matchesVietnameseSearch, toggleMaintenanceStatusFilter } from "@/lib/catalogUi";
import { getNotificationTargetLabel, type NotificationTarget } from "@/lib/notificationLinks";
import { handoverPdfFontUrl, registerVietnamesePdfFont } from "@/lib/handoverPdf";
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
} from "@/components/ui/alert-dialog";
import { AuditPage, MaintenancePage, ReportsPage } from "./OperationsModules";
import { EmployeeManagementView } from "./EmployeeManagementView";
import { ReportsManagementView } from "./ReportsManagementView";
import { OrganizationManagementPage } from "./OrganizationManagementPage";
import { VendorBrandManagementPage } from "./VendorBrandManagementPage";
import { AssetCategoryManagementPage } from "./AssetCategoryManagementPage";
import { LoginGateway } from "./LoginGateway";
import { UserDashboard } from "./UserDashboard";
import { HelpCenter } from "./HelpCenter";
import { AssetImportModal } from "@/components/AssetImportModal";
import { AssetFieldHistoryDrawer, LatestImportUndo } from "@/components/AssetImportRecovery";
import { AssetCatalogDropdowns } from "@/components/AssetCatalogDropdowns";
import { AssetCategoryPicker } from "@/components/AssetCategoryPicker";
import { CompanyBrandSettings } from "@/components/CompanyBrandSettings";
import { ModuleEmptyState } from "@/components/ModuleEmptyState";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";
import { BrandEnhancementsPanel } from "@/components/BrandEnhancementsPanel";
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
  { label: "Bàn giao & Cấp phát", icon: PackageCheck },
  { label: "Bảo trì & Báo hỏng", icon: Wrench },
  { label: "Kiểm kê", icon: ClipboardCheck },
  { label: "Báo cáo", icon: FileBarChart },
  { label: "Quản lý nhân viên", icon: UserRound },
  { label: "Phòng Ban & Bộ Phận", icon: Building2 },
  { label: "Nhà cung cấp & Hãng", icon: Tags },
];

type Asset = {
  code: string;
  qrToken?: string;
  name: string;
  category: string;
  categoryId?: number;
  holder: string;
  status: string;
  statusType: "active" | "available" | "maintenance" | "returned";
  date: string;
  purchaseDate?: string;
  value: string;
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
  supplierReturnAttachmentUrl?: string | null;
  supplierReturnAttachmentName?: string | null;
  supplierReturnAttachmentContentType?: string | null;
};

type SupplierReturnAttachment = { fileName: string; contentType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp"; dataUrl: string };

type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  phone: string;
  websiteTitle: string;
  logoUrl: string;
  brandColor: string;
  faviconUrl: string;
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
  websiteTitle: "AssetMaster – Hệ thống Quản lý Tài sản",
  logoUrl: "",
  brandColor: "#0F8C8C",
  faviconUrl: "",
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
    const deepLinks: Record<string, string> = { assets: "Danh mục tài sản", categories: "Phân loại tài sản", maintenance: "Bảo trì & Báo hỏng", audit: "Kiểm kê", reports: "Báo cáo", employees: "Quản lý nhân viên", organization: "Phòng Ban & Bộ Phận", vendors: "Nhà cung cấp & Hãng", handovers: "Bàn giao & Cấp phát", help: "Trợ giúp & hướng dẫn" };
    return view ? deepLinks[view] || "Tổng quan" : "Tổng quan";
  });
  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [assetModal, setAssetModal] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [handoverAssetCode, setHandoverAssetCode] = useState<string | null>(null);
  const [qrLookupOpen, setQrLookupOpen] = useState(false);
  const [assetImportOpen, setAssetImportOpen] = useState(false);
  const [assetHistoryId, setAssetHistoryId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Asset>({ code: "", name: "", category: "", holder: "", status: "Sẵn có", statusType: "available", date: new Date().toISOString().slice(0, 10), value: "", location: "", serial: "", supplier: "", note: "" });
  const pendingSupplierReturnAttachmentRef = useRef<SupplierReturnAttachment | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả loại tài sản");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [department, setDepartment] = useState("Tất cả phòng ban");
  const [vendorFilter, setVendorFilter] = useState("Tất cả nhà cung cấp");
  const [brandFilter, setBrandFilter] = useState("Tất cả hãng");
  const [warrantyFilter, setWarrantyFilter] = useState("Tất cả bảo hành");
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
  const isAdmin = user?.role === "admin";
  const assetQuery = trpc.assets.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const assetCategoriesQuery = trpc.assetCategories.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const maintenanceTicketsQuery = trpc.maintenance.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const vendorsQuery = trpc.vendors.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const brandsQuery = trpc.brands.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const companyQuery = trpc.company.get.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const notificationHandoversQuery = trpc.handovers.list.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const notificationPreferencesQuery = trpc.notifications.preferences.useQuery(undefined, { enabled: isAuthenticated });
  const maintenanceBadgeCount = getMaintenanceBadgeCount(assetRows);
  const newMaintenanceRequestBadge = getNewMaintenanceRequestBadge(maintenanceTicketsQuery.data || []);
  const maintenanceRequestBadgeTone = { low: "bg-[#EAF3FF] text-[#2666A8]", medium: "bg-[#FFF0C9] text-[#A86B00]", high: "bg-[#FFE7CF] text-[#B85B16]", critical: "bg-[#FDEDEE] text-[#B44545]" }[newMaintenanceRequestBadge.priority || "low"];
  const sidebarNavItems = navItems.map((item) => ({ ...item, maintenanceAssetCount: item.label === "Bảo trì & Báo hỏng" ? maintenanceBadgeCount : 0, maintenanceRequestCount: item.label === "Bảo trì & Báo hỏng" ? newMaintenanceRequestBadge.count : 0 }));
  const trpcUtils = trpc.useUtils();
  const saveCompanyMutation = trpc.company.save.useMutation({ onSuccess: () => companyQuery.refetch() });
  const saveNotificationPreferencesMutation = trpc.notifications.savePreferences.useMutation({
    onSuccess: (_result, nextPreferences) => {
      trpcUtils.notifications.preferences.setData(undefined, nextPreferences);
      toast.success("Đã lưu tùy chọn thông báo.");
    },
    onError: (error) => toast.error(error.message || "Không thể lưu tùy chọn thông báo."),
  });
  const createAssetMutation = trpc.assets.create.useMutation({ onSuccess: () => { void assetQuery.refetch(); setAssetModal(null); toast.success("Đã tạo tài sản và lưu vào hệ thống."); }, onError: (error) => toast.error(error.message || "Không thể tạo tài sản.") });
  const uploadSupplierReturnAttachmentMutation = trpc.assets.uploadSupplierReturnAttachment.useMutation({ onSuccess: () => { void assetQuery.refetch(); toast.success("Đã lưu tệp xác nhận trả nhà cung cấp."); }, onError: (error) => toast.error(error.message || "Không thể lưu tệp xác nhận trả nhà cung cấp.") });
  const updateAssetMutation = trpc.assets.update.useMutation({ onSuccess: (_result, variables) => { void assetQuery.refetch(); void maintenanceTicketsQuery.refetch(); setAssetModal(null); toast.success("Đã cập nhật tài sản và trạng thái bảo trì."); if (variables.id && pendingSupplierReturnAttachmentRef.current) { const attachment = pendingSupplierReturnAttachmentRef.current; pendingSupplierReturnAttachmentRef.current = null; uploadSupplierReturnAttachmentMutation.mutate({ id: variables.id, ...attachment }); } }, onError: (error) => { pendingSupplierReturnAttachmentRef.current = null; toast.error(error.message || "Không thể cập nhật tài sản."); } });

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
      code: asset.assetCode, qrToken: asset.qrToken, name: asset.name, category: asset.categoryId ? assetCategoriesQuery.data?.find((category) => category.id === asset.categoryId)?.name || "Chưa phân loại" : typeof (asset.metadata as { category?: unknown } | null)?.category === "string" ? String((asset.metadata as { category?: unknown }).category) : "Chưa phân loại", categoryId: asset.categoryId || undefined, holder: asset.holderName || (asset.status === "maintenance" ? "Bảo trì" : asset.status === "available" ? "Chưa bàn giao" : "Chưa cấp phát"), status: asset.status === "assigned" ? "Đang cấp phát" : asset.status === "maintenance" ? "Bảo trì" : asset.status === "returned_to_vendor" ? "Trả nhà cung cấp" : "Sẵn có", statusType: asset.status === "assigned" ? "active" : asset.status === "maintenance" ? "maintenance" : asset.status === "returned_to_vendor" ? "returned" : "available", date: asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "—", purchaseDate: asset.purchaseDate ? dateInputValue(asset.purchaseDate) : "", value: asset.purchaseValue ? String(asset.purchaseValue) : "0", location: asset.location || "", serial: asset.serialNumber || "", maintenanceReason: asset.maintenanceReason || "", supplier: asset.vendor || vendorsQuery.data?.find((vendor) => vendor.id === asset.vendorId)?.name || "", vendorId: asset.vendorId || undefined, brand: brandsQuery.data?.find((brand) => brand.id === asset.brandId)?.name || "", brandId: asset.brandId || undefined, note: asset.note || "", warrantyUntil: asset.warrantyUntil ? new Date(asset.warrantyUntil).toISOString().slice(0, 10) : "", supplierReturnedAt: asset.supplierReturnedAt ? new Date(asset.supplierReturnedAt).toISOString().slice(0, 10) : "", supplierReturnReason: asset.supplierReturnReason || "", supplierReturnAttachmentUrl: asset.supplierReturnAttachmentUrl || null, supplierReturnAttachmentName: asset.supplierReturnAttachmentName || null, supplierReturnAttachmentContentType: asset.supplierReturnAttachmentContentType || null,
    })));
  }, [assetQuery.data, vendorsQuery.data, brandsQuery.data, assetCategoriesQuery.data]);

  useEffect(() => {
    if (!companyQuery.data) return;
    const next = { name: companyQuery.data.name, address: companyQuery.data.address || "", taxCode: companyQuery.data.taxCode || "", phone: companyQuery.data.phone || "", websiteTitle: companyQuery.data.websiteTitle || "AssetMaster – Hệ thống Quản lý Tài sản", logoUrl: companyQuery.data.logoUrl || "", brandColor: companyQuery.data.brandColor || "#0F8C8C", faviconUrl: companyQuery.data.faviconUrl || "" };
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
    const decorateActionTooltips = () => {
      document.querySelectorAll<HTMLElement>("button, a").forEach((element) => {
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
        const fallbackLabel = !sourceLabel && !visibleText ? iconFallbackLabels[iconName] : undefined;
        const cancelLabel = !sourceLabel && /^(Hủy|Quay lại|Đóng)$/.test(visibleText) ? (visibleText === "Hủy" ? "Hủy thao tác" : visibleText) : undefined;
        const label = sourceLabel ? handoverTooltipMap[sourceLabel] || sourceLabel : fallbackLabel || cancelLabel;
        if (!label) return;
        if (label !== sourceLabel) element.setAttribute("aria-label", label);
        element.dataset.tooltip = label;
        element.removeAttribute("title");
        element.classList.add("icon-action-tooltip");
      });
    };
    decorateActionTooltips();
    const observer = new MutationObserver(decorateActionTooltips);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  const filteredAssets = useMemo(() => assetRows.filter((asset) => {
    const matchesQuery = matchesVietnameseSearch(`${asset.code} ${asset.name} ${asset.holder}`, query);
    const matchesCategory = category === "Tất cả loại tài sản" || asset.category === category;
    const matchesStatus = status === "Tất cả trạng thái" || asset.status === status;
    const matchesDepartment = department === "Tất cả phòng ban" || asset.holder.includes(department);
    const matchesVendor = vendorFilter === "Tất cả nhà cung cấp" || asset.supplier === vendorFilter;
    const matchesBrand = brandFilter === "Tất cả hãng" || asset.brand === brandFilter;
    const warrantyState = getWarrantyState(asset.warrantyUntil);
    const matchesWarranty = warrantyFilter === "Tất cả bảo hành" || (warrantyFilter === "Đang bảo hành" && warrantyState === "active") || (warrantyFilter === "Sắp hết hạn" && warrantyState === "expiring") || (warrantyFilter === "Đã hết hạn" && warrantyState === "expired");
    return matchesQuery && matchesCategory && matchesStatus && matchesDepartment && matchesVendor && matchesBrand && matchesWarranty;
  }), [assetRows, query, category, status, department, vendorFilter, brandFilter, warrantyFilter]);
  const inventoryAssetRows = useMemo(() => assetRows.filter((asset) => asset.statusType !== "returned"), [assetRows]);
  const assetValueTotal = inventoryAssetRows.reduce((total, asset) => total + Number(asset.value || 0), 0);
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
      title: `${asset.code} đang bảo trì`,
      description: asset.maintenanceReason?.trim() || `Theo dõi tiến độ xử lý cho ${asset.name}.`,
      createdAt: assetQuery.data?.find((item) => item.assetCode === asset.code)?.updatedAt || new Date(),
      kind: "maintenance" as const,
      target: { type: "asset" as const, assetCode: asset.code },
    })) : [];
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
    return [...returnRequestNotifications, ...maintenanceRequestNotifications, ...maintenanceNotifications, ...handoverNotifications].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
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
  const dashboardKpis = [
    { label: "Tổng tài sản", value: String(inventoryAssetRows.length), detail: "Tài sản còn thuộc công ty", icon: Box, tone: "teal" },
    { label: "Đang sử dụng", value: String(inventoryAssetRows.filter((asset) => asset.statusType === "active").length), detail: "Tài sản đã cấp phát", icon: UsersRound, tone: "blue" },
    { label: "Đang bảo trì / Hỏng", value: String(inventoryAssetRows.filter((asset) => asset.statusType === "maintenance").length), detail: "Cần theo dõi xử lý", icon: Wrench, tone: "amber" },
    { label: "Tổng giá trị", value: `${formatVnd(assetValueTotal)} VNĐ`, detail: "Giá trị nguyên giá", icon: Tags, tone: "navy" },
  ];
  const dashboardLastSyncedAt = assetQuery.dataUpdatedAt ? new Date(assetQuery.dataUpdatedAt) : null;
  const dashboardSyncLabel = dashboardLastSyncedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(dashboardLastSyncedAt) : "Đang tải dữ liệu...";
  const refreshDashboardData = async () => {
    const refreshToast = toast.loading("Đang đồng bộ dữ liệu dashboard...");
    try {
      await Promise.all([assetQuery.refetch(), maintenanceTicketsQuery.refetch()]);
      toast.success("Dữ liệu dashboard đã được đồng bộ.", { id: refreshToast });
    } catch {
      toast.error("Không thể đồng bộ dữ liệu dashboard. Vui lòng thử lại.", { id: refreshToast });
    }
  };

  const openCreateModal = () => { setFormData({ code: "", name: "", category: "", holder: "", status: "Sẵn có", statusType: "available", date: new Date().toISOString().slice(0, 10), value: "", location: "", serial: "", maintenanceReason: "", supplier: "", warrantyUntil: "", supplierReturnedAt: "", supplierReturnReason: "", note: "" }); setSelectedAsset(null); setAssetModal("create"); };
  const openEditModal = (asset: Asset) => { setSelectedAsset(asset); setFormData({ ...asset, date: dateInputValue(asset.purchaseDate || asset.date) }); setAssetModal("edit"); };
  const openDetailModal = (asset: Asset) => { setSelectedAsset(asset); setAssetModal("detail"); };
  const saveAsset = (attachment?: SupplierReturnAttachment) => { if (!formData.name.trim() || !formData.value.trim()) { toast.error("Vui lòng nhập tên tài sản và giá trị."); return; } if (!formData.categoryId || !formData.code) { toast.error("Vui lòng chọn Phân loại để hệ thống tạo mã tài sản."); return; } if (formData.statusType === "maintenance" && !formData.maintenanceReason?.trim()) { toast.error("Vui lòng nhập lý do bảo trì trước khi lưu."); return; } const payload = { assetCode: formData.code, name: formData.name, holderName: formData.statusType === "active" ? formData.holder || null : null, status: formData.statusType === "active" ? "assigned" as const : formData.statusType === "maintenance" ? "maintenance" as const : formData.statusType === "returned" ? "returned_to_vendor" as const : "available" as const, condition: "good" as const, purchaseValue: formData.value.replace(/[^0-9.]/g, "") || "0", vendor: formData.supplier || null, vendorId: formData.vendorId || null, brandId: formData.brandId || null, serialNumber: formData.serial || null, location: formData.location || null, note: formData.note || null, maintenanceReason: formData.statusType === "maintenance" ? (formData.maintenanceReason || "").trim() : null, purchaseDate: normalizePurchaseDate(formData.date), warrantyUntil: normalizePurchaseDate(formData.warrantyUntil), supplierReturnedAt: normalizePurchaseDate(formData.supplierReturnedAt), supplierReturnReason: formData.statusType === "returned" ? (formData.supplierReturnReason || "").trim() || null : formData.supplierReturnReason || null, categoryId: formData.categoryId, departmentId: null }; if (assetModal === "edit") { const target = assetQuery.data?.find((asset) => asset.assetCode === formData.code); if (!target) { toast.error("Không tìm thấy tài sản để cập nhật."); return; } pendingSupplierReturnAttachmentRef.current = attachment || null; updateAssetMutation.mutate({ id: target.id, ...payload }); } else { createAssetMutation.mutate(payload); } };
  const showComingSoon = (label: string) => toast.info(`${label} sẽ được mở trong phiên bản tiếp theo.`, { description: "Bản xem trước hiện đang dùng dữ liệu mẫu để minh họa giao diện." });
  const navigateTo = (label: string) => {
    const viewByNav: Record<string, string> = { "Danh mục tài sản": "assets", "Phân loại tài sản": "categories", "Bàn giao & Cấp phát": "handovers", "Bảo trì & Báo hỏng": "maintenance", "Kiểm kê": "audit", "Báo cáo": "reports", "Quản lý nhân viên": "employees", "Phòng Ban & Bộ Phận": "organization", "Nhà cung cấp & Hãng": "vendors", "Trợ giúp & hướng dẫn": "help" };
    const url = new URL(window.location.href);
    const view = viewByNav[label];
    if (view) url.searchParams.set("view", view); else url.searchParams.delete("view");
    window.history.replaceState({}, "", url);
    setActiveNav(label);
    setMobileNavOpen(false);
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#F4F7FB] px-6"><div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0F8C8C] text-white shadow-[0_10px_22px_rgba(15,140,140,.24)]"><Box size={22} /></div><div className="mt-4 text-sm font-extrabold text-[#193B57]">Đang kiểm tra phiên đăng nhập...</div></div></div>;
  if (!isAuthenticated) return <LoginGateway onLogin={startLogin} />;
  if (!isAdmin && user) return <UserDashboard user={user} onLogout={logout} companyInfo={companyInfo} />;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102A43] antialiased">
      <FloatingActionTooltip />
      <ExportPreviewHost />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-hidden border-r border-[#DDE7F0] bg-[#102A43] px-4 py-5 shadow-[8px_0_30px_rgba(16,42,67,0.16)] transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex shrink-0 items-center gap-3 px-3 pb-6">
          <div style={{ backgroundColor: companyInfo.brandColor }} className="grid h-10 w-10 place-items-center rounded-[13px] shadow-[0_8px_18px_rgba(15,140,140,0.24)]">
            <img src={companyInfo.logoUrl || "/manus-storage/assetmaster-logo_f5d79b06.png"} alt="Logo công ty" className="h-7 w-7 object-contain" />
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
            <div ref={notificationsRef} className="relative">
              <button data-suppress-icon-tooltip="true" onClick={() => { if (notificationsOpen) closeNotifications(); else { setNotificationsClosing(false); setNotificationsOpen(true); } setHeaderProfileOpen(false); }} className={`notification-bell relative rounded-lg p-2 text-[#60758A] hover:bg-[#F0F5F8] ${hasUnreadNotifications ? "notification-bell--unread" : ""}`} aria-label="Thông báo" aria-expanded={notificationsOpen}>
                <Bell size={19} />
                {hasUnreadNotifications && <span aria-label={`${unreadNotifications.length} thông báo chưa đọc`} className="notification-pulse absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-[#F0A516] px-1 text-[9px] font-extrabold leading-none text-[#102A43] ring-2 ring-white">{unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}</span>}
              </button>
              {notificationsOpen && <div className={`absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#DDE7F0] bg-white shadow-[0_18px_42px_rgba(16,42,67,0.18)] ${notificationsClosing ? "popup-surface--closing" : ""}`}>
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
        {activeNav === "Cài đặt" ? <><CompanyBrandSettings companyInfo={companyInfo} onSave={(next) => { setCompanyInfo(next); localStorage.setItem("assetmaster-company-info", JSON.stringify(next)); document.title = next.websiteTitle; saveCompanyMutation.mutate({ name: next.name, address: next.address || null, taxCode: next.taxCode || null, phone: next.phone || null, logoUrl: next.logoUrl || null, websiteTitle: next.websiteTitle || null, brandColor: next.brandColor || "#0F8C8C", faviconUrl: next.faviconUrl || null }, { onSuccess: () => { void companyQuery.refetch(); toast.success("Đã lưu cài đặt thương hiệu."); }, onError: (error) => toast.error(error.message || "Không thể lưu cài đặt thương hiệu.") }); }} /><BrandEnhancementsPanel info={companyInfo} onSave={(next) => { setCompanyInfo(next); localStorage.setItem("assetmaster-company-info", JSON.stringify(next)); document.documentElement.style.setProperty("--assetmaster-brand", next.brandColor); const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]') || Object.assign(document.createElement("link"), { rel: "icon" }); if (next.faviconUrl) { favicon.href = next.faviconUrl; if (!favicon.parentNode) document.head.appendChild(favicon); } saveCompanyMutation.mutate({ name: next.name, address: next.address || null, taxCode: next.taxCode || null, phone: next.phone || null, logoUrl: next.logoUrl || null, websiteTitle: next.websiteTitle || null, brandColor: next.brandColor || "#0F8C8C", faviconUrl: next.faviconUrl || null }, { onSuccess: () => { void companyQuery.refetch(); } }); }} /></> : null}
        {activeNav === "Bảo trì & Báo hỏng" ? <MaintenancePage /> : null}
        {activeNav === "Kiểm kê" ? <AuditPage /> : null}
        {activeNav === "Báo cáo" ? <ReportsManagementView /> : null}
        {activeNav === "Quản lý nhân viên" ? <EmployeeManagementView /> : null}
        {activeNav === "Phòng Ban & Bộ Phận" ? <OrganizationManagementPage /> : null}
        {activeNav === "Nhà cung cấp & Hãng" ? <VendorBrandManagementPage /> : null}
        {activeNav === "Trợ giúp & hướng dẫn" ? <HelpCenter /> : null}
        {activeNav === "Danh mục tài sản" ? <PaginatedAssetCatalogPage assets={filteredAssets} query={query} category={category} status={status} department={department} vendor={vendorFilter} brand={brandFilter} warranty={warrantyFilter} vendorOptions={["Tất cả nhà cung cấp", ...(vendorsQuery.data || []).map((item) => item.name)]} brandOptions={["Tất cả hãng", ...(brandsQuery.data || []).map((item) => item.name)]} onQueryChange={setQuery} onCategoryChange={setCategory} onStatusChange={setStatus} onDepartmentChange={setDepartment} onVendorChange={setVendorFilter} onBrandChange={setBrandFilter} onWarrantyChange={setWarrantyFilter} onReset={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); setVendorFilter("Tất cả nhà cung cấp"); setBrandFilter("Tất cả hãng"); setWarrantyFilter("Tất cả bảo hành"); }} onCreate={openCreateModal} onEdit={openEditModal} onOpenDetail={openDetailModal} onOpenQr={setQrAsset} onAssign={(asset) => { if (asset.statusType !== "available") { toast.error("Chỉ có thể bàn giao tài sản đang sẵn có."); return; } setHandoverAssetCode(asset.code); }} /> : null}
        <div className={`px-4 py-7 sm:px-6 lg:px-9 lg:py-8 ${activeNav === "Tổng quan" ? "" : "hidden"}`}>
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516] shadow-[0_0_0_4px_rgba(240,165,22,0.12)]" /><EditableSectionLabel labelKey="dashboard-operations" fallback="Asset Operations" canEdit={isAdmin} /></div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Tổng quan tài sản</h1><p className="mt-1.5 text-sm text-[#71869A]">Theo dõi, quản lý và tối ưu toàn bộ tài sản doanh nghiệp.</p></div><div data-dashboard-freshness className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE9ED] bg-white px-3 py-2.5 shadow-[0_8px_20px_rgba(16,42,67,0.045)] sm:min-w-[285px]"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E6F6F2] text-[#087A6A]"><CalendarDays size={15} /></span><div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7890A5]">Trạng thái dữ liệu</div><div className="mt-0.5 truncate text-xs font-bold text-[#193B57]">Đồng bộ lúc {dashboardSyncLabel}</div></div></div><button type="button" onClick={() => void refreshDashboardData()} disabled={assetQuery.isFetching || maintenanceTicketsQuery.isFetching} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#CDE5E5] text-[#087A6A] transition hover:bg-[#E6F6F2] disabled:cursor-not-allowed disabled:opacity-55" aria-label="Đồng bộ lại dữ liệu dashboard" title="Đồng bộ lại dữ liệu"><ArrowDownUp size={15} className={assetQuery.isFetching || maintenanceTicketsQuery.isFetching ? "animate-spin" : ""} /></button></div></div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardKpis.map((kpi, index) => { const Icon = kpi.icon; const toneMap: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; return <div key={kpi.label} className="animate-kpi group rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,42,67,0.08)]" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-[11px] ${toneMap[kpi.tone]}`}><Icon size={19} /></div></div><div className="mt-5 text-[12px] font-semibold text-[#7890A5]">{kpi.label}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-[26px] font-extrabold tracking-[-0.04em] text-[#102A43]">{kpi.value}</span></div><div className="mt-2 text-[11px] font-medium text-[#9AAEBD]">{kpi.detail}</div></div>; })}
            </section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
                <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><FileBarChart size={16} className="text-[#0F8C8C]" />Phân bổ vận hành</div><p className="mt-1 text-xs text-[#71869A]">Tỷ trọng tài sản theo tình trạng đang quản lý.</p></div><button onClick={() => navigateTo("Danh mục tài sản")} className="rounded-lg border border-[#CDE5E5] px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7]">Mở danh mục</button></div>
                <div className="mt-5 space-y-4">{[{ label: "Đang cấp phát", count: inventoryAssetRows.filter((asset) => asset.statusType === "active").length, tone: "bg-[#3278BD]" }, { label: "Sẵn có", count: inventoryAssetRows.filter((asset) => asset.statusType === "available").length, tone: "bg-[#0F8C8C]" }, { label: "Bảo trì / hỏng", count: inventoryAssetRows.filter((asset) => asset.statusType === "maintenance").length, tone: "bg-[#F0A516]" }].map((item) => <div key={item.label}><div className="flex justify-between text-xs"><span className="font-bold text-[#60758A]">{item.label}</span><span className="font-extrabold text-[#193B57]">{item.count} tài sản</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDF2F5]"><div className={`h-full rounded-full ${item.tone}`} style={{ width: `${inventoryAssetRows.length ? Math.max((item.count / inventoryAssetRows.length) * 100, item.count ? 8 : 0) : 0}%` }} /></div></div>)}</div>
              </div>
              <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Clock3 size={16} className="text-[#A86B00]" />Điều hành hôm nay</div><p className="mt-1 text-xs text-[#71869A]">Lối tắt đến các tác vụ nghiệp vụ thường dùng.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><button onClick={() => navigateTo("Bàn giao & Cấp phát")} className="flex items-center justify-between rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] p-3 text-left transition hover:bg-[#ECF8F7]"><span><span className="block text-xs font-extrabold text-[#087A6A]">Cấp phát thiết bị</span><span className="mt-1 block text-[11px] text-[#6B8F8D]">Lập phiếu, ký và in biên bản.</span></span><PackageCheck size={17} className="text-[#0F8C8C]" /></button><button onClick={() => navigateTo("Bảo trì & Báo hỏng")} className="flex items-center justify-between rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-left transition hover:bg-[#FFF5DC]"><span><span className="block text-xs font-extrabold text-[#A86B00]">Xử lý bảo trì</span><span className="mt-1 block text-[11px] text-[#8F6A31]">Tạo và theo dõi yêu cầu sửa chữa.</span></span><Wrench size={17} className="text-[#A86B00]" /></button><button onClick={() => navigateTo("Kiểm kê")} className="flex items-center justify-between rounded-lg border border-[#DDE7F0] bg-[#FBFCFD] p-3 text-left transition hover:bg-[#F4F7FB]"><span><span className="block text-xs font-extrabold text-[#193B57]">Kiểm kê tài sản</span><span className="mt-1 block text-[11px] text-[#71869A]">Lập đợt và đối chiếu thực tế.</span></span><ClipboardCheck size={17} className="text-[#527089]" /></button></div></div>
            </section>

            <section className="mt-8 hidden overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
              <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh mục tài sản</h2><p className="mt-1 text-xs text-[#8AA0B6]">Quản lý và tra cứu tài sản trong doanh nghiệp</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button><button onClick={() => showComingSoon("Bộ lọc nâng cao")} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><Filter size={14} />Bộ lọc nâng cao</button></div></div>
              <div className="grid gap-3 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"><div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={category} onChange={setCategory} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={setStatus} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo trì", "Trả nhà cung cấp"]} /><FilterSelect value={department} onChange={setDepartment} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /></div>
              <div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th><th className="px-4 py-3.5">Phân loại</th><th className="px-4 py-3.5">Người / Phòng giữ</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Ngày mua</th><th className="px-4 py-3.5 text-right">Giá trị</th><th className="px-5 py-3.5 text-right">Hành động</th></tr></thead><tbody>{filteredAssets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">Tài sản cố định</div></div></div></td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.category}</td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType as keyof typeof statusStyles]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{asset.date}</td><td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{formatVnd(asset.value)} <span className="text-[10px] font-semibold text-[#9BAEC0]">VNĐ</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100"><button onClick={() => openEditModal(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Chỉnh sửa"><Settings2 size={15} /></button><button onClick={() => setQrAsset(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label={`Mã QR ${asset.code}`}><QrCode size={15} /></button><button onClick={() => showComingSoon(`Bàn giao ${asset.code}`)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Bàn giao"><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{filteredAssets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div>
              <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row"><div className="text-xs text-[#8AA0B6]">Hiển thị <span className="font-bold text-[#60758A]">{filteredAssets.length}</span> trên <span className="font-bold text-[#60758A]">{assetRows.length}</span> tài sản</div><div className="flex items-center gap-1"><button className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#B1C0CC]" disabled>‹</button><button className="grid h-8 w-8 place-items-center rounded-md bg-[#102A43] text-xs font-bold text-white">1</button><button onClick={() => showComingSoon("Phân trang sẽ mở khi danh mục có nhiều hơn một trang")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">›</button></div></div>
            </section>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><Sparkles size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Kiểm kê và đối soát tài sản</div><div className="mt-0.5 text-[11px] text-[#4B8884]">{inventoryAssetRows.length} tài sản còn thuộc công ty; mở Kiểm kê để lập đợt và ghi nhận kết quả thực tế.</div></div></div><button onClick={() => navigateTo("Kiểm kê")} className="hidden text-xs font-extrabold text-[#087A6A] underline decoration-[#8BCDC6] underline-offset-4 sm:block">Mở kiểm kê <span className="no-underline">→</span></button></div>
          </div>
        </div>
        {assetModal && <AssetModal mode={assetModal} asset={selectedAsset} formData={formData} setFormData={setFormData} isSaving={createAssetMutation.isPending || updateAssetMutation.isPending} onClose={() => setAssetModal(null)} onSave={saveAsset} onEdit={() => selectedAsset && openEditModal(selectedAsset)} onStartHandover={(assetCode) => { setAssetModal(null); setHandoverAssetCode(assetCode); }} />}
        {assetImportOpen && <AssetImportModal onClose={() => setAssetImportOpen(false)} onImported={() => { void assetQuery.refetch(); }} />}
        {isAdmin && <LatestImportUndo onUndone={() => { void assetQuery.refetch(); }} />}
        {assetHistoryId && <AssetFieldHistoryDrawer assetId={assetHistoryId} onClose={() => setAssetHistoryId(null)} />}
        {qrAsset && <AssetQrModal asset={qrAsset} onClose={() => setQrAsset(null)} />}
        {qrLookupOpen && <QrLookupModal assets={assetRows} onClose={() => setQrLookupOpen(false)} onOpenAsset={(asset) => { setQrLookupOpen(false); setSelectedAsset(asset); setAssetModal("detail"); }} />}
        {handoverAssetCode && <AssetQuickHandoverModal assetCode={handoverAssetCode} onClose={() => setHandoverAssetCode(null)} />}
      </main>
    </div>
  );
}

function AssetCatalogPage({ assets, totalAssets, query, category, status, department, vendor, brand, warranty, vendorOptions, brandOptions, onQueryChange, onCategoryChange, onStatusChange, onDepartmentChange, onVendorChange, onBrandChange, onWarrantyChange, onReset, onCreate, onEdit, onOpenDetail, onOpenQr, onAssign }: { assets: Asset[]; totalAssets: number; query: string; category: string; status: string; department: string; vendor: string; brand: string; warranty: string; vendorOptions: string[]; brandOptions: string[]; onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void; onStatusChange: (value: string) => void; onDepartmentChange: (value: string) => void; onVendorChange: (value: string) => void; onBrandChange: (value: string) => void; onWarrantyChange: (value: string) => void; onReset: () => void; onCreate: () => void; onEdit: (asset: Asset) => void; onOpenDetail: (asset: Asset) => void; onOpenQr: (asset: Asset) => void; onAssign: (asset: Asset) => void }) {
  const assignedCount = assets.filter((asset) => asset.statusType === "active").length;
  const maintenanceCount = assets.filter((asset) => asset.statusType === "maintenance").length;
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#0F8C8C]" />Asset registry</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Danh mục tài sản</h1><p className="mt-1.5 max-w-2xl text-sm text-[#71869A]">Tra cứu, phân loại và thực hiện các thao tác quản trị trên từng tài sản.</p></div><button onClick={onCreate} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A]"><Plus size={16} />Thêm tài sản mới</button></div><section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="text-[11px] font-bold text-[#8AA0B6]">Tài sản hiển thị</div><div className="mt-2 font-display text-2xl font-extrabold text-[#102A43]">{assets.length}<span className="ml-1 text-xs font-semibold text-[#8AA0B6]">/ {totalAssets}</span></div></div><div className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="text-[11px] font-bold text-[#4B8884]">Đang cấp phát trong phạm vi</div><div className="mt-2 font-display text-2xl font-extrabold text-[#087A6A]">{assignedCount}</div></div><div className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4"><div className="text-[11px] font-bold text-[#8F6A31]">Bảo trì / hỏng trong phạm vi</div><div className="mt-2 font-display text-2xl font-extrabold text-[#A86B00]">{maintenanceCount}</div></div></section><section className="mt-5 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh sách quản trị</h2><p className="mt-1 text-xs text-[#8AA0B6]">Tìm đúng tài sản trước khi xem hồ sơ, điều chỉnh thông tin, tạo QR hoặc cấp phát.</p></div><button onClick={onReset} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại bộ lọc</button></div><div className="flex flex-wrap items-center gap-2 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4"><div className="relative min-w-0 flex-[2_1_420px]"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm mã, tên hoặc người giữ..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={category} onChange={onCategoryChange} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={onStatusChange} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo trì", "Trả nhà cung cấp"]} /><FilterSelect value={department} onChange={onDepartmentChange} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /><FilterSelect value={vendor} onChange={onVendorChange} options={vendorOptions} /><FilterSelect value={brand} onChange={onBrandChange} options={brandOptions} /><FilterSelect value={warranty} onChange={onWarrantyChange} options={["Tất cả bảo hành", "Đang bảo hành", "Sắp hết hạn", "Đã hết hạn"]} /></div><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[1020px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th><th className="px-4 py-3.5">Người giữ</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Vị trí / Serial</th><th className="px-4 py-3.5 text-right">Giá trị</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#9BAEC0]"><span>{asset.category}</span>{getWarrantyState(asset.warrantyUntil) === "expired" && <span className="inline-flex items-center gap-1 rounded-full bg-[#FDEDEE] px-1.5 py-0.5 font-bold text-[#B44545]" title="Đã hết hạn bảo hành"><AlertTriangle size={10} />Hết hạn BH</span>}{getWarrantyState(asset.warrantyUntil) === "expiring" && <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5DC] px-1.5 py-0.5 font-bold text-[#A86B00]" title="Bảo hành sắp hết hạn"><Clock3 size={10} />Sắp hết hạn</span>}</div></div></div></td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td><td className="px-4 py-4 text-xs text-[#60758A]"><div>{asset.location || "Chưa cập nhật"}</div><div className="mt-1 font-mono text-[10px] text-[#9BAEC0]">{asset.serial || "Chưa có serial"}</div></td><td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{formatVnd(asset.value)} <span className="text-[10px] font-semibold text-[#9BAEC0]">VNĐ</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={() => onOpenDetail(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#F0F5F8] hover:text-[#193B57]" aria-label={`Hồ sơ ${asset.code}`}><FileText size={15} /></button><button onClick={() => onEdit(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label={`Chỉnh sửa ${asset.code}`}><Settings2 size={15} /></button><button onClick={() => onOpenQr(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label={`Mã QR ${asset.code}`}><QrCode size={15} /></button><button onClick={() => onAssign(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label={`Cấp phát ${asset.code}`}><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{assets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản phù hợp</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử đặt lại bộ lọc hoặc thay đổi từ khóa tìm kiếm.</p></div>}</div><div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row"><div className="text-xs text-[#8AA0B6]">Hiển thị <span className="font-bold text-[#60758A]">{assets.length}</span> trên <span className="font-bold text-[#60758A]">{totalAssets}</span> tài sản</div><div className="text-xs font-bold text-[#0F8C8C]">Dữ liệu đồng bộ từ hệ thống</div></div></section></div></div>;
}

function PaginatedAssetCatalogPage({ assets, query, category, status, department, vendor, brand, warranty, vendorOptions, brandOptions, onQueryChange, onCategoryChange, onStatusChange, onDepartmentChange, onVendorChange, onBrandChange, onWarrantyChange, onReset, onCreate, onEdit, onOpenDetail, onOpenQr, onAssign }: { assets: Asset[]; query: string; category: string; status: string; department: string; vendor: string; brand: string; warranty: string; vendorOptions: string[]; brandOptions: string[]; onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void; onStatusChange: (value: string) => void; onDepartmentChange: (value: string) => void; onVendorChange: (value: string) => void; onBrandChange: (value: string) => void; onWarrantyChange: (value: string) => void; onReset: () => void; onCreate: () => void; onEdit: (asset: Asset) => void; onOpenDetail: (asset: Asset) => void; onOpenQr: (asset: Asset) => void; onAssign: (asset: Asset) => void }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState("1");
  const { currentPage, totalPages, startIndex, startRecord, endRecord } = getPaginationWindow(assets.length, page, pageSize);
  const pageAssets = assets.slice(startIndex, startIndex + pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((pageNumber) => totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1);
  const filteredAssetExportRows = useMemo(() => buildFilteredAssetExportRows(assets), [assets]);
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
  useEffect(() => { setPage(1); }, [query, category, status, department, vendor, brand, warranty, pageSize]);
  useEffect(() => { setJumpPage(String(currentPage)); }, [currentPage]);
  useEffect(() => {
    const tooltipByPrefix: Array<[string, string]> = [["Hồ sơ", "Xem hồ sơ tài sản"], ["Chỉnh sửa", "Chỉnh sửa tài sản"], ["Mã QR", "Tạo / xem mã QR"], ["Cấp phát", "Tạo phiếu bàn giao"]];
    document.querySelectorAll<HTMLButtonElement>("button[aria-label]").forEach((button) => {
      const label = button.getAttribute("aria-label") || "";
      const tooltip = tooltipByPrefix.find(([prefix]) => label.startsWith(prefix))?.[1];
      if (tooltip) button.title = tooltip;
    });
  }, [pageAssets]);
  useEffect(() => {
    const resetButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === "Đặt lại bộ lọc");
    const controls = resetButton?.parentElement;
    if (!controls || controls.querySelector("[data-asset-catalog-toolbar]")) return;

    const originalControlsClass = controls.className;
    const titleBlock = controls.firstElementChild as HTMLElement | null;
    const originalTitleClass = titleBlock?.className || "";
    const originalResetClass = resetButton.className;
    controls.className = "flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 min-[1320px]:flex-row min-[1320px]:items-center min-[1320px]:justify-between";
    titleBlock?.classList.add("min-w-0");

    const actionBar = document.createElement("div");
    actionBar.dataset.assetCatalogToolbar = "true";
    actionBar.className = "flex w-full flex-wrap items-center gap-2 min-[1320px]:w-auto min-[1320px]:flex-nowrap min-[1320px]:justify-end";

    const filteredExportButton = document.createElement("button");
    filteredExportButton.type = "button";
    filteredExportButton.dataset.filteredAssetExcelExport = "true";
    filteredExportButton.disabled = !filteredAssetExportRows.length || isExportingFilteredAssets;
    filteredExportButton.textContent = isExportingFilteredAssets ? "Đang xuất..." : `Xuất danh sách (${filteredAssetExportRows.length})`;
    filteredExportButton.title = isExportingFilteredAssets ? "Đang tạo file Excel" : filteredAssetExportRows.length ? "Xuất toàn bộ tài sản đang hiển thị sau khi áp dụng bộ lọc" : "Không có tài sản phù hợp với bộ lọc hiện tại";
    filteredExportButton.className = "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center rounded-lg border border-[#C7DDF8] bg-white px-3 text-xs font-bold text-[#2666A8] hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-50";
    filteredExportButton.addEventListener("click", exportFilteredAssetsExcel);

    const maintenanceButton = document.createElement("button");
    maintenanceButton.type = "button";
    maintenanceButton.dataset.maintenanceFilter = "true";
    maintenanceButton.className = status === "Bảo trì" ? "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg bg-[#A86B00] px-3 text-xs font-bold text-white" : "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 text-xs font-bold text-[#A86B00] hover:bg-white";
    maintenanceButton.textContent = "Tài sản bảo trì";
    maintenanceButton.title = status === "Bảo trì" ? "Bỏ lọc tài sản đang bảo trì" : "Chỉ hiển thị tài sản đang bảo trì";
    const toggleMaintenance = () => onStatusChange(toggleMaintenanceStatusFilter(status));
    maintenanceButton.addEventListener("click", toggleMaintenance);

    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.dataset.maintenanceExcelExport = "true";
    exportButton.disabled = !maintenanceExportRows.length || isExportingMaintenance;
    exportButton.textContent = isExportingMaintenance ? "Đang xuất..." : `Xuất Excel (${maintenanceExportRows.length})`;
    exportButton.title = isExportingMaintenance ? "Đang tạo file Excel" : maintenanceExportRows.length ? "Xuất danh sách tài sản đang bảo trì ra Excel" : "Không có tài sản đang bảo trì trong phạm vi lọc hiện tại";
    exportButton.className = "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50";
    exportButton.addEventListener("click", exportMaintenanceExcel);

    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.dataset.assetExcelImport = "true";
    importButton.textContent = "Nhập Excel";
    importButton.title = "Tải template và import nhiều tài sản từ Excel";
    importButton.className = "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A]";
    const openAssetImport = () => window.dispatchEvent(new Event("assetmaster:open-asset-import"));
    importButton.addEventListener("click", openAssetImport);

    resetButton.className = "inline-flex h-9 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]";
    actionBar.append(filteredExportButton, maintenanceButton, exportButton, importButton, resetButton);
    controls.append(actionBar);

    return () => {
      filteredExportButton.removeEventListener("click", exportFilteredAssetsExcel);
      maintenanceButton.removeEventListener("click", toggleMaintenance);
      exportButton.removeEventListener("click", exportMaintenanceExcel);
      importButton.removeEventListener("click", openAssetImport);
      actionBar.replaceWith(resetButton);
      resetButton.className = originalResetClass;
      controls.className = originalControlsClass;
      if (titleBlock) titleBlock.className = originalTitleClass;
    };
  }, [status, onStatusChange, filteredAssetExportRows, exportFilteredAssetsExcel, isExportingFilteredAssets, maintenanceExportRows, exportMaintenanceExcel, isExportingMaintenance]);
  useEffect(() => {
    const legacyFooter = document.querySelector("section.overflow-hidden > div:last-child");
    legacyFooter?.classList.add("hidden");
    return () => legacyFooter?.classList.remove("hidden");
  }, []);
  const resetAndGoFirst = () => { setPage(1); onReset(); };
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
  return <div className="relative"><AssetCatalogPage assets={pageAssets} totalAssets={assets.length} query={query} category={category} status={status} department={department} vendor={vendor} brand={brand} warranty={warranty} vendorOptions={vendorOptions} brandOptions={brandOptions} onQueryChange={onQueryChange} onCategoryChange={onCategoryChange} onStatusChange={onStatusChange} onDepartmentChange={onDepartmentChange} onVendorChange={onVendorChange} onBrandChange={onBrandChange} onWarrantyChange={onWarrantyChange} onReset={resetAndGoFirst} onCreate={onCreate} onEdit={onEdit} onOpenDetail={onOpenDetail} onOpenQr={onOpenQr} onAssign={onAssign} /><div className="relative z-10 px-4 pb-8 pt-4 sm:px-6 lg:px-9 lg:pb-9"><div className="mx-auto flex max-w-[1500px] flex-col gap-3 rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.06)] sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[#71869A]">Hiển thị <span className="font-bold text-[#193B57]">{startRecord}–{endRecord}</span> trên <span className="font-bold text-[#193B57]">{assets.length}</span> tài sản phù hợp</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]">Mỗi trang<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-8 rounded-md border border-[#DDE7F0] bg-white px-2 text-xs font-bold text-[#193B57]"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><button disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-8 rounded-md border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40">Trước</button>{pageNumbers.map((pageNumber, index) => <span key={pageNumber} className="flex items-center gap-1">{index > 0 && pageNumber - pageNumbers[index - 1] > 1 ? <span className="px-1 text-xs text-[#8AA0B6]">…</span> : null}<button onClick={() => setPage(pageNumber)} className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-bold ${currentPage === pageNumber ? "bg-[#102A43] text-white" : "border border-[#DDE7F0] text-[#60758A] hover:bg-[#F7FAFC]"}`}>{pageNumber}</button></span>)}<button disabled={currentPage === totalPages || assets.length === 0} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="h-8 rounded-md border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40">Sau</button></div></div></div></div>;
}

function CompanySettingsPage({ companyInfo, onSave }: { companyInfo: CompanyInfo; onSave: (next: CompanyInfo) => void }) {
  const [draft, setDraft] = useState(companyInfo);
  const update = (key: keyof CompanyInfo, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1000px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Workspace settings</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Cài đặt hệ thống</h1><p className="mt-1.5 text-sm text-[#71869A]">Quản lý thông tin doanh nghiệp hiển thị trên tiêu đề biên bản bàn giao PDF.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]"><section className="rounded-xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Building2 size={19} /></div><div><h2 className="font-display text-base font-extrabold text-[#102A43]">Thông tin công ty</h2><p className="mt-1 text-xs text-[#8AA0B6]">Các trường này sẽ được tự động điền vào phần đầu biên bản PDF.</p></div></div><div className="mt-5 space-y-4"><div><label className="field-label">Tên công ty <span className="text-[#0F8C8C]">*</span></label><input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Ví dụ: Công ty Cổ phần AssetMaster" className="field-input" /></div><div><label className="field-label">Địa chỉ trụ sở <span className="text-[#0F8C8C]">*</span></label><textarea value={draft.address} onChange={(e) => update("address", e.target.value)} placeholder="Nhập địa chỉ đầy đủ" className="field-input min-h-[76px] resize-y" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Mã số thuế</label><input value={draft.taxCode} onChange={(e) => update("taxCode", e.target.value)} placeholder="0101234567" className="field-input" /></div><div><label className="field-label">Số điện thoại</label><input value={draft.phone} onChange={(e) => update("phone", e.target.value)} placeholder="024 3789 2468" className="field-input" /></div></div></div><div className="mt-6 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={() => { if (!draft.name.trim() || !draft.address.trim()) { toast.error("Vui lòng nhập tên công ty và địa chỉ."); return; } onSave(draft); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A]"><CheckCircle2 size={15} />Lưu thông tin công ty</button></div></section><aside className="rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-6"><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">PDF header preview</div><div className="mt-4 rounded-xl bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.06)]"><div className="flex items-center gap-3"><img src="/manus-storage/assetmaster-logo_f5d79b06.png" alt="AssetMaster" className="h-11 w-11 rounded-xl bg-[#102A43] p-1.5" /><div><div className="font-display text-base font-extrabold text-[#102A43]">{draft.name || "Tên công ty"}</div><div className="mt-1 text-[10px] font-semibold text-[#0F8C8C]">HỆ THỐNG QUẢN LÝ TÀI SẢN DOANH NGHIỆP</div></div></div><div className="mt-5 border-t border-[#E7EEF3] pt-4 text-[11px] leading-5 text-[#60758A]"><div>{draft.address || "Địa chỉ công ty"}</div><div> MST: {draft.taxCode || "Chưa cập nhật"} · ĐT: {draft.phone || "Chưa cập nhật"}</div></div><div className="mt-5 text-center font-display text-sm font-extrabold text-[#193B57]">BIÊN BẢN BÀN GIAO TÀI SẢN</div></div><p className="mt-4 text-xs leading-5 text-[#4B8884]">Thông tin được lưu trong trình duyệt này và sẽ được dùng cho các lần xuất biên bản tiếp theo.</p></aside></div></div></div>;
}

type Handover = { id: number; referenceCode: string; assetCode: string; assetName: string; recipient: string; department: string; date: string; dueBackAt?: Date | string | null; returnRequestStatus?: "none" | "pending" | "approved" | "rejected"; returnRequestedAt?: Date | null; returnRequestNote?: string | null; status: "Đã bàn giao" | "Chờ ký" | "Nháp" | "Đã hoàn trả"; condition: string; handoverBy: string; note: string; accessories: string; recipientUserId?: number | null; recipientDepartmentId?: number | null; recipientSignatureUrl?: string | null; };

function AssetQuickHandoverModal({ assetCode, onClose }: { assetCode: string; onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: isAdmin });
  const recipientsQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const selectedAsset = assetsQuery.data?.find((asset) => asset.assetCode === assetCode);
  const [form, setForm] = useState<Handover>({ id: 0, referenceCode: "", assetCode, assetName: "", recipient: "", department: "", date: new Date().toLocaleDateString("vi-VN"), status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null });
  useEffect(() => { if (selectedAsset) setForm((current) => ({ ...current, assetCode: selectedAsset.assetCode, assetName: selectedAsset.name })); }, [selectedAsset?.id, selectedAsset?.assetCode, selectedAsset?.name]);
  const createHandover = trpc.handovers.create.useMutation({
    onSuccess: () => { void utils.handovers.list.invalidate(); void utils.assets.list.invalidate(); void utils.employees.assetHistory.invalidate(); void utils.employees.myAssetHistory.invalidate(); toast.success("Đã tạo phiếu bàn giao cho tài sản đã chọn."); onClose(); },
    onError: (error) => toast.error(error.message || "Không thể tạo phiếu bàn giao."),
  });
  const update = (key: keyof Handover, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const chooseRecipient = (userId: number) => {
    const recipient = recipientsQuery.data?.find((employee) => employee.id === userId);
    const department = recipient?.departmentId ? departmentsQuery.data?.find((item) => item.id === recipient.departmentId) : undefined;
    setForm((current) => ({ ...current, recipientUserId: recipient?.id || null, recipient: recipient?.name || recipient?.email || "", recipientDepartmentId: department?.id || null, department: department?.name || "" }));
  };
  const save = () => {
    if (!selectedAsset || selectedAsset.status !== "available" || !form.recipientUserId || !form.recipient.trim()) { toast.error("Vui lòng chọn nhân viên nhận hợp lệ và kiểm tra tài sản còn sẵn có."); return; }
    createHandover.mutate({ assetId: selectedAsset.id, recipientName: form.recipient, recipientDepartmentName: form.department || null, handedOverAt: Date.now(), dueBackAt: normalizePurchaseDate(form.dueBackAt), conditionOut: form.condition, accessories: form.accessories || null, note: form.note || null, recipientUserId: form.recipientUserId, recipientDepartmentId: form.recipientDepartmentId || null });
  };
  if (assetsQuery.isLoading || recipientsQuery.isLoading || departmentsQuery.isLoading) return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102A43]/40 p-4"><div className="rounded-xl bg-white px-5 py-4 text-sm font-bold text-[#193B57]">Đang chuẩn bị phiếu bàn giao...</div></div>;
  if (!selectedAsset || selectedAsset.status !== "available") return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102A43]/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-2xl"><div className="text-base font-extrabold text-[#102A43]">Tài sản không còn sẵn có</div><p className="mt-2 text-sm text-[#71869A]">Vui lòng làm mới Danh mục và chọn một tài sản đang sẵn có.</p><button onClick={onClose} className="mt-5 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white">Đóng</button></div></div>;
  return <PersistedHandoverCreateModal form={form} assets={[selectedAsset]} employees={recipientsQuery.data || []} departments={departmentsQuery.data || []} update={update} onRecipientChange={chooseRecipient} onClose={onClose} onSave={save} saving={createHandover.isPending} />;
}

function AssignmentsPage({ showComingSoon, companyInfo }: { showComingSoon: (label: string) => void; companyInfo: CompanyInfo }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const handoversQuery = trpc.handovers.list.useQuery();
  const assignmentAssetsQuery = trpc.assets.list.useQuery();
  const recipientsQuery = trpc.employees.list.useQuery(undefined, { enabled: isAdmin });
  const handoverDepartmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const refreshHandoverData = () => { void utils.handovers.list.invalidate(); void utils.assets.list.invalidate(); void utils.employees.assetHistory.invalidate(); void utils.employees.myAssetHistory.invalidate(); };
  const createHandoverMutation = trpc.handovers.create.useMutation({ onSuccess: () => { refreshHandoverData(); toast.success("Đã lưu phiếu bàn giao nháp vào hệ thống."); }, onError: (error) => toast.error(error.message || "Không thể tạo phiếu bàn giao.") });
  const resolveReturnRequest = trpc.handovers.resolveReturnRequest.useMutation({ onSuccess: () => { refreshHandoverData(); toast.success("Đã cập nhật yêu cầu hoàn trả."); }, onError: (error) => toast.error(error.message || "Không thể xử lý yêu cầu hoàn trả.") });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [handoverYearFilter, setHandoverYearFilter] = useState("Tất cả các năm");
  const [handoverDepartmentFilter, setHandoverDepartmentFilter] = useState("Tất cả phòng ban");
  const [handoverRecipientFilter, setHandoverRecipientFilter] = useState("Tất cả người nhận");
  const [handoverPage, setHandoverPage] = useState(1);
  const [isExportingHandovers, setIsExportingHandovers] = useState(false);
  const [modal, setModal] = useState<"create" | "detail" | null>(null);
  const [selected, setSelected] = useState<Handover | null>(null);
  const [returnDecision, setReturnDecision] = useState<{ item: Handover; decision: "approved" | "rejected" } | null>(null);
  const [form, setForm] = useState<Handover>({ id: 0, referenceCode: "", assetCode: "", assetName: "", recipient: "", department: "", date: "", status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null });
  useEffect(() => { if (!handoversQuery.data) return; setHandovers(handoversQuery.data.map((item) => ({ id: item.id, referenceCode: item.referenceCode, assetCode: assignmentAssetsQuery.data?.find((asset) => asset.id === item.assetId)?.assetCode || `TS-${item.assetId}`, assetName: assignmentAssetsQuery.data?.find((asset) => asset.id === item.assetId)?.name || "Tài sản", recipient: item.recipientName, department: item.recipientDepartmentName || "Chưa xác định", date: new Date(item.handedOverAt).toLocaleDateString("vi-VN"), status: item.status === "active" ? "Đã bàn giao" : item.status === "pending_signature" ? "Chờ ký" : item.status === "returned" ? "Đã hoàn trả" : "Nháp", condition: item.conditionOut || "Tốt", handoverBy: item.handoverByName || "Quản trị viên", note: item.note || "", accessories: item.accessories || "", recipientSignatureUrl: item.recipientSignatureUrl }))); }, [handoversQuery.data, assignmentAssetsQuery.data]);
  useEffect(() => { if (!handoversQuery.data) return; setHandovers((current) => current.map((item) => { const source = handoversQuery.data.find((handover) => handover.id === item.id); return source ? { ...item, dueBackAt: source.dueBackAt, returnRequestStatus: source.returnRequestStatus, returnRequestedAt: source.returnRequestedAt, returnRequestNote: source.returnRequestNote } : item; })); }, [handoversQuery.data]);
  useEffect(() => {
    const selectedHandoverId = Number(sessionStorage.getItem("assetmaster-open-handover-id"));
    if (!selectedHandoverId || handovers.length === 0) return;
    const handover = handovers.find((item) => item.id === selectedHandoverId);
    if (!handover) return;
    setSelected(handover);
    setModal("detail");
    sessionStorage.removeItem("assetmaster-open-handover-id");
  }, [handovers]);
  const handoverYears = Array.from(new Set(handovers.map((item) => item.referenceCode.match(/^BG-(\\d{4})-/)?.[1] || item.date.split("/").at(-1)).filter((year): year is string => Boolean(year)))).sort((left, right) => Number(right) - Number(left));
  const handoverDepartments = Array.from(new Set(handovers.map((item) => item.department).filter(Boolean))).sort((left, right) => left.localeCompare(right, "vi"));
  const handoverRecipients = Array.from(new Set(handovers.map((item) => item.recipient).filter(Boolean))).sort((left, right) => left.localeCompare(right, "vi"));
  const filtered = handovers.filter((item) => {
    const itemYear = item.referenceCode.match(/^BG-(\\d{4})-/)?.[1] || item.date.split("/").at(-1);
    return matchesVietnameseSearch(`${item.id} ${item.referenceCode} ${item.assetName} ${item.recipient} ${item.department}`, query) && (statusFilter === "Tất cả trạng thái" || item.status === statusFilter) && (handoverYearFilter === "Tất cả các năm" || itemYear === handoverYearFilter) && (handoverDepartmentFilter === "Tất cả phòng ban" || item.department === handoverDepartmentFilter) && (handoverRecipientFilter === "Tất cả người nhận" || item.recipient === handoverRecipientFilter);
  });
  const handoverPageSize = 10;
  const handoverTotalPages = Math.max(1, Math.ceil(filtered.length / handoverPageSize));
  const pagedHandovers = filtered.slice((handoverPage - 1) * handoverPageSize, handoverPage * handoverPageSize);
  useEffect(() => { setHandoverPage(1); }, [query, statusFilter, handoverYearFilter, handoverDepartmentFilter, handoverRecipientFilter]);
  useEffect(() => { setHandoverPage((current) => Math.min(current, handoverTotalPages)); }, [handoverTotalPages]);
  const exportHandovers = async () => {
    if (!filtered.length) { toast.info("Không có phiếu bàn giao phù hợp để xuất."); return; }
    setIsExportingHandovers(true);
    try {
      const rows = filtered.map((item) => ({ "Mã phiếu": item.referenceCode, "Mã tài sản": item.assetCode, "Tên tài sản": item.assetName, "Người nhận": item.recipient, "Phòng ban": item.department, "Ngày bàn giao": item.date, "Trạng thái": item.status, "Tình trạng khi giao": item.condition, "Người lập phiếu": item.handoverBy, "Ghi chú": item.note || "" }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 24 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 36 }];
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
  const createHandover = () => { const asset = assignmentAssetsQuery.data?.find((item) => item.assetCode === form.assetCode); if (!form.recipient.trim() || !form.recipientUserId || !asset) { toast.error("Vui lòng chọn tài sản và nhân viên nhận hợp lệ."); return; } createHandoverMutation.mutate({ assetId: asset.id, recipientName: form.recipient, recipientDepartmentName: form.department || null, handedOverAt: Date.now(), dueBackAt: null, conditionOut: form.condition, accessories: form.accessories || null, note: form.note || null, recipientUserId: form.recipientUserId, recipientDepartmentId: form.recipientDepartmentId || null }); setModal(null); };
  const openCreate = () => { const firstAsset = assignmentAssetsQuery.data?.find((asset) => asset.status === "available"); if (!firstAsset) { toast.error("Cần có ít nhất một tài sản sẵn có trước khi lập phiếu bàn giao."); return; } setForm({ id: 0, referenceCode: "", assetCode: firstAsset.assetCode, assetName: firstAsset.name, recipient: "", department: "", date: new Date().toLocaleDateString("vi-VN"), status: "Nháp", condition: "Tốt", handoverBy: "", note: "", accessories: "", recipientUserId: null, recipientDepartmentId: null }); setModal("create"); };
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
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Assignment operations</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Bàn giao & Cấp phát</h1><p className="mt-1.5 max-w-xl text-sm text-[#71869A]">Theo dõi tài sản đang cấp phát, xác nhận người nhận và lưu trữ biên bản bàn giao.</p></div><div className="flex gap-2"><button onClick={() => showComingSoon("Quét QR để bàn giao")} className="hidden h-10 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] sm:flex"><QrCode size={16} />Quét mã QR</button><button disabled={!isAdmin || assignmentAssetsQuery.isLoading || recipientsQuery.isLoading} onClick={openCreate} className="flex h-10 items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />Tạo phiếu bàn giao</button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AssignmentKpi label="Tổng phiếu" value={String(handovers.length)} icon={FileText} tone="navy" /><AssignmentKpi label="Đã bàn giao" value={String(statusCount("Đã bàn giao"))} icon={CheckCircle2} tone="teal" /><AssignmentKpi label="Chờ ký xác nhận" value={String(statusCount("Chờ ký"))} icon={Signature} tone="amber" /><AssignmentKpi label="Đã hoàn trả" value={String(statusCount("Đã hoàn trả"))} icon={Undo2} tone="blue" /></div><section className="mt-5"><HandoverSummaryCard title="Phiếu theo phòng ban" subtitle="Phân bổ số phiếu bàn giao theo đơn vị nhận tài sản." icon={Building2} items={handoverDepartmentStats} maxCount={maxDepartmentCount} tone="teal" emptyText="Chưa có dữ liệu phòng ban." /></section><div className="mt-8 overflow-visible rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="relative z-20 flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh sách phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Mỗi phiếu lưu lại tài sản, người nhận và trạng thái xác nhận.</p></div><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap"><div className="relative w-full sm:w-auto"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã phiếu, tài sản..." className="h-9 w-full rounded-lg sm:w-[220px] border border-[#DDE7F0] bg-[#F7FAFC] pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={statusFilter} onChange={setStatusFilter} options={["Tất cả trạng thái", "Đã bàn giao", "Chờ ký", "Nháp", "Đã hoàn trả"]} /><FilterSelect value={handoverYearFilter} onChange={setHandoverYearFilter} options={["Tất cả các năm", ...handoverYears]} /><FilterSelect value={handoverDepartmentFilter} onChange={setHandoverDepartmentFilter} options={["Tất cả phòng ban", ...handoverDepartments]} /><FilterSelect value={handoverRecipientFilter} onChange={setHandoverRecipientFilter} options={["Tất cả người nhận", ...handoverRecipients]} /><button type="button" onClick={exportHandovers} disabled={isExportingHandovers || filtered.length === 0} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:cursor-not-allowed disabled:opacity-50"><Download size={14} className={isExportingHandovers ? "animate-pulse" : ""} />{isExportingHandovers ? "Đang xuất..." : "Xuất Excel"}</button></div></div>{handoversQuery.isError ? <div className="m-5 rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-5 text-sm"><div className="font-bold text-[#A86B00]">Không thể tải phiếu bàn giao</div><p className="mt-1 text-[#71869A]">{handoversQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p><button onClick={() => handoversQuery.refetch()} className="mt-3 rounded-lg border border-[#F2D596] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white">Thử lại</button></div> : <><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã phiếu</th><th className="px-4 py-3.5">Tài sản</th><th className="px-4 py-3.5">Người nhận</th><th className="px-4 py-3.5">Ngày bàn giao</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody>{handoversQuery.isLoading && <tr><td colSpan={6}><ModalTableSkeleton rows={5} columns={6} /></td></tr>}{!handoversQuery.isLoading && pagedHandovers.map((item) => <tr key={item.id} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{item.referenceCode}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><PackageCheck size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{item.assetName}</div><div className="mt-0.5 font-mono text-[10px] text-[#9BAEC0]">{item.assetCode}</div></div></div></td><td className="px-4 py-4"><div className="text-xs font-semibold text-[#60758A]">{item.recipient}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">{item.department}</div></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{item.date}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusClass[item.status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{item.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label="Xem biên bản"><FileText size={15} /></button><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Xuất biên bản"><Printer size={15} /></button><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Xem lịch sử"><History size={15} /></button></div></td></tr>)}</tbody></table>{!handoversQuery.isLoading && filtered.length === 0 && <ModuleEmptyState module="handover" title="Chưa có phiếu bàn giao phù hợp" description="Khi có phiếu mới hoặc bộ lọc được thay đổi, dữ liệu sẽ hiển thị tại đây." />}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EEF3] px-5 py-4 text-xs text-[#8AA0B6]"><span>Hiển thị <b className="text-[#60758A]">{filtered.length ? (handoverPage - 1) * handoverPageSize + 1 : 0}–{Math.min(handoverPage * handoverPageSize, filtered.length)}</b> / {filtered.length} phiếu</span><div className="flex items-center gap-2"><span className="font-semibold">Trang {handoverPage}/{handoverTotalPages}</span><button type="button" onClick={() => setHandoverPage((page) => Math.max(1, page - 1))} disabled={handoverPage === 1} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang trước">‹</button><button type="button" onClick={() => setHandoverPage((page) => Math.min(handoverTotalPages, page + 1))} disabled={handoverPage === handoverTotalPages} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Trang sau">›</button></div></div></>}</div><div className="mt-5 flex items-center gap-3 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><ShieldCheck size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Quy trình kiểm soát bàn giao</div><div className="mt-0.5 text-[11px] text-[#4B8884]">Phiếu, chữ ký và trạng thái tài sản được lưu tập trung trong hệ thống.</div></div></div></div>{modal === "create" && <PersistedHandoverCreateModal form={form} assets={assignmentAssetsQuery.data || []} employees={recipientsQuery.data || []} departments={handoverDepartmentsQuery.data || []} update={update} onRecipientChange={(userId) => { const recipient = recipientsQuery.data?.find((employee) => employee.id === userId); const departmentItem = recipient?.departmentId ? handoverDepartmentsQuery.data?.find((department) => department.id === recipient.departmentId) : undefined; setForm((current) => ({ ...current, recipientUserId: recipient?.id || null, recipient: recipient?.name || recipient?.email || "", recipientDepartmentId: departmentItem?.id || null, department: departmentItem?.name || "" })); }} onClose={() => setModal(null)} onSave={createHandover} saving={createHandoverMutation.isPending} />}{modal === "detail" && selected && <HandoverDetailModal item={selected} companyInfo={companyInfo} onClose={() => setModal(null)} onDataChanged={refreshHandoverData} />}{returnDecision && <ReturnDecisionModal item={returnDecision.item} decision={returnDecision.decision} pending={resolveReturnRequest.isPending} onClose={() => setReturnDecision(null)} onSubmit={(payload) => resolveReturnRequest.mutate({ id: returnDecision.item.id, ...payload }, { onSuccess: () => setReturnDecision(null) })} />}</div>;
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
  useModalDismiss(onClose);
  const submit = () => {
    if (approved && !conditionIn.trim()) { toast.error("Vui lòng ghi nhận tình trạng thực tế của tài sản."); return; }
    const base: Omit<ReturnDecisionPayload, "conditionPhoto"> = { decision, conditionIn: approved ? conditionIn.trim() : null, resolution: resolution.trim() || null };
    if (!photo) { onSubmit({ ...base, conditionPhoto: null }); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(photo.type)) { toast.error("Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP."); return; }
    if (photo.size > 5 * 1024 * 1024) { toast.error("Ảnh tình trạng không được vượt quá 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => onSubmit({ ...base, conditionPhoto: { fileName: photo.name, contentType: photo.type as "image/png" | "image/jpeg" | "image/webp", dataUrl: String(reader.result) } });
    reader.onerror = () => toast.error("Không thể đọc ảnh tình trạng đã chọn.");
    reader.readAsDataURL(photo);
  };
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }} className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102A43]/50 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.25)]"><div className={`border-b px-5 py-4 ${approved ? "border-[#CDE5E5] bg-[#ECF8F7]" : "border-[#F4D1D1] bg-[#FFF5F5]"}`}><div className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${approved ? "text-[#087A6A]" : "text-[#B44545]"}`}>{approved ? "Xác nhận duyệt hoàn trả" : "Xác nhận từ chối hoàn trả"}</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{item.assetCode} · {item.assetName}</h2><p className="mt-1 text-xs text-[#60758A]">{approved ? "Tài sản sẽ trở về trạng thái sẵn có sau khi xác nhận." : "Nhân viên sẽ nhận được kết quả và có thể gửi giải trình bổ sung."}</p></div><div className="space-y-4 p-5">{approved ? <><label className="block text-xs font-bold text-[#60758A]">Tình trạng thực tế khi nhận lại <span className="text-[#B44545]">*</span><input value={conditionIn} onChange={(event) => setConditionIn(event.target.value)} className="field-input mt-2" placeholder="Ví dụ: Tốt" autoFocus /></label><label className="block text-xs font-bold text-[#60758A]">Ảnh tình trạng <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs text-[#60758A] file:mr-3 file:rounded-md file:border-0 file:bg-[#EAF3FF] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2666A8]" /></label></> : <label className="block text-xs font-bold text-[#60758A]">Lý do từ chối <span className="font-normal text-[#9BAEC0]">(không bắt buộc)</span><textarea value={resolution} onChange={(event) => setResolution(event.target.value)} className="field-input mt-2 min-h-[100px] resize-y" placeholder="Nêu rõ thông tin nhân viên cần bổ sung..." maxLength={1000} autoFocus /></label>}<div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] disabled:opacity-50">Hủy</button><button type="button" onClick={submit} disabled={pending} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${approved ? "bg-[#0F8C8C] hover:bg-[#087A6A]" : "bg-[#B44545] hover:bg-[#933737]"}`}>{pending ? "Đang xử lý..." : approved ? "Xác nhận duyệt" : "Xác nhận từ chối"}</button></div></div></div></div>;
}

function HandoverCreateModal({ form, assets, update, onClose, onSave, saving }: { form: Handover; assets: Array<{ assetCode: string; name: string; status: string }>; update: (key: keyof Handover, value: string) => void; onClose: () => void; onSave: () => void; saving: boolean }) { const availableAssets = assets.filter((asset) => asset.status === "available"); return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">New handover record</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">Tạo phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Ghi nhận tài sản, người nhận và điều kiện bàn giao.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="mb-5 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#0F8C8C]"><PackageCheck size={17} /></div><div><div className="text-xs font-bold text-[#087A6A]">Tài sản được cấp phát</div><div className="mt-0.5 text-xs font-semibold text-[#193B57]">{form.assetName} <span className="font-mono text-[10px] text-[#0F8C8C]">· {form.assetCode}</span></div></div></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label">Tài sản <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.assetCode} onChange={(value) => { const asset = availableAssets.find((candidate) => candidate.assetCode === value); update("assetCode", value); update("assetName", asset?.name || ""); }} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...availableAssets.map((asset) => ({ value: asset.assetCode, label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} /></div><div><label className="field-label">Người nhận <span className="text-[#0F8C8C]">*</span></label><input value={form.recipient} onChange={(e) => update("recipient", e.target.value)} placeholder="Nhập họ tên người nhận" className="field-input" /></div><div><label className="field-label">Phòng ban <span className="text-[#0F8C8C]">*</span></label><input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Ví dụ: Phòng Kinh doanh" className="field-input" /></div><div><label className="field-label">Ngày bàn giao</label><input value={form.date} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><div><label className="field-label">Tình trạng tài sản</label><SearchableSelect value={form.condition} onChange={(value) => update("condition", value)} searchPlaceholder="Tìm tình trạng..." options={[{ value: "Tốt", label: "Tốt" }, { value: "Có hao mòn nhẹ", label: "Có hao mòn nhẹ" }, { value: "Cần kiểm tra", label: "Cần kiểm tra" }]} /></div><div className="sm:col-span-2"><label className="field-label">Phụ kiện đi kèm</label><input value={form.accessories} onChange={(e) => update("accessories", e.target.value)} placeholder="Ví dụ: Sạc, túi chống sốc, chuột không dây" className="field-input" /></div><div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung lưu ý khi bàn giao..." className="field-input min-h-[76px] resize-y" /></div></div><div className="mt-4 grid gap-3 rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã kiểm tra ngoại quan</label><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã hướng dẫn sử dụng</label></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button disabled={saving || availableAssets.length === 0} onClick={onSave} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu phiếu nháp"}</button></div></div></div></div>; }

function PersistedHandoverCreateModal({ form, assets, employees, departments, update, onRecipientChange, onClose: dismiss, onSave, saving }: { form: Handover; assets: Array<{ assetCode: string; name: string; status: string }>; employees: Array<{ id: number; name: string | null; email: string | null; departmentId: number | null; isActive: boolean }>; departments: Array<{ id: number; name: string }>; update: (key: keyof Handover, value: string) => void; onRecipientChange: (userId: number) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  const availableAssets = assets.filter((asset) => asset.status === "available");
  const recipients = employees.filter((employee) => employee.isActive);
  const selectedDepartment = departments.find((department) => department.id === form.recipientDepartmentId);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const initialFormRef = useRef(JSON.stringify(form));
  const onClose = () => {
    if (initialFormRef.current !== JSON.stringify(form)) { toast.warning("Đóng phiếu chưa lưu?", { description: "Thông tin bàn giao đang nhập sẽ bị hủy.", action: { label: "Bỏ thay đổi", onClick: dismiss } }); return; }
    dismiss();
  };
  useModalDismiss(onClose);
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
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">Dữ liệu bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">Tạo phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Người nhận được liên kết với hồ sơ nhân viên để cập nhật lịch sử tài sản.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div><div className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label">Tài sản <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.assetCode} onChange={(value) => { const asset = availableAssets.find((candidate) => candidate.assetCode === value); update("assetCode", value); update("assetName", asset?.name || ""); }} placeholder="Chọn tài sản" searchPlaceholder="Tìm mã hoặc tên tài sản..." options={[{ value: "", label: "Chọn tài sản" }, ...availableAssets.map((asset) => ({ value: asset.assetCode, label: `${asset.assetCode} · ${asset.name}`, searchText: asset.assetCode }))]} /></div><div><label className="field-label">Nhân viên nhận <span className="text-[#0F8C8C]">*</span></label><SearchableSelect value={form.recipientUserId ? String(form.recipientUserId) : ""} onChange={(value) => onRecipientChange(Number(value))} placeholder="Chọn nhân viên" searchPlaceholder="Tìm tên hoặc email nhân viên..." options={[{ value: "", label: "Chọn nhân viên" }, ...recipients.map((employee) => ({ value: String(employee.id), label: employee.name || employee.email || `Nhân viên #${employee.id}`, searchText: employee.email || "" }))]} /></div><div><label className="field-label">Phòng ban</label><input value={selectedDepartment?.name || form.department || "Chưa gán phòng ban"} disabled className="field-input bg-[#F5F8FB] text-[#60758A]" /></div><div><label className="field-label">Tình trạng tài sản</label><SearchableSelect value={form.condition} onChange={(value) => update("condition", value)} searchPlaceholder="Tìm tình trạng..." options={[{ value: "Tốt", label: "Tốt" }, { value: "Có hao mòn nhẹ", label: "Có hao mòn nhẹ" }, { value: "Cần kiểm tra", label: "Cần kiểm tra" }]} /></div><div><label className="field-label">Ngày lập phiếu</label><input value={form.date} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><div className="sm:col-span-2"><label className="field-label">Hạn dự kiến hoàn trả</label><DatePickerField value={form.dueBackAt ? new Date(form.dueBackAt).toISOString().slice(0, 10) : ""} onChange={(value) => update("dueBackAt", value)} aria-label="Hạn dự kiến hoàn trả" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Hiển thị cho nhân viên tại tài sản đang giữ.</p></div><div className="sm:col-span-2"><label className="field-label">Phụ kiện đi kèm</label><input value={form.accessories} onChange={(e) => update("accessories", e.target.value)} placeholder="Ví dụ: Sạc, túi chống sốc, chuột không dây" className="field-input" /></div><div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung lưu ý khi bàn giao..." className="field-input min-h-[76px] resize-y" /></div></div>{recipients.length === 0 && <div className="rounded-lg bg-[#FFF9EB] p-3 text-xs text-[#A86B00]">Chưa có nhân viên đang hoạt động để nhận tài sản.</div>}{confirmCreate && <div className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-xs text-[#8F5A00]">Vui lòng kiểm tra lại tài sản, người nhận và tình trạng. Nhấn <b>Xác nhận tạo</b> để lưu phiếu.</div>}<div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={() => confirmCreate ? setConfirmCreate(false) : onClose()} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">{confirmCreate ? "Quay lại chỉnh sửa" : "Hủy"}</button><button disabled={saving || !form.recipientUserId || availableAssets.length === 0} onClick={() => confirmCreate ? onSave() : setConfirmCreate(true)} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : confirmCreate ? "Xác nhận tạo" : "Lưu phiếu nháp"}</button></div></div></div></div>;
}

function HandoverDetailModalLegacy({ item, onClose, onPrint, onHistory }: { item: Handover; onClose: () => void; onPrint: () => void; onHistory: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">Biên bản chi tiết và lịch sử người nhận của tài sản.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button onClick={onPrint} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />In biên bản</button><button onClick={() => toast.success("Đã gửi yêu cầu ký xác nhận.")} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi ký xác nhận</button></div></div></div></div>; }

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

async function downloadHandoverPdf(item: Handover, signature: string | undefined, companyInfo: CompanyInfo, output: "download" | "print" = "download") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontBuffer = await loadHandoverPdfFont();
  registerVietnamesePdfFont(doc, fontBuffer);
  const logoDataUrl = companyInfo.logoUrl ? await loadImageData(companyInfo.logoUrl).catch(() => undefined) : undefined;
  const left = 18;
  let y = 22;
  doc.setTextColor(16, 42, 67);
  drawHandoverBrandMark(doc, left, y, logoDataUrl);
  doc.setFontSize(18);
  doc.text("AssetMaster", left + 24, y);
  doc.setFontSize(9);
  doc.setTextColor(15, 140, 140);
  doc.setFontSize(9);
  doc.text(companyInfo.name, left + 24, y + 7);
  doc.setFontSize(8);
  doc.setTextColor(112, 134, 154);
  doc.text(`Địa chỉ: ${companyInfo.address}`, left + 24, y + 13);
  doc.text(`MST: ${companyInfo.taxCode} · Điện thoại: ${companyInfo.phone}`, left + 24, y + 19);
  doc.setTextColor(16, 42, 67);
  doc.setDrawColor(15, 140, 140);
  doc.line(left, y + 24, 192, y + 24);
  y += 42;
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
  doc.setFontSize(9);
  doc.setTextColor(112, 134, 154);
  doc.text("Người giao", left + 18, y);
  doc.text("Người nhận", 125, y);
  if (signature) {
    try {
      const signatureImage = signature.startsWith("data:image/") ? signature : await loadImageData(signature);
      doc.addImage(signatureImage, 118, y + 4, 52, 24);
    } catch {
      // The biên bản remains downloadable even when a stored signature cannot be retrieved.
    }
  }
  doc.setTextColor(25, 59, 87);
  doc.text(item.handoverBy, left + 12, y + 39);
  doc.text(item.recipient, 119, y + 39);
  doc.setFontSize(8);
  doc.setTextColor(138, 160, 182);
  doc.text(`AssetMaster · Biên bản được tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 282);
  const watermark = await createPdfLogoWatermark(companyInfo.logoUrl).catch(() => null);
  applyPdfLogoWatermark(doc, watermark);
  if (output === "print") {
    const printWindow = window.open(doc.output("bloburl"), "_blank");
    if (!printWindow) {
      openPdfPreview(doc, `${item.referenceCode}-bien-ban-ban-giao.pdf`, "BIÊN BẢN BÀN GIAO");
      throw new Error("Trình duyệt đã chặn cửa sổ in. Hệ thống đã mở bản xem trước để bạn tải và in thủ công.");
    }
    printWindow.addEventListener("load", () => printWindow.print(), { once: true });
    return;
  }
  openPdfPreview(doc, `${item.referenceCode}-bien-ban-ban-giao.pdf`, "BIÊN BẢN BÀN GIAO");
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
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{companyInfo.name} · Biên bản chi tiết, chữ ký và lịch sử người nhận.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><Signature size={14} />Ký tên điện tử</div><div className="mt-1 text-[11px] text-[#6B8F8D]">Người nhận ký trực tiếp trên vùng bên dưới.</div></div>{signed && <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"><CheckCircle2 size={13} />Đã ký</span>}</div><SignaturePad onSigned={handleSigned} /></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button onClick={() => { void downloadHandoverPdf(item, signature, companyInfo); toast.success("Đã tải biên bản PDF."); }} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />Xuất PDF</button><button onClick={() => { if (!signed) { toast.error("Vui lòng ký tên trước khi gửi xác nhận."); return; } toast.success("Đã gửi biên bản kèm chữ ký để xác nhận."); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi xác nhận</button></div></div></div></div>;
}

function HandoverDetailModal({ item: listItem, companyInfo, onClose, onDataChanged }: { item: Handover; companyInfo: CompanyInfo; onClose: () => void; onDataChanged: () => void }) {
  const [signature, setSignature] = useState(listItem.recipientSignatureUrl || "");
  const [signed, setSigned] = useState(Boolean(listItem.recipientSignatureUrl));
  const handoverDetailQuery = trpc.handovers.get.useQuery({ id: listItem.id });
  const returnDecisionHistoryQuery = trpc.handovers.returnDecisionHistory.useQuery({ id: listItem.id });
  const item = handoverDetailQuery.data ? { ...listItem, id: handoverDetailQuery.data.id, referenceCode: handoverDetailQuery.data.referenceCode, assetCode: handoverDetailQuery.data.assetCode, assetName: handoverDetailQuery.data.assetName, recipient: handoverDetailQuery.data.recipientName, department: handoverDetailQuery.data.recipientDepartmentName || "Chưa xác định", date: new Date(handoverDetailQuery.data.handedOverAt).toLocaleDateString("vi-VN"), status: handoverDetailQuery.data.status === "active" ? "Đã bàn giao" as const : handoverDetailQuery.data.status === "pending_signature" ? "Chờ ký" as const : handoverDetailQuery.data.status === "returned" ? "Đã hoàn trả" as const : "Nháp" as const, condition: handoverDetailQuery.data.conditionOut || "Tốt", handoverBy: handoverDetailQuery.data.handoverByName || "Quản trị viên", note: handoverDetailQuery.data.note || "", accessories: handoverDetailQuery.data.accessories || "", recipientUserId: handoverDetailQuery.data.recipientUserId, recipientDepartmentId: handoverDetailQuery.data.recipientDepartmentId, recipientSignatureUrl: handoverDetailQuery.data.recipientSignatureUrl } : listItem;
  const saveRecipientSignature = trpc.handovers.saveRecipientSignature.useMutation({
    onSuccess: ({ url }) => { setSignature(url); setSigned(true); void handoverDetailQuery.refetch(); onDataChanged(); toast.success("Đã lưu chữ ký điện tử."); },
    onError: (error) => toast.error(error.message || "Không thể lưu chữ ký điện tử."),
  });
  const updateHandoverStatus = trpc.handovers.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      onDataChanged();
      toast.success(variables.status === "returned" ? "Đã ghi nhận hoàn trả và trả tài sản về trạng thái sẵn có." : "Đã cập nhật trạng thái phiếu bàn giao.");
      onClose();
    },
    onError: (error) => toast.error(error.message || "Không thể cập nhật trạng thái phiếu."),
  });
  useEffect(() => { setSignature(item.recipientSignatureUrl || ""); setSigned(Boolean(item.recipientSignatureUrl)); }, [item.id, item.recipientSignatureUrl]);
  useModalDismiss(onClose);
  const isBusy = saveRecipientSignature.isPending || updateHandoverStatus.isPending;
  const saveSignature = (dataUrl: string) => saveRecipientSignature.mutate({ id: item.id, dataUrl });
  const updateStatus = (status: "draft" | "pending_signature" | "active" | "returned") => updateHandoverStatus.mutate({ id: item.id, status, recipientSignatureUrl: signature || null, handoverSignatureUrl: null });
  const nextAction = item.status === "Nháp" ? { label: "Gửi ký xác nhận", status: "pending_signature" as const } : item.status === "Chờ ký" ? { label: "Xác nhận bàn giao", status: "active" as const } : item.status === "Đã bàn giao" ? { label: "Ghi nhận hoàn trả", status: "returned" as const } : null;

  if (handoverDetailQuery.isLoading) return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102A43]/40 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-7 text-center text-sm font-semibold text-[#71869A] shadow-2xl">Đang tải chi tiết phiếu bàn giao...</div></div>;
  if (handoverDetailQuery.isError) return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102A43]/40 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"><h2 className="font-display text-xl font-extrabold text-[#102A43]">Không thể tải biên bản</h2><p className="mt-2 text-sm leading-6 text-[#71869A]">{handoverDetailQuery.error.message || "Vui lòng kiểm tra kết nối và thử lại."}</p><div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button onClick={() => handoverDetailQuery.refetch()} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white">Thử lại</button></div></div></div>;

  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !isBusy) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Biên bản bàn giao">
    <div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]">
      <div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.referenceCode}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{companyInfo.name} · Biên bản được lấy từ dữ liệu hệ thống.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      <div className="space-y-5 p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]">Người nhận</div><div className="mt-3 text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></section><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]">Thông tin bàn giao</div><div className="mt-3 text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></section></div>
        <section className="rounded-xl border border-[#E7EEF3] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng, phụ kiện và ghi chú</div><div className="mt-3 grid gap-4 sm:grid-cols-3"><div><div className="text-xs text-[#8AA0B6]">Tình trạng</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.accessories || "Không có"}</div></div><div><div className="text-xs text-[#8AA0B6]">Ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có"}</div></div></div></section>
        <section className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#527089]"><History size={14} />Lịch sử quyết định hoàn trả</div>{returnDecisionHistoryQuery.isLoading ? <p className="text-xs text-[#71869A]">Đang tải lịch sử quyết định...</p> : returnDecisionHistoryQuery.data?.length ? <div className="space-y-3">{returnDecisionHistoryQuery.data.map((entry) => { const approved = entry.action === "return_approved"; return <div key={entry.id} className="flex gap-3"><div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${approved ? "bg-[#0F8C8C]" : "bg-[#D26767]"}`} /><div><div className={`text-xs font-extrabold ${approved ? "text-[#087A6A]" : "text-[#B44545]"}`}>{approved ? "Đã duyệt yêu cầu hoàn trả" : "Đã từ chối yêu cầu hoàn trả"}</div><div className="mt-1 text-[11px] text-[#60758A]">{entry.summary}</div><div className="mt-1 text-[10px] text-[#8AA0B6]">{entry.actorName || "Quản trị viên"} · {new Date(entry.createdAt).toLocaleString("vi-VN")}</div></div></div>; })}</div> : <p className="text-xs text-[#71869A]">Chưa có quyết định hoàn trả nào cho phiếu này.</p>}</section>
        <section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><Signature size={14} />Ký tên điện tử</div><p className="mt-1 text-[11px] text-[#6B8F8D]">Chữ ký được lưu an toàn cùng phiếu bàn giao.</p></div>{signed && <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"><CheckCircle2 size={13} />Đã ký</span>}</div><SignaturePad onSigned={saveSignature} /></section>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button disabled={isBusy} onClick={() => { void downloadHandoverPdf(item, signature, companyInfo, "download").then(() => toast.success("Đã tải biên bản PDF.")); }} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A] disabled:opacity-50"><Download size={14} />Tải PDF</button><button disabled={isBusy} onClick={() => { void downloadHandoverPdf(item, signature, companyInfo, "print").then(() => toast.success("Đã mở hộp thoại in phiếu bàn giao.")).catch((error: Error) => toast.info(error.message)); }} className="flex items-center gap-2 rounded-lg bg-[#102A43] px-4 py-2 text-xs font-bold text-white hover:bg-[#193B57] disabled:opacity-50"><Printer size={14} />In phiếu</button>{nextAction && <button disabled={isBusy || (nextAction.status === "active" && !signed)} onClick={() => updateStatus(nextAction.status)} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><Signature size={14} />{isBusy ? "Đang lưu..." : nextAction.label}</button>}</div>
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

function AssetModal({ mode, asset, formData, setFormData, isSaving, onClose: dismiss, onSave, onEdit, onStartHandover }: { mode: "create" | "edit" | "detail"; asset: Asset | null; formData: Asset; setFormData: React.Dispatch<React.SetStateAction<Asset>>; isSaving: boolean; onClose: () => void; onSave: (attachment?: SupplierReturnAttachment) => void; onEdit: () => void; onStartHandover: (assetCode: string) => void }) {
  const isDetail = mode === "detail";
  const preservePurchaseDate = mode === "edit" && Boolean(asset?.code);
  const [repairOpen, setRepairOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [supplierReturnConfirmOpen, setSupplierReturnConfirmOpen] = useState(false);
  const [supplierReturnFile, setSupplierReturnFile] = useState<File | null>(null);
  const [supplierReturnPreviewUrl, setSupplierReturnPreviewUrl] = useState("");
  useEffect(() => { if (!supplierReturnFile) { setSupplierReturnPreviewUrl(""); return; } const url = URL.createObjectURL(supplierReturnFile); setSupplierReturnPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [supplierReturnFile]);
  useEffect(() => { setFormDirty(false); }, [mode, asset?.code]);
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
  const requestSave = () => {
    if (isSaving) return;
    if (formData.statusType !== "returned" || mode !== "edit") { onSave(); return; }
    if (!formData.supplierReturnedAt || !formData.supplierReturnReason?.trim()) { toast.error("Vui lòng nhập ngày và lý do trả nhà cung cấp trước khi xác nhận."); return; }
    setSupplierReturnConfirmOpen(true);
  };
  const confirmSupplierReturn = async () => {
    try { const attachment = await prepareSupplierReturnAttachment(); setSupplierReturnConfirmOpen(false); onSave(attachment); } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể đọc tệp đính kèm."); }
  };
  useModalDismiss(onClose);
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPriority, setRepairPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const assetsQuery = trpc.assets.list.useQuery(undefined, { enabled: isDetail && Boolean(asset) });
  const persistedAsset = assetsQuery.data?.find((candidate) => candidate.assetCode === asset?.code);
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
  useEffect(() => {
    if (isDetail) return;
    const holderLabel = Array.from(document.querySelectorAll("label")).find((label) => label.textContent?.trim().startsWith("Người / Phòng giữ"));
    const holderInput = holderLabel?.parentElement?.querySelector("input") as HTMLInputElement | null;
    if (!holderInput) return;
    const statusLabel = formData.statusType === "available" ? "Chưa bàn giao" : formData.statusType === "maintenance" ? "Bảo trì" : formData.statusType === "returned" ? "Đã trả NCC" : "";
    if (statusLabel && formData.holder !== statusLabel) {
      setFormData((current) => ({ ...current, holder: statusLabel }));
      return;
    }
    if (formData.statusType === "active" && ["Chưa bàn giao", "Bảo trì", "Đã trả NCC"].includes(formData.holder)) {
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
    if (isDetail) return;
    const statusLabel = Array.from(document.querySelectorAll("label")).find((label) => label.textContent?.trim() === "Trạng thái");
    const statusField = statusLabel?.parentElement;
    const grid = statusField?.parentElement;
    if (!statusField || !grid) return;
    grid.querySelector("[data-maintenance-reason]")?.remove();
    if (formData.statusType !== "maintenance") return;
    const field = document.createElement("div");
    field.dataset.maintenanceReason = "true";
    field.className = "sm:col-span-2";
    const label = document.createElement("label");
    label.className = "field-label";
    label.innerHTML = 'Lý do bảo trì <span class="text-[#B44545]">*</span>';
    const textarea = document.createElement("textarea");
    textarea.required = true;
    textarea.value = formData.maintenanceReason || "";
    textarea.placeholder = "Mô tả lý do đưa tài sản vào bảo trì...";
    textarea.className = "field-input mt-1 min-h-[78px] resize-y";
    textarea.addEventListener("input", () => setFormData((current) => ({ ...current, maintenanceReason: textarea.value })));
    field.append(label, textarea);
    statusField.after(field);
    return () => field.remove();
  }, [isDetail, formData.statusType, setFormData]);
  const title = mode === "create" ? "Thêm tài sản mới" : mode === "edit" ? "Chỉnh sửa tài sản" : "Chi tiết tài sản";
  const fields: Array<{ key: keyof Asset; label: string; placeholder: string }> = [
    { key: "name", label: "Tên tài sản", placeholder: "Ví dụ: MacBook Pro 14-inch M3" },
    { key: "holder", label: "Người / Phòng giữ", placeholder: "Nhập người hoặc phòng ban" },
    { key: "value", label: "Giá trị nguyên giá (VNĐ)", placeholder: "Ví dụ: 42.500.000" },
    { key: "location", label: "Vị trí lưu trữ", placeholder: "Ví dụ: Tầng 5 · Khu A" },
    { key: "serial", label: "Số serial / IMEI", placeholder: "Nhập số serial" },
  ];
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)] ${isDetail ? "max-w-[560px]" : "max-w-[720px]"}`}>
      <div className="relative border-b border-[#E7EEF3] px-6 py-5"><div className="min-w-0 pr-14"><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">Asset catalog</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{title}</h2><p className="mt-1 max-w-full truncate whitespace-nowrap text-xs leading-5 text-[#8AA0B6]" title={isDetail ? "Thông tin định danh và vòng đời của tài sản." : "Cập nhật dữ liệu để hệ thống luôn chính xác."}>{isDetail ? "Thông tin định danh và vòng đời của tài sản." : "Cập nhật dữ liệu để hệ thống luôn chính xác."}</p>{isDetail && <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#F5F9FB] px-2 py-1 text-[10px] font-semibold text-[#71869A]" title="Thời điểm bản ghi tài sản được cập nhật gần nhất"><Clock3 size={12} className="shrink-0 text-[#0F8C8C]" aria-hidden="true" /><span className="truncate">Lần cập nhật gần nhất: {persistedAsset?.updatedAt ? new Date(persistedAsset.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : assetsQuery.isLoading ? "Đang tải..." : "Chưa ghi nhận"}</span></div>}</div><button onClick={onClose} className="absolute right-6 top-5 shrink-0 rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      {isDetail && asset ? <div className="space-y-5 p-6"><div className="flex items-center gap-4 rounded-xl bg-[#F5F9FB] p-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Laptop size={24} /></div><div className="min-w-0 flex-1"><div className="font-display text-base font-extrabold text-[#193B57]">{asset.name}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType]}`}>{asset.status}</span></div><div className="grid gap-4 sm:grid-cols-2">{[["Phân loại", asset.category], ["Người / Phòng giữ", asset.holder || "Chưa cấp phát"], ["Ngày mua", asset.date], ["Giá trị", `${formatVnd(asset.value)} VNĐ`], ["Vị trí", asset.location || "Chưa cập nhật"], ["Serial / IMEI", asset.serial || "Chưa cập nhật"], ["Nhà cung cấp", asset.supplier || "Chưa cập nhật"], ["Ngày trả nhà cung cấp", asset.supplierReturnedAt ? dateInputValue(asset.supplierReturnedAt) : "Chưa ghi nhận"], ["Lý do trả nhà cung cấp", asset.supplierReturnReason || "Chưa ghi nhận"], ["Ghi chú", asset.note || "Không có ghi chú"]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-[#E7EEF3] px-3.5 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9BAEC0]">{label}</div><div className="mt-1.5 break-words text-sm font-semibold leading-5 text-[#193B57]">{value}</div></div>)}</div><section className="rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4"><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#B44545]"><History size={14} />Lịch sử quyết định trả nhà cung cấp</div>{asset.statusType === "returned" ? <><p className="mt-1 text-xs text-[#71869A]">Các thay đổi trạng thái, ngày trả và lý do được ghi nhận từ database.</p><div className="mt-3 space-y-2">{(assetFieldHistoryQuery.data?.items || []).filter((change) => ["status", "supplierReturnedAt", "supplierReturnReason"].includes(change.fieldName)).map((change) => <div key={change.id} className="rounded-lg border border-[#E7EEF3] bg-white px-3 py-2.5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#193B57]">{change.fieldName === "status" ? "Trạng thái" : change.fieldName === "supplierReturnedAt" ? "Ngày trả nhà cung cấp" : "Lý do trả nhà cung cấp"}</span><span className="text-[10px] text-[#8AA0B6]">{new Date(change.createdAt).toLocaleString("vi-VN")}</span></div><div className="mt-1 text-xs text-[#60758A]">{change.fieldName === "status" ? `${change.previousValue || "—"} → ${change.nextValue || "—"}` : change.nextValue || "—"}</div><div className="mt-1 text-[10px] text-[#9BAEC0]">Người thực hiện: {change.actorName || "Quản trị viên"}</div></div>)}</div><div className="mt-4 border-t border-[#E7EEF3] pt-3"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9BAEC0]">Tệp xác nhận đã tải lên</div>{asset.supplierReturnAttachmentUrl ? <a href={asset.supplierReturnAttachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#ECF8F7]"><Paperclip size={14} />{asset.supplierReturnAttachmentName || "Mở tệp xác nhận"}</a> : <p className="mt-2 text-xs text-[#8AA0B6]">Chưa có tệp xác nhận.</p>}</div></> : <p className="mt-2 text-xs text-[#8AA0B6]">Chưa có quyết định trả nhà cung cấp.</p>}</section><section className="rounded-xl border border-[#E7EEF3] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#A86B00]"><Wrench size={14} />Lịch sử bảo trì & sửa chữa</div><p className="mt-1 text-xs text-[#71869A]">Các yêu cầu kỹ thuật phát sinh cho riêng tài sản này.</p></div><button disabled={!persistedAsset || createRepairMutation.isPending} onClick={() => setRepairOpen((current) => !current)} className="rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-xs font-bold text-[#A86B00] hover:bg-white disabled:opacity-50">{repairOpen ? "Đóng form" : "Tạo yêu cầu sửa chữa"}</button></div>{repairOpen && <div className="mt-4 rounded-lg border border-[#F2D596] bg-[#FFFDF7] p-3"><label className="field-label">Mô tả sự cố <span className="text-[#B44545]">*</span></label><textarea value={repairDescription} onChange={(event) => setRepairDescription(event.target.value)} placeholder="Ví dụ: Thiết bị không khởi động, cần kiểm tra nguồn và bo mạch..." className="field-input min-h-[74px] resize-y" /><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={repairPriority} onChange={(event) => setRepairPriority(event.target.value as typeof repairPriority)} className="field-input sm:max-w-[170px]"><option value="low">Ưu tiên thấp</option><option value="medium">Ưu tiên trung bình</option><option value="high">Ưu tiên cao</option><option value="critical">Ưu tiên khẩn cấp</option></select><button disabled={!persistedAsset || createRepairMutation.isPending} onClick={() => { if (!persistedAsset || repairDescription.trim().length < 5) { toast.error("Nhập mô tả sự cố tối thiểu 5 ký tự."); return; } createRepairMutation.mutate({ assetId: persistedAsset.id, issueType: "damage", priority: repairPriority, description: repairDescription.trim(), estimatedCost: null, dueAt: null, recurrenceDays: null }); }} className="rounded-lg bg-[#A86B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#8A5900] disabled:opacity-50">{createRepairMutation.isPending ? "Đang tạo..." : "Gửi yêu cầu sửa chữa"}</button></div></div>}{assetsQuery.isLoading || maintenanceHistoryQuery.isLoading ? <p className="mt-4 text-xs text-[#71869A]">Đang tải lịch sử bảo trì...</p> : maintenanceHistoryQuery.isError ? <p className="mt-4 rounded-lg bg-[#FDEDEE] px-3 py-2 text-xs font-semibold text-[#B44545]">Không thể tải lịch sử. <button onClick={() => maintenanceHistoryQuery.refetch()} className="underline">Thử lại</button></p> : maintenanceHistoryQuery.data?.length ? <div className="mt-4 space-y-2">{maintenanceHistoryQuery.data.map((ticket) => <div key={ticket.id} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] font-bold text-[#A86B00]">{ticket.ticketCode}</div><div className="mt-1 text-xs font-bold text-[#193B57]">{ticket.issueType === "damage" ? "Sửa chữa" : ticket.issueType === "maintenance" ? "Bảo trì định kỳ" : "Sự cố"}</div><p className="mt-1 text-xs leading-5 text-[#60758A]">{ticket.description}</p></div><span className="rounded-full bg-[#F0F5F8] px-2 py-1 text-[10px] font-bold text-[#60758A]">{ticket.status === "resolved" ? "Đã xử lý" : ticket.status === "closed" ? "Đã đóng" : ticket.status === "in_progress" ? "Đang xử lý" : "Mới tiếp nhận"}</span></div><div className="mt-2 text-[10px] text-[#8AA0B6]">Tạo ngày {new Date(ticket.openedAt).toLocaleDateString("vi-VN")}{ticket.resolution ? ` · Kết quả: ${ticket.resolution}` : ""}</div></div>)}</div> : <p className="mt-4 text-xs text-[#8AA0B6]">Chưa có lịch sử bảo trì hoặc sửa chữa cho tài sản này.</p>}</section><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng</button><button onClick={onEdit} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Chỉnh sửa tài sản</button></div></div> : <div className="p-6"><div className="mb-5 grid gap-4 sm:grid-cols-2"><div><label className="field-label">Mã tài sản</label><input value={formData.code} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><AssetCategoryPicker value={formData.categoryId} fallbackValue={formData.category} categories={categoriesQuery.data || []} onChange={(selected, rawValue) => { setFormDirty(true); setFormData((current) => ({ ...current, categoryId: selected?.id, category: selected?.name || rawValue || "", code: "" })); }} onCreate={(name) => createCategoryMutation.mutate({ name, code: "CAT", description: null })} creating={createCategoryMutation.isPending} /><div><label className="field-label">Ngày mua</label><DatePickerField value={dateInputValue(formData.date)} onChange={(value) => update("date", value)} disabled={preservePurchaseDate} data-purchase-date-picker aria-label="Ngày mua" className={preservePurchaseDate ? "bg-[#F5F8FB] text-[#71869A]" : ""} /><p className="mt-1 text-[10px] text-[#8AA0B6]">{preservePurchaseDate ? "Được giữ nguyên sau khi tài sản được tạo." : "Ngày gốc của tài sản."}</p></div><div><label className="field-label">Hạn bảo hành</label><DatePickerField value={dateInputValue(formData.warrantyUntil)} onChange={(value) => update("warrantyUntil", value)} aria-label="Hạn bảo hành" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Ngày hết hiệu lực bảo hành.</p></div>{formData.statusType === "returned" && <><div><label className="field-label">Ngày trả nhà cung cấp <span className="text-[#B44545]">*</span></label><DatePickerField value={dateInputValue(formData.supplierReturnedAt)} onChange={(value) => update("supplierReturnedAt", value)} aria-label="Ngày trả nhà cung cấp" /><p className="mt-1 text-[10px] text-[#8AA0B6]">Ngày thực tế gửi trả hàng.</p></div><div><label className="field-label">Lý do trả nhà cung cấp <span className="text-[#B44545]">*</span></label><textarea value={formData.supplierReturnReason || ""} onChange={(e) => update("supplierReturnReason", e.target.value)} placeholder="Ví dụ: Hàng lỗi khi tiếp nhận, sai cấu hình..." className="field-input min-h-[74px] resize-y" /><label className="mt-2 block text-[10px] font-bold text-[#60758A]">Ảnh hoặc biên bản xác nhận <span className="font-normal text-[#8AA0B6]">(PDF, PNG, JPG, WEBP; tối đa 5 MB)</span></label><input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { toast.error("Tệp không được vượt quá 5 MB."); e.currentTarget.value = ""; setSupplierReturnFile(null); return; } setSupplierReturnFile(file); setFormDirty(true); }} className="mt-1 block w-full text-xs text-[#60758A] file:mr-3 file:rounded-md file:border-0 file:bg-[#ECF8F7] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#087A6A]" />{supplierReturnFile && <p className="mt-1 text-[10px] font-semibold text-[#087A6A]">Đã chọn: {supplierReturnFile.name}</p>}</div></>}{fields.slice(0, 2).map((field) => <div key={field.key}><label className="field-label">{field.label}<span className="text-[#0F8C8C]"> *</span></label><input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" /></div>)}<AssetCatalogDropdowns vendorId={formData.vendorId} brandId={formData.brandId} vendorOptions={vendorsQuery.data || []} brandOptions={brandsQuery.data || []} quickEntryType={quickEntryType} quickEntryName={quickEntryName} onQuickEntryTypeChange={setQuickEntryType} onQuickEntryNameChange={(value) => { quickEntryNameRef.current = value; setQuickEntryName(value); }} onVendorChange={(item) => { setFormDirty(true); setFormData((current) => ({ ...current, vendorId: item?.id, supplier: item?.name || "" })); }} onBrandChange={(item) => { setFormDirty(true); setFormData((current) => ({ ...current, brandId: item?.id, brand: item?.name || "" })); }} onCreateVendor={(name) => createVendorMutation.mutate({ name, contactName: null, phone: null, email: null })} onCreateBrand={(name) => createBrandMutation.mutate({ name })} creatingVendor={createVendorMutation.isPending} creatingBrand={createBrandMutation.isPending} /><div><label className="field-label">Trạng thái</label><SearchableSelect value={formData.statusType} onChange={(value) => { const next = value as Asset["statusType"]; const label = next === "available" ? "Sẵn có" : next === "maintenance" ? "Bảo trì" : next === "returned" ? "Trả nhà cung cấp" : "Đang cấp phát"; update("status", label); update("statusType", next); if (next === "active" && formData.statusType !== "active") window.setTimeout(() => onStartHandover(formData.code), 0); }} options={[{ value: "available", label: "Sẵn có" }, { value: "active", label: "Đang cấp phát" }, { value: "maintenance", label: "Bảo trì" }, { value: "returned", label: "Trả nhà cung cấp" }]} placeholder="Chọn trạng thái" searchPlaceholder="Tìm trạng thái..." /></div>{formData.statusType === "maintenance" && <div className="sm:col-span-2 rounded-xl border border-[#F2D596] bg-[#FFFDF7] p-3"><label className="field-label">Nội dung cần bảo trì <span className="text-[#B44545]">*</span></label><textarea value={formData.maintenanceReason || ""} onChange={(event) => update("maintenanceReason", event.target.value)} placeholder="Mô tả nội dung cần kiểm tra hoặc sửa chữa..." className="field-input min-h-[76px] resize-y" aria-label="Nội dung cần bảo trì" /><p className="mt-1 text-[10px] text-[#A86B00]">Thông tin này sẽ được lưu cùng tài sản để theo dõi và hiển thị trong thông báo bảo trì.</p></div>}{fields.slice(2).map((field) => <div key={field.key}><label className="field-label">{field.label}</label>{field.key === "value" ? <CurrencyInput value={String(formData.value || "")} onChange={(value) => update("value", value)} placeholder={field.placeholder} aria-label={field.label} showWords /> : <input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" />}</div>)}<div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={formData.note || ""} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung thông tin cần lưu ý..." className="field-input min-h-[80px] resize-y" /></div></div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button disabled={isSaving} onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:cursor-wait disabled:opacity-60">Hủy</button><button disabled={isSaving} aria-busy={isSaving} onClick={requestSave} className="inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A] disabled:cursor-wait disabled:opacity-75">{isSaving ? <><Loader2 size={15} className="animate-spin" />Đang lưu...</> : mode === "edit" ? "Lưu thay đổi" : "Tạo tài sản"}</button></div></div>}
          </div>
      <AlertDialog open={supplierReturnConfirmOpen} onOpenChange={setSupplierReturnConfirmOpen}><AlertDialogContent onPointerDownOutside={() => setSupplierReturnConfirmOpen(false)} onEscapeKeyDown={() => setSupplierReturnConfirmOpen(false)}><AlertDialogHeader><AlertDialogTitle>Xác nhận trả nhà cung cấp</AlertDialogTitle><AlertDialogDescription>Thao tác này sẽ chuyển tài sản <strong>{formData.code}</strong> sang Trả nhà cung cấp và loại khỏi các luồng cấp phát đang hoạt động. Hãy kiểm tra kỹ trước khi tiếp tục.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2 rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 text-xs text-[#7A5A00]"><div><b>Ngày trả:</b> {formData.supplierReturnedAt ? dateInputValue(formData.supplierReturnedAt) : "Chưa nhập"}</div><div><b>Lý do:</b> {formData.supplierReturnReason || "Chưa nhập"}</div><div><b>Tệp xác nhận:</b> {supplierReturnFile?.name || "Không đính kèm"}</div></div>{supplierReturnFile && supplierReturnPreviewUrl && <div className="overflow-hidden rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] p-2"><div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#60758A]">Xem trước tệp</div>{supplierReturnFile.type === "application/pdf" ? <iframe src={supplierReturnPreviewUrl} title="Xem trước biên bản trả nhà cung cấp" className="h-56 w-full rounded border-0" /> : <img src={supplierReturnPreviewUrl} alt="Xem trước hình ảnh xác nhận trả nhà cung cấp" className="max-h-56 w-full rounded object-contain" />}</div>}<AlertDialogFooter><AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel><AlertDialogAction onClick={() => { void confirmSupplierReturn(); }}>Xác nhận chuyển trạng thái</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
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
      <div className="mt-5 flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng</button>{qrDataUrl && <a href={qrDataUrl} download={`AssetMaster-${asset.code}.png`} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Tải PNG</a>}</div>
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
    <div className="w-full max-w-md rounded-2xl border border-[#DDE7F0] bg-white p-6 shadow-[0_24px_70px_rgba(16,42,67,0.24)]"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><QrCode size={14} />Nhận diện tài sản</div><h2 className="mt-2 font-display text-xl font-extrabold text-[#102A43]">Quét hoặc nhập mã QR</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Dùng camera/hardware scanner để đưa chuỗi QR vào ô bên dưới, hoặc dán mã token AssetMaster.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div><div className="mt-4 rounded-lg border border-[#CDE5E5] bg-[#ECF8F7] px-3 py-2 text-[11px] font-semibold leading-5 text-[#087A6A]">Mã QR được định danh bằng token duy nhất đã lưu cùng tài sản trong hệ thống.</div><div className="mt-5"><label className="field-label">Mã QR hoặc mã tài sản</label><input autoFocus value={input} onChange={(event) => { setInput(event.target.value); setMessage(""); setMatchedAsset(null); }} onKeyDown={(event) => { if (event.key === "Enter") findAsset(); }} placeholder="Ví dụ: ASSETMASTER|a1b2c3..." className="field-input font-mono" /></div><button onClick={findAsset} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A]"><Search size={15} />Nhận diện tài sản</button>{message && <p className="mt-3 rounded-lg bg-[#FFF9EB] px-3 py-2 text-xs font-semibold text-[#A86B00]">{message}</p>}{matchedAsset && <div className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-4"><div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]">Đã nhận diện</div><div className="mt-2 font-display text-base font-extrabold text-[#193B57]">{matchedAsset.name}</div><div className="mt-1 font-mono text-xs font-bold text-[#0F8C8C]">{matchedAsset.code}</div><div className="mt-1 text-xs text-[#60758A]">Trạng thái: {matchedAsset.status}</div><button onClick={() => onOpenAsset(matchedAsset)} className="mt-4 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] hover:bg-[#F7FFFE]">Mở chi tiết tài sản</button></div>}<div className="mt-5 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng</button></div></div>
  </div>;
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <SearchableSelect value={value} onChange={onChange} options={options.map((option) => ({ value: option, label: option }))} placeholder={options[0] || "Chọn một giá trị"} searchPlaceholder="Tìm trong dropdown..." className="w-full shrink-0 sm:w-[180px]" />;
}
