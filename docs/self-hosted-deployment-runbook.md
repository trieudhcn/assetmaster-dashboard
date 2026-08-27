# Runbook tự triển khai AssetMaster nội bộ

> **Đã hợp nhất.** Dùng [Hướng dẫn triển khai AssetMaster nội bộ: Local đến Docker Compose](./huong-dan-trien-khai-noi-bo.md) làm tài liệu chính thức duy nhất. Tài liệu này được giữ lại để tham chiếu lịch sử thay đổi.

> **Phạm vi.** Tài liệu này áp dụng cho bản AssetMaster self-hosted chạy trong LAN/VPN doanh nghiệp. Đây là trình tự triển khai và vận hành; không áp dụng để cấu hình bản Manus đang phát hành. Chỉ mở cổng HTTPS của Nginx cho mạng nội bộ/VPN. MySQL, kho tệp và LDAPS không được mở ra Internet.

## 1. Mô hình vận hành và nguyên tắc an toàn

Máy chủ chạy Nginx ở lớp ngoài, ứng dụng Node.js AssetMaster ở mạng nội bộ, MySQL và kho tệp riêng. `/setup` chỉ có hiệu lực khi các feature flag self-hosted được bật và có mã cài đặt một lần. Sau khi hoàn tất, installer tự khóa ở tầng ứng dụng; không sử dụng nó như một trang quản trị thông thường.

| Thành phần            | Vai trò                                                | Kết nối được phép                                             |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Nginx                 | Kết thúc TLS, giới hạn truy cập LAN/VPN, reverse proxy | HTTPS 443 từ LAN/VPN; HTTP 80 chỉ chuyển hướng nội bộ nếu cần |
| AssetMaster Node.js   | UI, tRPC API, session, `/setup`, LDAPS adapter         | Chỉ nhận từ Nginx                                             |
| MySQL 8               | Dữ liệu nghiệp vụ, cấu hình Directory, session, audit  | Chỉ nhận từ ứng dụng qua mạng Docker/private host             |
| Kho tệp               | MinIO S3-compatible hoặc volume tệp giới hạn quyền     | Chỉ nhận từ ứng dụng; không public bucket                     |
| Active Directory/LDAP | Nguồn xác thực nhân viên                               | LDAPS TCP 636 từ ứng dụng đến Domain Controller               |

LDAPS thiết lập TLS ngay khi kết nối qua cổng 636; certificate Domain Controller phải có Server Authentication, FQDN đúng trong Subject/SAN và chuỗi CA được máy chủ ứng dụng tin cậy.[1] [2] AssetMaster vẫn giữ Admin bootstrap local như lối vào break-glass, nhưng password chỉ tồn tại dưới dạng Argon2id hash; mật khẩu nhân viên chỉ được xác thực tại AD/LDAP.[3]

## 2. Chuẩn bị gói source và thư mục vận hành

Sao chép source từ GitHub hoặc một bản release đã kiểm thử vào thư mục cố định, ví dụ `/opt/assetmaster/app`. Không để `.env`, secret, database dump hay file upload trong repository. Khi dùng gói container đã chuẩn bị, thực hiện theo [hướng dẫn Docker Compose](./docker-compose-self-hosted.md) thay cho chạy `pnpm` trực tiếp. Tạo riêng các thư mục có quyền tối thiểu cho runtime, log, cấu hình và backup:

```bash
sudo install -d -m 0750 -o assetmaster -g assetmaster \
  /opt/assetmaster/{app,runtime,uploads,logs,backups}
sudo install -d -m 0700 -o root -g root /opt/assetmaster/secrets
cd /opt/assetmaster/app
pnpm install --frozen-lockfile
pnpm build
```

Tạo người dùng dịch vụ không có shell đăng nhập, sau đó chạy ứng dụng bằng account này. Thiết lập owner/ACL của thư mục upload để Node.js có thể ghi, nhưng Nginx không được đọc trực tiếp các tệp nhạy cảm. Nếu dùng MinIO, private bucket và presigned URL ngắn hạn thay thế cho việc public thư mục upload.

## 3. Cấu hình self-hosted trước lần chạy đầu

Tại môi trường production, giữ biến môi trường trong file root-only hoặc Docker secret; không đặt chúng vào UI, Git hay trình duyệt. Ví dụ file `/opt/assetmaster/runtime/assetmaster.env`, permission `0600`:

```dotenv
NODE_ENV=production
SELF_HOSTED_AUTH_ENABLED=true
SELF_HOSTED_SETUP_ENABLED=true
SELF_HOSTED_SETUP_TOKEN=<chuoi-ngau-nhien-32-byte-hoac-dai-hon>
SELF_HOSTED_RUNTIME_CONFIG_PATH=/opt/assetmaster/runtime/runtime.json
JWT_SECRET=<chuoi-ngau-nhien-32-byte-hoac-dai-hon>
```

Sinh mỗi secret độc lập bằng password manager hoặc `openssl rand -base64 48`. Mã `SELF_HOSTED_SETUP_TOKEN` được nhập vào wizard đúng một lần. Sau `/setup`, lưu token ngoài ứng dụng để audit nhưng xoay token hoặc tắt `SELF_HOSTED_SETUP_ENABLED`; không đưa token cho người dùng cuối.

> **Lưu ý.** RAID hỗ trợ chịu lỗi ổ đĩa nhưng không thay thế backup logical đã kiểm thử. Backup cần nằm trên repository/volume RAID đã được bảo vệ, có kiểm tra restore định kỳ và lý tưởng nhất có một bản tách mạng.[4]

## 4. Khởi động lần đầu và dùng wizard `/setup`

Khởi động ứng dụng phía sau Nginx, sau đó mở `https://assetmaster.noi-bo.example/setup`. Wizard chỉ khả dụng trong self-hosted và cần mã cài đặt. Không gửi mã cài đặt qua email/chat không mã hóa.

| Bước wizard               | Nhập                                                           | Kiểm tra phải đạt             | Kết quả                                                                                   |
| ------------------------- | -------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| **1. Website & Admin**    | Tên website, URL nội bộ, họ tên/email/mật khẩu Admin bootstrap | Password tối thiểu 12 ký tự   | Tạo tài khoản break-glass có `passwordHash` Argon2id                                      |
| **2. MySQL**              | Host, port, tên database, user/password cài đặt                | Kết nối `SELECT 1` thành công | Có thể tiếp tục sang rà soát                                                              |
| **3. Rà soát & khởi tạo** | Mã cài đặt một lần                                             | Xác nhận lại dữ liệu          | Tạo database nếu chưa có, chạy Drizzle migrations, ghi cấu hình runtime và khóa installer |

Với cài đặt thủ công, tài khoản MySQL dùng ở bước cài đặt cần quyền tạo database/schema. Với Docker Compose, database đã được service `mysql` tạo trước và installer có thể tiếp tục khi tài khoản ứng dụng chỉ có quyền trên database AssetMaster. Mọi migration phải chạy một lần trong maintenance window, theo dõi log và có database dump trước khi nâng version.

## 5. Reverse proxy và phiên đăng nhập

Nginx phải truyền `X-Forwarded-Proto` cho ứng dụng để cookie session nhận cờ `Secure` khi website dùng HTTPS. Chỉ cache static assets; không cache `/api`, `/setup`, trang đăng nhập hoặc phản hồi chứa cookie. Ví dụ phần upstream tối thiểu:

```nginx
server {
  listen 443 ssl http2;
  server_name assetmaster.noi-bo.example;
  # ssl_certificate /etc/nginx/tls/assetmaster.fullchain.pem;
  # ssl_certificate_key /etc/nginx/tls/assetmaster.key;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location ~ ^/(api|setup|login) {
    add_header Cache-Control "no-store" always;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Thiết lập HTTPS với TLS 1.2 trở lên (ưu tiên TLS 1.3) và cookie `HttpOnly`, `Secure`, `SameSite=Lax`. OWASP khuyến nghị dùng TLS cho mọi trang và không dùng TLS 1.0/1.1.[5]

## 6. Cấu hình LDAPS sau khi website hoạt động

Đăng nhập bằng Admin bootstrap, mở **Cài đặt hệ thống → icon Directory LDAP/AD**. Panel Directory bị ẩn mặc định để giữ trang Cài đặt gọn. Chỉ tài khoản Admin mới xem được panel, audit và các thao tác kết nối.

Thứ tự thực hiện là: tạo Docker secret chứa password bind → mount read-only tại `/run/secrets/...` → nhập URL `ldaps://dc01.noi-bo.example:636`, Users Base DN, Groups Base DN, Bind DN, đường dẫn secret, thuộc tính Directory và CA PEM → bấm **Kiểm tra bản nháp** → lưu nháp → bấm **Kiểm tra LDAPS** → chọn nhóm quyền → kích hoạt LDAPS.

| Trường         | Ví dụ AD                          | Nguyên tắc                                              |
| -------------- | --------------------------------- | ------------------------------------------------------- |
| URL LDAPS      | `ldaps://dc01.noi-bo.example:636` | Không dùng `ldap://`/389                                |
| Users Base DN  | `OU=Users,DC=noi-bo,DC=example`   | Thu hẹp phạm vi đọc                                     |
| ID bất biến    | `objectGUID`                      | Dùng cho liên kết lâu dài, không dựa duy nhất vào email |
| Login/Email    | `userPrincipalName` hoặc `mail`   | Email là định danh đăng nhập của nhân viên              |
| Admin Group DN | `CN=AssetMaster-Admins,...`       | Toàn quyền AssetMaster                                  |
| User Group DN  | `CN=AssetMaster-Users,...`        | Quyền người dùng được cấp trong website                 |

Mật khẩu nhân viên không được ghi log hoặc lưu tại AssetMaster. Khi đăng nhập, ứng dụng tìm DN bằng account bind read-only, kiểm tra membership, rồi bind LDAPS bằng DN người dùng và password vừa nhập để xác thực. Input LDAP được escape và mọi thuộc tính filter được allow-list để phòng LDAP injection.[6]

## 7. Tìm nhóm, đồng bộ người dùng và phân quyền

Trong panel Directory, dùng **Tìm nhóm** để truy vấn tối đa 50 nhóm theo tên trên Groups Base DN. Chọn **Gán Admin** hoặc **Gán User** để điền DN vào ánh xạ; lưu nháp và kiểm tra lại trước khi bật. Nếu doanh nghiệp dùng nested groups, chỉ bật tùy chọn này sau khi xác nhận AD hỗ trợ matching rule tương ứng.

Sau khi kiểm tra LDAPS thành công, dùng **Đồng bộ 500 tài khoản**. Adapter truy vấn paged results theo lô 100 entry để phù hợp với giới hạn trang phổ biến của LDAP server; UI hiển thị 20 kết quả/lần và dùng **Tải thêm 20 tài khoản** để quản trị viên kiểm tra mượt mà. Danh sách thể hiện email, role được ánh xạ và trạng thái `Đồng bộ`/`Bỏ qua`, không bao giờ hiển thị password. `ldapts` hỗ trợ `searchPaginated` và `escapeFilter`; mỗi client được unbind sau thao tác.[7]

Hệ thống chỉ tạo/cập nhật hồ sơ cho tài khoản thuộc một nhóm đã ánh xạ. Admin trực tiếp hiện có không bị tự động hạ quyền khi lần đồng bộ trả về role User. Sau đồng bộ, mở **Quản lý tài khoản & nhân sự** để rà soát nguồn xác thực, trạng thái và role trước khi thông báo nhân viên đăng nhập.

## 8. Backup, restore và rollback

Thực hiện backup logical MySQL, metadata MinIO/kho tệp và runtime config theo lịch vận hành của doanh nghiệp vào volume RAID backup. Runtime config chứa thông tin kết nối nên phải mã hóa/giới hạn quyền; secret bind LDAP vẫn được quản lý bằng Docker secret/password manager, không copy vào database dump.

```bash
# Ví dụ backup logical MySQL; thay thông tin theo môi trường thực.
mysqldump --single-transaction --routines --triggers \
  -u assetmaster_backup -p assetmaster > \
  /opt/assetmaster/backups/assetmaster-$(date +%F).sql
```

Đặt chính sách retention phù hợp dung lượng RAID và kiểm thử restore theo kỳ. CISA khuyến nghị tự động hóa backup, bảo vệ bản sao bằng encryption/offline copy và thực hành khôi phục.[4] Trước nâng cấp ứng dụng, chụp checkpoint release, dump database, dừng write traffic, chạy migration, smoke test và chỉ mở lại traffic khi đạt.

Khi rollback code, chỉ quay lại version có migration tương thích. Không rollback database bằng cách xóa table; khôi phục từ dump đã kiểm thử hoặc dùng migration forward-fix. Nếu LDAPS lỗi, tắt Directory trong Cài đặt (hoặc feature flag), đăng nhập bằng Admin bootstrap, khắc phục CA/URL/secret rồi kiểm tra lại.

## 9. Checklist nghiệm thu trước khi mở cho nhân viên

| Hạng mục    | Tiêu chí đạt                                                                    |
| ----------- | ------------------------------------------------------------------------------- |
| `/setup`    | Chạy đúng một lần; database, migration và Admin bootstrap được tạo              |
| Nginx       | Chỉ LAN/VPN vào được; HTTPS, header proxy và no-cache cho API/login đúng        |
| LDAPS       | Certificate CA/FQDN hợp lệ; bind read-only và Users Base DN kiểm tra thành công |
| Nhóm quyền  | Một Admin group và một User group được ánh xạ, thử tài khoản trong/ngoài nhóm   |
| Đồng bộ     | Kết quả phân trang, role và record bị bỏ qua được Admin kiểm tra                |
| Backup      | Có dump mới nhất trên RAID và thực hiện được restore thử ở môi trường cô lập    |
| Break-glass | Admin bootstrap đăng nhập được khi LDAPS tắt hoặc AD không sẵn sàng             |

## 10. Việc cần hoàn tất trước khi triển khai thực tế

> **Kết luận triển khai.** Có thể tải source sau khi dùng bản release hiện tại, nhưng chưa nên mở cho người dùng nội bộ ngay. Docker Compose, `/setup`, LDAPS, healthcheck MySQL/Redis và Admin bootstrap đã được chuẩn bị; các hạng mục dưới đây cần được chốt hoặc UAT trên hạ tầng doanh nghiệp trước cutover.

| Mức độ                   | Hạng mục cần hoàn tất       | Lý do và hành động cụ thể                                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chặn production**      | Adapter lưu tệp self-hosted | `server/storage.ts` và proxy hiện còn dùng Manus Forge. Cần thay bằng MinIO/S3 nội bộ hoặc storage volume có phân quyền trước khi cho phép upload/xem hợp đồng, hóa đơn và tài liệu trong production.                                                                             |
| **Chặn production**      | UAT Docker trên MySQL trống | Dựng Compose trên Ubuntu staging, kiểm tra `docker compose ps`, hoàn tất `/setup`, restart toàn bộ stack, đăng nhập Admin bootstrap và xác nhận migration/version trong database. Preview hiện hành không mô phỏng Docker thật.                                                   |
| **Chặn production**      | UAT LDAPS                   | Mount CA nội bộ và Docker secret bind, thử user thuộc/ngoài group ánh xạ, nested group nếu dùng, login sai password, bind lỗi và fallback Admin bootstrap. Không dùng account đặc quyền Domain Admin cho bind.                                                                    |
| **Chặn production**      | Reverse proxy và network    | Chỉ Nginx công bố HTTPS cho LAN/VPN; giữ port MySQL/Redis không public, truyền `X-Forwarded-Proto`, giới hạn request body và đặt rate limit cho `/login`, `/setup`, `/api/trpc`.                                                                                                  |
| **Bắt buộc khi cutover** | Secrets và installer        | Lưu source secret ở host ngoài Git, kiểm soát quyền đọc; sau `/setup` đặt `ASSETMASTER_SETUP_ENABLED=false` và xoay `setup_token` nếu từng chia sẻ. Compose tránh ghi `DATABASE_URL` vào runtime volume, nhưng không dùng chế độ cài thủ công nếu chưa có secret manager phù hợp. |
| **Bắt buộc khi cutover** | Backup/restore drill        | Backup logical MySQL, runtime directory, kho tệp sau khi có adapter, các Docker secret và bản release. Khôi phục thử vào môi trường cô lập trước khi mở nhân viên.[4]                                                                                                             |
| **Khuyến nghị**          | Quan sát vận hành           | Dùng bảng **Cài đặt hệ thống → Trạng thái hạ tầng** để xem MySQL/Redis. Tích hợp log Docker/Nginx và cảnh báo hạ tầng doanh nghiệp; Redis đã sẵn trong Compose nhưng chưa thay session MySQL hiện tại.                                                                            |

Không re-run raw SQL migration 0056 trực tiếp trên database từng được khởi tạo thủ công. Khi nâng cấp source, backup trước, kiểm tra bảng bookkeeping migration của Drizzle, rồi chạy migration versioned một lần trong maintenance window. Không rollback database bằng cách xóa table; dùng restore từ dump đã kiểm thử hoặc migration forward-fix.

## References

[1] [Microsoft Learn — LDAP signing](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/ldap-signing)

[2] [Microsoft Learn — LDAP over SSL certificates](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[3] [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

[4] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)

[5] [OWASP — Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

[6] [OWASP — LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)

[7] [ldapts — Node.js LDAP TypeScript client](https://www.npmjs.com/package/ldapts)
