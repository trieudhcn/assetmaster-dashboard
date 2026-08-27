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
New-Item -ItemType Directory -Force -Path "$root\secrets"
Set-Location $root
Copy-Item docker\compose.env.desktop.template .env -Force
```

> **Quan trọng.** Trên Windows/macOS, dùng `docker-compose.desktop.yml` cùng file Compose chính. Đừng copy `docker/compose.env.template` vào `.env` cho Docker Desktop vì mẫu đó dùng đường dẫn Linux `/srv/assetmaster/...`, gây lỗi mount `no such file or directory`.

Tạo 5 secret bằng PowerShell. Chạy khối sau trong thư mục source:

```powershell
$names = @(
  "mysql_root_password",
  "mysql_app_password",
  "redis_password",
  "jwt_secret",
  "setup_token"
)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
foreach ($name in $names) {
  $bytes = New-Object byte[] 48
  $rng.GetBytes($bytes)
  $secretPath = Join-Path (Get-Location) ("secrets\{0}.txt" -f $name)
  [System.IO.File]::WriteAllText($secretPath, [Convert]::ToBase64String($bytes), [System.Text.Encoding]::ASCII)
}
$rng.Dispose()
```

### macOS Terminal

```bash
mkdir -p ~/AssetMaster/secrets
cd ~/AssetMaster
cp docker/compose.env.desktop.template .env
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
docker compose -f docker-compose.yml -f docker-compose.desktop.yml config --quiet
```

2. Build và khởi động AssetMaster, MySQL, Redis:

```bash
docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.desktop.yml ps
```

3. Chờ đến khi ba service có trạng thái **healthy**. Nếu chưa đạt, xem log:

```bash
docker compose -f docker-compose.yml -f docker-compose.desktop.yml logs -f app
docker compose -f docker-compose.yml -f docker-compose.desktop.yml logs -f mysql
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
docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --force-recreate app
```

Giữ Setup Token trong password manager. Không để `/setup` hoạt động sau khi đã cài xong.

### Nếu `/setup` báo lỗi migration `retiredAt`

Lỗi dạng `Failed query: ALTER TABLE assets ADD retiredAt timestamp` xuất hiện ở bản source cũ do migration đã khai báo cột `retiredAt` hai lần. Bản source hiện tại kiểm tra `INFORMATION_SCHEMA` trước khi thêm từng cột, nên có thể chạy lại trên MySQL Docker kể cả khi lần trước đã thêm dở một cột. **Không xóa database, `.assetmaster-data` hay Docker volume** để xử lý lỗi này.

Trước hết, cập nhật source để file `drizzle/0031_curly_nebula.sql` chứa `INFORMATION_SCHEMA.COLUMNS`. Sau đó, từ thư mục AssetMaster, build lại riêng container ứng dụng và xem log:

```powershell
docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --build --force-recreate app
docker compose -f docker-compose.yml -f docker-compose.desktop.yml logs --tail=100 app
```

Khi log xác nhận ứng dụng đã lắng nghe cổng 3000, tải lại `/setup` và dùng lại cùng thông tin. Migration tiếp tục từ trạng thái hiện có; dữ liệu MySQL không bị xóa.

### Nếu log cũ báo `OAUTH_SERVER_URL` hoặc `%VITE_ANALYTICS_ENDPOINT%`

Không cần cấu hình Manus OAuth hay Umami Analytics cho bản self-hosted. Các dòng này thuộc bản source cũ: OAuth hosted đã bị nạp dù self-hosted không dùng nó, còn URL Analytics chưa có biến build nên bị Express hiểu nhầm là URL có ký tự `%`. Hãy cập nhật source, rồi build lại **chỉ** service app bằng lệnh ở trên. Nếu log mới chỉ còn `Server running on http://localhost:3000/`, ứng dụng đã sẵn sàng mở `/setup`.

### Nếu Docker build báo `mysql.sock` hoặc `failed to solve: invalid file request`

Lỗi này có nghĩa Docker đang cố copy thư mục runtime `.assetmaster-data` vào build context, trong khi thư mục đó chứa socket MySQL chỉ hợp lệ khi container đang chạy. Bản source hiện tại có file `.dockerignore` để loại trừ `.assetmaster-data`, `.assetmaster-files`, `.env` và `secrets` khỏi image build.

Sau khi cập nhật source, **giữ nguyên** `.assetmaster-data`, `.assetmaster-files`, `.env` và `secrets`, rồi chạy lại lệnh sau. Không xóa thư mục runtime và không dùng `down -v`.

```powershell
docker compose -f docker-compose.yml -f docker-compose.desktop.yml build --no-cache app
docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --force-recreate app
```

## 6. Cấu hình kho tệp chia sẻ và kiểm tra upload

1. Đăng nhập bằng Admin bootstrap, mở **Cài đặt hệ thống → Kho tệp đính kèm**.
2. Xác nhận nhãn **Đã mount thư mục chia sẻ**. Nếu chưa có, kiểm tra `ASSETMASTER_DESKTOP_FILES_DIR` trong `.env`, thư mục host và chạy lại `docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --force-recreate app`.
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

| Mục tiêu                                        | Lệnh                                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tạm dừng nhưng giữ dữ liệu                      | `docker compose -f docker-compose.yml -f docker-compose.desktop.yml stop`                |
| Chạy lại                                        | `docker compose -f docker-compose.yml -f docker-compose.desktop.yml start`               |
| Dừng/xóa container nhưng giữ dữ liệu bind mount | `docker compose -f docker-compose.yml -f docker-compose.desktop.yml down`                |
| Xem trạng thái                                  | `docker compose -f docker-compose.yml -f docker-compose.desktop.yml ps`                  |
| Xem log ứng dụng                                | `docker compose -f docker-compose.yml -f docker-compose.desktop.yml logs --tail=200 app` |

Không dùng `docker compose down -v` khi cần giữ dữ liệu. Backup tối thiểu gồm dump MySQL, thư mục `data/runtime`, `files` và bản sao secrets được bảo vệ. Thực hiện restore vào môi trường cô lập trước khi tin cậy bản backup.[5]

### 8.1 Backup MySQL trước khi cập nhật source hoặc rebuild app (Windows PowerShell 5.1+)

Thực hiện các lệnh dưới đây **trước mọi lần cập nhật có thay đổi server hoặc migration**. Lệnh chỉ đọc dữ liệu từ MySQL, tạo một logical dump SQL dưới thư mục `backups`, rồi xóa tệp tạm trong container. Nó không dừng hoặc sửa MySQL, Redis hay `app`.

```powershell
# Chạy trong thư mục source AssetMaster.
$compose = @("-f", "docker-compose.yml", "-f", "docker-compose.desktop.yml")
$backupDir = Join-Path (Get-Location) "backups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "assetmaster-$stamp.sql"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Chỉ tiếp tục khi MySQL container đang healthy.
$mysqlId = docker compose @compose ps -q mysql
if (-not $mysqlId) { throw "Không tìm thấy container mysql. Hãy chạy docker compose @compose ps." }
$mysqlHealth = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $mysqlId
if ($mysqlHealth -ne "healthy") { throw "MySQL chưa healthy: $mysqlHealth. Không backup/rebuild lúc này." }

# Mật khẩu chỉ được đọc bên trong container từ Docker secret, không hiện ở PowerShell history.
docker compose @compose exec -T mysql sh -ec 'umask 077; mysqldump --single-transaction --routines --events --triggers --set-gtid-purged=OFF -u"$MYSQL_USER" -p"$(cat /run/secrets/mysql_app_password)" "$MYSQL_DATABASE" > /tmp/assetmaster-backup.sql'
if ($LASTEXITCODE -ne 0) { throw "mysqldump thất bại; không tiếp tục cập nhật." }

docker cp "${mysqlId}:/tmp/assetmaster-backup.sql" $backupFile
docker compose @compose exec -T mysql sh -ec 'rm -f /tmp/assetmaster-backup.sql'
if ($LASTEXITCODE -ne 0) { throw "Không thể xóa tệp tạm trong container MySQL." }

# Kiểm tra nhanh nội dung, dung lượng và checksum của dump.
if ((Get-Item $backupFile).Length -lt 512) { throw "Dump quá nhỏ; hãy kiểm tra trước khi rebuild." }
if (-not (Select-String -Path $backupFile -Pattern '^-- MySQL dump' -Quiet)) { throw "Không nhận diện được header mysqldump; hãy kiểm tra dump." }
Get-FileHash -Path $backupFile -Algorithm SHA256
Get-Item $backupFile | Select-Object FullName, Length, LastWriteTime
```

Kết quả cuối cùng phải hiển thị file `.sql`, dung lượng lớn hơn 512 byte và checksum SHA-256. Sao chép file dump sang vị trí backup độc lập, được mã hóa theo chính sách doanh nghiệp. Không lưu dump trong Git hoặc gửi tệp qua chat. Backup logical này không thay thế việc sao lưu `.assetmaster-files`, `.assetmaster-data/runtime` và các secrets được bảo vệ.

### 8.2 Kiểm tra app đã cập nhật sau rebuild

Sau khi build app, dùng bộ lệnh dưới đây để kiểm tra ba service, tình trạng health, image ID thực tế của container `app`, log gần nhất và dấu hiệu migration an toàn. Không chỉ dựa vào trạng thái `Up`; `app` phải là `healthy`.

```powershell
$compose = @("-f", "docker-compose.yml", "-f", "docker-compose.desktop.yml")
docker compose @compose ps

$appId = docker compose @compose ps -q app
if (-not $appId) { throw "Không tìm thấy container app." }
docker inspect --format 'Trạng thái={{.State.Status}} | Health={{if .State.Health}}{{.State.Health.Status}}{{else}}không có healthcheck{{end}} | Image={{.Image}} | Tạo lúc={{.Created}}' $appId
docker image inspect --format 'Image ID={{.Id}} | Tạo lúc={{.Created}} | Tags={{join .RepoTags ", "}}' "assetmaster:production"
docker compose @compose logs --tail=100 app
docker compose @compose exec -T app sh -ec 'grep -q "INFORMATION_SCHEMA.COLUMNS" /app/drizzle/0031_curly_nebula.sql && echo "Migration retiredAt an toàn đã có trong image"'
```

Nếu `Health=healthy`, image ID của container khớp image `assetmaster:production`, log không có `Error` và dòng cuối cùng xác nhận migration, service `app` đã nhận source mới. Khi cần cập nhật app mà **không động vào MySQL/Redis**, sau khi backup thành công chỉ chạy:

```powershell
docker compose -f docker-compose.yml -f docker-compose.desktop.yml up -d --build --force-recreate --no-deps app
```

## 9. Khi nào chuyển sang Ubuntu Server?

Chuyển trước khi mở cho nhân viên sử dụng liên tục, cần Nginx/HTTPS trong LAN/VPN, lưu dữ liệu trên RAID, backup theo chính sách, monitoring hoặc phân quyền hạ tầng. Làm theo đầy đủ **Phương án B — Docker Compose production** trong [runbook triển khai nội bộ](./huong-dan-trien-khai-noi-bo.md#5-phương-án-b--docker-compose-production-khuyến-nghị).

## References

[1] [Docker Docs — Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

[2] [Docker Docs — Install Docker Desktop on Mac](https://docs.docker.com/desktop/setup/install/mac-install/)

[3] [Docker Docs — Change Docker Desktop settings](https://docs.docker.com/desktop/settings-and-maintenance/settings/)

[4] [Docker Docs — Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)

[5] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)
