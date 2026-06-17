"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
        "caches" in window ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))) : Promise.resolve([]),
      ]).then(() => {
        if (!navigator.serviceWorker.controller) return;
        if (sessionStorage.getItem("sw-local-cleared") === "1") return;
        sessionStorage.setItem("sw-local-cleared", "1");
        window.location.reload();
      });
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
