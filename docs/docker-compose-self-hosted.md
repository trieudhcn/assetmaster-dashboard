# Triển khai production AssetMaster với Docker Compose

> **Phạm vi.** Gói này chạy ba dịch vụ: AssetMaster, MySQL 8.4 và Redis 7.4. Cổng ứng dụng mặc định chỉ bind vào `127.0.0.1:3000`, vì vậy Nginx trên cùng máy chủ là lớp duy nhất cần công bố HTTPS cho LAN/VPN. MySQL và Redis không được publish cổng ra host.

## 1. Thành phần và giới hạn hiện tại

| Dịch vụ | Vai trò                                                        | Lưu trữ bền vững                        | Công bố cổng              |
| ------- | -------------------------------------------------------------- | --------------------------------------- | ------------------------- |
| `app`   | UI React, Express/tRPC, `/setup`, session và LDAPS             | `${ASSETMASTER_DATA_DIR}/runtime`       | `127.0.0.1:3000` mặc định |
| `mysql` | Dữ liệu nghiệp vụ, cấu hình Directory, audit và session        | `${ASSETMASTER_DATA_DIR}/mysql`         | Không                     |
| `redis` | Dịch vụ Redis sẵn sàng cho cache, queue hoặc session tương lai | `${ASSETMASTER_DATA_DIR}/redis` với AOF | Không                     |

Redis được khởi động, bảo vệ bằng password và kiểm tra healthcheck, nhưng phiên đăng nhập AssetMaster hiện vẫn lưu trong MySQL. Không xóa MySQL hay chuyển session sang Redis chỉ vì Redis đã có mặt. Bản self-hosted hiện tại vẫn còn phụ thuộc cơ chế Forge cho **tệp đính kèm**; cần triển khai adapter lưu tệp nội bộ/MinIO trước khi dùng upload tài liệu trong production.

## 2. Khởi động nhanh

Trên máy chủ nội bộ đã cài Docker Engine cùng Docker Compose plugin, lấy source release và chuẩn bị cấu hình không nhạy cảm:

```bash
cd /opt/assetmaster/app
cp docker/compose.env.template .env
sudo install -d -m 0750 -o root -g 10001 /etc/assetmaster/secrets
sudo install -d -m 0750 -o 10001 -g 10001 /srv/assetmaster/data/runtime
sudo install -d -m 0750 -o 999 -g 999 /srv/assetmaster/data/mysql /srv/assetmaster/data/redis
```

Tạo **năm** secret riêng biệt; không commit, gửi qua chat hoặc dán vào `.env`. Các lệnh sau chỉ tạo file cục bộ có permission `0600`:

```bash
umask 077
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/mysql_root_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/mysql_app_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/redis_password.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/jwt_secret.txt'
sudo sh -c 'openssl rand -base64 48 > /etc/assetmaster/secrets/setup_token.txt'
sudo chown root:10001 /etc/assetmaster/secrets/*.txt
sudo chmod 640 /etc/assetmaster/secrets/*.txt
```

Các volume bind vào `${ASSETMASTER_DATA_DIR}` để đội hạ tầng chủ động đặt vùng này trên phân vùng/RAID đã quản lý. Nếu đổi đường dẫn, cập nhật `ASSETMASTER_DATA_DIR` trong `.env` và tạo trước ba thư mục con cùng permission tương ứng. `app` dùng UID/GID `10001`; MySQL và Redis dùng UID/GID `999` được cố định trong Compose, nên không cần cho phép ghi rộng trên host. Sau đó dựng image và khởi động stack:

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Khi cả ba dịch vụ đều `healthy`, mở `https://<ten-mien-noi-bo>/setup` qua Nginx. Nhập MySQL Host là `mysql`, Port là `3306`, Database/User theo `.env`, password lấy từ `secrets/mysql_app_password.txt`, và Setup Token lấy từ `secrets/setup_token.txt`. MySQL container đã tạo sẵn database, nên installer được phép tiếp tục với user ứng dụng có quyền trên database đó.

## 3. Biến môi trường và Docker secrets

`.env` được tạo từ `docker/compose.env.template` và chỉ chứa thông số không nhạy cảm. Compose chuyển password/token dưới dạng Docker secret và entrypoint chỉ nạp chúng vào process khi khởi động. `DATABASE_URL` được tạo trong bộ nhớ từ secret; bản Compose không cần lưu URL database chứa password vào volume runtime. AssetMaster chạy bằng user riêng không phải root, filesystem container chỉ đọc, có giới hạn process/memory và chỉ runtime volume có quyền ghi.

| File/biến                                          | Mục đích                                    | Cách quản lý                                        |
| -------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `/etc/assetmaster/secrets/mysql_root_password.txt` | Khởi tạo/quản trị MySQL                     | `root:10001`, mode `0640`; chỉ gắn cho `mysql`      |
| `/etc/assetmaster/secrets/mysql_app_password.txt`  | Kết nối database của AssetMaster            | `root:10001`, mode `0640`; gắn cho `mysql` và `app` |
| `/etc/assetmaster/secrets/redis_password.txt`      | Xác thực Redis nội bộ                       | `root:10001`, mode `0640`; gắn cho `redis` và `app` |
| `/etc/assetmaster/secrets/jwt_secret.txt`          | Tương thích luồng ký cookie/OAuth cũ        | `root:10001`, mode `0640`; chỉ gắn cho `app`        |
| `/etc/assetmaster/secrets/setup_token.txt`         | Cho phép wizard `/setup` đúng một lần       | `root:10001`, mode `0640`; chỉ gắn cho `app`        |
| `.env`                                             | Bind IP, port, database name/user, timezone | Không chứa password hay token                       |

Sau khi `/setup` hoàn tất, đổi `ASSETMASTER_SETUP_ENABLED=false` trong `.env`, rồi chạy `docker compose up -d --force-recreate app`. Installer cũng tự khóa theo trạng thái database, nhưng tắt feature flag làm giảm bề mặt truy cập. Lưu token vào password manager để phục vụ audit, rồi xoay token nếu đã từng chia sẻ sai kênh. `10001` là UID/GID của user `assetmaster` trong image; group chỉ cho phép process ứng dụng đọc những secret mà service đó đã được gắn.

## 4. Reverse proxy, LDAPS và kiểm tra vận hành

Nginx host proxy `https://assetmaster.noi-bo.example` về `http://127.0.0.1:3000` và phải chuyển `X-Forwarded-Proto`. Compose tách `mysql`/`redis` vào `assetmaster_backend` internal network; chỉ `app` thuộc `assetmaster_edge` để vẫn kết nối được Domain Controller qua LDAPS. Cấu hình mẫu Nginx, cách mount CA/bind secret LDAPS, ánh xạ nhóm quyền và đồng bộ tài khoản được duy trì trong [runbook self-hosted](./self-hosted-deployment-runbook.md).

Trước khi cho nhân viên truy cập, xác minh `/setup` đã bị tắt, Admin bootstrap đăng nhập được, cookie HTTPS có cờ Secure, MySQL/Redis không có cổng public và kiểm tra LDAPS đạt với CA nội bộ. Docker Compose hỗ trợ dùng healthcheck để chờ dependency sẵn sàng; `depends_on.condition: service_healthy` trong gói này chỉ khởi động `app` sau khi MySQL và Redis đạt trạng thái khỏe.[1]

## 5. Sao lưu, dừng và khôi phục

Backup logical MySQL trước mọi nâng cấp. Lệnh sau lấy password từ secret trong container, vì vậy password không đi vào shell history của máy chủ:

```bash
mkdir -p /opt/assetmaster/backups
docker compose exec -T mysql sh -ec \
  'mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE"' \
  > /opt/assetmaster/backups/assetmaster-$(date +%F-%H%M).sql
```

Lưu dump, `${ASSETMASTER_DATA_DIR}/mysql`, `${ASSETMASTER_DATA_DIR}/runtime` và secret theo chính sách backup RAID đã mã hóa của doanh nghiệp. RAID không thay thế bản sao logical hoặc thực hành khôi phục.[2] Log container dùng Docker `local` driver, tự xoay vòng 5 file/10 MB; thu thập thêm log tập trung nếu doanh nghiệp đã có nền tảng quan sát. Để dừng stack mà vẫn giữ dữ liệu, dùng `docker compose down`; **không** dùng `docker compose down -v` trừ khi chủ đích xóa vĩnh viễn database và runtime volume.

## 6. Bảo trì và giới hạn xác thực

Để cập nhật code, lấy release đã kiểm thử, backup, sau đó chạy `docker compose up -d --build`. Chỉ đưa traffic trở lại sau khi `docker compose ps`, log ứng dụng và smoke test đạt. Docker Compose secrets được mount chỉ đọc vào service; secret file nguồn vẫn phải giữ ngoài Git và giới hạn quyền ở máy chủ.[3]

`docker compose config --quiet` kiểm tra cú pháp/các biến thay thế, nhưng **không thay thế UAT**: cần thử lại trên MySQL trống và Active Directory staging với CA/bind secret thật trước production.

### Phân biệt preview hosted và UAT self-hosted

Preview đang quản lý không bật `SELF_HOSTED_AUTH_ENABLED`, vì vậy `/setup` phải hiển thị thông báo chỉ dùng cho self-hosted và bảng trạng thái hạ tầng không xuất hiện trong Cài đặt. Đây là hành vi dự kiến, không phải lỗi. Đã xác minh tuyến này cùng trang Cài đặt ở desktop và khung 390 px; xác minh wizard đầy đủ, MySQL/Redis và panel trạng thái vẫn phải thực hiện sau khi chạy Compose với Docker secret trên máy chủ staging.

## References

[1] [Docker Docs — Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/)

[2] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)

[3] [Docker Docs — Secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
