"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X, PlusSquare } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isIOSDevice() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) return;

    // Listen for beforeinstallprompt event (Android / Chrome / Edge / Brave / Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If iOS and not standalone, show the install option
    let animationFrame = 0;
    if (isIOSDevice()) {
      animationFrame = window.requestAnimationFrame(() => setShowPrompt(true));
    }

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice()) {
      setShowIOSInstruction(true);
      return;
    }

    if (!deferredPrompt) return;

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear deferred prompt and hide button
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm transition hover:scale-105 cursor-pointer shrink-0"
        title="Instalar Aplicación"
      >
        <Download size={14} />
        <span>Instalar App</span>
      </button>

      {/* iOS Safari Instructions Dialog */}
      {showIOSInstruction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-2xl animate-in fade-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black text-foreground">Instalar Perflo-SIG</h3>
              <button 
                onClick={() => setShowIOSInstruction(false)}
                className="grid size-7 place-items-center rounded-full border bg-card-muted text-muted hover:text-foreground cursor-pointer"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            
            <p className="text-sm leading-6 text-muted mb-5">
              Sigue estos sencillos pasos para instalar la aplicación en tu iPhone o iPad:
            </p>

            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-start gap-3 rounded-2xl bg-card-muted/40 p-3">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground shrink-0">1</span>
                <span className="flex-1 leading-5">Presiona el botón <strong className="inline-flex items-center gap-1 text-accent font-semibold">Compartir <Share2 size={14} className="inline" /></strong> en la barra inferior de Safari.</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-card-muted/40 p-3">
                <span className="grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground shrink-0">2</span>
                <span className="flex-1 leading-5">Desplázate hacia abajo y selecciona <strong className="inline-flex items-center gap-1 text-accent font-semibold">Agregar a Inicio <PlusSquare size={14} className="inline" /></strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstruction(false)}
              className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 cursor-pointer"
              type="button"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
