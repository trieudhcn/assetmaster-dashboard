import { useEffect, useMemo, useState } from "react";
import { PackageCheck, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EmployeeDirectoryProfileSection({ employee, onSave, isSaving }: any) {
  const [employeeCode, setEmployeeCode] = useState(employee.employeeCode || "");
  const [jobTitle, setJobTitle] = useState(employee.jobTitle || "");

  useEffect(() => {
    setEmployeeCode(employee.employeeCode || "");
    setJobTitle(employee.jobTitle || "");
  }, [employee.id, employee.employeeCode, employee.jobTitle]);

  const unchanged = employeeCode.trim().toUpperCase() === (employee.employeeCode || "") && jobTitle.trim() === (employee.jobTitle || "");
  return <section className="mt-4 rounded-xl border border-[#CFE1F8] bg-[#F4F8FE] p-4">
    <div><h3 className="font-bold text-[#193B57]">Hồ sơ Active Directory</h3><p className="mt-1 text-xs text-[#60758A]">Lưu Mã nhân viên duy nhất và Chức vụ để sẵn sàng đối chiếu dữ liệu đồng bộ.</p></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">Mã nhân viên<input value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value.toUpperCase())} maxLength={64} className="field-input mt-1 h-9 font-mono text-xs" placeholder="VD: NV-0001" /></label><label className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">Chức vụ<input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={160} className="field-input mt-1 h-9 text-xs" placeholder="VD: Chuyên viên CNTT" /></label></div>
    <div className="mt-3 flex justify-end"><button type="button" onClick={() => onSave({ employeeCode: employeeCode.trim() || null, jobTitle: jobTitle.trim() || null })} disabled={isSaving || unchanged} className="rounded-md bg-[#2666A8] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#1F568F] disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div>
  </section>;
}

export function EmployeeAssetHistorySection({ history, isLoading }: any) {
  const [assetId, setAssetId] = useState<number | null>(null);
  const assets = useMemo(() => Array.from(new Map(history.map((item: any) => [item.assetId, item])).values()), [history]);
  return <><section className="mt-4 rounded-xl border border-[#CFE1F8] bg-[#F6FAFE] p-4"><div className="flex items-center gap-2"><PackageCheck size={16} className="text-[#2666A8]" /><div><h3 className="text-xs font-bold text-[#193B57]">Tài sản trong hồ sơ</h3><p className="mt-1 text-[11px] text-[#71869A]">Mỗi Tài sản một dòng; nhấn để mở nhanh thông tin.</p></div></div>{isLoading ? <p className="mt-3 text-xs text-[#8AA0B6]">Đang tải Tài sản đã bàn giao...</p> : assets.length ? <ol className={`mt-3 gap-2 ${assets.length > 10 ? "grid sm:grid-cols-2" : "space-y-2"}`}>{assets.map((asset: any, index: number) => <li key={asset.assetId} className="min-w-0"><button type="button" onClick={() => setAssetId(asset.assetId)} className="flex w-full items-start gap-2 rounded-lg border border-[#D8E7F4] bg-white px-3 py-2 text-left transition hover:border-[#8EBBE5] hover:bg-[#F2F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2666A8]" aria-label={`Mở nhanh thông tin Tài sản ${asset.assetCode}: ${asset.assetName}`}><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EAF3FF] text-[10px] font-extrabold text-[#2666A8]">{index + 1}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#193B57]">{asset.assetName}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-[#2666A8]">{asset.assetCode}</span><span className="mt-0.5 block text-[10px] text-[#71869A]">{asset.status === "returned" ? "Đã thu hồi" : "Đang bàn giao"} · {asset.referenceCode}</span></span></button></li>)}</ol> : <p className="mt-3 rounded-lg border border-dashed border-[#CFE1F8] bg-white px-3 py-5 text-center text-xs text-[#71869A]">Nhân sự chưa có Tài sản trong lịch sử bàn giao.</p>}</section><EmployeeAssetQuickDetailDialog assetId={assetId} onClose={() => setAssetId(null)} /></>;
}

function EmployeeAssetQuickDetailDialog({ assetId, onClose }: { assetId: number | null; onClose: () => void }) {
  const query = trpc.assets.get.useQuery({ assetId: assetId || 0 }, { enabled: assetId !== null });
  if (assetId === null) return null;
  const asset = query.data;
  const statusLabel: Record<string, string> = { available: "Sẵn có", assigned: "Đang cấp phát", maintenance: "Bảo hành/Sửa chữa", retired: "Khấu hao/Thanh lý", lost: "Thất lạc", returned_to_vendor: "Đã trả nhà cung cấp" };
  const details = asset ? [["Trạng thái", statusLabel[asset.status] || asset.status], ["Tình trạng", asset.condition || "—"], ["Serial/IMEI", asset.serialNumber || "—"], ["Vị trí", asset.location || "—"], ["Ngày mua", asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "—"], ["Hạn bảo hành", asset.warrantyUntil ? new Date(asset.warrantyUntil).toLocaleDateString("vi-VN") : "—"]] : [];
  return <><button type="button" onClick={onClose} className="fixed inset-0 z-[60] bg-[#102A43]/35" aria-label="Đóng xem nhanh Tài sản" /><section role="dialog" aria-modal="true" aria-label="Xem nhanh Tài sản" className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-2xl"><button type="button" onClick={onClose} className="drawer-close-action float-right" aria-label="Đóng"><X size={16} /></button>{query.isLoading ? <p className="p-4 text-sm text-[#71869A]">Đang tải thông tin Tài sản...</p> : query.isError || !asset ? <div className="p-4"><p className="text-sm text-[#B44545]">Không thể tải thông tin Tài sản.</p><button type="button" onClick={() => { void query.refetch(); }} className="mt-3 rounded-md border border-[#DDE7F0] px-3 py-2 text-xs font-bold text-[#2666A8]">Thử lại</button></div> : <div className="pr-10"><div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#2666A8]">Xem nhanh Tài sản</div><h3 className="mt-2 text-lg font-extrabold text-[#102A43]">{asset.name}</h3><p className="mt-1 font-mono text-xs font-bold text-[#2666A8]">{asset.assetCode}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{details.map(([label, value]) => <div key={label} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] px-3 py-2"><div className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#8AA0B6]">{label}</div><div className="mt-1 text-xs font-bold text-[#193B57]">{value}</div></div>)}</div></div>}<div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="filter-action">Đóng</button></div></section></>;
}
