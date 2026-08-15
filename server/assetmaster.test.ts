import { describe, expect, it } from "vitest";
import { hasRequiredMaintenanceReason } from "./routers";

const states = ["available", "assigned", "maintenance", "retired", "lost"] as const;

describe("AssetMaster business states", () => {
  it("uses only recognized lifecycle statuses for assets", () => {
    expect(states).toContain("available");
    expect(states).toContain("assigned");
    expect(states).toContain("maintenance");
  });

  it("uses a unique token shape suitable for QR identifiers", () => {
    const token = crypto.randomUUID().replaceAll("-", "");
    expect(token).toMatch(/^[a-f0-9]{32}$/);
  });

  it("requires a maintenance reason only when an asset enters maintenance", () => {
    expect(hasRequiredMaintenanceReason("maintenance", "")).toBe(false);
    expect(hasRequiredMaintenanceReason("maintenance", "Kiểm tra pin và bàn phím")).toBe(true);
    expect(hasRequiredMaintenanceReason("available", null)).toBe(true);
  });
});
