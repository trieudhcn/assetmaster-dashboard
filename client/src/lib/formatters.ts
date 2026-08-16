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
