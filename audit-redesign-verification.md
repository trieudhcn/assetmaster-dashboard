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

## Total asset export review — 17/08/2026

On desktop, **Xuất tổng tài sản** appears directly beside **Danh sách kiểm kê** after the Add Asset action. The mobile layout preserves touch targets by stacking the export actions after the full-width selector and add button; no unintended horizontal page scrolling is introduced.

## Import, result filter & scoped export review — 17/08/2026

Desktop presents the result filter, Department scope, Category scope and **Nhập Excel** action in one concise row above the audit table. At 375px, these controls become full-width touch targets in a clear sequence. The export actions and table swipe affordance remain visible without page-level horizontal overflow.

## Finalization & import history review — 17/08/2026

When all results are complete, desktop exposes a clear **Chốt biên bản** action with explanatory text. On a 375px viewport, the action remains a distinct touch target directly below the completion guidance. The **Lịch sử nhập Excel** block stays visible below the scrollable audit table with an empty-state count until an import is recorded.
