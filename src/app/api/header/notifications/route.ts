import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth";
import { getHeaderData } from "@/services/header";
import type { Role } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const headerData = await getHeaderData({
    id: user.id,
    role: user.role.name as Role,
  });

  return NextResponse.json(headerData.notifications);
}
