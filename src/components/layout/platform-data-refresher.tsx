"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 12000;

export function PlatformDataRefresher() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => router.refresh(), 120);
    return () => window.clearTimeout(timeout);
  }, [pathname, router]);

  useEffect(() => {
    function refreshIfVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    const interval = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);

  return null;
}
