import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { matchesVietnameseSearch } from "@/lib/catalogUi";

export type SearchableSelectOption = { value: string; label: string; searchText?: string };

const normalizeForSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MAX_VISIBLE_OPTIONS = 120;

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
  loading?: boolean;
  className?: string;
  optionLabels?: Record<string, string>;
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: (query: string) => void;
  /** Render the menu at document level when an ancestor clips overflow, such as a scrollable data table. */
  menuPortal?: boolean;
};

export function SearchableSelect({ value, onChange, options, placeholder = "Chọn một giá trị", searchPlaceholder = "Tìm trong danh sách...", disabled = false, loading = false, className = "", optionLabels, emptyText = "Không tìm thấy kết quả", emptyActionLabel, onEmptyAction, menuPortal = true }: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuAlign, setMenuAlign] = useState<"left" | "right">("left");
  const [menuReady, setMenuReady] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 280 });
  const [menuPlacement, setMenuPlacement] = useState<"bottom" | "top">("bottom");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const presentedOptions = useMemo(() => {
    const isAssetStatusOptions = options.some((option) => option.value === "returned") && options.some((option) => option.value === "maintenance") && options.some((option) => option.value === "active");
    const displayOptions = isAssetStatusOptions && !options.some((option) => option.value === "retired") ? [...options, { value: "retired", label: "Khấu hao/Thanh lý" }] : options;
    return displayOptions.map((option) => option.value === "maintenance" && option.label === "Bảo trì" ? { ...option, label: "Bảo hành/Sửa chữa", searchText: `${option.searchText || ""} Bảo trì Bảo hành Sửa chữa` } : option);
  }, [options]);
  const selected = useMemo(() => presentedOptions.find((option) => option.value === value), [presentedOptions, value]);
  const filteredOptions = useMemo(() => presentedOptions.filter((option) => matchesVietnameseSearch(`${option.label} ${option.searchText || ""}`, query)).slice(0, MAX_VISIBLE_OPTIONS), [presentedOptions, query]);

  const closeMenu = () => {
    setOpen(false);
    setMenuReady(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setMenuMounted(false), 180);
  };
  const openMenu = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setPortalContainer(rootRef.current?.closest<HTMLElement>('[data-slot="dialog-content"]') || (typeof document === "undefined" ? null : document.body));
    setMenuReady(false);
    setMenuMounted(true);
    requestAnimationFrame(() => setOpen(true));
  };
  const selectHighlighted = (index: number) => {
    const option = filteredOptions[index];
    if (!option) return;
    onChange(option.value);
    closeMenu();
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }
    const measureMenu = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(280, Math.max(240, rect.width));
      const viewportWidth = Math.max(180, window.innerWidth - 16);
      const boundedWidth = Math.min(width, viewportWidth);
      const estimatedMenuHeight = 340;
      const alignRight = rect.right + boundedWidth > window.innerWidth - 12;
      const openUpward = rect.bottom + 6 + estimatedMenuHeight > window.innerHeight - 8 && rect.top > estimatedMenuHeight;
      const rawLeft = alignRight ? rect.right - boundedWidth : rect.left;
      const left = Math.min(Math.max(8, rawLeft), Math.max(8, window.innerWidth - boundedWidth - 8));
      setMenuAlign(alignRight ? "right" : "left");
      setMenuPlacement(openUpward ? "top" : "bottom");
      setMenuPosition({ top: openUpward ? rect.top - 6 : rect.bottom + 6, left, width: boundedWidth });
      setMenuReady(true);
    };
    requestAnimationFrame(() => { measureMenu(); searchInputRef.current?.focus(); });
    window.addEventListener("resize", measureMenu);
    window.addEventListener("scroll", measureMenu, true);
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); window.removeEventListener("resize", measureMenu); window.removeEventListener("scroll", measureMenu, true); };
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(Math.max(0, filteredOptions.findIndex((option) => option.value === value)));
  }, [query, value, open]);

  const portalOpensUpward = menuPortal && menuPlacement === "top";
  const menuMotion = open ? (portalOpensUpward ? "-translate-y-full scale-100 opacity-100" : "translate-y-0 scale-100 opacity-100") : (portalOpensUpward ? "pointer-events-none -translate-y-[calc(100%+0.25rem)] scale-[0.98] opacity-0" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0");
  const menu = menuMounted && menuReady ? <div ref={menuRef} style={menuPortal ? { top: menuPosition.top, left: menuPosition.left, width: menuPosition.width } : undefined} className={`${menuPortal ? "fixed z-[9999]" : `absolute ${menuAlign === "right" ? "right-0 left-auto" : "left-0 right-auto"} top-[calc(100%+0.35rem)] z-[95] w-[min(280px,calc(100vw-1rem))]`} min-w-0 overflow-hidden rounded-xl border border-[#CDE5E5] bg-white shadow-[0_16px_36px_rgba(16,42,67,0.18)] transition-[opacity,transform] duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] ${menuMotion}`} role="listbox">
    <div className="border-b border-[#E7EEF3] p-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]" />
        <input ref={searchInputRef} value={query} onChange={(event) => { setQuery(event.target.value); setHighlightedIndex(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setHighlightedIndex((current) => filteredOptions.length ? (current + 1) % filteredOptions.length : 0); } else if (event.key === "ArrowUp") { event.preventDefault(); setHighlightedIndex((current) => filteredOptions.length ? (current - 1 + filteredOptions.length) % filteredOptions.length : 0); } else if (event.key === "Enter") { event.preventDefault(); selectHighlighted(highlightedIndex); } else if (event.key === "Escape") { event.preventDefault(); closeMenu(); } }} placeholder={searchPlaceholder} aria-label={searchPlaceholder} aria-activedescendant={filteredOptions[highlightedIndex] ? `searchable-option-${filteredOptions[highlightedIndex].value}` : undefined} className="h-9 w-full rounded-lg border border-[#DDE7F0] bg-[#FBFCFD] pl-9 pr-9 text-xs font-semibold text-[#193B57] outline-none focus:border-[#0F8C8C]" />
        {query && <button type="button" aria-label="Xóa tìm kiếm trong dropdown" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] hover:bg-[#ECF8F7] hover:text-[#087A6A]"><X size={14} /></button>}
      </div>
    </div>
    <div className="max-h-64 overflow-y-auto p-1">
      {filteredOptions.map((option, index) => <button type="button" role="option" id={`searchable-option-${option.value}`} aria-selected={option.value === value} key={option.value} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => selectHighlighted(index)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#193B57] transition ${index === highlightedIndex ? "bg-[#ECF8F7]" : "hover:bg-[#ECF8F7]"} aria-selected:bg-[#E6F6F2]`}>
        <span className="min-w-0 truncate"><HighlightedLabel text={option.label} query={query} /></span>
        {option.value === value && <Check size={15} className="shrink-0 text-[#0F8C8C]" />}
      </button>)}
      {filteredOptions.length === MAX_VISIBLE_OPTIONS && <div className="px-3 py-1 text-[10px] font-semibold text-[#8AA0B6]">Hiển thị {MAX_VISIBLE_OPTIONS} kết quả đầu tiên · nhập thêm từ khóa để lọc</div>}
      {filteredOptions.length === 0 && <div className="px-3 py-5 text-center text-xs font-semibold text-[#8AA0B6]"><div>{emptyText}</div>{onEmptyAction && <button type="button" onClick={() => onEmptyAction(query.trim())} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#8BCDC6] bg-[#F4FBFA] px-3 py-2 text-[11px] font-extrabold text-[#087A6A] transition hover:bg-[#ECF8F7]"><Plus size={13} />{emptyActionLabel || "Tạo mới"}</button>}</div>}
    </div>
  </div> : null;

  return <>
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-[96]" : "z-0"} ${className}`}>
      <button type="button" disabled={disabled || loading} aria-busy={loading} aria-haspopup="listbox" aria-expanded={open} onClick={() => open ? closeMenu() : openMenu()} className="field-input flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60">
        <span className={`truncate ${selected ? "text-[#60758A]" : "text-[#8AA0B6]"}`}>{loading ? "Đang tải..." : selected?.label || placeholder}</span>
        {loading ? <Loader2 size={16} className="shrink-0 animate-spin text-[#0F8C8C]" /> : <ChevronDown size={16} className={`shrink-0 text-[#9BAEC0] transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {!menuPortal && menu}
    </div>
    {menuPortal && menu && typeof document !== "undefined" ? createPortal(menu, portalContainer || document.body) : null}
  </>;
}
