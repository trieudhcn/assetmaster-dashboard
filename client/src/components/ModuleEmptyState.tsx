type ModuleEmptyStateProps = {
  module: "maintenance" | "handover" | "audit";
  title: string;
  description: string;
};

function EmptyIllustration({ module }: { module: ModuleEmptyStateProps["module"] }) {
  const accent = module === "maintenance" ? "#0F8C8C" : module === "handover" ? "#2666A8" : "#A86B00";
  const softAccent = module === "maintenance" ? "#DDF4F1" : module === "handover" ? "#E5F0FF" : "#FFF1CA";

  return (
    <svg viewBox="0 0 160 128" className="h-28 w-28" role="img" aria-label="Không có dữ liệu phù hợp" focusable="false">
      <title>Không có dữ liệu phù hợp</title>
      <path d="M16 91c15-25 29-39 57-43 23-4 44 5 71 27v25H16Z" fill="#F4F8FA" />
      <rect x="32" y="25" width="84" height="70" rx="10" fill="white" stroke="#C9DCE3" strokeWidth="2" />
      <rect x="44" y="39" width="42" height="7" rx="3.5" fill="#DCE9ED" />
      <rect x="44" y="53" width="58" height="6" rx="3" fill="#E8F0F2" />
      <rect x="44" y="66" width="46" height="6" rx="3" fill="#E8F0F2" />
      <rect x="44" y="79" width="30" height="6" rx="3" fill="#E8F0F2" />
      <circle cx="112" cy="82" r="21" fill={softAccent} stroke="white" strokeWidth="4" />
      <circle cx="108" cy="78" r="8" fill="white" stroke={accent} strokeWidth="3" />
      <path d="m114 84 9 9" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      {module === "maintenance" ? (
        <path d="m103 58 8-8m-10 2 5 5m-9 3 6 6" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      ) : module === "handover" ? (
        <path d="M102 58h13m-13 0-4 4m4-4 4-4m9 4 4 4m-4-4-4-4" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m100 59 4 4 9-10" stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <circle cx="22" cy="29" r="4" fill={softAccent} />
      <circle cx="132" cy="23" r="3" fill="#DDECEF" />
      <path d="M19 106h122" stroke="#D7E5E9" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ModuleEmptyState({ module, title, description }: ModuleEmptyStateProps) {
  return (
    <div className="modal-empty-state flex flex-col items-center justify-center px-5 py-12 text-center">
      <EmptyIllustration module={module} />
      <h3 className="mt-3 text-sm font-extrabold text-[#193B57]">{title}</h3>
      <p className="mt-1 max-w-md text-xs leading-5 text-[#8AA0B6]">{description}</p>
    </div>
  );
}
