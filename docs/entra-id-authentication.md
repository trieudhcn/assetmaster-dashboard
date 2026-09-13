# Microsoft Entra ID authentication

Vietnamese step-by-step guide: [`huong-dan-entra-id-microsoft-graph.md`](./huong-dan-entra-id-microsoft-graph.md).

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
6. Under **API permissions**, add Microsoft Graph **Application permissions** `User.Read.All` and `Group.Read.All`, then select **Grant admin consent**.
7. In the Enterprise Application, enable **Assignment required**.

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

## 5. Configure from AssetMaster

After migration `0068_entra_graph_settings.sql`, sign in with the local bootstrap Admin and open **Cài đặt**. The Microsoft Entra panel is hidden by default; use the Cloud icon on the right quick-navigation rail.

Use this order:

1. Open **Microsoft Entra**.
2. Enter Tenant ID, Client ID, Redirect URI and App Role values.
3. Keep the secret outside the database. Enter only `/run/secrets/entra_client_secret` or an allowed native secret path.
4. Select **Lưu nháp**.
5. Select **Kiểm tra kết nối**. AssetMaster obtains an app-only token with `https://graph.microsoft.com/.default` and verifies that users and groups can be read.
6. Select **Kích hoạt Entra ID** only after the connection test succeeds.

Saving changed settings automatically disables an active configuration until it is tested and activated again. Existing environment variables remain a backward-compatible fallback only when no database configuration has been saved.

## 6. Microsoft Graph profile synchronization

Select **Đồng bộ Microsoft Graph** from the Entra panel to update at most 500 existing AssetMaster users. The operation:

- matches by Entra Object ID first, then normalized email;
- updates display name, email, department and job title;
- maps the department name to an existing AssetMaster department when possible;
- stores direct and nested Microsoft Entra group names in the employee profile;
- never creates accounts from the Graph directory;
- never changes the AssetMaster role or re-enables a disabled account.

The app-only client-credentials flow requests `https://graph.microsoft.com/.default`. Listing users requires `User.Read.All`; group display data used by this implementation requires `Group.Read.All`. Both are Application permissions and require administrator consent.

## 7. UAT checklist

1. Run migrations `0067_entra_identity.sql` and `0068_entra_graph_settings.sql`.
2. Start AssetMaster and open the login page.
3. Confirm **Đăng nhập bằng Microsoft** appears above the fallback methods.
4. Sign in with a synchronized user assigned to `AssetMaster.User`.
5. Confirm the existing LDAP employee record is reused instead of duplicated.
6. Sign in with an account assigned to `AssetMaster.Admin` and confirm admin access.
7. Remove all AssetMaster App Roles from a new test user and confirm access is denied.
8. Disable a linked user in AssetMaster and confirm Entra sign-in is denied.
9. Confirm LDAPS and Admin local still work.
10. Open the Entra panel from the Cloud icon, test the connection and activate the configuration.
11. Run Microsoft Graph synchronization and verify department, job title and Entra groups on an existing employee profile.
12. Confirm Graph synchronization does not create an unknown user, change an AssetMaster role or re-enable a disabled account.
13. Test cancellation, invalid redirect configuration and expired client secret.

## Rollback

If the configuration was saved in AssetMaster, select **Tắt Entra ID** in the Entra panel. For legacy environment-only configuration, set `ENTRA_AUTH_ENABLED=false` and recreate the app container. The Microsoft button and Entra endpoints will be disabled; LDAPS and Admin local remain unchanged.
