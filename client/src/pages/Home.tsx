// Corporate Clarity: calm Swiss enterprise information design, navy structure, teal actions, amber exceptions.
// This page owns the AssetMaster dashboard composition and local interaction states.

import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import notoSansVietnamese from "../assets/noto-sans-vietnamese.ttf";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuditPage, MaintenancePage, ReportsPage } from "./OperationsModules";
import {
  Archive,
  ArrowDownUp,
  Bell,
  Box,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
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
  Menu,
  MoreHorizontal,
  PackageCheck,
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
  X,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Danh mục tài sản", icon: Archive },
  { label: "Bàn giao & Cấp phát", icon: PackageCheck },
  { label: "Bảo trì & Báo hỏng", icon: Wrench, count: "12" },
  { label: "Kiểm kê", icon: ClipboardCheck },
  { label: "Báo cáo", icon: FileBarChart },
];

type Asset = {
  code: string;
  name: string;
  category: string;
  holder: string;
  status: string;
  statusType: "active" | "available" | "maintenance";
  date: string;
  value: string;
  location?: string;
  serial?: string;
  supplier?: string;
  note?: string;
};

type CompanyInfo = {
  name: string;
  address: string;
  taxCode: string;
  phone: string;
};

const defaultCompanyInfo: CompanyInfo = {
  name: "Công ty Cổ phần AssetMaster",
  address: "Tầng 5, Tòa nhà Innovation, Quận Cầu Giấy, Hà Nội",
  taxCode: "0101234567",
  phone: "024 3789 2468",
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
};

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [assetModal, setAssetModal] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Asset>({ code: "", name: "", category: "CNTT", holder: "", status: "Sẵn có", statusType: "available", date: "14/02/2025", value: "", location: "", serial: "", supplier: "", note: "" });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả loại tài sản");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [department, setDepartment] = useState("Tất cả phòng ban");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(readCompanyInfo);
  const assetQuery = trpc.assets.list.useQuery(undefined, { enabled: isAuthenticated });
  const companyQuery = trpc.company.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveCompanyMutation = trpc.company.save.useMutation({ onSuccess: () => companyQuery.refetch() });
  const createAssetMutation = trpc.assets.create.useMutation({ onSuccess: () => assetQuery.refetch() });
  const updateAssetMutation = trpc.assets.update.useMutation({ onSuccess: () => assetQuery.refetch() });

  useEffect(() => {
    if (!assetQuery.data) return;
    setAssetRows(assetQuery.data.map((asset) => ({
      code: asset.assetCode, name: asset.name, category: "Chưa phân loại", holder: asset.holderName || "Chưa cấp phát", status: asset.status === "assigned" ? "Đang cấp phát" : asset.status === "maintenance" ? "Bảo trì" : "Sẵn có", statusType: asset.status === "assigned" ? "active" : asset.status === "maintenance" ? "maintenance" : "available", date: asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "—", value: asset.purchaseValue ? String(asset.purchaseValue) : "0", location: asset.location || "", serial: asset.serialNumber || "", supplier: asset.vendor || "", note: asset.note || "",
    })));
  }, [assetQuery.data]);

  useEffect(() => {
    if (!companyQuery.data) return;
    const next = { name: companyQuery.data.name, address: companyQuery.data.address || "", taxCode: companyQuery.data.taxCode || "", phone: companyQuery.data.phone || "" };
    setCompanyInfo(next);
    localStorage.setItem("assetmaster-company-info", JSON.stringify(next));
  }, [companyQuery.data]);

  const filteredAssets = useMemo(() => assetRows.filter((asset) => {
    const matchesQuery = `${asset.code} ${asset.name} ${asset.holder}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Tất cả loại tài sản" || asset.category === category;
    const matchesStatus = status === "Tất cả trạng thái" || asset.status === status;
    const matchesDepartment = department === "Tất cả phòng ban" || asset.holder.includes(department);
    return matchesQuery && matchesCategory && matchesStatus && matchesDepartment;
  }), [assetRows, query, category, status, department]);
  const assetValueTotal = assetRows.reduce((total, asset) => total + Number(asset.value.replace(/[^0-9.]/g, "") || 0), 0);
  const dashboardKpis = [
    { label: "Tổng tài sản", value: String(assetRows.length), detail: "Theo dữ liệu đang quản lý", icon: Box, tone: "teal" },
    { label: "Đang sử dụng", value: String(assetRows.filter((asset) => asset.statusType === "active").length), detail: "Tài sản đã cấp phát", icon: UsersRound, tone: "blue" },
    { label: "Đang bảo trì / Hỏng", value: String(assetRows.filter((asset) => asset.statusType === "maintenance").length), detail: "Cần theo dõi xử lý", icon: Wrench, tone: "amber" },
    { label: "Tổng giá trị", value: assetValueTotal >= 1_000_000_000 ? `${(assetValueTotal / 1_000_000_000).toFixed(1)} Tỷ` : new Intl.NumberFormat("vi-VN").format(assetValueTotal), detail: "Giá trị nguyên giá", icon: Tags, tone: "navy" },
  ];

  const openCreateModal = () => { setFormData({ code: `TS-${String(assetRows.length + 125).padStart(5, "0")}`, name: "", category: "CNTT", holder: "", status: "Sẵn có", statusType: "available", date: "14/02/2025", value: "", location: "", serial: "", supplier: "", note: "" }); setSelectedAsset(null); setAssetModal("create"); };
  const openEditModal = (asset: Asset) => { setSelectedAsset(asset); setFormData({ ...asset }); setAssetModal("edit"); };
  const openDetailModal = (asset: Asset) => { setSelectedAsset(asset); setAssetModal("detail"); };
  const saveAsset = () => { if (!formData.name.trim() || !formData.value.trim()) { toast.error("Vui lòng nhập tên tài sản và giá trị."); return; } const payload = { assetCode: formData.code, name: formData.name, holderName: formData.holder || null, status: formData.statusType === "active" ? "assigned" as const : formData.statusType === "maintenance" ? "maintenance" as const : "available" as const, condition: "good" as const, purchaseValue: formData.value.replace(/[^0-9.]/g, "") || "0", vendor: formData.supplier || null, serialNumber: formData.serial || null, location: formData.location || null, note: formData.note || null, purchaseDate: null, warrantyUntil: null, categoryId: null, departmentId: null }; if (assetModal === "edit") { const target = assetQuery.data?.find((asset) => asset.assetCode === formData.code); if (!target) { toast.error("Không tìm thấy tài sản để cập nhật."); return; } updateAssetMutation.mutate({ id: target.id, ...payload }); } else { createAssetMutation.mutate(payload); } setAssetModal(null); toast.success("Đã gửi thay đổi tài sản để lưu vào hệ thống."); };
  const showComingSoon = (label: string) => toast.info(`${label} sẽ được mở trong phiên bản tiếp theo.`, { description: "Bản xem trước hiện đang dùng dữ liệu mẫu để minh họa giao diện." });

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102A43] antialiased">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#DDE7F0] bg-[#102A43] px-4 py-5 shadow-[8px_0_30px_rgba(16,42,67,0.16)] transition-transform duration-200 lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-3 pb-8">
          <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-[#0F8C8C] shadow-[0_8px_18px_rgba(15,140,140,0.24)]">
            <img src="/manus-storage/assetmaster-logo_f5d79b06.png" alt="" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <div className="font-display text-[18px] font-extrabold tracking-[-0.04em] text-white">Asset<span className="text-[#0F8C8C]">Master</span></div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A5C3D2]">Enterprise OS</div>
          </div>
          <button className="ml-auto rounded-lg p-1 text-[#8AA0B6] hover:bg-[#F0F5F8] lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu"><X size={18} /></button>
        </div>

        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7FA0B8]">Workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;
            return <button key={item.label} onClick={() => { setActiveNav(item.label); setMobileNavOpen(false); }} className={`group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-150 ${active ? "bg-[#E8F7F5] text-[#087A6A] shadow-[inset_3px_0_0_#0F8C8C]" : "text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.9} /><span className="flex-1">{item.label}</span>{item.count && <span className="rounded-full bg-[#FFF0C9] px-1.5 py-0.5 text-[10px] font-bold text-[#A86B00]">{item.count}</span>}</button>;
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-[#2A4D67] pt-4">
          <button onClick={() => showComingSoon("Trợ giúp")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"><CircleHelp size={17} />Trợ giúp & hướng dẫn</button>
          <button onClick={() => { setActiveNav("Cài đặt"); setMobileNavOpen(false); }} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"><Settings2 size={17} />Cài đặt hệ thống</button>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#173A56] p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#DCEFEF] text-[11px] font-extrabold text-[#087A6A]">MA</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">Minh Anh</div><div className="truncate text-[10px] text-[#9BB8C8]">Quản trị viên</div></div><MoreHorizontal size={17} className="text-[#9BAEC0]" />
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-[#102A43]/20 backdrop-blur-[2px] lg:hidden" />}

      <main className="min-h-screen lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-[#DDE7F0] bg-[#FFFFFF]/95 px-4 shadow-[0_5px_20px_rgba(16,42,67,0.03)] backdrop-blur-xl sm:px-6 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-2 text-[#527089] hover:bg-[#F0F5F8] lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
            <div className="hidden items-center gap-2 text-sm text-[#8AA0B6] sm:flex"><span>Workspace</span><span className="text-[#C2D0DC]">/</span><span className="font-semibold text-[#193B57]">Tổng quan</span></div>
            <div className="relative w-full sm:hidden"><Search className="absolute left-3 top-2.5 text-[#8AA0B6]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden w-[260px] md:block"><Search className="absolute left-3 top-2.5 text-[#8AA0B6]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo mã, tên tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] pl-9 pr-3 text-xs outline-none transition focus:border-[#0F8C8C] focus:bg-white" /><kbd className="absolute right-2.5 top-2 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#9BAEC0] shadow-sm">⌘ K</kbd></div>
            <button onClick={() => showComingSoon("Quét mã QR")} className="hidden h-9 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#ECF8F7] sm:flex"><QrCode size={16} />Quét mã QR</button>
            <button onClick={openCreateModal} className="hidden h-9 items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] sm:flex"><Plus size={16} />Thêm tài sản mới</button>
            <button onClick={() => toast.info("Bạn không có thông báo mới.")} className="relative rounded-lg p-2 text-[#60758A] hover:bg-[#F0F5F8]" aria-label="Thông báo"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F0A516] ring-2 ring-white" /></button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CFE7E4] text-[11px] font-extrabold text-[#087A6A]">MA</div>
          </div>
        </header>

        {activeNav === "Bàn giao & Cấp phát" ? <AssignmentsPage showComingSoon={showComingSoon} companyInfo={companyInfo} /> : null}
        {activeNav === "Cài đặt" ? <CompanySettingsPage companyInfo={companyInfo} onSave={(next) => { setCompanyInfo(next); localStorage.setItem("assetmaster-company-info", JSON.stringify(next)); saveCompanyMutation.mutate({ name: next.name, address: next.address || null, taxCode: next.taxCode || null, phone: next.phone || null }); toast.success("Đã lưu thông tin công ty."); }} /> : null}
        {activeNav === "Bảo trì & Báo hỏng" ? <MaintenancePage /> : null}
        {activeNav === "Kiểm kê" ? <AuditPage /> : null}
        {activeNav === "Báo cáo" ? <ReportsPage /> : null}
        <div className={`relative overflow-hidden px-4 py-7 sm:px-6 lg:px-9 lg:py-8 ${["Bàn giao & Cấp phát", "Cài đặt", "Bảo trì & Báo hỏng", "Kiểm kê", "Báo cáo"].includes(activeNav) ? "hidden" : ""}`}>
          <div className="pointer-events-none absolute right-0 top-0 hidden h-[170px] w-[420px] opacity-60 lg:block"><img src="/manus-storage/assetmaster-dashboard-pattern_109e8935.png" alt="" className="h-full w-full object-cover object-left" /></div>
          <div className="relative mx-auto max-w-[1500px]"><div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#A86B00]"><span className="h-px w-8 bg-[#F0A516]" /><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />System pulse · live inventory signal</div>
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516] shadow-[0_0_0_4px_rgba(240,165,22,0.12)]" />Asset Operations</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Tổng quan tài sản</h1><p className="mt-1.5 text-sm text-[#71869A]">Theo dõi, quản lý và tối ưu toàn bộ tài sản doanh nghiệp.</p></div><div className="flex items-center gap-2 text-xs text-[#71869A]"><CalendarDays size={15} /><span>Dữ liệu cập nhật lúc 09:42, 14/02/2025</span><button onClick={() => toast.success("Dữ liệu đã được làm mới.")} className="rounded-md p-1.5 text-[#0F8C8C] hover:bg-[#E8F7F5]" aria-label="Làm mới"><ArrowDownUp size={14} /></button></div></div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardKpis.map((kpi, index) => { const Icon = kpi.icon; const toneMap: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; return <div key={kpi.label} className="animate-kpi group rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,42,67,0.08)]" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-[11px] ${toneMap[kpi.tone]}`}><Icon size={19} /></div></div><div className="mt-5 text-[12px] font-semibold text-[#7890A5]">{kpi.label}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-[26px] font-extrabold tracking-[-0.04em] text-[#102A43]">{kpi.value}</span>{kpi.label === "Tổng giá trị" && <span className="text-[11px] font-bold text-[#8AA0B6]">VNĐ</span>}</div><div className="mt-2 text-[11px] font-medium text-[#9AAEBD]">{kpi.detail}</div></div>; })}
            </section>

            <section className="mt-8 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
              <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh mục tài sản</h2><p className="mt-1 text-xs text-[#8AA0B6]">Quản lý và tra cứu tài sản trong doanh nghiệp</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button><button onClick={() => showComingSoon("Bộ lọc nâng cao")} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><Filter size={14} />Bộ lọc nâng cao</button></div></div>
              <div className="grid gap-3 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"><div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={category} onChange={setCategory} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={setStatus} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo trì"]} /><FilterSelect value={department} onChange={setDepartment} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th><th className="px-4 py-3.5">Phân loại</th><th className="px-4 py-3.5">Người / Phòng giữ</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Ngày mua</th><th className="px-4 py-3.5 text-right">Giá trị</th><th className="px-5 py-3.5 text-right">Hành động</th></tr></thead><tbody>{filteredAssets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">Tài sản cố định</div></div></div></td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.category}</td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType as keyof typeof statusStyles]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{asset.date}</td><td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{asset.value} <span className="text-[10px] font-semibold text-[#9BAEC0]">₫</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100"><button onClick={() => openEditModal(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Chỉnh sửa"><Settings2 size={15} /></button><button onClick={() => openDetailModal(asset)} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label="Xem chi tiết"><QrCode size={15} /></button><button onClick={() => showComingSoon(`Bàn giao ${asset.code}`)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Bàn giao"><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{filteredAssets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div>
              <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row"><div className="text-xs text-[#8AA0B6]">Hiển thị <span className="font-bold text-[#60758A]">{filteredAssets.length}</span> trên <span className="font-bold text-[#60758A]">{assetRows.length}</span> tài sản</div><div className="flex items-center gap-1"><button className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#B1C0CC]" disabled>‹</button><button className="grid h-8 w-8 place-items-center rounded-md bg-[#102A43] text-xs font-bold text-white">1</button><button onClick={() => showComingSoon("Phân trang sẽ mở khi danh mục có nhiều hơn một trang")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">›</button></div></div>
            </section>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><Sparkles size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Kiểm kê định kỳ đang đến hạn</div><div className="mt-0.5 text-[11px] text-[#4B8884]">45 tài sản cần được xác nhận trước ngày 28/02/2025.</div></div></div><button onClick={() => showComingSoon("Kiểm kê định kỳ")} className="hidden text-xs font-extrabold text-[#087A6A] underline decoration-[#8BCDC6] underline-offset-4 sm:block">Xem danh sách <span className="no-underline">→</span></button></div>
          </div>
        </div>
        {assetModal && <AssetModal mode={assetModal} asset={selectedAsset} formData={formData} setFormData={setFormData} onClose={() => setAssetModal(null)} onSave={saveAsset} onEdit={() => selectedAsset && openEditModal(selectedAsset)} />}
      </main>
    </div>
  );
}

function CompanySettingsPage({ companyInfo, onSave }: { companyInfo: CompanyInfo; onSave: (next: CompanyInfo) => void }) {
  const [draft, setDraft] = useState(companyInfo);
  const update = (key: keyof CompanyInfo, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1000px]"><div className="mb-7"><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Workspace settings</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Cài đặt hệ thống</h1><p className="mt-1.5 text-sm text-[#71869A]">Quản lý thông tin doanh nghiệp hiển thị trên tiêu đề biên bản bàn giao PDF.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]"><section className="rounded-xl border border-[#DFE9F0] bg-white p-6 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex items-start gap-3 border-b border-[#E7EEF3] pb-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Building2 size={19} /></div><div><h2 className="font-display text-base font-extrabold text-[#102A43]">Thông tin công ty</h2><p className="mt-1 text-xs text-[#8AA0B6]">Các trường này sẽ được tự động điền vào phần đầu biên bản PDF.</p></div></div><div className="mt-5 space-y-4"><div><label className="field-label">Tên công ty <span className="text-[#0F8C8C]">*</span></label><input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="Ví dụ: Công ty Cổ phần AssetMaster" className="field-input" /></div><div><label className="field-label">Địa chỉ trụ sở <span className="text-[#0F8C8C]">*</span></label><textarea value={draft.address} onChange={(e) => update("address", e.target.value)} placeholder="Nhập địa chỉ đầy đủ" className="field-input min-h-[76px] resize-y" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Mã số thuế</label><input value={draft.taxCode} onChange={(e) => update("taxCode", e.target.value)} placeholder="0101234567" className="field-input" /></div><div><label className="field-label">Số điện thoại</label><input value={draft.phone} onChange={(e) => update("phone", e.target.value)} placeholder="024 3789 2468" className="field-input" /></div></div></div><div className="mt-6 flex justify-end border-t border-[#E7EEF3] pt-4"><button onClick={() => { if (!draft.name.trim() || !draft.address.trim()) { toast.error("Vui lòng nhập tên công ty và địa chỉ."); return; } onSave(draft); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A]"><CheckCircle2 size={15} />Lưu thông tin công ty</button></div></section><aside className="rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-6"><div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F8C8C]">PDF header preview</div><div className="mt-4 rounded-xl bg-white p-5 shadow-[0_8px_20px_rgba(16,42,67,0.06)]"><div className="flex items-center gap-3"><img src="/manus-storage/assetmaster-logo_f5d79b06.png" alt="AssetMaster" className="h-11 w-11 rounded-xl bg-[#102A43] p-1.5" /><div><div className="font-display text-base font-extrabold text-[#102A43]">{draft.name || "Tên công ty"}</div><div className="mt-1 text-[10px] font-semibold text-[#0F8C8C]">HỆ THỐNG QUẢN LÝ TÀI SẢN DOANH NGHIỆP</div></div></div><div className="mt-5 border-t border-[#E7EEF3] pt-4 text-[11px] leading-5 text-[#60758A]"><div>{draft.address || "Địa chỉ công ty"}</div><div> MST: {draft.taxCode || "Chưa cập nhật"} · ĐT: {draft.phone || "Chưa cập nhật"}</div></div><div className="mt-5 text-center font-display text-sm font-extrabold text-[#193B57]">BIÊN BẢN BÀN GIAO TÀI SẢN</div></div><p className="mt-4 text-xs leading-5 text-[#4B8884]">Thông tin được lưu trong trình duyệt này và sẽ được dùng cho các lần xuất biên bản tiếp theo.</p></aside></div></div></div>;
}

type Handover = { id: string; assetCode: string; assetName: string; recipient: string; department: string; date: string; status: "Đã bàn giao" | "Chờ ký" | "Nháp" | "Đã hoàn trả"; condition: string; handoverBy: string; note: string; };

const initialHandovers: Handover[] = [
  { id: "BG-2025-0018", assetCode: "TS-00124", assetName: "MacBook Pro 14-inch M3", recipient: "Nguyễn Minh Anh", department: "Phòng Sản phẩm", date: "12/01/2025", status: "Đã bàn giao", condition: "Tốt", handoverBy: "Trần Quốc Việt", note: "Kèm sạc USB-C và túi chống sốc." },
  { id: "BG-2025-0017", assetCode: "TS-00123", assetName: "Màn hình Dell UltraSharp 27\"", recipient: "Trần Hoàng Nam", department: "Phòng Kinh doanh", date: "10/01/2025", status: "Chờ ký", condition: "Tốt", handoverBy: "Lê Thu Hà", note: "Chờ người nhận xác nhận biên bản." },
  { id: "BG-2025-0016", assetCode: "TS-00120", assetName: "Máy in HP LaserJet Pro", recipient: "Phòng Hành chính", department: "Khối Vận hành", date: "21/12/2024", status: "Nháp", condition: "Tốt", handoverBy: "Minh Anh", note: "Đang bổ sung danh sách phụ kiện." },
  { id: "BG-2024-0098", assetCode: "TS-00086", assetName: "Dell Latitude 5440", recipient: "Phạm Quốc Bảo", department: "Phòng Tài chính", date: "18/11/2024", status: "Đã hoàn trả", condition: "Có hao mòn nhẹ", handoverBy: "Nguyễn Minh Anh", note: "Đã thu hồi khi nhân sự nghỉ việc." },
];

function AssignmentsPage({ showComingSoon, companyInfo }: { showComingSoon: (label: string) => void; companyInfo: CompanyInfo }) {
  const [handovers, setHandovers] = useState<Handover[]>(initialHandovers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [modal, setModal] = useState<"create" | "detail" | null>(null);
  const [selected, setSelected] = useState<Handover | null>(null);
  const [form, setForm] = useState<Handover>({ id: "", assetCode: "TS-00122", assetName: "Bàn làm việc Workstation", recipient: "", department: "", date: "14/02/2025", status: "Nháp", condition: "Tốt", handoverBy: "Minh Anh", note: "" });
  const filtered = handovers.filter((item) => `${item.id} ${item.assetName} ${item.recipient} ${item.department}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === "Tất cả trạng thái" || item.status === statusFilter));
  const update = (key: keyof Handover, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const createHandover = () => { if (!form.recipient.trim() || !form.department.trim()) { toast.error("Vui lòng nhập người nhận và phòng ban."); return; } const next = { ...form, id: `BG-2025-${String(handovers.length + 19).padStart(4, "0")}` }; setHandovers((rows) => [next, ...rows]); setModal(null); toast.success("Đã tạo phiếu bàn giao nháp."); };
  const openCreate = () => { setForm({ id: "", assetCode: "TS-00122", assetName: "Bàn làm việc Workstation", recipient: "", department: "", date: "14/02/2025", status: "Nháp", condition: "Tốt", handoverBy: "Minh Anh", note: "" }); setModal("create"); };
  const statusClass: Record<Handover["status"], string> = { "Đã bàn giao": "bg-[#E6F6F2] text-[#087A6A] ring-[#B8E9DD]", "Chờ ký": "bg-[#FFF5DC] text-[#A86B00] ring-[#F2D596]", "Nháp": "bg-[#F0F5F8] text-[#60758A] ring-[#DDE7F0]", "Đã hoàn trả": "bg-[#EAF3FF] text-[#2666A8] ring-[#C7DDF8]" };
  const statusCount = (status: Handover["status"]) => handovers.filter((item) => item.status === status).length;
  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />Assignment operations</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Bàn giao & Cấp phát</h1><p className="mt-1.5 max-w-xl text-sm text-[#71869A]">Theo dõi tài sản đang cấp phát, xác nhận người nhận và lưu trữ biên bản bàn giao.</p></div><div className="flex gap-2"><button onClick={() => showComingSoon("Quét QR để bàn giao")} className="hidden h-10 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] sm:flex"><QrCode size={16} />Quét QR</button><button onClick={openCreate} className="flex h-10 items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A]"><Plus size={16} />Tạo phiếu bàn giao</button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AssignmentKpi label="Tổng phiếu" value={String(handovers.length)} icon={FileText} tone="navy" /><AssignmentKpi label="Đã bàn giao" value={String(statusCount("Đã bàn giao"))} icon={CheckCircle2} tone="teal" /><AssignmentKpi label="Chờ ký xác nhận" value={String(statusCount("Chờ ký"))} icon={Signature} tone="amber" /><AssignmentKpi label="Đã hoàn trả" value={String(statusCount("Đã hoàn trả"))} icon={Undo2} tone="blue" /></div><div className="mt-8 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh sách phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Mỗi phiếu lưu lại tài sản, người nhận và trạng thái xác nhận.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã phiếu, tài sản..." className="h-9 w-[220px] rounded-lg border border-[#DDE7F0] bg-[#F7FAFC] pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={statusFilter} onChange={setStatusFilter} options={["Tất cả trạng thái", "Đã bàn giao", "Chờ ký", "Nháp", "Đã hoàn trả"]} /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã phiếu</th><th className="px-4 py-3.5">Tài sản</th><th className="px-4 py-3.5">Người nhận</th><th className="px-4 py-3.5">Ngày bàn giao</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{item.id}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><PackageCheck size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{item.assetName}</div><div className="mt-0.5 font-mono text-[10px] text-[#9BAEC0]">{item.assetCode}</div></div></div></td><td className="px-4 py-4"><div className="text-xs font-semibold text-[#60758A]">{item.recipient}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">{item.department}</div></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{item.date}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusClass[item.status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{item.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-70 transition group-hover:opacity-100"><button onClick={() => { setSelected(item); setModal("detail"); }} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label="Xem biên bản"><FileText size={15} /></button><button onClick={() => showComingSoon(`In biên bản ${item.id}`)} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="In biên bản"><Printer size={15} /></button><button onClick={() => showComingSoon(`Lịch sử ${item.assetCode}`)} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Xem lịch sử"><History size={15} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="px-6 py-16 text-center text-sm font-bold text-[#60758A]">Không có phiếu bàn giao phù hợp.</div>}</div><div className="flex items-center justify-between border-t border-[#E7EEF3] px-5 py-4 text-xs text-[#8AA0B6]"><span>Hiển thị <b className="text-[#60758A]">{filtered.length}</b> phiếu</span><button onClick={() => showComingSoon("Phân trang phiếu bàn giao")} className="font-bold text-[#0F8C8C] hover:underline">Xem toàn bộ lịch sử →</button></div></div><div className="mt-5 flex items-center gap-3 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><ShieldCheck size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Quy trình kiểm soát bàn giao</div><div className="mt-0.5 text-[11px] text-[#4B8884]">Mọi phiếu đều cần người giao và người nhận xác nhận trước khi chuyển sang trạng thái đã bàn giao.</div></div></div></div>{modal === "create" && <HandoverCreateModal form={form} update={update} onClose={() => setModal(null)} onSave={createHandover} />}{modal === "detail" && selected && <HandoverDetailModal item={selected} companyInfo={companyInfo} onClose={() => setModal(null)} onPrint={() => showComingSoon(`In biên bản ${selected.id}`)} onHistory={() => showComingSoon(`Lịch sử ${selected.assetCode}`)} />}</div>;
}

function AssignmentKpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ElementType; tone: string }) { const tones: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; return <div className="rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)]"><div className={`grid h-10 w-10 place-items-center rounded-[11px] ${tones[tone]}`}><Icon size={19} /></div><div className="mt-5 text-[12px] font-semibold text-[#7890A5]">{label}</div><div className="mt-1 font-display text-[26px] font-extrabold tracking-[-0.04em] text-[#102A43]">{value}</div></div>; }

function HandoverCreateModal({ form, update, onClose, onSave }: { form: Handover; update: (key: keyof Handover, value: string) => void; onClose: () => void; onSave: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">New handover record</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">Tạo phiếu bàn giao</h2><p className="mt-1 text-xs text-[#8AA0B6]">Ghi nhận tài sản, người nhận và điều kiện bàn giao.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="mb-5 rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] p-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#0F8C8C]"><PackageCheck size={17} /></div><div><div className="text-xs font-bold text-[#087A6A]">Tài sản được cấp phát</div><div className="mt-0.5 text-xs font-semibold text-[#193B57]">{form.assetName} <span className="font-mono text-[10px] text-[#0F8C8C]">· {form.assetCode}</span></div></div></div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Người nhận <span className="text-[#0F8C8C]">*</span></label><input value={form.recipient} onChange={(e) => update("recipient", e.target.value)} placeholder="Nhập họ tên người nhận" className="field-input" /></div><div><label className="field-label">Phòng ban <span className="text-[#0F8C8C]">*</span></label><input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Ví dụ: Phòng Kinh doanh" className="field-input" /></div><div><label className="field-label">Ngày bàn giao</label><input value={form.date} onChange={(e) => update("date", e.target.value)} className="field-input" /></div><div><label className="field-label">Tình trạng tài sản</label><select value={form.condition} onChange={(e) => update("condition", e.target.value)} className="field-input"><option>Tốt</option><option>Có hao mòn nhẹ</option><option>Cần kiểm tra</option></select></div><div className="sm:col-span-2"><label className="field-label">Phụ kiện đi kèm</label><input value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Ví dụ: Sạc, túi chống sốc, chuột không dây" className="field-input" /></div></div><div className="mt-4 grid gap-3 rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-4 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã kiểm tra ngoại quan</label><label className="flex items-center gap-2 text-xs font-semibold text-[#60758A]"><input type="checkbox" defaultChecked className="accent-[#0F8C8C]" /> Đã hướng dẫn sử dụng</label></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Hủy</button><button onClick={onSave} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Lưu phiếu nháp</button></div></div></div></div>; }

function HandoverDetailModalLegacy({ item, onClose, onPrint, onHistory }: { item: Handover; onClose: () => void; onPrint: () => void; onHistory: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">Biên bản chi tiết và lịch sử người nhận của tài sản.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button onClick={onPrint} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />In biên bản</button><button onClick={() => toast.success("Đã gửi yêu cầu ký xác nhận.")} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi ký xác nhận</button></div></div></div></div>; }

function arrayBufferToBase64(buffer: ArrayBuffer) { let binary = ""; const bytes = new Uint8Array(buffer); for (let index = 0; index < bytes.byteLength; index += 1) binary += String.fromCharCode(bytes[index]); return btoa(binary); }

async function loadImageData(url: string) { const response = await fetch(url); const blob = await response.blob(); return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); }); }

async function downloadHandoverPdf(item: Handover, signature: string | undefined, companyInfo: CompanyInfo) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontBuffer = await fetch(notoSansVietnamese).then((response) => response.arrayBuffer());
  doc.addFileToVFS("NotoSansVietnamese.ttf", arrayBufferToBase64(fontBuffer));
  doc.addFont("NotoSansVietnamese.ttf", "NotoSansVietnamese", "normal");
  doc.setFont("NotoSansVietnamese", "normal");
  const logo = await loadImageData("/manus-storage/assetmaster-logo_f5d79b06.png");
  const left = 18;
  let y = 22;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(18);
  doc.addImage(logo, "PNG", left, y - 12, 18, 18);
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
  doc.setFontSize(15);
  doc.text("BIÊN BẢN BÀN GIAO TÀI SẢN", 105, y + 32, { align: "center" });
  doc.setDrawColor(15, 140, 140);
  doc.line(left, y + 12, 192, y + 12);
  y += 28;
  doc.setTextColor(16, 42, 67);
  doc.setFontSize(14);
  doc.text(`Số phiếu: ${item.id}`, left, y);
  y += 12;
  doc.setFontSize(10);
  const rows = [
    ["Tài sản", `${item.assetName} (${item.assetCode})`],
    ["Người nhận", item.recipient],
    ["Phòng ban", item.department],
    ["Ngày bàn giao", item.date],
    ["Người lập", item.handoverBy],
    ["Tình trạng", item.condition],
    ["Phụ kiện / ghi chú", item.note || "Không có"],
    ["Trạng thái", item.status],
  ];
  rows.forEach(([label, value]) => { doc.setTextColor(112, 134, 154); doc.text(label, left, y); doc.setTextColor(25, 59, 87); doc.text(String(value).slice(0, 100), 70, y); y += 9; });
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
  if (signature) { doc.addImage(signature, "PNG", 118, y + 4, 52, 24); }
  doc.setTextColor(25, 59, 87);
  doc.text(item.handoverBy, left + 12, y + 39);
  doc.text(item.recipient, 119, y + 39);
  doc.setFontSize(8);
  doc.setTextColor(138, 160, 182);
  doc.text(`AssetMaster · Biên bản được tạo ngày ${new Date().toLocaleDateString("vi-VN")}`, left, 282);
  doc.save(`${item.id}-bien-ban-ban-giao.pdf`);
}

function HandoverDetailModal({ item, companyInfo, onClose, onPrint, onHistory }: { item: Handover; companyInfo: CompanyInfo; onClose: () => void; onPrint: () => void; onHistory: () => void }) {
  const [signature, setSignature] = useState("");
  const [signed, setSigned] = useState(false);
  const handleSigned = (dataUrl: string) => { setSignature(dataUrl); setSigned(true); toast.success("Đã ghi nhận chữ ký điện tử trên biên bản."); };
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]"><FileText size={13} />Biên bản bàn giao</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{item.id}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{companyInfo.name} · Biên bản chi tiết, chữ ký và lịch sử người nhận.</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]"><X size={18} /></button></div><div className="p-6"><div className="flex flex-col justify-between gap-4 rounded-xl bg-[#102A43] p-5 text-white sm:flex-row sm:items-center"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A5C3D2]">Tài sản cấp phát</div><div className="mt-1 font-display text-lg font-extrabold">{item.assetName}</div><div className="mt-1 font-mono text-[11px] text-[#71D6CE]">{item.assetCode}</div></div><span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-extrabold text-[#BDF1E8]"><CheckCircle2 size={13} />{item.status}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><UserCheck size={14} />Người nhận</div><div className="text-sm font-extrabold text-[#193B57]">{item.recipient}</div><div className="mt-1 text-xs text-[#71869A]">{item.department}</div></div><div className="rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]"><CalendarDays size={14} />Thông tin bàn giao</div><div className="text-sm font-extrabold text-[#193B57]">{item.date}</div><div className="mt-1 text-xs text-[#71869A]">Người lập: {item.handoverBy}</div></div></div><div className="mt-5 rounded-xl border border-[#E7EEF3] p-4"><div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]">Tình trạng & phụ kiện</div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-[#8AA0B6]">Tình trạng lúc bàn giao</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.condition}</div></div><div><div className="text-xs text-[#8AA0B6]">Phụ kiện / ghi chú</div><div className="mt-1 text-sm font-bold text-[#193B57]">{item.note || "Không có ghi chú"}</div></div></div></div><div className="mt-5 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#087A6A]"><Signature size={14} />Ký tên điện tử</div><div className="mt-1 text-[11px] text-[#6B8F8D]">Người nhận ký trực tiếp trên vùng bên dưới.</div></div>{signed && <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#087A6A]"><CheckCircle2 size={13} />Đã ký</span>}</div><SignaturePad onSigned={handleSigned} /></div><div className="mt-5 rounded-xl border border-dashed border-[#C8D7E1] bg-[#FBFCFD] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><History size={14} />Lịch sử người nhận</div><button onClick={onHistory} className="text-[11px] font-bold text-[#0F8C8C] hover:underline">Xem đầy đủ</button></div><div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-[#0F8C8C] ring-4 ring-[#E6F6F2]" /><div className="flex-1"><div className="text-xs font-bold text-[#193B57]">{item.recipient} nhận tài sản</div><div className="mt-0.5 text-[10px] text-[#8AA0B6]">{item.date} · {item.condition}</div></div><div className="text-[10px] font-bold text-[#087A6A]">Hiện tại</div></div></div><div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A]">Đóng</button><button onClick={() => { void downloadHandoverPdf(item, signature, companyInfo); toast.success("Đã tải biên bản PDF."); }} className="flex items-center gap-2 rounded-lg border border-[#CDE5E5] px-4 py-2 text-xs font-bold text-[#087A6A]"><Printer size={14} />Xuất PDF</button><button onClick={() => { if (!signed) { toast.error("Vui lòng ký tên trước khi gửi xác nhận."); return; } toast.success("Đã gửi biên bản kèm chữ ký để xác nhận."); }} className="flex items-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]"><Signature size={14} />Gửi xác nhận</button></div></div></div></div>;
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

function AssetModal({ mode, asset, formData, setFormData, onClose, onSave, onEdit }: { mode: "create" | "edit" | "detail"; asset: Asset | null; formData: Asset; setFormData: React.Dispatch<React.SetStateAction<Asset>>; onClose: () => void; onSave: () => void; onEdit: () => void }) {
  const isDetail = mode === "detail";
  const update = (key: keyof Asset, value: string) => setFormData((current) => ({ ...current, [key]: value }));
  const title = mode === "create" ? "Thêm tài sản mới" : mode === "edit" ? "Chỉnh sửa tài sản" : "Chi tiết tài sản";
  const fields: Array<{ key: keyof Asset; label: string; placeholder: string }> = [
    { key: "name", label: "Tên tài sản", placeholder: "Ví dụ: MacBook Pro 14-inch M3" },
    { key: "holder", label: "Người / Phòng giữ", placeholder: "Nhập người hoặc phòng ban" },
    { key: "value", label: "Giá trị nguyên giá (VNĐ)", placeholder: "Ví dụ: 42.500.000" },
    { key: "location", label: "Vị trí lưu trữ", placeholder: "Ví dụ: Tầng 5 · Khu A" },
    { key: "serial", label: "Số serial / IMEI", placeholder: "Nhập số serial" },
    { key: "supplier", label: "Nhà cung cấp", placeholder: "Nhập tên nhà cung cấp" },
  ];
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#102A43]/40 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.22)] ${isDetail ? "max-w-[560px]" : "max-w-[720px]"}`}>
      <div className="flex items-start justify-between border-b border-[#E7EEF3] px-6 py-5"><div><div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0F8C8C]">Asset catalog</div><h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[#102A43]">{title}</h2><p className="mt-1 text-xs text-[#8AA0B6]">{isDetail ? "Thông tin định danh và vòng đời của tài sản." : "Cập nhật dữ liệu để hệ thống luôn chính xác."}</p></div><button onClick={onClose} className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8]" aria-label="Đóng"><X size={18} /></button></div>
      {isDetail && asset ? <div className="space-y-5 p-6"><div className="flex items-center gap-4 rounded-xl bg-[#F5F9FB] p-4"><div className="grid h-14 w-14 place-items-center rounded-xl bg-[#E6F6F2] text-[#0F8C8C]"><Laptop size={24} /></div><div className="min-w-0 flex-1"><div className="font-display text-base font-extrabold text-[#193B57]">{asset.name}</div><div className="mt-1 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType]}`}>{asset.status}</span></div><div className="grid gap-4 sm:grid-cols-2">{[["Phân loại", asset.category], ["Người / Phòng giữ", asset.holder || "Chưa cấp phát"], ["Ngày mua", asset.date], ["Giá trị", `${asset.value} ₫`], ["Vị trí", asset.location || "Chưa cập nhật"], ["Serial / IMEI", asset.serial || "Chưa cập nhật"], ["Nhà cung cấp", asset.supplier || "Chưa cập nhật"], ["Ghi chú", asset.note || "Không có ghi chú"]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#E7EEF3] px-3.5 py-3"><div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9BAEC0]">{label}</div><div className="mt-1.5 text-sm font-semibold text-[#193B57]">{value}</div></div>)}</div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Đóng</button><button onClick={onEdit} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white hover:bg-[#087A6A]">Chỉnh sửa tài sản</button></div></div> : <div className="p-6"><div className="mb-5 grid gap-4 sm:grid-cols-2"><div><label className="field-label">Mã tài sản</label><input value={formData.code} disabled className="field-input bg-[#F5F8FB] text-[#8AA0B6]" /></div><div><label className="field-label">Ngày mua</label><input value={formData.date} onChange={(e) => update("date", e.target.value)} className="field-input" /></div>{fields.slice(0, 2).map((field) => <div key={field.key}><label className="field-label">{field.label}<span className="text-[#0F8C8C]"> *</span></label><input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" /></div>)}<div><label className="field-label">Phân loại</label><select value={formData.category} onChange={(e) => update("category", e.target.value)} className="field-input"><option>CNTT</option><option>Văn phòng</option><option>Thiết bị</option></select></div><div><label className="field-label">Trạng thái</label><select value={formData.status} onChange={(e) => { const value = e.target.value; update("status", value); update("statusType", value === "Sẵn có" ? "available" : value === "Bảo trì" ? "maintenance" : "active"); }} className="field-input"><option>Sẵn có</option><option>Đang cấp phát</option><option>Bảo trì</option></select></div>{fields.slice(2).map((field) => <div key={field.key}><label className="field-label">{field.label}</label><input value={String(formData[field.key] || "")} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className="field-input" /></div>)}<div className="sm:col-span-2"><label className="field-label">Ghi chú</label><textarea value={formData.note || ""} onChange={(e) => update("note", e.target.value)} placeholder="Bổ sung thông tin cần lưu ý..." className="field-input min-h-[80px] resize-y" /></div></div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] pt-4"><button onClick={onClose} className="rounded-lg border border-[#DDE7F0] px-4 py-2 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]">Hủy</button><button onClick={onSave} className="rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.2)] hover:bg-[#087A6A]">{mode === "edit" ? "Lưu thay đổi" : "Tạo tài sản"}</button></div></div>}
    </div>
  </div>;
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full appearance-none rounded-lg border border-[#DDE7F0] bg-white px-3 pr-8 text-xs font-semibold text-[#60758A] outline-none transition focus:border-[#0F8C8C]"><>{options.map((option) => <option key={option}>{option}</option>)}</></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-[#9BAEC0]" /></div>;
}
