type LocationInventory = {
  location: string;
  finished: number;
  reserved: number;
  raw: number;
  total: number;
};

export function LocationInventoryChart({ data }: { data: LocationInventory[] }) {
  const max = Math.max(...data.map((item) => item.total), 1);

  if (data.length === 0) {
    return <p className="rounded-2xl border bg-card-muted/50 p-4 text-sm text-muted">Sin existencias por bodega.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.location} className="rounded-2xl border bg-card-muted/35 p-4 transition hover:-translate-y-0.5 hover:bg-card-muted/55">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="font-semibold">{item.location}</p>
            <p className="text-sm font-black">{item.total.toLocaleString("es-GT")} un</p>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#24483f,#0ea5e9)]" style={{ width: `${Math.max(4, (item.total / max) * 100)}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
            <span>Terminado: <b className="text-foreground">{item.finished.toLocaleString("es-GT")}</b></span>
            <span>Reservado: <b className="text-foreground">{item.reserved.toLocaleString("es-GT")}</b></span>
            <span>Materia: <b className="text-foreground">{item.raw.toLocaleString("es-GT")}</b></span>
          </div>
        </div>
      ))}
    </div>
  );
}
