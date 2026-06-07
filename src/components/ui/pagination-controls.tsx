"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({ currentPage, onPageChange, totalPages }: { currentPage: number; onPageChange: (page: number) => void; totalPages: number }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginacion" className="flex items-center justify-center gap-4">
      <button
        aria-label="Pagina anterior"
        className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        type="button"
      >
        <ChevronLeft size={22} />
      </button>
      <div className="flex items-center gap-4">
        {pageNumbers(currentPage, totalPages).map((item) => item === "..." ? (
          <span key={`${item}-${currentPage}`} className="px-1 text-sm font-semibold text-muted">...</span>
        ) : (
          <button
            key={item}
            aria-current={item === currentPage ? "page" : undefined}
            className={`min-w-10 border-b-2 px-2 pb-2 pt-1 text-base font-medium transition ${item === currentPage ? "border-foreground text-foreground" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}
            onClick={() => onPageChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <button
        aria-label="Pagina siguiente"
        className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        type="button"
      >
        <ChevronRight size={22} />
      </button>
    </nav>
  );
}

function pageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
    .flatMap((page, index, rows) => index > 0 && page - rows[index - 1] > 1 ? ["..." as const, page] : [page]);
}
