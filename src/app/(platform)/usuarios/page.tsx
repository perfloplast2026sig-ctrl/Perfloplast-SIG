import Link from "next/link";
import { CircleSlash2, Globe2, KeyRound, ShieldCheck, UsersRound } from "lucide-react";
import { resolvePasswordResetRequestAction } from "@/actions/users";
import { PageHeading } from "@/components/layout/page-heading";
import { UserCreateCard } from "@/components/users/user-create-card";
import { UserStatusToggle } from "@/components/users/user-status-toggle";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { TableActions } from "@/components/ui/table-actions";
import { CORPORATE_EMAIL_DOMAIN } from "@/lib/constants";
import { requireUserManager } from "@/services/auth";
import { getUserModuleData } from "@/services/users";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; error?: string; search?: string }> }) {
  const params = await searchParams;
  await requireUserManager();
  const { users, roles, resetRequests, stats } = await getUserModuleData();
  const filteredUsers = filterRows(users, params.search, (user) => [user.name, user.email, user.role, user.area, user.status.label]);

  return (
    <>
      <PageHeading
        title="Usuarios corporativos"
        actions={<UserCreateCard roles={roles} />}
      />

      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Usuario creado correctamente.</div> : null}
      {params.updated ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Estado del usuario actualizado.</div> : null}
      {params.search ? <div className="mb-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm font-medium text-sky-700 dark:text-sky-300">Busqueda aplicada: {params.search}. Mostrando {filteredUsers.length} resultado(s).</div> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UserKpi label="Usuarios activos" value={String(stats.activeUsers)} detail="Con acceso vigente" icon={UsersRound} tone="emerald" />
        <UserKpi label="Roles operativos" value={String(stats.roles)} detail="Perfiles configurados" icon={ShieldCheck} tone="sky" />
        <UserKpi label="Dominio permitido" value={CORPORATE_EMAIL_DOMAIN} detail="Correo corporativo" icon={Globe2} tone="violet" />
        <UserKpi label="Usuarios inactivos" value={String(stats.inactiveUsers)} detail="Acceso deshabilitado" icon={CircleSlash2} tone="rose" />
      </div>

      <div className="grid gap-6">
        {resetRequests.length > 0 ? (
          <SectionCard title="Solicitudes de recuperacion" eyebrow="Acceso pendiente" action={<Badge label={`${resetRequests.length} pendientes`} tone="warning" />}>
            <DataTable
              data={resetRequests}
              columns={[
                {
                  header: "Correo",
                  cell: (item) => (
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-500">
                        <KeyRound size={17} />
                      </span>
                      <div>
                        <p className="font-semibold">{item.email}</p>
                        <p className="text-xs text-muted">{item.userId ? "Usuario encontrado" : "Correo sin usuario registrado"}</p>
                      </div>
                    </div>
                  ),
                },
                { header: "Fecha", cell: (item) => <span className="text-muted">{item.requestedAt}</span> },
                {
                  header: "Accion",
                  align: "right",
                  cell: (item) => (
                    <form action={resolvePasswordResetRequestAction} className="flex justify-end">
                      <input name="requestId" type="hidden" value={item.id} />
                      <button className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-card-muted" type="submit">
                        Marcar revisada
                      </button>
                    </form>
                  ),
                },
              ]}
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Usuarios registrados" eyebrow="Directorio interno" action={<Badge label="@perfloplast.com" tone="info" />}>
          <DataTable
            data={filteredUsers}
            columns={[
              { header: "Usuario", cell: (item) => <div><p className="font-semibold">{item.name}</p><p className="text-xs text-muted">{item.email}</p></div> },
              { header: "Rol", cell: (item) => <span className="font-medium">{item.role}</span> },
              { header: "Area", cell: (item) => <span className="text-muted">{item.area}</span> },
              { header: "Talonario", cell: (item) => <span className="text-xs text-muted">{item.salesBook}</span> },
              { header: "Estado", cell: (item) => <Badge label={item.status.label} tone={item.status.tone} /> },
              { header: "Ultimo ingreso", cell: (item) => <span className="text-muted">{item.lastLogin}</span> },
              { header: "Accion", align: "right", cell: (item) => (
                <TableActions>
                  <Link className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-card-muted" href={`/usuarios/${item.id}/editar`}>
                    Editar
                  </Link>
                  <UserStatusToggle userId={item.id} isActive={item.isActive} isProtected={item.isProtected} />
                </TableActions>
              ) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6">
        <SectionCard title="Roles base" eyebrow="Gobierno de acceso">
          <DataTable
            data={roles}
            columns={[
              { header: "Rol", cell: (item) => <span className="font-semibold">{item.role}</span> },
              { header: "Alcance", cell: (item) => <span className="text-muted">{item.scope}</span> },
              { header: "Usuarios", align: "right", cell: (item) => <span className="font-semibold">{item.users}</span> },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

function filterRows<T>(rows: T[], query: string | undefined, fields: (row: T) => Array<string | number | null | undefined>) {
  const term = normalizeSearch(query || "");
  if (!term) return rows;
  return rows.filter((row) => normalizeSearch(fields(row).join(" ")).includes(term));
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function UserKpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof UsersRound; tone: "emerald" | "sky" | "violet" | "rose" }) {
  const tones = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 shadow-emerald-950/20",
    sky: "from-sky-500/20 to-sky-500/5 text-sky-300 shadow-sky-950/20",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-300 shadow-violet-950/20",
    rose: "from-rose-500/20 to-rose-500/5 text-rose-300 shadow-rose-950/20",
  };
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3 shadow-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl sm:rounded-3xl sm:p-5 ${tones[tone]}`}>
      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-current opacity-10 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-20" />
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase leading-4 tracking-[0.12em] text-muted sm:text-xs sm:tracking-[0.16em]">{label}</p>
          <p className="mt-3 max-w-full break-words text-xl font-black tracking-tight text-foreground sm:mt-4 sm:text-2xl sm:tracking-[-0.04em]">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted">{detail}</p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-2xl border bg-background/50 text-current shadow-sm transition duration-300 group-hover:rotate-6 group-hover:scale-110 sm:size-11">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10 sm:mt-5">
        <div className="h-full w-2/3 rounded-full bg-current opacity-70 transition-all duration-700 group-hover:w-full" />
      </div>
    </div>
  );
}
