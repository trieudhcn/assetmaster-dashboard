import { Plus, X } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";

export type AssetCatalogOption = { id: number; name: string };

type AssetCatalogDropdownsProps = {
  vendorId?: number;
  brandId?: number;
  vendorOptions: AssetCatalogOption[];
  brandOptions: AssetCatalogOption[];
  quickEntryType: "vendor" | "brand" | null;
  quickEntryName: string;
  onQuickEntryTypeChange: (value: "vendor" | "brand" | null) => void;
  onQuickEntryNameChange: (value: string) => void;
  onVendorChange: (value?: AssetCatalogOption) => void;
  onBrandChange: (value?: AssetCatalogOption) => void;
  onCreateVendor: (name: string) => void;
  onCreateBrand: (name: string) => void;
  creatingVendor?: boolean;
  creatingBrand?: boolean;
};

export function AssetCatalogDropdowns({
  vendorId,
  brandId,
  vendorOptions,
  brandOptions,
  quickEntryType,
  quickEntryName,
  onQuickEntryTypeChange,
  onQuickEntryNameChange,
  onVendorChange,
  onBrandChange,
  onCreateVendor,
  onCreateBrand,
  creatingVendor = false,
  creatingBrand = false,
}: AssetCatalogDropdownsProps) {
  const saveQuickEntry = () => {
    const name = quickEntryName.trim();
    if (name.length < 2) return;
    if (quickEntryType === "vendor") onCreateVendor(name);
    if (quickEntryType === "brand") onCreateBrand(name);
  };

  const renderQuickEntry = (kind: "vendor" | "brand") => quickEntryType === kind ? (
    <div className="mt-2 flex gap-2">
      <input
        autoFocus
        value={quickEntryName}
        onChange={(event) => onQuickEntryNameChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") saveQuickEntry(); if (event.key === "Escape") onQuickEntryTypeChange(null); }}
        placeholder={kind === "vendor" ? "Tên Nhà cung cấp mới" : "Tên Hãng mới"}
        className="field-input h-9 min-w-0 flex-1 text-xs"
      />
      <button type="button" onClick={saveQuickEntry} disabled={kind === "vendor" ? creatingVendor : creatingBrand} className="rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-wait disabled:opacity-60">Lưu</button>
      <button type="button" onClick={() => { onQuickEntryNameChange(""); onQuickEntryTypeChange(null); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#DDE7F0] text-[#60758A] hover:bg-[#F7FAFC]" aria-label="Hủy tạo mới"><X size={14} /></button>
    </div>
  ) : (
    <button type="button" onClick={() => { onQuickEntryNameChange(""); onQuickEntryTypeChange(kind); }} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#087A6A] hover:underline"><Plus size={13} />Thêm {kind === "vendor" ? "Nhà cung cấp" : "Hãng"}</button>
  );

  return (
    <div className="form-helper-grid sm:col-span-2 grid gap-3 rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-4 sm:grid-cols-2">
      <div className="min-w-0">
        <label className="field-label">Nhà cung cấp</label>
        <SearchableSelect
          value={vendorId ? String(vendorId) : ""}
          onChange={(value) => onVendorChange(vendorOptions.find((item) => String(item.id) === value))}
          options={vendorOptions.map((item) => ({ value: String(item.id), label: item.name }))}
          placeholder="Chọn Nhà cung cấp"
          searchPlaceholder="Tìm trong Nhà cung cấp..."
          emptyText="Không tìm thấy Nhà cung cấp"
          className="w-full"
        />
        {renderQuickEntry("vendor")}
      </div>
      <div className="min-w-0">
        <label className="field-label">Hãng</label>
        <SearchableSelect
          value={brandId ? String(brandId) : ""}
          onChange={(value) => onBrandChange(brandOptions.find((item) => String(item.id) === value))}
          options={brandOptions.map((item) => ({ value: String(item.id), label: item.name }))}
          placeholder="Chọn Hãng"
          searchPlaceholder="Tìm trong Hãng..."
          emptyText="Không tìm thấy Hãng"
          className="w-full"
        />
        {renderQuickEntry("brand")}
      </div>
    </div>
  );
}
