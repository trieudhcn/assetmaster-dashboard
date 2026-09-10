# Luồng yêu cầu cấp phụ kiện từ Portal nhân viên

## Phạm vi

Nhân viên có thể chọn phụ kiện đang hoạt động và còn tồn kho, gửi một yêu cầu gồm nhiều dòng và theo dõi toàn bộ lịch sử xử lý. Quản trị viên QLTS xem hàng đợi, từ chối kèm lý do hoặc duyệt để hệ thống tạo phiếu cấp phát.

## Trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| `pending` | Nhân viên đã gửi, QLTS chưa xử lý |
| `approved` | Trạng thái trung gian bên trong transaction tạo phiếu |
| `fulfilled` | Đã cấp đủ số lượng yêu cầu và tạo phiếu cấp phát |
| `partially_fulfilled` | Đã cấp một phần số lượng yêu cầu và tạo phiếu cấp phát |
| `rejected` | QLTS từ chối và có phản hồi |
| `cancelled` | Nhân viên hủy khi yêu cầu còn chờ duyệt |

## Kiểm soát nghiệp vụ

- Portal chỉ trả về phụ kiện `isActive = true` và `stockQuantity > 0`.
- Nhân viên chỉ xem và hủy yêu cầu do chính mình tạo.
- Một phụ kiện chỉ xuất hiện một lần trong cùng yêu cầu.
- Số lượng yêu cầu được giữ nguyên; số lượng thực cấp được lưu riêng trên từng dòng.
- Khi duyệt, quản trị viên có thể nhập số lượng từ 0 đến số lượng yêu cầu nhưng phải thực cấp ít nhất một dòng.
- Số lượng thực cấp không được vượt tồn kho hiện tại và được kiểm tra lại trong transaction.
- Chỉ quản trị viên được xem toàn bộ yêu cầu, từ chối hoặc duyệt.
- Duyệt yêu cầu, trừ tồn kho, tạo dòng xuất kho, tạo phiếu cấp phát và liên kết yêu cầu được thực hiện trong cùng một transaction.
- Nếu bất kỳ phụ kiện nào không đủ tồn, toàn bộ thao tác duyệt được rollback và yêu cầu vẫn chờ xử lý.
- Một yêu cầu chỉ có thể liên kết với một phiếu cấp phát.

## Mã chứng từ

- Yêu cầu: `YCPK-NĂM-0001`
- Phiếu cấp phát: `PK-NĂM-001`

## UAT tối thiểu

1. Đăng nhập tài khoản nhân viên và xác nhận chỉ thấy phụ kiện còn tồn.
2. Tạo yêu cầu có ít nhất hai phụ kiện.
3. Xác nhận yêu cầu xuất hiện trong lịch sử với trạng thái **Chờ duyệt**.
4. Hủy một yêu cầu khác và xác nhận admin không thể duyệt yêu cầu đã hủy.
5. Đăng nhập admin, mở **Phụ kiện → Phiếu cấp phát** và kiểm tra hàng đợi yêu cầu.
6. Từ chối một yêu cầu kèm lý do; xác nhận phản hồi xuất hiện trên portal.
7. Duyệt một yêu cầu đủ tồn; xác nhận phiếu `PK-...` được tạo và tồn kho giảm đúng.
8. Duyệt số lượng thấp hơn yêu cầu hoặc nhập 0 cho một dòng; xác nhận trạng thái **Cấp một phần**, phiếu chỉ có các dòng lớn hơn 0 và portal hiển thị đúng “Yêu cầu / Thực cấp”.
9. Thử nhập số lượng vượt yêu cầu hoặc vượt tồn; xác nhận modal không cho gửi.
10. Tạo yêu cầu rồi làm giảm tồn kho bằng giao dịch khác trước khi duyệt; xác nhận hệ thống rollback toàn bộ khi số lượng thực cấp không còn đủ tồn.
11. Kiểm tra `/readyz` sau khi migration `0064_partial_supply_request_fulfillment` hoàn tất.
