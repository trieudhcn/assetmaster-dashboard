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
