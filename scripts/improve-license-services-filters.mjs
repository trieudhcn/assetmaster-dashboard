import { readFileSync, writeFileSync } from "node:fs";

const path = "/home/ubuntu/assetmaster-dashboard/client/src/pages/LicensesServicesManagementView.tsx";
let source = readFileSync(path, "utf8");

source = source.replace(
  '  const [query, setQuery] = useState("");\n',
  '  const [query, setQuery] = useState("");\n  const [licenseStatusFilter, setLicenseStatusFilter] = useState("all");\n  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");\n  const [vendorFilter, setVendorFilter] = useState("all");\n  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");\n  const [branchFilter, setBranchFilter] = useState("all");\n'
);

source = source.replace(
  `  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const filteredLicenses = useMemo(() => licenses.filter((item) => [item.licenseCode, item.productName, item.publisher, item.edition].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery)), [licenses, normalizedQuery]);
  const filteredServices = useMemo(() => services.filter((item) => [item.serviceCode, item.name, item.domainName, item.serviceEndpoint].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery)), [services, normalizedQuery]);
  const activeAssignments = assignments.filter((item) => item.status === "active");
  const nearDueLicenses = licenses.filter((item) => { const days = daysUntil(item.expiresAt); return days !== null && days <= 30; });
  const nearDueServices = services.filter((item) => { const days = daysUntil(item.expiresAt); return days !== null && days <= 30; });`,
  `  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const getEffectiveStatus = (item: { status: string; expiresAt: Date | string | null }) => { const days = daysUntil(item.expiresAt); return days !== null && days < 0 ? "expired" : days !== null && days <= 30 ? "expiring" : item.status; };
  const filteredLicenses = useMemo(() => licenses.filter((item) => {
    const matchesSearch = [item.licenseCode, item.productName, item.publisher, item.edition].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery);
    return matchesSearch && (licenseStatusFilter === "all" || getEffectiveStatus(item) === licenseStatusFilter) && (vendorFilter === "all" || String(item.vendorId ?? "") === vendorFilter);
  }), [licenses, normalizedQuery, licenseStatusFilter, vendorFilter]);
  const filteredServices = useMemo(() => services.filter((item) => {
    const matchesSearch = [item.serviceCode, item.name, item.domainName, item.serviceEndpoint].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery);
    return matchesSearch && (serviceStatusFilter === "all" || getEffectiveStatus(item) === serviceStatusFilter) && (vendorFilter === "all" || String(item.vendorId ?? "") === vendorFilter) && (serviceTypeFilter === "all" || item.serviceType === serviceTypeFilter) && (branchFilter === "all" || String(item.branchId ?? "") === branchFilter);
  }), [services, normalizedQuery, serviceStatusFilter, vendorFilter, serviceTypeFilter, branchFilter]);
  const activeAssignments = assignments.filter((item) => item.status === "active");
  const nearDueLicenses = licenses.filter((item) => { const days = daysUntil(item.expiresAt); return days !== null && days <= 30; });
  const nearDueServices = services.filter((item) => { const days = daysUntil(item.expiresAt); return days !== null && days <= 30; });
  const hasActiveFilters = Boolean(query || licenseStatusFilter !== "all" || serviceStatusFilter !== "all" || vendorFilter !== "all" || serviceTypeFilter !== "all" || branchFilter !== "all");
  const resetFilters = () => { setQuery(""); setLicenseStatusFilter("all"); setServiceStatusFilter("all"); setVendorFilter("all"); setServiceTypeFilter("all"); setBranchFilter("all"); };`
);

source = source.replace(
  `</label></div>
      {tab === "licenses" ?`,
  `</label></div><div data-license-services-filter-controls className="flex flex-wrap items-center gap-2 border-t border-[#E7EEF3] px-4 py-3"><select aria-label="Lọc trạng thái" value={tab === "licenses" ? licenseStatusFilter : serviceStatusFilter} onChange={(event) => tab === "licenses" ? setLicenseStatusFilter(event.target.value) : setServiceStatusFilter(event.target.value)} className="h-8 rounded-lg border border-[#D7E3EB] bg-white px-2 text-[11px] font-bold text-[#527089]"><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="expiring">Sắp hết hạn</option><option value="expired">Đã hết hạn</option><option value="suspended">Tạm ngưng</option></select><select aria-label="Lọc nhà cung cấp" value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className="h-8 max-w-[190px] rounded-lg border border-[#D7E3EB] bg-white px-2 text-[11px] font-bold text-[#527089]"><option value="all">Mọi nhà cung cấp</option>{(vendorsQuery.data || []).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select>{tab === "services" && <><select aria-label="Lọc loại dịch vụ" value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)} className="h-8 rounded-lg border border-[#D7E3EB] bg-white px-2 text-[11px] font-bold text-[#527089]"><option value="all">Mọi loại dịch vụ</option><option value="internet">Internet</option><option value="domain">Tên miền</option><option value="ssl">SSL</option></select><select aria-label="Lọc chi nhánh" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="h-8 max-w-[180px] rounded-lg border border-[#D7E3EB] bg-white px-2 text-[11px] font-bold text-[#527089]"><option value="all">Mọi chi nhánh</option>{(branchesQuery.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></>}{hasActiveFilters && <button type="button" onClick={resetFilters} className="h-8 rounded-lg px-2 text-[11px] font-extrabold text-[#B44545] hover:bg-[#FDEDEE]">Xóa bộ lọc</button>}</div>
      {tab === "licenses" ?`
);

source = source.replace(
  'licensesQuery.isLoading ? <LoadingRows /> : filteredLicenses.length',
  'licensesQuery.isLoading ? <LoadingRows /> : licensesQuery.isError ? <ListErrorState onRetry={() => void licensesQuery.refetch()} /> : filteredLicenses.length'
);
source = source.replace(
  'servicesQuery.isLoading ? <LoadingRows /> : filteredServices.length',
  'servicesQuery.isLoading ? <LoadingRows /> : servicesQuery.isError ? <ListErrorState onRetry={() => void servicesQuery.refetch()} /> : filteredServices.length'
);
source = source.replace(
  'function LoadingRows() { return <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-[#F4F7F9]" />)}</div>; }',
  'function LoadingRows() { return <div data-license-services-loading className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-lg bg-[#F4F7F9]" />)}</div>; }\nfunction ListErrorState({ onRetry }: { onRetry: () => void }) { return <div data-license-services-error className="px-5 py-12 text-center"><div className="text-sm font-extrabold text-[#193B57]">Không thể tải dữ liệu quản lý</div><p className="mt-1 text-xs text-[#71869A]">Vui lòng kiểm tra kết nối và thử lại.</p><button onClick={onRetry} className="mt-3 rounded-lg border border-[#CDE5E5] px-3 py-2 text-xs font-extrabold text-[#087A6A] hover:bg-[#E6F6F2]">Thử lại</button></div>; }'
);

writeFileSync(path, source);
