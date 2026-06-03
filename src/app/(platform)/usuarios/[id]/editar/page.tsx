import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { UserEditCard } from "@/components/users/user-edit-card";
import { requireUserManager } from "@/services/auth";
import { getUserEditData } from "@/services/users";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserManager();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getUserEditData(id).catch(() => null);

  if (!data) {
    notFound();
  }

  const { user, roles } = data;

  return (
    <>
      <PageHeading
        title="Editar usuario"
        description="Actualiza datos del usuario, rol asignado y clave temporal sin romper las reglas de Super admin unico ni Administrador minimo."
        actions={<Badge label={user.isActive ? "Activo" : "Inactivo"} tone={user.isActive ? "success" : "neutral"} />}
      />

      {query.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{query.error}</div> : null}

      <SectionCard title={user.name} eyebrow={user.email}>
        <UserEditCard roles={roles} user={user} />
      </SectionCard>
    </>
  );
}
