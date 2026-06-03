import { ExecutiveReportsDashboard } from "@/components/reports/executive-reports-dashboard";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/services/auth";
import { getReportsData } from "@/services/reports";

export default async function ReportsPage() {
  const user = await requireCurrentUser();
  if (user.role.name === "Vendedor") redirect("/preventas");
  if (user.role.name === "Piloto") redirect("/logistica");
  if (!["Super admin", "Administrador", "Contaduria"].includes(user.role.name)) redirect("/");
  const reports = await getReportsData();

  return <ExecutiveReportsDashboard reports={reports} user={{ name: user.name, role: user.role.name }} />;
}
