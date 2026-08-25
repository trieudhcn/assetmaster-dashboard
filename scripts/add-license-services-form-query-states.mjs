import { readFileSync, writeFileSync } from "node:fs";

const path = "/home/ubuntu/assetmaster-dashboard/client/src/pages/LicensesServicesManagementView.tsx";
let source = readFileSync(path, "utf8");

source = source.replace(
  '  const assignmentLicense = assignmentLicenseId ? licenses.find((item) => item.id === assignmentLicenseId) : null;\n',
  '  const assignmentLicense = assignmentLicenseId ? licenses.find((item) => item.id === assignmentLicenseId) : null;\n  const vendorUnavailable = vendorsQuery.isLoading || vendorsQuery.isError;\n  const branchUnavailable = branchesQuery.isLoading || branchesQuery.isError;\n  const assignmentDirectoryUnavailable = assetsQuery.isLoading || assetsQuery.isError || usersQuery.isLoading || usersQuery.isError;\n'
);

source = source.replace(
  '<DialogHeader><DialogTitle>{licenseModal === "create" ? "Thêm bản quyền phần mềm" : "Cập nhật bản quyền phần mềm"}</DialogTitle><DialogDescription>Quản lý số lượng, khóa kích hoạt và thời hạn gia hạn. Khóa bản quyền chỉ hiển thị cho quản trị viên.</DialogDescription></DialogHeader><form onSubmit={saveLicense}',
  '<DialogHeader><DialogTitle>{licenseModal === "create" ? "Thêm bản quyền phần mềm" : "Cập nhật bản quyền phần mềm"}</DialogTitle><DialogDescription>Quản lý số lượng, khóa kích hoạt và thời hạn gia hạn. Khóa bản quyền chỉ hiển thị cho quản trị viên.</DialogDescription></DialogHeader><DirectoryState isLoading={vendorsQuery.isLoading} isError={vendorsQuery.isError} label="danh sách Nhà cung cấp" onRetry={() => void vendorsQuery.refetch()} /><form onSubmit={saveLicense}'
);
source = source.replace(
  '<DialogHeader><DialogTitle>{serviceModal === "create" ? "Thêm dịch vụ công nghệ" : "Cập nhật dịch vụ công nghệ"}</DialogTitle><DialogDescription>Quản lý đường truyền Internet, Tên miền và chứng thư SSL theo nhà cung cấp, chi nhánh và thời hạn.</DialogDescription></DialogHeader><form onSubmit={saveService}',
  '<DialogHeader><DialogTitle>{serviceModal === "create" ? "Thêm dịch vụ công nghệ" : "Cập nhật dịch vụ công nghệ"}</DialogTitle><DialogDescription>Quản lý đường truyền Internet, Tên miền và chứng thư SSL theo nhà cung cấp, chi nhánh và thời hạn.</DialogDescription></DialogHeader><DirectoryState isLoading={vendorsQuery.isLoading || branchesQuery.isLoading} isError={vendorsQuery.isError || branchesQuery.isError} label="Nhà cung cấp hoặc Chi nhánh" onRetry={() => { void vendorsQuery.refetch(); void branchesQuery.refetch(); }} /><form onSubmit={saveService}'
);
source = source.replace(
  '<DialogHeader><DialogTitle>Cấp phát bản quyền</DialogTitle><DialogDescription>{assignmentLicense ? `${assignmentLicense.productName} · còn ${Math.max(0, assignmentLicense.purchasedQuantity - activeAssignments.filter((item) => item.softwareLicenseId === assignmentLicense.id).length)} license khả dụng` : ""}</DialogDescription></DialogHeader><form onSubmit={saveAssignment}',
  '<DialogHeader><DialogTitle>Cấp phát bản quyền</DialogTitle><DialogDescription>{assignmentLicense ? `${assignmentLicense.productName} · còn ${Math.max(0, assignmentLicense.purchasedQuantity - activeAssignments.filter((item) => item.softwareLicenseId === assignmentLicense.id).length)} license khả dụng` : ""}</DialogDescription></DialogHeader><DirectoryState isLoading={assetsQuery.isLoading || usersQuery.isLoading} isError={assetsQuery.isError || usersQuery.isError} label="Tài sản hoặc Nhân sự" onRetry={() => { void assetsQuery.refetch(); void usersQuery.refetch(); }} /><form onSubmit={saveAssignment}'
);

source = source.replace('<select value={licenseForm.vendorId}', '<select disabled={vendorUnavailable} value={licenseForm.vendorId}');
source = source.replace('<select value={serviceForm.vendorId}', '<select disabled={vendorUnavailable} value={serviceForm.vendorId}');
source = source.replace('<select value={serviceForm.branchId}', '<select disabled={branchUnavailable} value={serviceForm.branchId}');
source = source.replace('<select value={assignmentForm.assetId}', '<select disabled={assignmentDirectoryUnavailable} value={assignmentForm.assetId}');
source = source.replace('<select value={assignmentForm.userId}', '<select disabled={assignmentDirectoryUnavailable} value={assignmentForm.userId}');
source = source.replace(
  'function ListErrorState({ onRetry }: { onRetry: () => void }) { return <div data-license-services-error className="px-5 py-12 text-center"><div className="text-sm font-extrabold text-[#193B57]">Không thể tải dữ liệu quản lý</div><p className="mt-1 text-xs text-[#71869A]">Vui lòng kiểm tra kết nối và thử lại.</p><button onClick={onRetry} className="mt-3 rounded-lg border border-[#CDE5E5] px-3 py-2 text-xs font-extrabold text-[#087A6A] hover:bg-[#E6F6F2]">Thử lại</button></div>; }',
  'function ListErrorState({ onRetry }: { onRetry: () => void }) { return <div data-license-services-error className="px-5 py-12 text-center"><div className="text-sm font-extrabold text-[#193B57]">Không thể tải dữ liệu quản lý</div><p className="mt-1 text-xs text-[#71869A]">Vui lòng kiểm tra kết nối và thử lại.</p><button onClick={onRetry} className="mt-3 rounded-lg border border-[#CDE5E5] px-3 py-2 text-xs font-extrabold text-[#087A6A] hover:bg-[#E6F6F2]">Thử lại</button></div>; }\nfunction DirectoryState({ isLoading, isError, label, onRetry }: { isLoading: boolean; isError: boolean; label: string; onRetry: () => void }) { if (!isLoading && !isError) return null; return <div data-license-services-directory-state className={`mt-2 rounded-lg px-3 py-2 text-xs ${isError ? "border border-[#F6D2D2] bg-[#FEF5F5] text-[#B44545]" : "bg-[#F4F7F9] text-[#527089]"}`}>{isError ? <span>Không thể tải {label}. <button type="button" onClick={onRetry} className="font-extrabold underline">Thử lại</button></span> : <span>Đang tải {label}…</span>}</div>; }'
);

writeFileSync(path, source);
