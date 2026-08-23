import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArchiveRestore, Boxes, ClipboardList, Download, FileSpreadsheet, History, PackageMinus, PackagePlus, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload, UsersRound, X } from "lucide-react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SearchableSelect } from "@/components/SearchableSelect";
import { SupplyIssueSlipManager } from "@/components/SupplyIssueSlipManager";
import { EditableSectionLabel } from "@/components/EditableSectionLabel";
import { formatVndInput, isInvalidVndInput, normalizeVndIntegerInput, numberToVietnameseWords, parseVndAmount } from "@/lib/formatters";
import { openSupplyIssueSlipPdf } from "@/lib/supplyIssueSlipPdf";
import { buildSupplyImportTemplate, resolveActiveSupplyImportCatalog, standardSupplyUnits } from "@/lib/supplyImportTemplate";
import { isInvalidWholeQuantity } from "@shared/quantity";

const PAGE_SIZE = 10;
const MOVEMENT_HISTORY_PAGE_SIZE = 5;
type SupplyForm = { code: string; name: string; unit: string; openingQuantity: string; minimumQuantity: string; unitCost: string; location: string; categoryId: string; vendorId: string; brandId: string; purchaseContractId: string; note: string };
type IssueDraftItem = { supplyId: string; quantity: string };
type IssuePreviewItem = { supplyId: number; supplyName: string; unit: string; quantity: number; stockAfterIssue: number; minimumStock: number };
type CreatedIssueSlipPdf = { referenceCode: string; recipientName: string; issuedAt: Date; note: string | null; items: Array<{ supplyCode: string; supplyName: string; unit: string; issuedQuantity: string; returnedQuantity: string }> };
const emptyForm: SupplyForm = { code: "", name: "", unit: "Cái", openingQuantity: "0", minimumQuantity: "0", unitCost: "", location: "", categoryId: "", vendorId: "", brandId: "", purchaseContractId: "", note: "" };
const quantity = (value: string | number | null | undefined) => Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const money = (value: string | number | null | undefined) => value === null || value === undefined ? "—" : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VNĐ`;

export function SuppliesInventoryView({ canEditSectionLabels = false }: { canEditSectionLabels?: boolean }) {
  const utils = trpc.useUtils();
  const suppliesQuery = trpc.supplies.list.useQuery();
  const categoriesQuery = trpc.assetCategories.list.useQuery();
  const vendorsQuery = trpc.vendors.list.useQuery();
  const brandsQuery = trpc.brands.list.useQuery();
  const purchaseContractsQuery = trpc.purchaseContracts.list.useQuery();
  const departmentsQuery = trpc.departments.list.useQuery();
  const usersQuery = trpc.employees.list.useQuery();
  const [form, setForm] = useState<SupplyForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [quickGroupName, setQuickGroupName] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [movementHistoryPage, setMovementHistoryPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editPurchaseContractId, setEditPurchaseContractId] = useState("");
  const editPurchaseContractIdRef = useRef("");
  const [movementType, setMovementType] = useState<"receipt" | "issue" | "adjustment">("receipt");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [recipientMode, setRecipientMode] = useState<"staff" | "other">("staff");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientDepartmentId, setRecipientDepartmentId] = useState("");
  const [movementNote, setMovementNote] = useState("");
  const [issueItems, setIssueItems] = useState<IssueDraftItem[]>([]);
  const [issueSupplyPicker, setIssueSupplyPicker] = useState("");
  const [issueConfirmationOpen, setIssueConfirmationOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplyImportHistoryOpen, setSupplyImportHistoryOpen] = useState(false);
  const supplies = suppliesQuery.data || [];
  const selectedSupply = supplies.find((item) => item.id === selectedId) || null;
  const editingSupply = supplies.find((item) => item.id === editingId) || null;
  const projectedStockAfterIssue = selectedSupply ? Math.max(0, Number(selectedSupply.stockQuantity) - Math.max(0, Number(movementQuantity || 0))) : 0;
  const issueDropsBelowMinimum = selectedSupply ? projectedStockAfterIssue < Number(selectedSupply.minimumQuantity) : false;
  const issuePreviewItems = useMemo<IssuePreviewItem[]>(() => issueItems.map((item) => {
    const supply = supplies.find((candidate) => candidate.id === Number(item.supplyId));
    const itemQuantity = Number(item.quantity);
    if (!supply || !Number.isFinite(itemQuantity) || itemQuantity <= 0) return null;
    return { supplyId: supply.id, supplyName: supply.name, unit: supply.unit, quantity: itemQuantity, stockAfterIssue: Number(supply.stockQuantity) - itemQuantity, minimumStock: Number(supply.minimumQuantity) };
  }).filter((item): item is IssuePreviewItem => item !== null), [issueItems, supplies]);
  const issueItemsHaveFractionalWholeUnit = issueItems.some((item) => {
    const supply = supplies.find((candidate) => candidate.id === Number(item.supplyId));
    return Boolean(supply && isInvalidWholeQuantity(supply.unit, item.quantity));
  });
  const issueItemsHaveInvalidValue = issueItems.length === 0 || issuePreviewItems.length !== issueItems.length || issuePreviewItems.some((item) => item.stockAfterIssue < 0) || issueItemsHaveFractionalWholeUnit;
  const lowStockIssueItems = issuePreviewItems.filter((item) => item.stockAfterIssue < item.minimumStock);
  const issueSupplyOptions = [{ value: "", label: "Chọn phụ kiện để thêm" }, ...supplies.filter((item) => item.isActive && !issueItems.some((draft) => Number(draft.supplyId) === item.id)).map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name} · còn ${quantity(item.stockQuantity)} ${item.unit}`, searchText: `${item.code} ${item.name}` }))];
  const movementHistory = trpc.supplies.history.useQuery({ supplyId: selectedId || 0, page: movementHistoryPage, pageSize: MOVEMENT_HISTORY_PAGE_SIZE }, { enabled: selectedId !== null });
  useEffect(() => { setMovementHistoryPage(1); }, [selectedId]);

  const createSupply = trpc.supplies.create.useMutation({ onSuccess: () => { toast.success("Đã tạo phụ kiện."); setForm(emptyForm); setCreateModalOpen(false); void utils.supplies.list.invalidate(); }, onError: (error) => toast.error(error.message || "Không thể tạo phụ kiện.") });
  const createAccessoryGroup = trpc.assetCategories.createAccessoryGroup.useMutation({ onSuccess: (group) => { toast.success(`Đã tạo nhóm phụ kiện ${group.name}.`); setGroupFilter(String(group.id)); setQuickGroupName(null); void utils.assetCategories.list.invalidate(); }, onError: (error) => toast.error(error.message || "Không thể tạo nhóm phụ kiện.") });
  const updateSupply = trpc.supplies.update.useMutation({ onSuccess: () => { toast.success("Đã cập nhật phụ kiện."); setEditingId(null); void utils.supplies.list.invalidate(); }, onError: (error) => toast.error(error.message || "Không thể cập nhật phụ kiện.") });
  const moveSupply = trpc.supplies.move.useMutation({ onSuccess: (result) => { toast.success(result.isLowStock ? "Đã ghi nhận giao dịch · tồn kho thấp." : "Đã ghi nhận giao dịch."); setMovementQuantity(""); setRecipientUserId(""); setRecipientName(""); setRecipientDepartmentId(""); setMovementNote(""); void utils.supplies.list.invalidate(); void utils.supplies.history.invalidate(); }, onError: (error) => toast.error(error.message || "Không thể ghi nhận giao dịch.") });
  const previewIssueSlipPdf = async (slip: CreatedIssueSlipPdf) => {
    try {
      await openSupplyIssueSlipPdf({ referenceCode: slip.referenceCode, recipientName: slip.recipientName, issuedByName: null, issuedAt: slip.issuedAt, note: slip.note }, slip.items);
      toast.success("Đã mở xem trước PDF.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo bản PDF của phiếu cấp phát.");
    }
  };
  const createIssueSlip = trpc.supplies.createIssueSlip.useMutation({ onSuccess: (result) => { const recipient = recipientMode === "staff" ? selectedRecipient?.name || "Nhân sự được chọn" : recipientName.trim(); const createdSlip: CreatedIssueSlipPdf = { referenceCode: result.referenceCode, recipientName: recipient, issuedAt: new Date(), note: movementNote.trim() || null, items: issuePreviewItems.map((item) => ({ supplyCode: supplies.find((supply) => supply.id === item.supplyId)?.code || "—", supplyName: item.supplyName, unit: item.unit, issuedQuantity: String(item.quantity), returnedQuantity: "0" })) }; toast.success(`Đã tạo phiếu ${result.referenceCode}.`, { action: { label: "Xem & in PDF", onClick: () => { void previewIssueSlipPdf(createdSlip); } } }); setIssueConfirmationOpen(false); setMovementQuantity(""); setIssueItems([]); setIssueSupplyPicker(""); setRecipientUserId(""); setRecipientName(""); setRecipientDepartmentId(""); setMovementNote(""); void utils.supplies.list.invalidate(); void utils.supplies.issueSlips.invalidate(); void utils.supplies.history.invalidate(); }, onError: (error) => toast.error(error.message || "Không thể tạo phiếu cấp phát.") });

  const categoryOptions = [{ value: "", label: "Chưa gán phân loại", isActive: true }, ...(categoriesQuery.data || []).map((item) => ({ value: String(item.id), label: item.name, isActive: item.isActive }))];
  const groupFilterOptions = [{ value: "all", label: "Tất cả nhóm" }, { value: "unassigned", label: "Chưa gán nhóm" }, ...(categoriesQuery.data || []).map((item) => ({ value: String(item.id), label: item.name }))];
  const vendorOptions = [{ value: "", label: "Chưa chọn nhà cung cấp", isActive: true }, ...(vendorsQuery.data || []).map((item) => ({ value: String(item.id), label: item.name, isActive: item.isActive }))];
  const brandOptions = [{ value: "", label: "Chưa chọn hãng", isActive: true }, ...(brandsQuery.data || []).map((item) => ({ value: String(item.id), label: item.name, isActive: item.isActive }))];
  const purchaseContractOptions = [{ value: "", label: "Chưa liên kết hợp đồng", isActive: true }, ...(purchaseContractsQuery.data || []).filter((item) => item.status !== "cancelled").map((item) => ({ value: String(item.id), label: `${item.referenceCode} · ${item.title}`, searchText: `${item.referenceCode} ${item.title}` }))];
  const departmentOptions = [{ value: "", label: "Không gán phòng ban" }, ...(departmentsQuery.data || []).map((item) => ({ value: String(item.id), label: item.name }))];
  const personnelOptions = [{ value: "", label: "Chọn nhân sự" }, ...(usersQuery.data || []).filter((item) => item.isActive).map((item) => ({ value: String(item.id), label: item.name || item.email || `Nhân sự #${item.id}`, searchText: item.email || "" }))];
  const selectedRecipient = (usersQuery.data || []).find((item) => String(item.id) === recipientUserId);
  const departmentAutoLocked = recipientMode === "staff" && Boolean(selectedRecipient?.departmentId);
  const selectedDepartmentName = departmentOptions.find((option) => option.value === recipientDepartmentId)?.label || "Chưa gán phòng ban";
  const categoriesById = new Map((categoriesQuery.data || []).map((item) => [item.id, item.name]));
  const filtered = useMemo(() => supplies.filter((item) => {
    const matchesSearch = `${item.code} ${item.name} ${item.location || ""}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN").trim());
    const matchesGroup = groupFilter === "all" || (groupFilter === "unassigned" ? !item.categoryId : String(item.categoryId) === groupFilter);
    return matchesSearch && matchesGroup && (!lowOnly || Number(item.stockQuantity) <= Number(item.minimumQuantity));
  }), [supplies, groupFilter, lowOnly, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const rows = filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const lowCount = supplies.filter((item) => Number(item.stockQuantity) <= Number(item.minimumQuantity)).length;
  const totalUnits = supplies.reduce((total, item) => total + Number(item.stockQuantity), 0);

  const submitCreate = () => {
    if (!form.code.trim() || !form.name.trim()) return toast.error("Vui lòng nhập mã và tên phụ kiện.");
    if (isInvalidWholeQuantity(form.unit, form.openingQuantity) || isInvalidWholeQuantity(form.unit, form.minimumQuantity)) return toast.error(`Đơn vị ${form.unit || "Cái"} chỉ nhận số lượng nguyên.`);
    if (isInvalidVndInput(form.unitCost)) return toast.error("Đơn giá không đúng định dạng. Chỉ nhập chữ số nguyên.");
    createSupply.mutate({ code: form.code, name: form.name, unit: form.unit || "Cái", openingQuantity: Number(form.openingQuantity || 0), minimumQuantity: Number(form.minimumQuantity || 0), unitCost: form.unitCost ? Number(form.unitCost) : null, location: form.location || null, categoryId: form.categoryId ? Number(form.categoryId) : null, vendorId: form.vendorId ? Number(form.vendorId) : null, brandId: form.brandId ? Number(form.brandId) : null, purchaseContractId: form.purchaseContractId ? Number(form.purchaseContractId) : null, note: form.note || null });
  };
  const submitMovement = () => {
    if (movementType === "issue") {
      if (!movementNote.trim()) return toast.error("Vui lòng nhập ghi chú cấp phát.");
      if (recipientMode === "staff" && !recipientUserId) return toast.error("Vui lòng chọn nhân sự nhận phụ kiện.");
      if (recipientMode === "other" && !recipientName.trim()) return toast.error("Vui lòng nhập người nhận khác.");
      if (issueItemsHaveInvalidValue) return toast.error("Mỗi phụ kiện trong phiếu cần có số lượng hợp lệ và không vượt tồn kho.");
      if (new Set(issuePreviewItems.map((item) => item.supplyId)).size !== issuePreviewItems.length) return toast.error("Một phụ kiện chỉ được chọn một lần trong cùng phiếu.");
      setIssueConfirmationOpen(true);
      return;
    }
    if (!selectedSupply || !movementQuantity || !movementNote.trim()) return toast.error("Vui lòng nhập số lượng và ghi chú giao dịch.");
    if (isInvalidWholeQuantity(selectedSupply.unit, movementQuantity)) return toast.error(`Đơn vị ${selectedSupply.unit} chỉ nhận số lượng nguyên.`);
    moveSupply.mutate({ supplyId: selectedSupply.id, movementType, quantity: Number(movementQuantity), recipientUserId: null, recipientName: undefined, recipientDepartmentId: recipientDepartmentId ? Number(recipientDepartmentId) : null, note: movementNote.trim() });
  };
  const confirmIssueSlip = () => {
    if (issueItemsHaveInvalidValue) return;
    createIssueSlip.mutate({ recipientUserId: recipientMode === "staff" ? Number(recipientUserId) : null, recipientName: recipientMode === "other" ? recipientName.trim() : undefined, recipientDepartmentId: recipientDepartmentId ? Number(recipientDepartmentId) : null, note: movementNote.trim(), items: issuePreviewItems.map((item) => ({ supplyId: item.supplyId, quantity: item.quantity })) });
  };
  const openIssueForm = () => {
    setMovementType("issue");
    setIssueSupplyPicker("");
    setIssueItems((current) => current.length ? current : selectedSupply ? [{ supplyId: String(selectedSupply.id), quantity: "" }] : current);
  };
  const addIssueSupply = (supplyId: string) => {
    if (!supplyId) return;
    setIssueItems((current) => current.some((item) => item.supplyId === supplyId) ? current : [...current, { supplyId, quantity: "" }]);
    setIssueSupplyPicker("");
  };
  const updateIssueQuantity = (supplyId: string, value: string) => setIssueItems((current) => current.map((item) => item.supplyId === supplyId ? { ...item, quantity: value } : item));
  const removeIssueSupply = (supplyId: string) => setIssueItems((current) => current.filter((item) => item.supplyId !== supplyId));
  useEffect(() => {
    if (recipientMode !== "staff" || !recipientUserId) return;
    const recipient = (usersQuery.data || []).find((item) => String(item.id) === recipientUserId);
    const departmentId = recipient?.departmentId ? String(recipient.departmentId) : "";
    setRecipientDepartmentId((current) => current === departmentId ? current : departmentId);
  }, [recipientMode, recipientUserId, usersQuery.data]);
  useEffect(() => {
    const receiptSupplyId = Number(sessionStorage.getItem("assetmaster-open-supply-receipt-id") || 0);
    if (!receiptSupplyId || !supplies.some((supply) => supply.id === receiptSupplyId)) return;
    sessionStorage.removeItem("assetmaster-open-supply-receipt-id");
    setSelectedId(receiptSupplyId);
    setMovementType("receipt");
    setMovementQuantity("");
    setMovementNote("");
  }, [supplies]);
  const beginEdit = (id: number) => { const item = supplies.find((supply) => supply.id === id); if (!item) return; const contractId = item.purchaseContractId ? String(item.purchaseContractId) : ""; setEditingId(id); setEditCode(item.code); setEditName(item.name); setEditPurchaseContractId(contractId); editPurchaseContractIdRef.current = contractId; };
  useEffect(() => {
    if (!editingSupply) return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((element) => element.textContent?.includes("Định danh phụ kiện"));
      const editor = dialog?.querySelector<HTMLElement>(".space-y-3");
      const nameInput = Array.from(dialog?.querySelectorAll("label") || []).find((label) => label.textContent?.includes("Tên phụ kiện"))?.querySelector<HTMLInputElement>("input");
      const saveButton = dialog?.querySelector<HTMLButtonElement>("button.primary-action");
      if (!dialog || !editor || !nameInput || !saveButton || editor.dataset.editCurrencyReady === "true") return;
      editor.dataset.editCurrencyReady = "true";
      const field = document.createElement("label");
      field.className = "block space-y-2";
      const caption = document.createElement("span");
      caption.className = "text-xs font-extrabold text-[#526779]";
      caption.textContent = "Đơn giá VNĐ";
      const inputWrap = document.createElement("div");
      inputWrap.className = "relative";
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "numeric";
      input.className = "field-input w-full pr-[6.5rem]";
      input.placeholder = "Ví dụ: 42.500.000";
      const suffix = document.createElement("span");
      suffix.className = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[#087A6A]";
      suffix.textContent = "VNĐ";
      const clear = document.createElement("button");
      clear.type = "button";
      clear.setAttribute("aria-label", "Xóa đơn giá");
      clear.title = "Xóa đơn giá";
      clear.className = "absolute right-11 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]";
      clear.textContent = "×";
      const words = document.createElement("p");
      words.className = "pl-1 text-[10px] font-medium leading-4 text-[#8AA0B6]";
      const formatError = document.createElement("p");
      formatError.className = "text-[10px] font-medium leading-4 text-[#B44545]";
      const commit = (raw: string) => { const digits = normalizeVndIntegerInput(raw); const formatted = digits ? formatVndInput(digits) : ""; input.value = formatted; input.dataset.rawValue = digits; input.style.borderColor = ""; input.style.backgroundColor = ""; words.textContent = formatted ? numberToVietnameseWords(formatted) : ""; clear.style.display = formatted ? "grid" : "none"; formatError.textContent = ""; };
      commit(editingSupply.unitCost === null ? "" : String(editingSupply.unitCost));
      const handleEditCurrencyInput = () => { commit(input.value); };
      const handleClear = () => { commit(""); input.focus(); };
      input.addEventListener("input", handleEditCurrencyInput);
      clear.addEventListener("click", handleClear);
      inputWrap.append(input, clear, suffix);
      field.append(caption, inputWrap, words, formatError);
      const saveHandler = (event: Event) => { event.preventDefault(); event.stopPropagation(); const raw = input.dataset.rawValue || ""; updateSupply.mutate({ id: editingSupply.id, name: nameInput.value, unitCost: raw ? Number(raw) : null, purchaseContractId: editPurchaseContractIdRef.current ? Number(editPurchaseContractIdRef.current) : null }); };
      saveButton.addEventListener("click", saveHandler, true);
      const actions = editor.querySelector(".mt-5.flex");
      if (actions) editor.insertBefore(field, actions); else editor.append(field);
      return () => { input.removeEventListener("input", handleEditCurrencyInput); clear.removeEventListener("click", handleClear); saveButton.removeEventListener("click", saveHandler, true); field.remove(); delete editor.dataset.editCurrencyReady; };
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingSupply?.id]);
  useEffect(() => {
    if (!editingSupply) return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((element) => element.textContent?.includes("Định danh phụ kiện"));
      const editor = dialog?.querySelector<HTMLElement>(".space-y-3");
      if (!editor || editor.querySelector("[data-edit-supply-contract]")) return;
      const field = document.createElement("label");
      field.dataset.editSupplyContract = "true";
      field.className = "block space-y-2";
      const caption = document.createElement("span");
      caption.className = "text-xs font-extrabold text-[#526779]";
      caption.textContent = "Hợp đồng mua bán";
      const select = document.createElement("select");
      select.className = "field-input";
      select.setAttribute("aria-label", "Hợp đồng mua bán");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Chưa liên kết hợp đồng";
      select.append(blank);
      (purchaseContractsQuery.data || []).filter((contract) => contract.status !== "cancelled").forEach((contract) => {
        const option = document.createElement("option");
        option.value = String(contract.id);
        option.textContent = `${contract.referenceCode} · ${contract.title}`;
        select.append(option);
      });
      select.value = editPurchaseContractId;
      const hint = document.createElement("p");
      hint.className = "text-[10px] leading-4 text-[#4B8884]";
      hint.textContent = "Nhà cung cấp sẽ được đồng bộ theo Hợp đồng khi lưu.";
      const onChange = () => { editPurchaseContractIdRef.current = select.value; setEditPurchaseContractId(select.value); };
      select.addEventListener("change", onChange);
      field.append(caption, select, hint);
      const actions = editor.querySelector(".mt-5.flex");
      if (actions) editor.insertBefore(field, actions); else editor.append(field);
      return () => { select.removeEventListener("change", onChange); field.remove(); };
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingSupply?.id, editPurchaseContractId, purchaseContractsQuery.data]);
  useEffect(() => {
    if (!createModalOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const dialog = Array.from(document.querySelectorAll<HTMLElement>('[aria-labelledby="supply-create-title"]')).find((element) => element.textContent?.includes("Thêm phụ kiện"));
      const labels = Array.from(dialog?.querySelectorAll("label") || []);
      const quantityInput = labels.find((label) => label.textContent?.trim().startsWith("Tồn đầu kỳ"))?.querySelector<HTMLInputElement>("input");
      const costLabel = labels.find((label) => label.textContent?.trim().startsWith("Đơn giá VNĐ"));
      const grid = costLabel?.parentElement;
      if (!dialog || !quantityInput || !costLabel || !grid) return;
      const unitCost = parseVndAmount(form.unitCost) || 0;
      const total = Math.max(0, Number(form.openingQuantity || 0)) * unitCost;
      const totalText = `${total.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VNĐ`;
      const totalWords = total ? numberToVietnameseWords(String(total)) : "Nhập số lượng và đơn giá để xem tổng giá trị.";
      const existingSummary = grid.querySelector<HTMLElement>("[data-accessory-value-summary]");
      if (existingSummary) {
        const amount = existingSummary.querySelector<HTMLElement>("[data-accessory-value-amount]");
        const words = existingSummary.querySelector<HTMLElement>("[data-accessory-value-words]");
        if (amount) amount.textContent = totalText;
        if (words) words.textContent = totalWords;
        return;
      }
      const summary = document.createElement("section");
      summary.dataset.accessoryValueSummary = "true";
      summary.className = "sm:col-span-2 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] px-3 py-2.5";
      const title = document.createElement("p");
      title.className = "text-[10px] font-extrabold uppercase tracking-[.1em] text-[#4B8884]";
      title.textContent = "Tổng giá trị dự kiến";
      const amount = document.createElement("p");
      amount.dataset.accessoryValueAmount = "true";
      amount.className = "mt-1 text-sm font-extrabold text-[#087A6A]";
      const words = document.createElement("p");
      words.dataset.accessoryValueWords = "true";
      words.className = "mt-1 text-[10px] font-medium text-[#71869A]";
      amount.textContent = totalText;
      words.textContent = totalWords;
      summary.append(title, amount, words);
      grid.insertBefore(summary, costLabel.nextSibling);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [createModalOpen, form.openingQuantity, form.unitCost]);

  return <div className="min-h-screen bg-[#F4F7FB] px-4 py-7 sm:px-6 lg:px-9 lg:py-8"><div className="mx-auto max-w-[1500px]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#0F8C8C]"><Boxes size={14} /><EditableSectionLabel labelKey="supplies-operations" fallback="Kho vận hành" canEdit={canEditSectionLabels} /></div><h1 className="mt-1 font-display text-3xl font-extrabold text-[#102A43]">Phụ kiện</h1><p className="mt-1 text-sm text-[#71869A]">Quản lý phụ kiện không theo Serial/IMEI bằng số lượng nhập, xuất, cấp phát và tồn thực tế.</p></div><div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => setSupplyImportHistoryOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CDE5E5] bg-white px-3 text-xs font-bold text-[#087A6A] transition hover:bg-[#F4FBFA]"><History size={15} />Lịch sử import</button><button type="button" onClick={() => { setForm(emptyForm); setCreateModalOpen(true); }} className="primary-action"><Plus size={16} />Thêm phụ kiện</button>{createModalOpen && <SupplyCreateModal form={form} setForm={setForm} categoryOptions={categoryOptions} vendorOptions={vendorOptions} brandOptions={brandOptions} isSubmitting={createSupply.isPending} onClose={() => setCreateModalOpen(false)} onSubmit={submitCreate} />}{supplyImportHistoryOpen && <SupplyImportHistoryDialog onClose={() => setSupplyImportHistoryOpen(false)} />}<div className="grid grid-cols-3 gap-2"><Metric label="Mặt hàng" value={supplies.length} /><Metric label="Tồn kho" value={quantity(totalUnits)} tone="teal" /><Metric label="Sắp hết" value={lowCount} tone={lowCount ? "warning" : "default"} /></div></div></div>
    <div className="mt-6">
      <main className="min-w-0 space-y-5"><div className="rounded-2xl border border-[#DFE9F0] bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,0.05)]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="relative min-w-0 w-full sm:max-w-[420px]"><Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#8AA0B6]" size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="field-input !pl-11" placeholder="Tìm mã, tên hoặc vị trí kho..." /></div><div className="w-full sm:w-[220px]"><SearchableSelect value={groupFilter} onChange={(value) => { setGroupFilter(value); setPage(1); }} options={groupFilterOptions} placeholder="Lọc theo nhóm" searchPlaceholder="Tìm nhóm phụ kiện..." emptyText="Không tìm thấy nhóm phụ kiện" emptyActionLabel="Tạo nhóm phụ kiện" onEmptyAction={(name) => setQuickGroupName(name)} /></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => { setLowOnly((current) => !current); setPage(1); }} className={`supply-filter-action ${lowOnly ? "border-[#F2B18B] bg-[#FFF2E9] text-[#C75419]" : ""}`}><AlertTriangle size={16} /><span>{lowOnly ? "Đang xem sắp hết" : "Sắp hết hàng"}</span></button><button type="button" onClick={() => { setSearch(""); setGroupFilter("all"); setLowOnly(false); setPage(1); }} className="supply-filter-action"><SlidersHorizontal size={16} /><span>Đặt lại</span></button></div></div></div>
        <AccessoryGroupSummary supplies={supplies} categoriesById={categoriesById} />
        <div className="overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_8px_24px_rgba(16,42,67,0.05)]"><div className="mobile-table-scroll overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="bg-[#F8FBFC] text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="sticky left-0 z-10 bg-[#F8FBFC] px-4 py-4">Phụ kiện</th><th className="px-3 py-4">Phân loại</th><th className="px-3 py-4 text-right">Tồn kho</th><th className="px-3 py-4 text-right">Tối thiểu</th><th className="px-3 py-4">Vị trí</th><th className="px-3 py-4">Đơn giá</th><th className="px-4 py-4 text-right">Thao tác</th></tr></thead><tbody>{suppliesQuery.isLoading ? <tr><td colSpan={7} className="p-10 text-center text-sm text-[#71869A]">Đang tải phụ kiện...</td></tr> : rows.map((item) => { const low = Number(item.stockQuantity) <= Number(item.minimumQuantity); return <tr key={item.id} className={`border-t border-[#EDF2F5] ${low ? "bg-[#FFF9F2]" : "hover:bg-[#FBFCFD]"}`}><td className="sticky left-0 z-[1] bg-inherit px-4 py-3"><div className="font-bold text-[#193B57]">{item.name}</div><div className="mt-1 font-mono text-[10px] text-[#8AA0B6]">{item.code} · {item.unit}</div></td><td className="px-3 py-3 text-[#60758A]">{item.categoryId ? categoriesById.get(item.categoryId) || "—" : "—"}</td><td className="px-3 py-3 text-right"><span className={`font-display text-sm font-extrabold ${low ? "text-[#C75419]" : "text-[#087A6A]"}`}>{quantity(item.stockQuantity)}</span></td><td className="px-3 py-3 text-right font-semibold text-[#60758A]">{quantity(item.minimumQuantity)}</td><td className="px-3 py-3 text-[#60758A]">{item.location || "—"}</td><td className="px-3 py-3 text-[#60758A]">{money(item.unitCost)}</td><td className="px-4 py-3 text-right"><div className="inline-flex items-center justify-end gap-1"><button type="button" onClick={() => setSelectedId(item.id)} className="supply-row-action text-[#087A6A]" title="Ghi nhận nhập, xuất hoặc cấp phát" aria-label="Ghi nhận nhập, xuất hoặc cấp phát"><ArchiveRestore size={16} /></button><button type="button" onClick={() => beginEdit(item.id)} className="supply-row-action" title="Sửa mã và tên phụ kiện" aria-label="Sửa mã và tên phụ kiện"><Pencil size={16} /></button><button type="button" onClick={() => setSelectedId(item.id)} className="supply-row-action" title="Xem lịch sử biến động" aria-label="Xem lịch sử biến động"><History size={16} /></button></div></td></tr>; })}{!suppliesQuery.isLoading && !rows.length && <tr><td colSpan={7} className="p-10 text-center text-sm text-[#8AA0B6]">Chưa có phụ kiện phù hợp. Hãy dùng nút Thêm phụ kiện để tạo mặt hàng đầu tiên.</td></tr>}</tbody></table></div><Pagination rows={rows.length} total={filtered.length} page={activePage} totalPages={totalPages} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => Math.min(totalPages, current + 1))} /></div><SupplyIssueSlipManager /></main></div></div>
    {selectedSupply && <><button aria-label="Đóng giao dịch vật tư" onClick={() => setSelectedId(null)} className="fixed inset-0 z-[85] bg-[#102A43]/25 backdrop-blur-[1px]" /><aside className="fixed inset-y-0 right-0 z-[86] w-full max-w-lg overflow-y-auto border-l border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6"><DrawerHeader title={selectedSupply.name} subtitle={`Tồn hiện tại: ${quantity(selectedSupply.stockQuantity)} ${selectedSupply.unit}`} onClose={() => setSelectedId(null)} /><div className="mt-6 rounded-xl border border-[#E7EEF3] p-4"><div className="grid grid-cols-3 gap-2"><MovementTab active={movementType === "receipt"} onClick={() => setMovementType("receipt")} icon={<PackagePlus size={16} />} label="Nhập kho" /><MovementTab active={movementType === "issue"} onClick={openIssueForm} icon={<PackageMinus size={16} />} label="Xuất/Cấp phát" tone="amber" /><MovementTab active={movementType === "adjustment"} onClick={() => setMovementType("adjustment")} icon={<ClipboardList size={16} />} label="Điều chỉnh" tone="blue" /></div><div className="mt-4 space-y-3">{movementType !== "issue" && <Field label={movementType === "adjustment" ? "Số lượng điều chỉnh (+/-)" : "Số lượng"}><input inputMode="decimal" value={movementQuantity} onChange={(event) => setMovementQuantity(event.target.value)} placeholder={movementType === "adjustment" ? "VD: -2 hoặc 5" : "VD: 10"} className="field-input" /></Field>}{movementType === "issue" && <section className="rounded-lg bg-[#F7FAFC] p-3"><IssueItemsEditor items={issueItems} supplies={supplies} pickerValue={issueSupplyPicker} pickerOptions={issueSupplyOptions} onPick={addIssueSupply} onQuantityChange={updateIssueQuantity} onRemove={removeIssueSupply} /><div className="mt-4 flex items-center gap-2"><UsersRound size={15} className="text-[#0F8C8C]" /><span className="text-xs font-extrabold text-[#193B57]">Người nhận vật tư</span></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setRecipientMode("staff")} className={`recipient-mode ${recipientMode === "staff" ? "recipient-mode-active" : ""}`}>Nhân sự hệ thống</button><button type="button" onClick={() => setRecipientMode("other")} className={`recipient-mode ${recipientMode === "other" ? "recipient-mode-active" : ""}`}>✓ Người khác</button></div>{recipientMode === "staff" ? <div className="mt-3"><SelectField label="Chọn nhân sự"><SearchableSelect value={recipientUserId} onChange={setRecipientUserId} options={personnelOptions} placeholder="Chọn nhân sự" searchPlaceholder="Tìm nhân sự..." /></SelectField></div> : <div className="mt-3"><Field label="Họ tên / đơn vị nhận *"><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nhập tên người nhận" className="field-input" /></Field></div>}<div className="mt-3"><SelectField label={departmentAutoLocked ? "Phòng ban · tự động theo nhân sự" : "Phòng ban"}><SearchableSelect value={recipientDepartmentId} onChange={setRecipientDepartmentId} options={departmentOptions} placeholder="Chọn phòng ban" searchPlaceholder="Tìm phòng ban..." disabled={departmentAutoLocked} /></SelectField>{departmentAutoLocked && <p className="mt-1 text-[11px] font-medium text-[#71869A]">Phòng ban được khóa theo hồ sơ nhân sự đã chọn.</p>}</div></section>}<Field label="Ghi chú giao dịch *"><textarea value={movementNote} onChange={(event) => setMovementNote(event.target.value)} className="field-input min-h-20" placeholder="Nêu rõ lý do nhập, xuất hoặc điều chỉnh..." /></Field><button type="button" disabled={moveSupply.isPending || createIssueSlip.isPending} onClick={submitMovement} className="primary-action w-full"><ArchiveRestore size={15} />{moveSupply.isPending || createIssueSlip.isPending ? "Đang ghi nhận..." : movementType === "issue" ? "Tạo phiếu cấp phát" : "Xác nhận giao dịch"}</button></div></div><MovementHistory data={movementHistory.data?.items || []} loading={movementHistory.isLoading} unit={selectedSupply.unit} total={movementHistory.data?.total || 0} page={movementHistoryPage} pageSize={MOVEMENT_HISTORY_PAGE_SIZE} onPageChange={setMovementHistoryPage} /></aside></>}
    {editingSupply && <><button aria-label="Đóng chỉnh sửa phụ kiện" onClick={() => setEditingId(null)} className="fixed inset-0 z-[90] bg-[#102A43]/30 backdrop-blur-[1px]" /><section role="dialog" aria-modal="true" className="fixed left-1/2 top-1/2 z-[91] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Chỉnh sửa phụ kiện</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Định danh phụ kiện</h2><p className="mt-1 text-xs text-[#71869A]">Mã phụ kiện được hệ thống khóa sau khi tạo mới.</p></div><button onClick={() => setEditingId(null)} className="drawer-close-action" aria-label="Đóng chỉnh sửa"><X size={18} /></button></div><div className="mt-5 space-y-3"><Field label="Mã phụ kiện · đã khóa"><input value={editCode} readOnly aria-readonly="true" className="field-input cursor-not-allowed bg-[#F7FAFC] font-mono text-[#71869A]" /></Field><Field label="Tên phụ kiện *"><input value={editName} onChange={(event) => setEditName(event.target.value)} className="field-input" /></Field><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="filter-action">Hủy</button><button type="button" disabled={updateSupply.isPending} onClick={() => updateSupply.mutate({ id: editingSupply.id, name: editName })} className="primary-action">{updateSupply.isPending ? "Đang lưu..." : "Lưu thay đổi"}</button></div></div></section></>}{quickGroupName !== null && <AccessoryGroupCreateDialog initialName={quickGroupName} isSubmitting={createAccessoryGroup.isPending} onClose={() => setQuickGroupName(null)} onCreate={(name) => createAccessoryGroup.mutate({ name })} />}{issueConfirmationOpen && <MultiIssueSlipConfirmationDialog items={issuePreviewItems} recipient={recipientMode === "staff" ? selectedRecipient?.name || "Nhân sự được chọn" : recipientName.trim()} department={selectedDepartmentName} isSubmitting={createIssueSlip.isPending} onCancel={() => setIssueConfirmationOpen(false)} onConfirm={confirmIssueSlip} />}</div>;
}

function IssueItemsEditor({ items, supplies, pickerValue, pickerOptions, onPick, onQuantityChange, onRemove }: { items: IssueDraftItem[]; supplies: Array<{ id: number; code: string; name: string; unit: string; stockQuantity: string | number; minimumQuantity: string | number }>; pickerValue: string; pickerOptions: Array<{ value: string; label: string; searchText?: string }>; onPick: (supplyId: string) => void; onQuantityChange: (supplyId: string, value: string) => void; onRemove: (supplyId: string) => void }) {
  return <section className="rounded-xl border border-[#CDE5E5] bg-white p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-extrabold text-[#193B57]">Danh sách phụ kiện cấp phát</div><p className="mt-1 text-[11px] leading-5 text-[#71869A]">Một phiếu có thể gồm nhiều loại phụ kiện. Mỗi loại chỉ được chọn một lần.</p></div><span className="rounded-full bg-[#ECF8F7] px-2 py-1 text-[10px] font-extrabold text-[#087A6A]">{items.length} loại</span></div><div className="mt-3"><SearchableSelect value={pickerValue} onChange={onPick} options={pickerOptions} placeholder="Thêm phụ kiện vào phiếu" searchPlaceholder="Tìm mã hoặc tên phụ kiện..." emptyText="Không còn phụ kiện có thể thêm" /></div><div className="mt-3 space-y-2">{items.map((item) => { const supply = supplies.find((candidate) => candidate.id === Number(item.supplyId)); if (!supply) return null; const requested = Number(item.quantity || 0); const stock = Number(supply.stockQuantity); const remaining = stock - requested; const exceedsStock = item.quantity !== "" && (!Number.isFinite(requested) || requested <= 0 || remaining < 0); const lowAfterIssue = !exceedsStock && item.quantity !== "" && remaining < Number(supply.minimumQuantity); return <article key={item.supplyId} className="rounded-lg border border-[#E7EEF3] bg-[#FBFCFD] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-xs font-extrabold text-[#193B57]">{supply.name}</div><div className="mt-1 font-mono text-[10px] text-[#8AA0B6]">{supply.code} · còn {quantity(stock)} {supply.unit}</div></div><button type="button" onClick={() => onRemove(item.supplyId)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#FDEDEE] hover:text-[#B44545]" aria-label={"Xóa " + supply.name + " khỏi phiếu"} title="Xóa khỏi phiếu"><Trash2 size={14} /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,130px)_1fr]"><label className="text-[10px] font-bold text-[#71869A]">Số lượng cấp<input inputMode="decimal" value={item.quantity} onChange={(event) => onQuantityChange(item.supplyId, event.target.value)} placeholder="Nhập số lượng" className={"field-input mt-1 h-9 " + (exceedsStock ? "border-[#E07A7A] bg-[#FFF7F7]" : "")} /></label><div className="self-end pb-1 text-[10px]">{exceedsStock ? <span className="font-bold text-[#B44545]">Số lượng vượt tồn kho hiện có.</span> : item.quantity ? <span className={lowAfterIssue ? "font-bold text-[#A86B00]" : "font-bold text-[#087A6A]"}>Tồn sau cấp: {quantity(Math.max(0, remaining))} {supply.unit}{lowAfterIssue ? " · dưới mức tối thiểu" : ""}</span> : <span className="text-[#8AA0B6]">Nhập số lượng để kiểm tra tồn kho.</span>}</div></div></article>; })}{items.length === 0 && <p className="rounded-lg border border-dashed border-[#CDE5E5] px-3 py-5 text-center text-xs text-[#71869A]">Chọn ít nhất một phụ kiện để tạo phiếu cấp phát.</p>}</div></section>;
}

function MultiIssueSlipConfirmationDialog({ items, recipient, department, isSubmitting, onCancel, onConfirm }: { items: IssuePreviewItem[]; recipient: string; department: string; isSubmitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const lowStockItems = items.filter((item) => item.stockAfterIssue < item.minimumStock);
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onCancel(); }} className="fixed inset-0 z-[110] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="multi-issue-slip-confirmation-title"><section className="w-full max-w-xl rounded-2xl border border-[#CDE5E5] bg-white p-5 shadow-[0_24px_70px_rgba(16,42,67,.24)] sm:p-6"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF5DC] text-[#A86B00]"><AlertTriangle size={20} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Xác nhận cấp phát</div><h2 id="multi-issue-slip-confirmation-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Tạo phiếu cấp phát nhiều loại?</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Phiếu PK-NĂM-001 sẽ ghi nhận riêng từng phụ kiện và trừ tồn kho trong cùng một giao dịch.</p></div></div><div className="mt-5 overflow-hidden rounded-xl border border-[#E7EEF3]"><div className="grid grid-cols-[minmax(0,1fr)_90px_120px] bg-[#F7FAFC] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71869A]"><span>Phụ kiện</span><span className="text-right">Cấp</span><span className="text-right">Tồn sau</span></div>{items.map((item) => <div key={item.supplyId} className="grid grid-cols-[minmax(0,1fr)_90px_120px] items-center gap-2 border-t border-[#E7EEF3] px-3 py-2.5 text-xs"><span className="truncate font-bold text-[#193B57]">{item.supplyName}</span><span className="text-right font-extrabold text-[#087A6A]">{quantity(item.quantity)} {item.unit}</span><span className={"text-right font-bold " + (item.stockAfterIssue < item.minimumStock ? "text-[#A86B00]" : "text-[#60758A]")}>{quantity(item.stockAfterIssue)} {item.unit}</span></div>)}</div><div className="mt-4 grid gap-2 rounded-xl border border-[#E7EEF3] bg-[#FBFCFD] px-4 py-3 text-xs sm:grid-cols-2"><span><b className="text-[#71869A]">Người nhận:</b> {recipient}</span><span><b className="text-[#71869A]">Phòng ban:</b> {department}</span></div>{lowStockItems.length > 0 && <div className="mt-4 flex gap-3 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-3 text-[#9E3F12]"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><div className="text-xs font-extrabold">Cảnh báo tồn kho thấp</div><p className="mt-1 text-[11px] leading-5">{lowStockItems.map((item) => item.supplyName).join(", ")} sẽ xuống dưới mức tồn tối thiểu sau khi cấp phát.</p></div></div>}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} onClick={onCancel} className="rounded-lg border border-[#DDE7F0] px-4 py-2.5 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:opacity-50">Hủy</button><button type="button" disabled={isSubmitting} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:opacity-50"><ArchiveRestore size={15} />{isSubmitting ? "Đang tạo phiếu..." : "Xác nhận tạo phiếu (" + items.length + " loại)"}</button></div></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold text-[#526779]">{label}<span className="mt-1 block">{children}</span></label>; }
function SelectField({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><span className="text-xs font-bold text-[#526779]">{label}</span>{children}</div>; }
type SupplyBulkItem = { code: string; name: string; unit: string; openingQuantity: number; minimumQuantity: number; unitCost: number | null; location: string | null; categoryId: number | null; vendorId: number | null; brandId: number | null; note: string | null };
function LegacySupplyCreateModal({ form, setForm, categoryOptions, vendorOptions, brandOptions, isSubmitting, onClose, onSubmit, onBulkCreated }: { form: SupplyForm; setForm: React.Dispatch<React.SetStateAction<SupplyForm>>; categoryOptions: Array<{ value: string; label: string }>; vendorOptions: Array<{ value: string; label: string }>; brandOptions: Array<{ value: string; label: string }>; isSubmitting: boolean; onClose: () => void; onSubmit: () => void; onBulkCreated: () => void }) {
  const utils = trpc.useUtils();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [bulkPreview, setBulkPreview] = useState<SupplyBulkItem[]>([]);
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="supply-create-title"]');
    if (!dialog) return;
    const replacements: Array<[RegExp, string]> = [[/Vật tư/g, "Phụ kiện"], [/vật tư/g, "phụ kiện"], [/VT-/g, "PK-"]];
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => { let value = node.nodeValue || ""; replacements.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); }); node.nodeValue = value; });
    dialog.querySelectorAll<HTMLInputElement>('input[placeholder]').forEach((input) => { let value = input.placeholder; replacements.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); }); input.placeholder = value; });
    dialog.querySelectorAll<HTMLElement>('[aria-label]').forEach((element) => { let value = element.getAttribute("aria-label") || ""; replacements.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); }); element.setAttribute("aria-label", value); });
  });
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importProgress, setImportProgress] = useState({ phase: "idle", current: 0, total: 0, detail: "" });
  const bulkCreate = trpc.supplies.bulkCreate.useMutation({ onSuccess: (result) => { toast.success(`Đã xử lý ${result.created + result.updated} vật tư: tạo mới ${result.created}, cập nhật ${result.updated}.`); setImportProgress({ phase: "done", current: result.created + result.updated, total: result.created + result.updated, detail: `Hoàn tất: tạo mới ${result.created}, cập nhật ${result.updated}.` }); setBulkPreview([]); setBulkErrors([]); if (importInputRef.current) importInputRef.current.value = ""; void utils.supplies.list.invalidate(); window.setTimeout(onClose, 700); }, onError: (error) => { setImportProgress((current) => ({ ...current, phase: "error", detail: error.message || "Không thể nhập vật tư từ Excel." })); toast.error(error.message || "Không thể nhập vật tư từ Excel."); } });
  const isBusy = isSubmitting || bulkCreate.isPending;
  const readCell = (row: Record<string, unknown>, header: string) => String(row[header] ?? "").trim();
  const findCatalogId = (value: string, options: Array<{ value: string; label: string }>, label: string, rowNumber: number, errors: string[]) => { if (!value) return null; const option = options.find((item) => item.value && item.label.localeCompare(value, "vi", { sensitivity: "accent" }) === 0); if (!option) { errors.push(`Dòng ${rowNumber}: không tìm thấy ${label} “${value}”.`); return null; } return Number(option.value); };
  const parseNumber = (value: string, label: string, rowNumber: number, errors: string[], fallback = 0) => { if (!value) return fallback; const parsed = Number(value.replace(/(?:VNĐ|VND|₫|\s)/gi, "").replace(/\./g, "").replace(",", ".")); if (!Number.isFinite(parsed) || parsed < 0) { errors.push(`Dòng ${rowNumber}: ${label} phải là số không âm.`); return fallback; } return parsed; };
  const downloadTemplate = async () => {
    try {
      const workbook = await buildSupplyImportTemplate({ categories: categoryOptions.filter((option) => option.value).map((option) => option.label), vendors: vendorOptions.filter((option) => option.value).map((option) => option.label), brands: brandOptions.filter((option) => option.value).map((option) => option.label) });
      const bytes = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([bytes as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "template-nhap-phu-kien.xlsx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Đã tạo template Phụ kiện có dropdown Phân loại, Nhà cung cấp và Hãng.");
    } catch {
      toast.error("Không thể tạo template import Phụ kiện. Vui lòng thử lại.");
    }
  };
  const handleExcel = async (file: File) => { if (file.size > 8 * 1024 * 1024) { toast.error("File Excel tối đa 8 MB."); return; } try { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const sheet = workbook.Sheets[workbook.SheetNames[0] || ""]; if (!sheet) throw new Error("File Excel không có sheet dữ liệu."); const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }); if (!rawRows.length) throw new Error("File Excel không có dòng dữ liệu."); const firstRowHeaders = Object.keys(rawRows[0]); const missing = ["Mã vật tư", "Tên vật tư"].filter((header) => !firstRowHeaders.includes(header)); if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}.`); const errors: string[] = []; const codes = new Set<string>(); const parsedRows = rawRows.map((row, index) => { const rowNumber = index + 2; const code = readCell(row, "Mã vật tư").toUpperCase(); const name = readCell(row, "Tên vật tư"); if (!/^[A-Z0-9-]{2,64}$/.test(code)) errors.push(`Dòng ${rowNumber}: Mã vật tư chỉ gồm chữ, số và dấu gạch nối.`); if (name.length < 2) errors.push(`Dòng ${rowNumber}: Tên vật tư cần ít nhất 2 ký tự.`); if (codes.has(code)) errors.push(`Dòng ${rowNumber}: Mã vật tư ${code} bị lặp trong file.`); codes.add(code); return { code, name, unit: readCell(row, "Đơn vị tính") || "Cái", openingQuantity: parseNumber(readCell(row, "Tồn đầu kỳ"), "Tồn đầu kỳ", rowNumber, errors), minimumQuantity: parseNumber(readCell(row, "Mức tồn tối thiểu"), "Mức tồn tối thiểu", rowNumber, errors), unitCost: readCell(row, "Đơn giá VNĐ") ? parseNumber(readCell(row, "Đơn giá VNĐ"), "Đơn giá VNĐ", rowNumber, errors) : null, location: readCell(row, "Vị trí kho") || null, categoryId: findCatalogId(readCell(row, "Phân loại"), categoryOptions, "phân loại", rowNumber, errors), vendorId: findCatalogId(readCell(row, "Nhà cung cấp"), vendorOptions, "nhà cung cấp", rowNumber, errors), brandId: findCatalogId(readCell(row, "Hãng"), brandOptions, "hãng", rowNumber, errors), note: readCell(row, "Ghi chú") || null }; }); if (errors.length) { setBulkPreview([]); setBulkErrors(errors.slice(0, 8)); toast.error(`File Excel có ${errors.length} lỗi cần sửa.`); return; } setBulkErrors([]); setBulkPreview(parsedRows); toast.success(`Đã đọc ${parsedRows.length} vật tư. Kiểm tra trước khi xác nhận.`); } catch (error) { setBulkPreview([]); setBulkErrors([error instanceof Error ? error.message : "Không thể đọc file Excel."]); toast.error(error instanceof Error ? error.message : "Không thể đọc file Excel."); } finally { if (importInputRef.current) importInputRef.current.value = ""; } };
  return createPortal(<div className="fixed inset-0 z-[105] flex items-center justify-center px-4 py-6"><button type="button" aria-label="Đóng thêm vật tư" disabled={isBusy} onClick={onClose} className="absolute inset-0 bg-[#102A43]/45 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="supply-create-title" className="relative z-[1] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,.24)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Plus size={19} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Danh mục kho</div><h2 id="supply-create-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Thêm vật tư</h2><p className="mt-1 text-xs text-[#71869A]">Tạo từng vật tư hoặc nhập nhanh danh sách Excel; tồn đầu kỳ sẽ được ghi nhận cùng lúc.</p></div></div><button type="button" disabled={isBusy} onClick={onClose} className="drawer-close-action" aria-label="Đóng thêm vật tư"><X size={18} /></button></div><div className="overflow-y-auto p-5 sm:p-6"><section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]"><FileSpreadsheet size={15} />Nhập danh sách từ Excel</div><p className="mt-1 text-[11px] leading-5 text-[#4B8884]">Tải mẫu, điền dữ liệu và xem trước trước khi hệ thống tạo hàng loạt.</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 text-[11px] font-bold text-[#087A6A] hover:bg-[#ECF8F7]"><Download size={14} />Tải mẫu</button><label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#087A6A] px-3 text-[11px] font-bold text-white hover:bg-[#066254]"><Upload size={14} />Chọn Excel<input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleExcel(file); }} /></label></div></div></section>{bulkErrors.length > 0 && <section className="mt-4 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-3 text-xs text-[#9E3F12]"><div className="flex items-center gap-2 font-extrabold"><AlertTriangle size={15} />File cần được chỉnh sửa</div><div className="mt-2 space-y-1">{bulkErrors.map((error) => <p key={error}>{error}</p>)}</div></section>}{bulkPreview.length > 0 ? <section className="mt-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-extrabold text-[#193B57]">Sẵn sàng nhập {bulkPreview.length} vật tư</div><p className="mt-1 text-[11px] text-[#71869A]">Mã vật tư được kiểm tra trùng trong file và trên hệ thống khi xác nhận.</p></div><button type="button" disabled={isBusy} onClick={() => setBulkPreview([])} className="text-xs font-bold text-[#60758A] hover:text-[#193B57]">Hủy nhập Excel</button></div><div className="mt-3 overflow-x-auto rounded-xl border border-[#DDE7F0]"><table className="min-w-[620px] w-full text-left text-[11px]"><thead className="bg-[#F7FAFC] uppercase tracking-[.08em] text-[#71869A]"><tr><th className="px-3 py-2">Mã</th><th className="px-3 py-2">Tên vật tư</th><th className="px-3 py-2 text-right">Tồn đầu</th><th className="px-3 py-2 text-right">Tối thiểu</th><th className="px-3 py-2">Vị trí</th></tr></thead><tbody>{bulkPreview.slice(0, 8).map((item) => <tr key={item.code} className="border-t border-[#EDF2F5]"><td className="px-3 py-2 font-mono font-bold text-[#087A6A]">{item.code}</td><td className="px-3 py-2 font-semibold text-[#193B57]">{item.name}</td><td className="px-3 py-2 text-right">{quantity(item.openingQuantity)}</td><td className="px-3 py-2 text-right">{quantity(item.minimumQuantity)}</td><td className="px-3 py-2 text-[#60758A]">{item.location || "—"}</td></tr>)}</tbody></table></div>{bulkPreview.length > 8 && <p className="mt-2 text-right text-[11px] font-semibold text-[#71869A]">Còn {bulkPreview.length - 8} dòng sẽ được nhập.</p>}</section> : <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Mã vật tư *"><input autoFocus value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="VD: VT-CHUOT-M100" className="field-input font-mono" /></Field><Field label="Tên vật tư *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="VD: Chuột Logitech M100" className="field-input" /></Field><Field label="Đơn vị tính"><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="field-input" /></Field><Field label="Tồn đầu kỳ"><input inputMode="decimal" value={form.openingQuantity} onChange={(event) => setForm({ ...form, openingQuantity: event.target.value })} className="field-input" /></Field><Field label="Mức tồn tối thiểu"><input inputMode="decimal" value={form.minimumQuantity} onChange={(event) => setForm({ ...form, minimumQuantity: event.target.value })} className="field-input" /></Field><Field label="Đơn giá VNĐ"><input inputMode="numeric" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} className="field-input" /></Field><div className="sm:col-span-2"><Field label="Vị trí kho"><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="VD: Kho CNTT - Kệ A" className="field-input" /></Field></div><SelectField label="Phân loại"><SearchableSelect value={form.categoryId} onChange={(value) => setForm({ ...form, categoryId: value })} options={categoryOptions} placeholder="Chọn phân loại" searchPlaceholder="Tìm phân loại..." /></SelectField><SelectField label="Nhà cung cấp"><SearchableSelect value={form.vendorId} onChange={(value) => setForm({ ...form, vendorId: value })} options={vendorOptions} placeholder="Chọn nhà cung cấp" searchPlaceholder="Tìm nhà cung cấp..." /></SelectField><SelectField label="Hãng"><SearchableSelect value={form.brandId} onChange={(value) => setForm({ ...form, brandId: value })} options={brandOptions} placeholder="Chọn hãng" searchPlaceholder="Tìm hãng..." /></SelectField><div className="sm:col-span-2"><Field label="Ghi chú"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="field-input min-h-24" placeholder="Thông tin quy cách hoặc lưu ý quản lý..." /></Field></div></div>}</div><div className="flex items-center justify-end gap-3 border-t border-[#E7EEF3] px-5 py-4 sm:px-6"><button type="button" disabled={isBusy} onClick={onClose} className="inline-flex h-11 min-w-[108px] items-center justify-center rounded-lg border border-[#DDE7F0] px-4 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:opacity-50">Hủy</button><button type="button" disabled={isBusy} onClick={() => bulkPreview.length ? bulkCreate.mutate({ items: bulkPreview }) : onSubmit()} className="inline-flex h-11 min-w-[144px] items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] transition hover:bg-[#087A6A] disabled:opacity-50"><Plus size={15} />{isBusy ? "Đang xử lý..." : bulkPreview.length ? `Nhập ${bulkPreview.length} vật tư` : "Tạo vật tư"}</button></div></section></div>, document.body);
}
function LegacySupplyCreateModalV2({ form, setForm, categoryOptions, vendorOptions, brandOptions, isSubmitting, onClose, onSubmit }: { form: SupplyForm; setForm: React.Dispatch<React.SetStateAction<SupplyForm>>; categoryOptions: Array<{ value: string; label: string; isActive?: boolean }>; vendorOptions: Array<{ value: string; label: string; isActive?: boolean }>; brandOptions: Array<{ value: string; label: string; isActive?: boolean }>; isSubmitting: boolean; onClose: () => void; onSubmit: () => void }) {
  const utils = trpc.useUtils();
  const suppliesQuery = trpc.supplies.list.useQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SupplyBulkItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [progress, setProgress] = useState({ phase: "idle", current: 0, total: 0, detail: "" });
  const existingCodes = useMemo(() => new Set((suppliesQuery.data || []).map((supply) => supply.code)), [suppliesQuery.data]);
  const existingCount = rows.filter((row) => existingCodes.has(row.code)).length;
  const bulkCreate = trpc.supplies.bulkCreate.useMutation({ onSuccess: (result) => { const total = result.created + result.updated; setProgress({ phase: "done", current: total, total, detail: `Hoàn tất: tạo mới ${result.created}, cập nhật ${result.updated}.` }); toast.success(`Đã xử lý ${total} vật tư: tạo mới ${result.created}, cập nhật ${result.updated}.`); void utils.supplies.list.invalidate(); window.setTimeout(onClose, 900); }, onError: (error) => { setProgress((current) => ({ ...current, phase: "error", detail: error.message || "Không thể nhập vật tư từ Excel." })); toast.error(error.message || "Không thể nhập vật tư từ Excel."); } });
  const isBusy = isSubmitting || bulkCreate.isPending;
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="supply-create-title"]');
    if (!dialog) return;
    const replacements: Array<[RegExp, string]> = [[/Vật tư/g, "Phụ kiện"], [/vật tư/g, "phụ kiện"], [/VT-/g, "PK-"]];
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => { let text = node.nodeValue || ""; if (text.trim() === "Tải mẫu") text = text.replace("Tải mẫu", "Tải mẫu phụ kiện"); replacements.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); }); node.nodeValue = text; });
    dialog.querySelectorAll<HTMLInputElement>('input[placeholder]').forEach((input) => { let text = input.placeholder; replacements.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); }); input.placeholder = text; });
    dialog.querySelectorAll<HTMLElement>('[aria-label]').forEach((element) => { let text = element.getAttribute("aria-label") || ""; replacements.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); }); element.setAttribute("aria-label", text); });
  });
  useEffect(() => { if (!bulkCreate.isPending || !rows.length) return; const timer = window.setInterval(() => setProgress((current) => current.phase !== "saving" || current.current >= rows.length ? current : { ...current, current: current.current + 1, detail: `Đang ghi transaction an toàn · dòng ${current.current + 1}/${rows.length}` }), 180); return () => window.clearInterval(timer); }, [bulkCreate.isPending, rows.length]);
  const value = (row: Record<string, unknown>, header: string) => String(row[header] ?? "").trim();
  useEffect(() => {
    const originalSheetToJson = XLSX.utils.sheet_to_json;
    (XLSX.utils.sheet_to_json as any) = ((sheet: XLSX.WorkSheet, options?: unknown) => {
      const parsed = originalSheetToJson(sheet, options as any) as Array<Record<string, unknown>>;
      return parsed.map((row) => ({
        ...row,
        "Mã vật tư": row["Mã vật tư"] ?? row["Mã phụ kiện"],
        "Tên vật tư": row["Tên vật tư"] ?? row["Tên phụ kiện"],
      }));
    }) as typeof XLSX.utils.sheet_to_json;
    return () => { (XLSX.utils.sheet_to_json as any) = originalSheetToJson; };
  }, []);
  const number = (raw: string, label: string, line: number, list: string[], fallback = 0) => { if (!raw) return fallback; const parsed = Number(raw.replace(/(?:VNĐ|VND|₫|\s)/gi, "").replace(/\./g, "").replace(",", ".")); if (!Number.isFinite(parsed) || parsed < 0) { list.push(`Dòng ${line}: ${label} phải là số không âm.`); return fallback; } return parsed; };
  const catalog = (raw: string, options: Array<{ value: string; label: string; isActive?: boolean }>, label: string, line: number, list: string[]) => { const result = resolveActiveSupplyImportCatalog(raw, options.filter((option) => option.value).map((option) => ({ ...option, isActive: option.isActive !== false })), label); if (result.error) list.push(`Dòng ${line}: ${result.error}.`); return result.id; };
  const downloadTemplate = async () => { try { const workbook = await buildSupplyImportTemplate({ units: standardSupplyUnits, categories: categoryOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label), vendors: vendorOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label), brands: brandOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label) }); const bytes = await workbook.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([bytes as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "template-nhap-phu-kien.xlsx"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); toast.success("Đã tạo template Phụ kiện có dropdown và danh mục đang hoạt động."); } catch { toast.error("Không thể tạo template import Phụ kiện. Vui lòng thử lại."); } };
  const parseExcel = async (file: File) => { if (file.size > 8 * 1024 * 1024) { toast.error("File Excel tối đa 8 MB."); return; } try { setRows([]); setErrors([]); setProgress({ phase: "reading", current: 0, total: 0, detail: "Đang đọc file Excel..." }); const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const sheet = workbook.Sheets[workbook.SheetNames[0] || ""]; if (!sheet) throw new Error("File Excel không có sheet dữ liệu."); const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }); if (!rawRows.length) throw new Error("File Excel không có dòng dữ liệu."); const headers = Object.keys(rawRows[0]); const missing = ["Mã vật tư", "Tên vật tư"].filter((header) => !headers.includes(header)); if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}.`); const validation: string[] = []; const codes = new Set<string>(); const parsed: SupplyBulkItem[] = []; setProgress({ phase: "validating", current: 0, total: rawRows.length, detail: "Đang kiểm tra dữ liệu từng dòng..." }); for (let index = 0; index < rawRows.length; index += 1) { const raw = rawRows[index]; const line = index + 2; const code = value(raw, "Mã vật tư").toUpperCase(); const name = value(raw, "Tên vật tư"); if (!/^[A-Z0-9-]{2,64}$/.test(code)) validation.push(`Dòng ${line}: Mã vật tư chỉ gồm chữ, số và dấu gạch nối.`); if (name.length < 2) validation.push(`Dòng ${line}: Tên vật tư cần ít nhất 2 ký tự.`); if (codes.has(code)) validation.push(`Dòng ${line}: Mã vật tư ${code} bị lặp trong file.`); codes.add(code); parsed.push({ code, name, unit: value(raw, "Đơn vị tính") || "Cái", openingQuantity: number(value(raw, "Tồn đầu kỳ"), "Tồn đầu kỳ", line, validation), minimumQuantity: number(value(raw, "Mức tồn tối thiểu"), "Mức tồn tối thiểu", line, validation), unitCost: value(raw, "Đơn giá VNĐ") ? number(value(raw, "Đơn giá VNĐ"), "Đơn giá VNĐ", line, validation) : null, location: value(raw, "Vị trí kho") || null, categoryId: catalog(value(raw, "Phân loại"), categoryOptions, "phân loại", line, validation), vendorId: catalog(value(raw, "Nhà cung cấp"), vendorOptions, "nhà cung cấp", line, validation), brandId: catalog(value(raw, "Hãng"), brandOptions, "hãng", line, validation), note: value(raw, "Ghi chú") || null }); setProgress({ phase: "validating", current: index + 1, total: rawRows.length, detail: `Đã kiểm tra dòng ${index + 1}/${rawRows.length}` }); await new Promise<void>((resolve) => window.setTimeout(resolve, 0)); } if (validation.length) { setErrors(validation.slice(0, 8)); setProgress({ phase: "error", current: validation.length, total: rawRows.length, detail: `Phát hiện ${validation.length} lỗi cần chỉnh sửa.` }); toast.error(`File Excel có ${validation.length} lỗi cần sửa.`); return; } setRows(parsed); setProgress({ phase: "ready", current: parsed.length, total: parsed.length, detail: `Đã kiểm tra xong ${parsed.length} dòng dữ liệu.` }); toast.success(`Đã đọc ${parsed.length} dòng. Kiểm tra trước khi xác nhận.`); } catch (error) { const message = error instanceof Error ? error.message : "Không thể đọc file Excel."; setErrors([message]); setProgress({ phase: "error", current: 0, total: 0, detail: message }); toast.error(message); } finally { if (inputRef.current) inputRef.current.value = ""; } };
  const percent = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;
  return createPortal(<div className="fixed inset-0 z-[105] flex items-center justify-center px-4 py-6"><button type="button" aria-label="Đóng thêm vật tư" disabled={isBusy} onClick={onClose} className="absolute inset-0 bg-[#102A43]/45 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="supply-create-title" className="relative z-[1] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,.24)]"><div className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Plus size={19} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Danh mục kho</div><h2 id="supply-create-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Thêm vật tư</h2><p className="mt-1 text-xs text-[#71869A]">Tạo từng vật tư hoặc nhập nhanh danh sách Excel.</p></div></div><button type="button" disabled={isBusy} onClick={onClose} className="drawer-close-action" aria-label="Đóng thêm vật tư"><X size={18} /></button></div><div className="overflow-y-auto p-5 sm:p-6"><section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]"><FileSpreadsheet size={15} />Nhập danh sách từ Excel</div><p className="mt-1 text-[11px] leading-5 text-[#4B8884]">Tải mẫu, kiểm tra từng dòng và xem trước trước khi lưu.</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 text-[11px] font-bold text-[#087A6A] hover:bg-[#ECF8F7]"><Download size={14} />Tải mẫu</button><label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#087A6A] px-3 text-[11px] font-bold text-white hover:bg-[#066254]"><Upload size={14} />Chọn Excel<input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseExcel(file); }} /></label></div></div></section>{progress.phase !== "idle" && <section className={`mt-4 rounded-xl border p-3 ${progress.phase === "error" ? "border-[#F2B18B] bg-[#FFF2E9] text-[#9E3F12]" : progress.phase === "done" ? "border-[#B8E9DD] bg-[#F4FBFA] text-[#087A6A]" : "border-[#C7DDF8] bg-[#F7FAFF] text-[#2666A8]"}`}><div className="flex items-center justify-between gap-3 text-xs font-extrabold"><span>{progress.detail}</span><span>{progress.total ? `${percent}%` : ""}</span></div>{progress.total > 0 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-current transition-[width] duration-200" style={{ width: `${percent}%` }} /></div>}</section>}{errors.length > 0 && <div className="mt-3 space-y-1 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-3 text-[11px] text-[#9E3F12]">{errors.map((error) => <p key={error}>{error}</p>)}</div>}{rows.length > 0 ? <section className="mt-4"><div className="flex flex-col gap-3 rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-start gap-2 text-xs font-semibold text-[#193B57]"><input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#8BCDC6] text-[#0F8C8C]" /><span><span className="block font-extrabold">Tự động cập nhật vật tư trùng mã</span><span className="mt-1 block text-[11px] font-medium text-[#71869A]">{existingCount ? `${existingCount} dòng sẽ được cập nhật; tồn đầu trong file được cộng thêm vào tồn kho hiện có.` : "Không có mã nào trùng với dữ liệu hiện có."}</span></span></label><span className="text-[11px] font-extrabold text-[#60758A]">{rows.length - existingCount} tạo mới · {existingCount} cập nhật</span></div>{existingCount > 0 && !updateExisting && <p className="mt-2 rounded-lg bg-[#FFF5DC] px-3 py-2 text-[11px] font-semibold text-[#A86B00]">Bật tùy chọn cập nhật để xác nhận file có mã vật tư đã tồn tại.</p>}<div className="mt-3 overflow-x-auto rounded-xl border border-[#DDE7F0]"><table className="min-w-[650px] w-full text-left text-[11px]"><thead className="bg-[#F7FAFC] uppercase tracking-[.08em] text-[#71869A]"><tr><th className="px-3 py-2">Mã</th><th className="px-3 py-2">Tên vật tư</th><th className="px-3 py-2">Kết quả</th><th className="px-3 py-2 text-right">Tồn đầu</th><th className="px-3 py-2">Vị trí</th></tr></thead><tbody>{rows.slice(0, 8).map((row) => { const existing = existingCodes.has(row.code); return <tr key={row.code} className="border-t border-[#EDF2F5]"><td className="px-3 py-2 font-mono font-bold text-[#087A6A]">{row.code}</td><td className="px-3 py-2 font-semibold text-[#193B57]">{row.name}</td><td className="px-3 py-2">{existing ? <span className="rounded-full bg-[#EAF3FF] px-2 py-1 font-bold text-[#2666A8]">Cập nhật</span> : <span className="rounded-full bg-[#E6F6F2] px-2 py-1 font-bold text-[#087A6A]">Tạo mới</span>}</td><td className="px-3 py-2 text-right">{quantity(row.openingQuantity)}</td><td className="px-3 py-2 text-[#60758A]">{row.location || "—"}</td></tr>; })}</tbody></table></div></section> : <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Mã vật tư *"><input autoFocus value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="VD: VT-CHUOT-M100" className="field-input font-mono" /></Field><Field label="Tên vật tư *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="VD: Chuột Logitech M100" className="field-input" /></Field><Field label="Đơn vị tính"><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="field-input" /></Field><Field label="Tồn đầu kỳ"><input inputMode="decimal" value={form.openingQuantity} onChange={(event) => setForm({ ...form, openingQuantity: event.target.value })} className="field-input" /></Field><Field label="Mức tồn tối thiểu"><input inputMode="decimal" value={form.minimumQuantity} onChange={(event) => setForm({ ...form, minimumQuantity: event.target.value })} className="field-input" /></Field><Field label="Đơn giá VNĐ"><input inputMode="numeric" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} className="field-input" /></Field><div className="sm:col-span-2"><Field label="Vị trí kho"><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="VD: Kho CNTT - Kệ A" className="field-input" /></Field></div><SelectField label="Phân loại"><SearchableSelect value={form.categoryId} onChange={(next) => setForm({ ...form, categoryId: next })} options={categoryOptions} placeholder="Chọn phân loại" searchPlaceholder="Tìm phân loại..." /></SelectField><SelectField label="Nhà cung cấp"><SearchableSelect value={form.vendorId} onChange={(next) => setForm({ ...form, vendorId: next })} options={vendorOptions} placeholder="Chọn nhà cung cấp" searchPlaceholder="Tìm nhà cung cấp..." /></SelectField><SelectField label="Hãng"><SearchableSelect value={form.brandId} onChange={(next) => setForm({ ...form, brandId: next })} options={brandOptions} placeholder="Chọn hãng" searchPlaceholder="Tìm hãng..." /></SelectField><div className="sm:col-span-2"><Field label="Ghi chú"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="field-input min-h-24" placeholder="Thông tin quy cách hoặc lưu ý quản lý..." /></Field></div></div>}</div><div className="flex items-center justify-end gap-3 border-t border-[#E7EEF3] px-5 py-4 sm:px-6"><button type="button" disabled={isBusy} onClick={onClose} className="inline-flex h-11 min-w-[108px] items-center justify-center rounded-lg border border-[#DDE7F0] px-4 text-xs font-bold text-[#60758A] transition hover:bg-[#F7FAFC] disabled:opacity-50">Hủy</button><button type="button" disabled={isBusy || (rows.length > 0 && existingCount > 0 && !updateExisting)} onClick={() => { if (rows.length) { setProgress({ phase: "saving", current: 0, total: rows.length, detail: "Đang bắt đầu transaction nhập vật tư..." }); bulkCreate.mutate({ items: rows, updateExisting }); } else onSubmit(); }} className="inline-flex h-11 min-w-[144px] items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] transition hover:bg-[#087A6A] disabled:opacity-50"><Plus size={15} />{isBusy ? "Đang xử lý..." : rows.length ? `Xác nhận ${rows.length} dòng` : "Tạo vật tư"}</button></div></section></div>, document.body);
}

function SupplyCreateModal({ form, setForm, categoryOptions, vendorOptions, brandOptions, isSubmitting, onClose, onSubmit }: { form: SupplyForm; setForm: React.Dispatch<React.SetStateAction<SupplyForm>>; categoryOptions: Array<{ value: string; label: string; isActive?: boolean }>; vendorOptions: Array<{ value: string; label: string; isActive?: boolean }>; brandOptions: Array<{ value: string; label: string; isActive?: boolean }>; isSubmitting: boolean; onClose: () => void; onSubmit: () => void }) {
  const utils = trpc.useUtils();
  const suppliesQuery = trpc.supplies.list.useQuery();
  const purchaseContractsQuery = trpc.purchaseContracts.list.useQuery();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SupplyBulkItem[]>([]);
  const [fileError, setFileError] = useState("");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const existingCodes = useMemo(() => new Set((suppliesQuery.data || []).map((supply) => supply.code)), [suppliesQuery.data]);
  const bulkCreate = trpc.supplies.bulkCreate.useMutation({
    onSuccess: (result) => {
      const total = result.created + result.updated;
      toast.success(`Đã lưu ${total} phụ kiện.`);
      void utils.supplies.list.invalidate();
      window.setTimeout(onClose, 700);
    },
    onError: (error) => toast.error(error.message || "Không thể lưu dữ liệu phụ kiện."),
  });
  const isBusy = isSubmitting || isReading || bulkCreate.isPending;
  useEffect(() => {
    if (rows.length) return;
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="supply-create-title"]');
    const formGrid = dialog?.querySelector<HTMLElement>(".mt-5.grid");
    if (!formGrid || formGrid.querySelector("[data-supply-purchase-contract]")) return;
    const field = document.createElement("div");
    field.dataset.supplyPurchaseContract = "true";
    field.className = "sm:col-span-2 rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-3";
    const label = document.createElement("label");
    label.className = "block text-xs font-extrabold text-[#526779]";
    label.textContent = "Hợp đồng mua bán";
    const select = document.createElement("select");
    select.className = "field-input mt-1";
    select.setAttribute("aria-label", "Hợp đồng mua bán");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = purchaseContractsQuery.isLoading ? "Đang tải hợp đồng..." : "Chưa liên kết hợp đồng";
    select.append(blank);
    (purchaseContractsQuery.data || []).filter((contract) => contract.status !== "cancelled").forEach((contract) => {
      const option = document.createElement("option");
      option.value = String(contract.id);
      option.textContent = `${contract.referenceCode} · ${contract.title}`;
      select.append(option);
    });
    select.value = form.purchaseContractId;
    select.disabled = purchaseContractsQuery.isLoading;
    const hint = document.createElement("p");
    hint.className = "mt-1 text-[10px] text-[#4B8884]";
    const selected = (purchaseContractsQuery.data || []).find((contract) => String(contract.id) === form.purchaseContractId);
    hint.textContent = selected ? `Phụ kiện được liên kết với ${selected.referenceCode}; Nhà cung cấp được đồng bộ khi lưu.` : "Liên kết nhiều phụ kiện với một hồ sơ hợp đồng và chứng từ dùng chung.";
    const onChange = () => {
      const contract = (purchaseContractsQuery.data || []).find((item) => String(item.id) === select.value);
      setForm((current) => ({ ...current, purchaseContractId: select.value, ...(contract?.vendorId ? { vendorId: String(contract.vendorId) } : {}) }));
    };
    select.addEventListener("change", onChange);
    field.append(label, select, hint);
    formGrid.append(field);
    return () => { select.removeEventListener("change", onChange); field.remove(); };
  }, [rows.length, form.purchaseContractId, purchaseContractsQuery.data, purchaseContractsQuery.isLoading, setForm]);
  const numericValue = (raw: string) => {
    const normalized = raw.replace(/(?:VNĐ|VND|₫|\s)/gi, "").replace(/\./g, "").replace(",", ".");
    return normalized ? Number(normalized) : 0;
  };
  const read = (row: Record<string, unknown>, ...headers: string[]) => headers.map((header) => String(row[header] ?? "").trim()).find(Boolean) || "";
  const rowIssues = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((row, index) => {
      const issues: string[] = [];
      const code = row.code.trim().toUpperCase();
      if (!/^[A-Z0-9-]{2,64}$/.test(code)) issues.push("Mã chỉ gồm chữ, số và dấu gạch nối (2–64 ký tự).");
      if (seen.has(code)) issues.push("Mã bị lặp trong file.");
      if (code) seen.add(code);
      if (row.name.trim().length < 2) issues.push("Tên phụ kiện cần ít nhất 2 ký tự.");
      if (!Number.isFinite(row.openingQuantity) || row.openingQuantity < 0) issues.push("Tồn đầu kỳ phải là số không âm.");
      if (!Number.isFinite(row.minimumQuantity) || row.minimumQuantity < 0) issues.push("Mức tồn tối thiểu phải là số không âm.");
      if (isInvalidWholeQuantity(row.unit, row.openingQuantity)) issues.push(`Tồn đầu kỳ phải là số nguyên khi đơn vị tính là ${row.unit}.`);
      if (isInvalidWholeQuantity(row.unit, row.minimumQuantity)) issues.push(`Mức tồn tối thiểu phải là số nguyên khi đơn vị tính là ${row.unit}.`);
      if (row.unitCost !== null && (!Number.isFinite(row.unitCost) || row.unitCost < 0)) issues.push("Đơn giá phải là số không âm.");
      return { index, issues };
    });
  }, [rows]);
  const invalidRows = rowIssues.filter((item) => item.issues.length > 0);
  const existingCount = rows.filter((row) => existingCodes.has(row.code.trim().toUpperCase())).length;
  const canSavePreview = rows.length > 0 && !invalidRows.length && !(existingCount > 0 && !updateExisting);
  const manualQuantityIssue = isInvalidWholeQuantity(form.unit, form.openingQuantity) || isInvalidWholeQuantity(form.unit, form.minimumQuantity);
  const supplyUnitsQuery = trpc.supplyUnits.list.useQuery();
  const activeSupplyUnits = (supplyUnitsQuery.data || []).filter((unit) => unit.isActive).map((unit) => unit.name);
  const availableSupplyUnits = activeSupplyUnits.length ? activeSupplyUnits : standardSupplyUnits;
  const downloadTemplate = async () => {
    try {
      const workbook = await buildSupplyImportTemplate({ units: availableSupplyUnits, categories: categoryOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label), vendors: vendorOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label), brands: brandOptions.filter((option) => option.value && option.isActive !== false).map((option) => option.label) });
      const bytes = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([bytes as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "template-nhap-phu-kien.xlsx";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Đã tạo mẫu Phụ kiện.");
    } catch {
      toast.error("Không thể tạo template import Phụ kiện. Vui lòng thử lại.");
    }
  };
  const parseExcel = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { setFileError("File Excel tối đa 8 MB."); return; }
    try {
      setIsReading(true); setFileError(""); setRows([]);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0] || ""];
      if (!sheet) throw new Error("File Excel không có sheet dữ liệu.");
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (!rawRows.length) throw new Error("File Excel không có dòng dữ liệu.");
      const headers = Object.keys(rawRows[0]);
      if (!["Mã phụ kiện", "Mã vật tư"].some((header) => headers.includes(header)) || !["Tên phụ kiện", "Tên vật tư"].some((header) => headers.includes(header))) throw new Error("Thiếu cột bắt buộc Mã phụ kiện và Tên phụ kiện.");
      const validation: string[] = [];
      const catalogValue = (value: string, options: Array<{ value: string; label: string; isActive?: boolean }>, label: string, rowNumber: number) => {
        const result = resolveActiveSupplyImportCatalog(value, options.filter((option) => option.value).map((option) => ({ ...option, isActive: option.isActive !== false })), label);
        if (result.error) validation.push(`Dòng ${rowNumber}: ${result.error}.`);
        return result.id;
      };
      const parsedRows = rawRows.slice(0, 200).map((raw, index) => {
        const rowNumber = index + 2;
        const unit = read(raw, "Đơn vị tính") || "Cái";
        if (!availableSupplyUnits.some((option) => option.localeCompare(unit, "vi", { sensitivity: "accent" }) === 0)) validation.push(`Dòng ${rowNumber}: Đơn vị tính “${unit}” không nằm trong danh sách chuẩn đang hoạt động.`);
        return {
          code: read(raw, "Mã phụ kiện", "Mã vật tư").toUpperCase(),
          name: read(raw, "Tên phụ kiện", "Tên vật tư"),
          unit,
          openingQuantity: numericValue(read(raw, "Tồn đầu kỳ")),
          minimumQuantity: numericValue(read(raw, "Mức tồn tối thiểu")),
          unitCost: read(raw, "Đơn giá VNĐ") ? numericValue(read(raw, "Đơn giá VNĐ")) : null,
          location: read(raw, "Vị trí kho") || null,
          categoryId: catalogValue(read(raw, "Phân loại"), categoryOptions, "Phân loại", rowNumber),
          vendorId: catalogValue(read(raw, "Nhà cung cấp"), vendorOptions, "Nhà cung cấp", rowNumber),
          brandId: catalogValue(read(raw, "Hãng"), brandOptions, "Hãng", rowNumber),
          note: read(raw, "Ghi chú") || null,
        };
      });
      if (validation.length) {
        const message = validation.slice(0, 4).join(" ");
        setFileError(message);
        toast.error(`File Excel có ${validation.length} lỗi danh mục hoặc đơn vị tính.`);
        return;
      }
      setRows(parsedRows);
      toast.success("Đã tải dữ liệu. Hãy kiểm tra trước khi lưu.");
    } catch (error) { setFileError(error instanceof Error ? error.message : "Không thể đọc file Excel."); }
    finally { setIsReading(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const updateRow = (index: number, field: keyof SupplyBulkItem, raw: string) => setRows((current) => current.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (field === "code") return { ...row, code: raw.toUpperCase() };
    if (field === "openingQuantity" || field === "minimumQuantity") return { ...row, [field]: numericValue(raw) };
    if (field === "unitCost") return { ...row, unitCost: raw ? numericValue(raw) : null };
    return { ...row, [field]: raw || null };
  }));
  const inputClass = (invalid: boolean) => `h-8 w-full min-w-24 rounded-md border px-2 text-[11px] outline-none focus:ring-2 ${invalid ? "border-[#E47B48] bg-[#FFF9F5] text-[#9E3F12] focus:ring-[#F6C5A8]" : "border-[#DDE7F0] bg-white text-[#193B57] focus:ring-[#B8E9DD]"}`;
  useEffect(() => {
    if (rows.length) return;
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="supply-create-title"]');
    const labels = Array.from(dialog?.querySelectorAll("label") || []).filter((label) => /^(Tồn đầu kỳ|Mức tồn tối thiểu)/.test(label.textContent?.trim() || ""));
    labels.forEach((label) => {
      const input = label.querySelector<HTMLInputElement>("input");
      const existing = label.querySelector<HTMLElement>("[data-whole-quantity-alert]");
      if (!input) return;
      if (!manualQuantityIssue) { existing?.remove(); input.style.borderColor = ""; input.style.backgroundColor = ""; return; }
      input.style.borderColor = "#E47B48";
      input.style.backgroundColor = "#FFF9F5";
      const alert = existing || document.createElement("p");
      alert.dataset.wholeQuantityAlert = "true";
      alert.setAttribute("role", "alert");
      alert.className = "mt-1 text-[10px] font-semibold text-[#B44545]";
      alert.textContent = `Đơn vị ${form.unit || "Cái"} chỉ nhận số lượng nguyên.`;
      if (!existing) label.append(alert);
    });
    return () => labels.forEach((label) => { label.querySelector<HTMLElement>("[data-whole-quantity-alert]")?.remove(); const input = label.querySelector<HTMLInputElement>("input"); if (input) { input.style.borderColor = ""; input.style.backgroundColor = ""; } });
  }, [form.minimumQuantity, form.openingQuantity, form.unit, manualQuantityIssue, rows.length]);
  useEffect(() => {
    const label = Array.from(document.querySelectorAll("label")).find((element) => element.firstChild?.textContent?.trim() === "Đơn giá VNĐ");
    const input = label?.querySelector("input");
    const container = input?.parentElement;
    if (!label || !input || !container || container.dataset.accessoryCurrencyReady === "true") return;
    const formGrid = label.closest<HTMLElement>(".grid");
    formGrid?.classList.add("form-helper-grid");
    container.dataset.accessoryCurrencyReady = "true";
    container.style.position = "relative";
    input.style.paddingRight = "6.5rem";
    input.placeholder = "Ví dụ: 42.500.000";
    const suffix = document.createElement("span");
    suffix.className = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold leading-none text-[#087A6A]";
    suffix.textContent = "VNĐ";
    const clear = document.createElement("button");
    clear.type = "button"; clear.setAttribute("aria-label", "Xóa số tiền"); clear.title = "Xóa số tiền";
    clear.className = "absolute right-11 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]";
    clear.textContent = "×";
    const words = document.createElement("p");
    words.className = "mt-1 pl-1 text-[10px] font-medium leading-4 text-[#8AA0B6]";
    const formatError = document.createElement("p");
    formatError.className = "mt-1 pl-1 text-[10px] font-medium leading-4 text-[#B44545]";
    const renderCurrency = (raw: string) => { const digits = normalizeVndIntegerInput(raw); const formatted = digits ? formatVndInput(digits) : ""; input.value = formatted; input.style.borderColor = ""; input.style.backgroundColor = ""; words.textContent = formatted ? numberToVietnameseWords(formatted) : ""; clear.style.display = formatted ? "grid" : "none"; formatError.textContent = ""; };
    const commitCurrency = (raw: string) => { const digits = normalizeVndIntegerInput(raw); setForm((current) => ({ ...current, unitCost: digits })); window.requestAnimationFrame(() => renderCurrency(digits)); };
    const handleInput = (event: Event) => { event.stopPropagation(); commitCurrency((event.currentTarget as HTMLInputElement).value); };
    const handleClear = () => { commitCurrency(""); input.focus(); };
    input.addEventListener("input", handleInput, true); clear.addEventListener("click", handleClear);
    container.append(suffix, clear); label.append(words, formatError); renderCurrency(form.unitCost);
    return () => { input.removeEventListener("input", handleInput, true); clear.removeEventListener("click", handleClear); suffix.remove(); clear.remove(); words.remove(); formatError.remove(); formGrid?.classList.remove("form-helper-grid"); delete container.dataset.accessoryCurrencyReady; input.style.paddingRight = ""; input.style.borderColor = ""; input.style.backgroundColor = ""; };
  }, [form]);
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="supply-create-title"]');
    const header = dialog?.querySelector<HTMLElement>("header");
    const description = dialog?.querySelector<HTMLElement>("#supply-create-title + p");
    if (!header || !description) return;
    const previousPadding = header.style.paddingBottom;
    const previousMargin = description.style.marginBottom;
    header.style.paddingBottom = "1.35rem";
    description.style.marginBottom = "0.15rem";
    return () => { header.style.paddingBottom = previousPadding; description.style.marginBottom = previousMargin; };
  }, []);
  useEffect(() => {
    const previewTable = Array.from(document.querySelectorAll("table")).find((table) => table.textContent?.includes("Mã phụ kiện") && table.textContent?.includes("Kiểm tra"));
    if (!previewTable) return;
    const header = Array.from(previewTable.querySelectorAll("th")).find((cell) => cell.textContent?.trim() === "Đơn giá");
    if (header && header.dataset.previewCurrencyHeader !== "true") { header.dataset.previewCurrencyHeader = "true"; header.textContent = "Đơn giá (VNĐ)"; }
    previewTable.querySelectorAll("tbody tr").forEach((row, rowIndex) => {
      const cell = row.children[6] as HTMLTableCellElement | undefined;
      const input = cell?.querySelector("input");
      if (!cell || !input) return;
      input.value = rows[rowIndex]?.unitCost === null || rows[rowIndex]?.unitCost === undefined ? "" : formatVndInput(rows[rowIndex].unitCost);
      if (cell.dataset.previewCurrencyReady === "true") return;
      cell.dataset.previewCurrencyReady = "true";
      cell.style.position = "relative";
      input.style.paddingRight = "3.2rem";
      const suffix = document.createElement("span");
      suffix.className = "pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-[#087A6A]";
      suffix.textContent = "VNĐ";
      const clear = document.createElement("button");
      clear.type = "button";
      clear.setAttribute("aria-label", "Xóa đơn giá dòng xem trước");
      clear.title = "Xóa đơn giá";
      clear.className = "absolute right-11 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[#8AA0B6] transition hover:bg-[#ECF8F7] hover:text-[#087A6A]";
      clear.textContent = "×";
      const refreshClear = () => { clear.style.display = input.value ? "grid" : "none"; };
      const commit = (raw: string) => { const digits = normalizeVndIntegerInput(raw); const amount = digits ? Number(digits) : null; setRows((current) => current.map((item, index) => index === rowIndex ? { ...item, unitCost: amount } : item)); };
      const handleInput = (event: Event) => { event.stopPropagation(); commit((event.currentTarget as HTMLInputElement).value); refreshClear(); };
      const handleClear = () => { input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); input.focus(); };
      input.addEventListener("input", handleInput, true);
      clear.addEventListener("click", handleClear);
      cell.append(clear, suffix);
      refreshClear();
    });
  }, [rows]);
  return createPortal(<div className="fixed inset-0 z-[105] flex items-center justify-center px-4 py-6"><button type="button" aria-label="Đóng thêm phụ kiện" disabled={isBusy} onClick={onClose} className="absolute inset-0 bg-[#102A43]/45 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="supply-create-title" className="relative z-[1] flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,.24)]"><header className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#E6F6F2] text-[#087A6A]"><Plus size={19} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Danh mục kho</div><h2 id="supply-create-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Thêm phụ kiện</h2><p className="mt-1 text-xs text-[#71869A]">Tự nhập từng phụ kiện hoặc tải Excel để xem trước, sửa dữ liệu và xác nhận lưu.</p></div></div><button type="button" disabled={isBusy} onClick={onClose} className="drawer-close-action" aria-label="Đóng thêm phụ kiện"><X size={18} /></button></header><div className="overflow-y-auto p-5 sm:p-6"><section className="rounded-xl border border-[#CDE5E5] bg-[#F4FBFA] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-extrabold text-[#087A6A]"><FileSpreadsheet size={15} />Nhập danh sách phụ kiện từ Excel</div><p className="mt-1 text-[11px] leading-5 text-[#4B8884]">Sau khi tải file, hãy sửa trực tiếp các ô có cảnh báo trước khi xác nhận lưu.</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#CDE5E5] bg-white px-3 text-[11px] font-bold text-[#087A6A] hover:bg-[#ECF8F7]"><Download size={14} />Tải mẫu phụ kiện</button><label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#087A6A] px-3 text-[11px] font-bold text-white hover:bg-[#066254]"><Upload size={14} />Chọn Excel<input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void parseExcel(file); }} /></label></div></div></section>{fileError && <div className="mt-4 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-3 text-xs font-semibold text-[#9E3F12]">{fileError}</div>}{rows.length > 0 ? <section className="mt-4"><div className="flex flex-col gap-3 rounded-xl border border-[#DDE7F0] bg-[#FBFCFD] p-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-extrabold text-[#193B57]">Xem trước và chỉnh sửa dữ liệu</p><p className="mt-1 text-[11px] text-[#71869A]">Các ô có viền cam thuộc hàng cần chỉnh sửa. Hệ thống kiểm tra lại ngay khi bạn thay đổi.</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${invalidRows.length ? "bg-[#FFF2E9] text-[#9E3F12]" : "bg-[#E6F6F2] text-[#087A6A]"}`}>{invalidRows.length ? `${invalidRows.length} dòng cần sửa` : `${rows.length} dòng hợp lệ`}</span></div><div className="mt-3 overflow-x-auto rounded-xl border border-[#DDE7F0]"><table className="min-w-[1240px] w-full text-left text-[11px]"><thead className="bg-[#F7FAFC] uppercase tracking-[.08em] text-[#71869A]"><tr><th className="px-3 py-3">Dòng</th><th className="px-3 py-3">Mã phụ kiện</th><th className="px-3 py-3">Tên phụ kiện</th><th className="px-3 py-3">Đơn vị</th><th className="px-3 py-3">Tồn đầu</th><th className="px-3 py-3">Tối thiểu</th><th className="px-3 py-3">Đơn giá</th><th className="px-3 py-3">Vị trí kho</th><th className="px-3 py-3">Kiểm tra</th></tr></thead><tbody>{rows.map((row, index) => { const issues = rowIssues[index]?.issues || []; const invalid = issues.length > 0; return <tr key={`${index}-${row.code}`} className={`border-t border-[#EDF2F5] align-top ${invalid ? "bg-[#FFF5EE]" : "bg-white"}`}><td className="px-3 py-3 font-bold text-[#60758A]">{index + 2}</td><td className="px-3 py-2"><input value={row.code} onChange={(event) => updateRow(index, "code", event.target.value)} className={inputClass(invalid && issues.some((issue) => issue.includes("Mã")))} /></td><td className="px-3 py-2"><input value={row.name} onChange={(event) => updateRow(index, "name", event.target.value)} className={inputClass(invalid && issues.some((issue) => issue.includes("Tên")))} /></td><td className="px-3 py-2"><input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} className={inputClass(false)} /></td><td className="px-3 py-2"><input inputMode="decimal" value={Number.isFinite(row.openingQuantity) ? String(row.openingQuantity) : ""} onChange={(event) => updateRow(index, "openingQuantity", event.target.value)} className={inputClass(invalid && issues.some((issue) => issue.includes("Tồn đầu")))} /></td><td className="px-3 py-2"><input inputMode="decimal" value={Number.isFinite(row.minimumQuantity) ? String(row.minimumQuantity) : ""} onChange={(event) => updateRow(index, "minimumQuantity", event.target.value)} className={inputClass(invalid && issues.some((issue) => issue.includes("Mức tồn")))} /></td><td className="px-3 py-2"><input inputMode="numeric" value={row.unitCost === null ? "" : Number.isFinite(row.unitCost) ? String(row.unitCost) : ""} onChange={(event) => updateRow(index, "unitCost", event.target.value)} className={inputClass(invalid && issues.some((issue) => issue.includes("Đơn giá")))} /></td><td className="px-3 py-2"><input value={row.location || ""} onChange={(event) => updateRow(index, "location", event.target.value)} className={inputClass(false)} /></td><td className="px-3 py-3">{invalid ? <div className="flex min-w-56 gap-1.5 text-[#9E3F12]"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><div className="space-y-1 font-semibold">{issues.map((issue) => <p key={issue}>{issue}</p>)}</div></div> : <span className="font-bold text-[#087A6A]">Hợp lệ</span>}</td></tr>; })}</tbody></table></div><label className="mt-3 flex items-start gap-2 rounded-xl border border-[#DDE7F0] p-3 text-xs font-semibold text-[#193B57]"><input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#8BCDC6] text-[#0F8C8C]" /><span><span className="block font-extrabold">Tự động cập nhật phụ kiện trùng mã</span><span className="mt-1 block text-[11px] font-medium text-[#71869A]">{existingCount ? `${existingCount} dòng trùng mã sẽ được cập nhật khi xác nhận.` : "Không có mã nào trùng với dữ liệu hiện có."}</span></span></label></section> : <div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Mã phụ kiện *"><input autoFocus value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="VD: PK-CHUOT-M100" className="field-input font-mono" /></Field><Field label="Tên phụ kiện *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="VD: Chuột Logitech M100" className="field-input" /></Field><Field label="Đơn vị tính"><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="field-input" /></Field><Field label="Tồn đầu kỳ"><input inputMode="decimal" value={form.openingQuantity} onChange={(event) => setForm({ ...form, openingQuantity: event.target.value })} className="field-input" /></Field><Field label="Mức tồn tối thiểu"><input inputMode="decimal" value={form.minimumQuantity} onChange={(event) => setForm({ ...form, minimumQuantity: event.target.value })} className="field-input" /></Field><Field label="Đơn giá VNĐ"><input inputMode="numeric" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} className="field-input" /></Field><div className="sm:col-span-2"><Field label="Vị trí kho"><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="VD: Kho CNTT - Kệ A" className="field-input" /></Field></div><SelectField label="Phân loại"><SearchableSelect value={form.categoryId} onChange={(next) => setForm({ ...form, categoryId: next })} options={categoryOptions} placeholder="Chọn phân loại" searchPlaceholder="Tìm phân loại..." /></SelectField><SelectField label="Nhà cung cấp"><SearchableSelect value={form.vendorId} onChange={(next) => setForm({ ...form, vendorId: next })} options={vendorOptions} placeholder="Chọn nhà cung cấp" searchPlaceholder="Tìm nhà cung cấp..." /></SelectField><SelectField label="Hãng"><SearchableSelect value={form.brandId} onChange={(next) => setForm({ ...form, brandId: next })} options={brandOptions} placeholder="Chọn hãng" searchPlaceholder="Tìm hãng..." /></SelectField><div className="sm:col-span-2"><Field label="Ghi chú"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="field-input min-h-24" /></Field></div></div>}</div><footer className="flex items-center justify-end gap-3 border-t border-[#E7EEF3] px-5 py-4 sm:px-6"><button type="button" disabled={isBusy} onClick={onClose} className="inline-flex h-11 min-w-[108px] items-center justify-center rounded-lg border border-[#DDE7F0] px-4 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:opacity-50">Hủy</button><button type="button" disabled={isBusy || (rows.length > 0 && !canSavePreview)} onClick={() => rows.length ? bulkCreate.mutate({ items: rows, updateExisting }) : onSubmit()} className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 text-xs font-bold text-white shadow-[0_5px_14px_rgba(15,140,140,0.22)] hover:bg-[#087A6A] disabled:opacity-50"><Plus size={15} />{isBusy ? "Đang xử lý..." : rows.length ? `Xác nhận lưu ${rows.length} dòng` : "Tạo phụ kiện"}</button></footer></section></div>, document.body);
}

function SupplyImportHistoryDialog({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const history = trpc.supplies.importHistory.useQuery({ page, pageSize: 6 });
  const detail = trpc.supplies.importHistoryItems.useQuery({ sessionId: selectedSessionId || 0 }, { enabled: selectedSessionId !== null });
  const sessions = history.data?.items || [];
  const selected = detail.data?.session;
  const itemSnapshot = (value: unknown) => (value && typeof value === "object" ? value as Record<string, unknown> : {});
  return createPortal(<div className="fixed inset-0 z-[108] flex items-center justify-center px-4 py-6"><button type="button" aria-label="Đóng lịch sử import vật tư" onClick={onClose} className="absolute inset-0 bg-[#102A43]/45 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="supply-import-history-title" className="relative z-[1] flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#DFE9F0] bg-white shadow-[0_24px_70px_rgba(16,42,67,.24)]"><header className="flex items-start justify-between border-b border-[#E7EEF3] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF3FF] text-[#2666A8]"><History size={19} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2666A8]">Theo dõi kho</div><h2 id="supply-import-history-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Lịch sử import vật tư</h2><p className="mt-1 text-xs text-[#71869A]">Theo dõi người thực hiện, thời điểm và các dòng tạo mới hoặc cập nhật.</p></div></div><button type="button" onClick={onClose} className="drawer-close-action" aria-label="Đóng lịch sử import"><X size={18} /></button></header><div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_.8fr]"><section className="min-h-0 overflow-y-auto p-5 sm:p-6"><div className="rounded-xl border border-[#DFE9F0]"><div className="overflow-x-auto"><table className="min-w-[620px] w-full text-left text-xs"><thead className="bg-[#F8FBFC] text-[10px] uppercase tracking-[.1em] text-[#8AA0B6]"><tr><th className="px-3 py-3">Mã phiên</th><th className="px-3 py-3">Thực hiện</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3">Thời điểm</th><th className="px-3 py-3" /></tr></thead><tbody>{history.isLoading ? <tr><td colSpan={5} className="p-8 text-center text-[#71869A]">Đang tải lịch sử import...</td></tr> : sessions.map((session) => <tr key={session.id} className={`border-t border-[#EDF2F5] ${selectedSessionId === session.id ? "bg-[#F4FBFA]" : "hover:bg-[#FBFCFD]"}`}><td className="px-3 py-3 font-mono text-[11px] font-bold text-[#087A6A]">{session.referenceCode}</td><td className="px-3 py-3 font-semibold text-[#193B57]">{session.createdByName || "Quản trị viên"}</td><td className="px-3 py-3"><span className="font-bold text-[#087A6A]">+{session.createdCount}</span><span className="mx-1 text-[#8AA0B6]">/</span><span className="font-bold text-[#2666A8]">~{session.updatedCount}</span></td><td className="px-3 py-3 text-[11px] text-[#60758A]">{new Date(session.createdAt).toLocaleString("vi-VN")}</td><td className="px-3 py-3"><button type="button" onClick={() => setSelectedSessionId(session.id)} className="text-[11px] font-extrabold text-[#087A6A] hover:underline">Chi tiết</button></td></tr>)}{!history.isLoading && !sessions.length && <tr><td colSpan={5} className="p-8 text-center text-[#8AA0B6]">Chưa có phiên import vật tư nào.</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-[#E7EEF3] px-3 py-2"><span className="text-[11px] font-semibold text-[#71869A]">{history.data?.total || 0} phiên import</span><div className="flex items-center gap-1"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="icon-action disabled:opacity-40" aria-label="Trang lịch sử import trước">‹</button><span className="min-w-12 text-center text-[11px] font-extrabold text-[#60758A]">{history.data?.page || 1}/{history.data?.totalPages || 1}</span><button type="button" disabled={page >= (history.data?.totalPages || 1)} onClick={() => setPage((current) => current + 1)} className="icon-action disabled:opacity-40" aria-label="Trang lịch sử import sau">›</button></div></div></div><p className="mt-3 text-[11px] text-[#71869A]"><span className="font-bold text-[#087A6A]">+ Tạo mới</span> · <span className="font-bold text-[#2666A8]">~ Cập nhật</span></p></section><aside className="min-h-0 overflow-y-auto border-t border-[#E7EEF3] bg-[#FBFCFD] p-5 lg:border-l lg:border-t-0 sm:p-6">{selectedSessionId === null ? <div className="grid min-h-48 place-items-center text-center"><div><History size={24} className="mx-auto text-[#8AA0B6]" /><p className="mt-3 text-sm font-bold text-[#526779]">Chọn một phiên import</p><p className="mt-1 text-xs text-[#8AA0B6]">Xem lại chi tiết các dòng đã tạo hoặc cập nhật.</p></div></div> : detail.isLoading ? <p className="text-sm text-[#71869A]">Đang tải chi tiết phiên import...</p> : <div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2666A8]">Chi tiết phiên</div><h3 className="mt-1 font-mono text-sm font-extrabold text-[#193B57]">{selected?.referenceCode}</h3><p className="mt-1 text-[11px] text-[#71869A]">{selected ? new Date(selected.createdAt).toLocaleString("vi-VN") : ""} · {selected?.createdByName || "Quản trị viên"}</p><div className="mt-4 space-y-2">{(detail.data?.items || []).map((item) => { const before = itemSnapshot(item.beforeSnapshot); const after = itemSnapshot(item.afterSnapshot); return <article key={item.id} className="rounded-xl border border-[#DFE9F0] bg-white p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[11px] font-extrabold text-[#087A6A]">{String(after.code || before.code || `VT#${item.supplyId}`)}</p><p className="mt-1 text-xs font-bold text-[#193B57]">{String(after.name || before.name || "Vật tư")}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.action === "created" ? "bg-[#E6F6F2] text-[#087A6A]" : "bg-[#EAF3FF] text-[#2666A8]"}`}>{item.action === "created" ? "Tạo mới" : "Cập nhật"}</span></div>{item.action === "updated" && <p className="mt-2 text-[11px] text-[#60758A]">Tồn kho: {quantity(before.stockQuantity as string)} → {quantity(after.stockQuantity as string)} {String(after.unit || before.unit || "")}</p>}{item.action === "created" && <p className="mt-2 text-[11px] text-[#60758A]">Tồn đầu: {quantity(after.stockQuantity as string)} {String(after.unit || "")}</p>}</article>; })}{!detail.data?.items.length && <p className="text-xs text-[#8AA0B6]">Phiên này chưa có dòng chi tiết.</p>}</div></div>}</aside></div></section></div>, document.body);
}
function Metric({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "teal" | "warning" }) { const toneClass = tone === "teal" ? "border-[#CDE5E5] bg-[#F4FBFA] text-[#087A6A]" : tone === "warning" ? "border-[#F2B18B] bg-[#FFF2E9] text-[#C75419]" : "border-[#DFE9F0] bg-white text-[#193B57]"; return <div className={`flex min-w-[76px] flex-col items-center justify-center rounded-xl border px-3 py-2 text-center shadow-sm ${toneClass}`}><div className="text-[10px] font-bold uppercase text-[#8AA0B6]">{label}</div><div className="mt-1 text-lg font-extrabold leading-none">{value}</div></div>; }
function AccessoryGroupSummary({ supplies, categoriesById }: { supplies: Array<{ categoryId: number | null; stockQuantity: string; minimumQuantity: string; unit: string }>; categoriesById: Map<number, string> }) {
  const groups = useMemo(() => {
    const summary = new Map<string, { count: number; quantity: number; low: number; unit: string }>();
    supplies.forEach((item) => { const label = item.categoryId ? categoriesById.get(item.categoryId) || "Nhóm đã ngừng" : "Chưa gán nhóm"; const current = summary.get(label) || { count: 0, quantity: 0, low: 0, unit: item.unit }; current.count += 1; current.quantity += Number(item.stockQuantity || 0); current.low += Number(item.stockQuantity) <= Number(item.minimumQuantity) ? 1 : 0; summary.set(label, current); });
    return [...summary.entries()].map(([label, value]) => ({ label, ...value })).sort((a, b) => b.quantity - a.quantity);
  }, [categoriesById, supplies]);
  return <section className="rounded-2xl border border-[#DCEBE9] bg-[#FBFEFE] p-4 shadow-[0_8px_24px_rgba(16,42,67,0.04)]"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#0F8C8C]">Tổng quan theo nhóm</div><h2 className="mt-1 font-display text-base font-extrabold text-[#193B57]">Tồn kho phụ kiện theo nhóm</h2></div><span className="text-[11px] font-semibold text-[#71869A]">{groups.length} nhóm đang theo dõi</span></div>{groups.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{groups.map((group) => <article key={group.label} className="rounded-xl border border-[#DDE7F0] bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-extrabold text-[#193B57]">{group.label}</p>{group.low > 0 && <span className="rounded-full bg-[#FFF2E9] px-2 py-0.5 text-[10px] font-extrabold text-[#C75419]">{group.low} sắp hết</span>}</div><p className="mt-3 font-display text-2xl font-extrabold text-[#087A6A]">{quantity(group.quantity)} <span className="text-xs text-[#71869A]">{group.unit}</span></p><p className="mt-1 text-[11px] font-semibold text-[#71869A]">{group.count} loại phụ kiện</p></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#CDE5E5] px-4 py-5 text-center text-xs font-semibold text-[#71869A]">Chưa có phụ kiện để tổng hợp theo nhóm.</p>}</section>;
}
function AccessoryGroupCreateDialog({ initialName, isSubmitting, onClose, onCreate }: { initialName: string; isSubmitting: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  return createPortal(<div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6"><button type="button" aria-label="Đóng tạo nhóm phụ kiện" disabled={isSubmitting} onClick={onClose} className="absolute inset-0 bg-[#102A43]/45 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="accessory-group-create-title" className="relative z-[1] w-full max-w-md rounded-2xl border border-[#DFE9F0] bg-white p-5 shadow-[0_24px_70px_rgba(16,42,67,.24)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Nhóm phụ kiện</div><h2 id="accessory-group-create-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Tạo nhanh nhóm mới</h2><p className="mt-1 text-xs text-[#71869A]">Hệ thống sẽ tự tạo mã nhóm dạng PKG-001.</p></div><button type="button" onClick={onClose} disabled={isSubmitting} className="drawer-close-action"><X size={18} /></button></div><div className="mt-5"><Field label="Tên nhóm phụ kiện *"><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="VD: Thiết bị ngoại vi" className="field-input" /></Field></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} onClick={onClose} className="filter-action">Hủy</button><button type="button" disabled={isSubmitting || name.trim().length < 2} onClick={() => onCreate(name.trim())} className="primary-action">{isSubmitting ? "Đang tạo..." : "Tạo nhóm"}</button></div></section></div>, document.body);
}
function Pagination({ rows, total, page, totalPages, onPrevious, onNext }: { rows: number; total: number; page: number; totalPages: number; onPrevious: () => void; onNext: () => void }) { return <div className="flex items-center justify-between border-t border-[#E7EEF3] px-4 py-3"><span className="text-[11px] font-semibold text-[#71869A]">Hiển thị {rows}/{total} phụ kiện</span><div className="flex items-center gap-1"><button type="button" aria-label="Trang phụ kiện trước" onClick={onPrevious} disabled={page <= 1} className="icon-action disabled:opacity-40">‹</button><span className="min-w-14 text-center text-[11px] font-extrabold text-[#60758A]">{page}/{totalPages}</span><button type="button" aria-label="Trang phụ kiện sau" onClick={onNext} disabled={page >= totalPages} className="icon-action disabled:opacity-40">›</button></div></div>; }
function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) { return <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Giao dịch tồn kho</div><h2 className="mt-1 font-display text-xl font-extrabold text-[#102A43]">{title}</h2><p className="mt-1 text-xs text-[#71869A]">{subtitle}</p></div><button onClick={onClose} className="drawer-close-action" aria-label="Đóng giao dịch phụ kiện"><X size={18} /></button></div>; }
function IssueSlipConfirmationDialog({ supplyName, unit, quantity: issueQuantity, recipient, department, stockAfterIssue, minimumStock, lowStockWarning, isSubmitting, onCancel, onConfirm }: { supplyName: string; unit: string; quantity: string; recipient: string; department: string; stockAfterIssue: number; minimumStock: number; lowStockWarning: boolean; isSubmitting: boolean; onCancel: () => void; onConfirm: () => void }) { const rows = [["Phụ kiện", supplyName], ["Số lượng", `${quantity(issueQuantity)} ${unit}`], ["Tồn kho sau cấp", `${quantity(stockAfterIssue)} ${unit}`], ["Người nhận", recipient], ["Phòng ban", department]]; return <div onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onCancel(); }} className="fixed inset-0 z-[110] flex items-center justify-center bg-[#102A43]/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="issue-slip-confirmation-title"><section className="w-full max-w-md rounded-2xl border border-[#CDE5E5] bg-white p-5 shadow-[0_24px_70px_rgba(16,42,67,.24)] sm:p-6"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FFF5DC] text-[#A86B00]"><AlertTriangle size={20} /></div><div><div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#0F8C8C]">Xác nhận cấp phát</div><h2 id="issue-slip-confirmation-title" className="mt-1 font-display text-xl font-extrabold text-[#102A43]">Tạo phiếu cấp phát?</h2><p className="mt-1 text-xs leading-5 text-[#71869A]">Kiểm tra lại thông tin trước khi trừ tồn kho và tạo phiếu PK-NĂM-001.</p></div></div><dl className="mt-5 overflow-hidden rounded-xl border border-[#E7EEF3] bg-[#FBFCFD]">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[116px_1fr] gap-3 border-b border-[#E7EEF3] px-4 py-3 last:border-0"><dt className="text-[11px] font-bold text-[#71869A]">{label}</dt><dd className="text-right text-xs font-extrabold text-[#193B57]">{value}</dd></div>)}</dl>{lowStockWarning && <div className="mt-4 flex gap-3 rounded-xl border border-[#F2B18B] bg-[#FFF2E9] p-3 text-[#9E3F12]"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><div className="text-xs font-extrabold">Cảnh báo tồn kho thấp</div><p className="mt-1 text-[11px] leading-5">Sau cấp phát, tồn kho còn {quantity(stockAfterIssue)} {unit}, thấp hơn mức tối thiểu {quantity(minimumStock)} {unit}. Hãy cân nhắc nhập thêm hàng.</p></div></div>}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} onClick={onCancel} className="rounded-lg border border-[#DDE7F0] px-4 py-2.5 text-xs font-bold text-[#60758A] hover:bg-[#F7FAFC] disabled:opacity-50">Hủy</button><button type="button" disabled={isSubmitting} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F8C8C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#087A6A] disabled:opacity-50"><ArchiveRestore size={15} />{isSubmitting ? "Đang tạo phiếu..." : "Xác nhận tạo phiếu"}</button></div></section></div>; }
function MovementTab({ active, onClick, icon, label, tone = "teal" }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; tone?: "teal" | "amber" | "blue" }) { const activeClass = tone === "amber" ? "bg-[#FFF5DC] text-[#A86B00]" : tone === "blue" ? "bg-[#EAF3FF] text-[#2666A8]" : "bg-[#E6F6F2] text-[#087A6A]"; return <button type="button" onClick={onClick} className={`rounded-lg px-2 py-2 text-xs font-extrabold ${active ? activeClass : "bg-[#F7FAFC] text-[#60758A]"}`}><span className="mx-auto mb-1 block w-fit">{icon}</span>{label}</button>; }
function MovementHistory({ data, loading, unit, total, page, pageSize, onPageChange }: { data: Array<{ id: number; movementType: "receipt" | "issue" | "adjustment" | "return"; quantity: string; quantityBefore: string; quantityAfter: string; note: string | null; recipientName: string | null; createdAt: Date; createdByName: string | null }>; loading: boolean; unit: string; total: number; page: number; pageSize: number; onPageChange: (page: number) => void }) { const totalPages = Math.max(1, Math.ceil(total / pageSize)); const activePage = Math.min(page, totalPages); const from = total ? (activePage - 1) * pageSize + 1 : 0; const to = Math.min(activePage * pageSize, total); return <section className="mt-6"><div className="flex items-center justify-between"><h3 className="font-display text-base font-extrabold text-[#193B57]">Lịch sử biến động</h3><span className="text-xs font-semibold text-[#71869A]">{total} dòng</span></div><div className="mt-3 space-y-2">{loading ? <p className="text-sm text-[#71869A]">Đang tải lịch sử...</p> : data.map((movement) => <article key={movement.id} className="rounded-xl border border-[#E7EEF3] p-3"><div className="flex justify-between gap-3"><div><div className="text-xs font-extrabold text-[#193B57]">{movement.movementType === "receipt" ? "Nhập kho" : movement.movementType === "issue" ? "Xuất/Cấp phát" : movement.movementType === "return" ? "Hoàn trả về kho" : "Điều chỉnh"}</div><div className="mt-1 text-[11px] text-[#71869A]">{new Date(movement.createdAt).toLocaleString("vi-VN")} · {movement.createdByName || "Quản trị viên"}</div></div><div className={`text-sm font-extrabold ${Number(movement.quantity) < 0 ? "text-[#C75419]" : "text-[#087A6A]"}`}>{Number(movement.quantity) > 0 ? "+" : ""}{quantity(movement.quantity)} {unit}</div></div><p className="mt-2 text-xs text-[#60758A]">{movement.note || "—"}</p>{movement.recipientName && <p className="mt-1 text-[11px] text-[#8AA0B6]">Nhận: {movement.recipientName}</p>}<p className="mt-2 text-[11px] font-semibold text-[#71869A]">Tồn: {quantity(movement.quantityBefore)} → {quantity(movement.quantityAfter)}</p></article>)}{!loading && !data.length && <p className="rounded-lg border border-dashed border-[#DDE7F0] p-4 text-center text-xs text-[#8AA0B6]">Chưa có giao dịch nào.</p>}</div>{!loading && total > pageSize && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EEF3] pt-3"><p className="text-[11px] font-semibold text-[#71869A]">Hiển thị {from}–{to} / {total} biến động</p><div className="flex items-center gap-2"><button type="button" onClick={() => onPageChange(activePage - 1)} disabled={activePage <= 1} aria-label="Trang lịch sử trước" className="min-h-9 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#527089] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-45">‹</button><span className="min-w-16 text-center text-[11px] font-extrabold text-[#193B57]">Trang {activePage}/{totalPages}</span><button type="button" onClick={() => onPageChange(activePage + 1)} disabled={activePage >= totalPages} aria-label="Trang lịch sử sau" className="min-h-9 rounded-lg border border-[#DDE7F0] px-3 text-xs font-bold text-[#527089] hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-45">›</button></div></div>}</section>; }
