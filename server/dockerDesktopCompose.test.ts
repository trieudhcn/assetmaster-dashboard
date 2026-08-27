import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Docker Desktop Compose override", () => {
  it("thay bind mount Linux bằng đường dẫn desktop và không ghi đè cấu hình production", async () => {
    const [override, template] = await Promise.all([
      readFile(path.join(process.cwd(), "docker-compose.desktop.yml"), "utf8"),
      readFile(path.join(process.cwd(), "docker/compose.env.desktop.template"), "utf8"),
    ]);
    expect(override).toContain("ASSETMASTER_DESKTOP_DATA_DIR");
    expect(override).toContain("ASSETMASTER_DESKTOP_FILES_DIR");
    expect(override).toContain("create_host_path: true");
    expect(override).not.toContain("/srv/assetmaster");
    expect(template).toContain("ASSETMASTER_DESKTOP_SECRETS_DIR=./secrets");
    expect(template).not.toContain("/srv/assetmaster");
  });
});
