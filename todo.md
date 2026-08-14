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
- [x] Kết nối phiếu bàn giao, lịch sử người nhận, biên bản, chữ ký và PDF với database.
- [x] Lưu thông tin công ty vào database thay vì chỉ localStorage.
- [x] Triển khai module bảo trì và báo hỏng có trạng thái, người xử lý và chi phí.
- [x] Triển khai kiểm kê, chênh lệch và lịch sử kiểm kê.
- [x] Triển khai báo cáo/dashboard theo dữ liệu thật.
- [x] Thêm xác thực người dùng, vai trò và phân quyền thao tác.
- [x] Thêm upload tài liệu/chứng từ và QR code thực tế: chứng từ PDF/ảnh được lưu S3 với metadata database và phân quyền admin; QR theo mã tài sản có thể quét/tải PNG.
- [x] Gắn payload QR với định danh bền vững trong database (`qrToken`) và hỗ trợ nhận diện tài sản từ mã đã quét.
- [x] Thay thao tác “Quét mã QR” placeholder bằng luồng nhập/quét mã để mở đúng tài sản; đã xác minh runtime QR token và chứng từ S3 trên production, sau đó dọn dữ liệu QA.
- [x] Xác minh trực tiếp liên kết chứng từ S3 trên production: `/manus-storage/` chuyển hướng đến URL CloudFront có chữ ký; tệp QA tối thiểu không render được do nội dung thử không hợp lệ nhưng cơ chế truy cập S3 hoạt động đúng.
- [x] Viết test nghiệp vụ, kiểm tra responsive và chuẩn bị phát hành.

## Production Readiness Follow-up

- [x] Thêm giao diện quản lý bảo trì: gán người xử lý, cập nhật trạng thái, nhập chi phí ước tính/thực tế, kết quả xử lý, loading/error/empty state và đồng bộ DB/API.
- [x] Thêm màn hình chi tiết kiểm kê: danh sách audit items, expected/actual, đánh dấu chênh lệch/mất tài sản, ghi chú, lịch sử thời điểm kiểm kê và loading/error/empty state.
- [x] Bổ sung test CRUD/quyền hạn, kiểm tra responsive desktop/mobile cho module mới; 19 Vitest tests, TypeScript và production build đều thành công; checkpoint cuối sẽ lưu ngay sau khi rà soát todo.
- [x] Rà soát phạm vi test CRUD hồi quy: bao phủ tạo/cập nhật bảo trì, upload chứng từ có phân quyền, tạo đợt/thêm tài sản/ghi nhận chênh lệch kiểm kê; toàn bộ 20 Vitest tests thành công.
- [x] Lưu checkpoint phát hành cuối `38ecd031` sau khi hoàn tất toàn bộ todo; phiên bản gộp xác minh mobile luồng bàn giao, module vận hành, QR token và chứng từ S3 đã được phát hành.

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

- [x] Thêm dialog xác nhận trước khi thực hiện đăng xuất.
- [x] Thêm API admin để liệt kê tài khoản và cập nhật role.
- [x] Thêm trang Quản lý nhân viên có danh sách tài khoản, vai trò và thao tác đổi role.
- [x] Bảo vệ trang/thao tác quản trị theo role admin.
- [x] Thêm test quyền hạn, kiểm tra responsive, build và checkpoint.

## Employee Detail, Security & Filters

- [x] Thêm trạng thái khóa/vô hiệu hóa tài khoản và phòng ban cho hồ sơ nhân viên.
- [x] Thêm API admin xem chi tiết nhân viên cùng tài sản đang được cấp phát.
- [x] Thêm API khóa/mở khóa tài khoản, bảo đảm người dùng bị khóa không dùng được luồng bảo vệ.
- [x] Thêm tìm kiếm và lọc nhân viên theo phòng ban, vai trò, trạng thái tài khoản.
- [x] Thêm drawer hồ sơ nhân viên với danh sách tài sản đang được cấp phát.
- [x] Kiểm tra quyền hạn, responsive, TypeScript, test, build và checkpoint.

## Manual Department Assignment

- [x] Thêm thao tác admin gán hoặc đổi phòng ban thủ công cho từng nhân viên.

## Employee Asset History

- [x] Hiển thị trong hồ sơ nhân viên cả tài sản đang cấp phát và tài sản đã hoàn trả, kèm trạng thái và thời gian.

## Employee Detail Drawer

- [x] Hiển thị hồ sơ và lịch sử tài sản nhân viên trong drawer bên phải.

## Employee Drawer Detail Follow-up

- [x] Mở rộng lịch sử tài sản với mã, tên, trạng thái và mốc thời gian đầy đủ.
- [x] Hiển thị phòng ban, vai trò và trạng thái tài khoản trong drawer hồ sơ nhân viên.
- [x] Kiểm tra preview/runtime drawer sau khi bổ sung dữ liệu chi tiết.

## Employee Administration Completion

- [x] Thêm nút khóa/mở khóa có xác nhận trong drawer hồ sơ nhân viên.
- [x] Thêm bộ lọc trạng thái tài khoản trong danh sách nhân viên.
- [x] Thêm danh sách phòng ban và thao tác gán phòng ban thủ công từ drawer.
- [x] Bổ sung kiểm thử API quản trị nhân viên, kiểm tra desktop/mobile, build và checkpoint phát hành.

## Employee Administration Security Verification

- [x] Chặn tài khoản quản trị đã khóa khỏi mọi API quản trị và bổ sung kiểm thử hồi quy.
- [x] Xác minh runtime drawer quản lý nhân viên bằng phiên đăng nhập quản trị trên desktop và mobile.
- [x] Lưu checkpoint phát hành sau khi hoàn tất xác minh quyền và giao diện.

## Employee Mobile Drawer Verification

- [x] Mở Quản lý nhân viên và drawer hồ sơ trong viewport mobile bằng phiên quản trị; xác minh bộ lọc, badge, phòng ban, lịch sử và nút khóa/mở khóa.

## Handover Database Integration

- [x] Thay danh sách phiếu bàn giao mẫu bằng truy vấn database và trạng thái tải/rỗng/lỗi.
- [x] Lưu tạo phiếu bàn giao, người nhận, phòng ban, phụ kiện và ghi chú qua tRPC.
- [x] Cập nhật trạng thái phiếu, hoàn trả và chữ ký qua database; đồng bộ lịch sử người nhận.
- [x] Cập nhật biên bản/PDF dùng dữ liệu phiếu thực và thông tin công ty đã lưu.
- [x] Bổ sung kiểm thử, xác minh desktop/mobile và production build; checkpoint phát hành sẽ được lưu sau các hạng mục vận hành còn lại.
- [x] Xác minh đầu-cuối trên mobile: tạo phiếu, mở biên bản, ký, xác nhận cấp phát, hoàn trả, các trạng thái tải/rỗng/lỗi và dọn dẹp dữ liệu QA.
- [x] Xác minh trực tiếp các trạng thái tải và lỗi của danh sách phiếu cùng modal biên bản trong viewport mobile; banner lỗi và nút thử lại danh sách đã được kiểm tra bằng mô phỏng mất kết nối.
- [x] Lưu checkpoint phát hành sau khi hoàn tất toàn bộ xác minh mobile của luồng bàn giao; checkpoint cuối sẽ gộp toàn bộ hạng mục vận hành, QR và chứng từ đã xác minh.

## Handover Recipient Data Follow-up

- [x] Thêm trạng thái lỗi rõ ràng cho truy vấn danh sách và chi tiết phiếu bàn giao.
- [x] Chọn nhân viên/phòng ban thực khi tạo phiếu để lưu recipientUserId và recipientDepartmentId.
- [x] Xác minh lịch sử tài sản nhân viên phản ánh phiếu cấp phát và hoàn trả mới.
- [x] Kết nối modal chi tiết với truy vấn handovers.get, gồm trạng thái tải/lỗi và thao tác thử lại.
- [x] Dùng dữ liệu handovers.get làm nguồn hiển thị chính cho modal biên bản và chữ ký.
- [x] Làm mới lịch sử tài sản nhân viên sau khi tạo phiếu, lưu chữ ký, xác nhận và hoàn trả.
- [x] Tạo dữ liệu thử tối thiểu đã được xác nhận để kiểm tra cấp phát, hoàn trả và lịch sử nhân viên trên bản phát hành.
- [x] Dọn dẹp toàn bộ bản ghi thử nghiệm sau khi hoàn tất xác minh đầu-cuối.
- [x] Cho phép lập phiếu cho nhân viên chưa gán phòng ban, đồng thời lưu departmentId nullable đúng theo schema.
- [x] Làm mới dữ liệu chi tiết phiếu sau khi lưu chữ ký để nút xác nhận chuyển sang trạng thái cấp phát chính xác.
- [x] Xác minh trực tiếp sau khi lưu chữ ký rằng badge và nút hành động của modal chuyển sang trạng thái kế tiếp.
- [x] Đồng bộ trạng thái đã hoàn trả và thời gian hoàn trả vào lịch sử tài sản trong drawer nhân viên.
- [x] Xác minh trực tiếp trên mobile trạng thái loading, lỗi và thử lại của modal biên bản (`handovers.get`); đã kiểm tra modal tải, mô phỏng lỗi và nút thử lại khôi phục đúng, sau đó dọn dữ liệu QA.
- [x] Xác minh lại có kiểm soát trạng thái loading của modal biên bản (`handovers.get`) trên mobile bằng phản hồi làm chậm; màn hình “Đang tải chi tiết phiếu bàn giao...” hiển thị rõ ràng trước khi dữ liệu hoàn tất, sau đó đã dọn dữ liệu QA.

## Operational Reminders, Exports & Activity Log

- [x] Thêm nhắc việc trong giao diện cho bảo trì đến hạn/quá hạn và kiểm kê định kỳ sắp diễn ra.
- [x] Bổ sung hạn, chu kỳ định kỳ, dữ liệu thực và API phục vụ bảng nhắc việc.
- [x] Xuất báo cáo tài sản Excel theo từng phòng ban với các cột nghiệp vụ và bộ lọc phù hợp.
- [x] Thêm màn hình nhật ký hoạt động chi tiết với tìm kiếm và bộ lọc loại đối tượng/hành động.
- [x] Bổ sung kiểm thử CRUD/quyền hạn, xác minh bố cục desktop/mobile, production build và checkpoint phát hành; 21 Vitest tests, TypeScript và build đều thành công.
- [ ] Xác minh trực tiếp giao diện mới trên desktop và mobile: bảng nhắc việc, trường hạn/chu kỳ bảo trì & kiểm kê, khu vực xuất Excel và bảng nhật ký hoạt động.
- [ ] Xác minh runtime trên production rằng bundle mới hiển thị đúng các tính năng nhắc lịch/xuất Excel/nhật ký sau checkpoint phát hành.
