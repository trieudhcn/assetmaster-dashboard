# Xác minh giao diện Bản quyền & Dịch vụ

- Desktop: lối mở `?view=licenses` hiển thị đúng tiêu đề, bốn KPI, hai tab Bản quyền/Dịch vụ, tìm kiếm, trạng thái trống và hai khu vực sắp hết hạn.
- Mobile: tiêu đề, nút thêm, KPI xếp dọc, tab, tìm kiếm và hai khu vực sắp hết hạn giữ bố cục rõ ràng, không che khuất nội dung.
- Bộ lọc: desktop hiển thị trạng thái và Nhà cung cấp gọn dưới thanh tìm kiếm; mobile xếp dọc trong cùng khối, không tràn ngang và vẫn dễ thao tác.
- Modal Dịch vụ: đã xác minh hộp Thêm dịch vụ căn giữa, bắt đầu tại đầu biểu mẫu và cuộn nội bộ đúng trên desktop/mobile; mobile dùng chiều rộng theo viewport, không còn neo tại góc trên/trái.
- Modal Bản quyền: đã xác minh hộp Thêm bản quyền căn giữa ở desktop/mobile qua lối mở trực tiếp `?view=licenses&licenseTab=licenses&createLicense=1`; panel giữ chiều rộng theo viewport và cuộn nội bộ, không còn neo góc trên/trái.
- Form Bản quyền/Dịch vụ: desktop hiển thị hai cột đều nhau với trường nhập nền trắng, viền rõ, nhãn căn lề và khoảng cách nhất quán; chân Hủy/Lưu luôn tách biệt bằng đường viền trên. Mobile tự chuyển một cột, trường giữ độ rộng theo panel, footer thao tác còn nhìn thấy khi cuộn nội bộ và không che nội dung.
