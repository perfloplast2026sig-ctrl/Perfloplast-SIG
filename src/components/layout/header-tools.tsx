"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

type Notification = {
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
};

type SearchItem = {
  label: string;
  detail: string;
  href: string;
  type: string;
};

const toneClass = {
  danger: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

async function fetchNotifications(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las notificaciones.");
  }

  return response.json() as Promise<Notification[]>;
}

export function HeaderTools({ notifications, searchItems }: { notifications: Notification[]; searchItems: SearchItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: liveNotifications = notifications } = useSWR<Notification[]>("/api/header/notifications", fetchNotifications, {
    fallbackData: notifications,
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });
  const results = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) return [];
    return searchItems.filter((item) => normalizeSearch(`${item.label} ${item.detail} ${item.type}`).includes(term)).slice(0, 8);
  }, [query, searchItems]);
  const fallbackSearchHref = getFallbackSearchHref(query, searchItems);

  function closeSearch() {
    setShowSearch(false);
    setQuery("");
  }

  return (
    <>
      <form
        className="relative min-w-0 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          const href = results[0]?.href || fallbackSearchHref;
          if (!href) return;

          closeSearch();
          router.push(href);
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          className="h-11 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-accent"
          onChange={(event) => {
            setQuery(event.target.value);
            setShowSearch(true);
            setShowNotifications(false);
          }}
          onFocus={() => setShowSearch(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowSearch(false);
          }}
          placeholder="Buscar..."
          value={query}
        />
        {showSearch && query ? (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border bg-card shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Busqueda global</p>
              <button className="grid size-7 place-items-center rounded-full border bg-card-muted" onClick={() => setShowSearch(false)} type="button"><X size={14} /></button>
            </div>
            {fallbackSearchHref ? (
              <Link className="block border-b bg-card-muted/45 px-4 py-3 text-sm font-semibold transition hover:bg-card-muted" href={fallbackSearchHref} onClick={closeSearch}>
                Buscar &quot;{query.trim()}&quot;
              </Link>
            ) : null}
            {results.length === 0 ? <p className="p-4 text-sm text-muted">Sin sugerencias. Presiona Enter para buscar.</p> : null}
            {results.map((item, index) => (
              <Link key={`${item.type}-${item.label}-${index}`} className="block border-b px-4 py-3 transition hover:bg-card-muted/70" href={item.href} onClick={closeSearch}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </div>
                  <span className="rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-muted">{item.type}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </form>

      <div className="relative">
        <button
          type="button"
          className="relative inline-flex size-10 items-center justify-center rounded-full border bg-card text-muted transition hover:text-foreground"
          aria-label="Notificaciones"
          onClick={() => {
            setShowNotifications((value) => !value);
            setShowSearch(false);
          }}
        >
          <Bell size={18} />
          {liveNotifications.length > 0 ? <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-white">{Math.min(liveNotifications.length, 9)}</span> : null}
        </button>

        {showNotifications ? (
          <div className="fixed left-2 right-2 top-16 z-50 max-h-[72dvh] overflow-hidden rounded-2xl border bg-card shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-w-[calc(100vw-2rem)] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold">Notificaciones</p>
              <button className="grid size-7 place-items-center rounded-full border bg-card-muted" onClick={() => setShowNotifications(false)} type="button"><X size={14} /></button>
            </div>
            <div className="max-h-[calc(72dvh-54px)] overflow-y-auto overscroll-contain">
              {liveNotifications.length === 0 ? <p className="p-4 text-sm text-muted">No hay alertas activas.</p> : null}
              {liveNotifications.map((item, index) => (
                <Link key={`${item.title}-${index}`} className="block border-b px-4 py-3 transition hover:bg-card-muted/70" href={item.href} onClick={() => setShowNotifications(false)}>
                  <div className="flex gap-3">
                    <span className={`mt-1 size-2.5 shrink-0 rounded-full ${toneClass[item.tone]}`} />
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{item.title}</p>
                      <p className="mt-1 break-words text-xs leading-5 text-muted">{item.detail}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getFallbackSearchHref(query: string, searchItems: SearchItem[]) {
  const term = query.trim();
  if (!term) return "";

  const targetType = ["Producto", "Preventa", "Cliente", "Despacho", "Factura", "Produccion", "Usuario"].find((type) => searchItems.some((item) => item.type === type));
  const encoded = encodeURIComponent(term);

  if (targetType === "Producto") return `/inventario?search=${encoded}`;
  if (targetType === "Preventa" || targetType === "Cliente") return `/preventas?search=${encoded}`;
  if (targetType === "Despacho") return `/logistica?search=${encoded}`;
  if (targetType === "Factura") return `/facturas?search=${encoded}`;
  if (targetType === "Produccion") return `/produccion?search=${encoded}`;
  if (targetType === "Usuario") return `/usuarios?search=${encoded}`;

  return "";
}
