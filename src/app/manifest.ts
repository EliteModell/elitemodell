import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Modell",
    short_name: "Elite Modell",
    description:
      "Plataforma premium para conectar pessoas, profissionais, locais reservados e oportunidades com discricao e seguranca.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    categories: ["lifestyle", "business"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/brand/elite-modell-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/elite-modell-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/elite-modell-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
