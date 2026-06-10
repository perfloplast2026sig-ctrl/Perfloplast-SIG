"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Building2, KeyRound, MailCheck, Plus, UserRound, X } from "lucide-react";
import { createUserAction } from "@/actions/users";
import { CORPORATE_EMAIL_DOMAIN } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function UserCreateCard({ roles }: { roles: Array<{ role: string }> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function openModal() {
    setFormKey((current) => current + 1);
    setIsOpen(true);
  }

  return (
    <>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90" onClick={openModal} type="button">
        <Plus size={16} /> Nuevo usuario
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Alta controlada</p>
                <h3 className="mt-1 text-xl font-semibold">Crear usuario</h3>
              </div>
              <button className="modal-close-button inline-flex items-center justify-center rounded-full border bg-card-muted text-foreground shadow-sm transition hover:bg-card" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
            </div>

            <form key={formKey} action={createUserAction} autoComplete="off" className="grid max-h-[calc(92vh-73px)] gap-4 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field autoComplete="new-user-name" name="name" label="Nombre completo" icon={<UserRound size={17} />} placeholder="Ej. Karla Hernandez" />
                <Field autoComplete="new-user-area" name="area" label="Area" icon={<Building2 size={17} />} placeholder="Bodega, ventas, contaduria..." />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Correo corporativo</label>
                <div className="grid overflow-hidden rounded-2xl border bg-card focus-within:border-accent sm:grid-cols-[1fr_auto]">
                  <div className="flex h-12 min-w-0 items-center px-4 text-muted">
                    <input
                      autoComplete="new-user-email-local"
                      defaultValue=""
                      name="emailLocal"
                      className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                      pattern="[a-zA-Z0-9._-]+"
                      placeholder="usuario"
                      required
                      type="text"
                    />
                  </div>
                  <div className="flex h-12 items-center border-t bg-card-muted/60 px-4 text-sm font-semibold text-muted sm:border-l sm:border-t-0">
                    @{CORPORATE_EMAIL_DOMAIN}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">Escribe solo el usuario. El sistema agrega @{CORPORATE_EMAIL_DOMAIN} automaticamente.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Rol</label>
                  <select name="roleName" className="h-12 w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-accent" required>
                    {roles.map((item) => <option key={item.role} value={item.role}>{item.role}</option>)}
                </select>
                </div>
                <Field autoComplete="new-password" name="password" label="Clave temporal" icon={<KeyRound size={17} />} placeholder="Minimo 8 caracteres" type="password" required />
              </div>

              <div className="rounded-2xl border bg-card-muted/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><MailCheck size={17} /> Flujo recomendado</div>
                <p className="text-sm leading-6 text-muted">Crear usuario activo, entregar clave temporal y obligar cambio de clave en el primer ingreso. Luego se puede activar o desactivar desde la tabla.</p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">Cancelar</Button>
                <Button type="submit">Crear usuario</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ autoComplete = "off", name, label, icon, placeholder, type = "text", required = false }: { autoComplete?: string; name: string; label: string; icon: ReactNode; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <div className="flex h-12 items-center gap-3 rounded-2xl border bg-card px-4 text-muted focus-within:border-accent">
        {icon}
        <input autoComplete={autoComplete} defaultValue="" name={name} className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted" placeholder={placeholder} required={required} type={type} />
      </div>
    </div>
  );
}
