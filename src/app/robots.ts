import type { MetadataRoute } from "next";

const siteUrl = "https://www.elitemodell.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms", "/privacy", "/politica-conteudo", "/documentos/"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/painel/",
          "/admin",
          "/admin-setup",
          "/modelo/",
          "/anfitriao/",
          "/cliente/",
          "/completar-cadastro",
          "/cadastro-anfitriao",
          "/verificacao/",
          "/verificacao-idade",
          "/saida",
          "/premium/",
          "/buscar",
          "/profissionais",
          "/imoveis",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
