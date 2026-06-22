import { ArrowRightLeft, ClipboardCheck, PackagePlus, SlidersHorizontal } from "lucide-react";

const flows = [
  { title: "Entradas", detail: "Compra, devolucion o produccion terminada", icon: PackagePlus },
  { title: "Salidas", detail: "Venta, consumo, rechazo o ajuste negativo", icon: ClipboardCheck },
  { title: "Traslados", detail: "Bodega a bodega, bodega a camion o retorno", icon: ArrowRightLeft },
  { title: "Ajustes", detail: "Correcciones auditadas con motivo obligatorio", icon: SlidersHorizontal },
];

export function InventoryFlowCard() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {flows.map((flow) => {
        const Icon = flow.icon;
        return (
          <div key={flow.title} className="rounded-2xl border bg-card-muted/50 p-4">
            <Icon className="mb-3 text-accent" size={20} />
            <p className="font-semibold">{flow.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted">{flow.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
