export type QrScannableAsset = {
  assetCode: string;
  name: string;
  qrToken?: string | null;
  status?: string | null;
};

export function normalizeAssetQrValue(rawValue: string) {
  return rawValue.trim().replace(/^ASSETMASTER\|/i, "");
}

export function findAssetByQrValue<T extends QrScannableAsset>(
  assets: T[],
  rawValue: string
): T | null {
  const candidate = normalizeAssetQrValue(rawValue);
  if (!candidate) return null;
  return (
    assets.find(
      (asset) =>
        asset.qrToken === candidate ||
        asset.assetCode.toLowerCase() === candidate.toLowerCase()
    ) || null
  );
}
