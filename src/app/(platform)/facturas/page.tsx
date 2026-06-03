import { PageHeading } from "@/components/layout/page-heading";
import { InvoicesRegister } from "@/components/invoices/invoices-register";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { getInvoicesModuleData } from "@/services/invoices";

export default async function InvoicesPage() {
  const user = await requireCurrentUser();
  if (user.role.name === "Piloto") redirect("/logistica");
  if (!["Super admin", "Administrador", "Contaduria", "Vendedor"].includes(user.role.name)) redirect("/");
  const invoices = await getInvoicesModuleData(user);

  return (
    <>
      <PageHeading title="Facturas" description="Registro de documentos generados desde preventas y entregas." />
      <InvoicesRegister invoices={invoices} />
    </>
  );
}
