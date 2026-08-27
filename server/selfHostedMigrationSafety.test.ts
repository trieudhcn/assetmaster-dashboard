import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("self-hosted migration safety", () => {
  it("cho phép chạy lại migration retirement sau lỗi DDL đã thêm một phần cột", async () => {
    const migration = await readFile(
      path.join(process.cwd(), "drizzle/0031_curly_nebula.sql"),
      "utf8"
    );

    expect(migration).toContain("INFORMATION_SCHEMA.COLUMNS");
    expect(migration).toContain(
      "PREPARE assetmaster_0031_retired_at_statement"
    );
    expect(migration).toContain(
      "PREPARE assetmaster_0031_retirement_reason_statement"
    );
    expect(migration).toContain(
      "'ALTER TABLE `assets` ADD `retiredAt` timestamp'"
    );
    expect(migration).toContain(
      "'ALTER TABLE `assets` ADD `retirementReason` text'"
    );
    expect(migration).not.toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration.match(/`retiredAt`/g) ?? []).toHaveLength(1);
  });
});
