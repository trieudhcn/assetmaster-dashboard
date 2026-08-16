export function formatVnd(value: number | string | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(numericValue)) return "0";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(numericValue));
}

export type CurrencyDisplayMode = "full" | "million" | "billion";

export function formatVndWithUnit(value: number | string | null | undefined): string {
  return `${formatVnd(value)} VNĐ`;
}

export function formatCompactVnd(value: number | string | null | undefined, mode: CurrencyDisplayMode): string {
  const numericValue = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(numericValue)) return mode === "billion" ? "0 tỷ đồng" : mode === "million" ? "0 triệu đồng" : "0 VNĐ";
  if (mode === "billion") return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(numericValue / 1_000_000_000)} tỷ đồng`;
  if (mode === "million") return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(numericValue / 1_000_000)} triệu đồng`;
  return `${formatVnd(numericValue)} VNĐ`;
}
