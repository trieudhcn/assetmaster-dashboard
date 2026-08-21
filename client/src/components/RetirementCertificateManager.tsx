import { useMemo, useRef, useState } from "react";
import { Archive, CheckCircle2, FileCheck2, FileUp, LoaderCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const DEFAULT_RETIREMENT_REASON = "Thanh lý theo thời gian quy định";
type DraftItem = { reason: string; salvageValue: string; note: string };

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").toLowerCase();

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc tệp."));
    reader.readAsDataURL(file);
  });
}

export function RetirementCertificateManager() {
  const utils = trpc.useUtils();
  const assetsQuery = trpc.assets.list.useQuery();
  const certificatesQuery = trpc.retirementCertificates.list.useQuery();
  const [keyword, setKeyword] = useState("");
  const [retiredAt, setRetiredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Record<number, DraftItem>>({});
  const [closingId, setClosingId] = useState<number | null>(null);
  const signedFileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const candidates = useMemo(
    () => (assetsQuery.data || []).filter((asset) => !asset.isArchived && (asset.status === "available" || asset.status === "maintenance")),
    [assetsQuery.data],
  );
  const selectedIds = useMemo(() => Object.keys(selected).map(Number), [selected]);
  const filteredCandidates = useMemo(() => {
    const query = normalize(keyword.trim());
    if (!query) return candidates;
    return candidates.filter((asset) => [asset.assetCode, asset.name, asset.serialNumber || ""].some((value) => normalize(value).includes(query)));
  }, [candidates, keyword]);

  const invalidate = async () => {
    await Promise.all([utils.retirementCertificates.list.invalidate(), utils.assets.list.invalidate()]);
  };
  const createDraft = trpc.retirementCertificates.createDraft.useMutation({
    onSuccess: async ({ referenceCode }) => {
      toast.success(`Đã tạo nháp ${referenceCode}.`, { description: "Tải biên bản đã ký tay rồi xác nhận đóng khi sẵn sàng." });
      setSelected({});
      setNote("");
      await invalidate();
    },
    onError: (error) => toast.error(error.message || "Không thể tạo nháp biên bản thanh lý."),
  });
  const uploadSigned = trpc.retirementCertificates.uploadSignedCopy.useMutation({
    onSuccess: async () => {
      toast.success("Đã tải biên bản ký tay. Bạn có thể xác nhận đóng biên bản.");
      await invalidate();
    },
    onError: (error) => toast.error(error.message || "Không thể tải biên bản ký tay."),
  });
  const closeCertificate = trpc.retirementCertificates.close.useMutation({
    onSuccess: async ({ referenceCode, assetCount }) => {
      toast.success(`Đã đóng ${referenceCode}.`, { description: `${assetCount} tài sản đã được chuyển sang Khấu hao/Thanh lý.` });
      setClosingId(null);
      await invalidate();
    },
    onError: (error) => toast.error(error.message || "Không thể đóng biên bản."),
  });

  const toggleAsset = (assetId: number) => setSelected((current) => {
    if (current[assetId]) {
      const next = { ...current };
      delete next[assetId];
      return next;
    }
    return { ...current, [assetId]: { reason: DEFAULT_RETIREMENT_REASON, salvageValue: "", note: "" } };
  });
  const updateItem = (assetId: number, key: keyof DraftItem, value: string) => {
    setSelected((current) => ({ ...current, [assetId]: { ...current[assetId], [key]: value } }));
  };
  const submitDraft = () => {
    if (!selectedIds.length) return toast.error("Chọn ít nhất một tài sản để lập biên bản nháp.");
    const date = new Date(`${retiredAt}T12:00:00`);
    if (Number.isNaN(date.getTime())) return toast.error("Vui lòng chọn ngày thanh lý hợp lệ.");
    createDraft.mutate({
      retiredAt: date.getTime(),
      note: note.trim() || null,
      items: selectedIds.map((assetId) => ({
        assetId,
        retirementReason: selected[assetId]?.reason.trim() || DEFAULT_RETIREMENT_REASON,
        salvageValue: selected[assetId]?.salvageValue || null,
        note: selected[assetId]?.note.trim() || null,
      })),
    });
  };
  const chooseSignedFile = async (certificateId: number, file?: File) => {
    if (!file) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Chỉ hỗ trợ PDF, PNG, JPG, WebP và tối đa 5 MB.");
      return;
    }
    try {
      uploadSigned.mutate({
        id: certificateId,
        fileName: file.name,
        contentType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/webp",
        dataUrl: await readFileAsDataUrl(file),
      });
    } catch {
      toast.error("Không thể đọc tệp biên bản ký tay.");
    }
  };

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[#D7E8E5] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.045)]">
      <div className="flex flex-col gap-3 border-b border-[#E0EEEC] bg-[#F6FCFB] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Archive size={19} /></div>
          <div><h2 className="font-display text-base font-extrabold text-[#102A43]">Biên bản thanh lý gộp</h2><p className="mt-1 text-xs leading-5 text-[#60758A]">Tạo một nháp cho nhiều tài sản, nhập lý do riêng từng dòng, tải biên bản đã ký tay rồi xác nhận đóng.</p></div>
        </div>
        <div className="shrink-0 rounded-lg border border-[#BFE1DB] bg-white px-3 py-2 text-[10px] font-extrabold text-[#087A6A]">Nháp → Ký tay → Đóng</div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1.08fr_.92fr]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-extrabold text-[#193B57]">1. Chọn tài sản cho biên bản nháp</h3><p className="mt-1 text-[11px] text-[#71869A]">Chỉ hiển thị tài sản Sẵn có hoặc đang Bảo hành/Sửa chữa.</p></div><div className="text-xs font-bold text-[#087A6A]">Đã chọn {selectedIds.length}</div></div>
          <div className="relative mt-3"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm mã, tên hoặc serial tài sản..." className="field-input h-10 w-full pl-9 pr-9 text-xs" />{keyword && <button type="button" onClick={() => setKeyword("")} className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#71869A] hover:bg-[#EEF5F7]" aria-label="Xóa từ khóa tìm tài sản"><X size={14} /></button>}</div>
          <div className="mt-3 max-h-[320px] space-y-2 overflow-auto rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] p-2">
            {assetsQuery.isLoading ? <div className="grid min-h-28 place-items-center text-xs text-[#71869A]">Đang tải tài sản...</div> : filteredCandidates.length ? filteredCandidates.map((asset) => {
              const item = selected[asset.id];
              return <label key={asset.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${item ? "border-[#8BCDC6] bg-[#F2FBF9]" : "border-transparent bg-white hover:border-[#D7E8E5]"}`}><input type="checkbox" checked={Boolean(item)} onChange={() => toggleAsset(asset.id)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#8BCDC6] accent-[#0F8C8C]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#193B57]">{asset.name}</span><span className="mt-1 block font-mono text-[10px] text-[#8AA0B6]">{asset.assetCode}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${asset.status === "available" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{asset.status === "available" ? "Sẵn có" : "Đang xử lý"}</span></label>;
            }) : <div className="grid min-h-28 place-items-center px-4 text-center text-xs text-[#8AA0B6]">Không có tài sản phù hợp hoặc tất cả đã thuộc biên bản khác.</div>}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#D7E8E5] bg-[#F9FDFC] p-4">
          <h3 className="text-sm font-extrabold text-[#193B57]">2. Hoàn thiện nháp</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]"><div><label className="field-label">Ngày thanh lý</label><input type="date" value={retiredAt} onChange={(event) => setRetiredAt(event.target.value)} className="field-input h-10 w-full text-xs" /></div><div><label className="field-label">Ghi chú chung</label><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Không bắt buộc" className="field-input h-10 w-full text-xs" /></div></div>
          <div className="mt-3 max-h-[286px] space-y-3 overflow-auto">
            {selectedIds.length ? selectedIds.map((assetId) => {
              const asset = candidates.find((candidate) => candidate.id === assetId);
              const item = selected[assetId];
              if (!asset || !item) return null;
              return <div key={assetId} className="rounded-lg border border-[#D7E8E5] bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{asset.name}</div><div className="mt-1 font-mono text-[10px] text-[#8AA0B6]">{asset.assetCode}</div></div><button type="button" onClick={() => toggleAsset(assetId)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#71869A] hover:bg-[#FDEDEE] hover:text-[#B44545]" aria-label={`Bỏ chọn ${asset.name}`}><X size={14} /></button></div><label className="mt-3 block text-[10px] font-extrabold uppercase tracking-[.08em] text-[#60758A]">Lý do riêng</label><input value={item.reason} onChange={(event) => updateItem(assetId, "reason", event.target.value)} className="field-input mt-1 h-9 w-full text-xs" /><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={item.salvageValue} inputMode="decimal" onChange={(event) => /^\d*(\.\d{0,2})?$/.test(event.target.value) && updateItem(assetId, "salvageValue", event.target.value)} placeholder="Giá trị thu hồi (nếu có)" className="field-input h-9 w-full text-xs" /><input value={item.note} onChange={(event) => updateItem(assetId, "note", event.target.value)} placeholder="Ghi chú dòng (nếu có)" className="field-input h-9 w-full text-xs" /></div></div>;
            }) : <div className="rounded-lg border border-dashed border-[#BFE1DB] bg-white px-4 py-7 text-center text-xs text-[#71869A]">Chọn tài sản ở danh sách bên trái để nhập lý do riêng.</div>}
          </div>
          <button type="button" disabled={!selectedIds.length || createDraft.isPending} onClick={submitDraft} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-extrabold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 size={15} />{createDraft.isPending ? "Đang tạo nháp..." : `Tạo biên bản nháp (${selectedIds.length})`}</button>
        </div>
      </div>

      <div className="border-t border-[#E7EEF3] bg-[#FBFCFD] p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-[#193B57]">Biên bản đã tạo</h3><p className="mt-1 text-[11px] text-[#71869A]">Chỉ biên bản đã tải tệp ký tay mới có thể được đóng.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#60758A]">{certificatesQuery.data?.length || 0} biên bản</span></div><div className="mt-3 space-y-3">{certificatesQuery.isLoading ? <div className="py-5 text-center text-xs text-[#71869A]">Đang tải biên bản...</div> : certificatesQuery.data?.length ? certificatesQuery.data.map((certificate) => { const isClosed = certificate.status === "closed"; const canClose = certificate.status === "awaiting_signed_copy" && Boolean(certificate.signedDocumentUrl); return <div key={certificate.id} className="rounded-xl border border-[#DFE9F0] bg-white p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-extrabold text-[#0F8C8C]">{certificate.referenceCode}</span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${isClosed ? "bg-[#E6F6F2] text-[#087A6A]" : certificate.status === "awaiting_signed_copy" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{isClosed ? "Đã đóng" : certificate.status === "awaiting_signed_copy" ? "Đã có tệp ký tay" : "Nháp"}</span></div><div className="mt-1 text-xs text-[#60758A]">{certificate.items.length} tài sản · Ngày thanh lý {new Date(certificate.retiredAt).toLocaleDateString("vi-VN")}</div><div className="mt-2 flex flex-wrap gap-1.5">{certificate.items.slice(0, 4).map((item) => <span key={item.id} className="rounded bg-[#F0F5F8] px-2 py-1 font-mono text-[9px] font-bold text-[#60758A]">{item.assetCode}</span>)}{certificate.items.length > 4 && <span className="rounded bg-[#F0F5F8] px-2 py-1 text-[9px] font-bold text-[#60758A]">+{certificate.items.length - 4}</span>}</div></div><div className="flex flex-wrap gap-2">{certificate.signedDocumentUrl && <a href={certificate.signedDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#B7D8D4] bg-white px-3 text-xs font-bold text-[#087A6A]"><FileCheck2 size={14} />Tệp đã ký</a>}{!isClosed && <><button type="button" disabled={uploadSigned.isPending} onClick={() => signedFileInputs.current[certificate.id]?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE7F0] bg-white px-3 text-xs font-bold text-[#2666A8] disabled:opacity-50"><FileUp size={14} />{uploadSigned.isPending ? "Đang tải..." : "Tải bản ký tay"}</button><input ref={(element) => { signedFileInputs.current[certificate.id] = element; }} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void chooseSignedFile(certificate.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />{canClose && <button type="button" onClick={() => setClosingId(certificate.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white"><CheckCircle2 size={14} />Xác nhận đóng</button>}</>}</div></div>{closingId === certificate.id && <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#8F5A00]">Đóng biên bản sẽ chuyển toàn bộ tài sản trong biên bản sang Khấu hao/Thanh lý và khóa biên bản.</p><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setClosingId(null)} className="h-8 rounded-md border border-[#E7D9B9] bg-white px-3 text-xs font-bold text-[#8F5A00]">Hủy</button><button type="button" disabled={closeCertificate.isPending} onClick={() => closeCertificate.mutate({ id: certificate.id })} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#A86B00] px-3 text-xs font-bold text-white disabled:opacity-50">{closeCertificate.isPending && <LoaderCircle size={14} className="animate-spin" />}{closeCertificate.isPending ? "Đang đóng..." : "Đóng biên bản"}</button></div></div>}</div>; }) : <div className="rounded-lg border border-dashed border-[#D7E8E5] bg-white px-4 py-6 text-center text-xs text-[#71869A]">Chưa có biên bản thanh lý gộp.</div>}</div></div>
    </section>
  );
}
