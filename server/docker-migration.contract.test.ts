import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Docker migration runner", () => {
  it("can resolve the database URL for manual docker exec", async () => {
    const migrate = await readFile(path.join(root, "docker/migrate.mjs"), "utf8");
    expect(migrate).toContain('readSecret("MYSQL_APP_PASSWORD")');
    expect(migrate).toContain("MYSQL_APP_PASSWORD_FILE");
    expect(migrate).toContain("encodeURIComponent(password)");
    expect(migrate).toContain("ensureSupplyReturnInspectionSchema");
    expect(migrate).toContain("information_schema.COLUMNS");
    expect(migrate).toContain("information_schema.STATISTICS");
    expect(migrate).toContain("returnReceiptCode");
    expect(migrate).toContain("conditionNote");
    expect(migrate).toContain(
      "database migrations and schema are up to date"
    );
  });
});
