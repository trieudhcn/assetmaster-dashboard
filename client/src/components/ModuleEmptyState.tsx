type ModuleEmptyStateProps = {
  module: "maintenance" | "handover" | "audit";
  title: string;
  description: string;
};

const illustrations = {
  maintenance: "/manus-storage/empty-maintenance_83a5137a.png",
  handover: "/manus-storage/empty-handover_4fa5a517.png",
  audit: "/manus-storage/empty-audit_439c511b.png",
} as const;

export function ModuleEmptyState({ module, title, description }: ModuleEmptyStateProps) {
  return (
    <div className="modal-empty-state flex flex-col items-center justify-center px-5 py-12 text-center">
      <img src={illustrations[module]} alt="" aria-hidden="true" className="h-28 w-28 object-contain" />
      <h3 className="mt-3 text-sm font-extrabold text-[#193B57]">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-5 text-[#8AA0B6]">{description}</p>
    </div>
  );
}
