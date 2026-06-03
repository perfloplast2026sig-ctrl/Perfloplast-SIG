const stages = ["Planificada", "Materia prima reservada", "En proceso", "Calidad", "Producto terminado"];

export function ProductionFlow() {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      {stages.map((stage, index) => (
        <div key={stage} className="rounded-2xl border bg-card-muted/50 p-4">
          <span className="text-xs font-semibold text-muted">Etapa {index + 1}</span>
          <p className="mt-2 text-sm font-semibold leading-5">{stage}</p>
        </div>
      ))}
    </div>
  );
}
