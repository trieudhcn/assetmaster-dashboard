const wholeNumberUnitNames = new Set([
  "cái",
  "cai",
  "bộ",
  "bo",
  "chiếc",
  "chiec",
  "hộp",
  "hop",
  "gói",
  "goi",
  "cuộn",
  "cuon",
  "chai",
  "can",
  "thùng",
  "thung",
  "ram",
]);

function normaliseUnit(unit: string | null | undefined) {
  return String(unit || "").trim().toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toQuantityNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requiresWholeQuantity(unit: string | null | undefined) {
  return wholeNumberUnitNames.has(normaliseUnit(unit));
}

export function hasFractionalQuantity(value: string | number | null | undefined) {
  const quantity = toQuantityNumber(value);
  return quantity !== null && !Number.isInteger(quantity);
}

export function isInvalidWholeQuantity(unit: string | null | undefined, value: string | number | null | undefined) {
  return requiresWholeQuantity(unit) && hasFractionalQuantity(value);
}

export function formatQuantity(value: string | number | null | undefined) {
  const quantity = toQuantityNumber(value);
  if (quantity === null) return "0";
  return new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(quantity) ? 0 : 3 }).format(quantity);
}

export function quantityValueForExport(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return value;
  const quantity = toQuantityNumber(value);
  return quantity === null ? value : quantity;
}
