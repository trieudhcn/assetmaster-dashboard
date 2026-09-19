# Thông báo email Microsoft 365 trong AssetMaster

## 1. Phạm vi đã triển khai

Module email hoạt động độc lập với đăng nhập Microsoft Entra ID. Có thể UAT ngay bằng chế độ **Mô phỏng** mà chưa cần Tenant ID, Client ID hoặc Client Secret.

Các sự kiện hiện được đưa vào hàng đợi email:

- xác nhận bàn giao tài sản và hoàn trả tài sản;
- duyệt hoặc từ chối yêu cầu hoàn trả tài sản;
- cấp đầy đủ, cấp một phần hoặc từ chối yêu cầu phụ kiện;
- tiếp nhận hoặc từ chối hoàn trả phụ kiện.

Outbox sử dụng `eventKey` duy nhất để tránh gửi trùng. Worker xử lý nền mỗi 30 giây, tự phục hồi tác vụ bị gián đoạn và retry theo khoảng 1, 2, 4, 8... phút, tối đa theo cấu hình quản trị. Email thất bại cuối cùng vẫn được giữ lại để quản trị viên xem lỗi và bấm **Gửi lại**.

## 2. UAT ngay khi chưa cấu hình Entra ID

1. Đăng nhập bằng tài khoản Admin.
2. Mở **Cài đặt → Email Microsoft 365**.
3. Chọn **Mô phỏng – không gửi ra ngoài**.
4. Nhập tên người gửi, URL AssetMaster và chọn các nhóm sự kiện cần thông báo.
5. Bấm **Lưu cấu hình**, sau đó **Kiểm tra**.
6. Khi kết quả đạt, bấm **Kích hoạt**.
7. Thực hiện một luồng bàn giao hoặc cấp phụ kiện, chờ tối đa 30 giây hoặc bấm **Gửi ngay**.
8. Xác nhận bản ghi chuyển từ **Chờ gửi** sang **Đã gửi**. Chế độ này không gọi Microsoft Graph và không gửi thư ra ngoài.

## 3. Chuẩn bị Microsoft 365 để gửi thật

Nên dùng một App Registration riêng cho email nền của AssetMaster, không dùng chung App Registration đăng nhập.

1. Tạo mailbox hệ thống, ví dụ `assetmaster@congty.vn`.
2. Tạo App Registration trong đúng tenant Microsoft Entra ID.
3. Cấp Microsoft Graph **Application permission** `Mail.Send` và thực hiện admin consent.
4. Dùng Exchange Online Application RBAC để giới hạn ứng dụng chỉ được gửi từ mailbox AssetMaster. Nếu dùng RBAC giới hạn mailbox, không giữ thêm quyền `Mail.Send` phạm vi toàn tenant làm vô hiệu phạm vi giới hạn.
5. Tạo client credential dành riêng cho AssetMaster; production ưu tiên certificate hoặc secret có vòng đời ngắn và quy trình xoay định kỳ.

Tài liệu Microsoft:

- [Microsoft Graph sendMail](https://learn.microsoft.com/graph/api/user-sendmail?view=graph-rest-1.0)
- [Client credentials flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Exchange Online Application RBAC](https://learn.microsoft.com/exchange/permissions-exo/application-rbac)

## 4. Mount Client Secret vào Docker

Không nhập giá trị Client Secret vào giao diện, Git, `.env`, chat hoặc email. Giao diện chỉ lưu đường dẫn tới tệp secret.

### Docker Desktop

Tạo tệp `<thu-muc-du-an>\secrets\m365_mail_client_secret.txt` bằng trình quản lý secret hoặc trình soạn thảo cục bộ an toàn. Tệp chỉ chứa giá trị secret trên một dòng. Sau đó khởi động bằng override email:

```powershell
docker compose -f docker-compose.yml -f docker-compose.desktop.yml -f docker-compose.email.yml up -d --build --force-recreate app
Invoke-RestMethod http://127.0.0.1:3000/readyz
```

### Ubuntu Server

Lưu secret tại `/etc/assetmaster/secrets/m365_mail_client_secret.txt`, đặt quyền đọc tối thiểu cho group chạy container và dùng override email:

```bash
sudo chown root:10001 /etc/assetmaster/secrets/m365_mail_client_secret.txt
sudo chmod 640 /etc/assetmaster/secrets/m365_mail_client_secret.txt
docker compose -f docker-compose.yml -f docker-compose.linux.yml -f docker-compose.email.yml up -d --build --force-recreate app
curl --fail --silent --show-error http://127.0.0.1:3000/readyz
```

Không chạy `docker compose down -v` và không xóa thư mục dữ liệu khi chỉ bổ sung hoặc xoay secret email.

## 5. Kích hoạt Microsoft Graph trong AssetMaster

1. Mở **Cài đặt → Email Microsoft 365**.
2. Chọn **Microsoft Graph – gửi thật**.
3. Nhập Tenant ID, Client ID, mailbox người gửi và đường dẫn `/run/secrets/m365_mail_client_secret`.
4. Nhập URL HTTPS mà người nhận dùng để truy cập AssetMaster.
5. Bấm **Lưu cấu hình**. Mỗi lần thay cấu hình, trạng thái kiểm tra được đặt lại để ngăn kích hoạt cấu hình chưa xác minh.
6. Bấm **Kiểm tra**. Microsoft Graph phải trả về HTTP 202 và mailbox người quản trị phải nhận được email thử.
7. Bấm **Kích hoạt** rồi thực hiện UAT nghiệp vụ.

## 6. Checklist UAT gửi thật

- [ ] Email thử tới đúng tài khoản Admin và hiển thị tiếng Việt đúng.
- [ ] Mailbox người gửi đúng với mailbox đã giới hạn bằng Exchange App RBAC.
- [ ] Xác nhận bàn giao tạo đúng một email dù thao tác/API bị gọi lặp.
- [ ] Cấp phụ kiện đầy đủ và một phần có nội dung khác nhau.
- [ ] Từ chối yêu cầu hiển thị ghi chú xử lý.
- [ ] Tài khoản nhân viên không có email không làm hỏng giao dịch nghiệp vụ và không tạo outbox sai.
- [ ] Dừng container khi đang xử lý, khởi động lại và xác nhận outbox tự phục hồi.
- [ ] Thu hồi quyền/đổi secret thử nghiệm, xác nhận retry và trạng thái **Thất bại**, sau đó khôi phục secret và bấm **Gửi lại**.
- [ ] Tắt module, xác nhận nghiệp vụ vẫn hoạt động nhưng không tạo email mới.

## 7. Vận hành và xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Không thể lấy access token | Tenant ID, Client ID hoặc secret sai/hết hạn | Kiểm tra App Registration, xoay secret, recreate container rồi kiểm tra lại |
| Graph trả `403` | Thiếu `Mail.Send`, chưa admin consent hoặc RBAC không cho mailbox | Kiểm tra quyền ứng dụng và phạm vi Exchange Online |
| Graph trả `404` cho người gửi | Sender mailbox sai hoặc chưa tồn tại trong Exchange Online | Kiểm tra UPN/mailbox và giấy phép Exchange |
| Email ở trạng thái Chờ gửi | Module đang tắt hoặc chưa đến lần retry | Kích hoạt module hoặc bấm **Gửi ngay** |
| Email ở trạng thái Thất bại | Đã hết số lần thử | Xem lỗi, sửa cấu hình rồi bấm **Gửi lại** |

Để rollback nhanh, chọn **Tắt gửi email** trong Cài đặt. Việc tắt không xóa lịch sử outbox và không ảnh hưởng đăng nhập Entra ID, LDAPS hoặc Admin bootstrap.
