"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Clock3, PackageCheck, RotateCcw, Truck, Undo2, X } from "lucide-react";
import { cancelDispatchAction, requestDispatchReturnAction, resolveDispatchReturnAction, updateDispatchStatusAction, verifyDispatchLoadAction } from "@/actions/logistics";

type DispatchRow = {
  id: string;
  statusKey: string;
  latestReturnReason: string | null;
  items: Array<{ id: string; product: string; color: string; quantity: string }>;
};

export function DispatchStatusActions({ dispatch, roleName }: { dispatch: DispatchRow; roleName: string }) {
  const [returnOpen, setReturnOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const isAdmin = ["Super admin", "Administrador"].includes(roleName);
  const isSuperAdmin = roleName === "Super admin";
  const isDriver = roleName === "Piloto";
  const canLoadTruck = isAdmin || roleName === "Bodeguero";

  return (
    <div className="inline-flex min-w-max flex-wrap items-center justify-end gap-2">
      {canLoadTruck && ["SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? (
        <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setLoadOpen(true)} type="button">
          <PackageCheck size={14} /> Verificar carga
        </button>
      ) : null}
      {isDriver && ["SCHEDULED", "RESCHEDULED"].includes(dispatch.statusKey) ? <WaitingBadge label="Esperando carga" /> : null}
      {isDriver && dispatch.statusKey === "LOADED" ? <StatusButton dispatchId={dispatch.id} label="En ruta" status="IN_ROUTE" /> : null}
      {isDriver && dispatch.statusKey === "IN_ROUTE" ? <StatusButton dispatchId={dispatch.id} label="Entregado" status="DELIVERED" /> : null}
      {isDriver && dispatch.statusKey === "IN_ROUTE" ? (
        <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium transition hover:bg-card-muted" onClick={() => setReturnOpen(true)} type="button">
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
        <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 text-xs font-medium text-red-700 transition hover:bg-red-500/15 dark:text-red-300" onClick={() => setCancelOpen(true)} type="button">
          <Ban size={14} /> Anular
        </button>
      ) : null}
      {!isDriver && !isAdmin && !canLoadTruck ? <span className="text-xs text-muted">Sin accion</span> : null}

      {loadOpen ? <LoadVerificationModal dispatch={dispatch} onClose={() => setLoadOpen(false)} /> : null}

      {returnOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left whitespace-normal">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Efecto devolutivo</p>
                <h3 className="mt-1 text-xl font-semibold">Registrar devolucion</h3>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setReturnOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={requestDispatchReturnAction} className="grid min-w-0 gap-4 p-5">
              <input name="dispatchId" type="hidden" value={dispatch.id} />
              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-medium">Motivo</span>
                <textarea className="block min-h-28 w-full max-w-full resize-y rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Cliente ausente, producto rechazado, direccion incorrecta..." required />
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
              <div className="grid grid-cols-2 gap-3">
                <button className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setReturnOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground" type="submit"><RotateCcw size={16} />Registrar</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left whitespace-normal">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Solo Super admin</p>
                <h3 className="mt-1 text-xl font-semibold">Anular despacho</h3>
              </div>
              <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setCancelOpen(false)} type="button"><X size={18} /></button>
            </div>
            <form action={cancelDispatchAction} className="grid min-w-0 gap-4 p-5">
              <input name="dispatchId" type="hidden" value={dispatch.id} />
              <label className="block min-w-0">
                <span className="mb-2 block text-sm font-medium">Motivo obligatorio</span>
                <textarea className="block min-h-28 w-full max-w-full resize-y rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent" name="reason" placeholder="Despacho duplicado, direccion incorrecta, venta equivocada..." required />
              </label>
              <p className="break-words text-xs leading-5 text-muted">Si ya fue entregado, el sistema devuelve el inventario con movimiento de retorno. La accion queda en auditoria.</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-card px-4 text-sm font-medium" onClick={() => setCancelOpen(false)} type="button">Cancelar</button>
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700" type="submit"><Ban size={16} />Anular</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LoadVerificationModal({ dispatch, onClose }: { dispatch: DispatchRow; onClose: () => void }) {
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);

  function toggleRejected(id: string) {
    setRejectedIds((current) => current.includes(id) ? current.filter((row) => row !== id) : [...current, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 text-left whitespace-normal sm:items-center sm:p-4">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Revision de bodega</p>
            <h3 className="mt-1 text-xl font-semibold">Verificar carga del camion</h3>
          </div>
          <button className="modal-close-button grid place-items-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <form action={verifyDispatchLoadAction} className="grid max-h-[calc(94dvh-80px)] min-w-0 gap-4 overflow-y-auto p-4 sm:p-5">
          <input name="dispatchId" type="hidden" value={dispatch.id} />
          <div className="rounded-2xl border bg-card-muted/40 p-4">
            <p className="font-semibold">Confirma lo que si se subio al camion.</p>
            <p className="mt-1 text-sm leading-6 text-muted">Si un producto esta equivocado o no debe salir, marca Rechazo y escribe el motivo. Lo aprobado se envia al piloto.</p>
          </div>

          <div className="space-y-3">
            {dispatch.items.map((item) => {
              const rejected = rejectedIds.includes(item.id);
              return (
                <div key={item.id} className={`rounded-2xl border p-4 transition ${rejected ? "border-red-500/30 bg-red-500/10" : "bg-card-muted/30"}`}>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold">{item.product}</p>
                      <p className="text-sm text-muted">{item.color} - {item.quantity} un</p>
                    </div>
                    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 text-sm font-semibold text-red-700 dark:text-red-300">
                      <input checked={rejected} className="h-4 w-4 accent-red-600" name="rejectedItemId" onChange={() => toggleRejected(item.id)} type="checkbox" value={item.id} />
                      Rechazo
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-card px-4 text-sm font-medium" onClick={onClose} type="button">Cancelar</button>
            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" type="submit">
              <CheckCircle2 size={16} /> Aprobar carga y enviar al piloto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function parseQuantity(value: string) {
  return Number(value.replace(/[^\d.-]/g, "") || 0);
}

function WaitingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-card-muted px-3 text-xs font-medium text-muted">
      <Clock3 size={14} />{label}
    </span>
  );
}

function StatusButton({ dispatchId, label, status }: { dispatchId: string; label: string; status: string }) {
  return (
    <form action={updateDispatchStatusAction}>
      <input name="dispatchId" type="hidden" value={dispatchId} />
      <input name="status" type="hidden" value={status} />
      <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground transition hover:opacity-90" type="submit">
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
      <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium transition hover:bg-card-muted" type="submit">
        {label}
      </button>
    </form>
  );
}
