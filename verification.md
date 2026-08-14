# Xác minh giao diện

- Desktop 1280×720: Dashboard hiển thị sidebar, top bar, KPI và khu vực danh mục theo bố cục dự kiến; không thấy lỗi render sau khi tích hợp QR và chứng từ.
- Mobile 375×812: Header gọn, điều hướng thu gọn và các KPI xếp theo chiều dọc; không có tràn ngang ở viewport đầu trang đã kiểm tra.

Trên production, đã tạo dữ liệu QA tạm thời, dùng payload `ASSETMASTER|<qrToken>` để nhận diện đúng tài sản trong hộp Quét mã QR, đồng thời tải thành công chứng từ PDF và thấy lại liên kết chứng từ trong phiếu bảo trì. Toàn bộ tài sản, phiếu và nhật ký QA đã được dọn sau kiểm tra; đối tượng S3 không còn được tham chiếu trong database.

Đã mở trực tiếp URL `/manus-storage/` của chứng từ production và xác nhận hệ thống chuyển hướng tới URL CloudFront có chữ ký hợp lệ. Tệp QA chỉ là chuỗi PDF tối thiểu nên trình xem PDF của Chromium không thể render nội dung; tuy vậy, đường dẫn S3 và cơ chế ký truy cập hoạt động đúng. Dữ liệu QA của lần kiểm tra này cũng đã được dọn sạch.
