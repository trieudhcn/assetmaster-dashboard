import type { InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";

type DatePickerFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onChange: (value: string) => void;
};

export function DatePickerField({ onChange, className = "", disabled, ...props }: DatePickerFieldProps) {
  const openPicker = (input: HTMLInputElement | null) => {
    if (!input || disabled) return;
    input.focus();
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <div className="relative">
      <input
        {...props}
        type="date"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        onClick={(event) => openPicker(event.currentTarget)}
        className={`field-input date-picker-input pr-11 ${className}`}
      />
      <button
        type="button"
        aria-label={props["aria-label"] ? `Mở lịch: ${props["aria-label"]}` : "Mở lịch chọn ngày"}
        disabled={disabled}
        onClick={(event) => openPicker(event.currentTarget.previousElementSibling as HTMLInputElement | null)}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#087A6A] transition hover:bg-[#ECF8F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8C8C]/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CalendarDays size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
