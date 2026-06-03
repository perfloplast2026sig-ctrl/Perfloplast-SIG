type ShiftPoint = { label: string; value: number };

const colors = ["#22b889", "#5367e8", "#f59e0b", "#0ea5e9"];

export function ShiftProductionChart({ data }: { data: ShiftPoint[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-3xl border bg-card p-5 text-foreground shadow-[0_18px_48px_rgba(20,36,31,0.08)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Produccion por turno</h3>
          <p className="mt-1 text-sm text-muted">{total.toLocaleString("es-GT")} unidades en 7 dias</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {data.map((item, index) => (
          <div key={item.label} className="group rounded-2xl border bg-gradient-to-br from-card to-card-muted/35 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full shadow-sm transition duration-300 group-hover:scale-125" style={{ background: colors[index % colors.length] }} />
                <span className="font-semibold">{item.label}</span>
              </div>
              <div className="text-right">
                <p className="font-black">{item.value.toLocaleString("es-GT")} un</p>
                <p className="text-xs text-muted">{total > 0 ? Math.round((item.value / total) * 100) : 0}% del total</p>
              </div>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-card-muted shadow-inner dark:bg-white/10">
              <div className="dashboard-progress-fill h-full rounded-full shadow-sm transition-all duration-700 group-hover:brightness-110" style={{ background: colors[index % colors.length], width: `${Math.max(3, (item.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
