import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("self-hosted migration safety", () => {
  it("cho phép chạy lại migration retirement sau lỗi DDL đã thêm một phần cột", async () => {
    const migration = await readFile(
      path.join(process.cwd(), "drizzle/0031_curly_nebula.sql"),
      "utf8"
    );

    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS `retiredAt` timestamp"
    );
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS `retirementReason` text"
    );
    expect(migration.match(/`retiredAt`/g) ?? []).toHaveLength(1);
  });
});
