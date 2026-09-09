# AssetMaster production readiness checklist

Use this checklist before promoting a build to the company server. Run the
commands from the directory containing `docker-compose.yml`.

## 1. Preserve data before every update

- Confirm the MySQL backup is recent and can be read.
- Confirm the AssetMaster files and runtime directories are included in backup.
- Never use `docker compose down -v` during an update.
- Record the current Git commit and image name for rollback.

```bash
git rev-parse HEAD
docker compose images
docker compose ps
```

## 2. Validate configuration without exposing secrets

Create secret files from the deployment guide and restrict access to the
operations account. Do not paste secret values into tickets, chat, screenshots,
or Git history.

```bash
docker compose --env-file docker/compose.env.template config --quiet
docker compose config --services
```

The service list must include `app`, `mysql`, and `redis`.

## 3. Build and start safely

```bash
docker compose build --no-cache app
docker compose up -d mysql redis
docker compose up -d app
docker compose ps
```

Do not continue while any service is `unhealthy` or restarting.

## 4. Verify liveness and readiness

`/healthz` proves the Node.js process can answer HTTP. `/readyz` also checks
the self-hosted dependencies used by the deployment.

```bash
curl --fail --silent http://127.0.0.1:3000/healthz
curl --fail --silent http://127.0.0.1:3000/readyz
docker compose ps
docker compose logs --tail=200 app mysql redis
```

Expected results:

- `healthz`: HTTP 200 and `"ok":true`.
- `readyz`: HTTP 200, MySQL `ready`, and Redis `ready` when configured.
- The app container remains healthy for at least five minutes.
- Logs contain no migration loop, port fallback, or repeated restart.

## 5. Validate the local break-glass administrator

Before enabling Directory authentication:

1. Open AssetMaster through the company reverse proxy.
2. Sign in with the bootstrap local administrator.
3. Sign out and sign in again.
4. Confirm the session cookie is secure on HTTPS.
5. Keep this account in the company password vault; do not use it for daily work.

Stop if local Admin login fails. Directory must not be the only recovery path.

## 6. Validate AD/LDAPS from the company network

First verify network reachability from the server host:

```powershell
Test-NetConnection <domain-controller-fqdn> -Port 636
```

Then sign in as local Admin and open **Cài đặt hệ thống → Directory LDAP/AD**.

Check all of the following:

- LDAPS URL uses the Domain Controller FQDN present in the certificate SAN.
- The Root CA and every required Intermediate CA are supplied in PEM format.
- Bind DN belongs to a read-only service account.
- Bind password is mounted through the configured secret file.
- Users Base DN and Groups Base DN match the real AD tree.
- Login attribute is `userPrincipalName` unless the company has explicitly
  standardized another unique attribute.
- Admin and User group DNs are different. Do not map both roles to
  `Domain Users`.
- Nested group lookup is enabled only when required.

Run these gates in order:

1. **Kiểm tra kết nối** succeeds for TLS, bind, and Base DN.
2. Group search returns the intended Admin and User groups.
3. User synchronization imports a small pilot group.
4. A pilot User signs in and receives the User role.
5. A pilot Admin signs in and receives the Admin role.
6. A disabled or unauthorized AD account is rejected.
7. Wrong passwords are rejected without exposing LDAP details.
8. Sign-out invalidates the session.

Do not disable TLS certificate verification in production.

## 7. Exercise critical business flows

With test records, verify:

- Create and edit an asset.
- Assign and return an asset.
- Create a maintenance ticket and attach a file.
- Import a small Excel file and review its history.
- Open an authorized attachment.
- Confirm a normal User cannot access Admin management actions.
- Generate one PDF and one Excel export with Vietnamese text.

Remove only the test records created for this validation.

## 8. Prove backup and restore

A successful backup is not enough. Restore the latest backup into an isolated
database and verify:

- Migration history is intact.
- Users, assets, handovers, and attachment metadata are present.
- The restored application reaches `/readyz`.
- Local Admin login works.
- At least one stored attachment can be downloaded.

Record the restore date, duration, operator, backup identifier, and result.

## 9. Promotion evidence

Before production promotion, attach the following evidence to the release or
pull request:

- Commit SHA and image name.
- CI result.
- `docker compose ps` output with healthy services.
- Sanitized `healthz` and `readyz` results.
- AD pilot matrix for User, Admin, disabled account, and wrong password.
- Backup and restore-drill record.
- Rollback command and previous image name.

Never attach passwords, bind secrets, JWT secrets, private keys, raw session
cookies, or complete employee directory exports.
