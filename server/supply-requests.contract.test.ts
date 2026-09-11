import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

async function source(filePath: string) {
  return readFile(path.join(root, filePath), "utf8");
}

describe("employee supply request workflow", () => {
  it("persists request headers, items, status history and issue-slip linkage", async () => {
    const [schema, migration, partialMigration, journal] =
      await Promise.all([
        source("drizzle/schema.ts"),
        source("drizzle/0063_supply_requests.sql"),
        source("drizzle/0064_partial_supply_request_fulfillment.sql"),
        source("drizzle/meta/_journal.json"),
      ]);

    expect(schema).toContain("export const supplyRequests = mysqlTable(");
    expect(schema).toContain("export const supplyRequestItems = mysqlTable(");
    expect(schema).toContain('"pending"');
    expect(schema).toContain('"fulfilled"');
    expect(schema).toContain('"partially_fulfilled"');
    expect(schema).toContain("approvedQuantity");
    expect(schema).toContain("issueSlipId");
    expect(migration).toContain("CREATE TABLE `supplyRequests`");
    expect(migration).toContain("CREATE TABLE `supplyRequestItems`");
    expect(migration).toContain("supply_requests_issue_slip_unique");
    expect(partialMigration).toContain("partially_fulfilled");
    expect(partialMigration).toContain("approvedQuantity");
    expect(journal).toContain('"tag": "0063_supply_requests"');
    expect(journal).toContain(
      '"tag": "0064_partial_supply_request_fulfillment"'
    );
  });

  it("separates employee and administrator permissions", async () => {
    const router = await source("server/routers.ts");
    const suppliesRouter = router.slice(router.indexOf("supplies: router({"));

    expect(suppliesRouter).toContain(
      "requestable: protectedProcedure.query"
    );
    expect(suppliesRouter).toContain(
      "myRequests: protectedProcedure.query"
    );
    expect(suppliesRouter).toContain(
      "createRequest: protectedProcedure"
    );
    expect(suppliesRouter).toContain(
      "cancelRequest: protectedProcedure"
    );
    expect(suppliesRouter).toContain("adminRequests: adminProcedure");
    expect(suppliesRouter).toContain("rejectRequest: adminProcedure");
    expect(suppliesRouter).toContain("fulfillRequest: adminProcedure");
    expect(suppliesRouter).toContain(
      "request.requesterUserId !== ctx.user.id"
    );
  });

  it("fulfills a pending request atomically and rechecks current stock", async () => {
    const router = await source("server/routers.ts");
    const fulfillStart = router.indexOf("fulfillRequest: adminProcedure");
    const fulfillEnd = router.indexOf("returnIssueItem: adminProcedure");
    const fulfill = router.slice(fulfillStart, fulfillEnd);

    expect(fulfill).toContain("runInventoryTransaction");
    expect(fulfill).toContain('"pending"');
    expect(fulfill).toContain('status: "approved"');
    const database = await source("server/db.ts");

    expect(fulfill).toContain("getInventorySupplyById");
    expect(fulfill).toContain("decrementInventorySupplyStock");
    expect(database).toContain(
      "export async function decrementInventorySupplyStock"
    );
    expect(database).toContain(
      "stockQuantity: sql\`\${inventorySupplies.stockQuantity} - \${amount}\`"
    );
    expect(database).toContain(
      "sql\`\${inventorySupplies.stockQuantity} >= \${amount}\`"
    );
    expect(fulfill).toContain("createSupplyIssueSlip");
    expect(fulfill).toContain("createInventoryMovement");
    expect(fulfill).toContain('"partially_fulfilled"');
    expect(fulfill).toContain("approvedQuantity");
    expect(fulfill).toContain("updateSupplyRequestItem");
    expect(fulfill).toContain("issueSlipId");
  });

  it("shows creation and history in the employee portal and approval in QLTS", async () => {
    const [
      portal,
      queue,
      dashboard,
      manager,
      home,
      notificationLinks,
      employeeBell,
    ] = await Promise.all([
        source("client/src/components/EmployeeSupplyRequests.tsx"),
        source("client/src/components/SupplyRequestQueue.tsx"),
        source("client/src/pages/UserDashboard.tsx"),
        source("client/src/components/SupplyIssueSlipManager.tsx"),
        source("client/src/pages/Home.tsx"),
        source("client/src/lib/notificationLinks.ts"),
        source("client/src/components/EmployeeNotificationBell.tsx"),
      ]);

    expect(portal).toContain("Đề nghị cấp phụ kiện từ kho");
    expect(portal).toContain("Lịch sử yêu cầu cấp phụ kiện");
    expect(portal).toContain("trpc.supplies.createRequest");
    expect(portal).toContain("trpc.supplies.cancelRequest");
    expect(queue).toContain("Duyệt & tạo phiếu");
    expect(queue).toContain("trpc.supplies.fulfillRequest");
    expect(queue).toContain("trpc.supplies.rejectRequest");
    expect(queue).toContain("<AlertDialog");
    expect(queue).toContain("Xác nhận duyệt & tạo phiếu");
    expect(queue).toContain("Số lượng thực cấp");
    expect(queue).toContain("Xác nhận cấp một phần");
    expect(queue).toContain("const processedPageSize = 10");
    expect(queue).toContain("pagedProcessed.map");
    expect(queue).toContain("ProcessedRequestRow");
    expect(queue).toContain("Trang {activeProcessedPage}/{processedPageCount}");
    expect(queue).toContain("expandedProcessedRequestId");
    expect(queue).not.toContain("processed.slice(0, 20)");
    expect(portal).toContain("Thực cấp");
    expect(queue).not.toContain("window.confirm");
    expect(dashboard).toContain(
      "const [supplyRequestOpen, setSupplyRequestOpen] = useState(false)"
    );
    expect(dashboard).toContain("Yêu cầu phụ kiện");
    expect(dashboard).toContain(
      "supplyRequestOpen ? <div id=\"employee-supply-request-panel\""
    );
    expect(portal).toContain("expandedRequestId");
    expect(portal).toContain("aria-expanded={expanded}");
    expect(portal).toContain(
      "assetmaster-open-employee-supply-request-id"
    );
    expect(portal).toContain("data-employee-supply-request-id");
    expect(dashboard).toContain("<EmployeeNotificationBell");
    expect(employeeBell).toContain("trpc.employees.myAssetHistory");
    expect(employeeBell).toContain("trpc.supplies.myRequests");
    expect(employeeBell).toContain('"partially_fulfilled"');
    expect(employeeBell).toContain('"Chưa có thông báo mới"');
    expect(employeeBell).toContain("unread.map(notification");
    expect(home).toContain("supplyRequestNotificationsQuery");
    expect(home).toContain('kind: "supplyRequest" as const');
    expect(notificationLinks).toContain(
      'navigationLabel: "Phụ kiện"'
    );
    expect(notificationLinks).toContain(
      'key: "assetmaster-open-supply-request-id"'
    );
    expect(home).toContain(
      "unreadNotifications.length > 0 ? unreadNotifications.map"
    );
    expect(home).toContain('"Chưa có thông báo mới"');
    expect(queue).toContain("data-supply-request-id");
    expect(manager).toContain("<SupplyRequestQueue />");
  });

  it("persists employee notification reads and groups portal data into tabs", async () => {
    const [bell, dashboard, assetPanel, supplyPanel] = await Promise.all([
      source("client/src/components/EmployeeNotificationBell.tsx"),
      source("client/src/pages/UserDashboard.tsx"),
      source("client/src/components/EmployeeAssetPanel.tsx"),
      source("client/src/components/EmployeeSupplyHoldingsPanel.tsx"),
    ]);

    expect(bell).toContain(
      "trpc.notifications.dashboardAlertStates.useQuery"
    );
    expect(bell).toContain(
      "trpc.notifications.dismissDashboardAlerts.useMutation"
    );
    expect(bell).toContain("readStateQuery.isLoading");
    expect(dashboard).toContain("<EmployeeAssetPanel");
    expect(dashboard).toContain("<EmployeeSupplyHoldingsPanel");
    expect(assetPanel).toContain('role="tablist"');
    expect(assetPanel).toContain("Tài sản của bạn");
    expect(assetPanel).toContain("Đã hoàn trả");
    expect(supplyPanel).toContain('role="tablist"');
    expect(supplyPanel).toContain("Phụ kiện của bạn");
    expect(supplyPanel).toContain("trpc.supplies.myReturnRequests");
  });

  it("persists employee accessory-return requests and their source lines", async () => {
    const [schema, migration, journal] = await Promise.all([
      source("drizzle/schema.ts"),
      source("drizzle/0065_supply_return_requests.sql"),
      source("drizzle/meta/_journal.json"),
    ]);

    expect(schema).toContain("export const supplyReturnRequests = mysqlTable(");
    expect(schema).toContain("export const supplyReturnRequestItems = mysqlTable(");
    expect(schema).toContain('"issue_slip"');
    expect(schema).toContain('"handover"');
    expect(migration).toContain("CREATE TABLE \`supplyReturnRequests\`");
    expect(migration).toContain("CREATE TABLE \`supplyReturnRequestItems\`");
    expect(migration).toContain("supply_return_requests_source_idx");
    expect(journal).toContain('"tag": "0065_supply_return_requests"');
  });

  it("lets employees request accessory returns and only restores stock after admin approval", async () => {
    const [router, database, supplyPanel, manager, returnQueue] =
      await Promise.all([
        source("server/routers.ts"),
        source("server/db.ts"),
        source("client/src/components/EmployeeSupplyHoldingsPanel.tsx"),
        source("client/src/components/SupplyIssueSlipManager.tsx"),
        source("client/src/components/SupplyReturnRequestQueue.tsx"),
      ]);

    const suppliesRouter = router.slice(router.indexOf("supplies: router({"));
    expect(suppliesRouter).toContain("myReturnRequests: protectedProcedure");
    expect(suppliesRouter).toContain("createReturnRequest: protectedProcedure");
    expect(suppliesRouter).toContain("cancelReturnRequest: protectedProcedure");
    expect(suppliesRouter).toContain("adminReturnRequests: adminProcedure");
    expect(suppliesRouter).toContain("rejectReturnRequest: adminProcedure");
    expect(suppliesRouter).toContain("approveReturnRequest: adminProcedure");
    expect(suppliesRouter).toContain("runInventoryTransaction");
    expect(suppliesRouter).toContain("incrementInventorySupplyStock");
    expect(suppliesRouter).toContain(
      "incrementSupplyIssueSlipItemReturnedQuantity"
    );
    expect(suppliesRouter).toContain(
      "incrementHandoverSupplyItemReturnedQuantity"
    );
    expect(database).toContain(
      "export async function incrementInventorySupplyStock"
    );
    expect(database).toContain(
      "export async function incrementSupplyIssueSlipItemReturnedQuantity"
    );
    expect(database).toContain(
      "export async function incrementHandoverSupplyItemReturnedQuantity"
    );
    expect(supplyPanel).toContain("const totalOutstanding = slips.reduce");
    expect(supplyPanel).toContain("trpc.supplies.createReturnRequest");
    expect(supplyPanel).toContain("trpc.supplies.cancelReturnRequest");
    expect(supplyPanel).toContain("Yêu cầu hoàn trả");
    expect(returnQueue).toContain("trpc.supplies.approveReturnRequest");
    expect(returnQueue).toContain("trpc.supplies.rejectReturnRequest");
    expect(returnQueue).toContain("<AlertDialog");
    expect(manager).toContain("<SupplyReturnRequestQueue />");
  });

  it("classifies returned accessories, isolates unusable stock and creates a PDF receipt", async () => {
    const [schema, migration, journal, router, database, queue, inventory, pdf] =
      await Promise.all([
        source("drizzle/schema.ts"),
        source("drizzle/0066_supply_return_inspection_receipts.sql"),
        source("drizzle/meta/_journal.json"),
        source("server/routers.ts"),
        source("server/db.ts"),
        source("client/src/components/SupplyReturnRequestQueue.tsx"),
        source("client/src/pages/SuppliesInventoryView.tsx"),
        source("client/src/lib/supplyReturnReceiptPdf.ts"),
      ]);

    expect(schema).toContain("damagedQuantity");
    expect(schema).toContain("repairQuantity");
    expect(schema).toContain("returnReceiptCode");
    expect(schema).toContain("missingQuantity");
    expect(migration).toContain("supply_return_requests_receipt_unique");
    expect(journal).toContain(
      '"tag": "0066_supply_return_inspection_receipts"'
    );
    expect(router).toContain("deliveredByName: z.string()");
    expect(router).toContain("receivedByName: z.string()");
    expect(router).toContain("goodQuantity: z.number()");
    expect(router).toContain("incrementInventorySupplyConditionQuantity");
    expect(router).toContain(
      'const receiptCode = `BBHTPK-${now.getFullYear()}-'
    );
    expect(database).toContain(
      "export async function updateSupplyReturnRequestItem"
    );
    expect(database).toContain(
      "export async function incrementInventorySupplyConditionQuantity"
    );
    expect(queue).toContain("Kiểm đếm & duyệt");
    expect(queue).toContain("Duyệt & lập biên bản");
    expect(queue).toContain("openSupplyReturnReceiptPdf");
    expect(queue).toContain('aria-readonly="true"');
    expect(queue).not.toContain("setDeliveredByName");
    expect(queue).not.toContain("setReceivedByName");
    expect(queue).toContain("String(Number(item.requestedQuantity))");
    expect(queue).toContain(
      "min-h-0 flex-1 space-y-4 overflow-y-auto"
    );
    expect(queue).toContain(
      "shrink-0 border-t border-[#E7EEF3] bg-white"
    );
    expect(inventory).toContain("Tồn khả dụng");
    expect(inventory).toContain("selectedSupply.damagedQuantity");
    expect(pdf).toContain("BIÊN BẢN HOÀN TRẢ PHỤ KIỆN");
    expect(pdf).toContain("openPdfPreview");
  });

  it("shows pending accessory returns in the admin notification bell", async () => {
    const [home, notificationLinks, queue] = await Promise.all([
      source("client/src/pages/Home.tsx"),
      source("client/src/lib/notificationLinks.ts"),
      source("client/src/components/SupplyReturnRequestQueue.tsx"),
    ]);

    expect(home).toContain("supplyReturnRequestNotificationsQuery");
    expect(home).toContain("supplyReturnRequestNotifications");
    expect(home).toContain('type: "supplyReturnRequest" as const');
    expect(notificationLinks).toContain(
      'type: "supplyReturnRequest"; requestId: number'
    );
    expect(notificationLinks).toContain(
      '"assetmaster-open-supply-return-request-id"'
    );
    expect(queue).toContain(
      '"assetmaster-open-supply-return-request-id"'
    );
    expect(queue).toContain("data-supply-return-request-id");
  });

  it("increments return request codes from existing yearly records", async () => {
    const database = await source("server/db.ts");
    const start = database.indexOf(
      "export async function getNextSupplyReturnRequestSequence"
    );
    const end = database.indexOf(
      "export async function createSupplyReturnRequest",
      start
    );
    const sequenceHelper = database.slice(start, end);

    expect(sequenceHelper).toContain("const prefix =");
    expect(sequenceHelper).toContain("row.requestCode.slice(prefix.length)");
    expect(sequenceHelper).toContain("/^[0-9]+$/.test(rawSequence)");
    expect(sequenceHelper).toContain("return maxSequence + 1");
  });
});
