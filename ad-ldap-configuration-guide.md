# Hướng dẫn cấu hình Active Directory / LDAP cho AssetMaster

## 1. Phạm vi và khuyến nghị kiến trúc

AssetMaster hiện đang dùng Manus OAuth ở lớp `server/_core/oauth.ts` và dịch vụ lưu trữ tệp Forge/Manus ở `server/storage.ts`. Vì vậy, việc dùng tài khoản domain của công ty **chưa thể hoàn tất chỉ bằng cách nhập địa chỉ LDAP**. Cần thay lớp xác thực hiện tại bằng một Identity Provider (IdP) thuộc công ty và thay kho lưu trữ tệp nếu muốn hệ thống chạy hoàn toàn trong hạ tầng nội bộ.

Có hai hướng triển khai:

| Hướng | Khi nên dùng | Đánh giá |
|---|---|---|
| **Khuyến nghị: AD/LDAP → Keycloak → AssetMaster qua OIDC** | Công ty có Active Directory nội bộ và muốn ứng dụng không chạm trực tiếp vào mật khẩu domain | An toàn hơn, dễ mở rộng MFA/SSO, ứng dụng chỉ nhận token đã ký; Keycloak có User Federation cho LDAP/AD và hỗ trợ OIDC. |
| **AD/LDAP trực tiếp từ backend AssetMaster** | Chỉ dùng khi công ty không thể vận hành IdP trung gian | Backend phải tự xử lý bind, tìm user, kiểm tra mật khẩu, TLS, nhóm, timeout và lỗi LDAP; bề mặt rủi ro và chi phí bảo trì cao hơn. |

Keycloak được thiết kế để làm lớp SSO cho ứng dụng web, có thể liên kết LDAP/Active Directory, rồi chuyển danh tính sang ứng dụng bằng OIDC. Trình duyệt chuyển người dùng sang Keycloak để đăng nhập; AssetMaster không nhận mật khẩu domain mà chỉ nhận token/assertion đã ký.[1]

> **Khuyến nghị chính:** nếu công ty dùng AD DS tại chỗ, hãy triển khai Keycloak trong mạng nội bộ hoặc DMZ, cấu hình Keycloak làm LDAP User Federation, sau đó tích hợp AssetMaster với Keycloak bằng OIDC Authorization Code Flow.

## 2. Thông tin IT cần chuẩn bị

Trước khi cấu hình, IT cần cung cấp các giá trị sau. Không gửi mật khẩu tài khoản dịch vụ trong tin nhắn hoặc đưa vào mã nguồn.

| Thông số | Ví dụ | Ý nghĩa |
|---|---|---|
| Tên domain AD | `corp.example.local` | DNS domain của doanh nghiệp. |
| Domain Controller | `dc01.corp.example.local`, `dc02.corp.example.local` | Nên có ít nhất hai DC để dự phòng. |
| Base DN | `DC=corp,DC=example,DC=local` | Gốc tìm kiếm LDAP. |
| OU người dùng | `OU=Users,DC=corp,DC=example,DC=local` | Giới hạn vùng tìm kiếm user. |
| OU nhóm | `OU=Groups,DC=corp,DC=example,DC=local` | Nơi tìm nhóm quyền. |
| Tài khoản dịch vụ | `CN=svc-assetmaster,OU=Service Accounts,...` | Chỉ dùng để đọc LDAP, không dùng tài khoản Domain Admin. |
| Cổng bảo mật | TCP `636` hoặc Global Catalog `3269` | LDAPS mã hóa bằng TLS. |
| CA tin cậy | Root/intermediate CA nội bộ | Cài trên Keycloak hoặc máy chủ backend để xác minh chứng thư DC. |
| FQDN ứng dụng | `assets.company.vn` | Dùng cho HTTPS và redirect URI OIDC. |
| Nhóm Admin | `GG-AssetMaster-Admins` | Thành viên được cấp vai trò Admin. |
| Nhóm User | `GG-AssetMaster-Users` | Thành viên được phép truy cập AssetMaster. |

## 3. Cấu hình LDAPS trên Domain Controller

### 3.1. Cấp chứng thư cho Domain Controller

Mỗi Domain Controller cần chứng thư có mục đích **Server Authentication**, có FQDN của DC trong Subject Alternative Name, có private key tương ứng và được cấp bởi CA mà cả DC lẫn máy khách LDAP đều tin cậy. Microsoft yêu cầu các thuộc tính này để AD DS có thể nhận kết nối LDAPS.[2]

Nếu công ty có Microsoft Enterprise CA, IT có thể dùng mẫu chứng thư **Domain Controller**. Trên DC, mở `certlm.msc`, vào **Personal → Certificates**, chọn **Request New Certificate**, chọn chính sách cấp phát của Active Directory và mẫu **Domain Controller**, sau đó hoàn tất cấp phát. Nếu dùng CA bên thứ ba, tạo yêu cầu CSR chứa FQDN của DC, EKU Server Authentication và cài chứng thư cùng chuỗi CA vào kho chứng thư máy tính.

Không dùng chứng thư chỉ có tên ngắn `dc01` nếu ứng dụng kết nối đến `dc01.corp.example.local`. Tên FQDN trong chứng thư phải khớp tên mà ứng dụng dùng. Microsoft cũng nêu rằng cổng LDAPS chuẩn là TCP 636; Global Catalog qua TLS dùng TCP 3269.[2]

### 3.2. Mở firewall có giới hạn

Chỉ cho phép máy chủ Keycloak hoặc máy chủ AssetMaster kết nối tới TCP 636/3269 của Domain Controller. Không mở LDAP/LDAPS cho toàn bộ Internet. Nếu ứng dụng chạy trong VLAN riêng, tạo rule chỉ từ subnet ứng dụng đến IP DC cần thiết.

### 3.3. Kiểm tra LDAPS

Trên máy Windows đã cài công cụ quản trị, chạy `ldp.exe`, chọn **Connection → Connect**, nhập FQDN của DC, cổng `636` và chọn **SSL**. Khi kết nối thành công, phần RootDSE xuất hiện ở khung kết quả. Đây là cách kiểm tra được Microsoft hướng dẫn.[2]

Có thể kiểm tra thêm từ máy Linux chạy ứng dụng bằng:

```bash
openssl s_client -connect dc01.corp.example.local:636 \
  -servername dc01.corp.example.local -showcerts
```

Kết quả cần xác nhận gồm: chứng thư đúng tên FQDN, chuỗi CA được tin cậy, thời hạn còn hiệu lực và quá trình bắt tay TLS không báo lỗi. Không tắt bước kiểm tra chứng thư chỉ để làm cho kết nối “chạy được”.

## 4. Bật LDAP signing và channel binding

LDAP không mã hóa trên TCP 389 có thể làm lộ thông tin hoặc cho phép can thiệp giữa đường. Microsoft khuyến nghị phát hiện các client đang dùng bind không ký hoặc simple bind trên kết nối không mã hóa trước khi bật chính sách bắt buộc.[3]

Trong **Default Domain Controller Policy**, vào:

`Computer Configuration → Policies → Windows Settings → Security Settings → Local Policies → Security Options`

Tìm chính sách:

`Domain controller: LDAP server signing requirements`

Quy trình an toàn là:

1. Theo dõi Event ID 2887 để biết còn client nào bind không ký.
2. Khi cần định danh chi tiết, bật diagnostic logging mức phù hợp để thu Event ID 2889 và xác định IP/client gây ra bind không an toàn.
3. Sửa các client đó sang LDAPS hoặc SASL signing.
4. Sau giai đoạn quan sát, đặt **Require signing** và theo dõi Event ID 2888.

Không bật chính sách cưỡng chế trên production mà không có giai đoạn quan sát và kế hoạch rollback. AssetMaster/Keycloak phải được cấu hình LDAPS đúng trước khi chính sách được bật.

## 5. Tạo tài khoản dịch vụ LDAP

Tạo một user riêng, ví dụ `svc-assetmaster`, trong OU dành cho service accounts. Tài khoản này chỉ cần quyền đọc những OU cần thiết; không cấp Domain Admin, Account Operators hoặc quyền ghi directory.

Nếu chính sách AD hỗ trợ, nên dùng gMSA hoặc cơ chế quản lý secret của doanh nghiệp thay cho password tĩnh. Nếu phải dùng password, lưu trong secret manager hoặc secret store của máy chủ, đặt ngày xoay vòng và theo dõi thời điểm hết hạn. Tắt quyền interactive logon và remote interactive logon cho tài khoản dịch vụ theo chính sách bảo mật của công ty.

Bind DN có thể có dạng:

```text
CN=svc-assetmaster,OU=Service Accounts,DC=corp,DC=example,DC=local
```

Không đặt password trong `.env` đã commit, log ứng dụng, lệnh shell được lưu history hoặc tài liệu bàn giao công khai.

## 6. Cấu hình Keycloak làm lớp trung gian

### 6.1. Tạo realm và client

Trong Keycloak:

1. Tạo realm riêng, ví dụ `assetmaster`.
2. Tạo client OIDC, ví dụ `assetmaster-web`.
3. Chọn client type phù hợp cho web server; giữ client secret ở backend.
4. Đặt redirect URI chính xác, ví dụ `https://assets.company.vn/api/auth/oidc/callback`.
5. Đặt Web Origin là domain ứng dụng cụ thể, không dùng wildcard trong production.
6. Tạo realm roles `assetmaster-admin` và `assetmaster-user`, hoặc ánh xạ từ nhóm AD.

Keycloak cung cấp discovery endpoint theo dạng `/realms/{realm}/.well-known/openid-configuration`, cùng các endpoint authorization, token, userinfo, logout và certificate.[4]

### 6.2. Thêm LDAP User Federation

Trong realm `assetmaster`, vào **User Federation → Add provider → ldap**, rồi cấu hình:

| Trường Keycloak | Giá trị mẫu |
|---|---|
| Connection URL | `ldaps://dc01.corp.example.local:636` |
| Users DN | `OU=Users,DC=corp,DC=example,DC=local` |
| Bind Type | `simple` qua LDAPS; không dùng simple bind trên LDAP không mã hóa |
| Bind DN | DN của `svc-assetmaster` |
| Bind Credential | Lấy từ secret manager |
| Edit Mode | `READ_ONLY` nếu muốn AD là nguồn sự thật |
| Users DN | OU chứa user AssetMaster |
| Username LDAP attribute | Thường là `sAMAccountName` hoặc `userPrincipalName` |
| RDN LDAP attribute | Thường là `sAMAccountName` |
| UUID LDAP attribute | `objectGUID` hoặc thuộc tính được IT chuẩn hóa |
| User Object Classes | Thường gồm `person`, `organizationalPerson`, `user` |
| Search Scope | `One Level` hoặc `Subtree` theo cấu trúc OU |
| Truststore | CA đã ký chứng thư LDAPS của DC |

Bấm **Test connection** và **Test authentication**. Sau đó chạy **Synchronize all users** trong staging, kiểm tra một user mẫu và xác nhận user không bị tạo trùng do thay đổi email hoặc username.

### 6.3. Ánh xạ nhóm AD thành quyền AssetMaster

Tạo mapper nhóm LDAP hoặc mapper role trong Keycloak. Ánh xạ:

| Nhóm AD | Vai trò AssetMaster |
|---|---|
| `GG-AssetMaster-Admins` | `admin` |
| `GG-AssetMaster-Users` | `user` |

Ứng dụng nên kiểm tra claim role/group sau khi token đã được xác minh. Không cho người dùng tự chọn role từ frontend. Nếu một user thuộc cả hai nhóm, cần quy định rõ ưu tiên; thông thường quyền Admin chỉ cấp qua nhóm riêng và được rà soát định kỳ.

## 7. Tích hợp AssetMaster với OIDC

Thay vì để AssetMaster nhận username/password LDAP, backend nên dùng OIDC Authorization Code Flow:

1. Người dùng mở AssetMaster và bấm đăng nhập.
2. AssetMaster tạo `state` và `nonce`, lưu bản sao an toàn trong cookie phiên tạm thời.
3. Trình duyệt chuyển sang Keycloak.
4. Keycloak xác thực người dùng qua AD/LDAP và có thể yêu cầu MFA.
5. Keycloak trả authorization code về callback HTTPS.
6. Backend đổi code lấy token, kiểm tra `iss`, `aud`, `exp`, `nonce`, chữ ký qua JWKS và các claim cần thiết.
7. Backend dùng `iss + sub` làm định danh ổn định để upsert user AssetMaster; không dùng email làm khóa chính.
8. Backend tạo session cookie `HttpOnly`, `Secure`, `SameSite=Lax` hoặc chính sách tương đương.

Cấu hình môi trường mẫu:

```env
OIDC_ISSUER_URL=https://sso.company.vn/realms/assetmaster
OIDC_CLIENT_ID=assetmaster-web
OIDC_CLIENT_SECRET=<secret-manager-reference>
OIDC_REDIRECT_URI=https://assets.company.vn/api/auth/oidc/callback
OIDC_SCOPES=openid profile email
SESSION_SECRET=<secret-manager-reference>
```

Các biến trên chỉ là tên minh họa; cần đưa vào secret manager của hạ tầng công ty. Không giữ client secret trong mã frontend. Tài liệu Microsoft cũng yêu cầu ứng dụng xác minh chữ ký và claim của ID token; nên dùng thư viện OIDC/JWT đã được kiểm chứng thay vì tự parse JWT.[5]

## 8. Nếu bắt buộc tích hợp LDAP trực tiếp

Chỉ chọn phương án này khi IT không thể vận hành Keycloak/Entra. Backend phải thực hiện bind qua `ldaps://...:636`, tìm user trong Base DN, rồi xác minh password theo cách phù hợp với thư viện LDAP. Không gửi password qua LDAP 389 không mã hóa. Cần có timeout kết nối, timeout truy vấn, giới hạn kết quả, pool kết nối, retry có giới hạn, chống LDAP injection bằng filter builder và thông báo lỗi không làm lộ cấu trúc directory.

Luồng direct LDAP cần tối thiểu các bước: bind bằng tài khoản dịch vụ để tìm DN user; bind lại bằng DN user để xác thực; đọc `sAMAccountName`, `userPrincipalName`, display name và nhóm; ánh xạ nhóm vào quyền AssetMaster; tạo session nội bộ; ghi audit log nhưng không ghi password hoặc token. Cần đặc biệt kiểm tra cách thư viện xử lý TLS và chứng thư CA.

## 9. Kiểm thử trước production

| Nhóm kiểm thử | Kết quả cần đạt |
|---|---|
| DNS/TLS | Domain ứng dụng và SSO phân giải đúng; HTTPS hợp lệ; không có mixed content. |
| LDAPS | Kết nối 636 thành công; chứng thư đúng FQDN; CA được tin cậy. |
| User sync | User mẫu được tìm đúng OU, không trùng định danh, trạng thái disabled được xử lý đúng. |
| Đăng nhập | User domain đăng nhập được; callback chỉ chấp nhận HTTPS và redirect URI đã đăng ký. |
| Phân quyền | Nhóm Admin vào được tính năng quản trị; nhóm User không vượt quyền. |
| Vòng đời tài khoản | Disable user trong AD thì đăng nhập mới bị chặn; user rời nhóm Admin mất quyền ở lần đồng bộ/đăng nhập kế tiếp theo chính sách. |
| Session | Cookie có `HttpOnly`, `Secure`; logout kết thúc session AssetMaster và, nếu cần, session Keycloak. |
| Mất kết nối | Khi DC tạm thời không khả dụng, ứng dụng trả lỗi thân thiện, không treo request và không ghi secret vào log. |
| Backup/restore | Khôi phục được database, object storage và cấu hình IdP từ staging backup. |

## 10. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân cần kiểm tra |
|---|---|
| `certificate verify failed` | Máy chạy Keycloak chưa trust root/intermediate CA, hostname không khớp SAN hoặc chứng thư hết hạn. |
| `Can't contact LDAP server` | Firewall chặn 636, DNS sai, DC không có chứng thư LDAPS hoặc ứng dụng đang trỏ nhầm IP. |
| Bind thất bại | Sai Bind DN/password, service account bị khóa/hết hạn, password có ký tự cần escape hoặc user không có quyền đọc OU. |
| Tìm thấy 0 user | Sai Base DN, OU, search scope hoặc filter `(&(objectCategory=person)(sAMAccountName=...))`. |
| User đăng nhập nhưng không có quyền | Mapper group/role chưa đúng, claim không được đưa vào token hoặc mapping Admin chưa được whitelist. |
| Đăng nhập vòng lặp | Sai redirect URI, issuer, cookie domain, reverse proxy headers hoặc thời gian hệ thống lệch. |
| Đăng nhập đột nhiên lỗi sau khi bật Require signing | Có client cũ đang dùng unsigned bind; xem Event ID 2887/2889/2888 và chuyển client sang LDAPS/SASL signing.[3] |

## 11. Checklist nghiệm thu

Trước khi đưa vào dùng thật, IT và chủ nghiệp vụ nên ký xác nhận rằng: IdP và LDAP không cho ứng dụng truy cập trực tiếp password; mọi kết nối directory dùng TLS/signing theo chính sách; client secret, Bind Credential và session secret nằm ngoài Git; nhóm AD đã được ánh xạ đúng; database và object storage đã backup; có phương án rollback về môi trường cũ; và có người chịu trách nhiệm vận hành DNS, chứng thư, DC, Keycloak, MySQL, storage và ứng dụng.

## Tài liệu tham khảo

[1] [Keycloak, *Server Administration Guide — Overview and User Federation*](https://www.keycloak.org/docs/latest/server_admin/index.html#_ldap)

[2] [Microsoft Learn, *Configure certificates for LDAP over SSL in Active Directory Domain Services*](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[3] [Microsoft Learn, *How to enable LDAP signing in Windows Server*](https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/enable-ldap-signing-in-windows-server)

[4] [Keycloak, *Securing applications and services with OpenID Connect*](https://www.keycloak.org/securing-apps/oidc-layers)

[5] [Microsoft Learn, *OpenID Connect on the Microsoft identity platform*](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
