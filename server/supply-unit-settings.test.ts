import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("standard supply unit settings", () => {
  it("provides admin CRUD and links active units to the import template", () => {
    const settings = readProjectFile("client/src/components/SupplyUnitSettings.tsx");
    const supplies = readProjectFile("client/src/pages/SuppliesInventoryView.tsx");
    const routers = readProjectFile("server/routers.ts");

    expect(settings).toContain("Đơn vị tính chuẩn");
    expect(settings).toContain('w-[calc(100%-2rem)] max-w-[1100px]');
    expect(settings).toContain("supplyUnits.create");
    expect(settings).toContain("supplyUnits.update");
    expect(settings).toContain("supplyUnits.remove");
    expect(settings).toContain("{usageCount} phụ kiện");
    expect(settings).toContain("Đang dùng");
    expect(settings).toContain("title=\"Sửa đơn vị\"");
    expect(settings).toContain("confirmUsage: usageCount > 0");
    expect(supplies).toContain("activeSupplyUnits");
    expect(supplies).toContain("availableSupplyUnits");
    expect(routers).toContain("supplyUnits: router");
    expect(routers).toContain("deleteSupplyUnit");
    expect(routers).toContain("countInventorySuppliesByUnit");
    expect(routers).toContain("confirmUsage");
  });
});
