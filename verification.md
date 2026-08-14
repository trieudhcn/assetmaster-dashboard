# Xác minh giao diện

- Desktop 1280×720: Dashboard hiển thị sidebar, top bar, KPI và khu vực danh mục theo bố cục dự kiến; không thấy lỗi render sau khi tích hợp QR và chứng từ.
- Mobile 375×812: Header gọn, điều hướng thu gọn và các KPI xếp theo chiều dọc; không có tràn ngang ở viewport đầu trang đã kiểm tra.

Trên production, đã tạo dữ liệu QA tạm thời, dùng payload `ASSETMASTER|<qrToken>` để nhận diện đúng tài sản trong hộp Quét mã QR, đồng thời tải thành công chứng từ PDF và thấy lại liên kết chứng từ trong phiếu bảo trì. Toàn bộ tài sản, phiếu và nhật ký QA đã được dọn sau kiểm tra; đối tượng S3 không còn được tham chiếu trong database.

Đã mở trực tiếp URL `/manus-storage/` của chứng từ production và xác nhận hệ thống chuyển hướng tới URL CloudFront có chữ ký hợp lệ. Tệp QA chỉ là chuỗi PDF tối thiểu nên trình xem PDF của Chromium không thể render nội dung; tuy vậy, đường dẫn S3 và cơ chế ký truy cập hoạt động đúng. Dữ liệu QA của lần kiểm tra này cũng đã được dọn sạch.

## Nhắc lịch, Excel và nhật ký hoạt động

- Mobile 375×812 — **Bảo trì**: bảng “Nhắc việc vận hành”, hạn bảo trì, chu kỳ lặp và form tạo yêu cầu xếp thành một cột, không che phần nội dung chính.
- Mobile 375×812 — **Kiểm kê**: bảng nhắc việc, ngày kiểm kê, chu kỳ định kỳ và nút tạo đợt hiển thị trọn vẹn trong một cột.
- Mobile 375×812 — **Báo cáo**: KPI, bộ lọc phòng ban, nút xuất Excel, ô tìm kiếm/bộ lọc nhật ký và bảng nhật ký đều hiển thị trong chiều rộng thiết bị; bảng giữ cuộn ngang cục bộ khi cần.
- Mobile 375×812 — **Điều hướng**: sidebar được thay bằng nút menu ở header; ảnh chụp viewport thực xác nhận không chiếm không gian nội dung khi menu đóng.
- Production desktop — `/ ?release=39a92bc8`: đã xác nhận giao diện mới tải đúng phần nhắc việc, lịch định kỳ, xuất Excel và nhật ký hoạt động.

### Bằng chứng ảnh mở xem trực tiếp

| Màn hình | Tệp ảnh 375px | Nội dung xác nhận |
| --- | --- | --- |
| Kiểm kê | `webdev-preview-root-1786701952116765091-5115.png` | Có nút menu thu gọn; bảng “Nhắc việc vận hành”; trường ngày `mm/dd/yyyy`; trường “Chu kỳ (ngày)” và CTA tạo đợt. |
| Báo cáo | `webdev-preview-root-1786701952259727350-2978.png` | Có nút menu thu gọn; thẻ “Xuất tài sản theo phòng ban”, chọn phòng ban, CTA “Xuất Excel (1)”, cùng ô tìm kiếm/bộ lọc và bảng “Nhật ký hoạt động”. |
| Bảo trì | `webdev-preview-root-1786701952636584902-2875.png` | Có nút menu thu gọn; bảng “Nhắc việc vận hành”; trường hạn bảo trì và “Lặp lại (ngày)” trong form tạo yêu cầu. |

### Xác minh production qua giao diện trực tiếp

- **Báo cáo**: giao diện production hiển thị “Xuất tài sản theo phòng ban”, bộ chọn phòng ban, nút “Xuất Excel (1)”, cùng tìm kiếm/bộ lọc và bảng “Nhật ký hoạt động”.
- **Bảo trì**: giao diện production hiển thị bảng “Nhắc việc vận hành”, bộ đếm việc cần theo dõi, trường “Hạn bảo trì” và “Lặp lại (ngày)”.
- **Kiểm kê**: giao diện production hiển thị bảng “Nhắc việc vận hành”, trường “Ngày kiểm kê”, “Chu kỳ (ngày)” và CTA “Tạo đợt kiểm kê”.
- Dữ liệu QA `assets.id=120001`, `maintenanceTickets.id=30001` và activity log liên quan đã được xóa bằng truy vấn theo đúng thứ tự phụ thuộc trước checkpoint cuối.
- Kiểm tra cuối: **21/21 Vitest tests** đạt; `tsc --noEmit` và production build đạt. Build chỉ báo cảnh báo tối ưu kích thước chunk, không phát sinh lỗi biên dịch hoặc runtime.
