import { PageHeading } from "@/components/layout/page-heading";
import { InvoicesRegister } from "@/components/invoices/invoices-register";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { getInvoicesModuleData } from "@/services/invoices";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const user = await requireCurrentUser();
  if (user.role.name === "Piloto") redirect("/logistica");
  if (!["Super admin", "Administrador", "Contaduria", "Vendedor"].includes(user.role.name)) redirect("/");
  const invoices = await getInvoicesModuleData(user);

  return (
    <>
      <PageHeading title="Facturas" description="Registro de documentos generados desde preventas y entregas." />
      <InvoicesRegister initialSearch={params.search || ""} invoices={invoices} />
    </>
  );
}
