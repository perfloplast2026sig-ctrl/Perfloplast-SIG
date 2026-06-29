"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, PackageCheck, Search, X } from "lucide-react";

const PAGE_SIZE = 6;

type Movement = {
  id: string;
  code: string;
  type: string;
  category: string;
  tone: "in" | "out" | "transfer" | "neutral";
  sign: string;
  product: string;
  color: string;
  from: string;
  to: string;
  quantity: string;
  unit: string;
  reason: string;
  reference: string;
  user: string;
  date: string;
};

export function InventoryMovementsModal({ movements }: { movements: Movement[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((movement) => `${movement.code} ${movement.type} ${movement.category} ${movement.product} ${movement.color} ${movement.from} ${movement.to} ${movement.user} ${movement.reason} ${movement.reference}`.toLowerCase().includes(term));
  }, [movements, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);

  return (
    <>
      <button className="inline-flex h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-card-muted" onClick={() => setOpen(true)} type="button">
        <Activity size={16} />Ver movimientos
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Kardex operativo</p>
                <h2 className="mt-1 text-2xl font-semibold">Movimientos del sistema</h2>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex h-12 items-center gap-3 rounded-2xl border bg-background px-4">
                <Search className="text-muted" size={18} />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por producto, codigo, bodega, usuario o tipo..."
                  value={query}
                />
              </label>
              <div className="grid max-h-[58vh] gap-3 overflow-y-auto pr-1">
                {paginated.map((movement) => (
                  <MovementCard key={movement.id} movement={movement} />
                ))}
                {filtered.length === 0 ? <p className="rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">No hay movimientos con ese criterio.</p> : null}
              </div>
              <PaginationControls
                currentPage={currentPage}
                onNext={() => setPage((value) => Math.min(value + 1, totalPages))}
                onPrevious={() => setPage((value) => Math.max(value - 1, 1))}
                rangeEnd={rangeEnd}
                rangeStart={rangeStart}
                totalItems={filtered.length}
                totalPages={totalPages}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


function PaginationControls({
  currentPage,
  onNext,
  onPrevious,
  rangeEnd,
  rangeStart,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  onNext: () => void;
  onPrevious: () => void;
  rangeEnd: number;
  rangeStart: number;
  totalItems: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        Mostrando {rangeStart}-{rangeEnd} de {totalItems} movimientos
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          className="grid size-10 place-items-center rounded-full border bg-card-muted text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage === 1}
          onClick={onPrevious}
          title="Pagina anterior"
          type="button"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="min-w-24 text-center font-semibold text-foreground">
          Pagina {currentPage} de {totalPages}
        </span>
        <button
          className="grid size-10 place-items-center rounded-full border bg-card-muted text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-45"
          disabled={currentPage === totalPages}
          onClick={onNext}
          title="Pagina siguiente"
          type="button"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function MovementCard({ movement }: { movement: Movement }) {
  const tone = movementTone(movement.tone);
  const Icon = movement.tone === "in" ? ArrowDownLeft : movement.tone === "transfer" ? ArrowRightLeft : movement.tone === "out" ? ArrowUpRight : PackageCheck;
  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${tone.card}`}>
      <div className="absolute -right-10 -top-10 size-24 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
              <Icon size={13} /> {movement.type}
            </span>
            <span className="rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-muted">{movement.category}</span>
            {movement.reference ? <span className="rounded-full border bg-card/70 px-3 py-1 font-mono text-xs font-semibold text-muted">{movement.reference}</span> : null}
          </div>
          <h3 className="text-base font-black">{movement.product} · {movement.color}</h3>
          <p className="mt-1 text-sm text-muted">{movement.from} hacia {movement.to}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{movement.reason}</p>
          <p className="mt-3 text-xs text-muted"><span className="font-mono font-semibold">{movement.code}</span> · {movement.user} · {movement.date}</p>
        </div>
        <div className={`shrink-0 rounded-2xl border bg-card/75 px-4 py-3 text-right shadow-sm ${tone.value}`}>
          <p className="text-2xl font-black">{movement.sign}{Number(movement.quantity).toLocaleString("es-GT")}</p>
          <p className="text-xs font-semibold text-muted">{movement.unit}</p>
        </div>
      </div>
    </article>
  );
}

function movementTone(tone: Movement["tone"]) {
  const tones = {
    in: {
      card: "from-emerald-500/12 to-card text-emerald-300",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
      value: "text-emerald-700 dark:text-emerald-200",
    },
    out: {
      card: "from-rose-500/12 to-card text-rose-300",
      badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
      value: "text-rose-700 dark:text-rose-200",
    },
    transfer: {
      card: "from-sky-500/12 to-card text-sky-300",
      badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
      value: "text-sky-700 dark:text-sky-200",
    },
    neutral: {
      card: "from-violet-500/12 to-card text-violet-300",
      badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
      value: "text-violet-700 dark:text-violet-200",
    },
  };
  return tones[tone];
}
