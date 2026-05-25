import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = "https://www.elitemodell.com.br";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const pro = await prisma.professional.findUnique({
    where: { slug },
    select: {
      displayName: true,
      bio: true,
      city: true,
      state: true,
      escortCategory: true,
      image: true,
      verified: true,
      status: true,
    },
  });

  if (!pro || pro.status !== "ACTIVE") {
    return {
      title: "Profissional não encontrada",
      robots: { index: false, follow: false },
    };
  }

  const location = [pro.city, pro.state].filter(Boolean).join(", ");
  const title = `${pro.displayName} — Acompanhante em ${location} | Elite Modell`;
  const description = pro.bio
    ? pro.bio.slice(0, 155)
    : `${pro.displayName} é uma profissional verificada em ${location}. Perfil completo na Elite Modell.`;

  const canonical = `${siteUrl}/profissionais/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Elite Modell",
      locale: "pt_BR",
      type: "profile",
      ...(pro.image ? { images: [{ url: pro.image, width: 800, height: 800, alt: pro.displayName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(pro.image ? { images: [pro.image] } : {}),
    },
    robots: {
      index: pro.verified && pro.status === "ACTIVE",
      follow: true,
    },
  };
}

export default function ProfissionalSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
