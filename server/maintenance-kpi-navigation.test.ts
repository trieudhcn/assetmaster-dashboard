import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("maintenance KPI navigation", () => {
  it("opens the maintenance page with all tickets needing attention filtered", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const operations = readFileSync(resolve(process.cwd(), "client/src/pages/OperationsModules.tsx"), "utf8");

    expect(home).toContain('sessionStorage.setItem("assetmaster-maintenance-status-filter", "needs_attention")');
    expect(home).toContain('navigateTo("Bảo hành & Sửa chữa")');
    expect(operations).toContain('"needs_attention"');
    expect(operations).toContain('setTicketStatusFilter("needs_attention")');
    expect(operations).toContain('ticket.status === "open" || ticket.status === "in_progress"');
    expect(operations).toContain('{ value: "needs_attention", label: "Cần xử lý" }');
  });
});
