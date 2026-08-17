# Audit Redesign Verification

## Desktop review — 17/08/2026

The audit list at `/?view=audit` now displays compact session cards in a four-column desktop grid. The selected session no longer expands below the list, preserving the page for the session overview and creation flow.

The session detail at `/?view=audit&auditSession=1` renders as a dedicated full-width view with a back action. Its headers are Vietnamese: **Trạng thái dự kiến** and **Trạng thái thực tế**; the stored `available` status is displayed as **Sẵn có**. The asset picker is wider and the actual-status dropdown has a larger fixed width. The table container is visible on desktop, allowing the dropdown to extend beyond the table without being clipped.

On a 375px viewport, the separate detail view retains its full-width asset picker, full-width add button and visible summary cards. The audit table keeps its explicit horizontal-swipe affordance instead of forcing controls into a cramped vertical layout.
