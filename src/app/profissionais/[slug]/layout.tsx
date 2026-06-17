import type { Metadata } from "next";

const siteUrl = "https://www.elitemodell.com.br";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonical = `${siteUrl}/profissionais/${slug}`;

  return {
    title: "Perfil com acesso restrito",
    description: "Este perfil exige sessao autenticada e verificacao de maioridade.",
    alternates: { canonical },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noimageindex: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        "max-image-preview": "none",
        "max-snippet": 0,
        "max-video-preview": 0,
      },
    },
  };
}

export default function ProfissionalSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
