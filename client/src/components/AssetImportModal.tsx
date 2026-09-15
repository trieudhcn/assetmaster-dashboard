import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  assetImportHeaders,
  parseAssetImportRows,
  validateAssetImportHeaders,
  type AssetImportCandidate,
  type AssetImportIssue,
} from "@/lib/assetImport";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ModalTableSkeleton } from "@/components/ModalTableSkeleton";
import { writeBrandedWorkbook } from "@/lib/brandedWorkbook";
import {
  configureAssetImportTemplate,
  uniqueTemplateNames,
} from "@/lib/assetImportTemplate";

type ParsedFile = ReturnType<typeof parseAssetImportRows> & {
  fileName: string;
  sourceRows: number;
  rawRows: Array<Record<string, unknown>>;
};

type ImportAction = "create" | "update" | "conflict";

const statusLabel = (status: AssetImportCandidate["status"]) =>
  status === "maintenance" ? "Bảo trì" : "Sẵn có";
const conditionLabel = (condition: AssetImportCandidate["condition"]) =>
  ({
    good: "Tốt",
    fair: "Khá",
    needs_inspection: "Cần kiểm tra",
    damaged: "Hư hỏng",
  })[condition];
const displayDate = (value: unknown) =>
  value ? new Date(value as string | number).toLocaleDateString("vi-VN") : "—";
const displayMoney = (value: unknown) =>
  value ? `${Number(value).toLocaleString("vi-VN")} VNĐ` : "—";

export function AssetImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const categoriesQuery = trpc.assetCategories.list.useQuery();
  const vendorsQuery = trpc.vendors.list.useQuery();
  const brandsQuery = trpc.brands.list.useQuery();
  const assetsQuery = trpc.assets.list.useQuery();
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [draftRows, setDraftRows] = useState<AssetImportCandidate[]>([]);
  const [serverIssues, setServerIssues] = useState<AssetImportIssue[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [phase, setPhase] = useState<
    "idle" | "reading" | "validating" | "ready" | "importing" | "complete"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [statusDetail, setStatusDetail] = useState(
    "Sẵn sàng tải template hoặc chọn tệp Excel."
  );
  const [isExportingErrors, setIsExportingErrors] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [bulkPreviewStatus, setBulkPreviewStatus] = useState("");

  const templateCatalogValues = useMemo(
    () => ({
      categories: uniqueTemplateNames(
        (categoriesQuery.data || []).map(item => item.name)
      ),
      vendors: uniqueTemplateNames(
        (vendorsQuery.data || []).map(item => item.name)
      ),
      brands: uniqueTemplateNames(
        (brandsQuery.data || []).map(item => item.name)
      ),
    }),
    [brandsQuery.data, categoriesQuery.data, vendorsQuery.data]
  );

  const downloadTemplate = async () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    try {
      const { categories, vendors, brands } = templateCatalogValues;
      const exampleRow = [
        "Laptop mẫu",
        categories[0] || "",
        "Sẵn có",
        "",
        "Tốt",
        "15/08/2026",
        "25000000",
        "0000001",
        vendors[0] || "",
        brands[0] || "",
        "SN-001",
        "Kho CNTT",
        "15/08/2028",
        "Điền một tài sản trên mỗi dòng",
      ];
      const book = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet([
        [...assetImportHeaders],
        exampleRow,
      ]);
      sheet["!cols"] = [
        34, 18, 25, 38, 18, 22, 18, 18, 26, 22, 20, 24, 25, 38,
      ].map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(book, sheet, "Danh sách tài sản");
      const guide = XLSX.utils.aoa_to_sheet([
        ["HƯỚNG DẪN IMPORT TÀI SẢN"],
        [
          "Cột có dấu * là bắt buộc. Không đổi tên, thêm hoặc di chuyển cột header.",
        ],
        [
          "Phân loại, Nhà cung cấp và Hãng có dropdown lấy từ dữ liệu đang hoạt động của hệ thống.",
        ],
        [
          "Mã Hóa đơn là tùy chọn. Dùng cùng một mã cho nhiều dòng để liên kết các tài sản vào cùng Hóa đơn đã có.",
        ],
        [
          "Serial/IMEI trùng sẽ được xem là cập nhật nếu công tắc cập nhật tự động đang bật.",
        ],
        [
          "Ngày dùng dd/mm/yyyy. Giá trị dùng số VNĐ nguyên, ví dụ 25000000 hoặc 25.000.000.",
        ],
      ]);
      guide["!cols"] = [{ wch: 110 }];
      XLSX.utils.book_append_sheet(book, guide, "Hướng dẫn");
      await writeBrandedWorkbook(book, {
        documentTitle: "TEMPLATE IMPORT TÀI SẢN",
        fileName: "AssetMaster-Template-Import-TaiSan.xlsx",
        description:
          "Mẫu nhập nhiều tài sản, hỗ trợ liên kết Hóa đơn theo số Hóa đơn và cập nhật theo Serial/IMEI.",
        prepareWorkbook: workbook =>
          configureAssetImportTemplate(workbook, {
            categories,
            vendors,
            brands,
          }),
        downloadDirect: true,
      });
      toast.success("Đã tải template import Tài sản.");
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải template. Vui lòng thử lại.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const closeModal = () => {
    if (phase === "reading" || phase === "validating" || phase === "importing")
      return;
    if (parsed || draftRows.length) {
      toast.warning("Đóng phiên import?", {
        description: "Dữ liệu xem trước chưa import sẽ bị hủy.",
        action: { label: "Bỏ dữ liệu", onClick: onClose },
      });
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  const importMutation = trpc.assets.import.useMutation({
    onSuccess: result => {
      setServerIssues(result.errors);
      setProgress(100);
      setPhase("complete");
      setStatusDetail(
        result.errors.length
          ? `Hoàn tất: ${result.created} tạo mới, ${result.updated} cập nhật; ${result.errors.length} dòng cần xử lý.`
          : `Hoàn tất: ${result.created} tạo mới, ${result.updated} cập nhật.`
      );
      if (result.created || result.updated) {
        toast.success(
          `Đã tạo ${result.created} và cập nhật ${result.updated} tài sản.`,
          {
            description:
              "Bạn có thể hoàn tác trong Lịch sử import ở hàng bộ lọc Danh mục tài sản.",
            action: {
              label: "Mở Lịch sử",
              onClick: () =>
                window.dispatchEvent(
                  new Event("assetmaster:open-import-history")
                ),
            },
          }
        );
        onImported();
        window.setTimeout(onClose, 650);
      }
      if (result.errors.length)
        toast.warning(`Có ${result.errors.length} dòng chưa được xử lý.`);
    },
    onError: error => {
      setPhase("ready");
      setProgress(100);
      setStatusDetail(
        "Import chưa hoàn tất; dữ liệu được giữ nguyên do transaction đã rollback."
      );
      toast.error(error.message || "Không thể import tài sản.");
    },
  });

  const processFile = (file?: File) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error("Chỉ hỗ trợ tệp Excel định dạng .xlsx.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Tệp import không được vượt quá 2 MB.");
      return;
    }
    setParsed(null);
    setDraftRows([]);
    setServerIssues([]);
    setPreviewPage(1);
    setPhase("reading");
    setProgress(8);
    setStatusDetail("Đang đọc tệp Excel...");
    const reader = new FileReader();
    reader.onprogress = event => {
      if (event.lengthComputable)
        setProgress(
          Math.max(
            8,
            Math.min(40, Math.round((event.loaded / event.total) * 40))
          )
        );
    };
    reader.onload = () => {
      try {
        setPhase("validating");
        setProgress(50);
        setStatusDetail(
          "Đang kiểm tra sheet, header, ngày tháng và số tiền..."
        );
        const book = XLSX.read(reader.result, { type: "array" });
        const templateSheet = book.Sheets["Danh sách tài sản"];
        if (!templateSheet) throw new Error("sheet");
        const headerRow =
          XLSX.utils.sheet_to_json<unknown[]>(templateSheet, {
            header: 1,
            range: 0,
            blankrows: false,
          })[0] || [];
        if (!validateAssetImportHeaders(headerRow).valid)
          throw new Error("header");
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          templateSheet,
          { defval: "", raw: false }
        );
        if (!rows.length) throw new Error("empty");
        if (rows.length > 100) throw new Error("limit");
        const result = parseAssetImportRows(rows);
        setParsed({
          ...result,
          fileName: file.name,
          sourceRows: rows.length,
          rawRows: rows,
        });
        setDraftRows(result.candidates);
        setProgress(75);
        setPhase("ready");
        setStatusDetail(
          result.issues.length
            ? `Đã đọc ${rows.length} dòng; ${result.issues.length} dòng lỗi cần xử lý trước khi import.`
            : `Đã kiểm tra ${rows.length} dòng. Sẵn sàng xem trước và import.`
        );
      } catch (error) {
        setPhase("idle");
        setProgress(0);
        const message =
          error instanceof Error && error.message === "limit"
            ? "Mỗi lần chỉ import tối đa 100 tài sản."
            : error instanceof Error && error.message === "sheet"
              ? "Không tìm thấy sheet “Danh sách tài sản”. Hãy dùng template chuẩn."
              : error instanceof Error && error.message === "header"
                ? "Header không đúng mẫu. Không đổi tên, thêm hoặc di chuyển các cột của template."
                : "Không thể đọc tệp Excel. Hãy dùng template chuẩn.";
        setStatusDetail(message);
        toast.error(message);
      }
    };
    reader.onerror = () => {
      setPhase("idle");
      setProgress(0);
      setStatusDetail("Không thể đọc tệp đã chọn.");
      toast.error("Không thể đọc tệp đã chọn.");
    };
    reader.readAsArrayBuffer(file);
  };

  const existingBySerial = useMemo(() => {
    const map = new Map<string, any[]>();
    (assetsQuery.data || []).forEach(asset => {
      const serial = asset.serialNumber?.trim();
      if (serial) map.set(serial, [...(map.get(serial) || []), asset]);
    });
    return map;
  }, [assetsQuery.data]);

  const allPreviewRows = draftRows.map(row => {
    const matches = row.serialNumber
      ? existingBySerial.get(row.serialNumber.trim()) || []
      : [];
    const action: ImportAction =
      matches.length > 1
        ? "conflict"
        : updateExisting && matches.length === 1
          ? "update"
          : "create";
    return { ...row, action, existingAsset: matches[0] || null };
  });
  const previewPageCount = Math.max(1, Math.ceil(allPreviewRows.length / 10));
  const activePreviewPage = Math.min(previewPage, previewPageCount);
  const previewRows = allPreviewRows.slice(
    (activePreviewPage - 1) * 10,
    activePreviewPage * 10
  );
  const updateRows = allPreviewRows.filter(row => row.action === "update");
  const creates = allPreviewRows.filter(row => row.action === "create").length;
  const updates = updateRows.length;
  const conflicts = allPreviewRows.filter(
    row => row.action === "conflict"
  ).length;
  const draftIssues = draftRows.flatMap(row => {
    const messages: string[] = [];
    if (row.name.trim().length < 2 || row.category.trim().length < 2)
      messages.push("Tên tài sản và Phân loại phải có ít nhất 2 ký tự.");
    if (row.status === "maintenance" && !row.maintenanceReason?.trim())
      messages.push("Tài sản Bảo trì cần có Lý do bảo trì.");
    return messages.map(message => ({ rowNumber: row.rowNumber, message }));
  });
  const issues = [...(parsed?.issues || []), ...draftIssues, ...serverIssues];
  const rowsForImport = allPreviewRows.map(
    ({ action, existingAsset, ...row }) => row
  );
  const isWorking =
    phase === "reading" || phase === "validating" || phase === "importing";

  const patchRow = (rowNumber: number, patch: Partial<AssetImportCandidate>) =>
    setDraftRows(rows =>
      rows.map(row =>
        row.rowNumber === rowNumber ? { ...row, ...patch } : row
      )
    );
  const doImport = () => {
    if (!rowsForImport.length || draftIssues.length || conflicts) return;
    setPhase("importing");
    setProgress(84);
    setStatusDetail(
      `Đang ghi ${rowsForImport.length} dòng trong một transaction an toàn...`
    );
    importMutation.mutate({ rows: rowsForImport, updateExisting });
  };
  const exportErrors = () => {
    if (!parsed || !issues.length || isExportingErrors) return;
    setIsExportingErrors(true);
    const loadingToast = toast.loading("Đang tạo tệp Excel các dòng lỗi...");
    window.setTimeout(() => {
      void (async () => {
        try {
          const rows = issues.map(issue => ({
            ...(parsed.rawRows[issue.rowNumber - 2] || {}),
            "Dòng lỗi": issue.rowNumber,
            "Lý do lỗi": issue.message,
          }));
          const book = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(
            book,
            XLSX.utils.json_to_sheet(rows),
            "Dòng lỗi"
          );
          await writeBrandedWorkbook(book, {
            documentTitle: "DANH SÁCH DÒNG LỖI IMPORT TÀI SẢN",
            fileName: `AssetMaster-Loi-Import-${new Date().toISOString().slice(0, 10)}.xlsx`,
            description: `${rows.length} dòng cần chỉnh sửa trước khi nhập lại vào hệ thống.`,
            downloadDirect: true,
          });
          toast.success(`Đã xuất ${rows.length} dòng lỗi ra Excel.`, {
            id: loadingToast,
          });
        } catch (error) {
          console.error(error);
          toast.error("Không thể xuất tệp Excel lỗi. Vui lòng thử lại.", {
            id: loadingToast,
          });
        } finally {
          setIsExportingErrors(false);
        }
      })();
    }, 180);
  };

  const progressSteps = [
    { label: "Đọc tệp", complete: progress >= 40 },
    { label: "Kiểm tra dữ liệu", complete: progress >= 75 },
    { label: "Ghi transaction", complete: progress >= 84 },
    { label: "Hoàn tất", complete: progress >= 100 },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Import tài sản từ Excel"
    >
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#DDE7F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,0.24)]">
        <header className="assetmaster-modal-header flex shrink-0 items-start justify-between border-b border-[#E7EEF3] px-6 pt-5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#087A6A]">
              <FileSpreadsheet size={14} />
              Nhập dữ liệu hàng loạt
            </div>
            <h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">
              Xem trước và chỉnh sửa import
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#71869A]">
              Kiểm tra dữ liệu trước khi ghi transaction; một Số Hóa đơn có thể
              liên kết nhiều Tài sản.
            </p>
          </div>
          <button
            onClick={closeModal}
            disabled={isWorking}
            className="rounded-lg p-2 text-[#8AA0B6] hover:bg-[#F0F5F8] disabled:opacity-50"
            aria-label="Đóng import Excel"
          >
            <X size={18} />
          </button>
        </header>
        <div className="space-y-5 p-6">
          <section className="grid gap-4 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-sm font-extrabold text-[#193B57]">
                1. Tải template chuẩn
              </div>
              <p className="mt-1 text-xs text-[#4B8884]">
                Có cột Số Hóa đơn để gán nhiều Tài sản vào cùng Hóa đơn.
              </p>
            </div>
            <button
              disabled={isDownloadingTemplate}
              onClick={() => void downloadTemplate()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8BCDC6] bg-white px-3 py-2 text-xs font-bold text-[#087A6A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download
                size={15}
                className={isDownloadingTemplate ? "animate-pulse" : ""}
              />
              {isDownloadingTemplate ? "Đang tải..." : "Tải template"}
            </button>
          </section>
          <section className="rounded-xl border border-dashed border-[#9ADBD3] bg-[#FBFEFD] p-4 text-center">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]">
              <Upload size={19} />
            </div>
            <div className="mt-2 text-sm font-extrabold text-[#193B57]">
              2. Chọn tệp Excel
            </div>
            <button
              disabled={isWorking}
              onClick={() => inputRef.current?.click()}
              className="mt-3 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Chọn tệp Excel
            </button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".xlsx"
              onChange={event => {
                processFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </section>
          <section
            className="rounded-xl border border-[#DCEDEA] bg-[#F9FEFD] p-4"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]">
                {isWorking ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : phase === "complete" ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <FileSpreadsheet size={15} />
                )}
                {statusDetail}
              </div>
              <span className="shrink-0 text-xs font-extrabold text-[#4B8884]">
                {progress}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DCEDEA]">
              <div
                className="h-full rounded-full bg-[#0F8C8C] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {progressSteps.map(step => (
                <div
                  key={step.label}
                  className={`rounded-md px-2 py-1.5 text-[10px] font-bold ${step.complete ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-white text-[#8AA0B6]"}`}
                >
                  {step.complete ? "✓ " : "○ "}
                  {step.label}
                </div>
              ))}
            </div>
          </section>
          {phase === "reading" || phase === "validating" ? (
            <section className="overflow-hidden rounded-xl border border-[#DFE9F0] bg-white">
              <ModalTableSkeleton rows={6} columns={7} />
            </section>
          ) : null}
          {parsed ? (
            <>
              <section className="rounded-xl border border-[#CDE5E5] bg-[#F9FEFD] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={event => setUpdateExisting(event.target.checked)}
                    disabled={isWorking}
                    className="mt-0.5 h-4 w-4 rounded border-[#8BCDC6] accent-[#0F8C8C]"
                  />
                  <span>
                    <span className="block text-sm font-extrabold text-[#193B57]">
                      Tự động cập nhật tài sản trùng Serial/IMEI
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#4B8884]">
                      Khi bật, một Serial/IMEI khớp duy nhất sẽ được cập nhật.
                      Khi tắt, dòng đó được tạo như tài sản mới. Luôn xem bảng
                      so sánh bên dưới trước khi xác nhận.
                    </span>
                  </span>
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-[#087A6A]">{creates}</b>
                    <span className="text-[#60758A]">Tạo mới</span>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-[#2666A8]">{updates}</b>
                    <span className="text-[#60758A]">Cập nhật</span>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-[#A86B00]">{conflicts}</b>
                    <span className="text-[#60758A]">Xung đột Serial</span>
                  </div>
                </div>
              </section>
              <section className="overflow-hidden rounded-xl border border-[#DFE9F0]">
                <div className="border-b border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-[#193B57]">
                        3. Xem trước lô dữ liệu · {parsed.fileName}
                      </div>
                      <p className="mt-1 text-[11px] text-[#71869A]">
                        {parsed.sourceRows} dòng nguồn. Bạn có thể chỉnh sửa
                        trực tiếp trước khi import.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Trang preview import tài sản trước"
                        disabled={activePreviewPage <= 1}
                        onClick={() =>
                          setPreviewPage(page => Math.max(1, page - 1))
                        }
                        className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#526779] disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="min-w-20 text-center text-[11px] font-bold text-[#60758A]">
                        Trang {activePreviewPage}/{previewPageCount}
                      </span>
                      <button
                        type="button"
                        aria-label="Trang preview import tài sản sau"
                        disabled={activePreviewPage >= previewPageCount}
                        onClick={() =>
                          setPreviewPage(page =>
                            Math.min(previewPageCount, page + 1)
                          )
                        }
                        className="grid h-8 w-8 place-items-center rounded-md border border-[#DDE7F0] text-[#526779] disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 max-w-sm">
                    <SearchableSelect
                      value={bulkPreviewStatus}
                      onChange={status => {
                        setBulkPreviewStatus(status);
                        previewRows.forEach(row =>
                          patchRow(row.rowNumber, {
                            status: status as AssetImportCandidate["status"],
                            maintenanceReason:
                              status === "maintenance"
                                ? row.maintenanceReason
                                : null,
                          })
                        );
                      }}
                      options={[
                        { value: "available", label: "Sẵn có" },
                        { value: "maintenance", label: "Bảo trì" },
                      ]}
                      placeholder="Đặt trạng thái cho trang này"
                      searchPlaceholder="Tìm trạng thái..."
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[1160px] text-left text-xs">
                    <thead className="sticky top-0 bg-[#F1F3F5] text-[10px] uppercase tracking-[.08em] text-[#526779]">
                      <tr>
                        <th className="px-3 py-3">Dòng</th>
                        <th className="px-3 py-3">Hành động</th>
                        <th className="px-3 py-3">Tên tài sản</th>
                        <th className="px-3 py-3">Phân loại</th>
                        <th className="px-3 py-3">Serial/IMEI</th>
                        <th className="px-3 py-3">Trạng thái</th>
                        <th className="px-3 py-3">Mã Hóa đơn</th>
                        <th className="px-3 py-3">Nhà cung cấp</th>
                        <th className="px-3 py-3">Giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map(row => (
                        <tr
                          key={row.rowNumber}
                          className="border-t border-[#EDF2F5]"
                        >
                          <td className="px-3 py-2.5 font-mono text-[#0F8C8C]">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2">
                            {row.action === "update" ? (
                              <span className="rounded-full bg-[#EAF3FF] px-2 py-1 text-[10px] font-extrabold text-[#2666A8]">
                                Cập nhật
                              </span>
                            ) : row.action === "conflict" ? (
                              <span className="rounded-full bg-[#FFF5DC] px-2 py-1 text-[10px] font-extrabold text-[#A86B00]">
                                Xung đột
                              </span>
                            ) : (
                              <span className="rounded-full bg-[#E6F6F2] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">
                                Tạo mới
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.name}
                              onChange={event =>
                                patchRow(row.rowNumber, {
                                  name: event.target.value,
                                })
                              }
                              className="h-8 w-44 rounded border border-[#DDE7F0] px-2 font-semibold text-[#193B57] focus:border-[#0F8C8C] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.category}
                              onChange={event =>
                                patchRow(row.rowNumber, {
                                  category: event.target.value,
                                })
                              }
                              className="h-8 w-32 rounded border border-[#DDE7F0] px-2 text-[#60758A] focus:border-[#0F8C8C] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.serialNumber || ""}
                              onChange={event =>
                                patchRow(row.rowNumber, {
                                  serialNumber: event.target.value || null,
                                })
                              }
                              className="h-8 w-32 rounded border border-[#DDE7F0] px-2 text-[#60758A] focus:border-[#0F8C8C] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.status}
                              onChange={event =>
                                patchRow(row.rowNumber, {
                                  status: event.target
                                    .value as AssetImportCandidate["status"],
                                  maintenanceReason:
                                    event.target.value === "maintenance"
                                      ? row.maintenanceReason
                                      : null,
                                })
                              }
                              className="h-8 rounded border border-[#DDE7F0] bg-white px-2 text-[#60758A]"
                            >
                              <option value="available">Sẵn có</option>
                              <option value="maintenance">Bảo trì</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.invoiceNumber || ""}
                              onChange={event =>
                                patchRow(row.rowNumber, {
                                  invoiceNumber: event.target.value || null,
                                })
                              }
                              className="h-8 w-28 rounded border border-[#DDE7F0] px-2 font-mono text-[#60758A] focus:border-[#0F8C8C] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-[#60758A]">
                            {row.vendor || "—"}
                          </td>
                          <td className="px-3 py-2 text-[#60758A]">
                            {displayMoney(row.purchaseValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              {updateRows.length ? (
                <section className="overflow-hidden rounded-xl border border-[#B9D7F5] bg-[#F7FBFF]">
                  <div className="border-b border-[#DDEBFA] px-4 py-3">
                    <div className="text-sm font-extrabold text-[#193B57]">
                      Trường sẽ thay đổi khi cập nhật
                    </div>
                    <p className="mt-1 text-xs text-[#4E7CAA]">
                      Chỉ các dòng Serial/IMEI khớp duy nhất mới xuất hiện tại
                      đây.
                    </p>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full min-w-[780px] text-left text-xs">
                      <thead className="bg-[#EAF3FF] text-[10px] uppercase tracking-[.08em] text-[#376EAA]">
                        <tr>
                          <th className="px-3 py-3">Tài sản</th>
                          <th className="px-3 py-3">Serial/IMEI</th>
                          <th className="px-3 py-3">Trường</th>
                          <th className="px-3 py-3">Hiện tại</th>
                          <th className="px-3 py-3">Sau import</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updateRows.flatMap(row => {
                          const current = row.existingAsset as any;
                          const currentCategory =
                            (categoriesQuery.data || []).find(
                              item => item.id === current?.categoryId
                            )?.name || "—";
                          const currentBrand =
                            (brandsQuery.data || []).find(
                              item => item.id === current?.brandId
                            )?.name || "—";
                          const changes = [
                            ["Tên tài sản", current?.name || "—", row.name],
                            ["Phân loại", currentCategory, row.category],
                            [
                              "Trạng thái",
                              current?.status === "maintenance"
                                ? "Bảo trì"
                                : "Sẵn có",
                              statusLabel(row.status),
                            ],
                            [
                              "Tình trạng",
                              current?.condition
                                ? conditionLabel(current.condition)
                                : "—",
                              conditionLabel(row.condition),
                            ],
                            [
                              "Ngày mua",
                              displayDate(current?.purchaseDate),
                              displayDate(row.purchaseDate),
                            ],
                            [
                              "Giá trị",
                              displayMoney(current?.purchaseValue),
                              displayMoney(row.purchaseValue),
                            ],
                            [
                              "Nhà cung cấp",
                              current?.vendor || "—",
                              row.vendor || "—",
                            ],
                            ["Hãng", currentBrand, row.brandName || "—"],
                            [
                              "Vị trí",
                              current?.location || "—",
                              row.location || "—",
                            ],
                            [
                              "Hạn bảo hành",
                              displayDate(current?.warrantyUntil),
                              displayDate(row.warrantyUntil),
                            ],
                          ].filter(
                            ([, before, after]) =>
                              String(before) !== String(after)
                          );
                          return changes.length ? (
                            changes.map(([field, before, after], index) => (
                              <tr
                                key={`${row.rowNumber}-${field}`}
                                className="border-t border-[#E4EFFB]"
                              >
                                <td className="px-3 py-2 text-[#193B57]">
                                  {index === 0 ? current?.name : ""}
                                </td>
                                <td className="px-3 py-2 font-mono text-[#60758A]">
                                  {index === 0 ? row.serialNumber : ""}
                                </td>
                                <td className="px-3 py-2 font-semibold text-[#376EAA]">
                                  {field}
                                </td>
                                <td className="px-3 py-2 text-[#8A6C55]">
                                  {before}
                                </td>
                                <td className="px-3 py-2 font-semibold text-[#087A6A]">
                                  {after}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr
                              key={`${row.rowNumber}-unchanged`}
                              className="border-t border-[#E4EFFB]"
                            >
                              <td className="px-3 py-2 text-[#193B57]">
                                {current?.name}
                              </td>
                              <td className="px-3 py-2 font-mono text-[#60758A]">
                                {row.serialNumber}
                              </td>
                              <td
                                className="px-3 py-2 text-[#60758A]"
                                colSpan={3}
                              >
                                Không có trường nào thay đổi.
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
          {issues.length ? (
            <section className="rounded-xl border border-[#F2D596] bg-[#FFF9EB] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#8F5A00]">
                  <AlertTriangle size={15} />
                  Các dòng cần xử lý ({issues.length})
                </div>
                <button
                  onClick={exportErrors}
                  disabled={isExportingErrors}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E7C981] bg-white px-3 py-2 text-xs font-bold text-[#A86B00] disabled:opacity-60"
                >
                  <Download size={14} />
                  {isExportingErrors ? "Đang xuất..." : "Xuất Excel lỗi"}
                </button>
              </div>
              <div className="mt-3 max-h-28 space-y-1 overflow-auto text-xs leading-5 text-[#9B7131]">
                {issues.slice(0, 20).map((issue, index) => (
                  <div key={`${issue.rowNumber}-${index}`}>
                    <b>Dòng {issue.rowNumber}:</b> {issue.message}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-[#E7EEF3] pt-4 sm:flex-row">
            <button
              onClick={closeModal}
              disabled={isWorking}
              className="modal-close-action"
            >
              Đóng
            </button>
            <button
              disabled={
                !rowsForImport.length ||
                isWorking ||
                draftIssues.length > 0 ||
                conflicts > 0
              }
              onClick={doImport}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={15} />
              {phase === "importing"
                ? "Đang import an toàn..."
                : `Xác nhận import ${rowsForImport.length} tài sản`}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
