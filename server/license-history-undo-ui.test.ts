import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Lịch sử License theo nhân viên — lọc và hoàn tác", () => {
  it("lọc các dòng lịch sử theo active/revoked và có trạng thái rỗng rõ ràng", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");

    expect(view).toContain('const [historyLicenseStatusFilter, setHistoryLicenseStatusFilter] = useState<"all" | "active" | "revoked">("all")');
    expect(view).toContain('assignment.userId === Number(historyEmployeeId) && (historyLicenseStatusFilter === "all" || assignment.status === historyLicenseStatusFilter)');
    expect(view).toContain('{ value: "active", label: "Đang cấp phát" }');
    expect(view).toContain('{ value: "revoked", label: "Đã thu hồi" }');
    expect(view).toContain('Không có License phù hợp trạng thái đã chọn.');
  });

  it("hiển thị Hoàn tác trong 5 giây sau khi thu hồi và gọi API khôi phục", () => {
    const view = read("client/src/pages/LicensesServicesManagementView.tsx");
    const router = read("server/routers.ts");
    const db = read("server/db.ts");

    expect(view).toContain("trpc.softwareLicenses.restoreAssignment.useMutation");
    expect(view).toContain('duration: 5000, action: { label: "Hoàn tác"');
    expect(view).toContain("restoreAssignment.mutate({ id: variables.id })");
    expect(router).toContain("restoreAssignment: adminProcedure");
    expect(router).toContain("findActiveDeviceLicenseDuplicate");
    expect(router).toContain("Key này không còn khả dụng để hoàn tác.");
    expect(db).toContain("export async function restoreSoftwareLicenseAssignment");
    expect(db).toContain('set({ status: "active", revokedAt: null })');
  });
});
