# Microsoft Entra ID authentication

AssetMaster supports Microsoft Entra ID sign-in for self-hosted deployments that use hybrid Active Directory. The feature is disabled by default and keeps LDAPS plus the local bootstrap administrator available as fallback methods.

## Authentication model

- Protocol: OpenID Connect authorization code flow with PKCE.
- Tenant mode: single tenant.
- Session: the existing AssetMaster self-hosted session cookie.
- Existing LDAP users: linked by normalized email, then remembered by Entra object ID.
- New users: created only when the ID token contains an accepted AssetMaster App Role.
- Disabled AssetMaster users: denied even when Microsoft authentication succeeds.

AssetMaster validates the ID token signature through the tenant JWKS endpoint and verifies issuer, audience, tenant ID, nonce and OAuth state.

## 1. Register the application

In Microsoft Entra admin center:

1. Open **Identity → Applications → App registrations → New registration**.
2. Select **Accounts in this organizational directory only**.
3. Add a **Web** redirect URI:
   - Local UAT: `http://localhost:3000/api/auth/entra/callback`
   - Production: `https://assetmaster.example.com/api/auth/entra/callback`
4. Record the **Directory (tenant) ID** and **Application (client) ID**.
5. Create a client secret for initial UAT. Use a certificate or managed secret store before production.
6. In the Enterprise Application, enable **Assignment required**.

The redirect URI configured in Entra must exactly match `ENTRA_REDIRECT_URI`.

## 2. Create App Roles

Add these application roles with **Users/Groups** as allowed member types:

| Display name | Value | Purpose |
| --- | --- | --- |
| AssetMaster User | `AssetMaster.User` | Standard employee access |
| AssetMaster Admin | `AssetMaster.Admin` | AssetMaster administrator access |

Assign synchronized users or groups to one of the roles in **Enterprise applications → Users and groups**.

Existing active AssetMaster users may be linked by email without automatic duplication. A new account is provisioned only if one of the roles above is present.

## 3. Configure Docker UAT

Add these values to the environment used by Docker Compose:

```dotenv
ENTRA_AUTH_ENABLED=true
ENTRA_TENANT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_ID=00000000-0000-0000-0000-000000000000
ENTRA_CLIENT_SECRET=replace-for-local-uat-only
ENTRA_REDIRECT_URI=http://localhost:3000/api/auth/entra/callback
ENTRA_ADMIN_APP_ROLE=AssetMaster.Admin
ENTRA_USER_APP_ROLE=AssetMaster.User
```

Rebuild the app container after changing these values.

## 4. Store the production secret safely

Do not keep the production client secret in a committed `.env` file. Mount it as a Docker secret and set:

```dotenv
ENTRA_CLIENT_SECRET=
ENTRA_CLIENT_SECRET_FILE=/run/secrets/entra_client_secret
```

Example Compose override:

```yaml
services:
  app:
    environment:
      ENTRA_CLIENT_SECRET_FILE: /run/secrets/entra_client_secret
    secrets:
      - entra_client_secret

secrets:
  entra_client_secret:
    file: ./secrets/entra_client_secret.txt
```

The file must be a regular file, must not be a symlink and must not be writable by group or other users.

## 5. UAT checklist

1. Run migration `0067_entra_identity.sql`.
2. Start AssetMaster and open the login page.
3. Confirm **Đăng nhập bằng Microsoft** appears above the fallback methods.
4. Sign in with a synchronized user assigned to `AssetMaster.User`.
5. Confirm the existing LDAP employee record is reused instead of duplicated.
6. Sign in with an account assigned to `AssetMaster.Admin` and confirm admin access.
7. Remove all AssetMaster App Roles from a new test user and confirm access is denied.
8. Disable a linked user in AssetMaster and confirm Entra sign-in is denied.
9. Confirm LDAPS and Admin local still work.
10. Test cancellation, invalid redirect configuration and expired client secret.

## Rollback

Set `ENTRA_AUTH_ENABLED=false` and recreate the app container. The Microsoft button and Entra endpoints will be disabled; LDAPS and Admin local remain unchanged.
