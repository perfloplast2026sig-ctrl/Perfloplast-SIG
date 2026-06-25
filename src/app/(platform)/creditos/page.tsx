import { redirect } from "next/navigation";
import { CreditsRegister } from "@/components/credits/credits-register";
import { PageHeading } from "@/components/layout/page-heading";
import { requireCreditManager } from "@/services/auth";
import { getCreditsModuleData } from "@/services/credits";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const user = await requireCreditManager();
  const params = await searchParams;
  const data = await getCreditsModuleData();
  const generatedAt = new Intl.DateTimeFormat("es-GT", { dateStyle: "short", timeStyle: "short", timeZone: "America/Guatemala" }).format(new Date());

  if (!user) redirect("/login");

  return (
    <div>
      <PageHeading title="Creditos de clientes" description="Cartera, abonos y saldos" />
      {params.error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300">{params.error}</div> : null}
      {params.created === "credit" ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Credito registrado.</div> : null}
      {params.created === "payment" ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Abono registrado.</div> : null}
      <CreditsRegister data={data} generatedAt={generatedAt} generatedBy={user.name} />
    </div>
  );
}