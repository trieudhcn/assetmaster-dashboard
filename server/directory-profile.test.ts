import { describe, expect, it } from "vitest";
import {
  normalizeDirectoryKey,
  normalizeDirectoryProfile,
  normalizeDirectoryText,
  resolveDirectoryDepartmentId,
} from "../shared/directoryProfile";

describe("directory profile synchronization", () => {
  it("chuẩn hóa Unicode tiếng Việt và khoảng trắng hồ sơ AD", () => {
    expect(normalizeDirectoryText("  Nguyễn   Văn   A  ")).toBe("Nguyễn Văn A");
    expect(normalizeDirectoryKey(" PHÒNG KỸ THUẬT ")).toBe("phòng kỹ thuật");
    expect(
      normalizeDirectoryProfile({
        name: "  Nguyễn   Văn   A ",
        email: "  NGUYEN.A@CONGTY.VN ",
        directoryUsername: "  nguyen.a ",
        department: "  PHÒNG   KỸ THUẬT ",
        jobTitle: "  Kỹ sư hệ thống ",
      })
    ).toEqual({
      name: "Nguyễn Văn A",
      email: "nguyen.a@congty.vn",
      directoryUsername: "nguyen.a",
      department: "PHÒNG KỸ THUẬT",
      jobTitle: "Kỹ sư hệ thống",
    });
  });

  it("ánh xạ phòng ban AD có dấu vào phòng ban nội bộ theo tên chuẩn hóa", () => {
    const departments = [
      { id: 7, name: "Phòng Kỹ thuật" },
      { id: 8, name: "Phòng Kế toán" },
    ];
    expect(resolveDirectoryDepartmentId("  PHÒNG   KỸ THUẬT  ", departments)).toBe(7);
    expect(resolveDirectoryDepartmentId("Phòng Không tồn tại", departments)).toBeUndefined();
  });
});
