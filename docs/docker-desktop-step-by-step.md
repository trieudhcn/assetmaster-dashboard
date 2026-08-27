# Chạy AssetMaster bằng Docker Desktop: hướng dẫn từng bước

> **Mục đích.** Docker Desktop phù hợp để thử nghiệm, đào tạo hoặc UAT trên Windows 10/11 và macOS. Đối với hệ thống nội bộ hoạt động liên tục, hãy dùng Ubuntu Server + Docker Engine + Nginx theo [runbook triển khai nội bộ](./huong-dan-trien-khai-noi-bo.md). Không dùng Docker Desktop trên Windows Server; Docker chỉ hỗ trợ Docker Desktop cho máy Windows client còn được Microsoft hỗ trợ.[1]

## 1. Điều kiện trước khi bắt đầu

| Hạng mục              | Windows                                                         | macOS                                                  |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Máy chủ container     | Docker Desktop chạy **Linux containers** với WSL 2 backend      | Docker Desktop đúng kiến trúc Apple silicon hoặc Intel |
| Bộ nhớ Docker Desktop | Đặt tối thiểu 4 GB trong **Settings → Resources**               | Đặt tối thiểu 4 GB trong **Settings → Resources**      |
| Source                | Giải nén vào thư mục riêng, ví dụ `C:\Users\<user>\AssetMaster` | Giải nén vào `~/AssetMaster`                           |
| Kết nối               | Cần Internet ở lần đầu để tải image Node/MySQL/Redis            | Tương tự Windows                                       |

Windows cần WSL 2, ảo hóa BIOS/UEFI và Docker Desktop; Docker khuyến nghị WSL 2 cho phần lớn người dùng.[1] Mac cần Docker Desktop tương thích chip máy và Docker nêu mức tối thiểu 4 GB RAM.[2] Kiểm tra điều khoản sử dụng Docker Desktop của doanh nghiệp trước khi sử dụng trong môi trường thương mại lớn.[1]

## 2. Cài Docker Desktop

### Windows 10/11

1. Mở **PowerShell với quyền Administrator**, chạy `wsl --install`, khởi động lại nếu Windows yêu cầu, rồi chạy `wsl --update`.
2. Tải Docker Desktop từ [trang cài đặt Windows chính thức](https://docs.docker.com/desktop/setup/install/windows-install/). Trong installer, chọn **Use WSL 2 instead of Hyper-V**.
3. Mở Docker Desktop, chấp nhận điều khoản, chờ trạng thái Engine là **Running**. Đảm bảo đang dùng **Linux containers**, không chuyển sang Windows containers.
4. Mở PowerShell thường và xác nhận:

```powershell
docker version
docker compose version
```

### macOS

1. Tải Docker Desktop đúng bản **Apple silicon** hoặc **Intel** từ [trang cài đặt Mac chính thức](https://docs.docker.com/desktop/setup/install/mac-install/).
2. Mở `Docker.dmg`, kéo Docker vào **Applications**, rồi mở Docker Desktop và hoàn tất bước cấp quyền hệ thống.
3. Trong **Settings → Resources**, cấp tối thiểu 4 GB memory. Nếu thư mục project không thuộc `/Users`, vào **Settings → Resources → File sharing** và chỉ chia sẻ đúng thư mục cần dùng.[3]
4. Mở Terminal và xác nhận:

```bash
docker version
docker compose version
```

## 3. Chuẩn bị thư mục source, dữ liệu và secrets

Không chạy Compose trong thư mục Downloads hoặc Desktop dùng chung. Tạo một thư mục riêng chỉ cho nhóm quản trị máy. Docker Desktop dùng bind mount để đưa đường dẫn máy chủ vào container; chỉ chia sẻ các thư mục cần thiết vì mount ghi có thể thay đổi file trên host.[4]

### Windows PowerShell

```powershell
$root = "$env:USERPROFILE\AssetMaster"
New-Item -ItemType Directory -Force -Path "$root\data\runtime", "$root\data\mysql", "$root\data\redis", "$root\files", "$root\secrets"
Set-Location $root
Copy-Item docker\compose.env.template .env
```

Mở `.env` bằng Notepad hoặc VS Code và đặt các đường dẫn bằng dấu gạch chéo:

```dotenv
ASSETMASTER_DATA_DIR=C:/Users/<ten-nguoi-dung>/AssetMaster/data
ASSETMASTER_FILES_DIR=C:/Users/<ten-nguoi-dung>/AssetMaster/files
ASSETMASTER_SECRETS_DIR=C:/Users/<ten-nguoi-dung>/AssetMaster/secrets
ASSETMASTER_BIND_IP=127.0.0.1
ASSETMASTER_PORT=3000
ASSETMASTER_SETUP_ENABLED=true
```

Tạo 5 secret bằng PowerShell. Chạy khối sau trong thư mục source:

```powershell
$names = "mysql_root_password","mysql_app_password","redis_password","jwt_secret","setup_token"
foreach ($name in $names) {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes) | Set-Content -NoNewline "secrets\$name.txt"
}
```

### macOS Terminal

```bash
mkdir -p ~/AssetMaster/{data/runtime,data/mysql,data/redis,files,secrets}
cd ~/AssetMaster
cp docker/compose.env.template .env
```

Sửa `.env` như sau, thay `<user>` bằng tên user macOS:

```dotenv
ASSETMASTER_DATA_DIR=/Users/<user>/AssetMaster/data
ASSETMASTER_FILES_DIR=/Users/<user>/AssetMaster/files
ASSETMASTER_SECRETS_DIR=/Users/<user>/AssetMaster/secrets
ASSETMASTER_BIND_IP=127.0.0.1
ASSETMASTER_PORT=3000
ASSETMASTER_SETUP_ENABLED=true
```

Tạo secrets, không đưa các file này lên Git hoặc gửi qua chat/email:

```bash
umask 077
for name in mysql_root_password mysql_app_password redis_password jwt_secret setup_token; do
  openssl rand -base64 48 > "secrets/$name.txt"
done
```

## 4. Khởi động stack

1. Trong thư mục source, kiểm tra cấu hình trước khi tạo container:

```bash
docker compose config --quiet
```

2. Build và khởi động AssetMaster, MySQL, Redis:

```bash
docker compose up -d --build
docker compose ps
```

3. Chờ đến khi ba service có trạng thái **healthy**. Nếu chưa đạt, xem log:

```bash
docker compose logs -f app
docker compose logs -f mysql
```

4. Mở [http://localhost:3000/setup](http://localhost:3000/setup). `127.0.0.1` chỉ mở trên chính máy Docker Desktop; đây là cấu hình an toàn cho UAT. Không đặt `ASSETMASTER_BIND_IP=0.0.0.0` trừ khi có firewall, HTTPS reverse proxy và phạm vi mạng đã được đội hạ tầng phê duyệt.

## 5. Hoàn tất `/setup`

| Bước               | Thao tác                                                                                                                                     | Dữ liệu dùng                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1. Website & Admin | Nhập tên site, URL local/UAT, tên và email Admin bootstrap, mật khẩu mạnh                                                                    | Admin local chỉ dùng làm break-glass            |
| 2. MySQL           | Host `mysql`, port `3306`, database/user đúng `.env`, password từ `secrets/mysql_app_password.txt`, Setup Token từ `secrets/setup_token.txt` | Không nhập MySQL root password                  |
| 3. Rà soát         | Kiểm tra lại và bấm khởi tạo một lần                                                                                                         | Hệ thống tạo schema/migration và Admin Argon2id |

Khi wizard thành công, sửa `.env` thành `ASSETMASTER_SETUP_ENABLED=false`, rồi chạy:

```bash
docker compose up -d --force-recreate app
```

Giữ Setup Token trong password manager. Không để `/setup` hoạt động sau khi đã cài xong.

## 6. Cấu hình kho tệp chia sẻ và kiểm tra upload

1. Đăng nhập bằng Admin bootstrap, mở **Cài đặt hệ thống → Kho tệp đính kèm**.
2. Xác nhận nhãn **Đã mount thư mục chia sẻ**. Nếu chưa có, kiểm tra `ASSETMASTER_FILES_DIR` trong `.env`, thư mục host và chạy lại `docker compose up -d --force-recreate app`.
3. Chọn thư mục con, ví dụ `attachments`, bấm **Lưu cấu hình**, rồi bấm **Kiểm tra thư mục**.
4. Chỉ upload tài liệu sau khi kiểm tra đạt. Hệ thống tạo/xóa file probe vô hại và chặn đường dẫn đi ngược (`..`).
5. Tải thử PDF hoặc ảnh, mở lại từ AssetMaster và kiểm tra tệp nằm dưới `files/attachments` trên máy host. Không share trực tiếp thư mục `files` bằng web server không xác thực.

> **Giới hạn của Docker Desktop.** Đây là UAT/desktop stack; thư mục dữ liệu gắn với máy đó. Đối với dữ liệu doanh nghiệp, chuyển các đường dẫn `data`/`files` sang vùng RAID trên Ubuntu Server, rồi thực hiện backup và restore drill trước cutover.

## 7. Cấu hình LDAPS và kiểm tra

1. Mount thêm secret bind password vào Compose theo [runbook chính](./huong-dan-trien-khai-noi-bo.md#8-cấu-hình-ldaps-nhóm-quyền-và-đồng-bộ-người-dùng).
2. Vào **Cài đặt hệ thống → Directory LDAP/AD**, nhập URL `ldaps://`, CA, Users Base DN, attribute và `/run/secrets/ldap_bind_password`.
3. Bấm **Kiểm tra bản nháp**, lưu cấu hình, sau đó dùng **Kiểm tra LDAPS** trong **Trạng thái hạ tầng**.
4. Chỉ bật Directory sau khi TLS/CA, bind, Users Base DN, mapping nhóm Admin/User và tài khoản thử nghiệm đều đạt.

## 8. Dừng, sao lưu và dọn UAT

| Mục tiêu                                        | Lệnh                                 |
| ----------------------------------------------- | ------------------------------------ |
| Tạm dừng nhưng giữ dữ liệu                      | `docker compose stop`                |
| Chạy lại                                        | `docker compose start`               |
| Dừng/xóa container nhưng giữ dữ liệu bind mount | `docker compose down`                |
| Xem trạng thái                                  | `docker compose ps`                  |
| Xem log ứng dụng                                | `docker compose logs --tail=200 app` |

Không dùng `docker compose down -v` khi cần giữ dữ liệu. Backup tối thiểu gồm dump MySQL, thư mục `data/runtime`, `files` và bản sao secrets được bảo vệ. Thực hiện restore vào môi trường cô lập trước khi tin cậy bản backup.[5]

## 9. Khi nào chuyển sang Ubuntu Server?

Chuyển trước khi mở cho nhân viên sử dụng liên tục, cần Nginx/HTTPS trong LAN/VPN, lưu dữ liệu trên RAID, backup theo chính sách, monitoring hoặc phân quyền hạ tầng. Làm theo đầy đủ **Phương án B — Docker Compose production** trong [runbook triển khai nội bộ](./huong-dan-trien-khai-noi-bo.md#5-phương-án-b--docker-compose-production-khuyến-nghị).

## References

[1] [Docker Docs — Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

[2] [Docker Docs — Install Docker Desktop on Mac](https://docs.docker.com/desktop/setup/install/mac-install/)

[3] [Docker Docs — Change Docker Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/)

[4] [Docker Docs — Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)

[5] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)
