import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = "https://www.elitemodell.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Páginas estáticas públicas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${siteUrl}/og-image.png`],
    },
    {
      url: `${siteUrl}/buscar`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/profissionais`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/imoveis`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: `${siteUrl}/cadastro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Perfis públicos de profissionais aprovadas
  let professionalPages: MetadataRoute.Sitemap = [];
  try {
    const professionals = await prisma.professional.findMany({
      where: { status: "ACTIVE", verified: true },
      select: { slug: true, updatedAt: true, image: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });

    professionalPages = professionals.map((pro) => ({
      url: `${siteUrl}/profissionais/${pro.slug}`,
      lastModified: pro.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      ...(pro.image ? { images: [pro.image] } : {}),
    }));
  } catch {
    // Falha silenciosa — não quebra o build se o banco estiver indisponível
  }

  return [...staticPages, ...professionalPages];
}
