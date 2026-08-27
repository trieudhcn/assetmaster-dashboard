import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFile(path.join(process.cwd(), relativePath), "utf8");

describe("self-hosted Docker build context", () => {
  it("loại trừ dữ liệu runtime và socket MySQL khỏi lệnh COPY của Dockerfile", async () => {
    const [dockerfile, dockerignore] = await Promise.all([
      readProjectFile("Dockerfile"),
      readProjectFile(".dockerignore"),
    ]);

    expect(dockerfile).toContain("COPY . .");
    expect(dockerignore).toContain(".assetmaster-data/");
    expect(dockerignore).toContain(".assetmaster-files/");
    expect(dockerignore).toContain("secrets/");
    expect(dockerignore).toContain(".env");
  });
});
