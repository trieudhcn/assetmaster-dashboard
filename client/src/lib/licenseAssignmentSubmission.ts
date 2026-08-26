export function canSubmitLicenseAssignment(licenseId: number | null, isPending: boolean): licenseId is number {
  return licenseId !== null && !isPending;
}
