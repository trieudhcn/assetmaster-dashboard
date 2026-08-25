import { describe, expect, it } from "vitest";
import { buildDigitalExpiryAlertUrl, createDigitalExpiryAlertId } from "../client/src/lib/digitalExpiryAlerts";

describe("digital expiry dashboard alerts", () => {
  it("opens an expiring license in the licenses tab with its search context", () => {
    const url = buildDigitalExpiryAlertUrl("https://assetmaster.test/?view=dashboard", "license", "LIC-2026-001");

    expect(url.pathname + url.search).toBe("/?view=licenses&licenseTab=licenses&licenseSearch=LIC-2026-001");
  });

  it("opens an expiring service in the services tab and clears an obsolete search", () => {
    const url = buildDigitalExpiryAlertUrl("https://assetmaster.test/?view=dashboard&licenseSearch=old", "service", "");

    expect(url.pathname + url.search).toBe("/?view=licenses&licenseTab=services");
  });

  it("creates stable reviewed-alert identifiers for licenses and services", () => {
    expect(createDigitalExpiryAlertId("license", 17)).toBe("license-17");
    expect(createDigitalExpiryAlertId("service", 24)).toBe("service-24");
  });
});
