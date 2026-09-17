import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Modell",
    short_name: "Elite Modell",
    description:
      "Encontre perfis verificados com privacidade, segurança e liberdade na Elite Modell.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3e2ff",
    theme_color: "#b72cff",
    categories: ["lifestyle"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
