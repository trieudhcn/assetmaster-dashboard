from pathlib import Path
import re

path = Path('/home/ubuntu/assetmaster-dashboard/client/src/pages/OperationsModules.tsx')
text = path.read_text()

# Remove the old import trigger from the filter row; the hidden input remains there.
old_import = re.compile(r'<button type="button" disabled=\{!isAdmin \|\| importItemsMutation\.isPending\} onClick=\{\(\) => auditImportInputRef\.current\?\.click\(\)\} className="inline-flex min-h-10[^>]*><Upload size=\{15\} />Nhập Excel</button>')
text, removed = old_import.subn('', text, count=1)
if removed != 1:
    raise SystemExit(f'old import button count={removed}')

# Place the new import trigger directly after the fieldwork export button.
fieldwork = re.search(r'<button disabled=\{!fieldworkRows\.length \|\| isExportingFieldworkSheet\}.*?>\{isExportingFieldworkSheet \? "Đang tạo\.\.\." : "Danh sách kiểm kê"\}</button>', text)
if not fieldwork:
    raise SystemExit('fieldwork button not found')
new_import = '<button type="button" disabled={!isAdmin || importItemsMutation.isPending} onClick={() => auditImportInputRef.current?.click()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#C7DDF8] bg-white px-4 py-2 text-xs font-bold text-[#2666A8] transition hover:bg-[#EAF3FF] disabled:cursor-not-allowed disabled:opacity-60"><Upload size={15} />Nhập file đã kiểm kê</button>'
text = text[:fieldwork.end()] + new_import + text[fieldwork.end():]

# Give the search icon its own centered, non-overlapping positioning and extra input padding.
old_search = '<div className="relative"><Search size={14} className="absolute left-3 top-3 text-[#8AA0B6]" />'
new_search = '<div className="relative"><Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8AA0B6]" />'
if old_search not in text:
    raise SystemExit('audit search icon not found')
text = text.replace(old_search, new_search, 1)
text = text.replace('placeholder="Tìm mã, tên hoặc serial tài sản..." className="field-input pl-9"', 'placeholder="Tìm mã, tên hoặc serial tài sản..." className="field-input pl-11"', 1)

# Rebuild the preview workbook rows with readable semantic fills.
old_export = 'await writeBrandedWorkbook(workbook, { documentTitle: "PREVIEW CẬP NHẬT KIỂM KÊ", fileName: `assetmaster-preview-import-.xlsx`, description: `Đợt  ·  dòng preview trước khi cập nhật.` });'
new_export = '''await writeBrandedWorkbook(workbook, { documentTitle: "PREVIEW CẬP NHẬT KIỂM KÊ", fileName: `assetmaster-preview-import-${selectedAudit.referenceCode}.xlsx`, description: `Đợt ${selectedAudit.name} · ${rows.length} dòng preview trước khi cập nhật.`, prepareWorkbook: (brandedWorkbook) => {
        const previewSheet = brandedWorkbook.getWorksheet("Preview import");
        if (!previewSheet) return;
        for (let rowIndex = 2; rowIndex <= previewSheet.rowCount; rowIndex += 1) {
          const row = previewSheet.getRow(rowIndex);
          const result = String(row.getCell(7).value || "");
          const status = String(row.getCell(5).value || "");
          const argb = result.includes("Chênh lệch") ? "FFFFF1D6" : result.includes("không tìm thấy") || status.includes("Thất lạc") ? "FFFFE3E8" : result.includes("Khớp") ? "FFE6F6F2" : "FFF7FAFC";
          row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; });
        }
      } });'''
if old_export not in text:
    raise SystemExit('preview export placeholder not found')
text = text.replace(old_export, new_export, 1)
path.write_text(text)
print('patched audit toolbar and preview workbook')
