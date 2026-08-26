import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("License theo thiết bị trong chi tiết tài sản", () => {
  it("chỉ hiển thị ô License khi tài sản có cấp phát còn hoạt động", () => {
    const home = read("client/src/pages/Home.tsx");

    expect(home).toContain("deviceLicenseAssignmentsQuery");
    expect(home).toContain('assignment.assetId === persistedAsset.id && assignment.status === "active"');
    expect(home).toContain("if (!activeAssignments.length) return;");
    expect(home).toContain('label.textContent = "License đang cấp cho thiết bị"');
    expect(home).toContain("data-asset-device-license-detail");
  });
});
