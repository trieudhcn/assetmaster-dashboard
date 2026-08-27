# AssetMaster self-hosted trên Ubuntu Server: hướng dẫn từng bước

> **Phạm vi.** Tài liệu này hướng dẫn triển khai AssetMaster cho mạng nội bộ/VPN doanh nghiệp trên **Ubuntu Server 24.04 LTS**, dùng Docker Engine, Docker Compose, Nginx và MySQL/Redis đi kèm source. Chỉ Nginx được nhận truy cập từ người dùng; MySQL, Redis, Docker secrets và kho tệp không được công bố trực tiếp. Đọc cùng [runbook triển khai nội bộ](./huong-dan-trien-khai-noi-bo.md) để nắm kiến trúc và quy trình ứng dụng.

> **Không dùng `docker compose down -v`, `docker volume rm` hoặc xóa `/srv/assetmaster` trong vận hành thông thường.** Các thao tác đó có thể xóa vĩnh viễn database hoặc tệp đính kèm.

## 1. Kiến trúc và điều kiện trước khi bắt đầu

Luồng truy cập mục tiêu là **trình duyệt trong LAN/VPN → Nginx HTTPS → AssetMaster `127.0.0.1:3000` → MySQL/Redis**. Docker Compose đã bind cổng ứng dụng về loopback và chỉ đặt `app` ở network edge; MySQL/Redis ở network backend nội bộ. Vì Docker có thể bỏ qua một số luật UFW đối với cổng được publish, việc không publish MySQL/Redis và chỉ bind `127.0.0.1` là một lớp kiểm soát quan trọng.[1]

| Hạng mục       | Mức khởi điểm khuyến nghị                   | Ghi chú triển khai                                                                   |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Hệ điều hành   | Ubuntu Server 24.04 LTS, 64-bit             | Docker hỗ trợ chính thức Ubuntu 24.04.[2]                                            |
| Tài nguyên     | 4 vCPU, 8 GB RAM, 100 GB SSD/RAID           | Tăng theo số người dùng, dung lượng chứng từ và chính sách giữ backup.               |
| Tên truy cập   | `assetmaster.congty.vn` hoặc FQDN nội bộ    | Phải phân giải DNS từ máy người dùng và khớp SAN của TLS certificate.                |
| Lưu trữ        | `/srv/assetmaster` trên RAID/mount bền vững | Chứa data runtime, MySQL, Redis, tệp đính kèm và backup theo thư mục riêng.          |
| Quyền vận hành | Một tài khoản Linux có `sudo`               | Không dùng tài khoản `root` trực tiếp cho công việc hằng ngày.                       |
| TLS            | Internal PKI **hoặc** Let’s Encrypt         | Chỉ dùng Let’s Encrypt HTTP challenge khi cổng 80/FQDN truy cập được từ Internet.[3] |

Trước khi thao tác, chuẩn bị tên DNS, IP máy chủ, subnet LAN/VPN được phép truy cập, release AssetMaster hiện tại và kế hoạch backup ngoài máy chủ. RAID chỉ chống lỗi đĩa; không thay thế logical backup hoặc restore drill.

## 2. Bước 0 — Cài Ubuntu và làm cứng truy cập quản trị

Khi cài Ubuntu, chọn phân vùng/volume có khả năng mở rộng cho `/srv`. Nếu vùng RAID đã được hệ thống lưu trữ mount sẵn, kiểm tra nó **trước** khi chạy Docker:

```bash
findmnt /srv
df -hT /srv
sudo blkid
```

Nếu đội hạ tầng cung cấp UUID và filesystem, ghi mount bền vững vào `/etc/fstab` theo loại filesystem thực tế, sau đó kiểm tra bằng `sudo mount -a`. Ví dụ minh họa với ext4:

```fstab
UUID=<UUID-RAID-CUA-DOANH-NGHIEP>  /srv  ext4  defaults,noatime  0  2
```

Tạo tài khoản vận hành, đăng nhập SSH bằng khóa và chỉ sau khi đã mở **một phiên SSH thứ hai thành công** mới cân nhắc tắt password/root SSH. Việc kiểm tra phiên thứ hai giúp tránh tự khóa khỏi máy chủ.

```bash
sudo adduser assetops
sudo usermod -aG sudo assetops

# Từ máy quản trị, thử đăng nhập bằng assetops và SSH key trước khi đổi chính sách SSH.
```

## 3. Bước 1 — Cập nhật Ubuntu và cài các dịch vụ cần thiết

AssetMaster Docker không cần cài MySQL, Redis, Node.js hay pnpm trực tiếp trên host. Các dịch vụ host cần có là Docker Engine + Compose plugin, Nginx, công cụ tạo secret, UFW và các công cụ chẩn đoán cơ bản.

```bash
sudo apt update
sudo apt -y full-upgrade
sudo apt install -y ca-certificates curl gnupg git openssl nginx ufw fail2ban jq
sudo timedatectl set-timezone Asia/Ho_Chi_Minh
sudo systemctl enable --now systemd-timesyncd nginx
timedatectl status
```

`fail2ban` là tùy chọn hữu ích khi SSH có thể truy cập từ mạng rộng hơn LAN quản trị. Không mở cổng MySQL `3306`, Redis `6379` hoặc Node `3000` trên router/firewall.

## 4. Bước 2 — Cài Docker Engine và Docker Compose plugin

Docker khuyến nghị cài Engine từ APT repository chính thức, thay vì script convenience, cho môi trường production.[2] Các lệnh dưới đây dùng Ubuntu 24.04 và tự lấy codename từ `/etc/os-release`.

```bash
# Gỡ các package Docker không chính thức/có thể xung đột nếu đang tồn tại.
for pkg in docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc; do
  sudo apt remove -y "$pkg" 2>/dev/null || true
done

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

Trong tài liệu này, mọi lệnh Docker dùng `sudo docker`. Không cần thêm `assetops` vào group `docker`; quyền điều khiển Docker tương đương quyền quản trị rất cao trên host.

## 5. Bước 3 — Đặt source và tạo cấu trúc lưu trữ bền vững

Đặt source release tại `/opt/assetmaster/app`; tách source khỏi dữ liệu để việc cập nhật code không ảnh hưởng database hoặc chứng từ.

```bash
sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/assetmaster/app
sudo install -d -m 0750 -o 10001 -g 10001 \
  /srv/assetmaster/data/runtime \
  /srv/assetmaster/files
sudo install -d -m 0750 -o 999 -g 999 \
  /srv/assetmaster/data/mysql \
  /srv/assetmaster/data/redis
sudo install -d -m 0700 -o root -g root /srv/assetmaster/backups/mysql
sudo install -d -m 0700 -o root -g root /etc/assetmaster/secrets
```

UID `10001` là user `assetmaster` trong container app; UID `999` là user MySQL/Redis do Compose hiện tại quy định. Dùng UID số để host không cần tạo user Linux tương ứng.

Đưa source release đã tải về vào `/opt/assetmaster/app`, bằng Git hoặc giải nén archive. Sau đó xác minh các file production bắt buộc:

```bash
cd /opt/assetmaster/app
test -f Dockerfile && test -f docker-compose.yml && test -f docker/compose.env.template && test -f .dockerignore
echo $?
```

Kết quả phải là `0`. File `.dockerignore` là bắt buộc: nó ngăn data runtime và socket MySQL bị đưa vào Docker build context.

## 6. Bước 4 — Tạo `.env` và Docker secrets

Sao chép template và chỉ sửa **các biến không nhạy cảm**. Không đặt password, token hoặc private key vào `.env`.

```bash
cd /opt/assetmaster/app
cp docker/compose.env.template .env
nano .env
```

Dùng mẫu sau, thay FQDN/giới hạn tài nguyên khi cần. Đường dẫn này là đường dẫn **Linux host**, không dùng cú pháp Windows.

```dotenv
ASSETMASTER_APP_IMAGE=assetmaster:production
ASSETMASTER_BIND_IP=127.0.0.1
ASSETMASTER_PORT=3000
ASSETMASTER_DATA_DIR=/srv/assetmaster/data
ASSETMASTER_FILES_DIR=/srv/assetmaster/files
ASSETMASTER_SECRETS_DIR=/etc/assetmaster/secrets
ASSETMASTER_DB_NAME=assetmaster
ASSETMASTER_DB_USER=assetmaster
ASSETMASTER_SETUP_ENABLED=true
ASSETMASTER_APP_MEMORY_LIMIT=768m
ASSETMASTER_MYSQL_MEMORY_LIMIT=1024m
ASSETMASTER_MYSQL_BUFFER_POOL=512M
ASSETMASTER_MYSQL_MAX_CONNECTIONS=200
ASSETMASTER_REDIS_MEMORY_LIMIT=256m
ASSETMASTER_REDIS_MAX_MEMORY=192mb
TZ=Asia/Ho_Chi_Minh
```

Tạo năm secret ban đầu. Các file này phải ở ngoài repository và được sao lưu có kiểm soát.

```bash
sudo bash -c '
set -euo pipefail
umask 077
for name in mysql_root_password mysql_app_password redis_password jwt_secret setup_token; do
  openssl rand -base64 48 > "/etc/assetmaster/secrets/${name}.txt"
done
chown root:10001 /etc/assetmaster/secrets/*.txt
chmod 640 /etc/assetmaster/secrets/*.txt
'

sudo find /etc/assetmaster/secrets -maxdepth 1 -type f -printf '%f  mode=%m  owner=%u:%g\n'
```

Kết quả phải hiển thị năm file có permission `640`, owner `root` và group numeric `10001`. Không gửi nội dung các file này qua chat, email hoặc ticket không mã hóa.

## 7. Bước 5 — Build, khởi động Docker Compose và kiểm tra nội bộ

Trước khi khởi động, render Compose để phát hiện thiếu biến/mount. Compose sẽ bảo toàn mounted volumes khi image hoặc cấu hình service thay đổi.[4]

```bash
cd /opt/assetmaster/app
sudo docker compose config --quiet
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=120 app
curl -fsSI http://127.0.0.1:3000/ | head
```

Chỉ tiếp tục khi `app`, `mysql` và `redis` đều có trạng thái `running`/`healthy`. Nếu `app` chưa lên, xem log MySQL và Redis trước:

```bash
sudo docker compose logs --tail=120 mysql
sudo docker compose logs --tail=120 redis
sudo docker stats --no-stream
```

## 8. Bước 6 — Cấu hình Nginx reverse proxy

Nginx nhận HTTPS và chuyển tiếp nội bộ đến `127.0.0.1:3000`. Ubuntu dùng mô hình `sites-available`/`sites-enabled`; sau khi thay đổi, luôn chạy `nginx -t` rồi mới reload.[5]

Tạo rate limit zone trong HTTP context:

```bash
sudo tee /etc/nginx/conf.d/assetmaster-rate-limit.conf > /dev/null <<'EOF'
limit_req_zone $binary_remote_addr zone=assetmaster_login:10m rate=5r/m;
EOF
```

Tạo cấu hình HTTP ban đầu. Thay `assetmaster.congty.vn` bằng FQDN thực tế.

```bash
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

sudo ln -s /etc/nginx/sites-available/assetmaster.conf /etc/nginx/sites-enabled/assetmaster.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Bước 7 — Bật TLS: chọn Internal PKI hoặc Let’s Encrypt

Chọn **một** trong hai phương án. Certificate và private key phải phù hợp FQDN; Nginx yêu cầu private key được hạn chế quyền đọc.[6]

| Phương án     | Dùng khi                                                        | Các bước chính                                                                                                                       |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Internal PKI  | Chỉ LAN/VPN, doanh nghiệp đã có CA nội bộ                       | Cấp certificate có SAN đúng FQDN, cài CA gốc trên máy người dùng, thêm server block `443 ssl`, redirect `80 → 443`.                  |
| Let’s Encrypt | FQDN/cổng 80 truy cập được từ Internet hoặc dùng DNS validation | Cài Certbot, cấp certificate và kiểm tra renewal. Không mở máy chủ ra Internet chỉ để lấy certificate nếu chính sách không cho phép. |

### 9.1 Internal PKI

Đặt `fullchain.pem` và `privkey.pem` do đội hạ tầng cấp tại `/etc/nginx/tls/assetmaster/`. Thay toàn bộ server block HTTP ở Bước 6 bằng cấu hình bên dưới để HTTP luôn redirect sang HTTPS.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name assetmaster.congty.vn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name assetmaster.congty.vn;

    ssl_certificate     /etc/nginx/tls/assetmaster/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/assetmaster/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sau khi lưu file, thực hiện `sudo nginx -t && sudo systemctl reload nginx`. Đội hạ tầng phải phân phối root/intermediate CA nội bộ đến browser/thiết bị người dùng.

### 9.2 Let’s Encrypt (chỉ khi đáp ứng điều kiện truy cập)

Certbot yêu cầu website HTTP có thể truy cập và cổng 80 không bị firewall/ISP chặn đối với phương thức Nginx/HTTP challenge.[3] Sau khi DNS trỏ đến máy chủ và port 80 mở tạm thời:

```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d assetmaster.congty.vn
sudo certbot renew --dry-run
```

## 10. Bước 8 — Thiết lập firewall UFW

Trước khi bật UFW, bảo đảm bạn đã có phiên SSH thứ hai hoạt động. Với mạng nội bộ, thay subnet ví dụ `10.20.0.0/16` bằng subnet LAN/VPN thực tế và **không** đồng thời mở `443` cho toàn Internet nếu không cần.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow from 10.20.0.0/16 to any port 443 proto tcp

# Chỉ thêm tạm thời khi dùng Let's Encrypt HTTP challenge qua Internet.
# Cũng cần NAT/firewall biên chuyển tiếp TCP 80 đến máy chủ này.
# sudo ufw allow 80/tcp

sudo ufw enable
sudo ufw status verbose
```

Không thêm luật cho `3000`, `3306` hoặc `6379`. Kiểm tra lại binding bằng `sudo ss -lntp | grep -E ':(3000|3306|6379)'`; chỉ `127.0.0.1:3000` là mong đợi từ phía host. Xem lưu ý Docker/UFW trong tài liệu Docker trước khi thay đổi các cổng publish.[1]

## 11. Bước 9 — Hoàn tất wizard `/setup`

Mở `https://assetmaster.congty.vn/setup` từ máy quản trị trong subnet được phép. Nếu certificate chưa triển khai, chỉ thử HTTP tạm thời trong mạng cô lập rồi hoàn tất TLS trước khi mời người dùng.

| Wizard          | Giá trị cần nhập                                             | Ghi chú                                                                                                                                           |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website & Admin | Tên website, URL HTTPS, tên/email Admin, password Admin mạnh | Đây là tài khoản break-glass local; password chỉ lưu Argon2id hash.                                                                               |
| MySQL           | Host `mysql`, port `3306`, database/user từ `.env`           | Khi cần nhập, đọc password ứng dụng và Setup Token bằng `sudo cat /etc/assetmaster/secrets/<ten>.txt`; không lưu vào clipboard lâu hơn cần thiết. |
| Rà soát         | Xác nhận lại thông tin                                       | Không đóng tab trong khi migration đang chạy.                                                                                                     |

Sau khi wizard báo thành công, tắt installer và chỉ recreate service app:

```bash
cd /opt/assetmaster/app
sudo sed -i 's/^ASSETMASTER_SETUP_ENABLED=.*/ASSETMASTER_SETUP_ENABLED=false/' .env
sudo docker compose up -d --force-recreate --no-deps app
sudo docker compose ps
```

Đăng nhập Admin local, đổi/nạp các cài đặt nhận diện, sau đó vào **Cài đặt hệ thống → Kho tệp đính kèm**, lưu thư mục con `attachments` và bấm **Kiểm tra thư mục**. Hệ thống chỉ nhận thư mục con an toàn; không nhập đường dẫn host `/srv/...` vào giao diện.

## 12. Bước 10 — Cấu hình LDAPS sau khi ứng dụng đã hoạt động

LDAPS là bước tùy chọn sau `/setup`. Không dùng Domain Admin làm account bind; tạo account chỉ-đọc với phạm vi OU cần thiết. AssetMaster dùng `ldaps://`, TLS 1.2+, CA được xác minh và bind lại bằng password nhân viên để xác thực; password nhân viên không được lưu database/log.

Tạo bind password secret, sau đó tạo override chỉ dành cho LDAPS:

```bash
sudo install -m 0640 -o root -g 10001 /dev/null /etc/assetmaster/secrets/ldap_bind_password.txt
sudo nano /etc/assetmaster/secrets/ldap_bind_password.txt

cd /opt/assetmaster/app
sudo tee docker-compose.ldaps.yml > /dev/null <<'EOF'
services:
  app:
    secrets:
      - ldap_bind_password

secrets:
  ldap_bind_password:
    file: ${ASSETMASTER_SECRETS_DIR}/ldap_bind_password.txt
EOF

sudo docker compose -f docker-compose.yml -f docker-compose.ldaps.yml config --quiet
sudo docker compose -f docker-compose.yml -f docker-compose.ldaps.yml up -d --force-recreate --no-deps app
```

Trong **Cài đặt hệ thống → icon Directory LDAP/AD**, nhập `ldaps://dc01.congty.vn:636`, Users/Groups Base DN, attribute ID ổn định `objectGUID`, email `userPrincipalName` hoặc `mail`, và bind secret reference chính xác:

```text
/run/secrets/ldap_bind_password
```

Dán CA PEM vào trường CA của Directory khi AD dùng CA nội bộ. Sau đó thực hiện theo đúng thứ tự: **Kiểm tra bản nháp → Lưu nháp → Kiểm tra LDAPS → Tìm nhóm → Ánh xạ nhóm Admin/User → Bật Directory → Đồng bộ thử**. Thử tối thiểu một user đúng nhóm, một user ngoài nhóm và một password sai; giữ Admin local để xử lý sự cố Directory.

## 13. Bước 11 — Backup, kiểm tra và restore drill

Tạo logical backup trước mỗi cập nhật. Lệnh dưới đây không dừng MySQL, sử dụng `--single-transaction`, routines và triggers. Chạy từ `/opt/assetmaster/app`:

```bash
cd /opt/assetmaster/app
set -o pipefail
stamp=$(date +%F-%H%M%S)
sudo docker compose exec -T mysql sh -ec \
  'exec mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE"' \
  | gzip -9 \
  | sudo tee "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz" > /dev/null

sudo gzip -t "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz"
sudo sha256sum "/srv/assetmaster/backups/mysql/assetmaster-${stamp}.sql.gz"
sudo ls -lh /srv/assetmaster/backups/mysql/
```

Backup database không đủ nếu chứng từ/config/secrets mất. Theo chính sách doanh nghiệp, sao lưu các nguồn sau sang vị trí khác máy chủ/khác fault domain: `/srv/assetmaster/files`, `/srv/assetmaster/data/runtime`, `/etc/assetmaster/secrets`, `.env` và dump `.sql.gz`. Mã hóa backup tại nơi lưu và giới hạn quyền đọc.

### 13.1 Lịch backup tự động bằng systemd timer của host

Đây là tác vụ của **Ubuntu host**, độc lập với scheduler bên trong ứng dụng. Tạo script có retention 14 ngày; thay chính sách retention theo quy định doanh nghiệp.

```bash
sudo tee /usr/local/sbin/assetmaster-backup.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/assetmaster/app
destination=/srv/assetmaster/backups/mysql
stamp=$(date +%F-%H%M%S)
temporary=$(mktemp "${destination}/.assetmaster-${stamp}.XXXXXX.sql")
trap 'rm -f "$temporary" "${temporary}.gz"' EXIT

docker compose exec -T mysql sh -ec \
  'exec mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE"' \
  > "$temporary"
gzip -9 "$temporary"
mv "${temporary}.gz" "${destination}/assetmaster-${stamp}.sql.gz"
trap - EXIT
find "$destination" -type f -name 'assetmaster-*.sql.gz' -mtime +14 -delete
EOF
sudo chmod 700 /usr/local/sbin/assetmaster-backup.sh

sudo tee /etc/systemd/system/assetmaster-backup.service > /dev/null <<'EOF'
[Unit]
Description=AssetMaster logical MySQL backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/assetmaster-backup.sh
EOF

sudo tee /etc/systemd/system/assetmaster-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Run AssetMaster backup daily

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now assetmaster-backup.timer
sudo systemctl start assetmaster-backup.service
sudo systemctl status assetmaster-backup.service --no-pager
sudo systemctl list-timers assetmaster-backup.timer
```

> **Restore drill.** Mỗi tháng, dựng một Ubuntu/VM cô lập với thư mục dữ liệu trống và source cùng phiên bản, rồi import dump vào MySQL của môi trường cô lập. Kiểm tra đăng nhập Admin, một user LDAPS, mở tệp đính kèm và số lượng bản ghi trước khi coi backup là hợp lệ. Không thực thi restore ghi đè trên production chỉ để “thử”; phải có maintenance window, backup mới và phê duyệt thay đổi.

## 14. Bước 12 — Cập nhật source an toàn

Chỉ rebuild `app` khi thay đổi source/Dockerfile/Compose. Mọi cấu hình dữ liệu qua giao diện, tệp đính kèm và database giữ ở mounted directories nên không bị rebuild image. Trước update, tạo dump như Bước 11.

```bash
cd /opt/assetmaster/app

# Lấy source release đã được kiểm thử: git pull --ff-only hoặc giải nén release mới.
git pull --ff-only

sudo docker compose config --quiet
sudo docker compose up -d --build --force-recreate --no-deps app
sudo docker compose ps
sudo docker compose logs --tail=120 app
```

Nếu đã bật LDAPS override, dùng thêm `-f docker-compose.ldaps.yml` ở **mọi** lệnh Compose. Không chạy `/setup` lại sau update đã hoàn tất. Với release có migration database mới, phải thử trước trên staging và dùng quy trình migration được phê duyệt; không xóa table/volume để “rollback”.

Khi rollback code, checkout lại release trước rồi recreate **chỉ app**. Chỉ rollback khi migration vẫn tương thích; còn nếu schema đã đổi, restore dump đã kiểm thử hoặc triển khai forward-fix migration.

## 15. Bước 13 — Kiểm tra sau triển khai và giám sát hằng ngày

| Hạng mục        | Lệnh/điểm kiểm tra                              | Kết quả mong đợi                                        |
| --------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Docker services | `sudo docker compose ps`                        | `app`, `mysql`, `redis` đang chạy; healthcheck đạt.     |
| Log app         | `sudo docker compose logs --tail=120 app`       | Không có lỗi secret, migration hoặc kết nối DB lặp lại. |
| Nginx           | `sudo nginx -t`; `sudo systemctl status nginx`  | Cấu hình hợp lệ, service active.                        |
| Disk            | `df -hT /srv`; `sudo du -sh /srv/assetmaster/*` | Còn đủ chỗ cho DB, tệp và backup.                       |
| TLS             | Mở FQDN từ máy người dùng                       | Certificate tin cậy, HTTP redirect HTTPS (nếu dùng).    |
| Ứng dụng        | Admin login, thử upload/đọc tệp                 | Kho tệp probe đạt và URL tệp yêu cầu đăng nhập.         |
| LDAPS           | Nút **Kiểm tra LDAPS** trong Cài đặt            | TLS/CA, bind và mapping group đúng.                     |
| Backup          | `sudo gzip -t <dump>`; restore drill cô lập     | Dump đọc được và đã thử khôi phục định kỳ.              |

## 16. Chẩn đoán nhanh

| Hiện tượng                         | Kiểm tra đầu tiên                                     | Cách xử lý an toàn                                                                                     |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `app` không lên                    | `sudo docker compose logs --tail=150 app`             | Kiểm tra secret non-empty, MySQL/Redis healthy và `.env`; không xóa data.                              |
| Docker build báo `mysql.sock`      | Có `.dockerignore` ở root release hay không           | Cập nhật source mới có `.dockerignore`, giữ `/srv/assetmaster`, rebuild chỉ `app`.                     |
| `/setup` báo migration `retiredAt` | Phiên bản source                                      | Dùng release có migration portable mới nhất, rebuild `app`, rồi mở lại `/setup`; không reset database. |
| Login/Analytics log lỗi OAuth      | Source cũ                                             | Dùng release đã tách OAuth/Analytics hosted khỏi self-hosted; không thêm OAuth secret.                 |
| Nginx `502 Bad Gateway`            | `curl -I http://127.0.0.1:3000/`, `docker compose ps` | Nếu app chưa chạy, xem log app/MySQL; nếu app chạy, kiểm tra proxy target là `127.0.0.1:3000`.         |
| Upload bị từ chối                  | Cài đặt Kho tệp và `ls -ld /srv/assetmaster/files`    | Lưu thư mục con, chạy probe; giữ owner `10001:10001` cho vùng files.                                   |
| LDAPS TLS fail                     | FQDN, SAN, CA PEM, port 636                           | Sửa certificate/CA, không tắt `rejectUnauthorized` hoặc hạ xuống `ldap://`.                            |

## References

[1] [Docker Docs — Packet filtering and firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)

[2] [Docker Docs — Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

[3] [Certbot — Nginx on Linux instructions](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal)

[4] [Docker Docs — `docker compose up`](https://docs.docker.com/reference/cli/docker/compose/up/)

[5] [Ubuntu Server documentation — Configure Nginx](https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/)

[6] [NGINX documentation — Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)

[7] [Docker Docs — Install the Docker Compose plugin](https://docs.docker.com/compose/install/linux/)

[8] [Ubuntu Server documentation — Firewalls](https://documentation.ubuntu.com/server/how-to/security/firewalls/)
