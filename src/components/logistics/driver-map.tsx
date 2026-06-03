"use client";

import { useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, LocateFixed, MapPin, Minus, Plus, Truck, X } from "lucide-react";

type UserPoint = {
  driver: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isOnline: boolean;
  recordedAt: string;
};

type OrderPoint = {
  code: string;
  client: string;
  destination: string;
  status: { label: string; tone: string };
  latitude: number | null;
  longitude: number | null;
};

const CENTER = { latitude: 15.55, longitude: -90.35 };
const TILE_SIZE = 256;

export function DriverMap({ points, label = "pilotos", orders = [] }: { points: UserPoint[]; label?: string; orders?: OrderPoint[] }) {
  const located = points.filter((point) => point.latitude !== null && point.longitude !== null);
  const orderPoints = orders.filter((order) => order.latitude !== null && order.longitude !== null);
  const [zoom, setZoom] = useState(8);
  const [center, setCenter] = useState(CENTER);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; center: typeof CENTER } | null>(null);
  const centerPixel = useMemo(() => latLngToWorldPixel(center.latitude, center.longitude, zoom), [center, zoom]);
  const centerTileX = Math.floor(centerPixel.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPixel.y / TILE_SIZE);
  const tiles = buildTiles(centerTileX, centerTileY, centerPixel, zoom);
  const selectedUser = points.find((point) => `user:${point.email}` === selectedKey) || null;
  const selectedOrder = orders.find((order) => `order:${order.code}` === selectedKey) || null;
  const userMarkerType = label.toLowerCase().includes("vendedor") ? "seller" : "driver";
  const showUserLegend = located.length > 0;

  const focusUser = (point: UserPoint) => {
    if (point.latitude === null || point.longitude === null) return;
    setCenter({ latitude: point.latitude, longitude: point.longitude });
    setZoom((current) => Math.max(current, 14));
    setSelectedKey(`user:${point.email}`);
  };

  const focusOrder = (order: OrderPoint) => {
    if (order.latitude === null || order.longitude === null) return;
    setCenter({ latitude: order.latitude, longitude: order.longitude });
    setZoom((current) => Math.max(current, 14));
    setSelectedKey(`order:${order.code}`);
  };

  const resetView = () => {
    setCenter(CENTER);
    setZoom(8);
    setSelectedKey(null);
  };

  const startDrag = (clientX: number, clientY: number) => {
    drag.current = { x: clientX, y: clientY, center };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!drag.current) return;
    const startPixel = latLngToWorldPixel(drag.current.center.latitude, drag.current.center.longitude, zoom);
    const nextPixel = { x: startPixel.x - (clientX - drag.current.x), y: startPixel.y - (clientY - drag.current.y) };
    setCenter(worldPixelToLatLng(nextPixel.x, nextPixel.y, zoom));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]" style={{ isolation: "isolate" }}>
      <div
        className="relative h-[460px] touch-none overflow-hidden rounded-2xl border bg-card-muted"
        onMouseDown={(event) => startDrag(event.clientX, event.clientY)}
        onMouseLeave={() => { drag.current = null; }}
        onMouseMove={(event) => moveDrag(event.clientX, event.clientY)}
        onMouseUp={() => { drag.current = null; }}
        onTouchEnd={() => { drag.current = null; }}
        onTouchMove={(event) => moveDrag(event.touches[0].clientX, event.touches[0].clientY)}
        onTouchStart={(event) => startDrag(event.touches[0].clientX, event.touches[0].clientY)}
      >
        {/* Premium Vignette / Inner Shadow overlay */}
        <div className="pointer-events-none absolute inset-0 z-30 rounded-2xl shadow-[inset_0_0_60px_rgba(0,0,0,0.15)] ring-1 ring-inset ring-black/5 dark:shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] dark:ring-white/10" />

        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/20 bg-background/70 px-3 py-1 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-background/90">Mapa GPS Guatemala</div>
        
        <div className="absolute left-4 top-14 z-10 flex flex-wrap gap-2">
          {showUserLegend ? (userMarkerType === "seller" ? <LegendItem color="bg-sky-600" icon="seller" label="Vendedor" /> : <LegendItem color="bg-emerald-600" icon="truck" label="Piloto" />) : null}
          {orderPoints.length > 0 ? <LegendItem color="bg-rose-600" icon="delivery" label="Entrega" /> : null}
        </div>
        
        <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded-full border border-white/20 bg-background/70 shadow-lg backdrop-blur-md">
          <button aria-label="Vista general" className="grid size-10 place-items-center border-r border-border/50 text-foreground transition hover:bg-foreground/10" onClick={resetView} type="button"><LocateFixed size={16} /></button>
          <button aria-label="Alejar mapa" className="grid size-10 place-items-center border-r border-border/50 text-foreground transition hover:bg-foreground/10" onClick={() => setZoom((current) => Math.max(7, current - 1))} type="button"><Minus size={16} /></button>
          <span className="grid h-10 min-w-12 place-items-center text-sm font-semibold text-foreground">{zoom}</span>
          <button aria-label="Acercar mapa" className="grid size-10 place-items-center border-l border-border/50 text-foreground transition hover:bg-foreground/10" onClick={() => setZoom((current) => Math.min(16, current + 1))} type="button"><Plus size={16} /></button>
        </div>
        
        <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/20 bg-background/80 px-3 py-2 text-xs leading-5 text-foreground shadow-lg backdrop-blur-md">
          {located.length > 0 ? "Arrastra el mapa para moverte. Ultimo punto guardado si se pierde senal." : "Arrastra el mapa para revisar las entregas asignadas."}
        </div>

        {tiles.map((tile) => {
          const subdomain = `mt${Math.abs(tile.x + tile.y) % 4}`;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              key={`${tile.x}-${tile.y}`} 
              alt="" 
              className="absolute max-w-none select-none bg-cover contrast-[1.05] saturate-[1.2] hue-rotate-[1deg]" 
              draggable={false} 
              src={`https://${subdomain}.google.com/vt/lyrs=m&hl=es&x=${tile.x}&y=${tile.y}&z=${zoom}`} 
              style={{ 
                height: TILE_SIZE, 
                left: `calc(50% + ${tile.left}px)`, 
                top: `calc(50% + ${tile.top}px)`, 
                width: TILE_SIZE,
                backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png)`
              }} 
            />
          );
        })}

        {orderPoints.map((order) => {
          const position = latLngToOffset(order.latitude || 0, order.longitude || 0, centerPixel, zoom);
          return (
            <button key={order.code} className="absolute z-20 -translate-x-1/2 -translate-y-full text-left" onClick={(event) => { event.stopPropagation(); focusOrder(order); }} style={{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)` }} type="button">
              {selectedKey === `order:${order.code}` ? (
                <div className="mb-1 min-w-44 rounded-2xl border border-white/20 bg-background/90 px-3 py-2 text-xs shadow-xl ring-2 ring-rose-500 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{order.code}</p>
                      <p className="text-muted-foreground">{order.client}</p>
                      <p className="font-semibold text-rose-600">{order.status.label}</p>
                    </div>
                    <span
                      aria-label="Cerrar entrega"
                      className="grid size-6 shrink-0 place-items-center rounded-full border bg-background/90 text-foreground transition hover:bg-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedKey(null);
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <X size={13} />
                    </span>
                  </div>
                </div>
              ) : null}
              <PinMarker tone="delivery" online={true} />
            </button>
          );
        })}

        {located.map((point) => {
          const position = latLngToOffset(point.latitude || 0, point.longitude || 0, centerPixel, zoom);
          const isSelected = selectedKey === `user:${point.email}`;
          return (
            <button key={point.email} className="absolute z-20 -translate-x-1/2 -translate-y-full text-left" onClick={(event) => { event.stopPropagation(); focusUser(point); }} style={{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)` }} type="button">
              <div className="relative flex flex-col items-center">
                {isSelected ? (
                  <div className="rounded-2xl border border-white/20 bg-background/90 px-3 py-2 text-xs shadow-xl ring-2 ring-accent backdrop-blur-xl mb-1">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{point.driver}</p>
                        <p className="text-muted-foreground">{point.recordedAt}</p>
                        <p className={point.isOnline ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{point.isOnline ? "En linea" : "Fuera de linea"}</p>
                      </div>
                      <span
                        aria-label="Cerrar detalle"
                        className="grid size-5 place-items-center rounded-full border hover:bg-muted transition-colors cursor-pointer"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedKey(null);
                        }}
                      >
                        <X size={12} />
                      </span>
                    </div>
                  </div>
                ) : null}
                <PinMarker online={point.isOnline} tone={userMarkerType} />
              </div>
            </button>
          );
        })}

        {located.length === 0 && orderPoints.length === 0 ? (
          <div className="absolute inset-0 z-50 grid place-items-center">
            <div className="rounded-2xl border border-white/20 bg-background/80 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md">Aun no hay puntos GPS de {label} registrados.</div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {points.map((point) => (
          <button key={point.email} className={`w-full rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md p-4 text-left transition-all ${selectedKey === `user:${point.email}` ? "ring-2 ring-accent shadow-md bg-card" : ""}`} onClick={() => focusUser(point)} type="button">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{point.driver}</p><p className="text-xs text-muted-foreground">{point.email}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${point.latitude === null ? "bg-muted text-muted-foreground ring-1 ring-border" : "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400"}`}>{point.latitude === null ? "Sin GPS" : point.isOnline ? "En linea" : "Ultimo punto"}</span>
            </div>
            <p className="mt-3 text-sm">{point.latitude === null ? "Sin ubicacion registrada" : `${point.latitude}, ${point.longitude}`}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ultimo punto: {point.recordedAt}</p>
          </button>
        ))}
        {orders.length > 0 ? <p className="pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pedidos del mapa</p> : null}
        {orders.map((order) => (
          <button key={order.code} className={`w-full rounded-2xl border bg-card/50 hover:bg-card hover:shadow-md p-4 text-left transition-all ${selectedKey === `order:${order.code}` ? "ring-2 ring-accent shadow-md bg-card" : ""}`} onClick={() => focusOrder(order)} type="button">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold">{order.code}</p><p className="text-xs text-muted-foreground">{order.client}</p></div>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-border shadow-sm">{order.status.label}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{order.destination}</p>
          </button>
        ))}
        {(selectedUser || selectedOrder) ? (
          <div className="rounded-2xl border bg-card p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Detalle seleccionado</p>
              <button
                aria-label="Cerrar detalle"
                className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedKey(null);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            {selectedUser ? <p className="mt-2 font-semibold">{selectedUser.driver}</p> : null}
            {selectedOrder ? <p className="mt-2 font-semibold">{selectedOrder.code} · {selectedOrder.client}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PinMarker({ tone, online = true }: { tone: "driver" | "seller" | "delivery"; online?: boolean }) {
  const styles = {
    driver: online ? "bg-emerald-600 ring-emerald-600/30" : "bg-amber-500 ring-amber-500/30",
    seller: online ? "bg-sky-600 ring-sky-600/30" : "bg-amber-500 ring-amber-500/30",
    delivery: "bg-rose-600 ring-rose-600/30",
  };
  const Icon = tone === "delivery" ? MapPin : tone === "seller" ? BriefcaseBusiness : Truck;

  return (
    <div className="relative mx-auto mt-1 flex flex-col items-center group">
      {/* Live pulsing effect for online markers or deliveries */}
      {online && (
        <span className={`absolute top-0 left-0 size-9 animate-ping rounded-full opacity-60 ${styles[tone].split(" ")[0]}`}></span>
      )}
      <div className={`grid size-9 place-items-center rounded-full border-2 border-white text-white shadow-xl ring-4 transition-transform group-hover:scale-110 ${styles[tone]}`}>
        <Icon size={17} />
      </div>
      <div className={`-mt-1 h-3 w-3 rotate-45 border-b-2 border-r-2 border-white shadow-sm ${styles[tone].split(" ")[0]}`} />
    </div>
  );
}

function LegendItem({ color, icon, label }: { color: string; icon: "truck" | "seller" | "delivery"; label: string }) {
  const Icon = icon === "delivery" ? MapPin : icon === "seller" ? BriefcaseBusiness : Truck;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/95 px-2.5 py-1 text-xs font-semibold shadow-sm">
      <span className={`grid size-5 place-items-center rounded-full text-white ${color}`}><Icon size={12} /></span>
      {label}
    </span>
  );
}

function buildTiles(centerTileX: number, centerTileY: number, centerPixel: { x: number; y: number }, zoom: number) {
  const tiles: Array<{ x: number; y: number; left: number; top: number }> = [];
  const maxTile = 2 ** zoom;

  for (let dx = -4; dx <= 4; dx += 1) {
    for (let dy = -3; dy <= 3; dy += 1) {
      const x = wrapTile(centerTileX + dx, maxTile);
      const y = centerTileY + dy;
      if (y < 0 || y >= maxTile) continue;
      tiles.push({ x, y, left: x * TILE_SIZE - centerPixel.x, top: y * TILE_SIZE - centerPixel.y });
    }
  }

  return tiles;
}

function latLngToOffset(latitude: number, longitude: number, centerPixel: { x: number; y: number }, zoom: number) {
  const pixel = latLngToWorldPixel(latitude, longitude, zoom);
  return { x: pixel.x - centerPixel.x, y: pixel.y - centerPixel.y };
}

function latLngToWorldPixel(latitude: number, longitude: number, zoom: number) {
  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldPixelToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

function wrapTile(tile: number, maxTile: number) {
  return ((tile % maxTile) + maxTile) % maxTile;
}
