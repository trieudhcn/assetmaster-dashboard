import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { QrCode, Search, Video, VideoOff } from "lucide-react";

export function normalizeAssetQrValue(rawValue: string) {
  return rawValue.trim().replace(/^ASSETMASTER\|/i, "");
}

export type QrScannableAsset = {
  assetCode: string;
  name: string;
  qrToken?: string | null;
  status?: string | null;
};

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

type AssetQrCaptureProps = {
  value: string;
  onValueChange: (value: string) => void;
  onScan: (value: string) => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  continuousCamera?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  helperText?: string;
  placeholder?: string;
};

export function AssetQrCapture({
  value,
  onValueChange,
  onScan,
  disabled = false,
  pending = false,
  continuousCamera = false,
  autoFocus = true,
  submitLabel = "Nhận diện tài sản",
  pendingLabel = "Đang xử lý...",
  helperText = "Máy quét USB/Bluetooth cần dùng chế độ keyboard/HID và gửi Enter sau mỗi lần quét.",
  placeholder = "Ví dụ: ASSETMASTER|a1b2c3...",
}: AssetQrCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const onValueChangeRef = useRef(onValueChange);
  const disabledRef = useRef(disabled);
  const pendingRef = useRef(pending);
  const processingRef = useRef(false);
  const lastCameraScanRef = useRef({ value: "", at: 0 });

  useEffect(() => {
    onScanRef.current = onScan;
    onValueChangeRef.current = onValueChange;
    disabledRef.current = disabled;
    pendingRef.current = pending;
  }, [disabled, onScan, onValueChange, pending]);

  const submitValue = async (rawValue = value) => {
    if (
      disabledRef.current ||
      pendingRef.current ||
      processingRef.current ||
      !normalizeAssetQrValue(rawValue)
    ) {
      return;
    }
    processingRef.current = true;
    try {
      await onScanRef.current(rawValue);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    if (!cameraOpen || disabled) {
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      return;
    }

    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    const startCamera = async () => {
      try {
        setCameraError("");
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        if (!devices.length) throw new Error("Không tìm thấy camera trên thiết bị.");
        const preferredCamera =
          devices.find((device) =>
            /back|rear|environment|sau/i.test(device.label)
          ) || devices[0];
        const videoElement = videoRef.current;
        if (!videoElement || cancelled) return;

        const controls = await reader.decodeFromVideoDevice(
          preferredCamera.deviceId,
          videoElement,
          (result) => {
            if (!result) return;
            const scannedValue = result.getText();
            const now = Date.now();
            if (
              lastCameraScanRef.current.value === scannedValue &&
              now - lastCameraScanRef.current.at < 1500
            ) {
              return;
            }
            lastCameraScanRef.current = { value: scannedValue, at: now };
            onValueChangeRef.current(scannedValue);
            void submitValue(scannedValue);
            if (!continuousCamera) {
              scannerControlsRef.current?.stop();
              scannerControlsRef.current = null;
              setCameraOpen(false);
            }
          }
        );

        if (cancelled) controls.stop();
        else scannerControlsRef.current = controls;
      } catch (error) {
        if (cancelled) return;
        scannerControlsRef.current?.stop();
        scannerControlsRef.current = null;
        setCameraOpen(false);
        const reason =
          error instanceof Error ? error.message : "Không thể truy cập camera.";
        setCameraError(
          /permission|notallowed|denied/i.test(reason)
            ? "Trình duyệt chưa được cấp quyền camera. Hãy cho phép camera rồi thử lại."
            : reason
        );
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [cameraOpen, continuousCamera, disabled]);

  return (
    <div data-asset-qr-capture>
      <button
        type="button"
        onClick={() => {
          setCameraError("");
          setCameraOpen((open) => !open);
        }}
        disabled={disabled || pending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-4 py-2.5 text-xs font-bold text-[#087A6A] transition hover:bg-[#F4FBFA] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cameraOpen ? <VideoOff size={15} /> : <Video size={15} />}
        {cameraOpen ? "Dừng camera" : "Quét bằng camera"}
      </button>

      {cameraOpen && (
        <div
          data-qr-camera-scanner
          className="mt-3 overflow-hidden rounded-xl border border-[#CDE5E5] bg-[#102A43]"
        >
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-[4/3] w-full object-cover"
          />
          <p className="bg-white px-3 py-2 text-center text-[10px] font-semibold text-[#60758A]">
            Đưa mã QR vào giữa khung hình. Camera cần HTTPS hoặc localhost.
          </p>
        </div>
      )}

      {cameraError && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-[#F2D596] bg-[#FFF9EB] px-3 py-2 text-xs font-semibold leading-5 text-[#A86B00]"
        >
          {cameraError}
        </p>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="relative">
            <QrCode
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8AA0B6]"
            />
            <input
              autoFocus={autoFocus && !cameraOpen}
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitValue();
                }
              }}
              placeholder={placeholder}
              className="field-input pl-9 font-mono"
              disabled={disabled || pending}
            />
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[#71869A]">
            {helperText}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void submitValue()}
          disabled={
            disabled || pending || !normalizeAssetQrValue(value)
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search size={15} />
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
