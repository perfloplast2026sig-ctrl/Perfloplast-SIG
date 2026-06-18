import type { ReactNode } from "react";
import Link from "next/link";
import { AtSign, Building2, KeyRound, UserRound } from "lucide-react";
import { updateUserAction } from "@/actions/users";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  area: string;
  role: Role;
  isProtected: boolean;
  salesBook: {
    startNumber: string;
    endNumber: string;
    nextNumber: string;
    warningThreshold: string;
    remaining: number;
  } | null;
};

export function UserEditCard({ user, roles }: { user: EditableUser; roles: Array<{ role: string }> }) {
  return (
    <form action={updateUserAction} className="grid gap-5">
      <input name="userId" type="hidden" value={user.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Nombre completo" defaultValue={user.name} icon={<UserRound size={17} />} required />
        <Field name="area" label="Area" defaultValue={user.area} icon={<Building2 size={17} />} />
      </div>

      <Field name="email" label="Correo corporativo" defaultValue={user.email} icon={<AtSign size={17} />} required type="email" />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Rol</label>
          <select
            className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent disabled:opacity-60"
            defaultValue={user.role}
            disabled={user.isProtected}
            name="roleName"
            required
          >
            {roles.map((item) => <option key={item.role} value={item.role}>{item.role}</option>)}
          </select>
          {user.isProtected ? <input name="roleName" type="hidden" value={user.role} /> : null}
          {user.isProtected ? <p className="mt-2 text-xs text-muted">El Super admin conserva su rol unico.</p> : null}
        </div>
        <Field name="password" label="Nueva clave temporal" icon={<KeyRound size={17} />} placeholder="Opcional, minimo 8 caracteres" type="password" />
      </div>

      <div className="rounded-2xl border bg-card-muted/60 p-4 text-sm leading-6 text-muted">
        Si defines una nueva clave temporal, el usuario debera cambiarla en el siguiente ingreso. La desactivacion se hace desde la tabla de usuarios para respetar reglas de Super admin y Administrador minimo.
      </div>

      <section className="rounded-2xl border bg-card-muted/40 p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold">Talonario de preventas</p>
          <p className="mt-1 text-xs leading-5 text-muted">Solo aplica para usuarios con rol Vendedor. El sistema genera PV-0000000 y la factura queda con el mismo correlativo FAC-0000000.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <NumberField name="salesBookStart" label="Inicio" defaultValue={user.salesBook?.startNumber || ""} placeholder="0001301" />
          <NumberField name="salesBookEnd" label="Fin" defaultValue={user.salesBook?.endNumber || ""} placeholder="0001400" />
          <NumberField name="salesBookNext" label="Siguiente" defaultValue={user.salesBook?.nextNumber || ""} placeholder="0001301" />
          <NumberField name="salesBookWarning" label="Alerta" defaultValue={user.salesBook?.warningThreshold || "10"} placeholder="10" />
        </div>
        <p className="mt-3 text-xs text-muted">{user.salesBook ? `Talonario activo: quedan ${user.salesBook.remaining} correlativos.` : "Sin talonario activo asignado."}</p>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Link className="inline-flex h-10 items-center justify-center rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-card-muted" href="/usuarios">Cancelar</Link>
        <Button type="submit">Guardar cambios</Button>
      </div>
    </form>
  );
}

function NumberField({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none placeholder:text-muted focus:border-accent" defaultValue={defaultValue} inputMode="numeric" name={name} placeholder={placeholder} type="text" />
    </div>
  );
}

function Field({ name, label, icon, defaultValue = "", placeholder, type = "text", required = false }: { name: string; label: string; icon: ReactNode; defaultValue?: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <div className="flex h-12 items-center gap-3 rounded-2xl border bg-card px-4 text-muted focus-within:border-accent">
        {icon}
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          defaultValue={defaultValue}
          name={name}
          placeholder={placeholder}
          required={required}
          type={type}
        />
      </div>
    </div>
  );
}
