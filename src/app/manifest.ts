import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perflo-SIG",
    short_name: "Perflo-SIG",
    description: "Inventario, preventas, produccion, logistica y rastreo operativo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#1f4f43",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/company-logo.svg.png",
        sizes: "1824x1154",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/company-logo.svg.png",
        sizes: "1824x1154",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/company-logo.svg.png",
        sizes: "1824x1154",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/company-logo.svg.png",
        sizes: "1824x1154",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/company-logo.svg.png",
        sizes: "1824x1154",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
