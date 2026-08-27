import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Docker Compose self-hosted bundle", () => {
  it("khởi tạo AssetMaster cùng MySQL, Redis, healthcheck và volume bền vững", () => {
    const compose = readProjectFile("docker-compose.yml");

    expect(compose).toContain("app:");
    expect(compose).toContain("mysql:");
    expect(compose).toContain("redis:");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).toContain("assetmaster_runtime:");
    expect(compose).toContain("mysql_data:");
    expect(compose).toContain("redis_data:");
    expect(compose).toContain("127.0.0.1");
    expect(compose).toContain("assetmaster_backend:");
    expect(compose).toContain("internal: true");
    expect(compose).toContain("driver: local");
    expect(compose).toContain('max-size: "10m"');
    expect(compose).toContain("ASSETMASTER_DATA_DIR");
    expect(compose).toContain('user: "999:999"');
    expect(compose).toContain("read_only: true");
  });

  it("dùng Docker secrets thay vì đưa password vào cấu hình mẫu", () => {
    const compose = readProjectFile("docker-compose.yml");
    const envTemplate = readProjectFile("docker/compose.env.template");
    const entrypoint = readProjectFile("docker/entrypoint.sh");

    expect(compose).toContain("mysql_root_password:");
    expect(compose).toContain("mysql_app_password:");
    expect(compose).toContain("redis_password:");
    expect(compose).toContain("setup_token:");
    expect(entrypoint).toContain("load_secret MYSQL_APP_PASSWORD");
    expect(entrypoint).toContain("load_secret SELF_HOSTED_SETUP_TOKEN");
    expect(envTemplate).not.toMatch(/PASSWORD=|TOKEN=|SECRET=/);
  });

  it("build đầy đủ frontend/server và giữ migration cho wizard /setup", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toContain("corepack pnpm install --frozen-lockfile");
    expect(dockerfile).toContain("corepack pnpm run build");
    expect(dockerfile).not.toContain("corepack pnpm prune --prod");
    expect(dockerfile).toContain("Keep the complete install");
    expect(dockerfile).toContain('CMD ["node", "dist/index.js"]');
    expect(dockerfile).toContain("COPY . .");
    expect(dockerfile).toContain("USER assetmaster");
    expect(dockerfile).toContain("FROM node:22-bookworm-slim AS runtime");

    const deploymentGuide = readProjectFile(
      "docs/docker-compose-self-hosted.md"
    );
    expect(deploymentGuide).toContain("root:10001");
    expect(deploymentGuide).toContain("chmod 640");
  });
});
