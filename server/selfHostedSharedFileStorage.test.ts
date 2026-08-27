import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const previous = { enabled: process.env.SELF_HOSTED_AUTH_ENABLED, root: process.env.SELF_HOSTED_FILE_STORAGE_ROOT };
const roots: string[] = [];

afterEach(async () => {
  process.env.SELF_HOSTED_AUTH_ENABLED = previous.enabled;
  process.env.SELF_HOSTED_FILE_STORAGE_ROOT = previous.root;
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("self-hosted shared file storage", () => {
  it("chỉ ghi tệp dưới thư mục mount và chặn traversal", async () => {
    process.env.SELF_HOSTED_AUTH_ENABLED = "true";
    const root = await mkdtemp(path.join(os.tmpdir(), "assetmaster-storage-"));
    roots.push(root);
    process.env.SELF_HOSTED_FILE_STORAGE_ROOT = root;
    const { putSharedFile, testSharedDirectory } = await import("./localSharedStorage");
    const stored = await putSharedFile("attachments/contracts/test.pdf", "sample", "application/pdf");
    expect(stored.url).toContain("/api/files/attachments/contracts/");
    expect(await readFile(path.join(root, stored.key), "utf8")).toBe("sample");
    await expect(putSharedFile("../outside.txt", "blocked")).rejects.toThrow("vượt ngoài");
    await expect(testSharedDirectory("../outside")).resolves.toMatchObject({ status: "failed" });
  });
});
