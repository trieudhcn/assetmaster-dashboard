import { describe, expect, it } from "vitest";
import { buildLicenseAssignmentsByDepartment } from "../client/src/lib/licenseAssignmentsByDepartment";

describe("license assignment chart by department", () => {
  it("only counts active allocations and groups them by the employee department", () => {
    const chartData = buildLicenseAssignmentsByDepartment(
      [
        { status: "active", userId: 1 },
        { status: "active", userId: 1 },
        { status: "active", userId: 2 },
        { status: "revoked", userId: 2 },
        { status: "active", userId: null },
      ],
      [{ id: 1, departmentId: 10 }, { id: 2, departmentId: 20 }],
      [{ id: 10, name: "Kế toán" }, { id: 20, name: "Kỹ thuật" }],
    );

    expect(chartData).toEqual([
      { departmentId: 10, name: "Kế toán", assigned: 2 },
      { departmentId: 20, name: "Kỹ thuật", assigned: 1 },
      { departmentId: "unassigned", name: "Chưa gán phòng ban", assigned: 1 },
    ]);
  });
});
