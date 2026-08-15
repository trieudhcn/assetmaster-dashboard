import { describe, expect, it } from "vitest";
import { canUndoImport, fieldChanges, getImportUndoDeadline } from "./routers";

describe("asset field history", () => {
  it("records only the fields that changed during an import", () => {
    const changes = fieldChanges(7, { name: "Laptop cũ", location: "Kho A", status: "available" }, { name: "Laptop mới", location: "Kho A", status: "maintenance" }, "import", 1, "Quản trị viên", 3);
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetId: 7, importSessionId: 3, fieldName: "name", previousValue: "Laptop cũ", nextValue: "Laptop mới", source: "import" }),
      expect.objectContaining({ fieldName: "status", previousValue: "available", nextValue: "maintenance" }),
    ]));
    expect(changes.find((change) => change.fieldName === "location")).toBeUndefined();
  });

  it("can describe an undo as the inverse field update", () => {
    const changes = fieldChanges(8, { maintenanceReason: "Thay pin", isArchived: false }, { maintenanceReason: null, isArchived: true }, "undo", 1, "Quản trị viên", 4);
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldName: "maintenanceReason", previousValue: "Thay pin", nextValue: null, source: "undo" }),
      expect.objectContaining({ fieldName: "isArchived", previousValue: "false", nextValue: "true" }),
    ]));
  });

  it("allows undo for 24 hours and rejects an expired import session", () => {
    const createdAt = new Date("2026-08-15T00:00:00.000Z");
    expect(getImportUndoDeadline(createdAt).toISOString()).toBe("2026-08-16T00:00:00.000Z");
    expect(canUndoImport(createdAt, new Date("2026-08-15T23:59:59.999Z"))).toBe(true);
    expect(canUndoImport(createdAt, new Date("2026-08-16T00:00:00.001Z"))).toBe(false);
  });
});
