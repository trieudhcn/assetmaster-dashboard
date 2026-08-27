# Kế hoạch triển khai nội bộ — bản LDAP/LDAPS duy nhất

> **Tài liệu này đã được thay thế.** Phương án Entra ID trước đây không còn phù hợp với yêu cầu mới “chỉ sử dụng LDAP để xác thực”. Xem runbook chi tiết tại [Triển khai nội bộ LDAP/LDAPS](./internal-ldap-only-deployment.md).

Trong phương án mới, **Active Directory/LDAP qua LDAPS là nguồn xác thực duy nhất**. Keycloak chỉ là cổng xác thực chạy nội bộ, giúp ứng dụng không bao giờ nhận hoặc lưu mật khẩu nhân viên; nó không thay thế LDAP bằng một nhà cung cấp danh tính khác.
