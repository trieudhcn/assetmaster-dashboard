export type NamedCatalogOption = { id: number; name: string };

export function normalizeVietnameseSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesVietnameseSearch(value: string, query: string) {
  return normalizeVietnameseSearch(value).includes(normalizeVietnameseSearch(query));
}

export function canCreateCatalogOption(keyword: string, matchedCount: number) {
  return matchedCount === 0 && keyword.trim().length >= 2;
}

export function getPaginationWindow(totalItems: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const startRecord = totalItems === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalItems);
  return { currentPage, totalPages, startIndex, startRecord, endRecord };
}

export function filterNamedCatalogOptions<T extends NamedCatalogOption>(items: T[], keyword: string) {
  return items.filter((item) => matchesVietnameseSearch(item.name, keyword));
}
