import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perflo-SIG",
  description: "Sistema empresarial para inventario, preventas, produccion y despachos.",
  applicationName: "Perflo-SIG",
  appleWebApp: {
    capable: true,
    title: "Perflo-SIG",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/company-logo.svg.png",
    apple: "/company-logo.svg.png",
  },
  manifest: "/manifest",
};

export const viewport: Viewport = {
  themeColor: "#1f4f43",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enablePwa = process.env.NODE_ENV === "production";

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {!enablePwa ? <LocalDevServiceWorkerReset /> : <ServiceWorkerRegister />}
        {children}
      </body>
    </html>
  );
}

function LocalDevServiceWorkerReset() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "::1";
            if (!isLocal) return;
            var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
            var unregister = navigator.serviceWorker
              ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
                  return Promise.all(registrations.map(function (registration) { return registration.unregister(); }));
                }).catch(function () {})
              : Promise.resolve();
            var clearCaches = window.caches
              ? caches.keys().then(function (keys) {
                  return Promise.all(keys.map(function (key) { return caches.delete(key); }));
                }).catch(function () {})
              : Promise.resolve();
            Promise.all([unregister, clearCaches]).then(function () {
              if (!hadController) return;
              if (sessionStorage.getItem("local-sw-reset") === "1") return;
              sessionStorage.setItem("local-sw-reset", "1");
              location.reload();
            });
          })();
        `,
      }}
    />
  );
}
