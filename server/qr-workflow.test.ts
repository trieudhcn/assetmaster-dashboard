import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findAssetByQrValue,
  normalizeAssetQrValue,
  type QrScannableAsset,
} from "../client/src/lib/assetQr";

const assets: QrScannableAsset[] = [
  {
    assetCode: "LT-0001",
    name: "Laptop kiểm thử",
    qrToken: "token-laptop-1",
    status: "available",
  },
  {
    assetCode: "MN-0002",
    name: "Màn hình kiểm thử",
    qrToken: "token-monitor-2",
    status: "assigned",
  },
];

describe("AssetMaster QR helpers", () => {
  it("normalizes the printed QR payload and surrounding whitespace", () => {
    expect(normalizeAssetQrValue("  ASSETMASTER|token-laptop-1\n")).toBe(
      "token-laptop-1"
    );
    expect(normalizeAssetQrValue("assetmaster|LT-0001")).toBe("LT-0001");
  });

  it("finds an asset by QR token or case-insensitive asset code", () => {
    expect(findAssetByQrValue(assets, "ASSETMASTER|token-laptop-1")?.assetCode).toBe(
      "LT-0001"
    );
    expect(findAssetByQrValue(assets, "mn-0002")?.qrToken).toBe(
      "token-monitor-2"
    );
  });

  it("rejects empty and unknown QR values", () => {
    expect(findAssetByQrValue(assets, " ASSETMASTER| ")).toBeNull();
    expect(findAssetByQrValue(assets, "ASSETMASTER|missing-token")).toBeNull();
  });
});

describe("QR workflow integration contract", () => {
  const captureSource = readFileSync(
    resolve(process.cwd(), "client/src/components/AssetQrCapture.tsx"),
    "utf8"
  );
  const homeSource = readFileSync(
    resolve(process.cwd(), "client/src/pages/Home.tsx"),
    "utf8"
  );
  const operationsSource = readFileSync(
    resolve(process.cwd(), "client/src/pages/OperationsModules.tsx"),
    "utf8"
  );

  it("supports camera scanning and keyboard/HID Enter in the shared capture", () => {
    expect(captureSource).toContain("BrowserQRCodeReader.listVideoInputDevices()");
    expect(captureSource).toContain("reader.decodeFromVideoDevice(");
    expect(captureSource).toContain('event.key === "Enter"');
    expect(captureSource).toContain("Camera cần HTTPS hoặc localhost");
  });

  it("reuses the shared capture for lookup and continuous audit scans", () => {
    expect(homeSource).toContain("function QrLookupModal");
    expect(homeSource).toContain("<AssetQrCapture");
    expect(operationsSource).toContain("onScan={scanAuditQr}");
    expect(operationsSource).toContain("continuousCamera");
  });

  it("scans an available asset into the handover form and blocks other statuses", () => {
    expect(homeSource).toContain("function HandoverQrScannerModal");
    expect(homeSource).toContain('asset.status !== "available"');
    expect(homeSource).toContain("openCreateForAsset(asset)");
    expect(homeSource).not.toContain('showComingSoon("Quét QR để bàn giao")');
  });
});
