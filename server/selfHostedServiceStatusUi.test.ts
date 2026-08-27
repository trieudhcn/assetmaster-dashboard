import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("self-hosted service status UI", () => {
  it("chỉ hiển thị trạng thái MySQL và Redis trong Settings mà không render secret", async () => {
    const [panel, home, health] = await Promise.all([
      readFile(
        path.join(
          root,
          "client/src/components/SelfHostedServiceStatusPanel.tsx"
        ),
        "utf8"
      ),
      readFile(path.join(root, "client/src/pages/Home.tsx"), "utf8"),
      readFile(path.join(root, "server/selfHostedServiceHealth.ts"), "utf8"),
    ]);

    expect(panel).toContain("Trạng thái hạ tầng");
    expect(panel).toContain("Tự làm mới mỗi 30 giây");
    expect(panel).toContain("MySQL");
    expect(panel).toContain("Redis");
    expect(home).toContain("<SelfHostedServiceStatusPanel />");
    expect(health).toContain("selfHosted: false");
    expect(health).not.toContain("console.log");
  });
});
