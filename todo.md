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
- [x] Xác minh giao diện mới: production desktop hiển thị bảng nhắc việc, trường hạn/chu kỳ bảo trì & kiểm kê, khu vực xuất Excel và bảng nhật ký; viewport mobile 375px thực hiển thị menu thu gọn và bố cục dashboard một cột đúng.
- [x] Xác minh runtime trên production: bundle `index-WTOhF7ib.js` chứa và hiển thị đúng các tính năng nhắc lịch/xuất Excel/nhật ký sau checkpoint `39a92bc8`.
- [x] Xác minh lại viewport 375px: sidebar ở trạng thái thu gọn khi menu mobile đóng; ảnh quan sát trước đó là kết quả của phiên DevTools khác với viewport ảnh chụp thực.
- [x] Xác minh trực tiếp trên mobile 375px các giao diện Bảo trì, Kiểm kê, Báo cáo: bảng nhắc việc, trường hạn/chu kỳ, khu vực xuất Excel và bảng nhật ký hiển thị đúng trong bố cục một cột.
- [x] Lưu bằng chứng trực quan mobile: sidebar được thu gọn thành nút menu, không che hoặc chiếm không gian nội dung ở viewport 375px.
- [x] Ghi nhận bằng chứng mobile 375px cho từng màn hình Bảo trì, Kiểm kê, Báo cáo và sidebar thu gọn trong `verification.md` trước checkpoint cuối.
- [x] Đính kèm xác minh mobile 375px có nội dung ảnh đọc được trực tiếp: Bảo trì hiển thị nhắc việc/hạn/chu kỳ; Kiểm kê hiển thị nhắc việc/ngày/chu kỳ; Báo cáo hiển thị Excel/nhật ký; sidebar thu gọn thành nút menu.
- [x] Xác nhận cuối các ảnh mobile 375px cho ba deep-link vận hành và trạng thái sidebar; đường dẫn ảnh và quan sát trực tiếp được ghi trong `verification.md`.
- [x] Xác minh độc lập lần cuối ba deep-link vận hành ở 375px và trạng thái sidebar đóng bằng ảnh mobile đã mở xem, cùng kiểm tra trực tiếp production cho Bảo trì, Kiểm kê và Báo cáo.

## Phòng Ban & Bộ Phận

- [x] Bổ sung mô hình Bộ Phận với quan hệ bắt buộc thuộc đúng một Phòng Ban và migration database tương ứng.
- [x] Thêm API Admin tạo, liệt kê và quản lý Phòng Ban/Bộ Phận với kiểm tra quyền hạn và tính toàn vẹn dữ liệu.
- [x] Xây dựng giao diện quản trị Phòng Ban & Bộ Phận, trong đó tạo Bộ Phận yêu cầu chọn Phòng Ban.
- [x] Thêm kiểm thử quan hệ Bộ Phận–Phòng Ban, phân quyền Admin và xác minh responsive trước phát hành; 23 Vitest tests, TypeScript và build đều thành công.
- [x] Thêm trạng thái lỗi và thao tác thử lại khi không tải được danh sách Phòng Ban hoặc Bộ Phận.
- [x] Lưu xác minh trực quan desktop và mobile 375px cho form chọn Phòng Ban bắt buộc và bố cục trang cơ cấu trong `verification.md`.

## Nhân sự theo Bộ Phận & Bộ lọc báo cáo

- [x] Mở rộng dữ liệu nhân viên với Bộ Phận, bảo đảm Bộ Phận được gán thuộc đúng Phòng Ban của nhân viên.
- [x] Thêm API Admin cập nhật Bộ Phận nhân viên và chỉnh sửa/vô hiệu hóa Phòng Ban hoặc Bộ Phận, kèm kiểm tra ràng buộc dữ liệu.
- [x] Cập nhật trang Quản lý nhân sự để lọc và gán nhân viên theo Phòng Ban/Bộ Phận.
- [x] Cập nhật trang Phòng Ban & Bộ Phận để chỉnh sửa thông tin, vô hiệu hóa đơn vị và phản ánh trạng thái hoạt động.
- [x] Thêm bộ lọc Phòng Ban và Bộ Phận cho Báo cáo tài sản, bao gồm thống kê và xuất Excel theo phạm vi lọc.
- [x] Bổ sung test phân quyền/ràng buộc, xác minh responsive và phát hành checkpoint; 25 Vitest tests, TypeScript và production build thành công.

## Biểu đồ giá trị tài sản theo Bộ Phận

- [x] Tổng hợp giá trị tài sản thực theo Bộ Phận của người đang giữ tài sản, tương thích bộ lọc cơ cấu hiện có.
- [x] Hiển thị biểu đồ donut trực quan phân bổ giá trị tài sản theo Bộ Phận, có chú giải, tỷ trọng và trạng thái không có dữ liệu.
- [x] Kiểm thử dữ liệu, responsive desktop/mobile, build và phát hành checkpoint; 25 Vitest tests, TypeScript và production build thành công.

## Dữ liệu mẫu thiết bị và nhân sự

- [x] Rà soát dữ liệu hiện có và tạo các mã định danh mẫu không trùng lặp (`DEMO-*`).
- [x] Tạo 10 tài sản thiết bị mẫu và 10 nhân sự mẫu có email `@company.com`.
- [x] Kiểm tra số lượng và quan hệ dữ liệu: 3 Phòng Ban, 4 Bộ Phận, 10 nhân sự và 10 tài sản mẫu được tạo hợp lệ.

## Phiếu cấp phát & lịch sử bảo trì tài sản

- [x] Rà soát và mở rộng luồng tạo phiếu bàn giao khi cấp phát thiết bị cho nhân viên.
- [x] Bổ sung thao tác in phiếu bàn giao từ dữ liệu phiếu thực, với định dạng in phù hợp và phương án tải PDF khi cửa sổ in bị chặn.
- [x] Hiển thị lịch sử bảo trì theo từng tài sản và tạo yêu cầu sửa chữa trực tiếp từ hồ sơ tài sản.
- [x] Kiểm thử phân quyền, dữ liệu, responsive và phát hành checkpoint; 26 Vitest tests, TypeScript và production build thành công.
- [x] Điều chỉnh form tạo yêu cầu Bảo trì để không tràn ngang ở desktop và mobile khi đủ trường lịch định kỳ.

## Tách Tổng quan & Danh mục tài sản

- [x] Tách điều hướng và trạng thái hiển thị cho trang Tổng quan và Danh mục tài sản.
- [x] Thiết kế lại trang Tổng quan với KPI điều hành, phân bổ tài sản và các công việc cần theo dõi.
- [x] Xây dựng trang Danh mục tài sản độc lập cho tìm kiếm, lọc, thao tác QR, chỉnh sửa và hồ sơ tài sản.
- [x] Kiểm thử deep-link, responsive desktop/mobile và phát hành checkpoint; 26 Vitest tests, TypeScript và production build thành công.
- [x] Thay thông báo kiểm kê cố định trên Tổng quan bằng dữ liệu số lượng tài sản thực và điều hướng đến Kiểm kê.

## Phân trang Danh mục tài sản

- [x] Thêm trạng thái trang và kích thước trang cho Danh mục tài sản.
- [x] Đồng bộ phân trang với tìm kiếm/bộ lọc, tự quay về trang đầu khi tiêu chí thay đổi.
- [x] Hiển thị điều khiển chuyển trang, phạm vi bản ghi và trạng thái vô hiệu hóa phù hợp desktop/mobile.
- [x] Kiểm thử hành vi phân trang, TypeScript, build và phát hành checkpoint; 26 Vitest tests, TypeScript và production build thành công.
- [x] Loại bỏ thông tin số lượng trùng lặp giữa bảng danh mục và thanh phân trang trên mobile.

## Chuyển nhanh theo số trang

- [x] Thêm ô nhập số trang vào thanh phân trang Danh mục tài sản.
- [x] Kiểm tra giới hạn trang và hỗ trợ Enter/nút xác nhận để chuyển trang nhanh.
- [x] Kiểm thử responsive, TypeScript, build và phát hành checkpoint; 26 Vitest tests, TypeScript và production build thành công.

## Nhà cung cấp, Hãng & kích thước trang

- [x] Cập nhật dropdown kích thước trang với 10, 20 và 50 tài sản mỗi trang.
- [x] Bổ sung mô hình dữ liệu, migration và API Admin cho Nhà cung cấp và Hãng.
- [x] Tích hợp danh sách chọn Nhà cung cấp/Hãng vào form tạo và chỉnh sửa tài sản.
- [x] Thêm luồng tạo nhanh Nhà cung cấp hoặc Hãng khi chưa có trong danh sách.
- [x] Kiểm thử phân quyền, liên kết dữ liệu, responsive, TypeScript, build và phát hành checkpoint; 27 Vitest tests, TypeScript và production build thành công.

## Quản trị Nhà cung cấp/Hãng, bộ lọc & báo cáo

- [x] Bổ sung API Admin chỉnh sửa và vô hiệu hóa Nhà cung cấp/Hãng với kiểm tra dữ liệu liên kết.
- [x] Xây dựng trang quản lý riêng cho Nhà cung cấp và Hãng trong điều hướng quản trị.
- [x] Thêm bộ lọc Nhà cung cấp và Hãng cho Danh mục tài sản.
- [x] Hiển thị Nhà cung cấp/Hãng trong hồ sơ chi tiết tài sản và dữ liệu danh mục.
- [x] Bổ sung biểu đồ phân bổ giá trị tài sản theo Hãng trên trang Báo cáo.
- [x] Kiểm thử phân quyền, lọc, biểu đồ, responsive, TypeScript, build và phát hành checkpoint; 28 Vitest tests, TypeScript và production build thành công.

## Tài liệu Nhà cung cấp

- [x] Bổ sung mô hình tài liệu Nhà cung cấp, migration và metadata tệp lưu S3.
- [x] Thêm API Admin tải lên, liệt kê và quản lý tài liệu hợp đồng/báo giá theo Nhà cung cấp.
- [x] Hiển thị hồ sơ Nhà cung cấp với khu vực tải lên, xem, tải xuống và gỡ tài liệu đính kèm.
- [x] Kiểm thử phân quyền, loại tệp, metadata, responsive, TypeScript, build và phát hành checkpoint; 28 Vitest tests, TypeScript và production build thành công.

## Sửa lỗi thêm nhanh Nhà cung cấp/Hãng

- [x] Khắc phục mất focus khi nhập tên trong biểu mẫu thêm nhanh Nhà cung cấp hoặc Hãng của tài sản.
- [x] Kiểm thử luồng nhập nhiều ký tự bằng trạng thái ref không tái dựng ô nhập; luồng lưu vẫn tự chọn dữ liệu vừa tạo và giữ bố cục desktop/mobile.
- [x] Chạy TypeScript, hồi quy, build và phát hành checkpoint sửa lỗi; 28 Vitest tests, TypeScript và production build thành công.

## Hoàn thiện phân trang & chọn Nhà cung cấp/Hãng

- [x] Sửa thanh phân trang để không che dòng tài sản cuối cùng trong Danh mục.
- [x] Thêm nút Hủy cho luồng thêm nhanh Nhà cung cấp và Hãng.
- [x] Thêm nút X xóa nhanh cho các ô tìm kiếm có nội dung.
- [x] Thay dropdown Nhà cung cấp/Hãng trong biểu mẫu tài sản bằng điều khiển có tìm kiếm.
- [x] Kiểm thử tương tác, responsive, TypeScript, build và phát hành checkpoint.

## Tìm kiếm không dấu & tạo danh mục từ kết quả rỗng

- [x] Chuẩn hóa tìm kiếm không dấu cho các ô tra cứu tiếng Việt trong ứng dụng.
- [x] Bổ sung tạo Nhà cung cấp/Hãng ngay từ trạng thái tìm kiếm rỗng trong biểu mẫu tài sản.
- [x] Thêm kiểm thử hồi quy, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Sửa preview & in phiếu bàn giao

- [x] Rà soát luồng tạo preview, mở bản in và xuất PDF của phiếu bàn giao.
- [x] Khắc phục lỗi nội dung tiếng Việt, logo và bố cục phiếu hiển thị thiếu hoặc sai.
- [x] Xác minh preview/in/xuất với dữ liệu phiếu thực; chạy hồi quy và phát hành checkpoint.

## Dashboard theo vai trò Admin & User

- [x] Rà soát xác thực hiện có, trạng thái tài khoản và dữ liệu tài sản theo người dùng.
- [x] Thêm cổng đăng nhập làm màn hình đầu tiên khi chưa có phiên đăng nhập.
- [x] Điều hướng Admin vào dashboard quản trị và chặn User truy cập các màn hình quản trị.
- [x] Xây dựng dashboard User với hồ sơ cá nhân và danh sách tài sản đang giữ.
- [x] Thêm kiểm thử phân quyền, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Thời hạn & yêu cầu hoàn trả tài sản

- [x] Rà soát dữ liệu bàn giao, trạng thái hoàn trả và luồng Admin xử lý hiện có.
- [x] Hiển thị ngày nhận và hạn dự kiến hoàn trả trên từng tài sản của User.
- [x] Cho phép User gửi yêu cầu hoàn trả; Admin nhận diện và xử lý yêu cầu trong Bàn giao.
- [x] Thêm kiểm thử phân quyền, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Hoàn thiện trạng thái & lịch sử hoàn trả

- [x] Rà soát dữ liệu yêu cầu hoàn trả và giao diện Admin/User hiện có.
- [x] Hiển thị rõ trạng thái yêu cầu và lịch sử tài sản đã trả trên dashboard User.
- [x] Cho phép Admin ghi chú tình trạng thực tế khi duyệt hoàn trả.
- [x] Thêm kiểm thử luồng, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Ảnh tình trạng & thông báo hoàn trả

- [x] Rà soát dữ liệu hoàn trả, tải tệp S3 và thông báo hiện có.
- [x] Cho phép Admin tải ảnh tình trạng thực tế khi duyệt hoàn trả và lưu tham chiếu an toàn.
- [x] Hiển thị thông báo trực quan khi User có quyết định hoàn trả mới.
- [x] Thêm kiểm thử tải ảnh/phân quyền, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Dropdown có tìm kiếm & email hoàn trả

- [x] Đưa tìm kiếm vào trực tiếp trong dropdown Nhà cung cấp/Hãng.
- [x] Tạm hoãn email quyết định hoàn trả đến khi có dịch vụ email và API key phù hợp.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint cho dropdown có tìm kiếm.

## Tìm kiếm Nhân viên nhận khi bàn giao

- [x] Rà soát trường chọn Nhân viên nhận trong form bàn giao.
- [x] Thay dropdown Nhân viên nhận bằng danh sách có tìm kiếm tiếng Việt không dấu.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Thao tác Danh mục tài sản

- [x] Hiển thị mô tả chức năng khi hover/focus từng icon thao tác tài sản.
- [x] Mở modal tạo phiếu bàn giao ngay tại Danh mục với tài sản đã chọn sẵn.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Xác nhận trước khi tạo phiếu bàn giao

- [x] Rà soát dữ liệu và các điểm tạo phiếu bàn giao hiện có.
- [x] Thêm hộp thoại xác nhận tóm tắt thông tin trước khi lưu phiếu.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Đồng bộ người giữ theo trạng thái tài sản

- [x] Rà soát form chỉnh sửa và quy tắc trạng thái/Người–Phòng giữ.
- [x] Tự xóa người giữ, gán nhãn và khóa trường phù hợp khi tài sản Sẵn có hoặc Bảo trì.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Bàn giao tự động & lý do bảo trì

- [x] Rà soát luồng đổi trạng thái và dữ liệu bảo trì của tài sản.
- [x] Tự động mở modal bàn giao khi chọn trạng thái Đang cấp phát.
- [x] Bắt buộc nhập và lưu lý do bảo trì khi chọn trạng thái Bảo trì.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Theo dõi lý do & tài sản bảo trì

- [x] Rà soát dữ liệu lý do bảo trì và bộ lọc Danh mục hiện có.
- [x] Hiển thị rõ lý do bảo trì trong hồ sơ chi tiết tài sản.
- [x] Bổ sung bộ lọc nhanh cho các tài sản đang Bảo trì/sửa chữa.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Xuất Excel tài sản bảo trì

- [x] Rà soát định dạng báo cáo Excel và nguồn dữ liệu bảo trì.
- [x] Tạo hàm xuất tệp Excel chỉ gồm tài sản đang Bảo trì.
- [x] Thêm nút xuất báo cáo trong Danh mục tài sản.
- [x] Thêm kiểm thử, xác minh responsive, TypeScript, build và phát hành checkpoint.

## Nhãn hover cho icon thao tác

- [x] Rà soát icon thao tác trong Bàn giao & Cấp phát và các màn hình quản trị.
- [x] Bổ sung nhãn hover/focus mô tả rõ từng thao tác còn thiếu.
- [x] Thêm kiểm thử, xác minh giao diện desktop/mobile, TypeScript, build và phát hành checkpoint.

## Template & import Excel tài sản

- [x] Rà soát mô hình dữ liệu tài sản và các quy tắc phân quyền import.
- [x] Tạo template Excel chuẩn và kiểm tra từng dòng dữ liệu import.
- [x] Bổ sung API Admin lưu hàng loạt các tài sản hợp lệ vào database.
- [x] Thêm giao diện tải template, tải tệp Excel và xem kết quả import.
- [x] Thêm kiểm thử, xác minh desktop/mobile, TypeScript, build và phát hành checkpoint.

## Nâng cấp import Excel tài sản

- [x] Rà soát luồng import, quy tắc cập nhật theo mã và dữ liệu lỗi hiện có.
- [x] Bổ sung API hỗ trợ tạo mới hoặc cập nhật tài sản theo mã đã tồn tại.
- [x] Hiển thị tiến trình đọc/xử lý tệp và xuất Excel các dòng lỗi.
- [x] Thêm kiểm thử, xác minh desktop/mobile, TypeScript, build và phát hành checkpoint.

## Xem trước import Excel

- [x] Rà soát modal import và dữ liệu xem trước hiện có.
- [x] Hiển thị bảng xem trước đầy đủ, gồm hành động dự kiến theo từng dòng.
- [x] Thêm kiểm thử, xác minh giao diện và phát hành checkpoint.

## Chỉnh sửa và xác nhận import

- [x] Rà soát luồng xem trước, dữ liệu chỉnh sửa và điểm xác nhận import.
- [x] Cho phép chỉnh sửa trực tiếp dữ liệu trong bảng xem trước.
- [x] Thêm hộp thoại xác nhận hai bước khi có cập nhật hàng loạt.
- [x] Thêm kiểm thử, xác minh giao diện và phát hành checkpoint.

## Hoàn tác import & lịch sử thay đổi

- [x] Rà soát dữ liệu import và mô hình nhật ký tài sản hiện có.
- [x] Thêm schema cho phiên import và lịch sử thay đổi theo trường.
- [x] Triển khai API import, hoàn tác import gần nhất và truy vấn lịch sử.
- [x] Bổ sung giao diện hoàn tác và lịch sử thay đổi trong hồ sơ tài sản.
- [x] Thêm kiểm thử, xác minh giao diện, migration, build và phát hành checkpoint.

## Sửa lỗi API phiên import gần nhất

- [x] Rà soát phản hồi rỗng của API latestImport.
- [x] Chuẩn hóa giá trị null và thêm kiểm thử hồi quy.
- [x] Xác minh dashboard, build và phát hành checkpoint.

## Thời hạn hoàn tác import

- [x] Rà soát quy tắc thời hạn hoàn tác 24 giờ.
- [x] Chặn API hoàn tác khi phiên import đã quá hạn.
- [x] Hiển thị thời điểm hết hạn và trạng thái khóa trên giao diện.
- [x] Thêm kiểm thử, xác minh build và phát hành checkpoint.

## Cảnh báo sắp hết hạn hoàn tác

- [x] Rà soát dữ liệu thời hạn hoàn tác hiện có.
- [x] Hiển thị cảnh báo rõ ràng khi còn ít thời gian hoàn tác.
- [x] Thêm kiểm thử, xác minh build và phát hành checkpoint.

## Cài đặt thương hiệu công ty

- [x] Rà soát dữ liệu công ty, giao diện cài đặt và luồng lưu logo hiện có.
- [x] Mở rộng API lưu logo và tiêu đề website.
- [x] Bổ sung giao diện thay đổi logo, tiêu đề và áp dụng toàn trang.
- [x] Thêm kiểm thử, xác minh tải tệp, TypeScript, build và phát hành checkpoint.

## Nhận diện thương hiệu mở rộng

- [x] Rà soát dữ liệu thương hiệu, cài đặt logo và áp dụng giao diện hiện có.
- [x] Mở rộng lưu màu chủ đạo và favicon trong dữ liệu công ty.
- [x] Thêm chọn màu, cắt logo và cấu hình favicon trong cài đặt.
- [x] Áp dụng nhận diện thương hiệu toàn giao diện.
- [x] Thêm kiểm thử, xác minh TypeScript, build và phát hành checkpoint.

## Sửa header trang Tổng quan

- [x] Rà soát header, dữ liệu người dùng và hành vi thông báo.
- [x] Bỏ ô tìm kiếm trên Tổng quan và sửa tương tác thông báo, hồ sơ.
- [x] Thêm kiểm thử, xác minh desktop/mobile, build và phát hành checkpoint.

## Thông báo và menu avatar header

- [x] Rà soát cấu trúc header và nguyên nhân hiển thị thừa ở chuông.
- [x] Thêm bảng thông báo chi tiết khi nhấp chuông.
- [x] Thêm menu avatar với trang cá nhân và đăng xuất.
- [x] Kiểm thử tương tác header, build và phát hành checkpoint.

## Đánh dấu thông báo đã đọc

- [x] Rà soát trạng thái bảng thông báo hiện có.
- [x] Thêm thao tác đánh dấu tất cả là đã đọc và cập nhật trạng thái hiển thị.
- [x] Kiểm thử tương tác thông báo, build và phát hành checkpoint.

## Hoàn thiện trải nghiệm chuông thông báo

- [x] Rà soát và loại bỏ tooltip thừa hiển thị phía trên chuông thông báo.
- [x] Hiển thị danh sách thông báo riêng lẻ, hỗ trợ đánh dấu đọc từng thông báo.
- [x] Thêm hiệu ứng hoạt ảnh phù hợp cho chuông khi có thông báo chưa đọc.
- [x] Kiểm thử hiển thị desktop/mobile, build và phát hành checkpoint.

## Điều hướng từ thông báo

- [x] Rà soát đích điều hướng đến hồ sơ tài sản và phiếu bàn giao hiện có.
- [x] Gắn liên kết trực tiếp từ từng thông báo đến bản ghi liên quan.
- [x] Kiểm thử điều hướng, build và phát hành checkpoint.

## Mở rộng thông báo và tùy chọn nhận tin

- [x] Rà soát nguồn dữ liệu yêu cầu hoàn trả, mốc thời gian và tooltip người dùng.
- [x] Hiển thị thông báo yêu cầu hoàn trả đang chờ duyệt cùng thời gian phát sinh.
- [x] Lưu tùy chọn bật/tắt từng loại thông báo của người dùng.
- [x] Loại bỏ hoặc điều chỉnh tooltip bị che khuất ở khu vực thông tin người dùng.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Thông báo kết quả hoàn trả

- [x] Rà soát dữ liệu duyệt/từ chối yêu cầu hoàn trả hiện có.
- [x] Hiển thị thông báo kết quả duyệt hoặc từ chối cho người dùng liên quan.
- [x] Kiểm thử điều hướng, TypeScript, build và phát hành checkpoint.

## Giải trình hoàn trả bị từ chối

- [x] Rà soát dữ liệu từ chối, phản hồi và banner kết quả hiện có.
- [x] Cho phép nhân viên gửi phản hồi hoặc giải trình khi yêu cầu hoàn trả bị từ chối.
- [x] Thêm nút Đã xem để ẩn banner kết quả sau khi đọc.
- [x] Kiểm thử quyền hạn, TypeScript, build và phát hành checkpoint.

## Chuẩn hóa hộp thoại trong ứng dụng

- [x] Rà soát mọi lệnh alert, confirm và prompt trong giao diện.
- [x] Thay thế hộp thoại mặc định bằng modal hoặc toast nội bộ.
- [x] Kiểm thử luồng duyệt hoàn trả, TypeScript, build và phát hành checkpoint.

## Cải thiện modal và lịch sử hoàn trả

- [x] Rà soát các modal, dữ liệu quyết định hoàn trả và trường tiêu đề website.
- [x] Cho phép đóng modal bằng phím Esc hoặc click ngoài vùng nội dung.
- [x] Hiển thị lịch sử quyết định duyệt hoặc từ chối trong chi tiết phiếu.
- [x] Sửa hiển thị bất thường trong trường tiêu đề website.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Tinh gọn thao tác thông báo

- [x] Rà soát các nút tùy chọn, đánh dấu đã đọc và mở phiếu trong bảng thông báo.
- [x] Thay các thao tác phù hợp bằng biểu tượng có tooltip hover/focus.
- [x] Điều chỉnh cỡ chữ và bố cục để các thao tác từng thông báo nằm cùng một hàng.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Huy hiệu số thông báo chưa đọc

- [x] Rà soát trạng thái chưa đọc và bố cục biểu tượng chuông.
- [x] Hiển thị huy hiệu số lượng chưa đọc trên biểu tượng chuông.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Đóng popup và modal khi click ngoài

- [x] Rà soát toàn bộ popup, menu hồ sơ và modal trong ứng dụng.
- [x] Bổ sung đóng khi click ngoài vùng nội dung, trừ lúc đang xử lý thao tác.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Chuẩn hóa chuyển động và phím tắt cửa sổ

- [x] Rà soát popup, modal, drawer và luồng import/hoàn tác cần xác nhận khi đóng.
- [x] Chuẩn hóa hiệu ứng mở/đóng cho popup, modal và drawer.
- [x] Bổ sung phím Esc để đóng nhanh toàn bộ popup, modal và drawer.
- [x] Xác nhận trước khi đóng modal import hoặc hoàn tác có nguy cơ mất dữ liệu.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Hiệu ứng đóng và cảnh báo thay đổi chưa lưu

- [x] Rà soát popup, modal, drawer và các form có trạng thái chỉnh sửa.
- [x] Thêm hiệu ứng thoát đồng bộ cho popup, modal và drawer.
- [x] Cảnh báo xác nhận khi đóng form còn thay đổi chưa lưu.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Sửa tooltip và click ngoài bảng thông báo

- [x] Rà soát lớp tooltip và sự kiện click ngoài của bảng thông báo.
- [x] Đưa tooltip ra khỏi vùng bị cắt và bảo đảm bảng đóng khi click ngoài.
- [x] Kiểm thử desktop/mobile, TypeScript, build và phát hành checkpoint.

## Khung cuộn và tooltip của modal

- [x] Rà soát toàn bộ modal, drawer và popover có vùng nội dung cuộn.
- [x] Ngăn thanh cuộn hoặc nội dung tràn ra ngoài khung modal trên desktop/mobile.
- [x] Đảm bảo tooltip thao tác hiển thị trên lớp modal, không bị cắt hoặc che khuất.
- [x] Bổ sung kiểm thử hồi quy, xác minh giao diện và phát hành checkpoint.

## Tinh chỉnh vị trí tooltip thao tác

- [x] Rà soát lỗi tooltip che nội dung trong bảng thao tác bàn giao.
- [x] Điều chỉnh khoảng cách và hướng hiển thị tooltip theo vùng trống thực tế.
- [x] Bổ sung kiểm thử hồi quy, xác minh giao diện và phát hành checkpoint.

## Độ trễ hover và tooltip mobile

- [x] Thêm độ trễ ngắn trước khi hiển thị tooltip icon trên desktop.
- [x] Tối ưu hành vi tooltip và vùng chạm icon cho màn hình thiết bị di động.
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint.

## Huy hiệu Bảo trì & Báo hỏng

- [x] Rà soát nguồn dữ liệu và loại bỏ số huy hiệu cố định.
- [x] Hiển thị huy hiệu theo số lượng bảo trì thực tế, tự ẩn khi bằng 0.
- [x] Bổ sung kiểm thử hồi quy, xác minh giao diện và phát hành checkpoint.

## Huy hiệu yêu cầu bảo trì mới

- [x] Rà soát trạng thái yêu cầu bảo trì mới và mức độ khẩn cấp hiện có.
- [x] Hiển thị huy hiệu riêng với số lượng và màu theo mức khẩn cấp cao nhất.
- [x] Bổ sung kiểm thử nghiệp vụ, xác minh giao diện và phát hành checkpoint.

## Phân loại và mã tài sản tự động

- [x] Rà soát form tạo/sửa tài sản, ngày mua và mô hình danh mục hiện có.
- [x] Lưu phân loại tài sản do Admin quản lý, gồm tên và tiền tố mã duy nhất.
- [x] Tự sinh mã theo tiền tố phân loại, đồng thời hỗ trợ thêm, sửa và xóa phân loại.
- [x] Thêm chọn ngày trực quan trong form và đồng bộ dữ liệu ngày mua.
- [x] Bổ sung kiểm thử quyền hạn, giao diện responsive và phát hành checkpoint.

## Import tài sản theo Phân loại

- [x] Rà soát template Excel và quy tắc xác thực Mã tài sản hiện tại.
- [x] Bỏ yêu cầu nhập Mã tài sản, yêu cầu Phân loại và tự sinh mã theo tiền tố.
- [x] Cập nhật xem trước, thông báo lỗi và template tải xuống.
- [x] Bổ sung kiểm thử import, hồi quy và phát hành checkpoint.

## Ổn định biểu mẫu tài sản

- [x] Loại bỏ biểu tượng lịch dư và giữ một cách chọn ngày rõ ràng.
- [x] Ngăn vùng tạo Phân loại mới bị render lại làm mất focus khi nhập liệu.
- [x] Chỉ hỏi xác nhận đóng form khi thực sự có thay đổi chưa lưu.
- [x] Bổ sung kiểm thử hồi quy biểu mẫu và phát hành checkpoint.

## Nhãn thao tác Bộ phận

- [x] Rà soát icon thao tác Bộ phận và nhãn hover của Phòng Ban.
- [x] Thêm nhãn hover/focus cho các icon chỉnh sửa và trạng thái Bộ phận.
- [x] Bổ sung kiểm thử hồi quy và phát hành checkpoint.

## Chuẩn hóa nhãn hủy và thao tác nhân sự

- [x] Rà soát nhãn hiển thị của tất cả nút hủy trên toàn hệ thống.
- [x] Bổ sung tooltip/focus label cho icon thao tác trong Quản lý nhân sự.
- [x] Loại bỏ icon tìm kiếm bị hiển thị chồng thừa trong tìm kiếm nhân sự.
- [x] Bổ sung kiểm thử hồi quy và phát hành checkpoint.

## Drawer và phân trang Phân loại

- [x] Rà soát tất cả drawer và nút đóng còn lại để áp dụng nhãn, kích thước, hover/focus thống nhất.
- [x] Phân trang danh sách Phân loại 5 mục mỗi trang.
- [x] Giữ chiều cao vùng danh sách Phân loại ổn định và đồng nhất với khung thêm mới.
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint.

## Sidebar responsive theo chiều cao

- [x] Rà soát cấu trúc sidebar và các vùng gây tràn trên màn hình dọc.
- [x] Tách vùng điều hướng cuộn, giữ header và hồ sơ người dùng trong bố cục phù hợp.
- [x] Kiểm thử viewport chiều cao hạn chế, hồi quy và phát hành checkpoint.

## Tìm kiếm Phân loại

- [x] Rà soát chọn Phân loại trong form tạo/sửa tài sản và danh sách quản trị.
- [x] Thêm danh sách Phân loại có tìm kiếm theo tên hoặc tiền tố trong form tài sản.
- [x] Thêm ô tìm kiếm và phân trang tương thích trong danh sách Phân loại.
- [x] Bổ sung kiểm thử tìm kiếm, responsive và phát hành checkpoint.

## Lịch mua và số lượng tài sản Phân loại

- [x] Rà soát trường Ngày mua và nguồn dữ liệu số lượng tài sản theo Phân loại.
- [x] Thêm icon lịch có thể nhấp để mở chọn ngày trong form tài sản.
- [x] Hiển thị số lượng tài sản thực tế trên từng Phân loại trong danh sách quản trị.
- [x] Bổ sung kiểm thử giao diện, dữ liệu và phát hành checkpoint.

## Trạng thái và an toàn Phân loại

- [x] Đưa nút xóa nội dung về đúng bên trong ô tìm kiếm Phân loại.
- [x] Hiển thị tooltip chi tiết số tài sản theo trạng thái trên huy hiệu Phân loại.
- [x] Thêm xác nhận trước khi vô hiệu hóa hoặc xóa Phân loại đang có tài sản gắn liền.
- [x] Bổ sung kiểm thử giao diện, dữ liệu và phát hành checkpoint.

## Current Session — Maintenance & Asset Categories

- [x] Rà soát và sửa toàn bộ luồng tạo/cập nhật trạng thái Bảo trì/Báo hỏng từ Danh mục tài sản và trang Bảo trì
- [x] Khôi phục thông báo bảo trì cho Admin và thống kê bảo trì trên Tổng quan
- [x] Cho phép chuyển hàng loạt tài sản sang Phân loại đích ngay trong hộp thoại xóa Phân loại
- [x] Xuất báo cáo Excel danh sách Phân loại kèm tổng số, Đang sử dụng, Hỏng và Bảo trì
- [x] Bổ sung bộ lọc Phân loại theo trạng thái hoạt động và số lượng tài sản
- [x] Bổ sung kiểm thử Vitest cho các luồng bảo trì và Phân loại mới

## Current Session — Excel Export UX

- [x] Thêm trạng thái tải khi tạo file Excel và khóa nút xuất trong lúc xử lý
- [x] Hiển thị thông báo thành công hoặc lỗi rõ ràng sau khi xuất Excel
- [x] Bổ sung kiểm thử hồi quy cho trạng thái xuất Excel và xác minh responsive

## Current Session — Asset Status Date Validation

- [x] Chuẩn hóa purchaseDate để giá trị rỗng/không hợp lệ gửi null thay vì NaN khi cập nhật tài sản
- [x] Bổ sung kiểm thử hồi quy cho cập nhật trạng thái tài sản không có ngày mua
- [x] Xác minh TypeScript, Vitest, build và thao tác cập nhật trạng thái trên giao diện

## Current Session — Asset Date & Status History

- [x] Hiển thị lịch sử thay đổi ngày mua và trạng thái trong drawer chi tiết tài sản
- [x] Chuẩn hóa hạn bảo hành và các trường ngày khi tạo/cập nhật tài sản
- [x] Chuẩn hóa hạn hoàn trả trong luồng bàn giao để giá trị rỗng/không hợp lệ gửi null
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint

## Current Session — Warranty & Maintenance Date Rules

- [x] Thêm trường Hạn bảo hành dạng chọn ngày vào form thêm mới và chỉnh sửa tài sản
- [x] Giữ nguyên Ngày mua khi chuyển từ Bảo trì sang Sẵn có và khóa trường ngày mua trong trường hợp này
- [x] Chỉ ghi nhận thời điểm cập nhật báo hỏng/bảo trì, không ghi đè Ngày mua
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint

## Current Session — Supplier Return & Warranty Filters

- [x] Thêm trạng thái Trả nhà cung cấp vào form chỉnh sửa và dữ liệu tài sản
- [x] Khóa Ngày mua vĩnh viễn sau khi tài sản được tạo hoặc import
- [x] Hiển thị cảnh báo màu/icon cho tài sản sắp hết hạn hoặc hết hạn bảo hành
- [x] Bổ sung bộ lọc tài sản đang bảo hành hoặc đã hết hạn
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint

## Current Session — Supplier Return Details & Report

- [x] Thêm cột Ngày trả nhà cung cấp vào schema và migration database
- [x] Thêm cột Lý do trả nhà cung cấp vào schema và migration database
- [x] Thêm trường ngày trả và lý do trả vào form chỉnh sửa/chi tiết tài sản
- [x] Tạo báo cáo riêng cho tài sản trạng thái Trả nhà cung cấp
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint

## Current Session — Supplier Return Confirmation & Attachments

- [x] Sửa icon calendar để mở được bộ chọn Ngày mua trong form thêm tài sản
- [x] Thêm hộp thoại xác nhận chi tiết trước khi chuyển tài sản sang Trả nhà cung cấp
- [x] Thêm upload hình ảnh hoặc biên bản xác nhận khi chuyển sang Trả nhà cung cấp
- [x] Lưu metadata/tệp đính kèm trả NCC vào database và storage an toàn
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive và phát hành checkpoint

## Current Session — Returned Vendor Assets & Evidence Preview

- [x] Loại tài sản Trả nhà cung cấp khỏi tổng số tài sản tồn của công ty và các thống kê tồn liên quan, bao gồm Báo cáo tài sản
- [x] Hiển thị lịch sử quyết định trả NCC và các tệp đã tải lên trong chi tiết tài sản
- [x] Thêm xem trước hình ảnh/PDF trong dialog xác nhận trả NCC
- [x] Bổ sung kiểm thử hồi quy, xác minh TypeScript, responsive và production build

## Current Session — Supplier Return Excel & Calendar Icon Consistency

- [x] Kiểm tra và hoàn thiện nút xuất Excel riêng cho báo cáo tài sản đã trả nhà cung cấp; báo cáo dùng file `assetmaster-tai-san-tra-nha-cung-cap.xlsx`.
- [x] Chuẩn hóa toàn bộ icon lịch thành màu xanh, loại bỏ icon lịch hệ thống màu đen bị chồng lên.
- [x] Bổ sung kiểm thử hồi quy, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Searchable Dropdowns Across the App

- [x] Rà soát toàn bộ dropdown dữ liệu; ưu tiên các bộ lọc tài sản, báo cáo, nhân sự, cơ cấu tổ chức và hồ sơ Nhà cung cấp.
- [x] Chuẩn hóa các dropdown nghiệp vụ chính thành ô tìm kiếm trong menu xổ xuống, hỗ trợ tiếng Việt không dấu, trạng thái rỗng và xóa nhanh.
- [x] Bổ sung kiểm thử hợp đồng, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Remaining Dropdowns & Search Highlight

- [x] Rà soát các dropdown còn lại trong form Bảo trì, Import và Bàn giao.
- [x] Áp dụng SearchableSelect cho toàn bộ dropdown đã xác định trong Bảo trì, Import, Bàn giao và các luồng Kiểm kê liên quan.
- [x] Highlight từ khóa tìm kiếm trong danh sách kết quả của dropdown, kể cả truy vấn tiếng Việt không dấu.
- [x] Bổ sung kiểm thử, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Vendor/Brand Pagination & Dropdown Accessibility

- [x] Thêm ô tìm kiếm riêng cho danh sách Nhà cung cấp và Hãng.
- [x] Phân trang Nhà cung cấp và Hãng, mỗi trang 5 dòng.
- [x] Tự động focus và cuộn đến khung hồ sơ khi mở hồ sơ Nhà cung cấp.
- [x] Bổ sung nút X xóa nhanh, điều hướng mũi tên/Enter và thông báo không tìm thấy kết quả cho SearchableSelect.
- [x] Bổ sung kiểm thử, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Vietnamese Currency Formatting & Balanced Vendor/Brand Layout

- [x] Chuẩn hóa hiển thị số tiền sang VNĐ, bỏ phần thập phân .00 và dùng dấu chấm phân cách hàng nghìn/triệu/tỷ.
- [x] Cân chiều cao hai khu vực Nhà cung cấp và Hãng, giữ phân trang 5 dòng/trang và bố cục ổn định khi dữ liệu ít.
- [x] Bổ sung kiểm thử, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Supplier/Brand Value Reports & Compact Currency

- [x] Thêm tổng giá trị tài sản theo từng Nhà cung cấp trong Báo cáo.
- [x] Thêm tổng giá trị tài sản theo từng Hãng trong Báo cáo.
- [x] Thêm tùy chọn hiển thị tiền đầy đủ, triệu đồng hoặc tỷ đồng.
- [x] Bổ sung kiểm thử, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Fixed Vendor/Brand Pagination Bar

- [x] Đồng bộ phân trang Nhà cung cấp và Hãng theo mẫu Danh sách Phân loại.
- [x] Giữ thanh phân trang cố định ở đáy vùng danh sách, dùng icon ‹ › và hiển thị Trang x/y · tổng mục.
- [x] Bổ sung kiểm thử chuyển trang, tìm kiếm, trạng thái đầu/cuối, responsive và production build.

## Current Session — Correct VND Input Parsing & Formatting

- [x] Sửa diễn giải giá trị VNĐ để không tự nhân thêm hai số 0 khi lưu.
- [x] Hiển thị dấu chấm phân cách hàng nghìn trực tiếp trong trường nhập giá trị nguyên giá.
- [x] Bổ sung kiểm thử nhập, chỉnh sửa, hiển thị và export giá trị VNĐ.

## Current Session — Scrollbars & Currency Input Polish

- [x] Tùy biến thanh cuộn (scrollbar) cho phù hợp với giao diện AssetMaster.
- [x] Hỗ trợ dán trực tiếp số tiền có chứa ký hiệu ₫ hoặc VNĐ vào ô nhập liệu mà không bị lỗi.
- [x] Thêm hậu tố VNĐ trực tiếp vào bên trong ô nhập giá trị nguyên giá.
- [x] Bổ sung kiểm thử nhập, dán, cuộn, responsive và production build.

## Current Session — Currency Words, Clear Action & Maintenance/Report Inputs

- [x] Hiển thị số tiền bằng chữ dưới trường Giá trị nguyên giá.
- [x] Thêm nút X xóa nhanh cho các trường nhập tiền.
- [x] Áp dụng hậu tố VNĐ và hỗ trợ dán tiền cho chi phí bảo trì; giá trị báo cáo tiếp tục dùng formatter VNĐ/compact thống nhất.
- [x] Bổ sung kiểm thử nhập, dán, xóa, chuyển đổi bằng chữ, responsive và production build.

## Current Session — Maintenance Cost in Words

- [x] Hiển thị số tiền bằng chữ dưới Chi phí dự kiến trong form Bảo trì.
- [x] Hiển thị số tiền bằng chữ dưới Chi phí thực tế trong form Bảo trì.
- [x] Bổ sung kiểm thử, xác minh responsive, TypeScript, Vitest và production build.

## Current Session — Vendor/Brand Search Layout & Maintenance Cost Export

- [x] Đưa ô tìm kiếm Nhà cung cấp và Hãng lên cùng hàng với tiêu đề/danh sách tương ứng.
- [x] Thêm xuất Excel chi phí bảo trì, gồm chi phí dự kiến, chi phí thực tế và số tiền bằng chữ.
- [x] Bổ sung kiểm thử dữ liệu, responsive, TypeScript, Vitest và production build.

## Current Session — Full-width Vendor Documents & Excel Export Feedback

- [x] Mở rộng Hồ sơ tài liệu Nhà cung cấp full-width như các phiên bản trước.
- [x] Thêm loading và toast trạng thái cho luồng xuất Excel chi phí bảo trì.
- [x] Bổ sung kiểm thử giao diện, TypeScript, Vitest và production build.

## Current Session — Currency Input Layout & Formatting Fixes

- [x] Sửa nút X của CurrencyInput không bị rơi xuống dòng và giữ đúng vị trí trong ô nhập.
- [x] Hiển thị số tiền bằng chữ ngay dưới ô nhập với font nhỏ, màu nhạt và khoảng cách gọn.
- [x] Tự động thêm dấu chấm phân cách hàng nghìn khi nhập số tiền, ví dụ 16000 thành 16.000.
- [x] Áp dụng và kiểm tra chuẩn hóa cho tất cả các trường nhập giá tiền.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build và xác minh giao diện.

## Current Session — Handover Filter, Mobile Currency & Excel Feedback

- [x] Sửa lỗi dropdown bộ lọc trong danh sách phiếu bàn giao không làm vỡ khung và không bị che/tràn trên desktop/mobile.
- [x] Tối ưu CurrencyInput trên mobile để tự bật bàn phím số khi focus ô tiền.
- [x] Áp dụng loading/toast cho các luồng xuất Excel còn lại trong Báo cáo, Tài sản và Phân loại.
- [x] Kiểm tra các bảng có cuộn ngang trên viewport mobile và sửa overflow/responsive nếu cần.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build và xác minh giao diện.

## Current Session — Currency Alignment, Mobile Tables & Import Error Export

- [x] Căn giữa dọc nút Xóa và hậu tố VNĐ trong CurrencyInput.
- [x] Thêm chỉ báo “Vuốt ngang để xem thêm” cho bảng dữ liệu trên màn hình mobile.
- [x] Cố định cột đầu tiên của các bảng dữ liệu khi cuộn ngang trên mobile.
- [x] Thêm loading và toast cho nút xuất file lỗi trong modal Import Excel.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build và xác minh mobile.

## Current Session — Handover Dropdown Overflow Fix

- [x] Cho dropdown trạng thái tự neo sang trái khi trigger ở gần mép phải viewport.
- [x] Giới hạn chiều rộng dropdown và ngăn thanh cuộn ngang ngoài ý muốn ở khung phiếu bàn giao.
- [x] Bổ sung hồi quy, kiểm thử responsive, chạy TypeScript, Vitest, production build và phát hành.

## Current Session — Mobile Tables, Smart Menus & Overflow Audit

- [x] Thêm gradient gợi ý ở mép bảng còn có thể vuốt ngang trên mobile.
- [x] Bổ sung tùy chọn ẩn/hiện cột trên mobile cho bảng có nhiều trường.
- [x] Áp dụng định vị thông minh theo chiều ngang và chiều dọc cho menu/popup dùng chung.
- [x] Rà soát toàn bộ giao diện mobile, khắc phục overflow ngang ngoài ý muốn.
- [x] Bổ sung hồi quy, kiểm thử mobile, chạy TypeScript, Vitest, production build và phát hành.

## Current Session — Dropdown Animation & Column Reset

- [x] Thêm animation mở/đóng mượt mà, ngắn và tôn trọng reduced-motion cho dropdown.
- [x] Thêm nút Khôi phục mặc định trong menu Cột để hiện lại toàn bộ cột và xóa trạng thái đã lưu.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build và phát hành.

## Current Session — Modal & Drawer Animation

- [x] Đồng bộ animation mở/đóng cho toàn bộ modal và drawer tự dựng.
- [x] Chuẩn hóa animation cho component Dialog, AlertDialog, Sheet và Drawer dùng chung.
- [x] Bổ sung hỗ trợ reduced-motion, hồi quy, TypeScript, Vitest, production build và phát hành.

## Current Session — Modal Loading & Empty Motion

- [x] Rà soát các trạng thái loading và empty bên trong modal/drawer.
- [x] Thêm animation dùng chung cho loading và empty state, có reduced-motion.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build và phát hành.

## Current Session — Empty Illustrations, Modal Skeletons & Motion Preference

- [x] Thiết kế và tích hợp empty illustration riêng cho Bảo trì, Bàn giao và Kiểm kê.
- [x] Thêm skeleton loading cho các bảng dữ liệu lớn trong modal.
- [x] Bổ sung công tắc bật/tắt hiệu ứng chuyển động trong Cài đặt giao diện.
- [x] Bổ sung hồi quy, chạy TypeScript, Vitest, production build, kiểm tra responsive và phát hành.

## Current Session — Maintenance Pagination, Year Filter & Closed Lock

- [x] Thêm phân trang cho danh sách quản lý bảo trì/báo hỏng.
- [x] Thêm bộ lọc theo năm cho phiếu bảo trì.
- [x] Khóa toàn bộ trường và thao tác cập nhật khi trạng thái là Đã đóng ở frontend và backend.
- [x] Chuẩn hóa mã phiếu theo dạng BT-(năm)-001 và reset bộ đếm theo từng năm.
- [x] Bổ sung migration/schema cần thiết, hồi quy, TypeScript, Vitest, production build và phát hành.

## Current Session — Maintenance History, Dropdown Downward & Asset Filters

- [x] Thêm nhật ký lịch sử thay đổi chi tiết cho từng phiếu bảo trì.
- [x] Sửa SearchableSelect luôn mở menu xuống dưới, tự neo trái/phải theo vị trí bộ lọc.
- [x] Sắp xếp lại cụm bộ lọc Danh mục tài sản gọn và cân đối như phiên bản trước.
- [x] Bổ sung hồi quy, kiểm thử responsive, TypeScript, Vitest, production build và phát hành.

## Current Session — Dropdown Consistency & History Pagination
- [x] Rà soát và đồng bộ các dropdown native/select và SearchableSelect theo cùng chuẩn giao diện.
- [x] Bổ sung phân trang hoặc tải thêm cho danh sách lịch sử thay đổi của phiếu bảo trì.
- [x] Bổ sung hồi quy, kiểm thử responsive, TypeScript, Vitest, production build và phát hành.

## Dropdown Consistency & History Pagination

- [x] Chuyển bộ lọc năm trong Quản lý bảo trì sang SearchableSelect, giữ tìm kiếm và định vị dropdown nhất quán.
- [x] Thêm phân trang 10 bản ghi/trang cho drawer lịch sử thay đổi từng phiếu bảo trì.
- [x] Kiểm thử TypeScript, Vitest, production build và rà soát responsive cho dropdown/drawer.
- [x] Lưu checkpoint phát hành sau khi hoàn tất xác minh phiên hiện tại.


## Current Session — Maintenance Cost Field Display Fix

- [x] Kiểm tra nguyên nhân ô Chi phí dự kiến/thực tế hiển thị chỉ còn hậu tố VNĐ trong bảng bảo trì.
- [x] Sửa bố cục CurrencyInput trong bảng bảo trì, giữ định dạng tiền Việt Nam và khả năng chỉnh sửa hợp lệ.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive desktop/mobile.
- [x] Lưu checkpoint phát hành cho bản sửa lỗi.

## Current Session — Asset Drawer & Branded Calendar

- [x] Sửa phần mô tả bị che hoặc cắt trong drawer Chi tiết tài sản.
- [x] Thay lịch chọn ngày của trình duyệt bằng lịch AssetMaster đồng bộ giao diện và thao tác bàn phím.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive desktop/mobile.
- [x] Lưu checkpoint phát hành cho bản cập nhật giao diện.

## Current Session — Asset History, Category Dropdown & Calendar Quick Navigation

- [x] Phân trang lịch sử thay đổi tài sản theo 10 dòng/trang, có tổng số và điều hướng.
- [x] Đồng bộ bộ lọc native tại Danh sách Phân loại bằng SearchableSelect.
- [x] Thêm chọn nhanh tháng/năm trong lịch AssetMaster.
- [x] Cập nhật hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset Drawer Header & History Load More

- [x] Giữ mô tả “Thông tin định danh và vòng đời của tài sản” trên một dòng trong header drawer khi có thể.
- [x] Bổ sung nút “Tải thêm” cho lịch sử thay đổi tài sản, giữ phân trang hiện tại.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset History Collapse, Infinite Load & Detail Header

- [x] Thêm nút thu gọn/mở rộng danh sách lịch sử thay đổi đã tải.
- [x] Tự động tải thêm lịch sử khi cuộn đến gần cuối drawer.
- [x] Đưa mô tả và thông tin định danh tài sản về bố cục phía trên giống form chỉnh sửa.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Compact AssetMaster Calendar

- [x] Thu nhỏ popover lịch, ô ngày và khoảng cách hiển thị trên mobile.
- [x] Giữ nguyên bộ chọn nhanh tháng/năm và khả năng thao tác rõ ràng.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Favicon & Company Logo Documents

- [x] Sửa việc favicon không cập nhật sau khi người dùng upload ảnh.
- [x] Đưa logo công ty đã cài đặt vào header các file văn bản khi in hoặc xuất.
- [x] Bổ sung hồi quy cho favicon và logo tài liệu; kiểm thử TypeScript, Vitest, production build.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Compact Calendar, Logo Formats & Reusable Skill

- [x] Thu nhỏ lịch thực tế hơn trên mobile, không chỉ giảm nhẹ kích thước.
- [x] Kiểm tra và chuẩn hóa hiển thị logo PNG, JPG, WebP, bao gồm nền trong suốt.
- [x] Tạo và xác thực kỹ năng tái sử dụng theo hướng dẫn Skill Creator.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho ứng dụng và bàn giao kỹ năng.

## Current Session — Vendor & Brand Dropdown Consistency

- [x] Rà soát và xác định các dropdown Hãng/Nhà cung cấp đang lệch chuẩn.
- [x] Đồng bộ chúng với SearchableSelect chung, gồm tìm kiếm, highlight, bàn phím, xóa nhanh và định vị responsive.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset Form Dropdown React Refactor

- [x] Chuyển dropdown Hãng/Nhà cung cấp từ DOM thủ công sang component React dùng chung.
- [x] Chuyển dropdown Trạng thái trong form tài sản sang SearchableSelect đồng bộ.
- [x] Bổ sung icon tìm kiếm và nút xóa nhanh trong vùng tìm kiếm dropdown.
- [x] Giữ luồng tạo nhanh Hãng/Nhà cung cấp và cập nhật trạng thái tài sản.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Category Dropdown React Refactor

- [x] Chuyển dropdown Phân loại trong form tài sản sang SearchableSelect React.
- [x] Giữ tìm kiếm, highlight, phím tắt, nút xóa nhanh và luồng tạo Phân loại mới.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Category Empty Action & Asset Form Layout

- [x] Thêm nút tạo Phân loại mới ngay trong dropdown khi tìm kiếm không có kết quả.
- [x] Đưa Phân loại nằm ngang Mã tài sản và sắp xếp lại đầu form để không có hàng trống thừa.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Purchase Date & Maintenance Reason Regression

- [x] Nạp và hiển thị ngày mua đã lưu từ cơ sở dữ liệu khi mở form chỉnh sửa tài sản.
- [x] Khôi phục ô nội dung bảo trì bắt buộc khi chọn trạng thái Bảo trì.
- [x] Đảm bảo validation, reset trạng thái và lưu dữ liệu đúng logic cũ.
- [x] Kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Maintenance Asset Sync

- [x] Hiển thị các tài sản đang ở trạng thái Bảo trì trong danh mục Bảo trì/Báo hỏng.
- [x] Thêm nút tạo yêu cầu bảo trì nhanh từ từng tài sản đang Bảo trì.
- [x] Đồng bộ trạng thái, lý do bảo trì và chống tạo trùng yêu cầu đang mở.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Category Filter Icon

- [x] Xóa icon bộ lọc thừa ở bên trái dropdown trạng thái trong Danh sách Phân loại.
- [x] Căn chỉnh lại khoảng cách và giữ nguyên chức năng lọc.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Maintenance Queue UX

- [x] Sau khi tạo nhanh yêu cầu bảo trì thành công, loại tài sản đó khỏi danh sách tài sản đang chờ tạo yêu cầu.
- [x] Thêm vùng cuộn ngang cho danh sách tài sản cần bảo trì khi số lượng vượt chiều rộng màn hình.
- [x] Kiểm thử hồi quy, TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Maintenance Detail & Handover Numbering

- [x] Thêm nút “Mở phiếu vừa tạo” sau khi tạo nhanh yêu cầu bảo trì thành công.
- [x] Khi bấm nút, mở đúng chi tiết phiếu bảo trì vừa tạo trong giao diện hiện tại.
- [x] Chuẩn hóa mã phiếu bàn giao theo cấu trúc BG-(năm)-001.
- [x] Đảm bảo bộ đếm mã bàn giao quay lại 001 khi sang năm mới và tăng tuần tự trong cùng năm.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Handover Year Filter

- [x] Thêm bộ lọc theo năm trong Danh sách phiếu bàn giao.
- [x] Lấy năm từ mã phiếu BG hoặc ngày bàn giao và đồng bộ với tìm kiếm/phân trang hiện có.
- [x] Hiển thị trạng thái không có kết quả phù hợp khi lọc theo năm.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Handover Pagination, Concurrency & Export

- [x] Ổn định popup bộ lọc năm, loại bỏ hiện tượng chớp và thanh cuộn ngang tạm thời khi mở.
- [x] Thêm phân trang danh sách phiếu bàn giao, 10 phiếu mỗi trang, điều hướng bằng mũi tên <>.
- [x] Giữ bộ lọc năm/trạng thái và tìm kiếm đồng bộ với phân trang.
- [x] Thêm cơ chế chống trùng mã BG khi nhiều người dùng tạo phiếu đồng thời.
- [x] Thêm xuất Excel danh sách phiếu bàn giao theo năm đang chọn.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Supplier Return & Handover Filters

- [x] Khi trạng thái tài sản là Trả nhà cung cấp, tự đặt Người/Phòng giữ thành Đã trả NCC.
- [x] Khóa trường Người/Phòng giữ để không thể chỉnh sửa khi tài sản Trả nhà cung cấp.
- [x] Thêm bộ lọc theo Phòng ban trong Danh sách phiếu bàn giao.
- [x] Thêm bộ lọc theo Người nhận trong Danh sách phiếu bàn giao.
- [x] Đồng bộ các bộ lọc mới với tìm kiếm, năm, trạng thái và phân trang.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Handover Summary Statistics

- [x] Thống kê tổng số phiếu bàn giao theo từng phòng ban.
- [x] Thống kê tổng số phiếu bàn giao theo từng người nhận.
- [x] Hiển thị thống kê trong bố cục responsive, đồng bộ phong cách trang Bàn giao.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Supplier Return Save Hang

- [x] Xác định nguyên nhân nút Lưu thay đổi bị treo khi tài sản ở trạng thái Trả nhà cung cấp.
- [x] Sửa lớp hiển thị của hộp thoại xác nhận/thông báo để không bị ẩn sau form chỉnh sửa.
- [x] Bảo đảm trạng thái loading, thành công và lỗi của luồng Trả NCC kết thúc đúng cách.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset Catalog Filter Spacing

- [x] Thu gọn khoảng cách giữa ô tìm kiếm và các bộ lọc Danh mục tài sản.
- [x] Chuẩn hóa grid để các bộ lọc phân bố sát nhau, cân đối trên desktop.
- [x] Bảo đảm bố cục không tràn ngang và vẫn dễ thao tác trên mobile.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Supplier Return Dialog Centering

- [x] Căn giữa overlay và hộp thoại xác nhận Trả nhà cung cấp theo cả chiều ngang và dọc.
- [x] Bảo đảm hộp thoại không bị lệch hoặc tràn trên màn hình nhỏ.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Modal Motion & Category Count Tooltip

- [x] Thêm hiệu ứng fade-in/fade-out khi mở và đóng hộp thoại xác nhận Trả nhà cung cấp.
- [x] Cho phép đóng hộp thoại khi click ra vùng nền tối hoặc nhấn phím Escape.
- [x] Sửa tooltip số lượng tài sản theo trạng thái trong Danh sách Phân loại để hiển thị đầy đủ, không bị cắt.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset Edit Modal Freeze

- [x] Xác định hộp thoại xuất hiện thoáng và nguyên nhân làm form chỉnh sửa tài sản bị treo.
- [x] Sửa lifecycle, focus và trạng thái đóng/mở của modal chỉnh sửa và hộp thoại liên quan.
- [x] Bảo đảm toàn bộ tài sản có thể mở, chỉnh sửa, đóng và lưu ổn định.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Category Tooltip & Asset Save Loading

- [x] Loại bỏ tooltip trùng khi hover vào huy hiệu số lượng tài sản trong Danh sách Phân loại.
- [x] Giữ một tooltip đầy đủ, dễ đọc và có hỗ trợ truy cập cho huy hiệu số lượng.
- [x] Hiển thị loading rõ ràng, khóa nút phù hợp khi lưu thay đổi tài sản.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Supplier Return Dialog Viewport Centering

- [x] Xác định vì sao hộp thoại Trả nhà cung cấp đang căn theo vùng trái thay vì toàn bộ viewport.
- [x] Cố định hộp thoại tại đúng tâm viewport theo chiều ngang và dọc, không bị ảnh hưởng bởi modal nền.
- [x] Giữ hiệu ứng mở/đóng và khả năng click nền tối/Escape hoạt động ổn định.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Confirm Dialog Mobile Centering & Blur

- [x] Kiểm tra căn giữa hộp thoại xác nhận tại viewport mobile.
- [x] Áp dụng cơ chế căn giữa viewport nhất quán cho tất cả AlertDialog xác nhận.
- [x] Thêm backdrop blur phù hợp cho overlay hộp thoại xác nhận.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Touch-friendly Confirm Actions & Unified Blur

- [x] Tăng kích thước vùng chạm và khoảng cách nút trong hộp thoại xác nhận trên mobile.
- [x] Áp dụng backdrop blur đồng nhất cho overlay của drawer và popup quan trọng.
- [x] Giữ hiệu ứng mở/đóng, click ngoài vùng và Escape hoạt động ổn định.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Restore Asset Edit History

- [x] Xác định nguyên nhân vùng Lịch sử thay đổi không còn hiển thị trong drawer chi tiết tài sản.
- [x] Khôi phục danh sách lịch sử, trạng thái tải/rỗng/lỗi và hành vi tải thêm hiện có.
- [x] Xác minh truy vấn dữ liệu lịch sử theo đúng tài sản đang xem.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Asset History Count Badge

- [x] Hiển thị tổng số thay đổi thực tế trên nút Lịch sử thay đổi trong chi tiết tài sản.
- [x] Đồng bộ huy hiệu với trạng thái tải và cập nhật dữ liệu lịch sử theo tài sản đang xem.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Latest Asset Update Summary
- [x] Rà soát dữ liệu thời điểm cập nhật và vị trí header chi tiết tài sản.
- [x] Hiển thị thông tin “Lần cập nhật gần nhất” theo dữ liệu thực tế, có trạng thái tải/rỗng phù hợp.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Latest Update Actor Tooltip

- [x] Rà soát lịch sử tài sản để xác định người thực hiện thay đổi gần nhất.
- [x] Hiển thị tooltip có tên người thực hiện khi rê chuột hoặc focus vào mốc cập nhật.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Concise Latest Update Tooltip

- [x] Rà soát và rút gọn nội dung tooltip người thực hiện.
- [x] Hiển thị nhãn ngắn gọn “Người thực hiện: [Tên]”.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest và production build.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit Session Detail Experience

- [x] Rà soát màn hình Kiểm kê, dữ liệu đợt kiểm kê và cấu trúc điều hướng hiện tại.
- [x] Thu gọn danh sách đợt kiểm kê, nhường không gian cho phần thao tác chi tiết.
- [x] Tạo trang chi tiết riêng cho từng đợt kiểm kê, có lối vào từ danh sách đợt.
- [x] Chuẩn hóa Expected, Actual, available và các nhãn liên quan sang tiếng Việt.
- [x] Tối ưu vùng chọn tài sản và dropdown Thực tế để không bị thiếu không gian.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit QR, Exports & Status Filter

- [x] Rà soát dữ liệu QR, luồng kiểm kê và bản ghi chênh lệch hiện có.
- [x] Bổ sung bộ lọc trạng thái đợt kiểm kê.
- [x] Bổ sung luồng quét/nhập QR liên tiếp để thêm hoặc ghi nhận nhiều tài sản trong đợt.
- [x] Xuất biên bản chênh lệch theo đợt kiểm kê ra Excel và PDF.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit Detail Dropdown Visibility

- [x] Rà soát overflow và lớp hiển thị của vùng chi tiết Kiểm kê.
- [x] Bảo đảm dropdown chọn tài sản, Trạng thái thực tế và Kết quả không bị cắt.
- [x] Giữ vùng chọn tài sản gọn, rõ ràng và responsive.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit Fieldwork Export & Dropdown Layer

- [x] Rà soát nguyên nhân dropdown portal vẫn bị che ở cấp hiển thị toàn cục.
- [x] Bảo đảm dropdown Kiểm kê hiển thị trên cùng ở desktop và mobile.
- [x] Xuất danh sách tài sản theo đợt kiểm kê sang Excel có cột hiện trạng thực tế và ghi chú.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Compact Audit Asset Picker

- [x] Rà soát bố cục vùng chọn tài sản kiểm kê hiện tại.
- [x] Thu gọn chiều ngang ô chọn tài sản.
- [x] Đưa nút “Danh sách kiểm kê” cùng hàng, đặt sau nút “Thêm tài sản”.
- [x] Kiểm thử responsive, hồi quy và phát hành checkpoint.

## Current Session — Audit Total Asset Export

- [x] Rà soát cấu trúc xuất tổng tài sản hiện có và dữ liệu kiểm kê theo đợt.
- [x] Thêm nút Xuất tổng tài sản cạnh nút Danh sách kiểm kê.
- [x] Bổ sung cột Trạng thái thực tế và Kết quả kiểm kê vào file Excel tổng tài sản.
- [x] Kiểm thử hồi quy, responsive và phát hành checkpoint.

## Current Session — Audit Fieldwork Import, Filters & Scoped Export

- [x] Rà soát định dạng Excel kiểm kê thực địa, dữ liệu tài sản, Phòng ban và Phân loại.
- [x] Thêm bộ lọc theo kết quả kiểm kê trên danh sách chi tiết đợt.
- [x] Thêm bộ lọc Phòng ban và Phân loại cho xuất tổng tài sản.
- [x] Nhập Excel kiểm kê, kiểm tra dữ liệu và cập nhật kết quả hàng loạt có phản hồi rõ ràng.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit Finalization & Excel Import History

- [x] Rà soát trạng thái đợt kiểm kê và nhật ký hoạt động nhập Excel hiện có.
- [x] Thêm thao tác chốt biên bản và khóa toàn bộ chỉnh sửa kết quả kiểm kê.
- [x] Hiển thị lịch sử các lần nhập Excel theo đợt, gồm thời gian, người thực hiện và số dòng cập nhật.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Finalized Audit PDF Minutes

- [x] Rà soát dữ liệu đợt kiểm kê đã chốt và tiện ích PDF tiếng Việt hiện có.
- [x] Tạo mẫu biên bản kiểm kê PDF có tổng hợp kết quả, danh sách chênh lệch và khu vực ký xác nhận.
- [x] Chỉ hiển thị hành động xuất biên bản khi đợt kiểm kê đã chốt.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.

## Current Session — Audit Branding, Pagination & Yearly Reference Codes

- [x] Đổi mã đợt kiểm kê sang `KK-YYYY-NN`, tự reset số thứ tự theo năm hiện tại.
- [x] Thêm logo và thông tin công ty từ Cài đặt vào biên bản kiểm kê PDF.
- [x] Thêm số trang trên mọi trang của biên bản kiểm kê PDF.
- [x] Cập nhật hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành cho phiên này.
- [x] Xác nhận trạng thái hoạt động và báo cáo kết quả cho người dùng.

## Current Session — Branded Export Files

- [x] Lập danh mục tất cả luồng xuất PDF, Excel và mẫu/tệp lỗi có thể tải xuống.
- [x] Tạo helper dùng chung chèn thông tin công ty và trang giới thiệu cho workbook Excel.
- [x] Áp dụng logo và thông tin công ty từ Cài đặt cho mọi PDF và workbook Excel hiện có.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và xác minh file xuất.
- [x] Lưu checkpoint phát hành và báo cáo phạm vi cập nhật.

## Current Session — Export Preview & PDF Watermark

- [x] Rà soát tất cả luồng xuất PDF/Excel và xác định điểm tích hợp preview.
- [x] Xây dựng modal preview dùng chung cho PDF và Excel trước khi tải.
- [x] Thêm tùy chọn watermark logo công ty cho toàn bộ PDF xuất.
- [x] Tích hợp preview vào các thao tác xuất file có trên giao diện.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và xác minh giao diện.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Filtered Audit Selection & Round-trip Import

- [x] Tạm ẩn nút “Xuất tổng tài sản” khỏi form chi tiết Kiểm kê.
- [x] Thiết kế bộ lọc Phòng ban/Phân loại/Tất cả và chọn nhanh tài sản vào danh sách kiểm kê.
- [x] Xuất Excel đúng danh sách tài sản đã chọn, kèm lựa chọn hợp lệ cho Trạng thái thực tế và Kết quả.
- [x] Chuẩn hóa import để cập nhật đúng các dòng trong file kiểm kê đã xuất.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit Excel Repair & Review Tools

- [x] Chẩn đoán và sửa workbook Excel không hợp lệ khiến Microsoft Excel phải repair XML.
- [x] Kiểm chứng file Danh sách kiểm kê mở bình thường, vẫn có danh sách giá trị hợp lệ để import.
- [x] Thêm thống kê tóm tắt sau import: khớp, chênh lệch và không tìm thấy/thất lạc.
- [x] Thêm tìm kiếm và lọc trạng thái cho danh sách tài sản đã chọn trước khi xuất.
- [x] Làm nổi bật các dòng chênh lệch hoặc không tìm thấy bằng màu và biểu tượng cảnh báo.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit Import Change Preview & Notes

- [x] Hiển thị bảng preview chi tiết từng thay đổi dự kiến trước khi cập nhật từ Excel.
- [x] Yêu cầu xác nhận rõ ràng trước khi thực hiện import ghi đè kết quả Kiểm kê.
- [x] Thêm ghi chú nhanh trực tiếp cho tài sản Chênh lệch hoặc Không tìm thấy.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Bulk Notes in Audit Import Preview

- [x] Thêm chọn nhiều hoặc chọn tất cả tài sản trong bảng preview import Kiểm kê.
- [x] Thêm ghi chú xử lý chung và áp dụng hàng loạt cho các tài sản đã chọn.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit Preview Cleanup & Draft Deletion

- [x] Thêm nút xóa nhanh lựa chọn và làm sạch ghi chú sau khi áp dụng hàng loạt.
- [x] Xuất Excel danh sách preview kèm ghi chú trước khi import.
- [x] Cho phép xóa tài sản khỏi đợt Kiểm kê chưa chốt có xác nhận.
- [x] Cho phép xóa toàn bộ đợt Kiểm kê khi còn trạng thái nháp có xác nhận.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit Toolbar & Preview Workbook Colors

- [x] Đưa nút nhập cạnh “Danh sách kiểm kê” và đổi nhãn thành “Nhập file đã kiểm kê”.
- [x] Sửa vị trí icon kính lúp trong ô tìm kiếm, không che placeholder.
- [x] Xác nhận rõ thao tác “Xóa khỏi đợt” và giữ an toàn dữ liệu tài sản gốc.
- [x] Tô màu dòng trong Excel preview theo kết quả/trạng thái tài sản.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit List Feedback, Summary & Pagination

- [x] Hiển thị toast thành công sau import Excel và xóa tài sản khỏi đợt.
- [x] Chuyển màu nền dòng tiêu đề Excel fieldwork sang xám nhạt, giữ chữ đọc rõ.
- [x] Sửa triệt để icon tìm kiếm bị đè trong ô lọc danh sách Kiểm kê.
- [x] Thêm hàng thống kê Khớp, Chênh lệch, Thất lạc phía trên bảng Kiểm kê.
- [x] Thêm phân trang 10 tài sản/trang với điều hướng mũi tên trái/phải.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Asset List Filtered Excel Export

- [x] Rà soát các bộ lọc và dữ liệu hiển thị trong Danh mục tài sản.
- [x] Thêm nút xuất Excel cho đúng danh sách tài sản sau khi áp dụng bộ lọc.
- [x] Hiển thị trạng thái đang xuất, thành công và không có dữ liệu phù hợp.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Exclude Supplier-Returned Assets from Audits

- [x] Rà soát nguồn tài sản và các điểm chọn/thêm/xuất trong Kiểm kê.
- [x] Loại trừ tài sản Trả nhà cung cấp khỏi danh sách đủ điều kiện cho đợt Kiểm kê đang mở.
- [x] Giữ nguyên dữ liệu và hồ sơ Kiểm kê đã chốt.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Audit Stats Simplification & Preview Pagination

- [x] Tinh gọn hai khối thống kê Kiểm kê thành một hàng kết quả duy nhất, tránh lặp số liệu.
- [x] Bổ sung phân trang cho bảng preview import Excel, 10 dòng/trang.
- [x] Bổ sung phân trang cho các bảng preview dữ liệu export/Excel, 10 dòng/trang nếu có thể xem trước trên giao diện.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Asset Toolbar Button Layout Fix

- [x] Phân tích bố cục nhóm nút hành động bị vỡ trong Danh mục tài sản.
- [x] Chuẩn hóa chiều rộng, nhãn và breakpoint responsive cho các nút toolbar.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Reports Filter Toolbar Consistency

- [x] Phân tích bố cục Phạm vi thống kê và bộ lọc Báo cáo bị lệch chuẩn.
- [x] Chuẩn hóa nhóm bộ lọc, nút đặt lại và breakpoint responsive theo toolbar hiện tại.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Remove Handover Recipient Summary

- [x] Rà soát vùng thống kê Phiếu theo người nhận và dữ liệu liên quan.
- [x] Loại bỏ vùng Phiếu theo người nhận, giữ vùng Phiếu theo phòng ban cân đối.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Reports Activity Log Usability

- [x] Rà soát icon tìm kiếm, dữ liệu và bộ lọc Nhật ký hoạt động.
- [x] Việt hóa bộ lọc loại hoạt động và sửa icon tìm kiếm trong ô lọc.
- [x] Thêm phân trang cùng lựa chọn 10, 20 hoặc 50 dòng mỗi trang.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Role-Based Help Center

- [x] Rà soát điều hướng Trợ giúp, trang User và điểm nhận biết vai trò hiện có.
- [x] Viết nội dung hướng dẫn sử dụng đầy đủ cho Admin theo các nhóm chức năng.
- [x] Viết nội dung hướng dẫn riêng cho User và thêm nút truy cập trên trang User.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và trải nghiệm desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Editable and Searchable Help Center

- [x] Rà soát mô hình nội dung hướng dẫn, phân quyền và luồng dữ liệu hiện có.
- [x] Thêm lưu trữ nội dung hướng dẫn và giao diện chỉnh sửa dành riêng cho Admin.
- [x] Thêm tìm kiếm nội dung hướng dẫn cho cả Admin và User.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và trải nghiệm desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Branded User Header and Guide Version History

- [x] Rà soát mẫu header Cổng nhân viên, dữ liệu thương hiệu và cấu trúc nội dung hướng dẫn.
- [x] Hiển thị logo công ty, tiêu đề website và tên công ty trên header Cổng nhân viên.
- [x] Gắn nhãn Mới cập nhật cho hướng dẫn vừa được chỉnh sửa.
- [x] Lưu và hiển thị lịch sử phiên bản hướng dẫn cho Admin.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và desktop/mobile.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Visual Diff for Guide Version History

- [x] Rà soát dữ liệu phiên bản và giao diện lịch sử hướng dẫn hiện có.
- [x] Hiển thị rõ nội dung thêm, xóa và thay đổi giữa phiên bản đang xem với phiên bản liền trước.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Dashboard Data Freshness Indicator

- [x] Rà soát nguồn thời gian cập nhật thực tế và vị trí vùng thông tin trên dashboard.
- [x] Thiết kế lại chỉ báo cập nhật dữ liệu theo ngôn ngữ giao diện hiện tại.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Safe Inline Label Editing

- [x] Rà soát nền Trạng thái dữ liệu và phạm vi nhãn giao diện hiện có.
- [x] Loại bỏ nền minh họa Trạng thái dữ liệu và thêm chỉnh sửa nhãn nhấp đúp chỉ dành cho Admin.
- [x] Bổ sung kiểm tra dữ liệu, phím Enter/Esc và hồi quy tránh ảnh hưởng giao diện khác.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Dashboard Pulse Cleanup

- [x] Loại bỏ dòng System pulse · live inventory signal khỏi Tổng quan.
- [x] Kiểm tra bố cục, TypeScript và phát hành cập nhật.

## Current Session — Vietnamese Editable Module Labels

- [x] Lập danh mục các nhãn tiếng Anh còn lại và vị trí nhãn chưa thể nhấp đúp chỉnh sửa.
- [x] Việt hóa nhãn và mở rộng chỉnh sửa trực tiếp an toàn cho các module được yêu cầu.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và responsive.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Vietnamese Settings Labels

- [x] Lập danh mục toàn bộ nhãn tiếng Anh còn lại trong phần Cài đặt.
- [x] Việt hóa các nhãn Cài đặt và giữ nguyên hành vi từng chức năng.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và giao diện Cài đặt.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Vietnamese Excel Report Labels

- [x] Lập danh mục nhãn kỹ thuật trong các luồng xuất Excel.
- [x] Việt hóa nhãn báo cáo Excel theo đúng ngữ cảnh nghiệp vụ.
- [x] Bổ sung hồi quy, kiểm thử TypeScript, Vitest, production build và cấu trúc file xuất.
- [x] Lưu checkpoint phát hành và báo cáo kết quả.

## Current Session — Motion Settings Placement

- [x] Rà soát bố cục Cài đặt thương hiệu và khu vực Nhận diện mở rộng.
- [x] Di chuyển Hiệu ứng chuyển động xuống Nhận diện mở rộng, giữ nguyên chức năng bật/tắt.
- [x] Kiểm tra TypeScript, giao diện và phát hành cập nhật.

## Current Session — Login Brand Synchronization

- [x] Rà soát thành phần đăng nhập, màn hình chào mừng và dữ liệu thương hiệu hiện có.
- [x] Dùng logo, tên công ty và tiêu đề website từ Cài đặt hệ thống cho phần nhận diện khi mới truy cập.
- [x] Cập nhật dòng thương hiệu trên màn hình chào mừng trở lại.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, giao diện và phát hành cập nhật.

## Current Session — Login Background and Greeting Customization

- [x] Rà soát mô hình thông tin công ty, API và bố cục màn hình đăng nhập hiện có.
- [x] Bổ sung lưu trữ, tải ảnh nền và cấu hình câu chào đăng nhập dành cho Admin.
- [x] Hiển thị ảnh nền, câu chào tùy chỉnh và tên công ty đầy đủ trên màn hình đăng nhập.
- [x] Bổ sung migration, hồi quy, kiểm tra TypeScript, giao diện và phát hành cập nhật.

## Current Session — Login Background Removal and Overlay

- [x] Rà soát cấu hình ảnh nền và màn hình đăng nhập hiện có.
- [x] Thêm thao tác gỡ ảnh nền và cấu hình lớp phủ sáng/tối trong Cài đặt hệ thống.
- [x] Áp dụng lớp phủ theo cấu hình, bổ sung hồi quy, kiểm tra và phát hành cập nhật.

## Current Session — Internal Deployment Planning

- [x] Rà soát kiến trúc ứng dụng, xác thực hiện tại và các phụ thuộc triển khai.
- [x] Xây dựng phương án cơ sở dữ liệu tại máy chủ công ty và đăng nhập tài khoản doanh nghiệp.
- [x] Trình bày lộ trình triển khai, kiểm thử, sao lưu và vận hành nội bộ.

## Current Session — Active Directory / LDAP Guide

- [x] Xác định kiến trúc xác thực AD/LDAP phù hợp và các thông số IT cần chuẩn bị.
- [x] Soạn quy trình cấu hình tài khoản dịch vụ, TLS, truy vấn LDAP và ánh xạ người dùng.
- [x] Trình bày kiểm thử đăng nhập, phân quyền, vận hành và xử lý sự cố.

## Current Session — Direct LDAPS Login Simplification

- [x] Đánh giá rủi ro và giới hạn của xác thực LDAPS trực tiếp.
- [x] Thiết kế bộ trường cấu hình LDAPS tối giản và luồng đăng nhập.
- [x] Trình bày điều kiện an toàn, các bước triển khai và phương án dự phòng.

## Current Session — Internal LDAPS Deployment and Database Planning

- [x] Tạo checkpoint backup rõ ràng cho phiên bản hiện tại trước thay đổi triển khai.
- [x] Xác định kiến trúc chạy nội bộ với Domain Controller/LDAPS, MySQL và kho tệp công ty.
- [x] Soạn hướng dẫn migration dữ liệu, cấu hình, backup/restore và vận hành nội bộ.

## Current Session — Employee Role Management

- [x] Rà soát mô hình user, API và giao diện Quản lý nhân sự.
- [x] Thêm thao tác Admin thay đổi vai trò nhân viên với xác nhận và bảo vệ Admin cuối cùng.
- [x] Bổ sung hồi quy, kiểm thử phân quyền, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Employee Role Badges and History

- [x] Rà soát nhật ký hoạt động và drawer hồ sơ nhân viên hiện có.
- [x] Thêm badge vai trò cạnh tên nhân viên và truy vấn lịch sử thay đổi quyền.
- [x] Hiển thị lịch sử trong hồ sơ, bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Compact Role Badges

- [x] Rà soát các vị trí badge vai trò hiện có.
- [x] Đổi nhãn badge thành QTV và NV, giữ nguyên màu sắc và logic.
- [x] Kiểm tra hồi quy giao diện, build và phát hành cập nhật.

## Current Session — Editable Audit Reconciliation Label

- [x] Rà soát header Kiểm kê và cơ chế nhãn chỉnh sửa hiện có.
- [x] Kết nối nhãn Đối chiếu kiểm kê với cơ chế chỉnh sửa an toàn của Admin.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Bulk Asset Import Template

- [x] Rà soát luồng xuất mẫu nhập tài sản và nguồn dữ liệu phân loại, nhà cung cấp, nhãn hàng.
- [x] Đổi hàng tiêu đề sang xám nhạt và thêm dropdown đồng bộ dữ liệu hiện có trong template Excel.
- [x] Bổ sung hồi quy workbook, kiểm tra TypeScript, export và phát hành cập nhật.

## Current Session — Bulk Import Process Review

- [x] Rà soát tạo template, danh mục dropdown và cấu trúc workbook.
- [x] Kiểm tra đọc tệp, xác thực, xem trước, import và cập nhật dữ liệu.
- [x] Đánh giá rủi ro vận hành, lập khuyến nghị ưu tiên và bàn giao báo cáo.

## Current Session — Hardened Asset Excel Import

- [x] Rà soát khóa cập nhật tài sản, ánh xạ Nhà cung cấp và cơ chế transaction hiện có.
- [x] Xác thực chặt header, sheet, ngày tháng và số tiền trước khi mở preview/import.
- [x] Liên kết Nhà cung cấp, triển khai updateExisting và transaction toàn lô.
- [x] Bổ sung hồi quy toàn luồng, kiểm tra giao diện, TypeScript, build và phát hành cập nhật.

## Current Session — Guided Asset Import Preview

- [x] Rà soát dữ liệu preview, Serial/IMEI trùng và trạng thái import hiện có.
- [x] Thêm công tắc cập nhật tự động và bảng so sánh các trường sẽ thay đổi.
- [x] Hoàn thiện thanh tiến trình, thông báo trạng thái theo từng bước import.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, build và phát hành cập nhật.

## Current Session — Auto-close Asset Import

- [x] Tự đóng hộp thoại import sau khi hiển thị thông báo import thành công.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, production build và phát hành cập nhật.

## Current Session — Import Undo Card Visibility

- [x] Thêm nút thu nhỏ cho thẻ hoàn tác import để không che nội dung giao diện.
- [x] Tự ẩn thẻ sau thời gian quy định và cho phép khôi phục lại khi cần.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Import History & Per-session Undo

- [x] Rà soát dữ liệu phiên import, API hiện có và quy tắc thời hạn hoàn tác.
- [x] Thêm API liệt kê lịch sử import phân trang và hoàn tác theo mã phiên.
- [x] Xây dựng giao diện xem lịch sử, trạng thái hiệu lực và xác nhận hoàn tác từng phiên.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Notification, Import Detail & Employee Pagination

- [x] Sửa lớp hiển thị để bảng thông báo không bị che bởi bộ lọc hoặc popup khác.
- [x] Thêm xem chi tiết danh sách tài sản trong từng phiên import trước khi hoàn tác.
- [x] Thêm phân trang cho Quản lý nhân sự theo mẫu điều hướng thống nhất của hệ thống.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Compact Asset Import History

- [x] Đưa nút lịch sử import vào khu vực bộ lọc Danh mục tài sản dưới dạng icon gọn.
- [x] Chỉ liệt kê phiên import có tài sản được tạo hoặc cập nhật thành công.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Document Header Branding

- [x] Loại bỏ dòng chữ AssetMaster khỏi phần đầu các biên bản.
- [x] Giữ nguyên logo và thông tin công ty từ Cài đặt hệ thống trong biên bản.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Import History Filter Visibility Fix

- [x] Thay cơ chế chèn DOM bằng nút React hiển thị trực tiếp trong hàng bộ lọc Danh mục tài sản.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Document Header Alignment

- [x] Căn giữa theo chiều dọc khối thông tin công ty với logo trong phần đầu biên bản.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Import Undo Guidance

- [x] Ẩn thẻ hoàn tác import nổi ở góc màn hình.
- [x] Thông báo sau import thành công về vị trí Lịch sử import để hoàn tác.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Import Undo Discoverability

- [x] Thêm liên kết mở nhanh Lịch sử import trong toast import thành công.
- [x] Hiển thị thời gian còn lại để hoàn tác bên cạnh biểu tượng Lịch sử import.
- [x] Cảnh báo người dùng khi phiên import sắp hết hạn hoàn tác.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Import Undo Accountability

- [x] Làm nổi bật nút Lịch sử import khi thời hạn hoàn tác sắp hết.
- [x] Yêu cầu lý do hoàn tác bắt buộc trước khi xác nhận thao tác.
- [x] Lưu và hiển thị lý do hoàn tác trong lịch sử phiên import.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Quantity-based Inventory Supplies

- [x] Rà soát luồng tài sản, cấp phát, kiểm kê và mô hình dữ liệu hiện có.
- [x] Tạo dữ liệu vật tư, tồn kho và giao dịch nhập–xuất/cấp phát theo số lượng.
- [x] Thêm API quản lý danh mục vật tư, số lượng tồn, mức tồn tối thiểu và lịch sử biến động.
- [x] Xây dựng giao diện quản lý vật tư, nhập–xuất và cảnh báo sắp hết hàng.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, migration, build và phát hành cập nhật.

## Current Session — Supplies Editing & Recipient Allocation

- [x] Sửa khoảng đệm ô tìm kiếm vật tư để biểu tượng không che nội dung.
- [x] Cho phép chỉnh sửa mã và tên vật tư theo quy tắc chống trùng lặp.
- [x] Cho phép cấp phát cho nhân sự hệ thống hoặc người nhận nhập tay khi chọn Người khác.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Supply Issue Slips, Returns & Excel Report

- [x] Rà soát luồng giao dịch vật tư và chuẩn bị mô hình phiếu cấp phát theo năm.
- [x] Tạo dữ liệu phiếu cấp phát VT-NĂM-001 và liên kết giao dịch cấp phát/hoàn trả.
- [x] Thêm API tạo phiếu, hoàn trả một phần về kho và xuất lịch sử nhập–xuất.
- [x] Xây dựng giao diện phiếu cấp phát, hoàn trả và tải báo cáo Excel.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, migration, build và phát hành cập nhật.

## Current Session — Supplies UX, Analytics & PDF Slips

- [x] Căn chỉnh thanh lọc vật tư, thu gọn ô tìm kiếm và giữ nút bộ lọc thẳng hàng.
- [x] Chuyển thao tác bảng vật tư thành icon cân giữa có tooltip và hiệu ứng hover.
- [x] Thêm biểu đồ cấp phát vật tư theo phòng ban hoặc nhân sự dựa trên dữ liệu thực.
- [x] Thêm xuất, xem trước và in PDF phiếu cấp phát vật tư có nhận diện công ty.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Recipient Department & Supply Button Alignment

- [x] Tự điền phòng ban khi chọn nhân sự nhận vật tư từ danh mục nhân sự.
- [x] Làm rõ trạng thái chọn Nhân sự hệ thống và Người khác trong phiếu cấp phát.
- [x] Căn chỉnh icon và nhãn nút Tạo vật tư, Tạo phiếu cấp phát trên mọi kích thước màn hình.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Issue Slip Branding & Confirmation

- [x] Thêm logo công ty bên trái thông tin đầu phiếu cấp phát vật tư PDF.
- [x] Khóa trường phòng ban sau khi tự động điền từ hồ sơ nhân sự.
- [x] Thêm hộp thoại xác nhận có tóm tắt trước khi tạo phiếu cấp phát.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Asset Assignment Slip Preview

- [x] Rà soát PDF và luồng phiếu cấp phát tài sản hiện có.
- [x] Thêm xem trước trước khi tải, in và tải PDF cho phiếu cấp phát tài sản.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Consistent Issue Slip Confirmation

- [x] Thay alert trình duyệt bằng hộp thoại xác nhận theo giao diện AssetMaster.
- [x] Hiển thị tóm tắt vật tư, số lượng, người nhận và phòng ban trong hộp thoại.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Return Confirmation & Stock Safety

- [x] Thêm hộp thoại xác nhận trước khi ghi nhận hoàn trả tài sản.
- [x] Hiển thị số lượng tồn kho còn lại trong hộp thoại xác nhận cấp phát vật tư.
- [x] Thêm cảnh báo rõ ràng khi cấp phát khiến tồn kho thấp hơn mức tối thiểu.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Dashboard Low Stock Watchlist

- [x] Hiển thị danh sách vật tư chạm hoặc thấp hơn mức tồn tối thiểu trên trang Tổng quan.
- [x] Hiển thị mã, số lượng hiện có, mức tối thiểu và lối tắt đến Vật tư & Tồn kho.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Quick Replenishment & Supply Creation Modal

- [x] Thêm nút Tạo phiếu nhập kho cho từng vật tư chạm mức tồn tối thiểu trên Tổng quan.
- [x] Điều hướng đúng vật tư và mở sẵn giao dịch Nhập kho từ cảnh báo.
- [x] Thay khung Thêm vật tư cố định bằng nút và hộp thoại thêm vật tư.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Supply Excel Import & Alignment

- [x] Thêm nhập danh sách vật tư hàng loạt bằng Excel trong modal Thêm vật tư.
- [x] Kiểm tra dữ liệu import và hiển thị kết quả tạo vật tư rõ ràng.
- [x] Chuẩn hóa kích thước, icon và căn giữa nút Hủy/Tạo vật tư.
- [x] Căn giữa nhãn cùng số liệu các thẻ Mặt hàng, Tồn kho và Sắp hết.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Supply Import Updates & Progress

- [x] Thêm tùy chọn cập nhật vật tư khi mã trong Excel đã tồn tại.
- [x] Hiển thị phân biệt số dòng tạo mới và cập nhật trong phần xem trước import.
- [x] Hiển thị tiến trình chi tiết theo từng dòng khi import đang xử lý.
- [x] Bổ sung hồi quy, kiểm tra giao diện, TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Supply Import History

- [x] Lưu phiên import Excel vật tư với người thực hiện, thời gian và kết quả tạo mới/cập nhật.
- [x] Lưu chi tiết các dòng đã tạo/cập nhật để quản trị viên tra cứu lại.
- [x] Thêm danh sách và màn hình chi tiết lịch sử import vật tư trên giao diện.
- [x] Bổ sung hồi quy, migration, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Accessories Naming & PK Issue Codes

- [x] Đổi toàn bộ nội dung người dùng từ Vật tư thành Phụ kiện trong mô-đun, báo cáo và hướng dẫn.
- [x] Đổi tiêu đề Vật tư & tồn kho thành Phụ kiện.
- [x] Chuyển mã phiếu cấp phát mới sang PK-Năm-001, tự tăng và đặt lại theo năm.
- [x] Giữ khả năng xem phiếu VT cũ và bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Accessory Codes & Group Filter

- [x] Tự sinh mã phụ kiện mới theo tiền tố PK- và giữ nguyên mã lịch sử.
- [x] Thêm bộ lọc theo nhóm phụ kiện trên màn hình tồn kho.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Accessory Group Insights & Code Protection

- [x] Hiển thị thống kê tồn kho tổng quan theo từng nhóm phụ kiện.
- [x] Cho phép tạo nhanh nhóm phụ kiện ngay từ bộ lọc nhóm.
- [x] Tự động khóa mã phụ kiện sau khi tạo mới để tránh chỉnh sửa nhầm.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Add Accessory Dialog Terminology

- [x] Đổi toàn bộ nhãn, mô tả và nút trong hộp thoại Thêm phụ kiện từ Vật tư sang Phụ kiện.
- [x] Chuẩn hóa nội dung luồng nhập Excel phụ kiện trong cùng hộp thoại.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Accessory Excel Template

- [x] Chuẩn hóa tiêu đề cột, tên sheet và tên tệp Excel mẫu theo Phụ kiện.
- [x] Bảo đảm nút tải file mẫu xuất hiện trực tiếp tại khu vực nhập Excel.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Manual Accessory Code & Excel Preview

- [x] Bỏ tự sinh và tự điền mã phụ kiện để người dùng tự đặt mã khi tạo mới.
- [x] Bổ sung bước xác nhận rõ ràng sau khi xem trước Excel, trước khi lưu dữ liệu vào hệ thống.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Editable Excel Preview Validation

- [x] Cho phép chỉnh sửa trực tiếp các ô phụ kiện trong bảng xem trước Excel.
- [x] Kiểm tra lại từng dòng sau khi chỉnh sửa và chỉ mở xác nhận lưu khi hợp lệ.
- [x] Làm nổi bật các hàng và ô có dữ liệu không hợp lệ bằng cảnh báo trực quan.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Accessory Unit Cost Formatting

- [x] Áp dụng phân cách hàng nghìn, hậu tố VNĐ và hỗ trợ dán tiền Việt Nam cho đơn giá phụ kiện.
- [x] Hiển thị số tiền bằng chữ dưới trường đơn giá như form Thêm tài sản.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Preview Unit Cost Formatting

- [x] Áp dụng phân cách hàng nghìn và hậu tố VNĐ cho cột đơn giá trong bảng xem trước Excel.
- [x] Giữ giá trị số chính xác khi chỉnh sửa và xác nhận lưu dữ liệu xem trước.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành cập nhật.

## Current Session — Accessory Unit Cost Display Fix

- [x] Thay luồng can thiệp DOM của đơn giá bằng thành phần tiền tệ React dùng chung.
- [x] Hiển thị phân cách hàng nghìn ngay khi nhập tiền trong form Thêm phụ kiện.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build và phát hành sửa lỗi.

## Current Session — Accessory Value Summary & Edit Currency

- [x] Hiển thị tổng giá trị dự kiến bằng số lượng nhân đơn giá trước khi lưu phụ kiện mới.
- [x] Áp dụng phân cách hàng nghìn, hậu tố VNĐ và hỗ trợ dán tiền Việt Nam cho đơn giá khi chỉnh sửa phụ kiện.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Add Accessory Header Spacing

- [x] Điều chỉnh khoảng đệm để mô tả trong tiêu đề Thêm phụ kiện không chồng lên đường viền.
- [x] Kiểm tra hiển thị tiêu đề ở desktop và mobile, sau đó chạy hồi quy và phát hành sửa lỗi.

## Current Session — Persistent Accessory Currency Formatting

- [x] Giữ dấu phân cách hàng nghìn của đơn giá sau khi thay đổi mức tồn tối thiểu hoặc trường khác.
- [x] Bổ sung hồi quy cho việc đồng bộ định dạng tiền qua các lần React render.
- [x] Kiểm tra TypeScript, Vitest, build và phát hành sửa lỗi.

## Current Session — Global Currency Formatting & Validation

- [x] Rà soát tất cả form và modal có trường nhập tiền tệ còn lại.
- [x] Áp dụng phân cách hàng nghìn, hậu tố VNĐ và xử lý dữ liệu dán có ký hiệu tiền tệ nhất quán.
- [x] Hiển thị viền đỏ và thông báo lỗi ngay dưới trường đơn giá khi dữ liệu số không hợp lệ.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Monthly Maintenance Costs & Numeric Unit Prices

- [x] Tổng hợp chi phí bảo trì thực tế theo tháng từ dữ liệu phiếu bảo trì.
- [x] Hiển thị biểu đồ chi phí bảo trì theo tháng trên trang Tổng quan.
- [x] Chỉ cho phép nhập ký tự số trong tất cả các ô đơn giá, vẫn hỗ trợ dán giá trị có ₫ hoặc VNĐ.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Maintenance Cost Drilldown & Budget

- [x] Thêm bộ lọc năm cho biểu đồ chi phí bảo trì.
- [x] Cho phép nhấn cột tháng để xem danh sách phiếu bảo trì và chi phí chi tiết.
- [x] Lưu thiết lập ngân sách bảo trì hàng tháng và cảnh báo vượt ngưỡng trên biểu đồ.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành cập nhật.

## Current Session — Strict Integer Unit Price Input

- [x] Rà soát lỗi phân cách hàng nghìn bị mất khi nhập đơn giá.
- [x] Chỉ cho phép chữ số nguyên trong thao tác gõ và dán; chặn chữ, `đ`, `VNĐ` và mọi ký hiệu.
- [x] Áp dụng thống nhất cho form, modal và bảng xem trước có trường Đơn giá.
- [x] Bổ sung hồi quy, kiểm tra TypeScript, Vitest, build, giao diện và phát hành bản sửa lỗi.

## Current Session — Unit Price Quick Clear

- [x] Bổ sung nút X xóa nhanh cho các ô Đơn giá còn thiếu.
- [x] Kiểm tra hồi quy giao diện và phát hành bản cập nhật.

## Current Session — Maintenance Cost Form Alignment

- [x] Sửa giãn chiều cao hàng biểu mẫu khi Chi phí dự kiến hiển thị số tiền bằng chữ.
- [x] Giữ chiều cao đồng nhất cho Chọn ngày, Lặp lại và nút Tạo yêu cầu.
- [x] Bổ sung hồi quy, kiểm tra responsive và phát hành bản sửa lỗi.

## Current Session — Form Helper Text Alignment

- [x] Kiểm kê các hàng biểu mẫu có trường tiền tệ hoặc văn bản ghi chú bên dưới.
- [x] Áp dụng căn chỉnh độc lập để ghi chú không kéo giãn các trường cùng hàng.
- [x] Bổ sung hồi quy, kiểm tra desktop/mobile và phát hành chuẩn bố cục.

## Current Session — Accessory Distribution Statistics

- [x] Thêm bộ chọn và tìm kiếm nhân sự trong tab thống kê Nhân sự.
- [x] Hiển thị số lượng phụ kiện đang giữ và đã trả của nhân sự được chọn.
- [x] Đổi chỉ số tóm tắt tab Phòng ban sang số lượng đang cấp.
- [x] Bổ sung hồi quy, kiểm tra responsive và phát hành cập nhật.

## Current Session — Asset Depreciation & Disposal

- [x] Thêm trạng thái Khấu hao/Thanh lý trong quản lý tài sản.
- [x] Tự điền và khóa Người/Phòng giữ là Khấu hao - Thanh lý khi chọn trạng thái.
- [x] Loại trừ tài sản Khấu hao/Thanh lý khỏi danh sách và quy trình kiểm kê.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Disposal Workflow Documents & Reporting

- [x] Thêm ngày thanh lý và lý do thanh lý khi chọn trạng thái Khấu hao/Thanh lý.
- [x] Tạo và xuất biên bản thanh lý PDF cho từng tài sản đã thanh lý.
- [x] Thêm báo cáo tổng giá trị tài sản đã thanh lý theo từng năm.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Disposal Certificate Numbering, Attachments & Filter

- [x] Tự động sinh và lưu số biên bản thanh lý theo cấu trúc TL-NĂM-001, đặt lại số thứ tự khi sang năm mới.
- [x] Cho phép tải lên, lưu an toàn và mở tệp chứng từ đính kèm của tài sản thanh lý.
- [x] Hiển thị số biên bản và chứng từ trong biên bản PDF cùng hồ sơ chi tiết tài sản.
- [x] Bổ sung bộ lọc trạng thái tài sản đã thanh lý trong Danh mục tài sản.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Disposal List Excel Export

- [x] Tạo file Excel danh sách tài sản đã thanh lý, gồm số biên bản TL-NĂM-001 và các thông tin hồ sơ cần thiết.
- [x] Bổ sung nút xuất Excel tại khu vực báo cáo thanh lý và xử lý trạng thái không có dữ liệu.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Disposal Year Filter & Combined PDF

- [x] Bổ sung bộ lọc theo năm thanh lý, áp dụng đồng bộ cho thống kê và xuất Excel.
- [x] Cho phép chọn nhiều tài sản thanh lý trong danh sách báo cáo.
- [x] Xuất một tệp PDF gộp biên bản thanh lý cho các tài sản đã chọn, có phân trang và nhận diện công ty.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Combined Disposal PDF Preview

- [x] Hoàn thiện luồng xem trước PDF gộp biên bản thanh lý trong giao diện trước khi tải tệp.
- [x] Bổ sung kiểm tra trực quan, hồi quy và phát hành cập nhật.

## Current Session — Retirement Reason Input Focus Fix

- [x] Khắc phục lỗi trường Lý do thanh lý bị mất focus sau mỗi ký tự nhập.
- [x] Bổ sung hồi quy, kiểm tra nhập liệu trực tiếp và phát hành cập nhật.

## Current Session — Retirement Reason Templates & Warranty Feasibility

- [x] Thêm danh sách mẫu lý do thanh lý phổ biến để chọn nhanh và đưa vào ô nhập liệu.
- [x] Rà soát mô hình, API và giao diện Bảo trì/Báo hỏng để đánh giá tách Bảo hành/Sửa chữa trong cùng menu.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành mẫu lý do thanh lý.
- [x] Chuẩn bị khuyến nghị lộ trình, rủi ro và phạm vi thay đổi cho Bảo hành/Sửa chữa.

## Current Session — Warranty & Repair Processing Channel

- [x] Thêm trường Kênh xử lý Bảo hành/Sửa chữa cho phiếu vận hành và chuẩn hóa dữ liệu cũ.
- [x] Cập nhật API, lịch sử, xuất Excel và báo cáo để giữ thông tin Kênh xử lý.
- [x] Đổi menu Bảo trì & Báo hỏng thành Bảo hành/Sửa chữa, bổ sung lựa chọn kênh khi tạo phiếu và tab lọc riêng.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Warranty Detail, Alerts & Cost Breakdown

- [x] Thêm hãng, nhà cung cấp và mã yêu cầu bảo hành cho phiếu Bảo hành.
- [x] Cảnh báo khi lập phiếu Sửa chữa cho tài sản còn trong thời hạn bảo hành.
- [x] Phân tách biểu đồ chi phí dashboard theo Kênh xử lý Bảo hành/Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra giao diện và phát hành cập nhật.

## Current Session — Warranty Status & Detail Refinement

- [x] Đổi nhãn trạng thái Bảo trì thành Bảo hành/Sửa chữa và đồng bộ trường Người/Phòng giữ.
- [x] Hiển thị Hãng, Nhà cung cấp/Trung tâm bảo hành và Mã yêu cầu trong chi tiết phiếu Bảo hành.
- [x] Làm nổi bật hộp thoại xác nhận Sửa chữa khi tài sản còn hạn bảo hành.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Code & Expiry Reminders

- [x] Tự sinh mã bảo hành BH-NĂM-001, quay lại 001 theo năm và chống trùng lặp.
- [x] Khắc phục khả năng thao tác, tự điền Hãng/Nhà cung cấp và hiển thị mã bảo hành trong biểu mẫu.
- [x] Hiển thị thông báo nhắc các tài sản sắp hết hạn bảo hành trong 30 ngày.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Reminder Actions & Locked Purchase Data

- [x] Thêm nút Tạo phiếu bảo hành trong từng nhắc hạn bảo hành.
- [x] Khóa Hãng và Nhà cung cấp theo dữ liệu mua hàng trong biểu mẫu Bảo hành.
- [x] Hiển thị biểu tượng khóa đỏ và mô tả khi rê chuột trên trường không thể chỉnh sửa.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Form History & Quick Actions

- [x] Hiển thị lịch sử các lần bảo hành trước đó trong form tạo phiếu Bảo hành.
- [x] Bỏ tạo phiếu Bảo hành từ nhắc hạn và thêm tạo nhanh Bảo hành trong danh sách tài sản cần xử lý.
- [x] Ẩn ô Lý do bảo trì khi trạng thái tài sản là Bảo hành/Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Reason, Full History & Evidence

- [x] Hiển thị và lưu lý do Bảo hành/Sửa chữa khi trạng thái tài sản là Bảo hành/Sửa chữa.
- [x] Thêm nút Xem tất cả mở popup lịch sử đầy đủ các phiếu Bảo hành của tài sản.
- [x] Cho phép đính kèm hình ảnh hoặc chứng từ khi tạo phiếu Bảo hành mới.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Attachment Upload Progress

- [x] Hiển thị tiến trình và trạng thái tải chứng từ khi tạo phiếu Bảo hành.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Warranty Status Filter Fix

- [x] Sửa bộ lọc trạng thái Bảo hành/Sửa chữa trong Danh mục tài sản để trả đúng dữ liệu.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Service Channel Codes, Links & Filter Counts

- [x] Khóa Kênh xử lý theo loại phiếu và đổi mã Sửa chữa sang SC-NĂM-001.
- [x] Thêm liên kết nhanh từ dòng tài sản tới phiếu Bảo hành/Sửa chữa liên quan.
- [x] Hiển thị số lượng tài sản bên cạnh từng trạng thái trong bộ lọc Danh mục tài sản.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Catalog Warranty Lookup & Repair PDF

- [x] Xóa hai nút trùng lặp “Tài sản Bảo hành/Sửa chữa” và “Xuất Excel” khỏi Danh mục tài sản.
- [x] Hiển thị nhãn “BH: ngày hết hạn bảo hành” dưới tên tài sản kèm trạng thái sắp hết hạn/đã hết hạn.
- [x] Thêm tra cứu Danh mục tài sản theo mã phiếu Bảo hành BH hoặc Sửa chữa SC.
- [x] Thêm xem trước, xuất và in PDF cho từng phiếu Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Repair Cost & Handover Accessories

- [x] Hiển thị tổng chi phí Sửa chữa phát sinh theo từng tài sản trong Danh mục.
- [x] Gỡ tra cứu BH/SC khỏi Danh mục và chuyển cụm tra cứu mã phiếu cùng lọc trạng thái vào Quản lý Bảo hành/Sửa chữa.
- [x] Cho phép cấp phát tài sản chọn phụ kiện từ kho hoặc nhập tay.
- [x] Tự động kiểm tra và trừ tồn kho phụ kiện khi cấp phát từ danh sách.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Accessory Return & Repair Cost Report

- [x] Tự động hoàn phụ kiện kho khi thu hồi tài sản và ghi nhận biến động nhập kho.
- [x] Hiển thị danh sách phụ kiện đã cấp trong trang chi tiết phiếu bàn giao.
- [x] Thêm báo cáo tổng chi phí Sửa chữa theo từng tài sản và phòng ban.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Partial Accessory Return & Repair Cost Export

- [x] Cho phép hoàn trả một phần phụ kiện theo số lượng thực tế khi thu hồi tài sản.
- [x] Cảnh báo rõ phụ kiện còn thiếu trước khi xác nhận thu hồi.
- [x] Xuất Excel báo cáo chi phí Sửa chữa theo tài sản và Phòng Ban.
- [x] Bổ sung hồi quy, kiểm tra giao diện, build và phát hành cập nhật.

## Current Session — Asset Recovery PDF

- [x] Tạo biên bản thu hồi tài sản PDF có danh sách phụ kiện thực tế đã hoàn/chưa hoàn.
- [x] Thêm xem trước, tải và in biên bản thu hồi từ chi tiết phiếu bàn giao.
- [x] Bổ sung hồi quy, kiểm tra PDF, giao diện và build phát hành.

## Current Session — Recovery Certificate Number

- [x] Tạo mã biên bản thu hồi duy nhất tự sinh theo năm và tháng.
- [x] Hiển thị mã biên bản thu hồi trên chi tiết phiếu và file PDF.
- [x] Bổ sung hồi quy, kiểm tra migration, giao diện và build phát hành.

## Current Session — Recovery Search & Clear Controls

- [x] Thêm thanh tìm kiếm theo mã biên bản thu hồi tại danh sách lịch sử thu hồi.
- [x] Chuẩn hóa nút xóa nhanh từ khóa cho mọi ô tìm kiếm trong hệ thống.
- [x] Bổ sung hồi quy, xác minh giao diện và build phát hành.

## Current Session — Warranty Label & Recovery List Visibility

- [x] Chuẩn hóa nhãn Bảo trì thành Bảo hành/Sửa chữa trong mọi biểu mẫu thêm và sửa tài sản.
- [x] Hiển thị mã biên bản thu hồi tại cột Mã phiếu cho các phiếu đã hoàn trả.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Recovery Certificate PDF Shortcut

- [x] Cho phép nhấn mã biên bản thu hồi trong danh sách để mở nhanh bản xem trước PDF.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Recovery Certificate PDF Shortcut Fix

- [x] Sửa lỗi nhấn mã biên bản thu hồi trong danh sách chưa mở được bản xem trước PDF.
- [x] Bổ sung hồi quy, tái hiện tương tác và build phát hành.

## Current Session — Recovery PDF Feedback & Service Form Cleanup

- [x] Hiển thị trạng thái Đang chuẩn bị PDF và chặn nhấn lặp khi mở từ mã TH.
- [x] Thêm biểu tượng PDF nhận diện mã biên bản thu hồi có thể nhấn.
- [x] Gỡ lựa chọn Sự cố không cần thiết khỏi biểu mẫu Bảo hành/Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Recovery Filter & Flexible Search

- [x] Thêm bộ lọc chỉ hiển thị các phiếu đã có mã biên bản thu hồi.
- [x] Hỗ trợ tìm kiếm linh hoạt mã TH theo một phần ký tự hoặc khi bỏ dấu gạch nối.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Recovery PDF Direct Open & Service Form Simplification

- [x] Gỡ bộ chọn Báo hỏng/Bảo trì định kỳ khỏi biểu mẫu tạo phiếu Bảo hành/Sửa chữa.
- [x] Sửa thao tác nhấn mã TH để mở trực tiếp bản xem trước biên bản thu hồi.
- [x] Bổ sung hồi quy, tái hiện tương tác và build phát hành.

## Current Session — Recovery Search & Direct Preview Fix

- [x] Sửa tìm kiếm chuỗi con để mã đuôi như 001 trả về đúng các phiếu phù hợp.
- [x] Sửa nhấn mã TH để chuyển thẳng đến bản xem trước PDF, không dừng ở chi tiết bàn giao.
- [x] Bổ sung hồi quy, tái hiện tương tác và build phát hành.

## Current Session — Service Ticket List Simplification

- [x] Tinh gọn danh sách phiếu Bảo hành/Sửa chữa để ưu tiên mã phiếu, tài sản, kênh, trạng thái và chi phí.
- [x] Chuyển thông tin xử lý chi tiết cùng thao tác cập nhật vào vùng mở rộng theo từng phiếu.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Repair PDF Unicode Font Fix

- [x] Chuẩn hóa phông Unicode nhúng cho toàn bộ nội dung PDF phiếu sửa chữa.
- [x] Bổ sung hồi quy và xác minh tiếng Việt có dấu trong bản xem trước PDF.

## Current Session — PDF Unicode & Corporate Identity Standardization

- [x] Áp dụng phông Unicode nhúng cho PDF biên bản thanh lý và kiểm kê.
- [x] Chuẩn hóa logo, tiêu đề và chân trang trên các mẫu PDF xuất hiện có.
- [x] Bổ sung hồi quy PDF tiếng Việt và nhận diện doanh nghiệp, kiểm tra build phát hành.

## Current Session — Supply Status & Pagination Consistency

- [x] Đồng bộ màu nhãn trạng thái phụ kiện theo hệ màu của các danh sách hiện có.
- [x] Thêm phân trang danh sách phụ kiện theo chuẩn 10 dòng mỗi trang với nút điều hướng.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Multi-item Supply Issue Slip

- [x] Cho phép chọn nhiều loại phụ kiện và số lượng trong cùng phiếu cấp phát cho một người nhận.
- [x] Kiểm tra tồn kho, chống trùng dòng và ghi nhận đầy đủ từng phụ kiện trong phiếu.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Multi-item Issue PDF & Employee Supply History

- [x] Chuẩn hóa PDF phiếu cấp phát nhiều phụ kiện với logo và định dạng doanh nghiệp.
- [x] Hiển thị lịch sử nhận và hoàn trả phụ kiện chi tiết trong hồ sơ nhân viên.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Employee Supply History Actions & Filters

- [x] Thêm nút mở lại bản PDF cho từng phiếu trong lịch sử nhận phụ kiện của hồ sơ nhân viên.
- [x] Thêm bộ lọc theo khoảng thời gian và trạng thái đã trả/còn giữ cho lịch sử nhận phụ kiện.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Employee Supply History Simplification

- [x] Gỡ bộ lọc thời gian và trạng thái khỏi lịch sử nhận phụ kiện trong hồ sơ nhân viên.
- [x] Hiển thị số lượng phụ kiện dạng số nguyên gọn khi không có phần lẻ.
- [x] Bổ sung hồi quy, kiểm tra bản dựng và phát hành.

## Current Session — Compact Value Allocation Reports

- [x] Tinh gọn khu vực Phân bổ giá trị trong tab Báo cáo để tăng khả năng quét thông tin.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Value Allocation Drill-down

- [x] Cho phép nhấn vào nhóm trong biểu đồ phân bổ giá trị để xem tài sản thuộc nhóm đó.
- [x] Hiển thị danh sách tài sản chi tiết tương ứng với nhóm Bộ Phận, Hãng hoặc Nhà cung cấp đã chọn.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Drill-down Asset Detail Popup

- [x] Cho phép nhấn từng dòng tài sản trong danh sách drill-down để mở popup chi tiết đầy đủ.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Asset Detail History Tabs

- [x] Thêm tab lịch sử bàn giao và Bảo hành/Sửa chữa trong popup chi tiết tài sản.
- [x] Đổi nhãn KPI thành Yêu cầu Bảo hành/Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Open Original Asset Tickets

- [x] Thêm nút mở trực tiếp phiếu Bàn giao gốc từ lịch sử tài sản.
- [x] Thêm nút mở trực tiếp phiếu Bảo hành/Sửa chữa gốc từ lịch sử tài sản.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Return to Asset & Compact Service Costs

- [x] Thêm thao tác quay lại popup chi tiết tài sản sau khi mở phiếu gốc.
- [x] Thêm bộ lọc năm và tổng chi phí theo năm cho báo cáo Bảo hành/Sửa chữa.
- [x] Tinh gọn khu vực chi phí, gỡ các khối Theo tài sản và Theo Phòng Ban.
- [x] Chuyển xuất Excel chi phí thành luồng xem trước danh sách phiếu có chi phí.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Service Cost Channel Filter

- [x] Thêm bộ lọc kênh Bảo hành/Sửa chữa cho báo cáo chi phí theo năm.
- [x] Đồng bộ bộ lọc kênh với bản xem trước Excel chi phí.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Stable Service Cost Summary

- [x] Thay các ô tóm tắt bằng Sửa chữa, Bảo hành và Tổng cộng trong khu vực chi phí.
- [x] Khóa nút xem trước Excel khi bộ lọc không có phiếu phát sinh chi phí.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Monthly Service Cost Trend

- [x] Thêm biểu đồ cột biến động chi phí theo từng tháng trong năm đã chọn.
- [x] Hiển thị tỷ trọng phần trăm Bảo hành và Sửa chữa so với Tổng cộng.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Monthly Cost Ticket Drill-down

- [x] Gỡ nhãn tổng chi phí trùng lặp và hiển thị năm trong ô Tổng cộng khi có chọn năm.
- [x] Cho phép nhấn cột tháng để xem danh sách phiếu chi phí chi tiết của tháng đó.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Open Monthly Cost Tickets

- [x] Thêm nút mở trực tiếp phiếu Bảo hành/Sửa chữa gốc từ danh sách chi phí theo tháng.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Return to Monthly Tickets & Pagination

- [x] Thêm thao tác quay lại danh sách phiếu chi phí theo tháng sau khi mở phiếu gốc.
- [x] Phân trang danh sách phiếu chi phí theo tháng, 5 dòng mỗi trang.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Restore Monthly Report Scroll Position

- [x] Lưu vị trí cuộn trang trước khi mở phiếu gốc từ danh sách tháng.
- [x] Khôi phục vị trí cuộn sau khi quay lại báo cáo và dựng lại danh sách tháng.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — In-place Monthly Ticket Preview

- [x] Hiển thị nhanh chi tiết phiếu Bảo hành/Sửa chữa ngay trong trang Báo cáo.
- [x] Giữ nguyên tháng, bộ lọc và trang danh sách khi đóng xem nhanh.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Quick Preview PDF Actions

- [x] Dùng chung mẫu PDF và bản xem trước chuẩn cho phiếu Bảo hành/Sửa chữa từ popup xem nhanh.
- [x] Bổ sung nút In và Xuất PDF trong popup xem nhanh phiếu.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — PDF Preview Layer & Mobile Service Tickets

- [x] Đưa lớp xem trước PDF lên trên popup xem nhanh, không còn bị che khuất.
- [x] Tối ưu popup xem nhanh phiếu Bảo hành/Sửa chữa cho viewport mobile.
- [x] Sửa bố cục mobile của trang Quản lý phiếu Bảo hành/Sửa chữa.
- [x] Bổ sung hồi quy, kiểm tra desktop/mobile và build phát hành.

## Current Session — Mobile Monthly Cost Trend

- [x] Sửa biểu đồ Biến động chi phí theo tháng để nhãn và cột không bị chồng/cắt trên mobile.
- [x] Giữ thao tác chọn tháng và danh sách phiếu chi tiết tương ứng.
- [x] Bổ sung hồi quy, kiểm tra mobile/desktop và build phát hành.

## Current Session — Service Ticket PDF Asset Table

- [x] Bổ sung tên người lập và ngày lập phiếu ở phần đầu PDF.
- [x] Thay phần thông tin tài sản bằng bảng gồm các trường tài sản chính.
- [x] Bổ sung hồi quy, kiểm tra PDF và build phát hành.

## Current Session — PDF Signatures & Chart Swipe

- [x] Thêm Serial vào bảng thông tin tài sản của PDF.
- [x] Thay khu ký bằng Nhà cung cấp, Người bàn giao và Quản lý; bỏ Người xử lý.
- [x] Loại bỏ các khối thông tin xử lý/phụ trong ảnh khỏi PDF.
- [x] Bảo đảm biểu đồ chi phí theo tháng có thể vuốt ngang trên mobile.
- [x] Bổ sung hồi quy, kiểm tra PDF/mobile và build phát hành.

## Current Session — PDF Fault Context & Desktop Month Click

- [x] Hiển thị Tình trạng lỗi trong bảng tài sản PDF.
- [x] Chỉ hiển thị cột Hạn bảo hành cho tài sản còn hiệu lực bảo hành.
- [x] Khôi phục thao tác nhấn cột tháng để mở danh sách phiếu trên desktop.
- [x] Bổ sung hồi quy, kiểm tra PDF/desktop và build phát hành.

## Current Session — Warranty PDF Preview & Asset Table

- [x] Hiển thị nút xem trước PDF cho phiếu Bảo hành trong quản lý phiếu.
- [x] Bỏ cột Tình trạng khỏi bảng thông tin tài sản PDF.
- [x] Bổ sung hồi quy, kiểm tra giao diện/PDF và build phát hành.

## Current Session — PDF Creator Unit & Mobile Month Picker

- [x] Hiển thị phòng ban và bộ phận của người lập trong biên bản Bảo hành/Sửa chữa.
- [x] Thay cơ chế biểu đồ chi phí mobile bằng cách chọn tháng dễ dùng và mở danh sách phiếu ổn định.
- [x] Bổ sung hồi quy, kiểm tra PDF/mobile và build phát hành.

## Current Session — Supply Value & Mobile Ticket Counts

- [x] Sửa tính toán Tổng giá trị dự kiến trong biểu mẫu thêm phụ kiện.
- [x] Hiển thị số phiếu Bảo hành và Sửa chữa trên từng ô tháng mobile.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Service PDF Creator Unit & Signatures

- [x] Hiển thị riêng “Phòng ban: …” và “Bộ phận: …” trong phần thông tin người lập PDF.
- [x] Sắp xếp khu ký nhận theo thứ tự Người bàn giao, Xác nhận quản lý, Đại diện nhà cung cấp.
- [x] Bổ sung hồi quy, kiểm tra PDF và build phát hành.

## Current Session — Handover Creation Failure

- [x] Chẩn đoán và sửa lỗi không tạo được phiếu bàn giao.
- [x] Thay thông báo SQL kỹ thuật bằng thông báo người dùng dễ hiểu.
- [x] Bổ sung hồi quy, kiểm tra tạo phiếu và build phát hành.

## Current Session — PDF Label Consistency & BG Preview

- [x] Thêm dấu “:” cho nhãn Người lập phiếu và Ngày lập phiếu trong PDF.
- [x] Hiển thị mã BG dự kiến trước khi xác nhận tạo phiếu bàn giao.
- [x] Bổ sung hồi quy, kiểm tra giao diện/PDF và build phát hành.

## Current Session — PDF Preview Modal Layout

- [x] Sửa chồng lấn thông tin công ty và đường viền trong đầu xem trước PDF.
- [x] Sửa bố cục/nút đóng xem trước PDF.
- [x] Rà soát và đồng bộ các modal xem trước PDF có cùng cấu trúc.
- [x] Bổ sung hồi quy, kiểm tra desktop/mobile và build phát hành.

## Current Session — BG Sequence & Handover Supply Holdings
- [x] Rà soát và chuẩn hóa các mã BG-2026 hiện có trong dữ liệu.
- [x] Giữ mã BG dự kiến/ghi nhận tiếp theo theo chuỗi số tuần tự.
- [x] Đồng bộ phụ kiện đi kèm bàn giao vào trạng thái nhân sự đang giữ.
- [x] Bổ sung hồi quy, kiểm tra dữ liệu/giao diện và build phát hành.

## Current Session — Integer Returns & Handover Supply Details
- [x] Giới hạn số lượng hoàn kho theo đơn vị số nguyên khi thao tác tăng/giảm.
- [x] Mở nhanh biên bản bàn giao từ dòng phụ kiện kèm BG.
- [x] Hiển thị riêng số lượng phụ kiện đang giữ theo từng mã trong thống kê nhân sự.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Employee Holding Certificates
- [x] Bổ sung mã biên bản BG cho từng phụ kiện còn đang giữ trong thống kê Nhân sự.
- [x] Mở trực tiếp biên bản bàn giao khi nhấn mã BG trong chi tiết phụ kiện.
- [x] Chỉ hiển thị chi tiết các phụ kiện có số lượng còn giữ lớn hơn 0.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Grouped Employee Holding Sources
- [x] Gộp phụ kiện cùng biên bản bàn giao thành một nhóm có một liên kết xem trước.
- [x] Liệt kê cả phụ kiện còn giữ từ phiếu cấp phát riêng PK.
- [x] Mở xem trước biên bản BG trực tiếp trong trang Phụ kiện.
- [x] Bổ sung hồi quy, kiểm tra dữ liệu/giao diện và build phát hành.

## Current Session — Holding Source Card Summary
- [x] Hiển thị tổng số lượng phụ kiện đang giữ trên tiêu đề mỗi thẻ BG/PK.
- [x] Thêm thao tác thu gọn và mở rộng danh sách phụ kiện của từng thẻ.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Inline Handover Preview Layout Fix
- [x] Sửa bố cục hộp xem trước biên bản bàn giao mở từ trang Phụ kiện.
- [x] Kiểm tra hiển thị nội dung biên bản trên desktop và mobile.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Inline Handover Print & PDF
- [x] Thêm nút In trong hộp xem trước biên bản từ trang Phụ kiện.
- [x] Thêm nút Xuất PDF dùng mẫu biên bản bàn giao thống nhất.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Service Ticket PDF Polish
- [x] Tách MST và điện thoại thành các dòng riêng trong PDF Bảo hành/Sửa chữa.
- [x] Khôi phục biểu tượng xem trước PDF của phiếu Bảo hành trên mobile.
- [x] Hiển thị trạng thái tạo PDF và vô hiệu hóa thao tác trùng lặp.
- [x] Bổ sung hồi quy, kiểm tra giao diện mobile/PDF và build phát hành.

## Current Session — Handover Preview Alignment & PDF Filename
- [x] Sửa căn chỉnh hộp xem trước BG trên trang Phụ kiện ở màn hình rộng.
- [x] Cho phép nhập tên file PDF trước khi xuất hoặc in biên bản BG.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — PDF Footer & Filename Memory
- [x] Bỏ ngày tạo và ngày lập khỏi chân trang các PDF nghiệp vụ.
- [x] Tự động lưu tên file PDF theo mã từng loại biên bản.
- [x] Bổ sung hồi quy, kiểm tra PDF và build phát hành.

## Current Session — Centered BG Preview & Cross-Document Filenames
- [x] Căn giữa đúng hộp xem trước BG trên màn hình desktop và mobile.
- [x] Lưu/khôi phục tên file PDF theo mã cho BH, SC, KK và TL.
- [x] Bổ sung hồi quy, kiểm tra các luồng PDF và build phát hành.

## Current Session — PDF Preview Close Button
- [x] Chuẩn hóa giao diện nút Đóng xem trước PDF đồng bộ với In/Tải PDF.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — BG Preview Dialog Sizing
- [x] Sửa kích thước và căn giữa khung biên bản BG trên trang Phụ kiện.
- [x] Chuẩn hóa vùng cuộn và thanh thao tác của khung BG trên desktop/mobile.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — BG Preview Positioning Regression
- [x] Loại bỏ xung đột định vị khiến khung BG lệch lên trên và sang trái.
- [x] Xác minh căn giữa thực tế trên desktop và mobile.
- [x] Bổ sung hồi quy, kiểm tra giao diện và build phát hành.

## Current Session — Viewport-Centered BG Overlay
- [x] Thay Dialog dùng chung bằng overlay BG căn giữa theo toàn bộ viewport.
- [x] Giữ vùng cuộn, đóng, In và Xuất PDF hoạt động trong overlay mới.
- [x] Bổ sung hồi quy, kiểm tra vị trí thực tế và build phát hành.

## Current Session — Employee Profile BG Overlay
- [x] Áp dụng overlay BG căn giữa viewport cho thao tác mở từ hồ sơ nhân viên.
- [x] Giữ đầy đủ thông tin phụ kiện, đóng, In và Xuất PDF trong overlay mới.
- [x] Bổ sung hồi quy, kiểm tra giao diện hồ sơ và build phát hành.

## Current Session — Mobile Accessory Certificate Cards
- [x] Khắc phục hiện tượng nút Chi tiết và liên kết BG/PK bị xuống dòng hoặc chồng lấn trên mobile.
- [x] Bảo đảm vùng chạm, nhãn thao tác và mã biên bản hiển thị rõ ràng ở mọi kích thước màn hình.
- [x] Bổ sung hồi quy, kiểm tra giao diện mobile và build phát hành.

## Current Session — Mobile Certificate Touch Feedback
- [x] Thêm phản hồi chạm trực quan cho nút Chi tiết và mã biên bản BG/PK trên mobile.
- [x] Tôn trọng tùy chọn giảm chuyển động của thiết bị.
- [x] Bổ sung hồi quy, kiểm tra mobile và build phát hành.

## Proposed Feature — Bản quyền
- [x] Thiết kế nghiệp vụ quản lý giấy phép/bản quyền phần mềm, nội dung số và quyền sử dụng liên quan đến tài sản.
- [x] Xác định dữ liệu, quy trình cấp phát–gia hạn–thu hồi, phân quyền và cảnh báo hết hạn.
- [x] Trình bày lộ trình triển khai để phê duyệt trước khi phát triển.

## Current Session — Mobile Handover Table Priority
- [x] Rà soát cột Mã phiếu trong danh sách Bàn giao & Cấp phát trên mobile.
- [x] Tối ưu kích thước/vị trí cột để ưu tiên Người nhận, thời gian và trạng thái.
- [x] Bổ sung hồi quy, kiểm tra mobile và build phát hành.

## Current Session — Organization Management Mobile Layout
- [x] Tái tạo và xác định lỗi giao diện trang Phòng Ban & Bộ Phận trên mobile.
- [x] Điều chỉnh danh sách, bộ lọc và thao tác để không tràn hoặc chồng lấn.
- [x] Bổ sung hồi quy, kiểm tra mobile và build phát hành.

## Current Session — Organization Quick Search
- [x] Thêm tìm kiếm nhanh theo tên hoặc mã Phòng Ban và Bộ Phận.
- [x] Chuẩn hóa ô tìm kiếm với biểu tượng, xóa nhanh, trạng thái rỗng và bố cục mobile.
- [x] Bổ sung hồi quy, kiểm tra mobile và build phát hành.
