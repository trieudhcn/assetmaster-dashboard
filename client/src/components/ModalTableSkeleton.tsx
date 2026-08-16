type ModalTableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function ModalTableSkeleton({ rows = 6, columns = 5 }: ModalTableSkeletonProps) {
  return (
    <div aria-label="Đang tải dữ liệu bảng" aria-busy="true" className="modal-skeleton-table space-y-2 p-4">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span key={columnIndex} className="modal-skeleton-line" style={{ width: `${72 - ((rowIndex + columnIndex) % 3) * 10}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
