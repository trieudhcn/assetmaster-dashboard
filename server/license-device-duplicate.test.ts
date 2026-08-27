import { describe, expect, it } from "vitest";
import { findActiveDeviceLicenseDuplicate } from "../shared/licenseDeviceAssignment";

describe("chặn cấp trùng License theo thiết bị", () => {
  const licenses = [
    { id: 11, licenseTypeId: 5, productName: "Windows 11 Pro" },
    { id: 12, licenseTypeId: 5, productName: "Windows 11 Enterprise" },
    { id: 13, licenseTypeId: 8, productName: "Adobe Photoshop" },
  ];

  it("phát hiện License đang hoạt động cùng loại trên cùng thiết bị", () => {
    const duplicate = findActiveDeviceLicenseDuplicate({
      assetId: 42,
      candidateLicense: licenses[1],
      licenses,
      assignments: [{ softwareLicenseId: 11, assetId: 42, status: "active" }],
    });
    expect(duplicate).toEqual({ softwareLicenseId: 11, assetId: 42, status: "active" });
  });

  it("cho phép loại License khác, thiết bị khác hoặc cấp phát đã thu hồi", () => {
    expect(findActiveDeviceLicenseDuplicate({ assetId: 42, candidateLicense: licenses[2], licenses, assignments: [{ softwareLicenseId: 11, assetId: 42, status: "active" }] })).toBeNull();
    expect(findActiveDeviceLicenseDuplicate({ assetId: 43, candidateLicense: licenses[1], licenses, assignments: [{ softwareLicenseId: 11, assetId: 42, status: "active" }] })).toBeNull();
    expect(findActiveDeviceLicenseDuplicate({ assetId: 42, candidateLicense: licenses[1], licenses, assignments: [{ softwareLicenseId: 11, assetId: 42, status: "revoked" }] })).toBeNull();
  });
});
