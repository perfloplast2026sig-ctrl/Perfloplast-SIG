"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowRightLeft, ArrowUpRight, PackageCheck } from "lucide-react";

const PAGE_SIZE = 5;

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

export function RecentMovementsList({ movements }: { movements: Movement[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleMovements = useMemo(() => movements.slice(pageStart, pageStart + PAGE_SIZE), [movements, pageStart]);
  const rangeStart = movements.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + PAGE_SIZE, movements.length);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {movements.length === 0 ? <p className="rounded-2xl border bg-card-muted/60 p-4 text-sm text-muted">Aun no hay movimientos registrados.</p> : null}
        {visibleMovements.map((movement) => (
          <RecentMovementCard key={movement.id} movement={movement} />
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Mostrando {rangeStart}-{rangeEnd} de {movements.length} movimientos
        </p>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button
            className="grid size-10 place-items-center rounded-full border bg-card-muted text-foreground transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-45"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
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
            onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            title="Pagina siguiente"
            type="button"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RecentMovementCard({ movement }: { movement: Movement }) {
  const tone = movementTone(movement.tone);
  const Icon = movement.tone === "in" ? ArrowDownLeft : movement.tone === "transfer" ? ArrowRightLeft : movement.tone === "out" ? ArrowUpRight : PackageCheck;

  return (
    <article className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl ${tone.card}`}>
      <div className="absolute -right-8 -top-8 size-20 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${tone.badge}`}>
              <Icon size={13} /> {movement.type}
            </span>
            <span className="rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-muted">{movement.category}</span>
            {movement.reference ? <span className="rounded-full border bg-card/70 px-3 py-1 font-mono text-xs font-semibold text-muted">{movement.reference}</span> : null}
          </div>
          <p className="break-words font-black">{movement.product} - {movement.color}</p>
          <p className="mt-1 text-sm text-muted">{movement.from} hacia {movement.to}</p>
          <p className="mt-2 text-xs text-muted">{movement.reason}</p>
          <p className="mt-3 break-words text-xs text-muted"><span className="font-mono font-semibold">{movement.code}</span> - {movement.user} - {movement.date}</p>
        </div>
        <div className={`w-full rounded-2xl border bg-card/75 px-4 py-3 text-right shadow-sm sm:w-auto sm:shrink-0 ${tone.value}`}>
          <p className="text-xl font-black">{movement.sign}{Number(movement.quantity).toLocaleString("es-GT")}</p>
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
