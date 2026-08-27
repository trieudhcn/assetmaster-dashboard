export type DeviceLicenseRecord = {
  id: number;
  licenseTypeId: number | null;
  productName: string;
};

export type DeviceLicenseAssignmentRecord = {
  softwareLicenseId: number;
  assetId: number | null;
  status: string;
};

const normalizeProductName = (value: string) => value.trim().toLocaleLowerCase("vi-VN");

/** Returns the active License that already occupies the requested type on an asset. */
export function findActiveDeviceLicenseDuplicate({
  assetId,
  candidateLicense,
  assignments,
  licenses,
}: {
  assetId: number | null | undefined;
  candidateLicense: DeviceLicenseRecord;
  assignments: DeviceLicenseAssignmentRecord[];
  licenses: DeviceLicenseRecord[];
}) {
  if (!assetId) return null;
  const licensesById = new Map(licenses.map((license) => [license.id, license]));
  return assignments.find((assignment) => {
    if (assignment.status !== "active" || assignment.assetId !== assetId) return false;
    if (assignment.softwareLicenseId === candidateLicense.id) return true;
    const existingLicense = licensesById.get(assignment.softwareLicenseId);
    if (!existingLicense) return false;
    if (candidateLicense.licenseTypeId && existingLicense.licenseTypeId) {
      return candidateLicense.licenseTypeId === existingLicense.licenseTypeId;
    }
    return normalizeProductName(candidateLicense.productName) === normalizeProductName(existingLicense.productName);
  }) || null;
}
