import { logoutAction } from "@/actions/auth";
import type { Role } from "@/types";
import { getHeaderData } from "@/services/header";
import { HeaderTools } from "./header-tools";
import { ThemeToggle } from "./theme-toggle";

export async function Header({ user }: { user: { id: string; name: string; email: string; role: Role } }) {
  const headerData = await getHeaderData(user);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/88 px-4 py-3 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-end gap-3 sm:justify-start">
        <HeaderTools notifications={headerData.notifications} searchItems={headerData.searchItems} />
        <ThemeToggle />
        <div className="hidden items-center gap-3 rounded-full border bg-card py-1.5 pl-2 pr-4 md:flex">
          <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{initials}</div>
          <div>
            <p className="text-sm font-medium leading-4">{user.name}</p>
            <p className="text-xs text-muted">{user.role}</p>
          </div>
          <form action={logoutAction}>
            <button className="ml-1 rounded-full px-2 py-1 text-xs font-medium text-muted transition hover:bg-card-muted hover:text-foreground" type="submit">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
