# AssetMaster — Asset Catalog Expansion

- [x] Mở rộng mô hình dữ liệu tài sản với thông tin chi tiết và trạng thái thao tác.
- [x] Thêm modal tạo tài sản mới với validation cơ bản.
- [x] Thêm modal chỉnh sửa tài sản và cập nhật dữ liệu trong bảng.
- [x] Thêm drawer hoặc modal xem chi tiết tài sản.
- [x] Kết nối thao tác QR, bàn giao và chỉnh sửa với từng dòng tài sản.
- [x] Hoàn thiện lọc, tìm kiếm, reset bộ lọc và phân trang có trạng thái.
- [x] Kiểm tra responsive cho modal/drawer và bảng trên mobile.
- [x] Chạy TypeScript, production build, screenshot và lưu checkpoint cuối.

## Handover & Assignment Flow

- [x] Mở rộng mô hình phiếu bàn giao, trạng thái xử lý và lịch sử người nhận.
- [x] Xây dựng màn hình danh sách phiếu bàn giao với KPI, tìm kiếm và bộ lọc.
- [x] Thêm form tạo phiếu bàn giao có chọn tài sản, người nhận, ngày bàn giao và tình trạng.
- [x] Thêm phần phụ kiện đi kèm, ghi chú và xác nhận các bên.
- [x] Xây dựng lịch sử người nhận theo từng tài sản.
- [x] Thêm biên bản bàn giao chi tiết với thông tin hai bên và danh sách tài sản.
- [x] Thêm các trạng thái Nháp, Chờ ký, Đã bàn giao và Đã hoàn trả.
- [x] Kiểm tra responsive, TypeScript, production build, screenshot và checkpoint.

## PDF Export & Electronic Signature

- [x] Thêm thư viện tạo PDF phía trình duyệt và hàm xuất biên bản.
- [x] Thiết kế bản PDF có tiêu đề, thông tin hai bên, tài sản, tình trạng và chữ ký.
- [x] Thêm vùng canvas ký điện tử trực tiếp trên web.
- [x] Hỗ trợ xóa/ký lại, xác nhận chữ ký và hiển thị trạng thái đã ký.
- [x] Gắn chữ ký vào biên bản chi tiết và dữ liệu xuất PDF.
- [x] Kiểm tra responsive, TypeScript, production build, screenshot và checkpoint.

## PDF Template Refinement

- [x] Thêm logo AssetMaster vào đầu trang PDF.
- [x] Chuẩn hóa toàn bộ nhãn và nội dung biên bản bằng tiếng Việt có dấu.
- [x] Tổ chức lại bố cục PDF thành tiêu đề, thông tin phiếu, bảng tài sản, xác nhận và chữ ký.
- [x] Thêm thông tin doanh nghiệp, số trang và chân trang chuyên nghiệp.
- [x] Kiểm tra build, preview và checkpoint mẫu PDF mới.

## Company Settings & PDF Header

- [x] Thêm mô hình thông tin công ty gồm tên, địa chỉ, mã số thuế và số điện thoại.
- [x] Thêm giao diện cài đặt thông tin công ty trong khu vực Cài đặt hệ thống.
- [x] Lưu và khôi phục thông tin công ty trong trình duyệt.
- [x] Tự động điền thông tin công ty vào tiêu đề biên bản bàn giao PDF.
- [x] Kiểm tra validation, build, responsive và checkpoint.

## Production Readiness Audit

- [x] Rà soát và ghi nhận các chức năng còn thiếu so với quy trình vận hành thực tế.
- [x] Nâng project lên full-stack với xác thực, database và API typed.
- [x] Thiết kế schema cho tài sản, danh mục, phòng ban, người dùng, phiếu bàn giao, lịch sử và bảo trì.
- [x] Kết nối danh mục tài sản với dữ liệu database thật.
- [ ] Kết nối phiếu bàn giao, lịch sử người nhận, biên bản, chữ ký và PDF với database.
- [x] Lưu thông tin công ty vào database thay vì chỉ localStorage.
- [x] Triển khai module bảo trì và báo hỏng có trạng thái, người xử lý và chi phí.
- [x] Triển khai kiểm kê, chênh lệch và lịch sử kiểm kê.
- [x] Triển khai báo cáo/dashboard theo dữ liệu thật.
- [x] Thêm xác thực người dùng, vai trò và phân quyền thao tác.
- [ ] Thêm upload tài liệu/chứng từ và QR code thực tế.
- [x] Viết test nghiệp vụ, kiểm tra responsive và chuẩn bị phát hành.

## Production Readiness Follow-up

- [ ] Thêm giao diện quản lý bảo trì: gán người xử lý, cập nhật trạng thái, nhập chi phí ước tính/thực tế và đồng bộ DB/API.
- [ ] Thêm màn hình chi tiết kiểm kê: danh sách audit items, expected/actual, đánh dấu chênh lệch/mất tài sản và lịch sử kiểm kê.
- [ ] Bổ sung test CRUD/quyền hạn, kiểm tra responsive desktop/mobile cho module mới và lưu checkpoint cuối.

## Bug Fixes

- [x] Sửa company.get để luôn trả về null thay vì undefined khi chưa có bản ghi công ty.
- [x] Kiểm tra giao diện Cài đặt/Dashboard xử lý đúng trạng thái chưa có thông tin công ty.
- [x] Thêm test hồi quy cho company.get và kiểm tra build sau sửa lỗi.

## Employee Profile Menu

- [x] Thêm menu hồ sơ có thể mở từ nút dấu ba chấm của nhân viên.
- [x] Hiển thị họ tên, email, vai trò và thông tin tài khoản đang đăng nhập.
- [x] Kết nối nút đăng xuất với Manus OAuth và làm mới trạng thái giao diện.
- [x] Kiểm tra responsive, type-check, test, build và checkpoint.

## Employee Profile Menu Follow-up

- [x] Kiểm tra responsive desktop/mobile cho menu hồ sơ nhân viên và luồng mở/đóng menu.
- [x] Lưu checkpoint sau khi xác nhận menu hồ sơ và đăng xuất hoạt động ổn định.

## Employee Profile Menu Verification

- [x] Kiểm tra desktop và mobile cho menu hồ sơ, gồm trạng thái mở/đóng và thông tin tài khoản.
- [x] Lưu checkpoint mới sau khi xác nhận runtime menu hồ sơ và đăng xuất ổn định.

## Employee Administration

- [ ] Thêm dialog xác nhận trước khi thực hiện đăng xuất.
- [ ] Thêm API admin để liệt kê tài khoản và cập nhật role.
- [ ] Thêm trang Quản lý nhân viên có danh sách tài khoản, vai trò và thao tác đổi role.
- [ ] Bảo vệ trang/thao tác quản trị theo role admin.
- [ ] Thêm test quyền hạn, kiểm tra responsive, build và checkpoint.
