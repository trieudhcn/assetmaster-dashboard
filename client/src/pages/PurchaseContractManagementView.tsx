import { useEffect, useMemo, useRef, useState } from "react";
import { FileCheck2, FileText, Link2, Loader2, Paperclip, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SearchableSelect } from "@/components/SearchableSelect";
import { usePersistedState } from "@/hooks/usePersistedState";
import { CurrencyInput } from "@/components/CurrencyInput";
import { DatePickerField } from "@/components/DatePickerField";

type ContractStatus = "draft" | "active" | "expired" | "cancelled";
type ContractForm = { referenceCode: string; title: string; vendorId: string; signedAt: string; effectiveFrom: string; effectiveTo: string; totalValue: string; status: ContractStatus; note: string };
const acceptedContractDocumentTypes = ["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] as const;

const emptyForm: ContractForm = { referenceCode: "", title: "", vendorId: "", signedAt: "", effectiveFrom: "", effectiveTo: "", totalValue: "", status: "draft", note: "" };
const statusMeta: Record<ContractStatus, { label: string; tone: string }> = {
  draft: { label: "Nháp", tone: "bg-[#EAF3FF] text-[#2666A8]" },
  active: { label: "Hiệu lực", tone: "bg-[#E6F6F2] text-[#087A6A]" },
  expired: { label: "Hết hiệu lực", tone: "bg-[#FFF5DC] text-[#A86B00]" },
  cancelled: { label: "Đã hủy", tone: "bg-[#FDEDEE] text-[#B44545]" },
};

function toDateInput(value: Date | string | number | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function toTimestamp(value: string) { return value ? new Date(`${value}T00:00:00`).getTime() : null; }
function money(value: string | number | null | undefined) { return value === null || value === undefined || value === "" ? "—" : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VNĐ`; }
function dateLabel(value: Date | string | number | null | undefined) { return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "—"; }
function readFileAsDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Không thể đọc tệp.")); reader.onerror = () => reject(new Error("Không thể đọc tệp.")); reader.readAsDataURL(file); }); }

export function PurchaseContractManagementView({ sharedQuery = "" }: { sharedQuery?: string }) {
  const utils = trpc.useUtils();
  const contractsQuery = trpc.purchaseContracts.list.useQuery();
  const vendorsQuery = trpc.vendors.listAll.useQuery();
  const [query, setQuery] = useState(sharedQuery);
  useEffect(() => { setQuery(sharedQuery); }, [sharedQuery]);
  const [statusFilter, setStatusFilter] = usePersistedState<"all" | ContractStatus>("assetmaster.filters.purchaseContracts.status", "all");
  const [vendorFilter, setVendorFilter] = usePersistedState("assetmaster.filters.purchaseContracts.vendor", "all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContractForm>(emptyForm);
  const [documentType, setDocumentType] = useState<"signed_contract" | "appendix" | "quotation" | "other">("signed_contract");
  const [paperContractFile, setPaperContractFile] = useState<File | null>(null);
  const [isSavingPaperContract, setIsSavingPaperContract] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paperContractInputRef = useRef<HTMLInputElement>(null);
  const routeIntentHandled = useRef(false);
  const formSnapshotRef = useRef("");
  const detailsQuery = trpc.purchaseContracts.get.useQuery({ id: selectedId || 0 }, { enabled: selectedId !== null });

  const vendorsById = useMemo(() => new Map((vendorsQuery.data || []).map((vendor) => [vendor.id, vendor])), [vendorsQuery.data]);
  const vendorOptions = useMemo(() => [{ value: "", label: "Chưa gán nhà cung cấp" }, ...(vendorsQuery.data || []).map((vendor) => ({ value: String(vendor.id), label: vendor.name, isActive: vendor.isActive }))], [vendorsQuery.data]);
  const vendorFilterOptions = useMemo(() => [{ value: "all", label: "Tất cả Nhà cung cấp" }, ...(vendorsQuery.data || []).map((vendor) => ({ value: String(vendor.id), label: vendor.name, isActive: vendor.isActive }))], [vendorsQuery.data]);
  const statusOptions = [{ value: "all", label: "Tất cả trạng thái" }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))];
  const contracts = contractsQuery.data || [];
  const filtered = useMemo(() => contracts.filter((contract) => {
    const vendor = contract.vendorId ? vendorsById.get(contract.vendorId)?.name || "" : "";
    const matchesQuery = `${contract.referenceCode} ${contract.title} ${vendor}`.toLocaleLowerCase("vi-VN").includes(query.trim().toLocaleLowerCase("vi-VN"));
    const matchesVendor = vendorFilter === "all" || String(contract.vendorId || "") === vendorFilter;
    return matchesQuery && matchesVendor && (statusFilter === "all" || contract.status === statusFilter);
  }), [contracts, query, statusFilter, vendorFilter, vendorsById]);
  const hasActiveFilters = Boolean(query.trim()) || statusFilter !== "all" || vendorFilter !== "all";

  const clearContractRouteIntent = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("vendorId");
    url.searchParams.delete("create");
    url.searchParams.delete("contractId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    if (routeIntentHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const contractId = Number(params.get("contractId") || 0);
    if (Number.isInteger(contractId) && contractId > 0) {
      routeIntentHandled.current = true;
      clearContractRouteIntent();
      setSelectedId(contractId);
      return;
    }
    const vendorId = Number(params.get("vendorId") || 0);
    if (params.get("create") !== "1" || !Number.isInteger(vendorId) || vendorId <= 0 || vendorsQuery.isLoading) return;
    routeIntentHandled.current = true;
    clearContractRouteIntent();
    if (!(vendorsQuery.data || []).some((vendor) => vendor.id === vendorId)) {
      toast.error("Không tìm thấy Nhà cung cấp để tạo Hợp đồng.");
      return;
    }
    setEditingId(null);
    const nextForm = { ...emptyForm, vendorId: String(vendorId) };
    setForm(nextForm);
    formSnapshotRef.current = JSON.stringify({ form: nextForm, paperContractFileName: null });
    setFormOpen(true);
  }, [vendorsQuery.data, vendorsQuery.isLoading]);

  const invalidateContracts = () => { void utils.purchaseContracts.list.invalidate(); if (selectedId) void utils.purchaseContracts.get.invalidate({ id: selectedId }); };
  const createContract = trpc.purchaseContracts.create.useMutation({ onError: (error) => toast.error(error.message || "Không thể tạo Hợp đồng.") });
  const updateContract = trpc.purchaseContracts.update.useMutation({ onSuccess: () => { toast.success("Đã cập nhật Hợp đồng mua bán."); setFormOpen(false); invalidateContracts(); }, onError: (error) => toast.error(error.message || "Không thể cập nhật Hợp đồng.") });
  const removeContract = trpc.purchaseContracts.remove.useMutation({ onSuccess: () => { toast.success("Đã xóa Hợp đồng mua bán."); setSelectedId(null); invalidateContracts(); }, onError: (error) => toast.error(error.message || "Không thể xóa Hợp đồng.") });
  const uploadDocument = trpc.purchaseContracts.uploadDocument.useMutation({ onSuccess: () => { toast.success("Đã lưu chứng từ hợp đồng."); invalidateContracts(); }, onError: (error) => toast.error(error.message || "Không thể tải chứng từ hợp đồng.") });
  const removeDocument = trpc.purchaseContracts.removeDocument.useMutation({ onSuccess: () => { toast.success("Đã gỡ chứng từ khỏi hồ sơ hợp đồng."); invalidateContracts(); }, onError: (error) => toast.error(error.message || "Không thể gỡ chứng từ.") });

  const openCreate = () => { setEditingId(null); setPaperContractFile(null); setForm(emptyForm); formSnapshotRef.current = JSON.stringify({ form: emptyForm, paperContractFileName: null }); setFormOpen(true); };
  const openEdit = () => {
    const contract = detailsQuery.data?.contract;
    if (!contract) return;
    setEditingId(contract.id);
    setPaperContractFile(null);
    const nextForm = { referenceCode: contract.referenceCode, title: contract.title, vendorId: contract.vendorId ? String(contract.vendorId) : "", signedAt: toDateInput(contract.signedAt), effectiveFrom: toDateInput(contract.effectiveFrom), effectiveTo: toDateInput(contract.effectiveTo), totalValue: "", status: contract.status, note: contract.note || "" };
    setForm(nextForm);
    formSnapshotRef.current = JSON.stringify({ form: nextForm, paperContractFileName: null });
    setFormOpen(true);
  };
  const save = async () => {
    if (!form.referenceCode.trim() || !form.title.trim()) { toast.error("Vui lòng nhập số và tên hợp đồng."); return; }
    if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) { toast.error("Ngày kết thúc hiệu lực phải sau ngày bắt đầu."); return; }
    const payload = { referenceCode: form.referenceCode.trim(), title: form.title.trim(), vendorId: form.vendorId ? Number(form.vendorId) : null, signedAt: toTimestamp(form.signedAt), effectiveFrom: toTimestamp(form.effectiveFrom), effectiveTo: toTimestamp(form.effectiveTo), status: form.status, note: form.note.trim() || null };
    if (editingId) { updateContract.mutate({ id: editingId, ...payload }); return; }
    let created: { id: number };
    try { created = await createContract.mutateAsync(payload); } catch { return; }
    if (paperContractFile) {
      setIsSavingPaperContract(true);
      try {
        const dataUrl = await readFileAsDataUrl(paperContractFile);
        await uploadDocument.mutateAsync({ purchaseContractId: created.id, documentType: "signed_contract", fileName: paperContractFile.name, contentType: paperContractFile.type as typeof acceptedContractDocumentTypes[number], dataUrl });
        toast.success("Đã tạo Hợp đồng và lưu bản giấy đã ký.");
      } catch {
        toast.error("Đã tạo Hợp đồng nhưng chưa thể lưu bản giấy. Vui lòng tải lại trong hồ sơ hợp đồng.");
      } finally { setIsSavingPaperContract(false); }
    } else toast.success("Đã tạo Hợp đồng mua bán.");
    setPaperContractFile(null);
    setFormOpen(false);
    setSelectedId(created.id);
    invalidateContracts();
  };
  const handleDocument = async (file: File) => {
    if (!selectedId) return;
    if (!acceptedContractDocumentTypes.includes(file.type as typeof acceptedContractDocumentTypes[number])) { toast.error("Chỉ hỗ trợ PDF, PNG, JPG, DOCX và XLSX."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Chứng từ hợp đồng tối đa 5 MB."); return; }
    const dataUrl = await readFileAsDataUrl(file);
    uploadDocument.mutate({ purchaseContractId: selectedId, documentType, fileName: file.name, contentType: file.type as typeof acceptedContractDocumentTypes[number], dataUrl });
  };
  const detail = detailsQuery.data;
  const selectedContract = detail?.contract;
  const selectedStatus = selectedContract ? statusMeta[selectedContract.status as ContractStatus] : statusMeta.draft;
  const isSaving = createContract.isPending || updateContract.isPending || uploadDocument.isPending || isSavingPaperContract;
  const requestCloseForm = () => {
    if (isSaving) return;
    const current = JSON.stringify({ form, paperContractFileName: paperContractFile?.name || null });
    if (current !== formSnapshotRef.current) {
      toast.warning("Đóng form chưa lưu?", { description: "Các thay đổi Hợp đồng hiện tại sẽ bị hủy.", action: { label: "Bỏ thay đổi", onClick: () => setFormOpen(false) } });
      return;
    }
    setFormOpen(false);
  };
  const totalLinkedAssets = detail?.linkedAssets.length || 0;
  const totalLinkedSupplies = detail?.linkedSupplies.length || 0;
  const selectPaperContractFile = (file?: File) => {
    if (!file) return;
    if (!acceptedContractDocumentTypes.includes(file.type as typeof acceptedContractDocumentTypes[number])) { toast.error("Bản Hợp đồng giấy chỉ hỗ trợ PDF, PNG, JPG, DOCX hoặc XLSX."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Bản Hợp đồng giấy tối đa 5 MB."); return; }
    setPaperContractFile(file);
  };

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#0F8C8C]"><FileCheck2 size={14} />Mua sắm & chứng từ</div><h1 className="mt-1 font-display text-3xl font-extrabold text-[#102A43]">Hợp đồng mua bán</h1><p className="mt-1 max-w-2xl text-sm text-[#71869A]">Lưu thỏa thuận, điều khoản hiệu lực và chứng từ ký; Tài sản và Phụ kiện được đối soát trực tiếp theo Hóa đơn mua bán.</p></div><button type="button" onClick={openCreate} className="primary-action"><Plus size={16} />Tạo hợp đồng</button></div>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Tổng hợp đồng" value={contracts.length} icon={<FileText size={18} />} /><Metric label="Đang hiệu lực" value={contracts.filter((item) => item.status === "active").length} icon={<FileCheck2 size={18} />} tone="teal" /><Metric label="Nháp cần hoàn thiện" value={contracts.filter((item) => item.status === "draft").length} icon={<Link2 size={18} />} tone="blue" /></section>
    <section className="mt-5 rounded-2xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.05)]"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_190px_auto] xl:items-center"><div className="relative min-w-0 sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8AA0B6]" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field-input !pl-11" placeholder="Tìm số hợp đồng, tên hoặc nhà cung cấp..." /></div><div className="min-w-0"><SearchableSelect value={vendorFilter} onChange={setVendorFilter} options={vendorFilterOptions} placeholder="Tất cả Nhà cung cấp" searchPlaceholder="Tìm Nhà cung cấp..." /></div><div className="min-w-0"><SearchableSelect value={statusFilter} onChange={(value) => setStatusFilter(value as "all" | ContractStatus)} options={statusOptions} placeholder="Lọc trạng thái" searchPlaceholder="Tìm trạng thái..." /></div><button type="button" onClick={() => { setQuery(""); setVendorFilter("all"); setStatusFilter("all"); }} disabled={!hasActiveFilters} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-50"><X size={14} />Xóa bộ lọc</button></div></section>
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.05)]"><div className="overflow-x-auto"><table className={`w-full text-left text-xs ${filtered.length || contractsQuery.isLoading ? "min-w-[1060px]" : "min-w-0"}`}><thead className="bg-[#F8FBFC] text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="px-5 py-4">Hợp đồng</th><th className="px-4 py-4">Nhà cung cấp</th><th className="px-4 py-4">Ngày ký</th><th className="px-4 py-4">Ngày bắt đầu</th><th className="px-4 py-4">Ngày hết hiệu lực</th><th className="px-4 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody>{contractsQuery.isLoading ? <tr><td colSpan={7} className="p-10 text-center text-sm text-[#71869A]">Đang tải danh sách hợp đồng...</td></tr> : filtered.map((contract) => { const status = statusMeta[contract.status]; const endOfEffect = contract.effectiveTo ? new Date(contract.effectiveTo) : null; const today = new Date(); today.setHours(0, 0, 0, 0); if (endOfEffect) endOfEffect.setHours(0, 0, 0, 0); const remainingDays = endOfEffect ? Math.ceil((endOfEffect.getTime() - today.getTime()) / 86_400_000) : null; const expiringSoon = contract.status === "active" && remainingDays !== null && remainingDays >= 0 && remainingDays <= 30; return <tr key={contract.id} className="border-t border-[#EDF2F5] transition hover:bg-[#FBFCFD]"><td className="px-5 py-4"><button type="button" onClick={() => setSelectedId(contract.id)} className="text-left"><div className="font-mono text-[11px] font-extrabold text-[#087A6A] hover:underline">{contract.referenceCode}</div><div className="mt-1 font-bold text-[#193B57]">{contract.title}</div></button></td><td className="px-4 py-4 font-medium text-[#60758A]">{contract.vendorId ? vendorsById.get(contract.vendorId)?.name || "Nhà cung cấp đã xóa" : "—"}</td><td className="px-4 py-4 text-[#60758A]">{dateLabel(contract.signedAt)}</td><td className="px-4 py-4 text-[#60758A]">{dateLabel(contract.effectiveFrom)}</td><td className="px-4 py-4 text-[#60758A]"><div>{dateLabel(contract.effectiveTo)}</div>{expiringSoon && <span className="mt-1 inline-flex rounded-full bg-[#FDEDEE] px-2 py-1 text-[10px] font-extrabold text-[#B44545]">{remainingDays === 0 ? "Hết hạn hôm nay" : `Sắp hết hiệu lực · ${remainingDays} ngày`}</span>}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${status.tone}`}>{status.label}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedId(contract.id)} className="text-[11px] font-extrabold text-[#2666A8] hover:underline">Xem hồ sơ</button></td></tr>; })}{!contractsQuery.isLoading && !filtered.length && <tr><td colSpan={7} className="p-12 text-center"><div className="text-sm font-bold text-[#193B57]">Chưa có Hợp đồng phù hợp</div><p className="mt-1 text-xs text-[#71869A]">Tạo hồ sơ đầu tiên để liên kết chứng từ, tài sản và phụ kiện.</p></td></tr>}</tbody></table></div></section>
  </div>
  {selectedId !== null && <><button type="button" aria-label="Đóng hồ sơ hợp đồng" onClick={() => setSelectedId(null)} className="fixed inset-0 z-[85] bg-[#102A43]/25 backdrop-blur-[1px]" /><aside className="fixed inset-y-0 right-0 z-[86] w-full max-w-2xl overflow-y-auto border-l border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Hồ sơ hợp đồng</div><h2 className="mt-1 truncate font-display text-xl font-extrabold text-[#102A43]">{selectedContract?.referenceCode || "Đang tải..."}</h2><p className="mt-1 text-xs text-[#71869A]">{selectedContract?.title || "Đang lấy thông tin hợp đồng"}</p></div><button type="button" onClick={() => setSelectedId(null)} className="drawer-close-action" aria-label="Đóng"><X size={18} /></button></div>{detailsQuery.isLoading ? <div className="grid min-h-[320px] place-items-center text-sm font-semibold text-[#71869A]"><Loader2 className="mr-2 animate-spin" size={18} />Đang tải hồ sơ hợp đồng...</div> : detailsQuery.isError || !detail ? <div className="mt-6 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-4 text-sm text-[#9E3F12]">Không thể tải chi tiết hợp đồng. <button type="button" onClick={() => void detailsQuery.refetch()} className="font-extrabold underline">Thử lại</button></div> : <div className="mt-6 space-y-5"><section className="rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-extrabold text-[#193B57]">{selectedContract.title}</div><div className="mt-1 text-xs text-[#71869A]">{selectedContract.vendorId ? vendorsById.get(selectedContract.vendorId)?.name || "Nhà cung cấp đã xóa" : "Chưa gán nhà cung cấp"}</div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${selectedStatus.tone}`}>{selectedStatus.label}</span></div><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><Info label="Ngày ký" value={dateLabel(selectedContract.signedAt)} /><Info label="Hiệu lực từ" value={dateLabel(selectedContract.effectiveFrom)} /><Info label="Hiệu lực đến" value={dateLabel(selectedContract.effectiveTo)} /></dl>{selectedContract.note && <p className="mt-3 border-t border-[#E7EEF3] pt-3 text-xs leading-5 text-[#60758A]">{selectedContract.note}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={openEdit} className="filter-action"><Pencil size={14} />Chỉnh sửa</button><button type="button" disabled={removeContract.isPending || totalLinkedAssets > 0 || totalLinkedSupplies > 0} onClick={() => { if (window.confirm(`Xóa ${selectedContract.referenceCode}? Chứng từ sẽ không còn liên kết trong hệ thống.`)) removeContract.mutate({ id: selectedContract.id }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2B18B] px-3 py-2 text-[11px] font-bold text-[#B44545] transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={14} />Xóa</button>{(totalLinkedAssets > 0 || totalLinkedSupplies > 0) && <span className="self-center text-[10px] font-semibold text-[#A86B00]">Không thể xóa khi còn liên kết.</span>}</div></section>
    <section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Paperclip size={16} className="text-[#087A6A]" />Chứng từ hợp đồng</div><p className="mt-1 text-[11px] leading-5 text-[#4B8884]">Lưu một lần tại hồ sơ hợp đồng; mọi tài sản và phụ kiện liên kết đều dùng chung.</p></div><div className="w-[150px]"><SearchableSelect value={documentType} onChange={(value) => setDocumentType(value as typeof documentType)} options={[{ value: "signed_contract", label: "Hợp đồng đã ký" }, { value: "appendix", label: "Phụ lục" }, { value: "quotation", label: "Báo giá" }, { value: "other", label: "Khác" }]} placeholder="Loại tệp" searchPlaceholder="Tìm loại tệp..." /></div></div><input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleDocument(file); event.currentTarget.value = ""; }} /><button type="button" disabled={uploadDocument.isPending} onClick={() => fileInputRef.current?.click()} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#087A6A] px-3 text-[11px] font-extrabold text-white transition hover:bg-[#066254] disabled:opacity-60"><Paperclip size={14} />{uploadDocument.isPending ? "Đang lưu tệp..." : "Tải chứng từ"}</button><div className="mt-3 space-y-2">{detail.documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2.5"><FileText size={16} className="shrink-0 text-[#2666A8]" /><a href={document.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-bold text-[#193B57] hover:text-[#087A6A] hover:underline">{document.fileName}</a><button type="button" aria-label={`Gỡ ${document.fileName}`} onClick={() => removeDocument.mutate({ id: document.id })} className="grid h-7 w-7 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#FDEDEE] hover:text-[#B44545]"><Trash2 size={14} /></button></div>)}{!detail.documents.length && <p className="rounded-lg border border-dashed border-[#8BCDC6] bg-white/60 px-3 py-4 text-center text-xs text-[#71869A]">Chưa có chứng từ. Tải file PDF hoặc ảnh hợp đồng đã ký để lưu tại đây.</p>}</div></section>
  </div>}</aside></>}
  {formOpen && <><button type="button" aria-label="Đóng form hợp đồng" onClick={requestCloseForm} className="fixed inset-0 z-[100] bg-[#102A43]/40 backdrop-blur-sm" /><section role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[101] max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#DFE9F0] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Hồ sơ mua sắm</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{editingId ? "Cập nhật hợp đồng" : "Tạo hợp đồng mua bán"}</h2><p className="mt-1 text-xs text-[#71869A]">Số hợp đồng là định danh duy nhất để liên kết nhiều tài sản và phụ kiện.</p></div><button type="button" onClick={requestCloseForm} className="drawer-close-action" aria-label="Đóng"><X size={18} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><Field label="Số hợp đồng *"><input autoFocus value={form.referenceCode} onChange={(event) => setForm({ ...form, referenceCode: event.target.value.toUpperCase() })} placeholder="VD: HDMB-2026-001" className="field-input font-mono" /></Field><Field label="Tên/Phạm vi hợp đồng *"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="VD: Mua thiết bị CNTT quý I" className="field-input" /></Field><SelectField label="Nhà cung cấp"><SearchableSelect value={form.vendorId} onChange={(value) => setForm({ ...form, vendorId: value })} options={vendorOptions} placeholder="Chọn nhà cung cấp" searchPlaceholder="Tìm nhà cung cấp..." /></SelectField><SelectField label="Trạng thái"><SearchableSelect value={form.status} onChange={(value) => setForm({ ...form, status: value as ContractStatus })} options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))} placeholder="Chọn trạng thái" searchPlaceholder="Tìm trạng thái..." /></SelectField><Field label="Ngày ký"><DatePickerField value={form.signedAt} onChange={(value) => setForm({ ...form, signedAt: value })} placeholder="Chọn ngày ký" aria-label="Ngày ký hợp đồng" /></Field><Field label="Tổng giá trị"><CurrencyInput value={form.totalValue} onChange={(value) => setForm({ ...form, totalValue: value })} placeholder="Ví dụ: 250.000.000" showWords aria-label="Tổng giá trị hợp đồng" /></Field><Field label="Hiệu lực từ"><DatePickerField value={form.effectiveFrom} onChange={(value) => setForm({ ...form, effectiveFrom: value })} placeholder="Chọn ngày hiệu lực" aria-label="Ngày hiệu lực từ" /></Field><Field label="Hiệu lực đến"><DatePickerField value={form.effectiveTo} onChange={(value) => setForm({ ...form, effectiveTo: value })} placeholder="Chọn ngày hết hiệu lực" aria-label="Ngày hiệu lực đến" /></Field>{!editingId && <div className="sm:col-span-2 rounded-xl border border-dashed border-[#9ADBD3] bg-[#F7FCFC] p-3.5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-extrabold text-[#193B57]">Bản Hợp đồng giấy đã ký <span className="font-medium text-[#8AA0B6]">(tùy chọn)</span></div><p className="mt-1 text-[10px] leading-4 text-[#4B8884]">Tải ngay bản scan để lưu cùng hồ sơ Hợp đồng. PDF, PNG, JPG, DOCX hoặc XLSX; tối đa 5 MB.</p></div><button type="button" disabled={isSaving} onClick={() => paperContractInputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-[11px] font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7] disabled:opacity-60"><Paperclip size={14} />{paperContractFile ? "Đổi tệp" : "Chọn bản giấy"}</button></div><input ref={paperContractInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" className="hidden" onChange={(event) => { selectPaperContractFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />{paperContractFile && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#CDE5E5] bg-white px-3 py-2.5"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#193B57]">{paperContractFile.name}</div><div className="mt-0.5 text-[10px] text-[#71869A]">Sẽ được lưu thành “Hợp đồng đã ký” ngay sau khi tạo.</div></div><button type="button" onClick={() => setPaperContractFile(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#FDEDEE] hover:text-[#B44545]" aria-label="Bỏ chọn bản Hợp đồng giấy"><X size={14} /></button></div>}</div>}<div className="sm:col-span-2"><Field label="Ghi chú"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="field-input min-h-24" placeholder="Điều khoản, nhóm hàng hoặc lưu ý cần theo dõi..." /></Field></div></div><div className="flex justify-end gap-2 border-t border-[#E7EEF3] px-5 py-4 sm:px-6"><button type="button" disabled={isSaving} onClick={requestCloseForm} className="filter-action">Hủy</button><button type="button" disabled={isSaving} onClick={() => void save()} className="primary-action">{isSaving && <Loader2 size={15} className="animate-spin" />}{isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo hợp đồng"}</button></div></section></>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={label === "Tổng giá trị" ? "hidden" : "block space-y-1.5"}><span className="text-xs font-extrabold text-[#526779]">{label}</span>{children}</label>; }
function SelectField({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><span className="block text-xs font-extrabold text-[#526779]">{label}</span>{children}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#8AA0B6]">{label}</dt><dd className="mt-1 font-bold text-[#193B57]">{value}</dd></div>; }
function Metric({ label, value, icon, tone = "default" }: { label: string; value: number; icon: React.ReactNode; tone?: "default" | "teal" | "blue" }) { const colors = tone === "teal" ? "bg-[#E6F6F2] text-[#087A6A]" : tone === "blue" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#EAF0F7] text-[#193B57]"; return <div className="rounded-xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,.045)]"><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors}`}>{icon}</span><div className="mt-4 text-[11px] font-semibold text-[#7890A5]">{label}</div><div className="mt-1 font-display text-2xl font-extrabold text-[#102A43]">{value}</div></div>; }
