import type { MetadataRoute } from "next";

const iconVersion = "20260914";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Modell",
    short_name: "Elite Modell",
    description:
      "Plataforma premium para conectar pessoas, profissionais, locais reservados e oportunidades com discrição e segurança.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["lifestyle", "business"],
    icons: [
      {
        src: `/favicon.ico?v=${iconVersion}`,
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: `/favicon-16x16.png?v=${iconVersion}`,
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: `/favicon-32x32.png?v=${iconVersion}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: `/favicon-48x48.png?v=${iconVersion}`,
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: `/brand/elite-modell-icon-192.png?v=${iconVersion}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/brand/elite-modell-icon-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/brand/elite-modell-icon-512.png?v=${iconVersion}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `/brand/elite-modell-apple-touch-icon.png?v=${iconVersion}`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
