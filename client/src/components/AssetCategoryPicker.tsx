import { useState } from "react";
import { X } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";

export type AssetCategoryOption = { id: number; name: string; code?: string | null };

type AssetCategoryPickerProps = {
  value?: number;
  fallbackValue?: string;
  categories: AssetCategoryOption[];
  onChange: (category?: AssetCategoryOption, rawValue?: string) => void;
  onCreate: (name: string) => void;
  creating?: boolean;
};

export function AssetCategoryPicker({ value, fallbackValue = "", categories, onChange, onCreate, creating = false }: AssetCategoryPickerProps) {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const options = categories.length ? categories : [
    { id: 0, name: "CNTT", code: "CNTT" },
    { id: -1, name: "Văn phòng", code: "VP" },
    { id: -2, name: "Thiết bị", code: "TB" },
  ];
  const save = () => {
    const name = draftName.trim();
    if (name.length < 2) return;
    onCreate(name);
  };
  return <div>
    <label className="field-label">Phân loại</label>
    <SearchableSelect
      value={value ? String(value) : fallbackValue}
      onChange={(rawValue) => onChange(options.find((item) => String(item.id) === rawValue), rawValue)}
      options={options.map((item) => ({ value: item.id ? String(item.id) : item.name, label: `${item.name}${item.code ? ` · ${item.code}xxxxx` : ""}`, searchText: item.code || "" }))}
      placeholder="Chọn Phân loại"
      searchPlaceholder="Tìm tên hoặc tiền tố Phân loại..."
      emptyText="Không tìm thấy Phân loại"
      emptyActionLabel="Tạo Phân loại mới"
      onEmptyAction={() => setCreatorOpen(true)}
    />
    {creatorOpen && <div className="mt-2 flex gap-2">
      <input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") setCreatorOpen(false); }} placeholder="Tên Phân loại mới" className="field-input h-9 min-w-0 flex-1 text-xs" />
      <button type="button" onClick={save} disabled={creating} className="rounded-lg bg-[#0F8C8C] px-3 text-xs font-bold text-white hover:bg-[#087A6A] disabled:cursor-wait disabled:opacity-60">Lưu</button>
      <button type="button" onClick={() => { setDraftName(""); setCreatorOpen(false); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#DDE7F0] text-[#60758A] hover:bg-[#F7FAFC]" aria-label="Hủy tạo Phân loại"><X size={14} /></button>
    </div>}
  </div>;
}
