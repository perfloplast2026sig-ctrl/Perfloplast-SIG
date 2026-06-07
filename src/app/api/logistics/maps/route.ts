import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth";
import { getLogisticsMapsData } from "@/services/logistics";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!["Super admin", "Administrador", "Piloto", "Bodeguero"].includes(user.role.name)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const data = await getLogisticsMapsData({ id: user.id, role: { name: user.role.name } });
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
