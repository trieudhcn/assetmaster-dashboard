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


## Luồng hoàn trả phụ kiện về kho

Nhân viên có thể tạo yêu cầu hoàn trả theo từng phiếu đang giữ. Hệ thống hỗ trợ cả phụ kiện từ phiếu cấp phát và phụ kiện đi kèm biên bản bàn giao tài sản.

- Chỉ số **Đang giữ** là tổng số lượng còn giữ của tất cả dòng phụ kiện, không phải số phiếu.
- Portal hiển thị danh sách loại phụ kiện và tổng số lượng đang giữ theo từng loại.
- Nhân viên chọn số lượng hoàn trả trên từng dòng; tổng số lượng phải lớn hơn 0 và không vượt số lượng còn giữ.
- Mỗi nguồn chỉ có một yêu cầu hoàn trả ở trạng thái chờ duyệt.
- Nhân viên có thể hủy yêu cầu khi còn chờ duyệt.
- Admin có thể duyệt hoặc từ chối kèm phản hồi trong **Phụ kiện → Phiếu cấp phát**.
- Khi duyệt, hệ thống kiểm tra lại quyền sở hữu, nguồn cấp phát và số lượng còn giữ trong transaction.
- Chỉ sau khi duyệt, số lượng đã trả mới được ghi nhận, tồn kho mới được cộng lại và lịch sử nhập kho mới được tạo.
- Nếu dữ liệu đã thay đổi hoặc số lượng không còn hợp lệ, toàn bộ thao tác được rollback.
- Các dòng xuất kho cũ không có liên kết nguồn vẫn được hiển thị để đối soát nhưng không thể tự động tạo yêu cầu hoàn trả.

### UAT hoàn trả

1. Cấp nhiều hơn một đơn vị phụ kiện cho nhân viên và xác nhận **Đang giữ** bằng tổng số lượng còn giữ.
2. Kiểm tra phần tóm tắt hiển thị đúng tên và số lượng từng loại phụ kiện.
3. Từ một phiếu cấp phụ kiện, tạo yêu cầu trả một phần và xác nhận tồn kho chưa thay đổi khi yêu cầu còn chờ.
4. Hủy yêu cầu đang chờ và xác nhận admin không thể duyệt yêu cầu đó.
5. Tạo lại yêu cầu, đăng nhập admin và từ chối kèm lý do; xác nhận portal hiển thị phản hồi.
6. Tạo yêu cầu khác và duyệt; xác nhận tồn kho tăng đúng, số lượng còn giữ giảm đúng và có dòng lịch sử nhập kho.
7. Lặp lại với phụ kiện đi kèm biên bản bàn giao tài sản.
8. Thử tạo hai yêu cầu chờ cho cùng một phiếu, trả vượt số lượng còn giữ hoặc duyệt sau khi dữ liệu nguồn đã thay đổi; xác nhận hệ thống chặn và không cập nhật dở dang.
9. Kiểm tra `/readyz` sau khi migration `0065_supply_return_requests` hoàn tất.


## Kiểm đếm tình trạng và biên bản hoàn trả

Khi admin mở yêu cầu từ chuông thông báo hoặc hàng đợi hoàn trả, từng dòng phải được phân loại đầy đủ trước khi duyệt:

| Phân loại | Ảnh hưởng tồn kho |
| --- | --- |
| Tốt | Cộng vào tồn khả dụng và có thể cấp phát lại |
| Hỏng | Cộng vào tồn hư hỏng/cách ly, không được cấp phát |
| Thiếu | Ghi nhận chênh lệch trên biên bản, không cộng vào kho |
| Cần sửa | Cộng vào tồn chờ sửa chữa, không được cấp phát |

Tổng bốn loại trên mỗi dòng phải bằng số lượng nhân viên đề nghị hoàn. Nếu có số lượng hỏng, thiếu hoặc cần sửa, admin bắt buộc ghi chú tình trạng. Việc giảm số lượng nhân viên đang giữ, cập nhật các vùng tồn và tạo biên bản được thực hiện trong cùng transaction.

Sau khi duyệt, hệ thống sinh mã biên bản `BBHTPK-NĂM-ID`, lưu người giao, người nhận/kiểm đếm, thời gian, kết quả từng dòng và cho phép mở bản xem trước để in hoặc tải PDF. Nhân viên cũng có thể mở PDF từ lịch sử trên portal.

### UAT kiểm đếm và PDF

1. Tạo yêu cầu hoàn trả và xác nhận chuông admin xuất hiện thông báo chưa đọc.
2. Mở thông báo và xác nhận hệ thống điều hướng, cuộn đến đúng yêu cầu hoàn trả.
3. Kiểm đếm toàn bộ là hàng tốt; xác nhận tồn khả dụng tăng đúng.
4. Kiểm đếm hỗn hợp tốt, hỏng, thiếu và cần sửa; xác nhận tổng phân loại bắt buộc bằng số lượng yêu cầu.
5. Bỏ trống ghi chú khi có hàng bất thường; xác nhận hệ thống không cho duyệt.
6. Duyệt yêu cầu; xác nhận tồn tốt, tồn hỏng và tồn cần sửa tăng đúng, còn số thiếu không làm tăng kho.
7. Mở danh mục phụ kiện; xác nhận tồn hỏng/cần sửa hiển thị riêng và không được tính vào tồn khả dụng.
8. Mở biên bản PDF từ admin và portal nhân viên; kiểm tra mã biên bản, người giao nhận, bảng kiểm đếm và vùng ký tên.
