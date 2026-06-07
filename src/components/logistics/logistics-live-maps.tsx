"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { DriverMap } from "./driver-map";

type MapsData = {
  latestLocations: Parameters<typeof DriverMap>[0]["points"];
  latestSellerLocations: Parameters<typeof DriverMap>[0]["points"];
  deliveryMapOrders: NonNullable<Parameters<typeof DriverMap>[0]["orders"]>;
};

type SocketState = "connecting" | "live" | "retrying" | "error";

export function LogisticsLiveMaps({ canSeeMap, initialData, isDriver }: { canSeeMap: boolean; initialData: MapsData; isDriver: boolean }) {
  const [data, setData] = useState(initialData);
  const [socketState, setSocketState] = useState<SocketState>("connecting");

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByEffect = false;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/logistics/maps`);
      setSocketState("connecting");

      socket.onopen = () => setSocketState("live");
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as { type: string; data?: MapsData };
          if (payload.type === "maps" && payload.data) {
            setData(payload.data);
            setSocketState("live");
          }
          if (payload.type === "error") setSocketState("error");
        } catch {
          setSocketState("error");
        }
      };
      socket.onerror = () => setSocketState("error");
      socket.onclose = () => {
        if (closedByEffect) return;
        setSocketState("retrying");
        reconnectTimer = window.setTimeout(connect, 1800);
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const liveBadge = <span className={`rounded-full border px-3 py-1 text-xs font-bold ring-1 ${socketState === "live" ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"}`}>{socketLabel(socketState)}</span>;

  return (
    <>
      {canSeeMap ? (
        <SectionCard title="Mapa de pilotos" eyebrow="Ultimo punto GPS en Guatemala" className="mt-6" action={liveBadge}>
          <DriverMap points={data.latestLocations} label="pilotos" orders={data.deliveryMapOrders} />
        </SectionCard>
      ) : null}

      {isDriver ? (
        <SectionCard title="Mapa de mis pedidos" eyebrow="Entregas asignadas" className="mt-6" action={liveBadge}>
          <DriverMap points={[]} label="pedidos" orders={data.deliveryMapOrders} />
        </SectionCard>
      ) : null}

      {canSeeMap ? (
        <SectionCard title="Mapa de vendedores" eyebrow="Ubicacion comercial en Guatemala" className="mt-6" action={liveBadge}>
          <DriverMap points={data.latestSellerLocations} label="vendedores" />
        </SectionCard>
      ) : null}
    </>
  );
}

function socketLabel(state: SocketState) {
  const labels = {
    connecting: "Conectando",
    live: "En vivo",
    retrying: "Reconectando",
    error: "Sin conexion",
  };
  return labels[state];
}
