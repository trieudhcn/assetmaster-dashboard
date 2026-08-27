import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("self-hosted wizard and Directory access UI", () => {
  it("trình bày installer dưới dạng wizard ba bước với kiểm tra MySQL trước khi khởi tạo", async () => {
    const source = await readFile(path.join(root, "client/src/pages/SetupInstaller.tsx"), "utf8");
    expect(source).toContain("Bước {step}/3");
    expect(source).toContain("Website & Admin");
    expect(source).toContain("Kiểm tra MySQL");
    expect(source).toContain("Rà soát và khởi tạo");
    expect(source).toContain("!databaseStepValid");
  });

  it("ẩn Directory đến khi icon điều hướng phát sự kiện mở và mô tả hai quyền LDAP", async () => {
    const [panel, nav] = await Promise.all([
      readFile(path.join(root, "client/src/components/DirectorySettingsPanel.tsx"), "utf8"),
      readFile(path.join(root, "client/src/components/SettingsQuickNav.tsx"), "utf8"),
    ]);
    expect(panel).toContain("const [isVisible, setIsVisible] = useState(false)");
    expect(panel).toContain("assetmaster:open-directory-settings");
    expect(panel).toContain("DN nhóm Admin");
    expect(panel).toContain("DN nhóm User");
    expect(panel).toContain("Ngoài nhóm được ánh xạ");
    expect(nav).toContain("Mở cấu hình Directory LDAP/AD");
  });
});
