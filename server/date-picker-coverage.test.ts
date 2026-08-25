import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const datePickerConsumers = [
  "client/src/components/RetirementCertificateManager.tsx",
  "client/src/components/TechnologyVendorDirectoryPanel.tsx",
  "client/src/pages/EmployeeManagementView.tsx",
  "client/src/pages/Home.tsx",
  "client/src/pages/LicensesServicesManagementView.tsx",
  "client/src/pages/OperationsModules.tsx",
  "client/src/pages/PurchaseContractManagementView.tsx",
  "client/src/pages/PurchaseInvoiceManagementView.tsx",
];

describe("chuẩn DatePicker dùng chung", () => {
  it("có nút Hôm nay để chọn nhanh ngày hiện tại", () => {
    const component = readFileSync(resolve(projectRoot, "client/src/components/DatePickerField.tsx"), "utf8");
    expect(component).toContain(">Hôm nay</button>");
    expect(component).toContain("onChange(toIsoDate(today))");
  });

  it("không còn input date native và các form ngày đều dùng DatePickerField", () => {
    for (const file of datePickerConsumers) {
      const source = readFileSync(resolve(projectRoot, file), "utf8");
      expect(source).toContain("DatePickerField");
      expect(source).not.toMatch(/type=\{?['\"]date['\"]\}?/);
    }
  });
});
