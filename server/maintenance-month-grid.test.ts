import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("maintenance monthly ticket grid", () => {
  it("uses a compact budget panel and a responsive four-column ticket grid", () => {
    const home = readProjectFile("client/src/pages/Home.tsx");

    expect(home).toContain('budgetForm.className = "mt-4 grid gap-2 rounded-lg border border-[#E1EAEE] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"');
    expect(home).toContain('ticketList.className = "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"');
    expect(home).toContain('row.className = "flex min-h-[118px] flex-col rounded-lg border border-[#E1EAEE] bg-white p-3');
    expect(home).toContain('costs.className = "mt-auto pt-2 text-[11px] font-semibold leading-5 text-[#71869A]"');
    expect(home).toContain("maintenanceTicketCostSort");
    expect(home).toContain('openTicket.textContent = "Mở nhanh"');
    expect(home).toContain('assetmaster-open-maintenance-ticket-id');
  });
});
