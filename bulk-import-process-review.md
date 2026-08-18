# Rà soát quy trình nhập nhiều tài sản bằng Excel

**Phạm vi:** Tạo template Excel → danh mục dropdown → đọc tệp → kiểm tra dữ liệu → xem trước → import → lưu lịch sử/hoàn tác.

**Kết luận ngắn:** Luồng hiện tại đã hoạt động đúng cho việc tạo mới tối đa 100 tài sản và có nhiều lớp bảo vệ hữu ích. Export thực tế đã tạo được template với dữ liệu danh mục hiện có; TypeScript, 147 kiểm thử và production build đều đạt. Tuy nhiên, có ba điểm cần ưu tiên trước khi mở rộng việc dùng import cho nhiều người quản trị: liên kết Nhà cung cấp, tính toàn vẹn khi import bị lỗi giữa chừng và chức năng “cập nhật tài sản có sẵn”.

## Những điểm đã đạt

| Hạng mục | Trạng thái | Nhận định |
|---|---:|---|
| Quyền import | Đạt | Chỉ Admin gọi được procedure import. |
| Giới hạn tệp/dòng | Đạt | Client chỉ nhận `.xlsx`, tối đa 2 MB và 100 dòng/lần. |
| Dropdown danh mục | Đạt | Phân loại, Nhà cung cấp và Hãng đang hoạt động được đưa vào sheet danh mục ẩn, áp dụng cho 100 dòng. |
| Header template | Đạt | Header dùng nền xám nhạt, chữ xanh đậm, có kiểm thử workbook. |
| Kiểm tra server | Đạt một phần | Server kiểm tra lại Phân loại và Hãng còn hoạt động, không chỉ tin dropdown Excel. |
| Lịch sử/hoàn tác | Đạt | Có phiên import, log trường thay đổi và hoàn tác phiên import gần nhất trong 24 giờ. |

> **Lưu ý:** Dropdown Excel chỉ giúp nhập đúng dữ liệu; nó không phải lớp bảo mật. Người dùng vẫn có thể dán hoặc gõ một giá trị khác, do đó server phải tiếp tục kiểm tra toàn bộ dữ liệu tham chiếu.

## Các phát hiện và hướng xử lý

| Ưu tiên | Phát hiện | Tác động | Hướng xử lý đề xuất |
|---|---|---|---|
| P0 | Nhà cung cấp được giữ dưới dạng văn bản, nhưng `vendorId` luôn để `null` khi import. Server hiện chưa xác minh Nhà cung cấp còn hoạt động. | Báo cáo/lọc theo Nhà cung cấp có thể không nhận diện đúng tài sản vừa import; giá trị không hợp lệ vẫn có thể lọt vào. | Tra Nhà cung cấp theo tên ở server, chặn giá trị không tồn tại/ngừng hoạt động và ghi cả `vendor` lẫn `vendorId`. Bổ sung hồi quy cho Nhà cung cấp hợp lệ, không tồn tại và ngừng hoạt động. |
| P0 | Import tạo từng tài sản tuần tự nhưng chưa đóng trong một transaction. Nếu một thao tác DB lỗi giữa chừng, các dòng trước có thể đã được tạo, trong khi giao diện chỉ nhận lỗi chung. | Có nguy cơ import dở dang và khó đối soát khi lỗi hạ tầng hoặc trùng mã diễn ra giữa lô. | Dùng transaction cho session, item log, asset và field change; nếu không thể transaction toàn lô, trả kết quả theo từng dòng và đánh dấu phiên `partial_failed`. |
| P1 | `updateExisting` đã được truyền từ client, nhưng backend luôn trả `updated = 0` và không có nhánh cập nhật. | Gây kỳ vọng sai khi mở lại/tái sử dụng tính năng cập nhật. | Tạm ẩn/xóa cờ này cho đến khi xác định khóa cập nhật hợp lệ; hoặc triển khai cập nhật theo Mã tài sản/Serial với preview thay đổi, xác nhận riêng và audit đầy đủ. |
| P1 | Bộ phân tích ngày dùng `new Date(năm, tháng - 1, ngày)`, có thể tự chuẩn hóa ngày không tồn tại như `31/02`. | Có thể lưu sai ngày mua hoặc hạn bảo hành mà không báo lỗi. | So sánh lại ngày/tháng/năm của kết quả với giá trị đầu vào; từ chối ngày không hợp lệ. |
| P1 | Giá trị tiền tệ đang xóa mọi dấu chấm/phẩy/khoảng trắng trước khi kiểm tra. Ví dụ `1,5` trở thành `15`. | Nguy cơ sai nguyên giá nếu người dùng dán định dạng tiền không đúng chuẩn VNĐ. | Chỉ nhận số nguyên VNĐ hoặc viết parser theo quy tắc VNĐ rõ ràng; hiển thị giá trị đã chuẩn hóa ngay trong preview trước khi import. |
| P2 | Mã tài sản tiếp theo được tính bằng truy vấn mã lớn nhất rồi tạo mới. Ràng buộc unique ngăn trùng, nhưng hai Admin import đồng thời có thể làm một lô thất bại giữa chừng. | Thao tác đồng thời có thể gây lỗi trùng mã và làm lô bị ngắt. | Cấp sequence trong transaction/row lock hoặc retry có kiểm soát khi gặp duplicate key; ghi rõ dòng bị lỗi nếu retry thất bại. |
| P2 | Client luôn đọc sheet đầu tiên, chưa xác nhận đúng sheet `Danh sách tài sản` và đầy đủ header bắt buộc. | File có sheet giới thiệu đứng trước hoặc header bị đổi tên có thể dẫn tới thông báo lỗi khó hiểu. | Ưu tiên tìm sheet `Danh sách tài sản`; kiểm tra header chuẩn trước khi parse và trả lỗi chỉ rõ cột thiếu/không đúng. |
| P2 | Giá trị danh mục được giữ trong biến dùng chung của module để tạo file. | Hiện chưa gây lỗi trong modal đơn, nhưng khó bảo trì nếu modal được mở đồng thời hoặc thay đổi kiến trúc. | Truyền danh mục vào hàm export/hook cục bộ thay vì biến module. |

## Quy trình xử lý khuyến nghị

| Giai đoạn | Việc cần làm | Tiêu chí hoàn tất |
|---|---|---|
| 1. Ổn định dữ liệu tham chiếu | Sửa ánh xạ/kiểm tra Nhà cung cấp, giữ Hãng và Phân loại cùng một chuẩn. | Mọi tài sản import từ dropdown đều có `categoryId`, `vendorId`, `brandId` đúng khi giá trị được chọn. |
| 2. An toàn giao dịch | Bao transaction hoặc cơ chế kết quả từng dòng; bảo vệ sinh mã khi có thao tác đồng thời. | Không còn trường hợp import “nửa chừng” không thể đối soát. |
| 3. Chuẩn hóa đầu vào | Kiểm tra ngày thực tế, parser tiền VNĐ, xác minh header/sheet. | Preview phản ánh đúng dữ liệu sẽ lưu và lỗi chỉ rõ dòng/cột. |
| 4. Hoàn thiện cập nhật | Quyết định bỏ hoặc triển khai `updateExisting` với khóa nhận diện rõ ràng. | Không còn cờ chức năng không có tác dụng. |
| 5. Vận hành | Lưu file nguồn của mỗi phiên import trong kho nội bộ/S3, giữ log kết quả và cho xuất lại dòng lỗi. | Admin có thể truy vết, sửa và tái nhập mà không mất bằng chứng nguồn. |

## Khuyến nghị vận hành ngay

Trong khi chưa xử lý các mục P0, chỉ nên dùng import để **tạo mới** và yêu cầu Admin kiểm tra cột Nhà cung cấp trong danh sách tài sản sau import. Không dùng cờ cập nhật dữ liệu cũ. Với các lô có giá trị tiền lớn, nên import thử 1–2 dòng, đối chiếu ngày mua, nguyên giá, Nhà cung cấp/Hãng rồi mới nhập toàn bộ lô.

## Phạm vi kiểm chứng đã thực hiện

Template đã được tạo từ giao diện và preview hiển thị dữ liệu danh mục hiện có. Hàng tiêu đề xám nhạt, sheet danh mục ẩn và ba dropdown được kiểm tra bằng hồi quy workbook. TypeScript, 147 kiểm thử Vitest và production build đều đạt tại thời điểm rà soát.
