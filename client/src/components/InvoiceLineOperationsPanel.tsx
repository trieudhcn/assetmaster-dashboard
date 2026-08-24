import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Link2, Loader2, Plus, ScanLine, X } from "lucide-react";
import { QuickSupplyClassificationFields } from "@/components/QuickSupplyClassificationFields";

type InvoiceLine = { id: number; lineNumber: number; itemType: "asset" | "supply" | "service" | "other"; itemCode: string | null; itemName: string; quantity: string; unit: string | null; unitPrice: string; taxRate: string };
type Asset = { id: number; assetCode: string; name: string; serialNumber: string | null; purchaseInvoiceId: number | null; purchaseInvoiceLineId: number | null; status: string };
type Supply = { id: number; code: string; name: string; unit: string; stockQuantity: string; isActive: boolean };
type SupplyReceipt = { id: number; purchaseInvoiceLineId: number; supplyId: number; receivedQuantity: string; status: "received" | "void"; supply: Supply | null };
type ReceiveSupplyInput = { purchaseInvoiceLineId: number; supplyId: number; receivedQuantity: string; unitCost: string | null; taxRate: string; taxAmount: string; totalAmount: string; receivedAt: number; note: string | null };
type CreateSupplyInput = { purchaseInvoiceLineId: number; code: string; name: string; unit: string; receivedQuantity: string; minimumQuantity: number; categoryId: number | null; brandId: number | null; location: string | null; note: string | null };
type SupplyDraft = { code: string; name: string; unit: string; quantity: string; minimumQuantity: string; location: string; note: string };
type CatalogItem = { id: number; name: string; isActive: boolean };

const money = (value: string | number | null | undefined) => value === null || value === undefined || value === "" ? "—" : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VNĐ`;
const normalizeSupplyCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 64);
const toSupplyCode = (line: InvoiceLine) => {
  const source = (line.itemCode || line.itemName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return source ? `PK-${source}` : `PK-DONG-${line.lineNumber}`;
};

function BarcodeCameraScanner({ onDetected, onClose }: { onDetected: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setStatus("error");
        setErrorMessage("Trình duyệt hoặc thiết bị này không hỗ trợ truy cập camera.");
        return;
      }
      try {
        const controls = await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }, videoRef.current, (result, _error, scannerControls) => {
          if (!result || !active) return;
          scannerControls.stop();
          const code = normalizeSupplyCode(result.getText());
          if (code) onDetected(code);
        });
        controlsRef.current = controls;
        if (!active) controls.stop();
        else setStatus("ready");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        const name = error instanceof DOMException ? error.name : "";
        setErrorMessage(name === "NotAllowedError" ? "Quyền camera đang bị chặn. Hãy cho phép camera trong trình duyệt rồi thử lại." : "Không thể khởi động camera. Hãy kiểm tra camera đang không được ứng dụng khác sử dụng.");
      }
    };
    void start();
    return () => {
      active = false;
      controlsRef.current?.stop();
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, [onDetected]);

  return <><button type="button" aria-label="Đóng quét mã vạch" onClick={onClose} className="fixed inset-0 z-[180] bg-[#102A43]/55 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-label="Quét mã vạch" className="fixed left-1/2 top-1/2 z-[181] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#CDE5E5] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]"><ScanLine size={14} />Quét mã vạch</div><h3 className="mt-1 text-lg font-extrabold text-[#102A43]">Đưa mã vào khung hình</h3><p className="mt-1 text-xs leading-5 text-[#71869A]">Ưu tiên camera sau. Mã hợp lệ sẽ tự điền vào Mã Phụ kiện.</p></div><button type="button" onClick={onClose} className="drawer-close-action" aria-label="Đóng"><X size={18} /></button></div><div className="relative bg-[#102A43] p-3"><div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/20 bg-black"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />{status === "starting" && <div className="absolute inset-0 grid place-items-center bg-[#102A43]/60 text-center text-xs font-bold text-white"><span><Loader2 className="mx-auto mb-2 animate-spin" size={22} />Đang mở camera...</span></div>}{status === "error" && <div className="absolute inset-0 grid place-items-center bg-[#102A43]/75 p-6 text-center text-xs leading-5 text-white"><span>{errorMessage}</span></div>}<div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[34%] -translate-y-1/2 rounded-lg border-2 border-[#84E1D9] shadow-[0_0_0_999px_rgba(0,0,0,.15)]" /></div></div><div className="flex items-center justify-between gap-3 px-5 py-4"><p className="text-[11px] leading-5 text-[#60758A]">Giữ mã rõ nét, đủ sáng và nằm trong khung màu xanh.</p><button type="button" onClick={onClose} className="filter-action shrink-0">Hủy</button></div></section></>;
}

export function InvoiceLineOperationsPanel({ invoiceId, invoiceKey, lines, linkedAssets, supplyReceipts, assets, supplies, categories, brands, onAttach, onDetach, onReceive, onCreateAndReceive, isWorking }: { invoiceId: number; invoiceKey: string; lines: InvoiceLine[]; linkedAssets: Asset[]; supplyReceipts: SupplyReceipt[]; assets: Asset[]; supplies: Supply[]; categories: CatalogItem[]; brands: CatalogItem[]; onAttach: (assetId: number, lineId: number | null) => void; onDetach: (assetId: number) => void; onReceive: (input: ReceiveSupplyInput) => void; onCreateAndReceive: (input: CreateSupplyInput) => void; isWorking: boolean }) {
  const [assetDrafts, setAssetDrafts] = useState<Record<number, string>>({});
  const [supplyDrafts, setSupplyDrafts] = useState<Record<number, { supplyId: string; quantity: string }>>({});
  const [createForLine, setCreateForLine] = useState<InvoiceLine | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newSupply, setNewSupply] = useState<SupplyDraft>({ code: "", name: "", unit: "Cái", quantity: "", minimumQuantity: "0", location: "", note: "" });
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const activeAssets = assets.filter((asset) => asset.status !== "retired" && asset.status !== "returned_to_vendor");
  lines = lines.map((line) => {
    const quantity = Number(line.quantity);
    return Number.isInteger(quantity) ? { ...line, quantity: String(quantity) } : line;
  });
  const openCreate = (line: InvoiceLine, remaining: number) => {
    setCreateForLine(line);
    setCategoryId("");
    setBrandId("");
    setNewSupply({ code: toSupplyCode(line), name: line.itemName, unit: line.unit || "Cái", quantity: String(remaining), minimumQuantity: "0", location: "", note: `Tạo từ Hóa đơn ${invoiceKey} · dòng ${line.lineNumber}` });
  };
  const confirmCreate = () => {
    if (!createForLine) return;
    if (!newSupply.code.trim() || !newSupply.name.trim() || !newSupply.unit.trim()) return;
    const received = Number(newSupply.quantity);
    const alreadyReceived = supplyReceipts.filter((receipt) => receipt.purchaseInvoiceLineId === createForLine.id && receipt.status === "received").reduce((total, receipt) => total + Number(receipt.receivedQuantity), 0);
    if (!Number.isFinite(received) || received <= 0 || received + alreadyReceived > Number(createForLine.quantity)) return;
    onCreateAndReceive({ purchaseInvoiceLineId: createForLine.id, code: newSupply.code.trim(), name: newSupply.name.trim(), unit: newSupply.unit.trim(), receivedQuantity: newSupply.quantity, minimumQuantity: Math.max(0, Number(newSupply.minimumQuantity || 0)), categoryId: categoryId ? Number(categoryId) : null, brandId: brandId ? Number(brandId) : null, location: newSupply.location.trim() || null, note: newSupply.note.trim() || null });
  };
  useEffect(() => {
    if (!createForLine) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Tạo Phụ kiện từ Hóa đơn"]');
    const grid = dialog?.querySelector<HTMLElement>("div.mt-5.grid");
    if (!grid) return;
    const host = document.createElement("div");
    host.className = "sm:col-span-2";
    host.dataset.quickSupplyClassification = "true";
    grid.append(host);
    const root = createRoot(host);
    root.render(<QuickSupplyClassificationFields categories={categories} brands={brands} categoryId={categoryId} brandId={brandId} onCategoryChange={setCategoryId} onBrandChange={setBrandId} />);
    return () => { root.unmount(); host.remove(); };
  }, [createForLine, categories, brands, categoryId, brandId]);

  return <><section className="mt-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-extrabold text-[#193B57]"><Link2 size={15} className="text-[#087A6A]" />Phân bổ nguồn mua theo dòng</div><p className="mt-1 text-[11px] text-[#4B8884]">Gán trực tiếp Tài sản vào dòng loại Tài sản, hoặc tiếp nhận và tạo mới Phụ kiện theo dòng loại Phụ kiện.</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#087A6A]">{invoiceKey}</span></div><div className="mt-3 space-y-3">{lines.filter((line) => line.itemType === "asset" || line.itemType === "supply").map((line) => {
    const lineAssets = linkedAssets.filter((asset) => asset.purchaseInvoiceLineId === line.id);
    const receipts = supplyReceipts.filter((receipt) => receipt.purchaseInvoiceLineId === line.id && receipt.status === "received");
    const received = receipts.reduce((total, receipt) => total + Number(receipt.receivedQuantity), 0);
    const remaining = Math.max(0, Number(line.quantity) - received);
    const draft = supplyDrafts[line.id] || { supplyId: "", quantity: "" };
    return <div key={line.id} className="rounded-lg border border-[#CDE5E5] bg-white p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-extrabold text-[#193B57]">#{line.lineNumber} · {line.itemName}</div><div className="mt-1 text-[10px] text-[#71869A]">{line.itemType === "asset" ? "Tài sản" : "Phụ kiện"} · SL Hóa đơn: {line.quantity} {line.unit || ""} · {money(line.unitPrice)}/đơn vị</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${line.itemType === "asset" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#FFF5DC] text-[#A86B00]"}`}>{line.itemType === "asset" ? `${lineAssets.length} Tài sản đã gán` : `Đã nhập ${received}/${line.quantity}`}</span></div>{line.itemType === "asset" ? <div className="mt-3"><div className="flex flex-col gap-2 sm:flex-row"><select value={assetDrafts[line.id] || ""} onChange={(event) => setAssetDrafts((current) => ({ ...current, [line.id]: event.target.value }))} className="field-input min-w-0 flex-1" aria-label={`Chọn Tài sản cho dòng ${line.lineNumber}`}><option value="">Chọn Tài sản cần gán</option>{activeAssets.filter((asset) => !asset.purchaseInvoiceId || asset.purchaseInvoiceId === invoiceId).map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.name}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</option>)}</select><button type="button" disabled={!assetDrafts[line.id] || isWorking} onClick={() => onAttach(Number(assetDrafts[line.id]), line.id)} className="filter-action whitespace-nowrap"><Link2 size={14} />Gán Tài sản</button></div><div className="mt-2 flex flex-wrap gap-1.5">{lineAssets.map((asset) => <span key={asset.id} className="inline-flex items-center gap-1 rounded-md border border-[#C9DDF5] bg-[#F2F8FF] px-2 py-1 text-[10px] font-bold text-[#2666A8]">{asset.assetCode}<button type="button" aria-label={`Gỡ ${asset.assetCode}`} disabled={isWorking} onClick={() => onDetach(asset.id)} className="ml-0.5 text-[#6F94C0] hover:text-[#B44545]"><X size={12} /></button></span>)}{!lineAssets.length && <span className="text-[10px] text-[#8AA0B6]">Chưa gán Tài sản nào.</span>}</div></div> : <div className="mt-3"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]"><select value={draft.supplyId} onChange={(event) => setSupplyDrafts((current) => ({ ...current, [line.id]: { ...draft, supplyId: event.target.value } }))} className="field-input" aria-label={`Chọn Phụ kiện cho dòng ${line.lineNumber}`}><option value="">Chọn Phụ kiện có sẵn để nhập kho</option>{supplies.filter((supply) => supply.isActive).map((supply) => <option key={supply.id} value={supply.id}>{supply.code} · {supply.name} · tồn {Number(supply.stockQuantity).toLocaleString("vi-VN")} {supply.unit}</option>)}</select><input value={draft.quantity} inputMode="decimal" onChange={(event) => setSupplyDrafts((current) => ({ ...current, [line.id]: { ...draft, quantity: event.target.value.replace(/[^0-9.]/g, "") } }))} className="field-input" placeholder={`Tối đa ${remaining}`} /><button type="button" disabled={!draft.supplyId || !draft.quantity || Number(draft.quantity) <= 0 || Number(draft.quantity) > remaining || isWorking} onClick={() => onReceive({ purchaseInvoiceLineId: line.id, supplyId: Number(draft.supplyId), receivedQuantity: draft.quantity, unitCost: line.unitPrice || null, taxRate: line.taxRate || "0", taxAmount: String(Math.round(Number(draft.quantity) * Number(line.unitPrice || 0) * Number(line.taxRate || 0) / 100 * 100) / 100), totalAmount: String(Math.round(Number(draft.quantity) * Number(line.unitPrice || 0) * (1 + Number(line.taxRate || 0) / 100) * 100) / 100), receivedAt: Date.now(), note: `Tiếp nhận từ Hóa đơn ${invoiceKey} · dòng ${line.lineNumber}` })} className="filter-action whitespace-nowrap"><Plus size={14} />Tiếp nhận</button></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#71869A]"><span>Còn có thể tiếp nhận: <b className="text-[#193B57]">{remaining} {line.unit || ""}</b>.</span><button type="button" disabled={remaining <= 0 || isWorking} onClick={() => openCreate(line, remaining)} className="font-extrabold text-[#087A6A] hover:underline disabled:cursor-not-allowed disabled:opacity-50"><Plus size={12} className="mr-1 inline" />Tạo Phụ kiện mới</button></div><div className="mt-2 flex flex-wrap gap-1.5">{receipts.map((receipt) => <span key={receipt.id} className="rounded-md border border-[#D7E9D6] bg-[#F3FBF2] px-2 py-1 text-[10px] font-bold text-[#4A8A46]">+{receipt.receivedQuantity} {receipt.supply?.unit || line.unit || ""} · {receipt.supply?.code || "Phụ kiện"}</span>)}{!receipts.length && <span className="text-[10px] text-[#8AA0B6]">Chưa có lần tiếp nhận.</span>}</div></div>}</div>;
  })}</div>{!lines.some((line) => line.itemType === "asset" || line.itemType === "supply") && <p className="mt-3 rounded-lg border border-dashed border-[#B7D9D5] bg-white/70 px-3 py-4 text-center text-xs text-[#71869A]">Thêm dòng loại Tài sản hoặc Phụ kiện để thực hiện phân bổ nguồn mua.</p>}</section>{createForLine && <><button type="button" aria-label="Đóng tạo Phụ kiện" onClick={() => !isWorking && setCreateForLine(null)} className="fixed inset-0 z-[170] bg-[#102A43]/40 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-label="Tạo Phụ kiện từ Hóa đơn" className="fixed left-1/2 top-1/2 z-[171] max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Tạo nhanh từ Hóa đơn</div><h3 className="mt-1 text-lg font-extrabold text-[#102A43]">Phụ kiện mới · dòng #{createForLine.lineNumber}</h3><p className="mt-1 text-xs text-[#71869A]">Tạo danh mục Phụ kiện, tiếp nhận tồn kho và lưu receipt theo Hóa đơn trong cùng một lần.</p></div><button type="button" onClick={() => !isWorking && setCreateForLine(null)} className="drawer-close-action" aria-label="Đóng"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="block space-y-1.5 sm:col-span-2"><span className="text-xs font-extrabold text-[#526779]">Mã Phụ kiện *</span><div className="flex gap-2"><input value={newSupply.code} onChange={(event) => setNewSupply((current) => ({ ...current, code: normalizeSupplyCode(event.target.value) }))} className="field-input min-w-0 flex-1 font-mono" placeholder="VD: PK-CHUOT-LOGI" /><button type="button" onClick={() => setScannerOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#8BCDC6] bg-[#F4FBFA] px-3 text-[11px] font-extrabold text-[#087A6A] transition hover:bg-[#E6F6F2] active:scale-[.97]" aria-label="Quét mã vạch bằng camera"><Camera size={15} />Quét mã</button></div><span className="block text-[10px] leading-4 text-[#71869A]">Dùng camera để quét nhanh mã EAN, UPC, Code 128 hoặc mã vạch tương thích; vẫn có thể nhập thủ công.</span></label><label className="block space-y-1.5"><span className="text-xs font-extrabold text-[#526779]">Tên Phụ kiện *</span><input value={newSupply.name} onChange={(event) => setNewSupply((current) => ({ ...current, name: event.target.value }))} className="field-input" /></label><label className="block space-y-1.5"><span className="text-xs font-extrabold text-[#526779]">Số lượng tiếp nhận *</span><input value={newSupply.quantity} inputMode="decimal" onChange={(event) => setNewSupply((current) => ({ ...current, quantity: event.target.value.replace(/[^0-9.]/g, "") }))} className="field-input" placeholder={`Tối đa ${createForLine.quantity}`} /></label><label className="block space-y-1.5"><span className="text-xs font-extrabold text-[#526779]">Đơn vị tính *</span><input value={newSupply.unit} onChange={(event) => setNewSupply((current) => ({ ...current, unit: event.target.value }))} className="field-input" placeholder="Cái" /></label><label className="block space-y-1.5"><span className="text-xs font-extrabold text-[#526779]">Mức tồn tối thiểu</span><input value={newSupply.minimumQuantity} inputMode="numeric" onChange={(event) => setNewSupply((current) => ({ ...current, minimumQuantity: event.target.value.replace(/[^0-9]/g, "") }))} className="field-input" /></label><label className="block space-y-1.5"><span className="text-xs font-extrabold text-[#526779]">Vị trí kho</span><input value={newSupply.location} onChange={(event) => setNewSupply((current) => ({ ...current, location: event.target.value }))} className="field-input" placeholder="VD: Kệ A-01" /></label><label className="block space-y-1.5 sm:col-span-2"><span className="text-xs font-extrabold text-[#526779]">Ghi chú</span><textarea value={newSupply.note} onChange={(event) => setNewSupply((current) => ({ ...current, note: event.target.value }))} className="field-input min-h-20" /></label></div><p className="mt-3 rounded-lg border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-2 text-[11px] leading-5 text-[#4B8884]">Đơn giá <b>{money(createForLine.unitPrice)}</b>, thuế và Nhà cung cấp sẽ được lấy từ dòng Hóa đơn. Phụ kiện sẽ được tạo với tồn kho bằng số lượng tiếp nhận.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={isWorking} onClick={() => setCreateForLine(null)} className="filter-action">Hủy</button><button type="button" disabled={!newSupply.code.trim() || !newSupply.name.trim() || !newSupply.unit.trim() || !newSupply.quantity || Number(newSupply.quantity) <= 0 || Number(newSupply.quantity) > Number(createForLine.quantity) || isWorking} onClick={confirmCreate} className="primary-action"><Plus size={15} />{isWorking ? "Đang tạo..." : "Tạo & tiếp nhận"}</button></div></section></>}{scannerOpen && <BarcodeCameraScanner onClose={() => setScannerOpen(false)} onDetected={(value) => { setNewSupply((current) => ({ ...current, code: value })); setScannerOpen(false); }} />}</>;
}
