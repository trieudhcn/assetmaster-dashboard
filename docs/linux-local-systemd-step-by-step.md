# AssetMaster Phương án A: chạy trực tiếp trên Ubuntu Server cho người mới

> **Khi nào dùng.** Phương án A chạy AssetMaster, MySQL và Redis trực tiếp trên Ubuntu; không dùng container. Cách này dễ quan sát từng service nhưng bạn phải tự cập nhật, phân quyền và sao lưu từng thành phần. Với hệ thống nội bộ vận hành dài hạn, Docker Compose vẫn là phương án được khuyến nghị vì cô lập dependency và Docker secrets tốt hơn. Hướng dẫn Docker xem tại [Linux Server với Docker](./linux-server-step-by-step.md).

> **Giới hạn hiện tại.** Luồng đăng nhập Admin local, `/setup`, MySQL, Redis, Nginx và kho tệp dùng chung hoạt động ở Phương án A. Tuy nhiên, **LDAPS chưa hỗ trợ chạy trực tiếp** trong source hiện tại vì bind password chỉ được phép đọc từ Docker secret dưới `/run/secrets/`. Nếu doanh nghiệp cần nhân viên đăng nhập LDAPS, dùng Phương án B Docker Compose.

## 1. Bạn cần cài những gì?

Trên Ubuntu, bạn không cần cài Docker cho Phương án A. Thay vào đó, các service dưới đây chạy trực tiếp trên host và được systemd tự khởi động lại sau reboot.

| Thành phần     | Vai trò                                     | Có cần cài?         |
| -------------- | ------------------------------------------- | ------------------- |
| Node.js 22 LTS | Chạy server AssetMaster                     | Có                  |
| pnpm           | Cài dependency và build source              | Có                  |
| MySQL Server   | Lưu toàn bộ dữ liệu nghiệp vụ               | Có                  |
| Redis Server   | Cache/health probe và dịch vụ phụ trợ       | Có                  |
| Nginx          | Công bố HTTPS và reverse proxy              | Có                  |
| systemd        | Tự chạy app khi boot, log và restart        | Có sẵn trong Ubuntu |
| UFW            | Chỉ cho phép SSH/HTTPS theo chính sách mạng | Có                  |
| OpenSSL        | Sinh password/token an toàn                 | Có                  |

Hướng dẫn áp dụng cho **Ubuntu Server 24.04 LTS**. Trước khi bắt đầu, chuẩn bị một FQDN nội bộ, ví dụ `assetmaster.congty.vn`; DNS của FQDN phải trỏ về IP máy chủ và certificate TLS phải chứa đúng tên đó.

## 2. Bước 0 — Đăng nhập và kiểm tra máy chủ

Mở Terminal/SSH vào Ubuntu bằng tài khoản có quyền `sudo`. Các câu lệnh bên dưới có tiền tố `sudo` sẽ yêu cầu password của tài khoản Linux hiện tại.

```bash
whoami
hostnamectl
lsb_release -a
df -hT
ip -brief address
```

Kết quả cần xác nhận là Ubuntu 24.04, còn đủ dung lượng cho database/tệp/backup và có IP LAN/VPN. Nếu doanh nghiệp dùng RAID hoặc NAS được mount tại `/srv`, hãy kiểm tra mount bền vững **trước** khi đặt dữ liệu:

```bash
findmnt /srv
df -hT /srv
```

Không đặt database, backup và kho tệp đính kèm trong `/tmp`, thư mục Downloads hoặc trong source code. Hướng dẫn này dùng `/srv/assetmaster` cho dữ liệu bền vững và `/opt/assetmaster/app` cho source.

## 3. Bước 1 — Cập nhật Ubuntu và cài công cụ cơ bản

Thực hiện cập nhật hệ điều hành trước khi cài các service. Lệnh `full-upgrade` có thể cài kernel mới; nếu có thông báo yêu cầu reboot thì hãy reboot trước khi tiếp tục.

```bash
sudo apt update
sudo apt -y full-upgrade
sudo apt install -y ca-certificates curl gnupg git openssl nginx ufw jq \
  build-essential python3 make g++
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
sudo systemctl enable --now systemd-timesyncd nginx
timedatectl status
sudo reboot
```

Đăng nhập lại sau reboot và kiểm tra Nginx đã chạy:

```bash
sudo systemctl status nginx --no-pager
```

Lệnh phải có dòng `Active: active (running)`. Nếu không, xem `sudo journalctl -u nginx -n 100 --no-pager` trước khi đi tiếp.

## 4. Bước 2 — Cài Node.js 22 LTS và pnpm

AssetMaster build/runs trên Node.js 22. Ubuntu 24.04 có thể cung cấp phiên bản Node thấp hơn, nên dùng repository NodeSource theo hướng dẫn của nhà phát hành.[1]

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
rm -f /tmp/nodesource_setup.sh

sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@10.15.1 --activate

node --version
npm --version
pnpm --version
```

Kết quả `node --version` phải bắt đầu bằng `v22`; `pnpm --version` phải là `10.15.1` hoặc tương thích. Không dùng `nvm` cho service systemd vì môi trường của service không tự nạp profile shell của bạn.

## 5. Bước 3 — Cài và kiểm tra MySQL

MySQL là database chính. Ubuntu khởi động service sau khi cài; root local mặc định dùng `auth_socket`, vì vậy quản trị bằng `sudo mysql` thay vì lưu password root trong app.[2]

```bash
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo systemctl status mysql --no-pager
sudo mysql -u root -e 'SELECT VERSION() AS mysql_version;'
sudo ss -lntp | grep mysql
```

Không đổi `bind-address` để mở MySQL ra LAN. Kết quả `ss` nên cho thấy MySQL chỉ nghe local loopback. AssetMaster và MySQL chạy cùng máy nên dùng `127.0.0.1`.

Tạo account riêng `assetmaster`, database `assetmaster` và password được lưu ngoài source. Mật khẩu dưới đây là hexadecimal nên an toàn khi tạo URL kết nối sau này.

```bash
sudo install -d -m 0750 -o root -g root /etc/assetmaster
sudo groupadd --system assetmaster 2>/dev/null || true
sudo useradd --system --gid assetmaster --home-dir /var/lib/assetmaster \
  --create-home --shell /usr/sbin/nologin assetmaster 2>/dev/null || true

sudo bash -c '
set -euo pipefail
umask 077
db_password="$(openssl rand -hex 32)"
printf "%s" "$db_password" > /etc/assetmaster/mysql_app_password
chown root:assetmaster /etc/assetmaster/mysql_app_password
chmod 640 /etc/assetmaster/mysql_app_password

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS assetmaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '\''assetmaster'\''@'\''localhost'\'' IDENTIFIED BY '\''$db_password'\'';
ALTER USER '\''assetmaster'\''@'\''localhost'\'' IDENTIFIED BY '\''$db_password'\'';
GRANT ALL PRIVILEGES ON assetmaster.* TO '\''assetmaster'\''@'\''localhost'\'';
FLUSH PRIVILEGES;
SQL
'

sudo mysql -u root -e "SHOW DATABASES LIKE 'assetmaster'; SELECT user,host FROM mysql.user WHERE user='assetmaster';"
```

`assetmaster` chỉ có quyền trong database `assetmaster`, không phải toàn server MySQL. Lưu file `/etc/assetmaster/mysql_app_password` vào password manager/backup được mã hóa; không gửi nó qua chat hoặc email.

## 6. Bước 4 — Cài, khóa Redis và kiểm tra

Redis dùng cho cache/kiểm tra hạ tầng. Nó phải chỉ nghe local và yêu cầu password. Redis khuyến nghị hạn chế truy cập mạng và bật các lớp bảo vệ khi vận hành server.[3]

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
sudo systemctl status redis-server --no-pager
```

Sinh password, bật append-only persistence và đặt password bằng một shell root để không ghi password vào lịch sử command của user:

```bash
sudo bash -c '
set -euo pipefail
umask 077
openssl rand -hex 32 > /etc/assetmaster/redis_password
chown root:assetmaster /etc/assetmaster/redis_password
chmod 640 /etc/assetmaster/redis_password

cp -n /etc/redis/redis.conf /etc/redis/redis.conf.assetmaster-original
sed -i \
  -e "s/^bind .*/bind 127.0.0.1 ::1/" \
  -e "s/^protected-mode .*/protected-mode yes/" \
  -e "s/^appendonly .*/appendonly yes/" \
  /etc/redis/redis.conf
printf "\\n# AssetMaster local-only password\\nrequirepass %s\\n" "$(cat /etc/assetmaster/redis_password)" >> /etc/redis/redis.conf
'

sudo systemctl restart redis-server
REDISCLI_AUTH="$(sudo cat /etc/assetmaster/redis_password)" redis-cli -h 127.0.0.1 ping
sudo ss -lntp | grep 6379
```

Lệnh `redis-cli` phải trả `PONG`. Nếu không, khôi phục file `/etc/redis/redis.conf.assetmaster-original`, xem `sudo journalctl -u redis-server -n 100 --no-pager` và kiểm tra lại trước khi tiếp tục.

## 7. Bước 5 — Tạo thư mục ứng dụng, data và tệp đính kèm

Tạo cấu trúc thư mục và quyền. User `assetmaster` chỉ có quyền nơi app thực sự cần ghi: runtime config, log và kho tệp đính kèm.

```bash
sudo install -d -m 0750 -o assetmaster -g assetmaster \
  /opt/assetmaster/app \
  /var/lib/assetmaster \
  /var/log/assetmaster \
  /srv/assetmaster/files
sudo install -d -m 0700 -o root -g root /srv/assetmaster/backups/mysql

sudo find /opt/assetmaster /var/lib/assetmaster /var/log/assetmaster /srv/assetmaster -maxdepth 2 -type d -printf '%M %u:%g %p\n'
```

Đặt source release tại `/opt/assetmaster/app`. Nếu dùng Git, clone repository private; nếu dùng file ZIP, giải nén source bằng tài khoản vận hành. Source phải thuộc user `assetmaster` để người đó có thể chạy `pnpm install`/build.

```bash
# Ví dụ Git. Thay URL bằng repository của doanh nghiệp.
sudo -u assetmaster -H git clone <URL-REPOSITORY-NOI-BO> /opt/assetmaster/app

cd /opt/assetmaster/app
sudo -u assetmaster -H pnpm install --frozen-lockfile
sudo -u assetmaster -H pnpm build
test -f dist/index.js && echo 'Build thành công'
```

Nếu source được chép bằng `scp`/USB/ZIP, chạy `sudo chown -R assetmaster:assetmaster /opt/assetmaster/app` trước hai lệnh `pnpm`. Không chép `.env`, password, MySQL data hoặc tệp người dùng vào repository.

## 8. Bước 6 — Tạo environment file cho service AssetMaster

Trong Phương án A, systemd không có Docker secret. Một số secret cần đặt vào file environment có permission nghiêm ngặt để app Node có thể đọc. Đây là lý do Phương án A có bề mặt vận hành lớn hơn Docker Compose.

Tạo Setup Token và JWT secret:

```bash
sudo bash -c '
set -euo pipefail
umask 077
openssl rand -hex 48 > /etc/assetmaster/setup_token
openssl rand -hex 48 > /etc/assetmaster/jwt_secret
chown root:assetmaster /etc/assetmaster/setup_token /etc/assetmaster/jwt_secret
chmod 640 /etc/assetmaster/setup_token /etc/assetmaster/jwt_secret
'
```

Tạo `/etc/assetmaster/assetmaster.env`. Dùng `127.0.0.1` cho Redis/MySQL và **không** thêm `DATABASE_URL` ở lần khởi động đầu; installer sẽ lưu connection string trong `/var/lib/assetmaster/runtime.json` với mode `0600` sau khi hoàn tất.

```bash
sudo bash -c '
set -euo pipefail
umask 027
cat > /etc/assetmaster/assetmaster.env <<EOF
NODE_ENV=production
PORT=3000
SELF_HOSTED_AUTH_ENABLED=true
SELF_HOSTED_SETUP_ENABLED=true
SELF_HOSTED_SETUP_TOKEN=$(cat /etc/assetmaster/setup_token)
JWT_SECRET=$(cat /etc/assetmaster/jwt_secret)
REDIS_URL=redis://:$(cat /etc/assetmaster/redis_password)@127.0.0.1:6379
SELF_HOSTED_RUNTIME_CONFIG_PATH=/var/lib/assetmaster/runtime.json
SELF_HOSTED_FILE_STORAGE_ROOT=/srv/assetmaster/files
EOF
chown root:assetmaster /etc/assetmaster/assetmaster.env
chmod 640 /etc/assetmaster/assetmaster.env
'

sudo ls -l /etc/assetmaster/assetmaster.env
```

Không dùng `cat /etc/assetmaster/assetmaster.env` trên màn hình chia sẻ vì file có secret. Hãy backup mã hóa thư mục `/etc/assetmaster` với giới hạn quyền truy cập.

## 9. Bước 7 — Tạo service systemd và chạy ứng dụng

Tạo service để AssetMaster tự chạy sau khi máy chủ reboot. Service chạy dưới user riêng `assetmaster`, không phải root.

```bash
sudo tee /etc/systemd/system/assetmaster.service > /dev/null <<'EOF'
[Unit]
Description=AssetMaster internal application
After=network-online.target mysql.service redis-server.service
Wants=network-online.target
Requires=mysql.service redis-server.service

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
ProtectHome=true
ReadWritePaths=/var/lib/assetmaster /var/log/assetmaster /srv/assetmaster/files

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now assetmaster
sudo systemctl status assetmaster --no-pager
sudo journalctl -u assetmaster -n 120 --no-pager
curl -fsSI http://127.0.0.1:3000/ | head
```

Nếu service chưa chạy, **không** chạy Node bằng root để “thử cho nhanh”. Đọc log `journalctl`, sửa nguyên nhân rồi khởi động lại bằng `sudo systemctl restart assetmaster`.

## 10. Bước 8 — Cấu hình Nginx và TLS

Nginx là service duy nhất nhận kết nối từ người dùng. Nó chuyển request nội bộ sang Node tại `127.0.0.1:3000`. Sau mọi chỉnh sửa Nginx, chạy `nginx -t` trước reload.[4]

Tạo cấu hình HTTP ban đầu; thay `assetmaster.congty.vn` bằng FQDN thực tế:

```bash
sudo tee /etc/nginx/conf.d/assetmaster-rate-limit.conf > /dev/null <<'EOF'
limit_req_zone $binary_remote_addr zone=assetmaster_login:10m rate=5r/m;
EOF

sudo tee /etc/nginx/sites-available/assetmaster.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name assetmaster.congty.vn;
    server_tokens off;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location ~ ^/(api|setup|login) {
        limit_req zone=assetmaster_login burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store" always;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/assetmaster.conf /etc/nginx/sites-enabled/assetmaster.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Chọn **một** cơ chế TLS. Với mạng chỉ LAN/VPN, Internal PKI là lựa chọn thông thường: đội hạ tầng cấp `fullchain.pem`/`privkey.pem` đúng FQDN và phân phối CA nội bộ đến máy người dùng. Nếu FQDN/cổng 80 truy cập được Internet, có thể dùng Certbot/Let’s Encrypt; không mở máy chủ ra Internet chỉ để lấy certificate nếu chính sách không cho phép.[5]

Sau khi có certificate, thêm HTTPS server block và đổi block port 80 thành `return 301 https://$host$request_uri;`. Mẫu cấu hình hoàn chỉnh nằm trong [hướng dẫn Linux Docker — Bước 7](./linux-server-step-by-step.md#9-bước-7--bật-tls-chọn-internal-pki-hoặc-lets-encrypt).

## 11. Bước 9 — Bật UFW mà không tự khóa SSH

Mở **một phiên SSH thứ hai** và xác nhận vẫn login được trước khi bật UFW. Thay `10.20.0.0/16` bằng subnet LAN/VPN thật.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow from 10.20.0.0/16 to any port 443 proto tcp

# Chỉ cần khi bạn dùng Let’s Encrypt HTTP challenge qua Internet.
# sudo ufw allow 80/tcp

sudo ufw enable
sudo ufw status verbose
sudo ss -lntp | grep -E ':(3000|3306|6379)'
```

Không mở `3000`, `3306` hoặc `6379`. Sau khi TLS hoàn tất, người dùng chỉ truy cập `https://assetmaster.congty.vn`.

## 12. Bước 10 — Hoàn tất `/setup` và khóa installer

Mở `https://assetmaster.congty.vn/setup` từ máy quản trị. Bạn có thể xem các secret cần nhập bằng lệnh dưới đây; không chụp ảnh hoặc gửi nội dung ra ngoài.

```bash
sudo cat /etc/assetmaster/setup_token
sudo cat /etc/assetmaster/mysql_app_password
```

| Bước wizard     | Giá trị cần nhập                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Website & Admin | Tên hệ thống, URL HTTPS, tên/email Admin, password từ 12 ký tự trở lên.                                           |
| MySQL           | Host `127.0.0.1`, port `3306`, database `assetmaster`, user `assetmaster`, password từ file `mysql_app_password`. |
| Rà soát         | Setup Token từ file `setup_token`, sau đó xác nhận khởi tạo.                                                      |

Không đóng tab khi wizard đang migration. Khi hoàn tất, tắt installer và restart service:

```bash
sudo sed -i 's/^SELF_HOSTED_SETUP_ENABLED=.*/SELF_HOSTED_SETUP_ENABLED=false/' /etc/assetmaster/assetmaster.env
sudo systemctl restart assetmaster
sudo systemctl status assetmaster --no-pager
```

Đăng nhập bằng Admin local vừa tạo. Trong **Cài đặt hệ thống → Kho tệp đính kèm**, nhập thư mục con `attachments`, lưu cấu hình rồi bấm **Kiểm tra thư mục**. Không nhập `/srv/assetmaster/files` vào giao diện; đây là đường dẫn host đã được đặt sẵn trong environment file.

## 13. Bước 11 — Backup, cập nhật source và kiểm tra sau reboot

Tạo backup database trước mọi cập nhật. Lệnh này không dừng MySQL:

```bash
sudo bash -c '
set -euo pipefail
umask 077
stamp=$(date +%F-%H%M%S)
export MYSQL_PWD="$(cat /etc/assetmaster/mysql_app_password)"
mysqldump --single-transaction --routines --triggers -u assetmaster assetmaster \
  | gzip -9 > "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz"
unset MYSQL_PWD
gzip -t "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz"
ls -lh "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz"
'
```

Backup cả `/srv/assetmaster/files`, `/var/lib/assetmaster/runtime.json` và `/etc/assetmaster` sang nơi lưu ngoài máy chủ, theo chính sách mã hóa/retention doanh nghiệp. RAID không thay thế logical backup và restore drill.

Để cập nhật source Git sau khi đã backup:

```bash
sudo -u assetmaster -H bash -lc '
cd /opt/assetmaster/app
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
'
sudo systemctl restart assetmaster
sudo systemctl status assetmaster --no-pager
sudo journalctl -u assetmaster -n 120 --no-pager
```

Sau reboot, kiểm tra đủ bốn service:

```bash
sudo systemctl status mysql redis-server nginx assetmaster --no-pager
curl -fsSI http://127.0.0.1:3000/ | head
df -hT /srv
```

## 14. Chẩn đoán nhanh

| Vấn đề                          | Kiểm tra                                                      | Hướng xử lý                                                                                      |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node --version` không phải v22 | `node --version`; `apt-cache policy nodejs`                   | Chạy lại Bước 2; không dùng Node từ Ubuntu repo cũ.                                              |
| App `failed`                    | `sudo journalctl -u assetmaster -n 150 --no-pager`            | Kiểm tra source đã build, file env `640`, MySQL/Redis active.                                    |
| `/setup` không mở               | `sudo systemctl status assetmaster`; `curl -I 127.0.0.1:3000` | Kiểm tra `SELF_HOSTED_AUTH_ENABLED=true` và `SELF_HOSTED_SETUP_ENABLED=true` trước lần cài đầu.  |
| MySQL access denied             | `sudo mysql -u root`; kiểm tra `assetmaster@localhost`        | Tạo lại database user ở Bước 3, không dùng root cho app.                                         |
| Redis không trả PONG            | `sudo journalctl -u redis-server -n 100 --no-pager`           | Kiểm tra syntax `redis.conf` và password secret; khôi phục file `.assetmaster-original` nếu cần. |
| Nginx 502                       | `curl -I 127.0.0.1:3000`; `sudo nginx -t`                     | Khởi động app trước; proxy phải là `127.0.0.1:3000`.                                             |
| Cần LDAPS                       | Directory panel báo secret path không hợp lệ                  | Đây là giới hạn Phương án A hiện tại; chuyển sang Docker Compose để dùng `/run/secrets/`.        |

## References

[1] [NodeSource — Node.js 22 installation instructions for Ubuntu/Debian](https://github.com/nodesource/distributions/blob/master/DEV_README.md)

[2] [Ubuntu Server documentation — Install and configure MySQL](https://ubuntu.com/server/docs/how-to/databases/install-mysql/)

[3] [Redis documentation — Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)

[4] [Ubuntu Server documentation — Configure Nginx](https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/)

[5] [Certbot — Nginx deployment instructions](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal)

[6] [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
