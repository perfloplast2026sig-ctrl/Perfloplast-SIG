"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { saveDriverLocationAction } from "@/actions/logistics";

type GpsState = "checking" | "needs-action" | "active" | "blocked" | "stale";
type LocalGpsMode = "bypass" | "required";

const STALE_AFTER_MS = 2 * 60 * 1000;
const PING_INTERVAL_MS = 45 * 1000;
const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15000,
  timeout: 20000,
};

function getInitialLocalGpsMode(): LocalGpsMode {
  if (typeof window === "undefined") return process.env.NODE_ENV === "production" ? "required" : "bypass";

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocal) return "required";

  const params = new URLSearchParams(window.location.search);
  return params.get("gps") === "1" || params.get("gps") === "true" ? "required" : "bypass";
}

export function GpsRequirementGate({ enabled, roleName }: { enabled: boolean; roleName: string }) {
  const [state, setState] = useState<GpsState>(enabled ? "checking" : "active");
  const [localGpsMode] = useState<LocalGpsMode>(getInitialLocalGpsMode);
  const [message, setMessage] = useState("Verificando permiso de ubicacion...");
  const [lastPointAt, setLastPointAt] = useState<number | null>(null);
  const lastPointAtRef = useRef<number | null>(null);
  const watcherRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);

  const isLocalhost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const effectiveEnabled = enabled && localGpsMode === "required";

  const clearPendingTimeout = useCallback(() => {
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watcherRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearPendingTimeout();
  }, [clearPendingTimeout]);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const timestamp = Date.now();
    clearPendingTimeout();
    lastPointAtRef.current = timestamp;
    setLastPointAt(timestamp);
    setState("active");
    setMessage("Ubicacion activa.");

    void saveDriverLocationAction({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }).catch(() => undefined);
  }, [clearPendingTimeout]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    clearPendingTimeout();

    if (error.code === error.PERMISSION_DENIED) {
      setState("blocked");
      setMessage("El navegador bloqueo la ubicacion. Activa el permiso desde el icono junto a la barra de direccion y vuelve a intentar.");
      stopTracking();
      return;
    }

    const lastSavedAt = lastPointAtRef.current;
    if (!lastSavedAt || Date.now() - lastSavedAt > STALE_AFTER_MS) {
      setState("stale");
      setMessage(error.code === error.TIMEOUT ? "El permiso esta habilitado, pero el dispositivo no entrego coordenadas. Activa la ubicacion de Windows o prueba desde el celular/PWA." : "La ubicacion no esta disponible en este momento. Revisa que la ubicacion de Windows este activada.");
    }
  }, [clearPendingTimeout, stopTracking]);

  const requestSinglePosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("blocked");
      setMessage("Este dispositivo o navegador no permite usar GPS.");
      return;
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, GEO_OPTIONS);
  }, [handleError, handlePosition]);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("blocked");
      setMessage("Este dispositivo o navegador no permite usar GPS.");
      return;
    }

    stopTracking();
    setState("checking");
    setMessage("Permiso concedido. Obteniendo coordenadas del dispositivo...");
    pendingTimeoutRef.current = window.setTimeout(() => {
      if (lastPointAtRef.current) return;
      setState("stale");
      setMessage("Edge ya tiene permiso, pero Windows no devolvio coordenadas. Activa Configuracion > Privacidad y seguridad > Ubicacion, o prueba en una ventana normal/celular.");
    }, Number(GEO_OPTIONS.timeout || 20000) + 3000);

    requestSinglePosition();
    watcherRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, GEO_OPTIONS);
    intervalRef.current = window.setInterval(requestSinglePosition, PING_INTERVAL_MS);
  }, [handleError, handlePosition, requestSinglePosition, stopTracking]);

  const handleRetry = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setState("blocked");
      setMessage("Este dispositivo o navegador no permite usar GPS.");
      return;
    }

    if ("permissions" in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (permission.state === "denied") {
          setState("blocked");
          setMessage("El permiso de ubicacion ya esta bloqueado. Abre los permisos del sitio en el navegador, habilita Ubicacion y presiona reintentar.");
          return;
        }
      } catch {
        // Some browsers expose geolocation but not the permission query consistently.
      }
    }

    startTracking();
  }, [startTracking]);

  useEffect(() => {
    if (!effectiveEnabled) {
      stopTracking();
      return;
    }

    if (!("geolocation" in navigator)) {
      window.setTimeout(() => {
        setState("blocked");
        setMessage("Este dispositivo o navegador no permite usar GPS.");
      }, 0);
      return;
    }

    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    async function checkPermission() {
      if (!("permissions" in navigator)) {
        setState("needs-action");
        setMessage("Activa el GPS para continuar usando el sistema.");
        return;
      }

      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;
        permissionStatus = permission;

        if (permission.state === "granted") {
          startTracking();
        } else if (permission.state === "denied") {
          setState("blocked");
          setMessage("El permiso de ubicacion esta bloqueado. Habilitalo en los ajustes del navegador o de la app.");
        } else {
          setState("needs-action");
          setMessage("Activa el GPS para continuar usando el sistema.");
        }

        permission.onchange = () => {
          if (permission.state === "granted") startTracking();
          if (permission.state === "denied") {
            stopTracking();
            setState("blocked");
            setMessage("El permiso de ubicacion fue desactivado. Activalo para continuar.");
          }
        };
      } catch {
        setState("needs-action");
        setMessage("Activa el GPS para continuar usando el sistema.");
      }
    }

    checkPermission();

    return () => {
      cancelled = true;
      if (permissionStatus) permissionStatus.onchange = null;
      stopTracking();
    };
  }, [effectiveEnabled, startTracking, stopTracking]);

  useEffect(() => {
    if (!effectiveEnabled) return;

    const timer = window.setInterval(() => {
      if (!lastPointAt) return;
      if (Date.now() - lastPointAt > STALE_AFTER_MS) {
        setState("stale");
        setMessage("No se recibe ubicacion reciente. Revisa que el GPS siga activo.");
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [effectiveEnabled, lastPointAt]);

  useEffect(() => {
    if (!effectiveEnabled) return;

    const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && state !== "active") {
      requestSinglePosition();
    }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [effectiveEnabled, requestSinglePosition, state]);

  if (!effectiveEnabled || state === "active") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/96 p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-card to-card p-6">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-3xl bg-accent text-accent-foreground shadow-lg">
              {state === "blocked" ? <WifiOff size={24} /> : <LocateFixed size={24} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">GPS obligatorio</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Activa tu ubicacion</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Para usar el sistema como {roleName}, Perfloplast SIG necesita ubicacion mientras la app esta abierta.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border bg-card-muted/45 p-4">
            <p className="font-semibold">{message}</p>
            <p className="mt-2 text-sm leading-6 text-muted">Si ya lo activaste, presiona reintentar. En Android instala la PWA y permite ubicacion precisa para una experiencia similar a app nativa.</p>
          </div>

          <div className="grid gap-2 text-sm text-muted">
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={16} />Se guarda solo la ubicacion operativa del usuario autenticado.</div>
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={16} />Si se apaga el GPS o deja de responder, el sistema vuelve a bloquearse.</div>
          </div>

          <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground shadow-lg transition hover:opacity-90" onClick={handleRetry} type="button">
            <RefreshCw size={17} /> Activar GPS / Reintentar
          </button>

          {isLocalhost ? (
            <button className="inline-flex h-11 w-full items-center justify-center rounded-full border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-card-muted" onClick={() => setState("active")} type="button">
              Continuar sin GPS solo en localhost
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
