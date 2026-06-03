import type { ReactNode } from "react";
import { requireCurrentUser } from "@/services/auth";
import type { Role } from "@/types";
import { DriverLocationTracker } from "@/components/logistics/driver-location-tracker";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const currentUser = {
    id: user.id,
    name: user.name,
    role: user.role.name as Role,
    email: user.email,
  };

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <Sidebar role={currentUser.role} />
      <div className="app-content min-w-0 flex-1 pb-24 lg:pb-0">
        <Header user={currentUser} />
        <DriverLocationTracker enabled={["Piloto", "Vendedor"].includes(currentUser.role)} />
        <main className="app-main mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
