"use client";

import { useState } from "react";
import { Ban, Clock3, RotateCcw, Truck, Undo2, X } from "lucide-react";
import { cancelDispatchAction, requestDispatchReturnAction, resolveDispatchReturnAction, updateDispatchStatusAction } from "@/actions/logistics";

type DispatchRow = {
  id: string;
  statusKey: string;
  latestReturnReason: string | null;
  items: Array<{ id: string; product: string; color: string; quantity: string }>;
};

export function DispatchStatusActions({ dispatch, roleName }: { dispatch: DispatchRow; roleName: string }) {
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const isAdmin = ["Super admin", "Administrador"].includes(roleName);
  const isSuperAdmin = roleName === "Super admin";
  const isDriver = roleName === "Piloto";
  const canLoadTruck = isAdmin || roleName === "Bodeguero";

  return (
    <div className="flex flex-wrap gap-2">
      {canLoadTruck && ["SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? <StatusButton dispatchId={dispatch.id} label="Cargar camion" status="LOADED" /> : null}
      {isDriver && ["SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? <WaitingBadge label="Esperando carga" /> : null}
      {isDriver && dispatch.statusKey === "LOADED" ? <StatusButton dispatchId={dispatch.id} label="En ruta" status="IN_ROUTE" /> : null}
      {isDriver && dispatch.statusKey === "IN_ROUTE" ? <StatusButton dispatchId={dispatch.id} label="Entregado" status="DELIVERED" /> : null}
      {isDriver && dispatch.statusKey === "IN_ROUTE" ? (
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
      {isSuperAdmin && dispatch.statusKey !== "CANCELLED" ? (
        <button className="inline-flex h-9 items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 text-xs font-medium text-red-700 transition hover:bg-red-500/15 dark:text-red-300" onClick={() => setCancelOpen(true)} type="button">
          <Ban size={14} /> Anular
        </button>
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
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setReturnOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={requestDispatchReturnAction} className="grid gap-4 p-5">
              <input name="dispatchId" type="hidden" value={dispatch.id} />
              <label>
                <span className="mb-2 block text-sm font-medium">Motivo</span>
                <textarea className="min-h-28 w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Cliente ausente, producto rechazado, direccion incorrecta..." required />
              </label>
              <div>
                <p className="mb-2 text-sm font-medium">Productos devueltos</p>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border bg-card-muted/30 p-2">
                  {dispatch.items.map((item) => (
                    <div key={item.id} className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_8rem] sm:items-center">
                      <div className="min-w-0">
                        <p className="font-semibold">{item.product}</p>
                        <p className="text-xs text-muted">{item.color} - despachado: {item.quantity}</p>
                      </div>
                      <label className="text-xs font-medium text-muted">
                        Cantidad
                        <input name="dispatchItemId" type="hidden" value={item.id} />
                        <input className="mt-1 h-10 w-full rounded-xl border bg-card px-3 text-sm font-semibold outline-none focus:border-accent" inputMode="decimal" name="returnQuantity" type="number" min="0" step="0.001" defaultValue={parseQuantity(item.quantity)} />
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">Deja la cantidad completa para devolucion total. Escribe 0 en productos que no fueron devueltos.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button className="inline-flex h-10 items-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setReturnOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground" type="submit"><RotateCcw size={16} />Registrar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Solo Super admin</p>
                <h3 className="mt-1 text-xl font-semibold">Anular despacho</h3>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setCancelOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={cancelDispatchAction} className="grid gap-4 p-5">
              <input name="dispatchId" type="hidden" value={dispatch.id} />
              <label>
                <span className="mb-2 block text-sm font-medium">Motivo obligatorio</span>
                <textarea className="min-h-28 w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Despacho duplicado, direccion incorrecta, venta equivocada..." required />
              </label>
              <p className="text-xs leading-5 text-muted">Si ya fue entregado, el sistema devuelve el inventario con movimiento de retorno. La accion queda en auditoria.</p>
              <div className="flex justify-end gap-3">
                <button className="inline-flex h-10 items-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setCancelOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-10 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700" type="submit"><Ban size={16} />Anular</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function parseQuantity(value: string) {
  return Number(value.replace(/[^\d.-]/g, "") || 0);
}

function WaitingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border bg-card-muted px-3 text-xs font-medium text-muted">
      <Clock3 size={14} />{label}
    </span>
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
