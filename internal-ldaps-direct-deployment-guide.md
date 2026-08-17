# Hướng dẫn triển khai AssetMaster nội bộ với xác thực LDAPS trực tiếp

## 1. Trạng thái backup và phạm vi

Phiên bản hiện tại đã được backup tại checkpoint **`b358a3fb`**. Đây là phiên bản an toàn để quay lại trước khi thay đổi xác thực hoặc chuyển dữ liệu. Trong checkpoint này, AssetMaster vẫn đang dùng Manus OAuth và storage của Manus; **chưa có thay đổi LDAPS nào được áp dụng vào mã nguồn**.

Mục tiêu của tài liệu này là triển khai một phương án đơn giản hơn: người dùng nhập **email domain và mật khẩu doanh nghiệp** trên màn hình AssetMaster, backend kết nối đến Active Directory qua **LDAPS**, xác thực xong thì tạo phiên đăng nhập riêng cho AssetMaster.

> Không nên cài ứng dụng AssetMaster hoặc MySQL trực tiếp trên Domain Controller. Domain Controller chỉ nên cung cấp dịch vụ directory/LDAPS. Hãy dùng một máy chủ ứng dụng và một máy chủ cơ sở dữ liệu riêng, dù cả hai có thể nằm trong cùng VLAN nội bộ.

## 2. Kiến trúc tối giản

```text
Máy người dùng
    │ HTTPS 443
    ▼
Reverse proxy / máy chủ AssetMaster
    ├── LDAPS 636 ───────► Domain Controller
    ├── MySQL 3306 ──────► Máy chủ CSDL nội bộ
    └── S3 API ───────────► MinIO/NAS nội bộ
```

| Thành phần | Nơi đặt | Chức năng |
|---|---|---|
| AssetMaster | Ubuntu/Windows VM riêng | Chạy frontend, backend Node.js và API nghiệp vụ. |
| Domain Controller | Máy chủ AD hiện tại | Chỉ xác thực tài khoản qua LDAPS. |
| MySQL | Máy chủ CSDL nội bộ hoặc VM CSDL riêng | Lưu tài sản, người dùng, lịch sử, bảo trì, kiểm kê và cấu hình. |
| Kho tệp | MinIO nội bộ hoặc S3-compatible/NAS | Lưu logo, ảnh, PDF, biên bản và Excel. |
| Reverse proxy | Nginx hoặc IIS | HTTPS, DNS, giới hạn mạng và chuyển tiếp vào AssetMaster. |

Luồng mạng tối thiểu là: máy người dùng đến AssetMaster qua TCP 443; AssetMaster đến Domain Controller qua TCP 636; AssetMaster đến MySQL qua TCP 3306; AssetMaster đến kho tệp qua cổng nội bộ được IT quy định. Không mở 636 hoặc 3306 ra Internet.

## 3. Chuẩn bị Domain Controller và LDAPS

### 3.1. Chuẩn bị DNS và tên máy

Giả sử domain là `congty.local` và Domain Controller là `dc01.congty.local`. IT cần xác nhận:

| Thông số | Giá trị mẫu |
|---|---|
| Domain | `congty.local` |
| Domain Controller chính | `dc01.congty.local` |
| Domain Controller dự phòng | `dc02.congty.local` |
| Base DN | `DC=congty,DC=local` |
| OU người dùng | `OU=Users,DC=congty,DC=local` |
| Nhóm người dùng AssetMaster | `CN=GG-AssetMaster-Users,OU=Groups,DC=congty,DC=local` |
| Nhóm quản trị AssetMaster | `CN=GG-AssetMaster-Admins,OU=Groups,DC=congty,DC=local` |

### 3.2. Cấp chứng thư LDAPS

Mỗi Domain Controller cần chứng thư có **Server Authentication**, chứa đúng FQDN của DC trong CN hoặc Subject Alternative Name, có private key và được cấp bởi CA mà máy chủ AssetMaster tin cậy. LDAPS dùng TCP 636; Global Catalog qua TLS dùng TCP 3269. Cài chứng thư hợp lệ trên DC sẽ cho phép dịch vụ LDAP nhận kết nối SSL/TLS.[1]

Nếu công ty có Microsoft Enterprise CA, trên DC mở `certlm.msc`, chọn **Personal → Certificates → Request New Certificate**, chọn mẫu **Domain Controller**, sau đó cài đặt. Nếu dùng CA bên ngoài, IT phải cài đầy đủ certificate chain và bảo đảm `dc01.congty.local` khớp với chứng thư.

Từ máy chủ AssetMaster, kiểm tra bắt tay TLS:

```bash
openssl s_client \
  -connect dc01.congty.local:636 \
  -servername dc01.congty.local \
  -showcerts
```

Không dùng tùy chọn bỏ qua xác minh chứng thư trong production. Nếu lệnh trên báo `verify error`, cần cài Root CA/intermediate CA của công ty vào trust store của máy chủ ứng dụng.

### 3.3. Firewall

Chỉ cho phép IP máy chủ AssetMaster kết nối đến `dc01` và `dc02` trên TCP 636. Cho phép máy chủ AssetMaster kết nối đến MySQL trên TCP 3306. Máy người dùng chỉ cần truy cập reverse proxy trên TCP 443. Không mở TCP 389 cho luồng xác thực ứng dụng.

## 4. Tài khoản domain và cách xác thực trực tiếp

### 4.1. Luồng khuyến nghị

Backend không nên gửi email/mật khẩu từ trình duyệt đến Domain Controller. Luồng an toàn là:

1. Người dùng nhập email doanh nghiệp và mật khẩu trên HTTPS.
2. Backend dùng một tài khoản đọc LDAP để tìm DN hoặc UPN của người dùng theo thuộc tính `userPrincipalName` hoặc `mail`.
3. Backend đóng bind đọc LDAP.
4. Backend mở bind mới bằng danh tính người dùng và mật khẩu vừa nhập qua LDAPS.
5. Backend đọc tên, email và nhóm của người dùng.
6. Backend kiểm tra người dùng thuộc nhóm được phép sử dụng AssetMaster.
7. Backend tạo session cookie riêng cho AssetMaster; không lưu mật khẩu domain.

Cách “tìm user bằng service account rồi bind lại bằng user” hoạt động tốt trong trường hợp email không trùng `userPrincipalName`. Nếu công ty quy ước email luôn là UPN, backend có thể bind trực tiếp bằng `email` hoặc `userPrincipalName`, nhưng vẫn cần kiểm tra nhóm và trạng thái tài khoản.

### 4.2. Bộ cấu hình tối thiểu trong Cài đặt hệ thống

| Trường | Ví dụ | Ghi chú |
|---|---|---|
| Phương thức đăng nhập | `LDAPS trực tiếp` | Có nút bật/tắt để rollback về phương thức cũ trong giai đoạn thử nghiệm. |
| Máy chủ LDAPS | `dc01.congty.local` | Cho phép danh sách 2–3 DC để dự phòng. |
| Cổng | `636` | Không dùng 389 cho password bind. |
| Base DN | `DC=congty,DC=local` | Gốc directory. |
| Users DN | `OU=Users,DC=congty,DC=local` | Giới hạn phạm vi tìm kiếm. |
| Username attribute | `userPrincipalName` hoặc `mail` | Cần thống nhất với IT. |
| Bind DN | `CN=svc-assetmaster,OU=Service Accounts,DC=congty,DC=local` | Chỉ có quyền đọc. |
| Bind password | Không hiển thị | Lưu server-side trong secret store; không lưu plaintext trong bảng cấu hình. |
| Allowed group | `GG-AssetMaster-Users` | Chỉ nhóm này được đăng nhập. |
| Admin group | `GG-AssetMaster-Admins` | Ánh xạ vai trò Admin. |
| CA certificate | CA nội bộ | Dùng để xác minh chứng thư DC. |
| Verify TLS | Bật bắt buộc | Không cho phép tắt trên production. |

Màn hình Cài đặt nên có các nút **Kiểm tra kết nối LDAPS**, **Kiểm tra tài khoản mẫu**, **Lưu cấu hình** và **Khôi phục phương thức đăng nhập cũ**. Mật khẩu bind nên được nhập qua secret manager hoặc trường secret không thể đọc lại; Admin chỉ nhìn thấy trạng thái “đã cấu hình”.

## 5. Thay đổi cần làm trong mã nguồn AssetMaster

Phiên bản hiện tại có ba điểm phụ thuộc Manus cần được thay thế trước khi chạy on-premises:

| Tệp/khu vực | Thay đổi cần thực hiện |
|---|---|
| `server/_core/oauth.ts` | Thay callback Manus OAuth bằng endpoint đăng nhập LDAPS trực tiếp và tạo session cookie nội bộ. |
| `server/storage.ts` | Thay Forge/Manus storage bằng MinIO/S3 nội bộ hoặc adapter NAS được IT phê duyệt. |
| `server/_core/env.ts` và secrets | Thay các biến `BUILT_IN_FORGE_*`, `VITE_OAUTH_*` bằng cấu hình LDAPS, MySQL, storage và session secret nội bộ. |
| `server/db.ts`/schema | Bổ sung bảng hoặc trường cấu hình LDAPS, nhưng tuyệt đối không lưu bind password dạng plaintext. |
| `users` | Lưu `openId`/định danh ổn định theo dạng `ldap:<domain>:<objectGuid>` hoặc một định danh tương đương; không dùng email làm khóa duy nhất. |

Backend cần dùng thư viện LDAP có hỗ trợ TLS, timeout, connection pooling và escape filter. Không tự ghép filter LDAP từ chuỗi email người dùng. Cần giới hạn số lần đăng nhập sai theo IP/user và ghi audit log không chứa mật khẩu.

## 6. Triển khai MySQL tại công ty

### 6.1. Tạo database và tài khoản ứng dụng

Trên máy chủ MySQL nội bộ, IT tạo schema riêng và tài khoản riêng cho AssetMaster. Ví dụ sau chỉ là mẫu; cần thay mật khẩu bằng secret thực tế và không đưa câu lệnh chứa password vào ticket công khai:

```sql
CREATE DATABASE assetmaster_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'assetmaster_app'@'10.20.30.%'
  IDENTIFIED BY '<strong-password-managed-by-it>'
  REQUIRE SSL;

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX,
      REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
ON assetmaster_prod.* TO 'assetmaster_app'@'10.20.30.%';

FLUSH PRIVILEGES;
```

Trong production, nên tách tài khoản chạy migration với tài khoản runtime. Tài khoản runtime không cần quyền tạo/drop toàn bộ schema sau khi migration đã hoàn tất. Chỉ cho phép IP/subnet máy chủ AssetMaster kết nối vào cổng MySQL.

### 6.2. Cấu hình kết nối

Ví dụ biến môi trường phía server:

```env
DATABASE_URL=mysql://assetmaster_app:<url-encoded-password>@db01.congty.local:3306/assetmaster_prod
DB_SSL=true
DB_SSL_CA=/etc/assetmaster/certs/company-root-ca.pem
```

Không đặt `DATABASE_URL` ở frontend. MySQL nên bật TLS bắt buộc khi kết nối qua mạng; tài liệu MySQL cảnh báo kết nối không mã hóa có thể bị quan sát và hỗ trợ cấu hình yêu cầu kết nối bảo mật.[2]

### 6.3. Chạy schema và migration

Trên môi trường staging, kiểm tra migration hiện có và chạy theo đúng thứ tự. Trên production, backup database trước khi migration, sau đó chạy migration đã được duyệt:

```bash
pnpm install --frozen-lockfile
pnpm drizzle-kit migrate
pnpm build
```

Nếu quy trình IT không cho phép production cài dependency, build artifact trong CI rồi chỉ triển khai artifact đã kiểm tra. Không chạy lệnh reset database và không dùng thao tác xóa bảng trong lần triển khai đầu tiên.

## 7. Lưu tệp nội bộ

Không nên lưu byte ảnh, PDF hoặc Excel trong cột MySQL. Phương án đơn giản và tương thích nhất là MinIO nội bộ với bucket private, ví dụ `assetmaster-prod-files`. MySQL chỉ lưu key, tên file, MIME type, dung lượng, người tải lên và thời gian tải lên.

| Thành phần | Giá trị mẫu |
|---|---|
| Endpoint | `https://minio.congty.local` |
| Bucket | `assetmaster-prod-files` |
| Access key | Secret server-side |
| Secret key | Secret server-side |
| Public access | Tắt |
| Download | Backend tạo presigned URL có thời hạn hoặc stream qua backend |
| Backup | Snapshot/object replication sang kho backup nội bộ |

Nếu công ty đã có NAS, có thể dùng thư mục riêng nhưng phải có quyền filesystem, backup, phân quyền và cơ chế chống ghi đè rõ ràng. MinIO/S3 thường dễ tích hợp hơn cho file lớn và presigned URL.

## 8. Các bước triển khai theo thứ tự

| Bước | Việc thực hiện | Kết quả cần đạt |
|---|---|---|
| 1 | Giữ checkpoint `b358a3fb` làm điểm rollback. | Có phiên bản an toàn trước thay đổi. |
| 2 | Tạo VM ứng dụng, VM MySQL và kho file nội bộ. | Không chạy app trực tiếp trên Domain Controller. |
| 3 | Cấu hình DNS, HTTPS và firewall. | Người dùng truy cập được AssetMaster qua 443; app kết nối được DC 636 và DB 3306. |
| 4 | Cài chứng thư LDAPS trên DC và CA trên app server. | `openssl s_client` và `ldp.exe` kết nối thành công. |
| 5 | Tạo `svc-assetmaster` quyền đọc LDAP và nhóm `GG-AssetMaster-Users/Admins`. | Có tài khoản test và nhóm test. |
| 6 | Cài MySQL schema staging và kho file staging. | Migration không làm mất dữ liệu. |
| 7 | Thay auth Manus bằng direct LDAPS trong nhánh triển khai riêng. | Người dùng test đăng nhập bằng email/mật khẩu domain. |
| 8 | Import dữ liệu và file vào staging. | Đối soát số bản ghi, tổng giá trị, liên kết file và lịch sử. |
| 9 | UAT các chức năng tài sản, bàn giao, bảo trì, kiểm kê, báo cáo và phân quyền. | Có biên bản nghiệm thu. |
| 10 | Cutover production và theo dõi. | Người dùng thật đăng nhập và dữ liệu ghi vào server công ty. |

## 9. Backup và khôi phục nội bộ

Backup phải bao gồm ba phần: database MySQL, bucket/file storage và cấu hình/secrets cần thiết. Backup database mà không backup file đính kèm sẽ làm các hồ sơ tài sản mất liên kết.

| Đối tượng | Khuyến nghị |
|---|---|
| MySQL | Full backup hằng ngày, binary log hoặc backup tăng dần theo chính sách IT. |
| MinIO/NAS | Snapshot hoặc replication hằng ngày sang máy backup khác. |
| Cấu hình | Lưu file cấu hình không chứa secret; secret lưu trong vault riêng. |
| Kiểm thử | Mỗi tháng khôi phục trên môi trường staging và đối chiếu số bản ghi/file. |
| RPO/RTO | IT cần chốt số phút dữ liệu tối đa có thể mất và thời gian phục hồi tối đa. |

Ví dụ backup MySQL dạng logical backup:

```bash
mysqldump --single-transaction --routines --triggers \
  --databases assetmaster_prod > /backup/assetmaster_$(date +%F).sql
```

File backup phải được mã hóa, giới hạn quyền đọc và sao chép sang máy backup khác. Không lưu backup duy nhất trên cùng máy chủ MySQL.

## 10. Kiểm thử bắt buộc trước khi dùng thật

Trước hết kiểm tra LDAPS bằng `ldp.exe` hoặc `openssl`; sau đó kiểm tra đăng nhập bằng một user thường, một user thuộc nhóm Admin và một user không thuộc nhóm được phép. Tắt user trong AD để xác nhận phiên đăng nhập mới bị chặn. Đổi mật khẩu domain để xác nhận mật khẩu cũ không còn đăng nhập được. Kiểm tra trường hợp DC chính mất kết nối và ứng dụng chuyển sang DC dự phòng.

Sau đó kiểm tra tạo tài sản, upload ảnh/logo, upload PDF, xuất Excel/PDF, tạo phiếu bàn giao, bảo trì, kiểm kê, lịch sử và quyền Admin/User. Cuối cùng khôi phục database và file storage vào staging, mở một số hồ sơ có file đính kèm để xác nhận dữ liệu khôi phục đầy đủ.

## 11. Các điểm không nên làm

Không cài AssetMaster trực tiếp trên Domain Controller; không mở LDAP 389 để gửi mật khẩu; không tắt xác minh TLS; không lưu bind password hoặc mật khẩu người dùng trong database; không để trình duyệt kết nối trực tiếp đến DC; không dùng một tài khoản Domain Admin làm service account; không backup chỉ database mà bỏ qua file storage; và không chuyển production trước khi có staging restore test.

## Tài liệu tham khảo

[1] [Microsoft Learn — Configure certificates for LDAP over SSL in Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[2] [MySQL 8.4 Reference Manual — Using Encrypted Connections](https://dev.mysql.com/doc/refman/8.4/en/encrypted-connections.html)

[3] [Microsoft Learn — How to enable LDAP signing in Windows Server](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-signing-in-windows-server)
