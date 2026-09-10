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
    const [portal, queue, dashboard, manager, home, notificationLinks] =
      await Promise.all([
        source("client/src/components/EmployeeSupplyRequests.tsx"),
        source("client/src/components/SupplyRequestQueue.tsx"),
        source("client/src/pages/UserDashboard.tsx"),
        source("client/src/components/SupplyIssueSlipManager.tsx"),
        source("client/src/pages/Home.tsx"),
        source("client/src/lib/notificationLinks.ts"),
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
});
