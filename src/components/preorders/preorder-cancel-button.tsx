"use client";

import { useState } from "react";
import { Ban, X } from "lucide-react";
import { cancelPreorderAction } from "@/actions/preorders";

export function PreorderCancelButton({ preorderId, code }: { preorderId: string; code: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Anular venta ${code}`}
        className="grid size-10 shrink-0 place-items-center rounded-full border border-red-500/25 bg-red-500/10 text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
        onClick={() => setIsOpen(true)}
        title="Anular venta"
        type="button"
      >
        <Ban size={16} />
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left whitespace-normal">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Solo Super admin</p>
                <h3 className="mt-1 text-xl font-semibold">Anular {code}</h3>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <form action={cancelPreorderAction} className="grid min-w-0 gap-4 p-5">
              <input name="preorderId" type="hidden" value={preorderId} />
              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-medium">Motivo obligatorio</span>
                <textarea className="block min-h-28 w-full max-w-full resize-y rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Error en cliente, venta duplicada, producto incorrecto..." required />
              </label>
              <p className="break-words text-xs leading-5 text-muted">La anulacion libera reservas o devuelve inventario si el despacho ya fue entregado. Queda registrada en auditoria.</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setIsOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700" type="submit">
                  <Ban size={16} /> Anular
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
