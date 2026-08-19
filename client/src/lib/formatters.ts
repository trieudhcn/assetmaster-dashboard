export function parseVndAmount(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  const raw = String(value ?? "").trim().replace(/\s|VNĐ|₫/gi, "");
  if (!raw) return null;
  const normalized = raw.replace(/[^0-9,.-]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const tail = separatorIndex >= 0 ? normalized.slice(separatorIndex + 1).replace(/\D/g, "") : "";
  const integerPart = separatorIndex >= 0 && tail.length > 0 && tail.length <= 2 ? normalized.slice(0, separatorIndex) : normalized;
  const numericValue = Number(integerPart.replace(/\D/g, ""));
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatVnd(value: number | string | null | undefined): string {
  const numericValue = parseVndAmount(value);
  return numericValue === null ? "0" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(numericValue);
}

export function formatVndInput(value: number | string | null | undefined): string {
  const numericValue = parseVndAmount(value);
  return numericValue === null ? "" : formatVnd(numericValue);
}

/** Chỉ giữ chữ số nguyên cho các trường nhập đơn giá. */
export function normalizeVndIntegerInput(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isInvalidVndInput(value: string | number | null | undefined): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const compact = raw.replace(/\s|VNĐ|VND|₫/gi, "");
  if (!compact) return true;
  return !(/^\d+$/.test(compact) || /^\d{1,3}(?:[.,]\d{3})+$/.test(compact) || /^\d+[.,]\d{1,2}$/.test(compact));
}

const vietnameseDigits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const vietnameseScales = ["", "nghìn", "triệu", "tỷ"];

function readThreeDigits(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];
  if (hundreds > 0 || full) parts.push(`${vietnameseDigits[hundreds]} trăm`);
  if (tens > 1) {
    parts.push(`${vietnameseDigits[tens]} mươi`);
    if (units === 1) parts.push("mốt");
    else if (units === 4) parts.push("tư");
    else if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(vietnameseDigits[units]);
  } else if (tens === 1) {
    parts.push("mười");
    if (units === 5) parts.push("lăm");
    else if (units > 0) parts.push(vietnameseDigits[units]);
  } else if (units > 0) {
    if (hundreds > 0 || full) parts.push("lẻ");
    parts.push(vietnameseDigits[units]);
  }
  return parts.join(" ");
}

export function numberToVietnameseWords(value: number | string | null | undefined): string {
  const numericValue = parseVndAmount(value);
  if (numericValue === null || numericValue === 0) return "Không đồng";
  if (numericValue < 0) return `Âm ${numberToVietnameseWords(Math.abs(numericValue))}`;
  const groups: number[] = [];
  let remaining = Math.floor(numericValue);
  while (remaining > 0) { groups.push(remaining % 1000); remaining = Math.floor(remaining / 1000); }
  const parts: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    const full = index < groups.length - 1;
    const words = readThreeDigits(group, full);
    const scaleIndex = index % vietnameseScales.length;
    const cycle = Math.floor(index / vietnameseScales.length);
    const scale = cycle > 0 ? `${vietnameseScales[scaleIndex]} ${"tỷ ".repeat(cycle).trim()}`.trim() : vietnameseScales[scaleIndex];
    parts.push(`${words}${scale ? ` ${scale}` : ""}`);
  }
  const words = `${parts.join(" ").replace(/\s+/g, " ").trim()} đồng`;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type CurrencyDisplayMode = "full" | "million" | "billion";

export function formatVndWithUnit(value: number | string | null | undefined): string {
  return `${formatVnd(value)} VNĐ`;
}

export function formatCompactVnd(value: number | string | null | undefined, mode: CurrencyDisplayMode): string {
  const numericValue = parseVndAmount(value);
  if (numericValue === null) return mode === "billion" ? "0 tỷ đồng" : mode === "million" ? "0 triệu đồng" : "0 VNĐ";
  if (mode === "billion") return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(numericValue / 1_000_000_000)} tỷ đồng`;
  if (mode === "million") return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(numericValue / 1_000_000)} triệu đồng`;
  return `${formatVnd(numericValue)} VNĐ`;
}
