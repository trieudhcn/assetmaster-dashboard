export const DEFAULT_LDAP_BIND_SECRET_REF =
  "/run/secrets/ldap_bind_password";

export const LEGACY_LDAP_BIND_SECRET_REF =
  "/run/secrets/assetmaster_ldap_bind_password";

export function normalizeLdapBindSecretRef(
  value: string | null | undefined
): string | null {
  if (value === LEGACY_LDAP_BIND_SECRET_REF) {
    return DEFAULT_LDAP_BIND_SECRET_REF;
  }
  return value ?? null;
}
