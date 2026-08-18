import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatVndInput, isInvalidVndInput, numberToVietnameseWords, parseVndAmount } from "@/lib/formatters";

type CurrencyInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  showWords?: boolean;
};

export function CurrencyInput({ value, onChange, suffix = "VNĐ", showWords = false, className = "", ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatVndInput(value));
  const [formatError, setFormatError] = useState(false);
  useEffect(() => setDisplayValue(formatVndInput(value)), [value]);

  const commit = (raw: string, fromPaste = false) => {
    const normalizedRaw = fromPaste ? raw : raw.replace(/[^0-9.,]/g, "");
    const invalid = isInvalidVndInput(normalizedRaw);
    setFormatError(invalid);
    if (invalid) { setDisplayValue(normalizedRaw); return; }
    const parsed = parseVndAmount(normalizedRaw);
    const next = parsed === null ? "" : String(parsed);
    setDisplayValue(parsed === null ? "" : formatVndInput(parsed));
    onChange(next);
  };

  return (
    <div className="w-full">
      <div className="relative w-full">
        <input
        {...props}
        value={displayValue}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        onChange={(event) => commit(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          event.preventDefault();
          commit(pasted, true);
        }}
        aria-invalid={formatError || undefined}
        className={`field-input w-full pr-[6.5rem] ${formatError ? "border-[#B44545] bg-[#FFF7F7] text-[#9E2C2C] focus:border-[#B44545] focus:ring-[#F7C6C6]" : ""} ${className}`}
        />
        {displayValue && (
          <button type="button" aria-label="Xóa số tiền" title="Xóa số tiền" onClick={() => commit("")} className="absolute right-11 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]">
            <X size={14} />
          </button>
        )}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold leading-none text-[#087A6A]">{suffix}</span>
      </div>
      {formatError && <p className="mt-1 pl-1 text-[10px] font-medium leading-4 text-[#B44545]">Đơn giá chỉ nhận chữ số; có thể dán số kèm ₫ hoặc VNĐ.</p>}
      {showWords && displayValue && <p className="mt-1 pl-1 text-[10px] font-medium leading-4 text-[#8AA0B6]">{numberToVietnameseWords(displayValue)}</p>}
    </div>
  );
}
