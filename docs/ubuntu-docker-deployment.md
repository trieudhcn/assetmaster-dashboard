# Triển khai AssetMaster trên Ubuntu bằng Docker Compose

Tài liệu này áp dụng cho Ubuntu Server và không thay đổi luồng Docker Desktop.
Docker Desktop tiếp tục dùng `docker-compose.yml` kết hợp
`docker-compose.desktop.yml`; Ubuntu dùng `docker-compose.yml` kết hợp
`docker-compose.linux.yml`.

## 0. Từ máy Ubuntu mới đến mã nguồn

### 0.1. Chuẩn bị hệ điều hành

Đăng nhập bằng tài khoản có quyền `sudo`, đồng bộ thời gian và cài các gói nền:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo timedatectl set-ntp true
timedatectl status
```

### 0.2. Cài Docker Engine và Compose plugin

Dùng repository APT chính thức của Docker:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc" | \
  sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

Không bắt buộc thêm tài khoản vận hành vào nhóm `docker`; thành viên nhóm này
có quyền tương đương root. Các lệnh production trong tài liệu dùng `sudo`.

### 0.3. Lấy mã nguồn

```bash
sudo install -d -m 0755 /opt/assetmaster
sudo chown "$USER:$USER" /opt/assetmaster
git clone https://github.com/trieudhcn/assetmaster-dashboard.git \
  /opt/assetmaster/app
cd /opt/assetmaster/app
git fetch origin
git switch codex/employee-supply-requests
git pull --ff-only origin codex/employee-supply-requests
```

Production nên checkout một tag hoặc commit đã nghiệm thu thay vì tự động theo
nhánh đang phát triển.

## 1. Chuẩn bị

- Ubuntu Server 22.04/24.04 LTS 64-bit.
- Docker Engine đang chạy và có Docker Compose plugin.
- Source AssetMaster đặt tại một thư mục riêng, ví dụ `/opt/assetmaster/app`.
- CA nội bộ dạng PEM nếu LDAPS dùng chứng chỉ do CA công ty cấp.
- Mật khẩu bind account LDAPS và Microsoft Entra client secret.

Không cài MySQL, Redis, Node.js hoặc pnpm trực tiếp trên host. Các thành phần này
được đóng gói trong Compose.

## 2. Tạo file cấu hình không nhạy cảm

```bash
cd /opt/assetmaster/app
cp docker/linux.env.example .env
nano .env
```

Giữ `ASSETMASTER_BIND_IP=127.0.0.1` nếu dùng Nginx/Caddy phía trước. Không nhập
password, token hoặc client secret vào `.env`.

## 3. Tạo production secrets

Tạo thư mục secret chỉ cho root truy cập:

```bash
sudo install -d -m 0700 -o root -g root /etc/assetmaster/secrets
```

Sinh năm secret nội bộ độc lập:

```bash
for name in mysql_root_password mysql_app_password redis_password jwt_secret setup_token; do
  value="$(openssl rand -base64 48 | tr -d '\r\n')"
  printf '%s\n' "${value}" | sudo tee "/etc/assetmaster/secrets/${name}.txt" > /dev/null
done
```

Ghi hai secret danh tính thật bằng trình soạn thảo an toàn. Mỗi file chỉ chứa
một dòng giá trị, không có dấu ngoặc kép:

```bash
sudoedit /etc/assetmaster/secrets/ldap_bind_password.txt
sudoedit /etc/assetmaster/secrets/entra_client_secret.txt
```

Không commit, gửi qua chat hoặc ghi các giá trị này vào log. Script cài đặt sẽ
kiểm tra cả bảy file, từ chối symlink/file rỗng/giá trị mẫu và áp quyền chỉ đọc.
Thư mục cha vẫn là `0700`, còn Docker chỉ mount từng secret vào service được
khai báo.

## 4. Cài CA certificate

Đặt Root CA và intermediate CA cần thiết vào một bundle PEM:

```bash
sudo install -d -m 0700 -o root -g root /etc/assetmaster/certs
sudoedit /etc/assetmaster/certs/company-ca.pem
```

File phải có ít nhất một khối:

```text
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

Không đặt private key của Domain Controller hoặc Nginx vào file này.

## 5. Chạy trình cài đặt an toàn

Kiểm tra trước mà chưa khởi động container:

```bash
cd /opt/assetmaster/app
sudo ./scripts/install-ubuntu.sh --env-file .env --prepare-only
```

Nếu đạt, build và khởi động toàn bộ stack:

```bash
sudo ./scripts/install-ubuntu.sh --env-file .env
```

Script thực hiện các việc sau:

1. Xác nhận đang chạy trên Ubuntu, Docker Engine và Compose hoạt động.
2. Tạo thư mục runtime/files với UID `10001` và MySQL/Redis với UID `999`.
3. Kiểm tra bảy Docker secrets và CA PEM trước khi chạy Compose.
4. Render cấu hình kết hợp `docker-compose.yml` + `docker-compose.linux.yml`.
5. Build/start app, MySQL, Redis; chờ `/readyz` và chạy probe riêng cho database/cache.

Script không chạy `down -v`, không xóa dữ liệu cũ và không ghi đè nội dung
secret. Nếu một bước thất bại, xem chẩn đoán được in từ `docker compose ps/logs`.

## 6. Cấu hình trong AssetMaster

Sau khi đăng nhập bằng Admin cục bộ:

- Trong panel Directory LDAP/AD, dùng tham chiếu
  `/run/secrets/ldap_bind_password`.
- Trong panel Microsoft Entra ID, dùng tham chiếu
  `/run/secrets/entra_client_secret`.
- Kiểm tra kết nối trước khi kích hoạt từng phương thức đăng nhập.
- Giữ Admin cục bộ làm tài khoản break-glass.

`ENTRA_CLIENT_SECRET` bị đặt rỗng trong override Linux để production chỉ đọc
client secret từ file mount read-only.

## 7. Cập nhật ứng dụng

```bash
cd /opt/assetmaster/app
git pull --ff-only
sudo ./scripts/install-ubuntu.sh --env-file .env
```

Không dùng `docker compose down -v`. Trước khi nâng cấp, tạo backup MySQL,
runtime và kho tệp; chỉ rollback code khi migration của hai phiên bản tương thích.

## 8. Kiểm tra thủ công

```bash
curl --fail --silent http://127.0.0.1:3000/readyz
sudo docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.linux.yml ps
```

Kết quả chỉ đạt khi `app`, `mysql`, `redis` đều healthy và `/readyz` trả HTTP
200. CI của repository cũng dựng một stack Linux cô lập với dữ liệu/secret tạm,
kiểm tra `/readyz`, MySQL, Redis rồi thu log làm bằng chứng.

## 9. Firewall, DNS và kết nối cần thiết

| Chiều | Cổng | Mục đích |
| --- | --- | --- |
| Inbound | TCP 443 | Người dùng truy cập HTTPS |
| Inbound | TCP 22 | SSH, chỉ từ mạng quản trị |
| Outbound | TCP/UDP 53 | DNS |
| Outbound | TCP 636 | LDAPS tới Domain Controller |
| Outbound | TCP 443 | Microsoft Graph/Entra và cập nhật image |
| Outbound | UDP 123 | Đồng bộ thời gian |

Không mở công khai cổng `3000`, `3306` hoặc `6379`. Ví dụ cấu hình UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Thay `10.0.0.0/8` bằng mạng quản trị thực tế trước khi bật UFW để tránh tự
khóa SSH. Docker có thể tạo quy tắc firewall riêng cho cổng được publish; vì vậy
vẫn phải giữ app bind `127.0.0.1` và kiểm tra luật mạng thực tế.

Kiểm tra DNS, TCP và TLS tới Domain Controller trước khi bật LDAPS:

```bash
getent ahosts dc01.congty.local
timeout 5 bash -c '</dev/tcp/dc01.congty.local/636'
openssl s_client -connect dc01.congty.local:636 \
  -servername dc01.congty.local \
  -CAfile /etc/assetmaster/certs/company-ca.pem </dev/null
```

Thay `dc01.congty.local` bằng FQDN thật, trùng với tên trong chứng chỉ máy chủ.

## 10. Reverse proxy Nginx và HTTPS

Cài Nginx:

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Tạo `/etc/nginx/sites-available/assetmaster`, sau đó thay tên miền và đường dẫn
chứng chỉ bằng giá trị thật:

```nginx
server {
    listen 80;
    server_name assetmaster.congty.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name assetmaster.congty.local;

    ssl_certificate /etc/nginx/tls/assetmaster.fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/assetmaster.key;

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

Kích hoạt site và kiểm tra:

```bash
sudo ln -s /etc/nginx/sites-available/assetmaster \
  /etc/nginx/sites-enabled/assetmaster
sudo nginx -t
sudo systemctl reload nginx
curl --fail --silent https://assetmaster.congty.local/readyz
```

Nếu site mặc định gây xung đột, quản trị viên có thể vô hiệu hóa nó sau khi đã
xác nhận đúng file đích. Không xóa chứng chỉ hoặc cấu hình đang dùng khi chưa có
backup. Với tên miền nội bộ, chứng chỉ HTTPS phải do CA mà máy người dùng tin cậy
phát hành.

## 11. Thiết lập lần đầu và cấu hình danh tính

1. Truy cập URL HTTPS của AssetMaster từ máy quản trị.
2. Dùng setup token qua kênh an toàn để hoàn tất thiết lập.
3. Tạo và kiểm thử Admin cục bộ làm tài khoản break-glass.
4. Trong Directory LDAP/AD, dùng tệp secret
   `/run/secrets/ldap_bind_password`.
5. Chạy chẩn đoán DNS, TCP 636, CA và LDAPS trước khi kích hoạt.
6. Trong Microsoft Entra ID, dùng
   `/run/secrets/entra_client_secret`, Tenant ID và Client ID.
7. Sao chép chính xác Redirect URI hiển thị trong AssetMaster sang App
   Registration của Entra ID.
8. Kiểm tra kết nối rồi mới bật từng phương thức đăng nhập.
9. Thực hiện UAT bằng một tài khoản thử nghiệm, không dùng tài khoản quản trị cao.

Sau khi setup thành công, đặt trong `.env`:

```dotenv
ASSETMASTER_SETUP_ENABLED=false
```

Áp dụng lại cấu hình:

```bash
cd /opt/assetmaster/app
sudo ./scripts/install-ubuntu.sh --env-file .env
```

## 12. Backup và khôi phục

Tạo thư mục backup có quyền hạn chế:

```bash
sudo install -d -m 0700 -o root -g root /srv/assetmaster/backups
```

Ví dụ backup cơ sở dữ liệu và kho tệp:

```bash
cd /opt/assetmaster/app
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

sudo docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.linux.yml \
  exec -T mysql sh -c \
  'exec mysqldump -uroot -p"$(cat /run/secrets/mysql_root_password)" \
    --single-transaction --routines --triggers --all-databases' | \
  sudo tee "/srv/assetmaster/backups/mysql-${stamp}.sql" > /dev/null

sudo tar -C /srv/assetmaster \
  -czf "/srv/assetmaster/backups/files-${stamp}.tar.gz" files data
sudo chmod 0600 /srv/assetmaster/backups/*
```

Production secrets phải được sao lưu trong kho bí mật mã hóa, tách khỏi backup
dữ liệu. Không sao chép secret sang thư mục web hoặc repository.

Quy trình khôi phục phải được thử trên staging trước. Trong cửa sổ bảo trì:

1. Ghi lại commit/tag và phiên bản image đi kèm bản backup.
2. Chặn phiên làm việc mới; dừng app nhưng giữ MySQL chạy.
3. Nhập bản SQL tương thích vào MySQL.
4. Đổi tên thư mục dữ liệu hiện tại để giữ đường lui rồi giải nén backup.
5. Chạy installer, kiểm tra health và thực hiện UAT.
6. Chỉ xóa bản dữ liệu cũ sau khi bản khôi phục đã được nghiệm thu.

## 13. Cập nhật và rollback an toàn

Backup trước khi cập nhật:

```bash
cd /opt/assetmaster/app
git fetch origin
git switch codex/employee-supply-requests
git pull --ff-only origin codex/employee-supply-requests
sudo ./scripts/install-ubuntu.sh --env-file .env --prepare-only
sudo ./scripts/install-ubuntu.sh --env-file .env
curl --fail --silent http://127.0.0.1:3000/readyz
```

Rollback code về commit đã nghiệm thu:

```bash
cd /opt/assetmaster/app
git fetch origin
git switch --detach <COMMIT_DA_NGHIEM_THU>
sudo ./scripts/install-ubuntu.sh --env-file .env --prepare-only
sudo ./scripts/install-ubuntu.sh --env-file .env
```

Chỉ rollback code khi migration của hai phiên bản tương thích. Nếu migration
không tương thích, phải khôi phục database tương ứng. Không dùng
`docker compose down -v` vì lệnh này có thể xóa volume dữ liệu.

## 14. Xử lý lỗi thường gặp

### Secret không tồn tại hoặc chưa mount

- Xác nhận đủ bảy file `.txt` trong `/etc/assetmaster/secrets`.
- Tránh tên sai dạng `ldap_bind_password.txt.txt`.
- Không dùng symlink, không để file rỗng và không in nội dung ra terminal.
- Chạy lại `--prepare-only` để nhận cảnh báo an toàn.
- Đường dẫn trong giao diện phải là
  `/run/secrets/ldap_bind_password`, không phải
  `/run/secrets/assetmaster_ldap_bind_password`.

### DNS, TCP 636 hoặc CA thất bại

- Dùng FQDN của Domain Controller trùng Subject Alternative Name trên cert.
- Chạy lại các lệnh `getent`, TCP 636 và `openssl s_client` tại mục 9.
- Đưa đủ Root CA và intermediate CA vào `company-ca.pem`.
- Kiểm tra firewall giữa máy Ubuntu và Domain Controller.

### `/readyz` không trả HTTP 200

```bash
sudo docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.linux.yml ps
sudo docker compose --env-file .env \
  -f docker-compose.yml -f docker-compose.linux.yml \
  logs --tail=200 app mysql redis
```

Kiểm tra dung lượng đĩa, quyền thư mục, trạng thái MySQL/Redis và migration trước
khi restart lặp lại.

### Entra ID đăng nhập thất bại

- Tenant ID và Client ID phải thuộc cùng App Registration.
- Client secret phải còn hạn và đã mount đúng file.
- Redirect URI phải trùng tuyệt đối cả `https`, hostname, cổng và path.
- Đồng hồ Ubuntu phải được đồng bộ.
- Máy chủ phải truy cập outbound HTTPS tới Microsoft Entra và Graph.

## 15. Checklist nghiệm thu production

- [ ] Ubuntu, DNS, NTP và firewall đã được kiểm tra.
- [ ] Docker Engine/Compose plugin được cài từ repository chính thức.
- [ ] App chỉ bind `127.0.0.1:3000`; MySQL/Redis không public.
- [ ] Đủ bảy secret, không có secret trong `.env` hoặc Git.
- [ ] Bundle CA hợp lệ và không chứa private key.
- [ ] `--prepare-only` chạy đạt.
- [ ] `app`, `mysql`, `redis` healthy; `/readyz` trả HTTP 200.
- [ ] HTTPS hợp lệ và HTTP chuyển sang HTTPS.
- [ ] Admin cục bộ break-glass đã được kiểm thử.
- [ ] Setup đã tắt bằng `ASSETMASTER_SETUP_ENABLED=false`.
- [ ] LDAPS và/hoặc Entra ID đã qua kiểm tra kết nối và UAT.
- [ ] Có backup database, files và secrets mã hóa.
- [ ] Restore và rollback đã được thử trên staging.

## 16. Phạm vi kiểm thử CI

CI dựng một stack Linux cô lập với dữ liệu, CA và secrets tạm; kiểm tra
`/readyz`, MySQL và Redis rồi thu log khi thất bại. CI xác minh khả năng
build/khởi động Compose, nhưng không thay thế UAT với Domain Controller, tenant
Entra, chứng chỉ HTTPS và mạng production thật.

