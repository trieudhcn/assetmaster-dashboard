export type ExpiryFilter = "all" | "overdue" | "next7" | "next30" | "next90" | "noExpiry";
export type ExpirySortDirection = "asc" | "desc";

export function getDaysUntilExpiry(value: Date | string | null | undefined, now = Date.now()) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.ceil((timestamp - now) / 86_400_000) : null;
}

export function matchesExpiryFilter(days: number | null, filter: ExpiryFilter) {
  if (filter === "all") return true;
  if (filter === "noExpiry") return days === null;
  if (days === null) return false;
  if (filter === "overdue") return days < 0;
  if (filter === "next7") return days >= 0 && days <= 7;
  if (filter === "next30") return days >= 0 && days <= 30;
  return days >= 0 && days <= 90;
}

export function sortByExpiry<T extends { expiresAt: Date | string | null }>(items: readonly T[], direction: ExpirySortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftTime = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.NaN;
    const rightTime = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.NaN;
    const leftMissing = !Number.isFinite(leftTime);
    const rightMissing = !Number.isFinite(rightTime);
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;
    return (leftTime - rightTime) * multiplier;
  });
}
