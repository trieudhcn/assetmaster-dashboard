# Triển khai nhanh AssetMaster với Docker Compose

> **Phạm vi.** Gói này chạy ba dịch vụ: AssetMaster, MySQL 8.4 và Redis 7.4. Cổng ứng dụng mặc định chỉ bind vào `127.0.0.1:3000`, vì vậy Nginx trên cùng máy chủ là lớp duy nhất cần công bố HTTPS cho LAN/VPN. MySQL và Redis không được publish cổng ra host.

## 1. Thành phần và giới hạn hiện tại

| Dịch vụ | Vai trò                                                        | Lưu trữ bền vững      | Công bố cổng              |
| ------- | -------------------------------------------------------------- | --------------------- | ------------------------- |
| `app`   | UI React, Express/tRPC, `/setup`, session và LDAPS             | `assetmaster_runtime` | `127.0.0.1:3000` mặc định |
| `mysql` | Dữ liệu nghiệp vụ, cấu hình Directory, audit và session        | `mysql_data`          | Không                     |
| `redis` | Dịch vụ Redis sẵn sàng cho cache, queue hoặc session tương lai | `redis_data` với AOF  | Không                     |

Redis được khởi động, bảo vệ bằng password và kiểm tra healthcheck, nhưng phiên đăng nhập AssetMaster hiện vẫn lưu trong MySQL. Không xóa MySQL hay chuyển session sang Redis chỉ vì Redis đã có mặt. Bản self-hosted hiện tại vẫn còn phụ thuộc cơ chế Forge cho **tệp đính kèm**; cần triển khai adapter lưu tệp nội bộ/MinIO trước khi dùng upload tài liệu trong production.

## 2. Khởi động nhanh

Trên máy chủ nội bộ đã cài Docker Engine cùng Docker Compose plugin, lấy source release và chuẩn bị cấu hình không nhạy cảm:

```bash
cd /opt/assetmaster/app
cp docker/compose.env.template .env
mkdir -p secrets
chmod 700 secrets
```

Tạo **năm** secret riêng biệt; không commit, gửi qua chat hoặc dán vào `.env`. Các lệnh sau chỉ tạo file cục bộ có permission `0600`:

```bash
umask 077
openssl rand -base64 48 > secrets/mysql_root_password.txt
openssl rand -base64 48 > secrets/mysql_app_password.txt
openssl rand -base64 48 > secrets/redis_password.txt
openssl rand -base64 48 > secrets/jwt_secret.txt
openssl rand -base64 48 > secrets/setup_token.txt
```

Sau đó dựng image và khởi động stack:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Khi cả ba dịch vụ đều `healthy`, mở `https://<ten-mien-noi-bo>/setup` qua Nginx. Nhập MySQL Host là `mysql`, Port là `3306`, Database/User theo `.env`, password lấy từ `secrets/mysql_app_password.txt`, và Setup Token lấy từ `secrets/setup_token.txt`. MySQL container đã tạo sẵn database, nên installer được phép tiếp tục với user ứng dụng có quyền trên database đó.

## 3. Biến môi trường và Docker secrets

`.env` được tạo từ `docker/compose.env.template` và chỉ chứa thông số không nhạy cảm. Compose chuyển password/token dưới dạng Docker secret và entrypoint chỉ nạp chúng vào process khi khởi động. `DATABASE_URL` được tạo trong bộ nhớ từ secret; bản Compose không cần lưu URL database chứa password vào volume runtime.

| File/biến                         | Mục đích                                    | Cách quản lý                        |
| --------------------------------- | ------------------------------------------- | ----------------------------------- |
| `secrets/mysql_root_password.txt` | Khởi tạo/quản trị MySQL                     | Root-only, chỉ gắn cho `mysql`      |
| `secrets/mysql_app_password.txt`  | Kết nối database của AssetMaster            | Root-only, gắn cho `mysql` và `app` |
| `secrets/redis_password.txt`      | Xác thực Redis nội bộ                       | Root-only, gắn cho `redis` và `app` |
| `secrets/jwt_secret.txt`          | Tương thích luồng ký cookie/OAuth cũ        | Root-only, chỉ gắn cho `app`        |
| `secrets/setup_token.txt`         | Cho phép wizard `/setup` đúng một lần       | Root-only, chỉ gắn cho `app`        |
| `.env`                            | Bind IP, port, database name/user, timezone | Không chứa password hay token       |

Sau khi `/setup` hoàn tất, đổi `ASSETMASTER_SETUP_ENABLED=false` trong `.env`, rồi chạy `docker compose up -d --force-recreate app`. Installer cũng tự khóa theo trạng thái database, nhưng tắt feature flag làm giảm bề mặt truy cập. Lưu token vào password manager để phục vụ audit, rồi xoay token nếu đã từng chia sẻ sai kênh.

## 4. Reverse proxy, LDAPS và kiểm tra vận hành

Nginx host proxy `https://assetmaster.noi-bo.example` về `http://127.0.0.1:3000` và phải chuyển `X-Forwarded-Proto`. Cấu hình mẫu Nginx, cách mount CA/bind secret LDAPS, ánh xạ nhóm quyền và đồng bộ tài khoản được duy trì trong [runbook self-hosted](./self-hosted-deployment-runbook.md).

Trước khi cho nhân viên truy cập, xác minh `/setup` đã bị tắt, Admin bootstrap đăng nhập được, cookie HTTPS có cờ Secure, MySQL/Redis không có cổng public và kiểm tra LDAPS đạt với CA nội bộ. Docker Compose hỗ trợ dùng healthcheck để chờ dependency sẵn sàng; `depends_on.condition: service_healthy` trong gói này chỉ khởi động `app` sau khi MySQL và Redis đạt trạng thái khỏe.[1]

## 5. Sao lưu, dừng và khôi phục

Backup logical MySQL trước mọi nâng cấp. Lệnh sau lấy password từ secret trong container, vì vậy password không đi vào shell history của máy chủ:

```bash
mkdir -p /opt/assetmaster/backups
docker compose exec -T mysql sh -ec \
  'mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE"' \
  > /opt/assetmaster/backups/assetmaster-$(date +%F-%H%M).sql
```

Lưu dump, `mysql_data`, `assetmaster_runtime` và secret theo chính sách backup RAID đã mã hóa của doanh nghiệp. RAID không thay thế bản sao logical hoặc thực hành khôi phục.[2] Để dừng stack mà vẫn giữ dữ liệu, dùng `docker compose down`; **không** dùng `docker compose down -v` trừ khi chủ đích xóa vĩnh viễn database và runtime volume.

## 6. Bảo trì và giới hạn xác thực

Để cập nhật code, lấy release đã kiểm thử, backup, sau đó chạy `docker compose up -d --build`. Chỉ đưa traffic trở lại sau khi `docker compose ps`, log ứng dụng và smoke test đạt. Docker Compose secrets được mount chỉ đọc vào service; secret file nguồn vẫn phải giữ ngoài Git và giới hạn quyền ở máy chủ.[3]

`docker compose config --quiet` kiểm tra cú pháp/các biến thay thế, nhưng **không thay thế UAT**: cần thử lại trên MySQL trống và Active Directory staging với CA/bind secret thật trước production.

## References

[1] [Docker Docs — Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/)

[2] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)

[3] [Docker Docs — Secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
