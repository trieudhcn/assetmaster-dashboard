import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Docker Desktop guide", () => {
  it("hướng dẫn Windows/macOS, Docker Compose, setup và kho tệp dùng chung", async () => {
    const guide = await readFile(path.join(process.cwd(), "docs/docker-desktop-step-by-step.md"), "utf8");
    expect(guide).toContain("Windows 10/11");
    expect(guide).toContain("macOS");
    expect(guide).toContain("docker compose up -d --build");
    expect(guide).toContain("http://localhost:3000/setup");
    expect(guide).toContain("Kho tệp đính kèm");
    expect(guide).toContain("ASSETMASTER_FILES_DIR");
    expect(guide).toContain("Docker Desktop.** Đây là UAT/desktop stack");
    expect(guide).toContain("$rng.GetBytes($bytes)");
    expect(guide).not.toContain("RandomNumberGenerator]::Fill");
  });
});
