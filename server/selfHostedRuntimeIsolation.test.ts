import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFile(path.join(process.cwd(), relativePath), "utf8");

describe("self-hosted runtime isolation", () => {
  it("không tải OAuth hosted hoặc URL Analytics chưa được inject khi self-hosted", async () => {
    const [html, index, context] = await Promise.all([
      readProjectFile("client/index.html"),
      readProjectFile("server/_core/index.ts"),
      readProjectFile("server/_core/context.ts"),
    ]);

    expect(html).not.toContain('src="%VITE_ANALYTICS_ENDPOINT%/umami"');
    expect(html).toContain('endpoint.includes("%VITE_")');
    expect(index).toContain("if (!selfHostedAuthEnabled())");
    expect(index).toContain('await import("./oauth")');
    expect(context).not.toContain('import { sdk } from "./sdk"');
    expect(context).toContain('await import("./sdk")');
  });
});
