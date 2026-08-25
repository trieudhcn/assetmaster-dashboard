export type DigitalExpiryAlertKind = "license" | "service";

export function createDigitalExpiryAlertId(kind: DigitalExpiryAlertKind, id: number) {
  return `${kind}-${id}`;
}

export function buildDigitalExpiryAlertUrl(currentUrl: string, kind: DigitalExpiryAlertKind, searchValue: string) {
  const url = new URL(currentUrl);
  url.searchParams.set("view", "licenses");
  url.searchParams.set("licenseTab", kind === "service" ? "services" : "licenses");
  if (searchValue) url.searchParams.set("licenseSearch", searchValue);
  else url.searchParams.delete("licenseSearch");
  return url;
}
