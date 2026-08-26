# Xác minh cấp phát Bản quyền nâng cao

- Ngày xác minh: 26-08-2026 (GMT+7).
- Desktop: Mở form **Thêm bản quyền phần mềm** thành công; modal căn giữa và có vùng cuộn nội bộ.
- Dropdown **Mô hình kích hoạt** mở đúng trong modal, hiển thị ba lựa chọn: **Chỗ dùng riêng**, **Key riêng cho từng người**, **Tài khoản email dùng chung**.
- Dropdown không làm đóng modal khi mở danh sách lựa chọn.
- Khi chọn **Tài khoản email dùng chung**, form hiển thị đúng trường **Số tài khoản chủ mua** và **Giới hạn người dùng / tài khoản chủ** do Admin cấu hình.
- Mobile 390×844: màn hình Bản quyền & Dịch vụ giữ bố cục một cột, bộ lọc và các KPI không bị tràn ngang.
- Desktop sau bản vá modal: modal **Cấp phát Bản quyền** có overlay đồng nhất, được căn giữa và đã thu gọn theo nội dung; không còn lệch góc trên-trái hoặc khoảng trắng dư thừa.
- Desktop sau chuẩn hóa lần cuối: modal Cấp phát dùng cùng bề mặt trắng, header nhận diện, viền/overlay, vùng nội dung và hàng hành động với form Bản quyền/Dịch vụ; kích thước ôm sát nội dung ngắn.
- Desktop sau refactor cấu trúc: modal Cấp phát có `header`, vùng `body` cuộn nội bộ và `footer` tách biệt bằng đường viền; nút Hủy/Xác nhận luôn nằm trong footer, nền/overlay/căn giữa đồng nhất với form chuẩn.
- Desktop sau tinh gọn form: chỉ còn chọn Tài sản, Nhân sự, Ngày cấp và Ghi chú; hai trường Tên người/đối tượng giữ và Thiết bị không còn hiển thị, footer vẫn căn phải và đầy đủ thao tác.
- Desktop sau bản vá field: modal tài khoản chủ hiển thị đủ Tài khoản chủ, Tài sản, Nhân sự, Ngày cấp, Ghi chú, danh sách đang cấp phát và footer Hủy/Xác nhận; field Ghi chú có vùng input riêng trong lưới hai cột.
- Xác minh không ghi dữ liệu: field Ghi chú nhận và hiển thị đúng chuỗi thử nghiệm; thao tác chưa được xác nhận hoặc lưu.
- Đã đóng modal Cấp phát bằng Hủy sau khi kiểm tra, không tạo cấp phát mới; một form Tạo tài sản mở ngoài ý muốn trong bước kiểm tra cũng đã được đóng, không thay đổi dữ liệu.
- Xác minh dữ liệu thực: chọn nhân viên Kiều Lâm Quốc Triều hiển thị lịch sử Autocad, mã CAD, mô hình Tài khoản chủ, trạng thái Đang cấp phát, ngày cấp và thông tin Chưa thu hồi.
- Desktop sau bản vá footer: nút Hủy và Xác nhận cấp phát nằm trong footer tách biệt, có khoảng đệm rõ ràng ở mép phải và phía dưới; không còn chạm viền modal.
