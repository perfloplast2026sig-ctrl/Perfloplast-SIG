import { MapPinned, Package, Route, UserRound } from "lucide-react";

export function TruckLoadCard() {
  const items = [
    { label: "Camion", value: "C-07 / 8.5 Ton", icon: Package },
    { label: "Responsable", value: "Luis Mejia", icon: UserRound },
    { label: "Ruta", value: "San Miguel", icon: Route },
    { label: "Destino", value: "4 clientes agrupados", icon: MapPinned },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-2xl border bg-card-muted/50 p-4">
            <Icon className="mb-3 text-accent" size={20} />
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{item.label}</p>
            <p className="mt-1 font-semibold">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
