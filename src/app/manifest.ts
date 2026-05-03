import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IN-OUT Tracker",
    short_name: "IN-OUT",
    description: "Theo doi thu chi va ky luong",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFBF2",
    theme_color: "#FFC837",
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/pwa-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/pwa-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
