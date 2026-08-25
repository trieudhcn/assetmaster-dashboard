import { describe, expect, it } from "vitest";
import { getDaysUntilExpiry, matchesExpiryFilter, sortByExpiry } from "../client/src/lib/expiryTracking";

describe("theo dõi hạn dùng Bản quyền/Dịch vụ", () => {
  it("phân loại đúng quá hạn, sắp hết hạn và không có thời hạn", () => {
    expect(matchesExpiryFilter(-2, "overdue")).toBe(true);
    expect(matchesExpiryFilter(7, "next7")).toBe(true);
    expect(matchesExpiryFilter(8, "next7")).toBe(false);
    expect(matchesExpiryFilter(30, "next30")).toBe(true);
    expect(matchesExpiryFilter(null, "noExpiry")).toBe(true);
  });

  it("sắp xếp ngày hết hạn tăng hoặc giảm, luôn đưa mục không có hạn xuống cuối", () => {
    const items = [
      { id: "no-expiry", expiresAt: null },
      { id: "late", expiresAt: "2026-10-01" },
      { id: "soon", expiresAt: "2026-09-01" },
    ];

    expect(sortByExpiry(items, "asc").map((item) => item.id)).toEqual(["soon", "late", "no-expiry"]);
    expect(sortByExpiry(items, "desc").map((item) => item.id)).toEqual(["late", "soon", "no-expiry"]);
  });

  it("tính số ngày còn lại từ một thời điểm xác định", () => {
    expect(getDaysUntilExpiry("2026-08-27T00:00:00.000Z", new Date("2026-08-25T00:00:00.000Z").getTime())).toBe(2);
  });
});
