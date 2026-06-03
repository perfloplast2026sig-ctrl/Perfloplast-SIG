export function ReportRoadmap() {
  return (
    <div className="rounded-2xl border bg-card-muted/50 p-4 text-sm leading-6 text-muted">
      Los reportes se modelan como consultas auditables por rango, ubicacion, producto, cliente, responsable y estado. La exportacion a PDF o Excel debe vivir en un servicio separado para no mezclar reglas operativas con presentacion.
    </div>
  );
}
