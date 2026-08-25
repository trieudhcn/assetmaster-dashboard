import React, { useMemo, useState } from "react";
import { vi } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "data-purchase-date-picker"?: boolean;
};

function parseDate(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function openNativeDatePickerFromIcon(input: HTMLInputElement, clientX: number) {
  const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
  if (input.type !== "date" || typeof pickerInput.showPicker !== "function") return false;
  const bounds = input.getBoundingClientRect();
  if (clientX < bounds.right - 48) return false;
  pickerInput.showPicker();
  return true;
}

if (typeof document !== "undefined" && !document.documentElement.dataset.assetmasterNativeDatePicker) {
  document.documentElement.dataset.assetmasterNativeDatePicker = "ready";
  document.addEventListener("pointerdown", (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.closest('[data-licenses-services-dialog]')) return;
    try {
      if (openNativeDatePickerFromIcon(input, event.clientX)) event.preventDefault();
    } catch {
      // Older browsers may decline programmatic native picker invocation; their own indicator remains available.
    }
  }, true);
}

export function DatePickerField({ value, onChange, className = "", disabled, placeholder = "Chọn ngày", "aria-label": ariaLabel, "data-purchase-date-picker": purchaseDatePicker }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const displayValue = selectedDate ? selectedDate.toLocaleDateString("vi-VN") : placeholder;
  const label = ariaLabel || "Ngày";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-purchase-date-picker={purchaseDatePicker || undefined}
          aria-label={`Mở lịch: ${label}`}
          className={`field-input flex w-full items-center justify-between gap-3 pr-3 text-left ${selectedDate ? "text-[#193B57]" : "text-[#A8B8C5]"} ${className}`}
        >
          <span className="min-w-0 truncate">{displayValue}</span>
          <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-[#087A6A]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="z-[180] w-[238px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[#CDE5E5] bg-white p-0 shadow-[0_14px_34px_rgba(16,42,67,0.14)]">
        <div className="flex items-center justify-between border-b border-[#E7EEF3] bg-[#F7FCFC] px-2.5 py-2">
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0F8C8C]">Lịch AssetMaster</div>
            <div className="mt-0.5 truncate text-[11px] font-bold text-[#193B57]">{selectedDate ? selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "Chọn ngày cần áp dụng"}</div>
          </div>
          {selectedDate && <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="grid h-7 w-7 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]" aria-label={`Xóa ${label}`}><X size={14} /></button>}
        </div>
        <div className="p-1.5">
          <Calendar
            mode="single"
            locale={vi}
            captionLayout="dropdown"
            fromYear={new Date().getFullYear() - 10}
            toYear={new Date().getFullYear() + 10}
            selected={selectedDate}
            onSelect={(date) => { if (!date) return; onChange(toIsoDate(date)); setOpen(false); }}
            className="w-full p-0 [--cell-size:1.55rem] [&_.rdp-month]:gap-2 [&_.rdp-week]:mt-1 [&_.rdp-button]:text-xs [&_[data-selected-single=true]]:bg-[#0F8C8C] [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]]:shadow-[0_4px_10px_rgba(15,140,140,0.25)] [&_.rdp-button:hover]:bg-[#E6F6F2] [&_.rdp-caption_label]:font-extrabold [&_.rdp-caption_label]:font-extrabold [&_.rdp-caption_label]:text-[#193B57] [&_.rdp-dropdown]:rounded-md [&_.rdp-dropdown]:border-[#CDE5E5] [&_.rdp-dropdown]:bg-white [&_.rdp-dropdown]:px-1.5 [&_.rdp-dropdown]:py-1 [&_.rdp-dropdown]:text-xs [&_.rdp-dropdown]:font-bold [&_.rdp-dropdown]:text-[#193B57] [&_.rdp-dropdown]:outline-none [&_.rdp-dropdown]:focus:ring-2 [&_.rdp-dropdown]:focus:ring-[#A9DDD6] [&_.rdp-caption_label]:font-extrabold [&_.rdp-caption_label]:text-[#193B57] [&_.rdp-weekday]:text-[9px] [&_.rdp-weekday]:font-extrabold [&_.rdp-weekday]:uppercase [&_.rdp-weekday]:tracking-[0.08em] [&_.rdp-weekday]:text-[#8AA0B6]"
          />
        </div>
        <div className="flex items-center justify-between border-t border-[#E7EEF3] px-3 py-2">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-[10px] font-bold text-[#60758A] transition hover:text-[#087A6A]">Xóa ngày</button>
          <button type="button" onClick={() => { const today = new Date(); onChange(toIsoDate(today)); setOpen(false); }} className="text-[10px] font-extrabold text-[#087A6A] transition hover:text-[#0A6666]">Hôm nay</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
