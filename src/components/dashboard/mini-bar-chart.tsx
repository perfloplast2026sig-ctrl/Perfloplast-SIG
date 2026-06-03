const fills = ["#24483f", "#0ea5e9", "#f59e0b", "#8b5cf6"];

export function MiniBarChart({ data }: { data: Array<{ label: string; value: number; amount?: string }> }) {
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted">{item.amount ? `${item.amount} · ` : ""}{item.value}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-card-muted">
            <div className="h-full rounded-full shadow-sm" style={{ background: fills[index % fills.length], width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
