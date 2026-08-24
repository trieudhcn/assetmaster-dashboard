import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ticket history cost details", () => {
  it("shows actual and estimated costs in the maintenance ticket history drawer", () => {
    const operations = readFileSync(resolve(process.cwd(), "client/src/pages/OperationsModules.tsx"), "utf8");

    expect(operations).toContain("data-ticket-cost-details");
    expect(operations).toContain("Thực tế");
    expect(operations).toContain("Dự kiến");
    expect(operations).toContain("historyTicket.actualCost");
    expect(operations).toContain("historyTicket.estimatedCost");
  });
});
