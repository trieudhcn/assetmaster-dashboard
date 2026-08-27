# Hướng dẫn triển khai AssetMaster nội bộ: Local đến Docker Compose

> **Tài liệu chính thức.** Đây là runbook duy nhất dùng để triển khai AssetMaster trong LAN/VPN doanh nghiệp, từ chạy local có kiểm soát đến Docker Compose production. Không dùng tài liệu này cho bản AssetMaster đang được hosting managed. Chỉ Nginx được nhận kết nối từ LAN/VPN; MySQL, Redis, thư mục dữ liệu, Docker secret và LDAPS không được công bố trực tiếp ra Internet.

Để chạy thử trên **Docker Desktop Windows/macOS**, xem hướng dẫn từng bước riêng tại [Docker Desktop: Windows và macOS](./docker-desktop-step-by-step.md). Để triển khai vận hành trên **Ubuntu Server**, dùng [hướng dẫn Linux Server từng bước](./linux-server-step-by-step.md). Docker Desktop phù hợp UAT/đào tạo; Ubuntu Server + Docker Engine vẫn là phương án chạy nội bộ liên tục được khuyến nghị.

## 1. Kết luận nhanh: source đã sẵn sàng đến đâu?

Source hiện tại **đủ để dựng môi trường staging/pilot nội bộ** với Docker Compose, MySQL 8.4, Redis 7.4, Nginx, installer `/setup`, Admin bootstrap, xác thực LDAPS và thư mục tệp chia sẻ được mount vào Docker. Tuy nhiên, **chưa nên mở production cho nhân viên** cho đến khi hoàn tất UAT Docker trên MySQL trống, UAT LDAPS với CA nội bộ, kiểm tra quyền thư mục tệp và một lần restore backup đã kiểm thử.

| Thành phần                | Trạng thái trong source                                                    | Điều kiện trước khi mở production                                |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AssetMaster, MySQL, Redis | Có Docker Compose, volume, healthcheck và restart policy                   | UAT trên Ubuntu staging với chính Docker Engine của doanh nghiệp |
| Installer `/setup`        | Có wizard 3 bước, preflight MySQL, migration và Admin bootstrap Argon2id   | Tắt feature flag installer sau lần cài thành công                |
| Đăng nhập LDAPS           | Có cấu hình Admin, TLS/CA, mapping nhóm và đồng bộ phân trang              | Dùng CA/bind secret thật; thử user trong/ngoài nhóm              |
| Trạng thái MySQL/Redis    | Có panel Admin tự làm mới 30 giây ở **Cài đặt hệ thống**                   | Chỉ xuất hiện khi `SELF_HOSTED_AUTH_ENABLED=true`                |
| Tệp đính kèm              | Có adapter thư mục chia sẻ, URL nội bộ có xác thực và panel kiểm tra quyền | Mount vùng RAID, lưu cấu hình và kiểm tra tạo/xóa tệp probe      |
| Backup/rollback           | Có quy trình logical backup và rollback source                             | Thực hiện restore drill trên môi trường cô lập                   |

## 2. Kiến trúc mục tiêu và nguyên tắc bắt buộc

| Lớp             | Thành phần                              | Chỉ cho phép kết nối                                              |
| --------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Edge            | Nginx                                   | HTTPS 443 từ LAN/VPN                                              |
| Ứng dụng        | AssetMaster Node.js                     | Từ Nginx; kết nối MySQL, Redis, LDAPS                             |
| Dữ liệu         | MySQL 8.4                               | Chỉ từ AssetMaster qua mạng backend                               |
| Hạ tầng phụ trợ | Redis 7.4                               | Chỉ từ AssetMaster qua mạng backend                               |
| Danh tính       | Active Directory/LDAP                   | LDAPS TCP 636 đi ra từ AssetMaster                                |
| Tệp đính kèm    | Thư mục dùng chung/volume có phân quyền | Chỉ từ ứng dụng; mount vào `/data/files` và kiểm tra quyền qua UI |

AssetMaster dùng **Admin bootstrap local** như lối vào break-glass. Mật khẩu Admin chỉ được lưu bằng Argon2id hash; mật khẩu nhân viên chỉ được xác minh trực tiếp ở AD/LDAP, không được ghi vào database hay log.[1] Kết nối Directory bắt buộc dùng `ldaps://` với TLS, CA tin cậy và FQDN đúng certificate.[2]

## 3. Trước khi bắt đầu

Chuẩn bị tên miền nội bộ, ví dụ `assetmaster.noi-bo.example`, chứng chỉ TLS Nginx, một backup location trên RAID, MySQL/Redis nếu chạy local hoặc Docker Engine cùng Docker Compose plugin nếu dùng Compose. Đặt source release tại `/opt/assetmaster/app`; không commit `.env`, secret, dump database hoặc file người dùng vào repository.

Tạo các secret riêng biệt dài ít nhất 32 byte: MySQL root password, MySQL application password, Redis password, `JWT_SECRET` và `SELF_HOSTED_SETUP_TOKEN`. Sinh chúng bằng password manager hoặc `openssl rand -base64 48`; không gửi qua chat/email không mã hóa.

> **Khuyến nghị.** Dùng Docker Compose cho production. Luồng local/systemd bên dưới chỉ phục vụ đánh giá kỹ thuật hoặc môi trường không thể dùng Docker, vì file runtime local có thể chứa URL database gồm password và phải được bảo vệ nghiêm ngặt.

## 4. Phương án A — Chạy local với Node.js và systemd

### 4.1 Hướng dẫn đầy đủ cho người mới

Xem [Phương án A: chạy trực tiếp trên Ubuntu Server](./linux-local-systemd-step-by-step.md) để cài Node.js 22, pnpm, MySQL, Redis, Nginx, UFW, app service systemd và `/setup` theo từng lệnh có kiểm tra kết quả. Tài liệu đó cũng nêu rõ giới hạn LDAPS của local/systemd hiện tại.

### 4.2 Chuẩn bị ứng dụng và vùng dữ liệu

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin assetmaster
sudo install -d -m 0750 -o assetmaster -g assetmaster \
  /opt/assetmaster/app /var/lib/assetmaster /var/log/assetmaster /var/backups/assetmaster
sudo install -d -m 0700 -o root -g root /etc/assetmaster

cd /opt/assetmaster/app
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

Tạo `/etc/assetmaster/assetmaster.env` với quyền `0600`, chứa **không có** `DATABASE_URL` ở lần đầu để installer nhận thông tin database. Thay chuỗi ví dụ bằng secret thật ở máy chủ; không copy phần này vào Git.

```dotenv
NODE_ENV=production
PORT=3000
SELF_HOSTED_AUTH_ENABLED=true
SELF_HOSTED_SETUP_ENABLED=true
SELF_HOSTED_SETUP_TOKEN=<secret-rieng>
JWT_SECRET=<secret-rieng>
SELF_HOSTED_RUNTIME_CONFIG_PATH=/var/lib/assetmaster/runtime.json
```

Tạo dịch vụ `/etc/systemd/system/assetmaster.service`:

```ini
[Unit]
Description=AssetMaster internal application
After=network.target mysql.service

[Service]
Type=simple
User=assetmaster
Group=assetmaster
WorkingDirectory=/opt/assetmaster/app
EnvironmentFile=/etc/assetmaster/assetmaster.env
ExecStart=/usr/bin/node /opt/assetmaster/app/dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/assetmaster /var/log/assetmaster

[Install]
WantedBy=multi-user.target
```

Khởi động bằng `sudo systemctl daemon-reload && sudo systemctl enable --now assetmaster`, rồi kiểm tra `sudo systemctl status assetmaster` và `sudo journalctl -u assetmaster -f`. Mở wizard qua Nginx, không truy cập cổng Node trực tiếp.

### 4.2 Hạn chế của phương án local

Ở lần `/setup` đầu tiên, runtime config lưu thông tin kết nối database để khôi phục sau restart. Chỉ dùng ổ/volume mã hóa, owner `assetmaster`, permission `0600` và backup được bảo vệ. Docker Compose tránh việc ghi `DATABASE_URL` có password vào runtime volume bằng cách tạo URL trong bộ nhớ từ secret; vì vậy nên chuyển sang Compose trước cutover.

## 5. Phương án B — Docker Compose production (khuyến nghị)

Docker Compose hiện tại tạo ba service `app`, `mysql` và `redis`; app chỉ bind mặc định `127.0.0.1:3000`, còn MySQL/Redis không publish cổng host. `app` chạy non-root; MySQL/Redis nằm trong network backend internal; volumes bind vào vùng RAID do đội hạ tầng kiểm soát.

### 5.1 Chuẩn bị `.env`, secret và thư mục dữ liệu

```bash
cd /opt/assetmaster/app
cp docker/compose.env.template .env

sudo install -d -m 0750 -o root -g 10001 /etc/assetmaster/secrets
sudo install -d -m 0750 -o 10001 -g 10001 /srv/assetmaster/data/runtime
sudo install -d -m 0750 -o 999 -g 999 \
  /srv/assetmaster/data/mysql /srv/assetmaster/data/redis
sudo install -d -m 0750 -o 10001 -g 10001 /srv/assetmaster/files

sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/mysql_root_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/mysql_app_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/redis_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/jwt_secret.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/setup_token.txt'
sudo chown root:10001 /etc/assetmaster/secrets/*.txt
sudo chmod 640 /etc/assetmaster/secrets/*.txt
```

Trong `.env`, chỉ đặt thông số không nhạy cảm: `ASSETMASTER_BIND_IP=127.0.0.1`, `ASSETMASTER_PORT=3000`, `ASSETMASTER_DATA_DIR=/srv/assetmaster/data`, `ASSETMASTER_FILES_DIR=/srv/assetmaster/files`, `ASSETMASTER_SECRETS_DIR=/etc/assetmaster/secrets`, database name/user và giới hạn memory. Không đặt password/token trong `.env`. Nếu dùng RAID khác, đổi duy nhất `ASSETMASTER_FILES_DIR` sang thư mục mount RAID đã được chuẩn bị quyền `10001:10001`.

### 5.2 Khởi động và kiểm tra

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Chỉ tiếp tục khi `app`, `mysql` và `redis` đều healthy. Compose dùng `depends_on.condition: service_healthy` để chờ MySQL/Redis trước khi khởi động app.[3] Sau đó vào `https://assetmaster.noi-bo.example/setup`; dùng `mysql`, `3306`, DB/user theo `.env`, password từ `mysql_app_password.txt` và Setup Token từ `setup_token.txt`.

Nếu muốn dùng LDAPS, thêm Docker secret bind password vào `docker-compose.yml` trước khi lưu cấu hình Directory:

```yaml
services:
  app:
    secrets:
      - ldap_bind_password

secrets:
  ldap_bind_password:
    file: ${ASSETMASTER_SECRETS_DIR:-./secrets}/ldap_bind_password.txt
```

Sau đó tạo file `ldap_bind_password.txt` theo cùng policy quyền, chạy `docker compose up -d --force-recreate app` và tham chiếu đúng `/run/secrets/ldap_bind_password` trong giao diện Directory. Docker Compose secrets được mount read-only vào mỗi service được cấp quyền.[4]

## 6. Cấu hình Nginx cho LAN/VPN

Nginx là service duy nhất dùng chứng chỉ TLS và công bố HTTPS. Bật TLS 1.2 tối thiểu, ưu tiên TLS 1.3; không cache API, login hoặc installer.[5]

```nginx
limit_req_zone $binary_remote_addr zone=assetmaster_login:10m rate=5r/m;

server {
  listen 443 ssl http2;
  server_name assetmaster.noi-bo.example;
  # ssl_certificate     /etc/nginx/tls/assetmaster.fullchain.pem;
  # ssl_certificate_key /etc/nginx/tls/assetmaster.key;
  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ~ ^/(api|setup|login) {
    limit_req zone=assetmaster_login burst=10 nodelay;
    add_header Cache-Control "no-store" always;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Kiểm tra bằng `sudo nginx -t && sudo systemctl reload nginx`. Giới hạn cổng firewall cho 443 ở LAN/VPN; không mở 3000, 3306 hoặc 6379.

## 7. Hoàn tất installer `/setup`

| Bước                  | Cần nhập                                         | Điều kiện để tiếp tục                               | Kết quả                                                      |
| --------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| 1. Website & Admin    | Tên, URL nội bộ, tên/email, password Admin       | Password tối thiểu 12 ký tự và xác nhận khớp        | Tài khoản break-glass dùng Argon2id                          |
| 2. MySQL              | Host, port, database, user/password, Setup Token | `SELECT 1` thành công                               | Có thể chuyển sang rà soát                                   |
| 3. Rà soát & khởi tạo | Xác nhận lại dữ liệu                             | Không đóng/tải lại trang khi hệ thống đang cấu hình | Tạo database/schema khi cần, chạy migrations, khóa installer |

Sau khi thành công, đổi `ASSETMASTER_SETUP_ENABLED=false` trong `.env` rồi `docker compose up -d --force-recreate app` hoặc đổi environment file + restart systemd. Lưu Setup Token trong password manager để audit và xoay token nếu từng lộ. Không dùng `/setup` để sửa cấu hình sau cài đặt.

### 7.1 Cấu hình kho tệp dùng chung

1. Trên host, tạo/mount thư mục RAID rồi đặt `ASSETMASTER_FILES_DIR` trong `.env`; không đặt đường dẫn host này vào giao diện web.
2. Chạy `docker compose up -d --force-recreate app` sau khi đổi `.env`, rồi kiểm tra `docker compose ps`.
3. Đăng nhập Admin bootstrap, mở **Cài đặt hệ thống → Kho tệp đính kèm** và nhập **thư mục con** như `attachments` hoặc `documents/2026`.
4. Bấm **Lưu cấu hình**, sau đó **Kiểm tra thư mục**. Hệ thống chỉ tạo/xóa một file probe; trạng thái phải đạt trước khi upload chứng từ.
5. Tải thử PDF hoặc ảnh đính kèm, mở lại qua ứng dụng và xác nhận tệp đang nằm trong thư mục RAID. Không công bố trực tiếp thư mục này bằng Nginx hoặc SMB không xác thực.

> **Bảo vệ dữ liệu.** Khi container đã mount vùng `/data/files` nhưng Admin chưa lưu cấu hình tại bảng này, AssetMaster sẽ từ chối upload thay vì tự ghi vào thư mục mặc định. URL tệp nội bộ cần đăng nhập self-hosted và có `no-store`; nếu chứng từ có phân loại mật cao, cần bổ sung ACL theo từng tài sản/hợp đồng/hóa đơn trước khi mở rộng quyền cho toàn bộ nhân viên.

## 8. Cấu hình LDAPS, nhóm quyền và đồng bộ người dùng

Đăng nhập bằng Admin bootstrap, mở **Cài đặt hệ thống → icon Directory LDAP/AD**. Panel Directory chỉ hiện khi mở icon và chỉ Admin có quyền thao tác. Thiết lập theo thứ tự: mount secret bind → nhập URL/CA/DN/attributes → **Kiểm tra bản nháp** → lưu nháp → **Kiểm tra LDAPS** → tìm nhóm → gán Admin/User → bật Directory.

| Trường                | Ví dụ Active Directory            | Nguyên tắc                             |
| --------------------- | --------------------------------- | -------------------------------------- |
| URL                   | `ldaps://dc01.noi-bo.example:636` | Không dùng `ldap://` hoặc cổng 389     |
| Users Base DN         | `OU=Users,DC=noi-bo,DC=example`   | Thu hẹp search scope                   |
| ID bất biến           | `objectGUID`                      | Dùng liên kết dài hạn, không chỉ email |
| Login/email attribute | `userPrincipalName` hoặc `mail`   | Email là định danh đăng nhập nhân viên |
| Admin/User Group DN   | `CN=AssetMaster-Admins,...`       | Ánh xạ rõ toàn quyền/quyền người dùng  |

Đừng dùng Domain Admin làm account bind. AssetMaster escape LDAP filter và bind lại bằng DN/password nhân viên để xác thực; mật khẩu nhân viên không được lưu.[6] Khi kiểm tra đạt, dùng **Tìm nhóm** (tối đa 50 kết quả) và **Đồng bộ 500 tài khoản**. Đồng bộ phân trang theo lô 100; bảng kết quả tải thêm 20 dòng/lần để kiểm tra role Đồng bộ/Bỏ qua mà không tiết lộ password.[7]

## 9. Theo dõi vận hành, backup, upgrade và rollback

Sau khi self-hosted, Admin xem **Cài đặt hệ thống → Trạng thái hạ tầng** để kiểm tra MySQL/Redis theo chu kỳ 30 giây; panel chỉ trả trạng thái, latency và hướng dẫn khắc phục, không trả host/password/secret. Tại cùng bảng điều khiển, bấm **Kiểm tra LDAPS** để dùng cấu hình Directory đã lưu, xác minh TLS/CA, Docker secret bind và Users Base DN; kết quả chỉ trả trạng thái an toàn. Nếu chưa có cấu hình, bấm **Mở cấu hình Directory** để lưu nháp trước. Redis hiện được chuẩn bị cho cache/queue; session ứng dụng vẫn ở MySQL, không tự thay đổi kiến trúc session.

Phần **Sao lưu & phục hồi** chỉ dành cho Admin self-hosted. Đội hạ tầng vẫn thực hiện backup/restore trên host theo chính sách doanh nghiệp; Admin ghi nhận loại backup, tham chiếu nơi lưu, kết quả, trạng thái kiểm chứng và restore drill. Web không nhận password, không có Docker socket, không chạy `mysqldump` và không thể ghi đè production. Trước khôi phục thực tế, mở maintenance window, restore thử vào môi trường cô lập, kiểm tra dữ liệu/migration/tệp đính kèm/đăng nhập rồi mới quyết định cutover.

Trước mọi nâng cấp, tạo dump logical và thử restore định kỳ. RAID giúp chịu lỗi đĩa, nhưng không thay thế một bản logical backup/restore drill.[8]

```bash
mkdir -p /opt/assetmaster/backups
docker compose exec -T mysql sh -ec \
  'mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE"' \
  > /opt/assetmaster/backups/assetmaster-$(date +%F-%H%M).sql
```

Quy trình nâng cấp là: thông báo maintenance → dump database và backup runtime/secrets/kho tệp → lấy release → `docker compose up -d --build` → xem `docker compose ps`, log app, `/setup` không mở lại, Admin login, LDAP login → chỉ mở traffic khi đạt smoke test. Không dùng `docker compose down -v` trừ khi chủ đích xóa vĩnh viễn dữ liệu. Khi rollback, chỉ quay lại release có migration tương thích; không xóa table để rollback, hãy restore dump đã kiểm thử hoặc dùng forward-fix migration.

## 10. Checklist cutover và các blocker hiện còn

| Mức độ               | Hạng mục          | Tiêu chí đạt                                                                                                    |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **Chặn production**  | Storage nội bộ    | Đã bổ sung/kiểm thử adapter MinIO/S3 nội bộ hoặc volume storage có authorization trước khi dùng upload tài liệu |
| **Chặn production**  | UAT Docker        | MySQL trống, `/setup`, restart stack, healthcheck, login Admin và kiểm tra migration đều đạt trên staging       |
| **Chặn production**  | UAT LDAPS         | CA, bind read-only, user đúng/sai nhóm, password sai, nested group (nếu dùng) và fallback Admin đều đạt         |
| **Chặn production**  | Restore drill     | Khôi phục database, runtime, secret và kho tệp vào môi trường cô lập thành công                                 |
| **Bắt buộc cutover** | Nginx/firewall    | HTTPS, headers, `no-store`, request rate limit và không public port dữ liệu                                     |
| **Bắt buộc cutover** | Installer/secrets | Installer tắt sau dùng, secret ngoài Git, rotation được ghi nhận                                                |
| **Khuyến nghị**      | Observability     | Thu log Nginx/Docker tập trung và thiết lập cảnh báo theo chuẩn hạ tầng doanh nghiệp                            |

## 11. Chẩn đoán nhanh

| Hiện tượng                              | Kiểm tra đầu tiên                                                    | Hướng xử lý an toàn                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ERR_MODULE_NOT_FOUND: vite` khi deploy | Dockerfile có `pnpm prune --prod` hay không                          | Không prune `node_modules`; server hiện import Vite khi Node khởi động nên image phải giữ full dependency install |
| `app` chưa healthy                      | `docker compose ps`, `docker compose logs app`                       | Chờ MySQL/Redis healthy, kiểm tra secret file và quyền runtime volume                                             |
| `/setup` không mở                       | `SELF_HOSTED_AUTH_ENABLED`, `SELF_HOSTED_SETUP_ENABLED`, Setup Token | Chỉ bật trong lần cài đầu; không bypass bằng sửa database thủ công                                                |
| LDAPS lỗi TLS                           | CA, FQDN/SAN certificate, URL `ldaps://`                             | Mount CA đúng và kiểm tra test draft; không tắt xác minh certificate                                              |
| Không upload/xem được file              | `ASSETMASTER_FILES_DIR`, quyền `10001:10001`, panel Kho tệp đính kèm | Mount lại volume, lưu thư mục con, chạy kiểm tra tệp probe rồi tải thử từ ứng dụng                                |
| Cần quay lui                            | Dump gần nhất, migration release                                     | Restore thử ở môi trường cô lập; không xóa thủ công table/volume                                                  |

## References

[1] [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

[2] [Microsoft Learn — LDAP over SSL certificates](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[3] [Docker Docs — Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/)

[4] [Docker Docs — Secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)

[5] [OWASP — Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

[6] [OWASP — LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)

[7] [ldapts — Node.js LDAP TypeScript client](https://www.npmjs.com/package/ldapts)

[8] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)
