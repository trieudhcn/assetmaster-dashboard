# Nguồn nghiên cứu cho xác thực LDAP nội bộ

## Kết luận đã xác minh

- Active Directory dùng LDAP mặc định trên cổng 389, trong khi **LDAPS** thiết lập TLS ngay khi kết nối qua cổng 636. Microsoft khuyến nghị bảo vệ LDAP bằng signing và channel binding để hạn chế sửa đổi, replay và man-in-the-middle.[1]
- Chứng chỉ LDAPS của Domain Controller cần Server Authentication EKU, chứa FQDN của DC trong Subject/SAN, có private key tại certificate store phù hợp và chuỗi CA được client tin cậy.[2]
- Keycloak hỗ trợ User Federation từ LDAP/Active Directory. Với mô hình này, trình duyệt nhập mật khẩu ở Keycloak; ứng dụng chỉ nhận token đã ký, do đó không trực tiếp nhìn thấy hoặc lưu mật khẩu nhân viên.[3]
- Keycloak khuyến nghị Authorization Code flow cho ứng dụng web. Direct Grant/Resource Owner Password Credentials làm ứng dụng tiếp xúc credential và không nên dùng.[4]
- Khi xây dựng LDAP search, mọi biến đầu vào phải được escape đúng theo filter/DN encoding; đồng thời cần allow-list và tài khoản bind tối thiểu quyền.[5]
- TLS nên có trên mọi trang; cookie phiên phải đặt `Secure`. TLS 1.3 là mặc định khuyến nghị, TLS 1.2 được giữ khi cần tương thích; TLS 1.0/1.1 phải tắt.[6]
- Snipe-IT minh họa cách tách cấu hình môi trường, database, storage, session và backup ra khỏi mã nguồn. Thiết kế installer AssetMaster kế thừa nguyên tắc tách cấu hình này, nhưng không sao chép nguyên xi cơ chế của Snipe-IT.[7]
- Password của Admin bootstrap cục bộ phải lưu dưới dạng hash, không phải plaintext hay encryption có thể giải mã. OWASP ưu tiên Argon2id với work factor phù hợp hạ tầng.[8]
- RAID tăng khả năng chịu lỗi ổ đĩa nhưng backup vẫn cần là bản sao logical, có kiểm tra khôi phục. CISA khuyến nghị tự động hóa backup, bảo vệ bằng encryption/offline copy và thực hành restore.[9]
- `ldapts` hỗ trợ client `ldaps://`, TLS options, bind/search/unbind và `escapeFilter` để ngăn input người dùng bị diễn giải thành LDAP filter. Mỗi client xác thực phải được unbind sau khi dùng, vì bind credential chỉ nên tồn tại trong bộ nhớ của client trong thời gian ngắn.[10]

## Sources

[1] [Microsoft Learn — LDAP signing for Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/ldap-signing)

[2] [Microsoft Learn — Configure certificates for LDAP over SSL in Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/configure-ldap-signing-certificates)

[3] [Keycloak Server Administration Guide — User Federation / LDAP](https://www.keycloak.org/docs/latest/server_admin/#_user-storage-federation)

[4] [Keycloak — Securing applications and services with OpenID Connect](https://www.keycloak.org/securing-apps/oidc-layers)

[5] [OWASP — LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)

[6] [OWASP — Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

[7] [Snipe-IT Documentation — Environment Configuration](https://snipe-it.readme.io/docs/configuration)

[8] [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

[9] [CISA — Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data)

[10] [ldapts — Node.js LDAP TypeScript client](https://www.npmjs.com/package/ldapts)
