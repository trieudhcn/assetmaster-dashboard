import { describe, expect, it } from "vitest";
import { canSubmitLicenseAssignment } from "../client/src/lib/licenseAssignmentSubmission";

describe("license assignment submission guard", () => {
  it("blocks submit when no license is selected or a prior request is pending", () => {
    expect(canSubmitLicenseAssignment(null, false)).toBe(false);
    expect(canSubmitLicenseAssignment(12, true)).toBe(false);
    expect(canSubmitLicenseAssignment(12, false)).toBe(true);
  });
});
