import { CheckCircle2, CircleDashed, PackageSearch, Truck } from "lucide-react";

const steps = [
  { title: "Cliente", detail: "Credito, ruta y condiciones", icon: CircleDashed },
  { title: "Productos", detail: "Disponibilidad por ubicacion", icon: PackageSearch },
  { title: "Reserva", detail: "Bloqueo parcial o total de stock", icon: CheckCircle2 },
  { title: "Despacho", detail: "Conversion controlada a carga", icon: Truck },
];

export function PreorderBuilder() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="rounded-2xl border bg-card-muted/50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <Icon className="text-accent" size={20} />
              <span className="text-xs font-semibold text-muted">0{index + 1}</span>
            </div>
            <p className="font-semibold">{step.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted">{step.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
