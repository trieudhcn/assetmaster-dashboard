# Audit Redesign Verification

## Desktop review — 17/08/2026

The audit list at `/?view=audit` now displays compact session cards in a four-column desktop grid. The selected session no longer expands below the list, preserving the page for the session overview and creation flow.

The session detail at `/?view=audit&auditSession=1` renders as a dedicated full-width view with a back action. Its headers are Vietnamese: **Trạng thái dự kiến** and **Trạng thái thực tế**; the stored `available` status is displayed as **Sẵn có**. The asset picker is wider and the actual-status dropdown has a larger fixed width. The table container is visible on desktop, allowing the dropdown to extend beyond the table without being clipped.

On a 375px viewport, the separate detail view retains its full-width asset picker, full-width add button and visible summary cards. The audit table keeps its explicit horizontal-swipe affordance instead of forcing controls into a cramped vertical layout.

## QR, exports and status filter review — 17/08/2026

The audit list exposes a compact **Tất cả trạng thái** selector beside the session count. The dedicated session detail presents **Quét QR hàng loạt**, **Xuất Excel**, and **Xuất PDF** alongside its statistics without crowding the asset picker. Export actions are intentionally disabled until the session contains one or more discrepancy rows.

## Dropdown visibility review — 17/08/2026

The desktop detail card now contains the data table within its rounded boundary while preserving a concise asset picker. Searchable dropdown menus use a document-level portal with fixed positioning and scroll-aware measurement, so the asset picker, **Trạng thái thực tế**, and **Kết quả** menus can render above the card instead of being clipped by its overflow boundary.

## Fieldwork export review — 17/08/2026

Desktop shows **Danh sách kiểm kê** alongside QR and discrepancy export actions without crowding the header. On a 375px viewport, actions wrap into readable touch targets, the asset picker and add button remain full-width, and the wide audit table provides its explicit horizontal-swipe cue rather than forcing controls into a narrow layout.
