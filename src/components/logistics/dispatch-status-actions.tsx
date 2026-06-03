"use client";

import { useState } from "react";
import { RotateCcw, Truck, Undo2, X } from "lucide-react";
import { requestDispatchReturnAction, resolveDispatchReturnAction, updateDispatchStatusAction } from "@/actions/logistics";

type DispatchRow = {
  id: string;
  statusKey: string;
  latestReturnReason: string | null;
};

export function DispatchStatusActions({ dispatch, roleName }: { dispatch: DispatchRow; roleName: string }) {
  const [returnOpen, setReturnOpen] = useState(false);
  const isAdmin = ["Super admin", "Administrador"].includes(roleName);
  const isDriver = roleName === "Piloto";
  const canLoadTruck = isAdmin || roleName === "Bodeguero";

  return (
    <div className="flex flex-wrap gap-2">
      {canLoadTruck && ["SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? <StatusButton dispatchId={dispatch.id} label="Cargar camion" status="LOADED" /> : null}
      {isDriver && ["LOADED", "SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? <StatusButton dispatchId={dispatch.id} label="En ruta" status="IN_ROUTE" /> : null}
      {isDriver && dispatch.statusKey === "IN_ROUTE" ? <StatusButton dispatchId={dispatch.id} label="Entregado" status="DELIVERED" /> : null}
      {isDriver && !["DELIVERED", "RETURN_REQUESTED", "RETURNED_TO_WAREHOUSE", "CANCELLED"].includes(dispatch.statusKey) ? (
        <button className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium transition hover:bg-card-muted" onClick={() => setReturnOpen(true)} type="button">
          <Undo2 size={14} /> Devolucion
        </button>
      ) : null}
      {isAdmin && dispatch.statusKey === "RETURN_REQUESTED" ? (
        <>
          <ResolveButton dispatchId={dispatch.id} label="A bodega origen" resolution="RETURNED_TO_WAREHOUSE" />
          <ResolveButton dispatchId={dispatch.id} label="Reasignar piloto" resolution="RESCHEDULED" />
        </>
      ) : null}
      {!isDriver && !isAdmin && !canLoadTruck ? <span className="text-xs text-muted">Sin accion</span> : null}

      {returnOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Efecto devolutivo</p>
                <h3 className="mt-1 text-xl font-semibold">Registrar devolucion</h3>
              </div>
              <button className="grid size-9 place-items-center rounded-full border bg-card-muted" onClick={() => setReturnOpen(false)} type="button"><X size={16} /></button>
            </div>
            <form action={requestDispatchReturnAction} className="grid gap-4 p-5">
              <input name="dispatchId" type="hidden" value={dispatch.id} />
              <label>
                <span className="mb-2 block text-sm font-medium">Motivo</span>
                <textarea className="min-h-28 w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Cliente ausente, producto rechazado, direccion incorrecta..." required />
              </label>
              <div className="flex justify-end gap-3">
                <button className="inline-flex h-10 items-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setReturnOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground" type="submit"><RotateCcw size={16} />Registrar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusButton({ dispatchId, label, status }: { dispatchId: string; label: string; status: string }) {
  return (
    <form action={updateDispatchStatusAction}>
      <input name="dispatchId" type="hidden" value={dispatchId} />
      <input name="status" type="hidden" value={status} />
      <button className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground transition hover:opacity-90" type="submit">
        <Truck size={14} />{label}
      </button>
    </form>
  );
}

function ResolveButton({ dispatchId, label, resolution }: { dispatchId: string; label: string; resolution: string }) {
  return (
    <form action={resolveDispatchReturnAction}>
      <input name="dispatchId" type="hidden" value={dispatchId} />
      <input name="resolution" type="hidden" value={resolution} />
      <button className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium transition hover:bg-card-muted" type="submit">
        {label}
      </button>
    </form>
  );
}
