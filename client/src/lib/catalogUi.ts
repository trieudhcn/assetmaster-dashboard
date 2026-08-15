export type NamedCatalogOption = { id: number; name: string };

export function getPaginationWindow(totalItems: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const startRecord = totalItems === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalItems);
  return { currentPage, totalPages, startIndex, startRecord, endRecord };
}

export function filterNamedCatalogOptions<T extends NamedCatalogOption>(items: T[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");
  return items.filter((item) => item.name.toLocaleLowerCase("vi-VN").includes(normalizedKeyword));
}
