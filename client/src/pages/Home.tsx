// Corporate Clarity: calm Swiss enterprise information design, navy structure, teal actions, amber exceptions.
// This page owns the AssetMaster dashboard composition and local interaction states.

import { useMemo, useState } from "react";
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

const assets = [
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
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả loại tài sản");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [department, setDepartment] = useState("Tất cả phòng ban");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.code} ${asset.name} ${asset.holder}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "Tất cả loại tài sản" || asset.category === category;
    const matchesStatus = status === "Tất cả trạng thái" || asset.status === status;
    const matchesDepartment = department === "Tất cả phòng ban" || asset.holder.includes(department);
    return matchesQuery && matchesCategory && matchesStatus && matchesDepartment;
  }), [query, category, status, department]);

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
            return <button key={item.label} onClick={() => { setActiveNav(item.label); setMobileNavOpen(false); if (item.label !== "Tổng quan") showComingSoon(item.label); }} className={`group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-150 ${active ? "bg-[#E8F7F5] text-[#087A6A] shadow-[inset_3px_0_0_#0F8C8C]" : "text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.9} /><span className="flex-1">{item.label}</span>{item.count && <span className="rounded-full bg-[#FFF0C9] px-1.5 py-0.5 text-[10px] font-bold text-[#A86B00]">{item.count}</span>}</button>;
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-[#2A4D67] pt-4">
          <button onClick={() => showComingSoon("Trợ giúp")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"><CircleHelp size={17} />Trợ giúp & hướng dẫn</button>
          <button onClick={() => showComingSoon("Cài đặt")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-[#B5C8D5] hover:bg-[#1A405D] hover:text-white"><Settings2 size={17} />Cài đặt hệ thống</button>
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
            <button onClick={() => showComingSoon("Thêm tài sản mới")} className="hidden h-9 items-center gap-2 rounded-lg bg-[#0F8C8C] px-3.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] transition hover:-translate-y-0.5 hover:bg-[#087A6A] sm:flex"><Plus size={16} />Thêm tài sản mới</button>
            <button onClick={() => toast.info("Bạn không có thông báo mới.")} className="relative rounded-lg p-2 text-[#60758A] hover:bg-[#F0F5F8]" aria-label="Thông báo"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F0A516] ring-2 ring-white" /></button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CFE7E4] text-[11px] font-extrabold text-[#087A6A]">MA</div>
          </div>
        </header>

        <div className="relative overflow-hidden px-4 py-7 sm:px-6 lg:px-9 lg:py-8">
          <div className="pointer-events-none absolute right-0 top-0 hidden h-[170px] w-[420px] opacity-60 lg:block"><img src="/manus-storage/assetmaster-dashboard-pattern_109e8935.png" alt="" className="h-full w-full object-cover object-left" /></div>
          <div className="relative mx-auto max-w-[1500px]"><div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#A86B00]"><span className="h-px w-8 bg-[#F0A516]" /><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516]" />System pulse · live inventory signal</div>
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F8C8C]"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A516] shadow-[0_0_0_4px_rgba(240,165,22,0.12)]" />Asset Operations</div><h1 className="font-display text-[28px] font-extrabold tracking-[-0.045em] text-[#102A43] sm:text-[34px]">Tổng quan tài sản</h1><p className="mt-1.5 text-sm text-[#71869A]">Theo dõi, quản lý và tối ưu toàn bộ tài sản doanh nghiệp.</p></div><div className="flex items-center gap-2 text-xs text-[#71869A]"><CalendarDays size={15} /><span>Dữ liệu cập nhật lúc 09:42, 14/02/2025</span><button onClick={() => toast.success("Dữ liệu đã được làm mới.")} className="rounded-md p-1.5 text-[#0F8C8C] hover:bg-[#E8F7F5]" aria-label="Làm mới"><ArrowDownUp size={14} /></button></div></div>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi, index) => { const Icon = kpi.icon; const toneMap: Record<string, string> = { teal: "bg-[#E6F6F2] text-[#0F8C8C]", blue: "bg-[#EAF3FF] text-[#3278BD]", amber: "bg-[#FFF5DC] text-[#D38A00]", navy: "bg-[#EAF0F7] text-[#193B57]" }; return <div key={kpi.label} className="animate-kpi group rounded-xl border border-[#DFE9F0] bg-white p-5 shadow-[0_8px_24px_rgba(16,42,67,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,42,67,0.08)]" style={{ animationDelay: `${index * 45}ms` }}><div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-[11px] ${toneMap[kpi.tone]}`}><Icon size={19} /></div>{kpi.trend && <span className="rounded-md bg-[#E8F7F5] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">↗ +12%</span>}</div><div className="mt-5 text-[12px] font-semibold text-[#7890A5]">{kpi.label}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-[26px] font-extrabold tracking-[-0.04em] text-[#102A43]">{kpi.value}</span>{kpi.label === "Tổng giá trị" && <span className="text-[11px] font-bold text-[#8AA0B6]">VNĐ</span>}</div><div className="mt-2 text-[11px] font-medium text-[#9AAEBD]">{kpi.detail}</div></div>; })}
            </section>

            <section className="mt-8 overflow-hidden rounded-xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
              <div className="flex flex-col gap-4 border-b border-[#E7EEF3] px-5 py-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-display text-[17px] font-extrabold tracking-[-0.025em] text-[#102A43]">Danh mục tài sản</h2><p className="mt-1 text-xs text-[#8AA0B6]">Quản lý và tra cứu tài sản trong doanh nghiệp</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => { setQuery(""); setCategory("Tất cả loại tài sản"); setStatus("Tất cả trạng thái"); setDepartment("Tất cả phòng ban"); }} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><SlidersHorizontal size={14} />Đặt lại</button><button onClick={() => showComingSoon("Bộ lọc nâng cao")} className="flex h-9 items-center gap-2 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC]"><Filter size={14} />Bộ lọc nâng cao</button></div></div>
              <div className="grid gap-3 border-b border-[#E7EEF3] bg-[#FBFCFD] px-5 py-4 sm:grid-cols-2 xl:grid-cols-4"><div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 text-[#9BAEC0]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm tài sản..." className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#0F8C8C]" /></div><FilterSelect value={category} onChange={setCategory} options={["Tất cả loại tài sản", "CNTT", "Văn phòng", "Thiết bị"]} /><FilterSelect value={status} onChange={setStatus} options={["Tất cả trạng thái", "Sẵn có", "Đang cấp phát", "Bảo trì"]} /><FilterSelect value={department} onChange={setDepartment} options={["Tất cả phòng ban", "Phòng Thiết kế", "Phòng Hành chính"]} /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-left"><thead><tr className="border-b border-[#E7EEF3] bg-[#FCFDFE] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8AA0B6]"><th className="px-5 py-3.5">Mã TS</th><th className="px-4 py-3.5">Tên tài sản</th><th className="px-4 py-3.5">Phân loại</th><th className="px-4 py-3.5">Người / Phòng giữ</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Ngày mua</th><th className="px-4 py-3.5 text-right">Giá trị</th><th className="px-5 py-3.5 text-right">Hành động</th></tr></thead><tbody>{filteredAssets.map((asset) => <tr key={asset.code} className="group border-b border-[#EDF2F5] transition hover:bg-[#F8FBFC]"><td className="px-5 py-4 font-mono text-[11px] font-bold text-[#0F8C8C]">{asset.code}</td><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F0F5F8] text-[#527089]"><Laptop size={15} /></div><div><div className="text-xs font-bold text-[#193B57]">{asset.name}</div><div className="mt-0.5 text-[10px] text-[#9BAEC0]">Tài sản cố định</div></div></div></td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.category}</td><td className="px-4 py-4 text-xs font-semibold text-[#60758A]">{asset.holder}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusStyles[asset.statusType as keyof typeof statusStyles]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{asset.status}</span></td><td className="px-4 py-4 text-xs font-medium text-[#71869A]">{asset.date}</td><td className="px-4 py-4 text-right text-xs font-extrabold tabular-nums text-[#193B57]">{asset.value} <span className="text-[10px] font-semibold text-[#9BAEC0]">₫</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100"><button onClick={() => showComingSoon("Chỉnh sửa tài sản")} className="rounded-md p-2 text-[#60758A] hover:bg-[#EAF3FF] hover:text-[#2666A8]" aria-label="Chỉnh sửa"><Settings2 size={15} /></button><button onClick={() => showComingSoon("Mã QR tài sản")} className="rounded-md p-2 text-[#60758A] hover:bg-[#E8F7F5] hover:text-[#087A6A]" aria-label="Mã QR"><QrCode size={15} /></button><button onClick={() => showComingSoon("Bàn giao tài sản")} className="rounded-md p-2 text-[#60758A] hover:bg-[#FFF5DC] hover:text-[#A86B00]" aria-label="Bàn giao"><PackageCheck size={15} /></button></div></td></tr>)}</tbody></table>{filteredAssets.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F0F5F8] text-[#8AA0B6]"><Search size={19} /></div><div className="mt-3 text-sm font-bold text-[#193B57]">Không tìm thấy tài sản</div><p className="mt-1 text-xs text-[#8AA0B6]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}</div>
              <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row"><div className="text-xs text-[#8AA0B6]">Hiển thị <span className="font-bold text-[#60758A]">{filteredAssets.length ? "1–6" : "0"}</span> trên <span className="font-bold text-[#60758A]">1,240</span> tài sản</div><div className="flex items-center gap-1"><button className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#B1C0CC]" disabled>‹</button><button className="grid h-8 w-8 place-items-center rounded-md bg-[#102A43] text-xs font-bold text-white">1</button><button onClick={() => showComingSoon("Trang tiếp theo")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">2</button><button onClick={() => showComingSoon("Trang tiếp theo")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">3</button><span className="px-1 text-[#9BAEC0]">...</span><button onClick={() => showComingSoon("Trang cuối")} className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-xs font-semibold text-[#60758A] hover:bg-[#F5F8FB]">›</button></div></div>
            </section>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-[#CDE5E5] bg-[#ECF8F7] px-4 py-3.5"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#0F8C8C] shadow-sm"><Sparkles size={15} /></div><div><div className="text-xs font-bold text-[#087A6A]">Kiểm kê định kỳ đang đến hạn</div><div className="mt-0.5 text-[11px] text-[#4B8884]">45 tài sản cần được xác nhận trước ngày 28/02/2025.</div></div></div><button onClick={() => showComingSoon("Kiểm kê định kỳ")} className="hidden text-xs font-extrabold text-[#087A6A] underline decoration-[#8BCDC6] underline-offset-4 sm:block">Xem danh sách <span className="no-underline">→</span></button></div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full appearance-none rounded-lg border border-[#DDE7F0] bg-white px-3 pr-8 text-xs font-semibold text-[#60758A] outline-none transition focus:border-[#0F8C8C]"><>{options.map((option) => <option key={option}>{option}</option>)}</></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-[#9BAEC0]" /></div>;
}
