# Triển khai AssetMaster trên Ubuntu bằng Docker Compose

Tài liệu này áp dụng cho Ubuntu Server và không thay đổi luồng Docker Desktop.
Docker Desktop tiếp tục dùng `docker-compose.yml` kết hợp
`docker-compose.desktop.yml`; Ubuntu dùng `docker-compose.yml` kết hợp
`docker-compose.linux.yml`.

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
