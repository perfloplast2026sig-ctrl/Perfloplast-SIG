"use client";

import { useEffect } from "react";
import { saveDriverLocationAction } from "@/actions/logistics";

export function DriverLocationTracker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    const savePosition = (position: GeolocationPosition) => {
      void saveDriverLocationAction({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }).catch(() => undefined);
    };

    navigator.geolocation.getCurrentPosition(savePosition, () => undefined, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });

    const watcher = navigator.geolocation.watchPosition(
      savePosition,
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    );
    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(savePosition, () => undefined, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    }, 60000);

    return () => {
      navigator.geolocation.clearWatch(watcher);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return null;
}
