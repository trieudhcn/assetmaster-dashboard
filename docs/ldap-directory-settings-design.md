# Thiết kế Cài đặt hệ thống — Directory LDAP/AD

## Mục tiêu

Khu vực **Directory LDAP/AD** giúp Quản trị viên cấu hình có kiểm soát các thông số vận hành của LDAP/LDAPS trong AssetMaster self-hosted. Thiết kế không biến AssetMaster thành nơi nhận hoặc lưu mật khẩu nhân viên; việc xác thực vẫn diễn ra ở Keycloak nội bộ và Active Directory/LDAP qua LDAPS.[1] [2]

> Đây là thiết kế cho **giai đoạn migration self-hosted**. Nó chưa được triển khai vào phiên bản Manus hiện tại và không làm thay đổi cơ chế đăng nhập đang vận hành.

## Phân quyền và trải nghiệm sử dụng

Chỉ role `admin` có quyền xem khu vực này; chỉ nhóm `directory-admin` được quyền đề xuất thay đổi. Một thay đổi về endpoint, CA hoặc nhóm Admin cần người duyệt thứ hai. Mọi lần xem, tạo nháp, kiểm tra, áp dụng, rollback và thất bại đều ghi audit với người thao tác, thời gian, version trước/sau và lý do — không bao gồm secret.

| Tab giao diện | Nội dung | Hành động cho phép |
|---|---|---|
| Tổng quan | Trạng thái active, LDAPS reachability, CA expiry, thời điểm kiểm tra, version | Xem audit, tạo bản nháp |
| Kết nối | FQDN LDAPS, cổng 636 cố định, Base/Users/Groups DN, timeout | Lưu nháp, kiểm tra TLS/DN |
| Thuộc tính | Username, immutable ID, email, tên, chức danh, phòng ban | Preview mapping trên dữ liệu mẫu đã che |
| Nhóm & quyền | DN nhóm User/Admin/Auditor và nested group | Kiểm tra mapping, lưu nháp |
| Chứng chỉ CA | Chỉ upload CA public PEM, hiển thị issuer/SHA-256/expiry | Xác nhận trust; không nhận private key |
| Phiên & audit | Timeout session, hiện trạng secret, lịch sử thay đổi | Xem, rollback về version active trước |

## Quy tắc bảo mật dữ liệu

| Loại giá trị | Nơi lưu/đọc | Quy tắc |
|---|---|---|
| LDAPS URL, DN, mapping, group DN | Bảng cấu hình versioned trong MySQL; chỉ backend admin đọc | Mã hóa at-rest theo key riêng; che một phần trong audit |
| CA public certificate | Object storage private/volume bảo vệ; hash trong DB | Chỉ PEM public; xác minh chain và thời hạn |
| Bind password LDAP | Docker secret/file `0600`; **chỉ Keycloak đọc** | Không có input/API/export/Audit payload |
| Keycloak admin credential | Docker secret riêng; backend operator command đọc khi cần | Cấp quyền realm tối thiểu; không chia sẻ với bind password |
| Mật khẩu nhân viên | Chỉ browser ↔ Keycloak ↔ LDAPS | AssetMaster không nhận, log, lưu hay hiển thị |

## Quy trình thay đổi

1. Quản trị viên tạo bản nháp có ghi lý do thay đổi. Hệ thống kiểm tra format URL, buộc `ldaps://`, port 636, FQDN hợp lệ và DN không rỗng.
2. Hệ thống kiểm tra TLS với CA đã tải lên, xác thực FQDN/certificate và thử truy vấn read-only. Kết quả chỉ nêu số lượng/tình trạng; không trả dữ liệu nhân viên hàng loạt về browser.
3. Người duyệt thứ hai xem bản diff giữa candidate và cấu hình active, sau đó phê duyệt hoặc từ chối.
4. Đội vận hành áp dụng candidate vào Keycloak từ console nội bộ trong giai đoạn đầu. Sau khi đã kiểm thử đầy đủ, có thể thay bằng service account Keycloak quyền tối thiểu để tự động áp dụng từ backend.
5. Hệ thống chạy smoke test với user User/Admin test đã được phê duyệt. Nếu thất bại, tự giữ bản active cũ; nếu đạt, đánh dấu version mới active và tạo audit.

## Cảnh báo vận hành

Không cho phép bật cấu hình mới khi không còn ít nhất một session Admin hợp lệ. Khi sửa group Admin, bắt buộc kiểm thử người dùng không liên quan trước, rồi kiểm tra một account Admin dự phòng. Không xóa lịch sử cấu hình; chỉ deactive version cũ để có thể rollback. Một endpoint LDAPS đã mất trust, certificate sắp hết hạn hoặc quá nhiều xác thực thất bại phải hiện cảnh báo ở tổng quan hệ thống.

## References

[1] [Keycloak Server Administration Guide — User Federation](https://www.keycloak.org/docs/latest/server_admin/#_user-storage-federation)

[2] [Microsoft Learn — LDAP signing for Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/ldap-signing)
