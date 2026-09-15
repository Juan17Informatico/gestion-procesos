import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  hasActiveSearch?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  itemLabel,
  hasActiveSearch = false,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-slate-600">
        {hasActiveSearch ? <span>{totalItems} resultados encontrados. </span> : null}
        <span>
          Mostrando {start}-{end} de {totalItems} {itemLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          className="min-h-9 px-3 py-1"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Anterior
        </Button>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          return (
            <span className="contents" key={page}>
              {previous && page - previous > 1 ? <span className="px-2 text-slate-400">...</span> : null}
              <button
                className={`min-h-9 min-w-9 rounded-md px-3 text-sm font-medium ${
                  page === currentPage
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            </span>
          );
        })}
        <Button
          className="min-h-9 px-3 py-1"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
