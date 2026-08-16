export function formatVnd(value: number | string | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(numericValue)) return "0";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(numericValue));
}

export function formatVndWithUnit(value: number | string | null | undefined): string {
  return `${formatVnd(value)} VNĐ`;
}
