"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, X } from "lucide-react";

type DayActivity = {
  date: string;
  activity: string;
  result: string;
  description: string;
};

export function ActivityReportCreateModal() {
  const today = toDateInputValue(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(toDateInputValue(addDays(parseDate(today), 5)));
  const [activities, setActivities] = useState<Record<string, DayActivity>>({});
  const [improvements, setImprovements] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const mounted = useClientMounted();

  const reportDays = useMemo(() => buildDateRange(from, to), [from, to]);
  const reportRows = reportDays.map((day) => activities[day.key] || emptyActivity(day.key));

  function handleFromChange(value: string) {
    setFrom(value);
    if (!value) return;
    const suggestedEnd = toDateInputValue(addDays(parseDate(value), 5));
    if (!to || parseDate(to) < parseDate(value)) setTo(suggestedEnd);
  }

  function updateActivity(date: string, patch: Partial<DayActivity>) {
    setActivities((current) => ({ ...current, [date]: { ...(current[date] || emptyActivity(date)), ...patch } }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanup = () => {
      document.body.classList.remove("printing-activity-report");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    document.body.classList.add("printing-activity-report");
    window.setTimeout(() => window.print(), 120);
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={() => setIsOpen(true)} type="button">
        <Plus size={16} />Crear reporte de actividad
      </button>
      {isOpen ? (
        <div className="activity-report-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Reporte de actividad</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Crear reporte semanal</h2>
              </div>
              <button className="grid size-10 place-items-center rounded-full border bg-card-muted transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>

            <form className="max-h-[calc(92vh-88px)] overflow-y-auto p-5" onSubmit={submit}>
              <div className="grid gap-5">
                <section className="rounded-3xl border bg-card-muted/25">
                  <div className="border-b p-5">
                    <h3 className="font-semibold">1. Datos del colaborador</h3>
                    <p className="mt-1 text-sm text-muted">Confirma quien reporta, puesto y semana correspondiente.</p>
                  </div>
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <Field label="Nombre" onChange={setName} placeholder="Nombre completo del colaborador" required value={name} />
                    <Field label="Puesto" onChange={setPosition} placeholder="Tecnico, operador, supervisor" required value={position} />
                    <div className="md:col-span-2"><Field label="Area / departamento" onChange={setDepartment} placeholder="Inyeccion, paletizado, bodega..." required value={department} /></div>
                    <Field label="Semana reportada desde" onChange={handleFromChange} required type="date" value={from} />
                    <Field label="Semana reportada hasta" onChange={setTo} required type="date" value={to} />
                  </div>
                </section>

                <section className="rounded-3xl border bg-card-muted/25">
                  <div className="border-b p-5">
                    <h3 className="font-semibold">2. Actividades realizadas</h3>
                    <p className="mt-1 text-sm text-muted">Los dias se generan automaticamente segun el rango seleccionado.</p>
                  </div>
                  <div className="grid gap-3 p-5 xl:grid-cols-2">
                    {reportDays.length === 0 ? <p className="rounded-2xl border bg-card p-4 text-sm text-muted">Selecciona un rango valido para generar los dias del reporte.</p> : null}
                    {reportDays.map((day) => {
                      const row = activities[day.key] || emptyActivity(day.key);
                      return (
                        <div key={day.key} className="rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold">{day.weekday}</p>
                            <span className="rounded-full border bg-card-muted px-3 py-1 text-xs font-semibold text-muted">{day.label}</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Actividad" onChange={(value) => updateActivity(day.key, { activity: value })} placeholder="Ej. Reparacion, traslado, revision" value={row.activity} />
                            <Field label="Resultado" onChange={(value) => updateActivity(day.key, { result: value })} placeholder="Ej. Equipo funcionando, pendiente de repuesto" value={row.result} />
                          </div>
                          <TextArea className="min-h-16" label="Descripcion" onChange={(value) => updateActivity(day.key, { description: value })} placeholder="Describe brevemente que se realizo" value={row.description} />
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border bg-card-muted/25">
                  <div className="border-b p-5">
                    <h3 className="font-semibold">3. Cierre de semana</h3>
                    <p className="mt-1 text-sm text-muted">Agrega mejoras detectadas y plan sugerido para la siguiente semana.</p>
                  </div>
                  <div className="grid gap-4 p-5">
                    <TextArea label="Propuestas o mejoras" onChange={setImprovements} placeholder="Opcional: mejoras, necesidades o recomendaciones detectadas" value={improvements} />
                    <TextArea label="Plan de trabajo para la proxima semana" onChange={setNextPlan} placeholder="Opcional: actividades o prioridades para la siguiente semana" value={nextPlan} />
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 mt-5 flex justify-start border-t bg-card/95 py-4 backdrop-blur">
                <button className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground" type="submit"><FileText size={16} />Crear</button>
              </div>
            </form>

          </div>
        </div>
      ) : null}
      {mounted ? createPortal(
        <ActivityReportPrint
          activities={reportRows}
          department={department}
          from={from}
          improvements={improvements}
          name={name}
          nextPlan={nextPlan}
          position={position}
          to={to}
        />,
        document.body,
      ) : null}
    </>
  );
}

function ActivityReportPrint({ activities, department, from, improvements, name, nextPlan, position, to }: {
  activities: DayActivity[];
  department: string;
  from: string;
  improvements: string;
  name: string;
  nextPlan: string;
  position: string;
  to: string;
}) {
  return (
    <div className="activity-report-print-stage">
      <article className="activity-report-print-target">
        <header className="activity-report-print-header">
          <div className="activity-report-print-brand-block">
            <Image alt="PERFLOPLAST" height={68} src="/company-logo.svg.png" width={96} />
            <div>
              <p className="activity-report-print-brand">PERFLOPLAST</p>
              <p>Industria de plastico</p>
              <p>Aldea Chijou, Santa Cruz Verapaz</p>
              <p>Tel: 44235941 / 53146115</p>
            </div>
          </div>
          <div>
            <p>Perflo Plast, S.A.</p>
            <span>Reporte generado: {new Date().toLocaleString("es-GT")}</span>
            <span>Codigo: RA-{compactDate(from)}-{compactDate(to)}</span>
          </div>
        </header>

        <section className="activity-report-print-title">
          <h1>Reporte semanal de actividades</h1>
          <p>Formato de seguimiento operativo por colaborador y semana</p>
        </section>

        <section className="activity-report-print-meta-table">
          <div><span>Nombre</span><strong>{name || "Sin registrar"}</strong></div>
          <div><span>Puesto</span><strong>{position || "Sin registrar"}</strong></div>
          <div><span>Area</span><strong>{department || "Sin registrar"}</strong></div>
          <div><span>Semana</span><strong>{formatInputDate(from)} - {formatInputDate(to)}</strong></div>
        </section>

        <section className="activity-report-print-summary">
          <div><span>Dias reportados</span><strong>{activities.length}</strong></div>
          <div><span>Con actividad</span><strong>{activities.filter((item) => item.activity.trim()).length}</strong></div>
          <div><span>Periodo</span><strong>{formatInputDate(from)} / {formatInputDate(to)}</strong></div>
        </section>

        <section className="activity-report-print-table">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Dia</th><th>Actividad</th><th>Descripcion</th><th>Resultado</th></tr>
            </thead>
            <tbody>
              {activities.map((item) => (
                <tr key={item.date}>
                  <td>{formatInputDate(item.date)}</td>
                  <td>{weekdayLabel(item.date)}</td>
                  <td>{item.activity || "Sin actividad registrada"}</td>
                  <td>{item.description || "Sin descripcion"}</td>
                  <td>{item.result || "Sin resultado registrado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="activity-report-print-closing">
          <div><h2>Propuestas o mejoras</h2><p>{improvements || "Sin observaciones registradas."}</p></div>
          <div><h2>Plan de trabajo para la proxima semana</h2><p>{nextPlan || "Sin plan registrado."}</p></div>
        </section>

        <section className="activity-report-print-signatures">
          <div><span /> <p>Firma del colaborador</p></div>
          <div><span /> <p>Revision / aprobacion</p></div>
        </section>

        <footer>
          <span>Generado automaticamente por el sistema de inventario empresarial</span>
          <span>{new Date().toLocaleString("es-GT")}</span>
        </footer>
      </article>
    </div>
  );
}

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function Field({ label, onChange, placeholder = "", required = false, type = "text", value }: { label: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}{required ? <span className="text-danger">*</span> : null}</span>
      <input className="h-11 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} type={type} value={value} />
    </label>
  );
}

function TextArea({ className = "min-h-20", label, onChange, placeholder, value }: { className?: string; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="mt-3 block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <textarea className={`${className} w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:border-accent`} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function emptyActivity(date: string): DayActivity {
  return { date, activity: "", result: "", description: "" };
}

function buildDateRange(from: string, to: string) {
  if (!from || !to) return [];
  const start = parseDate(from);
  const end = parseDate(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const key = toDateInputValue(cursor);
    days.push({ key, weekday: weekdayLabel(key), label: formatInputDate(key) });
  }
  return days;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekdayLabel(value: string) {
  const label = new Intl.DateTimeFormat("es-GT", { weekday: "long" }).format(parseDate(value));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatInputDate(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parseDate(value));
}

function compactDate(value: string) {
  return value ? value.replaceAll("-", "") : "SINFECHA";
}
