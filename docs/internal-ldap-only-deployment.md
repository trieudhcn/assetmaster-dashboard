# Runbook triển khai AssetMaster nội bộ với LDAP/LDAPS duy nhất

## 1. Phạm vi và quyết định kiến trúc

AssetMaster sẽ vận hành hoàn toàn trong mạng LAN/VPN của công ty trên máy chủ Linux hiện có. **Active Directory/LDAP là nguồn duy nhất xác thực mật khẩu** sau khi được bật. Microsoft Entra ID, Google và Manus OAuth sẽ không được sử dụng cho môi trường mới.

Lần triển khai đầu tiên được thiết kế theo hướng trình cài đặt của Snipe-IT: bản phát hành self-hosted có cấu hình nền tảng tối thiểu, rồi đưa người cài đến wizard `/setup` để kiểm tra môi trường, đặt tên hệ thống, khởi tạo MySQL schema và tạo tài khoản quản trị ban đầu. Snipe-IT cũng tách cấu hình môi trường như database, URL, ngôn ngữ và storage khỏi mã nguồn; AssetMaster sẽ giữ nguyên nguyên tắc tách cấu hình/secret này nhưng có thêm khóa installer một lần.[7]

Ứng dụng không được nhận, ghi log, mã hóa hay lưu mật khẩu của nhân viên. Thay vào đó, người dùng đăng nhập vào **Keycloak nội bộ**; Keycloak kiểm tra thông tin đó với AD/LDAP qua **LDAPS**. AssetMaster chỉ nhận mã ủy quyền, token đã ký và các thuộc tính danh tính. Keycloak hỗ trợ kết nối LDAP/Active Directory, tạo phiên SSO và phát hành OpenID Connect (OIDC); nhờ cơ chế chuyển hướng, mật khẩu không đi qua AssetMaster.[1] [2]

> **Diễn giải “chỉ LDAP”:** LDAP/AD vẫn là nơi duy nhất quyết định tài khoản và mật khẩu hợp lệ. OIDC trong kiến trúc này chỉ là giao thức nội bộ an toàn giữa AssetMaster và Keycloak; không có nhà cung cấp danh tính bên ngoài nào được dùng.

| Thành phần | Quyết định | Phạm vi truy cập |
|---|---|---|
| Nguồn danh tính | Active Directory/LDAP qua **LDAPS** | Chỉ Keycloak truy cập Domain Controller qua TCP 636 |
| Cổng đăng nhập | Keycloak nội bộ | Chỉ HTTPS qua Nginx; không public trang quản trị |
| Ứng dụng | AssetMaster React + Express + tRPC | HTTPS qua Nginx, API dùng cùng origin |
| Dữ liệu nghiệp vụ | MySQL 8.4 LTS | Docker network riêng; không mở cổng ra LAN/VPN |
| Tệp đính kèm | MinIO private bucket | Chỉ AssetMaster truy cập API S3 nội bộ |
| Reverse proxy | Nginx | Cổng 443 là cổng ứng dụng duy nhất cho người dùng |
| Sao lưu | Repository mã hóa trên volume/thư mục backup được bảo vệ bởi **RAID của máy chủ** | Chạy bằng systemd timer trên Linux; RAID tăng khả năng chịu lỗi ổ đĩa |

## 2. Hai lựa chọn xác thực LDAP

| Phương án | Cách vận hành | Ưu điểm | Hạn chế | Độ phức tạp |
|---|---|---|---|---|
| **Keycloak + LDAP/LDAPS** *(khuyến nghị)* | Keycloak xác thực LDAP; AssetMaster dùng Authorization Code + PKCE | Ứng dụng không thấy mật khẩu; có SSO, logout và role mapping tập trung | Thêm một container phải cập nhật và backup | Trung bình |
| AssetMaster bind LDAP trực tiếp | Form đăng nhập trong AssetMaster gửi credential đến LDAP | Ít dịch vụ hơn | Ứng dụng phải xử lý mật khẩu, session và LDAP injection; khó nâng cấp | Cao về rủi ro |

**Chọn phương án một.** Authorization Code flow được Keycloak khuyến nghị cho ứng dụng web; Direct Grant/Resource Owner Password Credentials làm ứng dụng tiếp xúc mật khẩu và không nên sử dụng.[2] Việc chỉ dùng LDAPS là bắt buộc vì LDAP thường trên cổng 389 là không mã hóa, trong khi LDAPS tạo kết nối TLS trên cổng 636.[3] [4]

## 3. Sơ đồ kiến trúc mục tiêu

```mermaid
flowchart LR
  E[Nhân viên qua LAN/VPN] -->|HTTPS 443| N[Nginx]
  N -->|/| A[AssetMaster Node.js]
  N -->|/auth hoặc /sso| K[Keycloak nội bộ]
  K -->|LDAPS 636| D[Active Directory / LDAP]
  A -->|MySQL network| M[(MySQL 8.4)]
  K -->|MySQL network| M
  A -->|S3 API network| O[(MinIO private bucket)]
  T[systemd timer / backup host] --> M
  T --> O
  T --> K
  T --> B[Repository backup trên RAID]
```

Nginx là điểm vào duy nhất cho người dùng. MySQL, MinIO và Keycloak không công khai port host. Tên truy cập đề xuất là `https://assetmaster.noibo.company.vn`; nếu dùng CA nội bộ, root CA phải được cài tin cậy trên các máy trong domain/VPN. HTTPS được áp dụng cho toàn bộ ứng dụng và cookie phiên luôn phải dùng cờ `Secure`.[6]

## 4. Luồng đăng nhập và phân quyền mới

| Bước | Xử lý | Dữ liệu được phép đi qua AssetMaster |
|---|---|---|
| 1 | Trước khi bật LDAP: chỉ Admin bootstrap mở đăng nhập local. Sau khi bật LDAP: nhân viên mở Đăng nhập bằng email nội bộ | Chỉ Admin bootstrap nhập password local; employee password không qua AssetMaster |
| 2 | AssetMaster tạo `state`, `nonce`, PKCE verifier rồi chuyển browser sang Keycloak | URL authorization; state/nonce |
| 3 | Keycloak tìm người dùng bằng tài khoản AD và xác minh với LDAP qua LDAPS | Chỉ Keycloak nhận password |
| 4 | Keycloak trả Authorization Code về callback của AssetMaster | Code ngắn hạn + state |
| 5 | Backend đổi code lấy token, xác minh issuer, audience, chữ ký JWKS, `exp`, nonce và PKCE | Claims đã ký |
| 6 | Backend tạo session nội bộ opaque, lưu hash session trong MySQL và đặt cookie an toàn | `session_id` ngẫu nhiên, không lưu token dài hạn ở browser |
| 7 | Các tRPC protected procedure đọc session, ánh xạ quyền rồi xử lý nghiệp vụ | User ID nội bộ, role |

Khóa danh tính ổn định phải là `objectGUID` của Active Directory hoặc `entryUUID` của LDAP, **không phải email**. Email nội bộ là định danh đăng nhập thân thiện (`mail`/`userPrincipalName`) và có thể thay đổi; tên, chức danh, mã nhân viên và phòng ban cũng là thuộc tính đồng bộ. Schema mục tiêu của bảng `users` bổ sung `authSource`, `directoryObjectId`, `directoryUsername`, `passwordHash`, `mustChangePassword`, `lastDirectorySyncAt` và trạng thái hoạt động. `passwordHash` chỉ có giá trị cho tài khoản Admin bootstrap local, luôn `NULL` cho mọi tài khoản LDAP.

Phân quyền tiếp tục dùng các quyền nghiệp vụ hiện tại của AssetMaster. Cấu hình Keycloak mapper nhóm LDAP sang realm role `assetmaster.admin`, `assetmaster.user` và sau này có thể có `assetmaster.auditor`. Backend chỉ ánh xạ role đã phát hành; quyền xem key License và thao tác quản trị vẫn bắt buộc `admin`.

## 5. Chuẩn bị Active Directory/LDAP

### 5.1 Thiết lập LDAPS

Domain Controller phải có chứng chỉ LDAPS hợp lệ. Chứng chỉ cần có Server Authentication EKU, FQDN của DC trong CN hoặc SAN, private key và chuỗi CA được cả DC lẫn client tin cậy.[4] Mở TCP 636 **chỉ từ IP hoặc subnet máy chủ AssetMaster/Keycloak đến Domain Controller**. Không mở LDAP 389 cho ứng dụng.

Microsoft khuyến nghị LDAP signing và channel binding để giảm rủi ro sửa đổi, replay và man-in-the-middle. Trước khi bắt buộc chính sách trên toàn domain, đội AD cần dùng audit/event log để xác định client cũ không tương thích.[3]

### 5.2 Tài khoản dịch vụ và cấu hình LDAP

Tạo một tài khoản LDAP read-only chuyên dụng, ví dụ `svc_assetmaster_ldap`; tài khoản này **không** là Domain Admin, không có quyền reset password và chỉ được đọc các OU cần thiết. Mật khẩu tài khoản này lưu trong Docker secret hoặc file quyền `0600`, không nằm trong Git, tài liệu chia sẻ hoặc biến môi trường phía frontend.

| Tham số cần cung cấp | Ví dụ định dạng | Ghi chú |
|---|---|---|
| LDAP URL | `ldaps://dc01.corp.example:636` | Dùng FQDN có trong chứng chỉ, không dùng IP |
| Base DN | `DC=corp,DC=example` | Gốc tìm kiếm trong directory |
| Users DN | `OU=Employees,DC=corp,DC=example` | Chỉ OU nhân sự được đăng nhập |
| Bind DN | `CN=svc_assetmaster_ldap,OU=Service Accounts,...` | Tài khoản read-only |
| Username attribute | `sAMAccountName` hoặc `userPrincipalName` | Chọn một quy ước đăng nhập duy nhất |
| Stable ID | `objectGUID` hoặc `entryUUID` | Không đổi khi email đổi |
| Nhóm Admin | `CN=AssetMaster-Admins,...` | Ánh xạ role `assetmaster.admin` |
| Nhóm User | `CN=AssetMaster-Users,...` | Ánh xạ role `assetmaster.user` |
| CA chain | PEM/PKCS12 của CA doanh nghiệp | Gắn vào Keycloak truststore |

Trong Keycloak, chọn vendor **Active Directory** nếu nguồn là AD; đặt `Edit Mode = READ_ONLY`; tắt self-registration, quên mật khẩu và cập nhật mật khẩu trong Keycloak. Các chức năng đó phải do Active Directory quản lý. User federation chỉ tìm kiếm trong `Users DN` đã chốt; kết quả search và DN được xử lý qua provider chuẩn, không tự nối chuỗi filter từ đầu vào người dùng. OWASP yêu cầu escape dữ liệu không tin cậy trong LDAP filter/DN và áp dụng least privilege.[5]

### 5.3 Quản trị cấu hình Directory từ Cài đặt hệ thống

Có thể đưa cấu hình AD/LDAP vào **Cài đặt hệ thống → Directory LDAP/AD**, nhưng đây phải là một khu vực chỉ dành cho `admin` và tách hẳn khỏi trang cài đặt thương hiệu thông thường. Phần này sẽ tạo một bản cấu hình **nháp/candidate** có version, người sửa, thời điểm sửa, lý do thay đổi, kết quả kiểm tra và khả năng quay lại bản active trước đó. Chỉ có một cấu hình được đánh dấu active; việc sửa không được tự động ngắt đăng nhập đang có.

| Nhóm thông tin | Cho phép quản trị trong giao diện | Bắt buộc giữ ngoài giao diện và ngoài MySQL |
|---|---|---|
| Kết nối | FQDN LDAPS, port **cố định 636**, Base DN, Users DN, Groups DN, timeout | Mật khẩu tài khoản bind |
| Thuộc tính | Username attribute, stable ID attribute, email, tên, phòng ban, chức danh | Không có |
| Phân quyền | DN nhóm User/Admin/Auditor, quy tắc nested group và mapping role | Keycloak administration credential |
| Chứng chỉ | Upload **chỉ CA public PEM**, hash/expiry và trạng thái trust | Private key hoặc certificate có private key |
| Vận hành | Bật/tắt directory sau khi có xác nhận, giới hạn session, xem audit, thử kết nối | Session signing key, OIDC client secret, MySQL/MinIO credentials |

Mật khẩu bind LDAP không có ô nhập, không có API đọc và không có endpoint ghi từ browser. Màn hình chỉ hiển thị trạng thái `Đã cấp secret`/`Chưa cấp secret` và thời điểm xoay secret gần nhất. Secret được đội vận hành tạo trong file quyền `0600` hoặc Docker secret trên máy chủ; chỉ Keycloak có quyền đọc. Khóa dùng để ứng dụng gọi Keycloak Administration API, nếu cần kích hoạt cấu hình từ giao diện trong giai đoạn sau, cũng phải là Docker secret tách biệt, được cấp quyền tối thiểu cho realm `assetmaster`.

Quy trình an toàn là **Lưu nháp → Kiểm tra TLS/DN/nhóm → Phê duyệt → Áp dụng → Theo dõi → Có thể rollback**. Kiểm tra phải xác nhận FQDN, CA chain, LDAPS handshake, khả năng tìm user/group và mapping role; tuyệt đối không nhận hoặc lưu mật khẩu nhân viên. Thay đổi endpoint, Base DN, CA hoặc nhóm Admin cần xác nhận lại bằng tài khoản Admin thứ hai và được ghi audit không sửa được. Ban đầu, thao tác “Áp dụng” nên được thực hiện từ console Keycloak của máy chủ theo cấu hình đã phê duyệt; chỉ tự động hóa qua Keycloak Administration API khi migration đã có bộ kiểm thử, phân quyền service account tối thiểu và rollback đã được diễn tập.

## 6. Triển khai máy chủ Linux

### 6.1 Cấu hình khởi điểm và cấu trúc thư mục

Máy chủ Linux, database, file storage và backup sẽ do đội hạ tầng quản lý theo cơ chế RAID đã có; installer không bắt buộc hỏi CPU, RAM, layout ổ đĩa hoặc kiểu RAID. Cấu hình vận hành chỉ cần khai báo đường dẫn repository backup đã được quản trị sẵn. RAID tăng khả năng chịu lỗi ổ, nhưng không thay thế logical backup trước xóa nhầm, malware hay lỗi ứng dụng; CISA định nghĩa backup là bản sao dữ liệu quan trọng được lưu tách khỏi primary system và yêu cầu kiểm thử phục hồi định kỳ.[8]

```text
/opt/assetmaster/
├── compose.yaml
├── .env                         # 0600, không commit
├── secrets/                     # 0700, file 0600
├── nginx/conf.d/
├── keycloak/realm-import/       # realm template không chứa password
├── data/mysql/
├── data/minio/
├── backups/staging/             # chỉ dùng để tạo tạm, không phải đích lưu giữ
└── scripts/

/srv/assetmaster-backup/         # repository backup trên volume RAID do hạ tầng quản lý
├── repository/                  # repository backup được mã hóa
├── manifests/                   # checksum và nhật ký backup
└── restore-drills/              # bằng chứng kiểm thử khôi phục
```

Tài khoản triển khai riêng, Docker Engine/Compose plugin, cập nhật bảo mật Ubuntu và firewall phải được hoàn thành trước. UFW chỉ cho phép TCP 443 từ subnet LAN/VPN đã duyệt và SSH từ subnet quản trị; Docker network nội bộ không publish `3306`, `9000`, `9001`, `8080` hoặc console Keycloak.

### 6.2 Compose tham chiếu

Đây là cấu trúc tham chiếu, **chưa được chạy trên production** vì AssetMaster hiện còn phải được migration khỏi xác thực và file storage của nền tảng cũ. Bản release tự triển khai sẽ bao gồm `install.sh`, `.env.example`, image application đã build và wizard `/setup`; không yêu cầu người dùng đặt từng table SQL thủ công.

```yaml
services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    command: --default-authentication-plugin=caching_sha2_password
    env_file: .env
    volumes: ["./data/mysql:/var/lib/mysql"]
    networks: [backend]

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    env_file: .env
    volumes: ["./data/minio:/data"]
    networks: [backend]

  keycloak:
    image: quay.io/keycloak/keycloak:26.7
    restart: unless-stopped
    command: start --proxy-headers=xforwarded --hostname=https://assetmaster.noibo.company.vn
    env_file: .env
    depends_on: [mysql]
    networks: [backend]

  assetmaster:
    image: registry.internal.example/assetmaster:${APP_VERSION}
    restart: unless-stopped
    env_file: .env
    depends_on: [mysql, minio, keycloak]
    networks: [backend]

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports: ["443:443"]
    volumes: ["./nginx/conf.d:/etc/nginx/conf.d:ro", "./certs:/etc/nginx/certs:ro"]
    depends_on: [assetmaster, keycloak]
    networks: [backend]

networks:
  backend:
    internal: true
```

Trong cấu hình Nginx, `/` được proxy đến AssetMaster, còn `/sso/` được proxy đến Keycloak. Nginx phải chuyển `Host`, `X-Forwarded-Proto`, `X-Forwarded-For` và `X-Real-IP`, giới hạn tải lên theo quy định công ty và đặt header chống cache cho response nhạy cảm. HTTPS chỉ dùng TLS 1.3, hoặc TLS 1.2 khi cần tương thích; TLS 1.0/1.1 bị tắt.[6]

### 6.3 Trình cài đặt lần đầu

Sau khi người vận hành giải nén release vào `/opt/assetmaster` và chạy **một lệnh bootstrap trên server** để sinh secret/đưa Docker Compose lên, truy cập đầu tiên sẽ đi thẳng đến `/setup`, không vào trang đăng nhập. Wizard thu thập tên website, URL nội bộ, timezone, tên database, tài khoản quản trị break-glass và mật khẩu mạnh. Nó kiểm tra điều kiện trước, kiểm tra kết nối MySQL, chạy migration theo version, tạo các bảng và dữ liệu nền tảng trong transaction/bước có thể retry, rồi ghi cờ `installationComplete`.

Không nhập MySQL root password, bind password LDAP hay private key chứng chỉ trong browser wizard. `install.sh` tạo Docker secret một lần để khởi tạo MySQL và một database user quyền tối thiểu; wizard chỉ nhận database name đã validate và dùng user ứng dụng đó để tạo table. Sau khi hoàn tất, `/setup` trả `404` cho mọi request, setup token bị vô hiệu hóa, container bootstrap có đặc quyền dừng, và chỉ còn ứng dụng chạy với database user hạn chế. Chi tiết quy trình có tại [Thiết kế installer lần đầu](./self-hosted-first-run-installer.md).

## 7. Cấu hình Keycloak LDAP-only

1. Sau khi wizard AssetMaster đã hoàn thành, khởi tạo Keycloak admin bằng một tài khoản break-glass riêng; console chỉ mở từ localhost hoặc subnet quản trị.
2. Tạo realm `assetmaster`; Require SSL = `All requests`; tắt public registration, reset password và identity provider bên ngoài.
3. Tạo client confidential `assetmaster-web`; redirect URI duy nhất là `https://assetmaster.noibo.company.vn/auth/callback`; bật Authorization Code và bắt buộc PKCE S256; tắt Direct Access Grants.
4. Trong User Federation, tạo LDAP provider với URL LDAPS, CA chain, Base DN, Users DN, Bind DN và mật khẩu service account. Test connection và test authentication phải đạt trước khi tiếp tục.
5. Cấu hình mapper các thuộc tính `givenName`, `sn`, `mail`, `employeeNumber`, `title`, `department` và mapper nhóm LDAP sang realm roles.
6. Thử ba trường hợp: thành viên nhóm User, thành viên nhóm Admin và tài khoản bị disable. Kết quả yêu cầu: User đăng nhập nhưng không có trang quản trị; Admin có quyền tương ứng; tài khoản disabled bị từ chối.

## 8. Thay đổi mã nguồn bắt buộc

Đây là migration mã nguồn thật sự. Hiện AssetMaster đang dùng xác thực của Manus trong `server/_core/context.ts` và storage helper Forge trong `server/storage.ts`; vì vậy **không thể chỉ tải bản build hiện tại lên Ubuntu**.

| Phần hiện tại | Thay đổi khi self-hosted | Điều kiện nghiệm thu |
|---|---|---|
| `server/_core/context.ts` và SDK xác thực | Adapter session nội bộ đọc opaque cookie, tải user local và áp dụng `protectedProcedure`/`adminProcedure` | Không gọi Manus SDK ở runtime |
| Client login/logout | Trước LDAPS: email Admin bootstrap và password local hash đăng nhập để hoàn tất cấu hình. Sau LDAPS: nhân viên nhập email nội bộ tại Keycloak; callback OIDC xử lý ở backend; logout xóa session local rồi logout Keycloak | Không còn portal OAuth cũ; nhân viên không có local password AssetMaster |
| User schema | Thêm `authSource`, `directoryObjectId`, `directoryUsername`, `passwordHash`, `mustChangePassword`; map LDAP một lần bằng email/mã nhân viên đã đối soát | `passwordHash` luôn NULL với LDAP; email đổi không tạo user mới |
| Phân quyền | Lấy `assetmaster.*` roles từ token Keycloak và map sang role nội bộ | Quyền admin không suy diễn từ tên/email |
| `server/storage.ts` | Adapter MinIO S3-compatible; private bucket; URL tải ngắn hạn sau kiểm tra quyền | Không có link `/manus-storage/` ở dữ liệu mới |
| Tệp hiện hữu | Manifest tải/copy từ storage cũ sang MinIO; thay URL bằng `fileKey` nội bộ | Đối chiếu count và checksum |
| Secrets | `DATABASE_URL`, OIDC issuer/client secret, MinIO credentials, session secret trong Docker secrets/.env `0600` | Không có secret ở client/Git |

Lớp xác thực mới nên dùng library OIDC phía server, không viết thủ công JWT parser. Session ID phải ngẫu nhiên, lưu hash trong MySQL, có TTL tối đa 8 giờ, cookie `HttpOnly; Secure; SameSite=Lax; Path=/`, xoay session sau đăng nhập và xóa khi logout. Tài khoản quản trị tạo lúc installer là **break-glass account**: email nhập trong setup, `authSource='bootstrap_local'`, role `admin`, password hash Argon2id với salt riêng và `mustChangePassword=true`; không lưu field `password` nguyên văn. OWASP khuyến nghị password không được lưu plaintext mà dùng hash chậm/memory-hard như Argon2id.[9] Tài khoản này không dành cho nhân viên thường ngày và chỉ vô hiệu hóa sau khi có ít nhất hai Admin LDAP hoạt động đã được UAT. Không trả email “không tồn tại” hoặc “sai mật khẩu” riêng lẻ; trả thông báo chung để giảm lộ thông tin tài khoản.

## 9. Migration dữ liệu và tệp

### 9.1 Chuẩn bị và đối soát

Tạo staging có schema MySQL độc lập và bản sao dữ liệu đã ẩn thông tin nhạy cảm khi cần. Trước migration, xuất snapshot cơ sở dữ liệu cũ, lập manifest các tệp gồm `old_url`, loại, dung lượng, SHA-256, thực thể tham chiếu và `new_file_key`. Không tự ghép user nếu email/mã nhân viên không khớp duy nhất; các trường hợp mơ hồ phải được Admin duyệt bằng bảng đối soát.

### 9.2 Thứ tự chuyển đổi

1. Build image migration branch và chạy unit/integration tests với LDAP mock, MySQL và MinIO test.
2. Khởi tạo MySQL, MinIO private bucket và Keycloak LDAP-only ở staging.
3. Chạy Drizzle migration mở rộng mapping danh tính và session; không xóa `openId` cũ trong giai đoạn đầu.
4. Nhập dữ liệu nghiệp vụ; đối chiếu số tài sản, phụ kiện, hợp đồng, hóa đơn, License, cấp phát và audit.
5. Copy tệp sang MinIO; kiểm hash, kích thước và quyền đọc trước khi cập nhật metadata.
6. Chạy UAT LDAP; đối chiếu mapping role, upload/download chứng từ, PDF/Excel và 5 quy trình nghiệp vụ quan trọng.
7. Chỉ sau khi UAT ký xác nhận mới đóng băng dữ liệu ngắn hạn, chạy delta migration và chuyển DNS nội bộ.

## 10. Sao lưu, giám sát và khôi phục trên ổ cứng máy chủ

| Cách chạy | Phù hợp | Chi phí | Độ phức tạp |
|---|---|---:|---:|
| **systemd timer trên Linux → ổ cứng vật lý riêng** *(khuyến nghị)* | Backup MySQL/MinIO/config định kỳ, có log và trạng thái service | Không thêm nền tảng | Trung bình |
| Cron truyền thống | Môi trường nhỏ, đội vận hành quen dùng cron | Không thêm nền tảng | Thấp |
| Chạy thủ công | Chỉ dùng trước thay đổi lớn | Chi phí nhân sự cao, dễ quên | Thấp nhưng rủi ro cao |

Đích sao lưu được đội hạ tầng cấu hình trước, ví dụ `/srv/assetmaster-backup` trên volume RAID. Installer chỉ kiểm tra đường dẫn có ghi được và repository hoạt động; không bắt người cài khai báo RAID, device hay CPU/RAM. Repository cần mã hóa, quyền mount giới hạn và dung lượng đủ retention. Container ứng dụng không có quyền ghi trực tiếp vào repository; chỉ service backup được quyền tạo bản sao.

| Thành phần | Cách tạo backup nhất quán | Tần suất/retention tối thiểu | Điều không được làm |
|---|---|---|---|
| MySQL AssetMaster + Keycloak | `mysqldump --single-transaction --routines --events --triggers` từ tài khoản backup read-only phù hợp | Hằng đêm; 30 bản ngày, 12 bản tháng | Không copy thô thư mục MySQL khi DB đang chạy |
| MinIO | Mirror ở mức S3 bằng tài khoản backup chỉ đọc hoặc backup snapshot nhất quán | Hằng đêm; cùng chu kỳ với DB | Không coi URL presigned là backup |
| Cấu hình | Lưu Compose, Nginx, realm template, CA public và script, kèm checksum | Sau mỗi thay đổi + hằng đêm | Không để secret rõ trong manifest hoặc Git |
| Docker secrets | Archive mã hóa riêng, quyền chỉ đội vận hành | Sau khi xoay secret | Không đặt `.env`/secret bản rõ trong bucket hay thư mục public |

Mỗi backup cần chạy qua công cụ repository có mã hóa và kiểm tra integrity, tạo manifest gồm timestamp, version ứng dụng, dump ID, object count và checksum. Timer chỉ chạy khi ổ backup đã mount đúng device; nếu thiếu mount, script phải dừng và báo lỗi thay vì ghi nhầm vào filesystem gốc. Kiểm thử restore MySQL, MinIO, Keycloak configuration và đăng nhập một tài khoản LDAP vào môi trường cô lập tối thiểu mỗi quý. Không coi Keycloak Admin Console export là backup chính; dùng backup database hoặc boot-time export theo hướng dẫn Keycloak.[1]

RAID không thay thế backup: nó có thể duy trì dịch vụ khi một ổ hỏng, nhưng có thể sao chép cả xóa nhầm, lỗi ứng dụng hoặc ransomware sang các disk trong array. Phương án hiện tại vẫn hợp lệ: backup định kỳ có version vào repository RAID và restore drill. Khi có điều kiện, một bản mã hóa được tháo rời/lưu ngoài máy theo chu kỳ tuần hoặc tháng sẽ bổ sung lớp chống sự cố vật lý.[8]

Theo dõi: trạng thái container, lỗi LDAP bind, tỷ lệ đăng nhập thất bại, dung lượng disk, lỗi upload MinIO, thất bại backup và tuổi chứng chỉ TLS/LDAPS. Không ghi username/password thô, token, cookie hay private key vào log.

## 11. UAT và kế hoạch rollback

| Nhóm kiểm thử | Tình huống bắt buộc | Kết quả mong đợi |
|---|---|---|
| LDAP | Tài khoản hợp lệ, sai mật khẩu, disabled, ngoài OU | Chỉ tài khoản hợp lệ trong scope vào được |
| Role | User, Admin, thành viên bị gỡ nhóm | Quyền thay đổi theo LDAP group sau token/session refresh |
| Session | Login, logout, timeout, mở lại browser | Cookie an toàn; session cũ không dùng lại được |
| File | Upload, download có quyền, download không quyền | File private; URL chỉ tạm thời |
| Nghiệp vụ | Tài sản, bàn giao, License, hóa đơn, PDF/Excel | Không mất dữ liệu hay thay đổi nghiệp vụ |
| Khôi phục | Restore database + một tệp + Keycloak config | RTO/RPO đạt yêu cầu công ty |

Giữ môi trường hiện tại chỉ đọc trong thời gian song song đã thống nhất (đề xuất 1–2 tuần). Nếu có lỗi nghiêm trọng, trả DNS nội bộ về hệ thống cũ, khóa ghi dữ liệu ở môi trường mới, lưu log và snapshot để điều tra; không chạy migration ngược tự động trên dữ liệu đang phát sinh.

## 12. Thông tin cần chốt trước khi bắt đầu lập trình migration

1. URL/FQDN nội bộ dự kiến và đường dẫn repository RAID dành cho backup (nếu đội hạ tầng cần hiển thị trạng thái backup trong installer).
2. FQDN nội bộ chính, đội quản lý DNS và CA phát hành chứng chỉ cho Nginx/Keycloak.
3. Địa chỉ LDAPS/FQDN Domain Controller, CA chain, Base DN, Users DN, username attribute và stable ID attribute.
4. Tài khoản service read-only, nhóm LDAP User/Admin, chính sách tài khoản disabled và quy tắc nhân sự ngoài OU.
5. Thời gian session mong muốn, giới hạn upload, thời gian RPO/RTO và danh sách người tham gia UAT.
6. Xác nhận dùng **Keycloak + LDAP/LDAPS-only** như cổng đăng nhập nội bộ sau khi staging installer và local break-glass Admin đã hoạt động; AssetMaster không nhận mật khẩu nhân viên trực tiếp.

Sau khi nhận đủ sáu nhóm thông tin này, bước tiếp theo là tạo nhánh migration/staging riêng, cấu hình secrets an toàn, xây adapter session OIDC, adapter MinIO, schema identity mapping, script nhập file và bộ test trước khi chạm môi trường production.

## References

[1] [Keycloak Server Administration Guide — User Federation](https://www.keycloak.org/docs/latest/server_admin/#_user-storage-federation)

[2] [Keycloak — Securing applications and services with OpenID Connect](https://www.keycloak.org/securing-apps/oidc-layers)

[3] [Microsoft Learn — LDAP signing for Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/ldap-signing)

[4] [Microsoft Learn — Configure certificates for LDAP over SSL in Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[5] [OWASP — LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)

[6] [OWASP — Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

[7] [Snipe-IT Documentation — Environment Configuration](https://snipe-it.readme.io/docs/configuration)

[8] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)

[9] [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
