import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { matchesVietnameseSearch } from "@/lib/catalogUi";

export type SearchableSelectOption = { value: string; label: string; searchText?: string };

const normalizeForSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function HighlightedLabel({ text, query }: { text: string; query: string }) {
  const normalizedQuery = normalizeForSearch(query.trim());
  if (!normalizedQuery) return <>{text}</>;
  const start = normalizeForSearch(text).indexOf(normalizedQuery);
  if (start < 0) return <>{text}</>;
  return <>{text.slice(0, start)}<mark className="rounded bg-[#F8D978] px-0.5 text-[#6B4A00]">{text.slice(start, start + normalizedQuery.length)}</mark>{text.slice(start + normalizedQuery.length)}</>;
}

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
};

export function SearchableSelect({ value, onChange, options, placeholder = "Chọn một giá trị", searchPlaceholder = "Tìm trong danh sách...", disabled = false, className = "", emptyText = "Không tìm thấy kết quả" }: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => options.filter((option) => matchesVietnameseSearch(`${option.label} ${option.searchText || ""}`, query)), [options, query]);
  const selectHighlighted = (index: number) => {
    const option = filteredOptions[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }
    requestAnimationFrame(() => searchInputRef.current?.focus());
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(Math.max(0, filteredOptions.findIndex((option) => option.value === value)));
  }, [query, value, open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="field-input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60">
        <span className={`truncate ${selected ? "text-[#60758A]" : "text-[#8AA0B6]"}`}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#9BAEC0] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="absolute left-0 top-[calc(100%+0.35rem)] z-[95] w-full min-w-[240px] overflow-hidden rounded-xl border border-[#CDE5E5] bg-white shadow-[0_16px_36px_rgba(16,42,67,0.18)]" role="listbox">
        <div className="border-b border-[#E7EEF3] p-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" />
            <input ref={searchInputRef} value={query} onChange={(event) => { setQuery(event.target.value); setHighlightedIndex(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setHighlightedIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0); } else if (event.key === "ArrowUp") { event.preventDefault(); setHighlightedIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0); } else if (event.key === "Enter") { event.preventDefault(); selectHighlighted(highlightedIndex); } else if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }} placeholder={searchPlaceholder} aria-label={searchPlaceholder} aria-activedescendant={filteredOptions[highlightedIndex] ? `searchable-option-${filteredOptions[highlightedIndex].value}` : undefined} className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-[#FBFCFD] pl-9 pr-9 text-xs font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]" />
            {query && <button type="button" aria-label="Xóa tìm kiếm trong dropdown" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] hover:bg-[#ECF8F7] hover:text-[#087A6A]"><X size={14} /></button>}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filteredOptions.map((option, index) => <button type="button" role="option" id={`searchable-option-${option.value}`} aria-selected={option.value === value} key={option.value} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => selectHighlighted(index)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#193B57] transition ${index === highlightedIndex ? "bg-[#ECF8F7]" : "hover:bg-[#ECF8F7]"} aria-selected:bg-[#E6F6F2]`}>
            <span className="min-w-0 truncate"><HighlightedLabel text={option.label} query={query} /></span>
            {option.value === value && <Check size={15} className="shrink-0 text-[#0F8C8C]" />}
          </button>)}
          {filteredOptions.length === 0 && <div className="px-3 py-6 text-center text-xs font-semibold text-[#8AA0B6]">{emptyText}</div>}
        </div>
      </div>}
    </div>
  );
}
