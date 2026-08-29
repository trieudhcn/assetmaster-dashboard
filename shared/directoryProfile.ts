export type DirectoryProfileInput = {
  name: string | null | undefined;
  email: string;
  directoryUsername: string;
  department: string | null | undefined;
  jobTitle: string | null | undefined;
};

export type NormalizedDirectoryProfile = {
  name: string | null;
  email: string;
  directoryUsername: string;
  department: string | null;
  jobTitle: string | null;
};

export function normalizeDirectoryText(
  value: string | null | undefined
): string | null {
  const normalized = value
    ?.normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized || null;
}

export function normalizeDirectoryKey(value: string | null | undefined) {
  return normalizeDirectoryText(value)?.toLocaleLowerCase("vi-VN") ?? null;
}

export function normalizeDirectoryProfile(
  input: DirectoryProfileInput
): NormalizedDirectoryProfile {
  return {
    name: normalizeDirectoryText(input.name),
    email: input.email.normalize("NFC").trim().toLocaleLowerCase("vi-VN"),
    directoryUsername: normalizeDirectoryText(input.directoryUsername) || input.email,
    department: normalizeDirectoryText(input.department),
    jobTitle: normalizeDirectoryText(input.jobTitle),
  };
}

export function resolveDirectoryDepartmentId(
  departmentName: string | null | undefined,
  departments: Array<{ id: number; name: string }>
) {
  const departmentKey = normalizeDirectoryKey(departmentName);
  if (!departmentKey) return undefined;
  return departments.find(item => normalizeDirectoryKey(item.name) === departmentKey)?.id;
}

export function preserveDirectoryRole(
  currentRole: "admin" | "user" | undefined,
  directoryRole: "admin" | "user"
) {
  return currentRole && directoryRole === "user" ? currentRole : directoryRole;
}
