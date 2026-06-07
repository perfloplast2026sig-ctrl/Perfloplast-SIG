import type { ReactNode } from "react";
import { requireCurrentUser } from "@/services/auth";
import type { Role } from "@/types";
import { GpsRequirementGate } from "@/components/logistics/gps-requirement-gate";
import { Header } from "./header";
import { PlatformDataRefresher } from "./platform-data-refresher";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const currentUser = {
    id: user.id,
    name: user.name,
    role: user.role.name as Role,
    email: user.email,
  };
  const requiresGps = ["Piloto", "Vendedor"].includes(currentUser.role) && (process.env.NODE_ENV === "production" || process.env.REQUIRE_GPS_IN_LOCAL === "true");

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <Sidebar role={currentUser.role} />
      <div className="app-content min-w-0 flex-1 pb-24 lg:pb-0">
        <Header user={currentUser} />
        <PlatformDataRefresher />
        <GpsRequirementGate enabled={requiresGps} roleName={currentUser.role} />
        <main className="app-main mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
