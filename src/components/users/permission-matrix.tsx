const matrix = [
  ["Dashboard", "Administrador", "Contaduria", "Super admin"],
  ["Inventario", "Bodeguero", "Contaduria", "Super admin"],
  ["Preventas", "Vendedor", "Administrador", "Super admin"],
  ["Despachos", "Piloto", "Administrador", "Super admin"],
  ["Usuarios", "", "Administrador", "Super admin"],
];

export function PermissionMatrix() {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
      <table className="min-w-[620px] text-sm">
        <thead className="bg-card-muted text-left text-xs uppercase tracking-[0.14em] text-muted">
          <tr>
            <th className="px-4 py-3">Modulo</th>
            <th className="px-4 py-3">Operacion</th>
            <th className="px-4 py-3">Revision</th>
            <th className="px-4 py-3">Gestion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {matrix.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${index}`} className="px-4 py-4 font-medium text-foreground/90">
                  {cell || <span className="text-muted">Sin acceso</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
