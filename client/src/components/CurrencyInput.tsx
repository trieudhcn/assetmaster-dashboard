import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatVndInput, numberToVietnameseWords, parseVndAmount } from "@/lib/formatters";

type CurrencyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  showWords?: boolean;
};

export function CurrencyInput({ value, onChange, suffix = "VNĐ", showWords = false, className = "", ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatVndInput(value));
  useEffect(() => setDisplayValue(formatVndInput(value)), [value]);

  const commit = (raw: string) => {
    const parsed = parseVndAmount(raw);
    const next = parsed === null ? "" : String(parsed);
    setDisplayValue(parsed === null ? "" : formatVndInput(parsed));
    onChange(next);
  };

  return (
    <div className="relative w-full">
      <input
        {...props}
        value={displayValue}
        inputMode="numeric"
        onChange={(event) => commit(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (parseVndAmount(pasted) === null) return;
          event.preventDefault();
          commit(pasted);
        }}
        className={`field-input w-full pr-[6.5rem] ${className}`}
      />
      {displayValue && (
        <button type="button" aria-label="Xóa số tiền" title="Xóa số tiền" onClick={() => commit("")} className="absolute right-11 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]">
          <X size={14} />
        </button>
      )}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#087A6A]">{suffix}</span>
      {showWords && displayValue && <p className="mt-1 pl-1 text-[10px] font-medium leading-4 text-[#8AA0B6]">{numberToVietnameseWords(displayValue)}</p>}
    </div>
  );
}
