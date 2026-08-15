import { describe, expect, it } from "vitest";
import { filterNamedCatalogOptions, getPaginationWindow } from "../client/src/lib/catalogUi";

describe("Catalog UI helpers", () => {
  it("clamps pagination and preserves a non-overlapping final record range", () => {
    expect(getPaginationWindow(11, 4, 10)).toEqual({ currentPage: 2, totalPages: 2, startIndex: 10, startRecord: 11, endRecord: 11 });
  });

  it("returns a neutral empty range when no asset matches the filters", () => {
    expect(getPaginationWindow(0, 1, 20)).toEqual({ currentPage: 1, totalPages: 1, startIndex: 0, startRecord: 0, endRecord: 0 });
  });

  it("finds vendor and brand names case-insensitively with Vietnamese locale matching", () => {
    const options = [{ id: 1, name: "Công ty Công nghệ Sao Mai" }, { id: 2, name: "Dell Technologies" }];
    expect(filterNamedCatalogOptions(options, "công nghệ")).toEqual([options[0]]);
    expect(filterNamedCatalogOptions(options, "DELL")).toEqual([options[1]]);
  });
});
