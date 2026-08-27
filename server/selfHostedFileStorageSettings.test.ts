import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readProjectFile = (relativePath: string) => readFile(path.join(root, relativePath), "utf8");

describe("self-hosted file storage settings", () => {
  it("cấu hình thư mục tương đối, mount Compose và giữ hosted storage riêng biệt", async () => {
    const [schema, router, storage, panel, compose] = await Promise.all(["drizzle/schema.ts", "server/routers.ts", "server/storage.ts", "client/src/components/FileStorageSettingsPanel.tsx", "docker-compose.yml"].map(readProjectFile));
    expect(schema).toContain("fileStorageSettings");
    expect(router).toContain("fileStorage: router");
    expect(router).toContain("Không được dùng đường dẫn đi ngược.");
    expect(storage).toContain("isSharedFileStorageEnabled");
    expect(storage).toContain("Admin chưa cấu hình thư mục lưu tệp self-hosted");
    expect(storage).toContain("/api/files/");
    expect(panel).toContain("Kho tệp đính kèm");
    expect(panel).toContain("Kiểm tra thư mục");
    expect(compose).toContain("SELF_HOSTED_FILE_STORAGE_ROOT: /data/files");
    expect(compose).toContain("assetmaster_files:/data/files");
  });
});
