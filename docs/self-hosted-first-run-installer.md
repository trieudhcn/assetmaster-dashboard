# Thiết kế installer lần đầu cho AssetMaster self-hosted

## Mục tiêu

Người quản trị có thể tải bản release self-hosted, giải nén vào thư mục triển khai nội bộ, chạy một lệnh bootstrap ngắn và mở website. Nếu hệ thống chưa được khởi tạo, website luôn chuyển hướng tới `/setup`. Wizard hướng dẫn cấu hình tên website, URL, timezone, database và tài khoản quản trị ban đầu; sau đó tự chạy migration để tạo các table. Đây là trải nghiệm tương tự installer Snipe-IT, vốn tách cấu hình ứng dụng và database khỏi mã nguồn.[1]

> **Phạm vi:** Đây là thiết kế mục tiêu cho nhánh self-hosted. Phiên bản đang phát hành trên Manus chưa có installer và không được chuyển sang LDAP hay MySQL nội bộ bởi thay đổi tài liệu này.

## So sánh hai cách triển khai

| Cách | Trải nghiệm người cài | Bảo mật | Độ phức tạp |
|---|---|---|---|
| **Hybrid bootstrap + web wizard** *(khuyến nghị)* | Chạy một lệnh trên server, sau đó cấu hình web theo từng bước | Secret hạ tầng sinh/lưu trên host, không nhập root password trên browser | Trung bình |
| Web wizard hoàn toàn | Mở website là nhập cả MySQL root/password | Rủi ro cao vì browser và app runtime giữ credential đặc quyền | Thấp lúc bắt đầu, cao khi vận hành |
| Chỉ `.env` + command line | Không có wizard, quản trị viên chỉnh file rồi chạy migration | An toàn nếu quản lý file tốt | Thấp về phần mềm, khó dùng hơn |

Phương án khuyến nghị giữ cảm giác “cài đặt trên web” nhưng không làm yếu bảo mật. Bước bootstrap dành cho người có quyền SSH tạo secret MySQL, session key và setup token trên host. Wizard chỉ xử lý các thông số nghiệp vụ và database name đã được giới hạn ký tự; service bootstrap một lần mới có quyền tạo database/schema.

## Gói release và bước chuẩn bị duy nhất

```text
assetmaster-release/
├── compose.yaml
├── .env.example                   # không chứa secret thật
├── install.sh                     # tạo secret + kiểm tra prerequisite
├── server/ client/ dist/           # mã/image đã build
├── migrations/                     # migration đã version hoá
├── nginx/
└── docs/
```

Người vận hành chạy `sudo ./install.sh prepare` trong thư mục release. Lệnh này kiểm tra Docker/Compose, quyền thư mục, dung lượng, mount data và mount backup; tạo file secret `0600`, setup token ngẫu nhiên, database bootstrap account dùng một lần, encryption/session keys, rồi khởi động các container ở chế độ cài đặt. Không có password nào được in ra log; setup token chỉ hiển thị trực tiếp trong terminal quản trị hoặc được ghi vào trình quản lý mật khẩu của công ty.

| Điều kiện trước setup | Tiêu chí pass | Nếu fail |
|---|---|---|
| HTTPS/DNS nội bộ | URL đúng, certificate tin cậy, không dùng HTTP thường | Dừng wizard; sửa Nginx/CA trước |
| Data directory | Ghi được, không world-writable, đủ dung lượng | Không tạo schema |
| Backup volume | Được mount và khác device/volume với data | Có cảnh báo chặn production mode |
| MySQL | Container/database reachable, charset `utf8mb4` | Không ghi cấu hình dở dang |
| Storage | MinIO bucket private hoặc filesystem private dùng được | Không đánh dấu install hoàn tất |
| Setup token | Token hợp lệ, chưa hết hạn và chưa dùng | Trả 404/403, không tiết lộ trạng thái |

## Luồng wizard `/setup`

| Bước | Thông tin người cài nhập | Xử lý hệ thống | Không cho phép |
|---|---|---|---|
| 0. Xác thực cài đặt | Setup token một lần | Rate-limit, CSRF, `Cache-Control: no-store`, kiểm tra installation state | Mở installer không có token |
| 1. Thông tin website | Tên hiển thị, URL FQDN, timezone `Asia/Ho_Chi_Minh`, logo tùy chọn | Validate URL/FQDN; ghi application settings nháp | URL HTTP hoặc hostname không khớp |
| 2. Database | Host internal, port, **database name**, database app user | Chỉ cho phép identifier hợp lệ; test least-privilege connection | MySQL root password trong browser |
| 3. Quản trị ban đầu | Username/email local, mật khẩu mạnh, xác nhận mật khẩu | Hash Argon2id; tạo `break-glass admin`; không log password | Mật khẩu mặc định/yếu |
| 4. Storage & backup | Đường dẫn/mount đã chuẩn bị, retention hiển thị | Kiểm access, device/mount và encryption status | Thư mục public hoặc cùng volume data không cảnh báo |
| 5. Khởi tạo | Không thêm input | Backup trống/snapshot, chạy migration theo thứ tự và seed thiết lập nền | Chạy lại destructive migration |
| 6. Hoàn tất | Xác nhận đã lưu recovery code | Ghi `installationComplete`, xóa token, dừng bootstrap privilege | Quay lại `/setup` sau thành công |

Installer không tạo table bằng chuỗi SQL ad-hoc từ browser. Nó chạy chuỗi migration Drizzle đã nằm trong release, theo bảng `__drizzle_migrations`/installation state. Từng migration có version và checksum; chỉ migration chưa chạy mới được thực hiện. Nếu bước nào lỗi, wizard hiển thị mã lỗi an toàn cùng nút retry sau khi đã sửa prerequisite, không tự xóa database hay dữ liệu đã tạo.

## Mô hình bảo mật và khóa installer

Installer chỉ được kích hoạt khi ba điều kiện cùng đúng: chưa có dòng `installationComplete`, file setup lock trên persistent volume chưa tồn tại và setup token host cấp hợp lệ. Ngay khi thành công, hệ thống ghi state trong DB, tạo lock file có quyền `0600`, hủy token và tắt container/bootstrap endpoint đặc quyền. Từ lần truy cập tiếp theo, `/setup` luôn trả `404` kể cả khi có token cũ.

Tất cả form setup phải dùng HTTPS, anti-CSRF, rate limit theo IP và header `no-store`. Lỗi MySQL/LDAP không trả về host, username hoặc stack trace. Config không bí mật như tên website và timezone nằm trong bảng `system_settings`; secret nằm trong Docker secret hoặc file host bảo vệ quyền, không trong MySQL, audit payload, client bundle hay Git. Snipe-IT cũng nhấn mạnh `.env` là nơi cấu hình môi trường và không để debug bật trong production.[1]

## Trạng thái xác thực theo giai đoạn

| Giai đoạn | Cách đăng nhập | Mục đích |
|---|---|---|
| Chưa cài | Chỉ `/setup` với setup token | Khởi tạo có kiểm soát |
| Đã cài, chưa bật LDAP | Local break-glass Admin | Hoàn thiện branding, storage, LDAP/Keycloak và UAT |
| Thử LDAPS staging | Local Admin + nhóm LDAP test | Kiểm thử mapping role, logout và sự cố certificate |
| Đã go-live LDAPS | Keycloak ↔ LDAPS là login chính; local Admin chỉ break-glass | Nhân viên dùng tài khoản công ty; không lưu password tại AssetMaster |

LDAPS không phải điều kiện ngăn ứng dụng khởi động lần đầu. Sau khi installer hoàn thành, Admin vào **Cài đặt hệ thống → Directory LDAP/AD** để tạo candidate config, kiểm TLS/CA/DN/nhóm, phê duyệt và áp dụng qua Keycloak. Bind password LDAP và Keycloak technical credentials vẫn được cấp ngoài giao diện bởi đội vận hành.

## Khôi phục và cài lại

Khi cần cài lại do hỏng ứng dụng, dùng release cùng hoặc mới hơn, restore database + MinIO trước, đặt `installationComplete=true` và không mở wizard. Wizard chỉ được dùng cho database trống được xác nhận. Một thao tác “reset installer” phải yêu cầu truy cập SSH, lệnh rõ ràng với backup snapshot trước đó và xác nhận hai bước; không đưa nút reset này ra giao diện web.

## Nghiệm thu trước khi bắt đầu lập trình

1. Chốt URL truy cập nội bộ, quyền SSH/đội vận hành và nơi lưu setup/recovery secrets.
2. Chốt bootstrap chạy Docker Compose với MySQL/MinIO trên cùng server nhưng backup ở ổ cứng vật lý/volume riêng.
3. Chốt local break-glass Admin là tài khoản tạm thời có kiểm soát trước LDAPS, không phải tài khoản dùng hằng ngày.
4. Chốt LDAPS được đưa vào Cài đặt hệ thống **sau** setup; secret bind LDAP không được nhập qua web.

## References

[1] [Snipe-IT Documentation — Environment Configuration](https://snipe-it.readme.io/docs/configuration)
