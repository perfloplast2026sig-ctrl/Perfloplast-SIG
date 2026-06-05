"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const navigation: Array<{ name: string; href: string; icon: LucideIcon; roles: Role[] }> = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["Super admin", "Administrador", "Contaduria"] },
  { name: "Inventario", href: "/inventario", icon: Boxes, roles: ["Super admin", "Administrador", "Contaduria", "Bodeguero"] },
  { name: "Preventas", href: "/preventas", icon: ClipboardList, roles: ["Super admin", "Administrador", "Vendedor"] },
  { name: "Produccion", href: "/produccion", icon: Factory, roles: ["Super admin", "Administrador", "Bodeguero"] },
  { name: "Logistica", href: "/logistica", icon: Truck, roles: ["Super admin", "Administrador", "Piloto", "Bodeguero"] },
  { name: "Facturas", href: "/facturas", icon: ReceiptText, roles: ["Super admin", "Administrador", "Contaduria", "Vendedor"] },
  { name: "Usuarios", href: "/usuarios", icon: ShieldCheck, roles: ["Super admin", "Administrador"] },
  { name: "Reportes", href: "/reportes", icon: FileText, roles: ["Super admin", "Administrador", "Contaduria"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) => item.roles.includes(role));

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r bg-card/75 px-4 py-5 backdrop-blur lg:block">
        <Link href="/" className="mb-8 flex items-center gap-3 rounded-2xl px-2">
          <div className="relative h-12 w-16 overflow-hidden rounded-2xl bg-card-muted shadow-sm">
            <Image alt="Logo de Perfloplast" className="object-contain p-1.5" fill sizes="64px" src="/company-logo.svg.png" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">Perflo-SIG</p>
            <p className="text-xs text-muted">Operacion industrial</p>
          </div>
        </Link>

        <nav className="space-y-1.5">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted transition cursor-pointer",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-card-muted hover:text-foreground",
                )}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav id="mobile-navigation" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:hidden">
        <div className="mobile-nav-scroll flex gap-1 overflow-x-auto overscroll-x-contain pb-1">
        {visibleNavigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch
              className={cn(
                "flex min-w-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1.5 text-[10px] font-semibold text-muted transition cursor-pointer",
                active ? "bg-accent text-accent-foreground" : "hover:bg-card-muted hover:text-foreground",
              )}
            >
              <Icon size={17} />
              <span className="max-w-20 truncate">{item.name}</span>
            </Link>
          );
        })}
        </div>
      </nav>
    </>
  );
}
