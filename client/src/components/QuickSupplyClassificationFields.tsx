import { Award, Layers3 } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";

type CatalogItem = { id: number; name: string; isActive: boolean };

export function QuickSupplyClassificationFields({ categories, brands, categoryId, brandId, onCategoryChange, onBrandChange }: { categories: CatalogItem[]; brands: CatalogItem[]; categoryId: string; brandId: string; onCategoryChange: (value: string) => void; onBrandChange: (value: string) => void }) {
  const categoryOptions = [{ value: "", label: "Chưa gán Nhóm phụ kiện" }, ...categories.map((item) => ({ value: String(item.id), label: item.name, isActive: item.isActive }))];
  const brandOptions = [{ value: "", label: "Chưa gán Hãng sản xuất" }, ...brands.map((item) => ({ value: String(item.id), label: item.name, isActive: item.isActive }))];
  return <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><div className="space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-extrabold text-[#526779]"><Layers3 size={14} className="text-[#087A6A]" />Nhóm Phụ kiện</span><SearchableSelect value={categoryId} onChange={onCategoryChange} options={categoryOptions} placeholder="Chưa gán Nhóm phụ kiện" searchPlaceholder="Tìm Nhóm phụ kiện..." /></div><div className="space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-extrabold text-[#526779]"><Award size={14} className="text-[#087A6A]" />Hãng sản xuất</span><SearchableSelect value={brandId} onChange={onBrandChange} options={brandOptions} placeholder="Chưa gán Hãng sản xuất" searchPlaceholder="Tìm Hãng sản xuất..." /></div><p className="sm:col-span-2 text-[10px] leading-4 text-[#71869A]">Chỉ danh mục đang hoạt động được chọn. Có thể để trống và cập nhật sau tại menu Phụ kiện.</p></div>;
}
