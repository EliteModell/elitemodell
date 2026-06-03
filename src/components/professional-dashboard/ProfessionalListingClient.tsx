"use client";

import Link from "next/link";
import {
  PremiumActionCard,
  PremiumChecklistItem,
  PremiumHeroCard,
  PremiumMetricCard,
  PremiumSection,
} from "@/components/professional-dashboard/ProfessionalPremium";

export type ProfessionalListingViewData = {
  displayName: string;
  cityLabel: string;
  categoryLabel: string;
  planLabel: string;
  planStatus: string;
  listingStatus: string;
  rankingLabel: string;
  publicProfileHref: string;
  image: string | null;
  services: string[];
  ratingLabel: string;
  priceLabel: string;
  isHighlighted: boolean;
  tips: Array<{ label: string; done: boolean }>;
  highlightPoints?: number;
};

function rankingTitle(label: string, cityLabel: string) {
  const city = cityLabel.split(",")[0]?.trim() || "Itaúna";
  if (!label || label === "Indisponível") return `Seu perfil está em análise de posição em ${city}`;
  return `Seu perfil está na ${label} em ${city}`;
}

export function ProfessionalListingClient({ data }: { data: ProfessionalListingViewData }) {
  const checklist = [
    "Completar perfil",
    "Manter fotos recentes",
    "Postar vídeos/stories",
    "Atualizar agenda",
    "Receber boas avaliações",
    "Manter plano ativo",
    "Comprar destaque/boost",
  ];

  return (
    <div className="professional-premium-page">
      <PremiumMetricCard
        icon="diamond"
        value={String(data.highlightPoints ?? 0)}
        label="Pontos de destaque"
        description="Os pontos de destaque combinam sinais reais do perfil, como plano ativo, boost, destaque e galeria recente."
      />

      <PremiumHeroCard
        eyebrow="Ranking e listagem"
        title={<>{rankingTitle(data.rankingLabel, data.cityLabel)}</>}
        subtitle="A ordem considera sinais reais da plataforma, como boost ativo, destaque, avaliação e atualização do perfil. Conteúdo novo e agenda organizada ajudam o perfil a parecer mais confiável para clientes."
        illustration="diamond"
      />

      <Link href="/profissional/planos" className="premium-button" style={{ width: "100%" }}>
        Melhorar posição
      </Link>

      <PremiumSection eyebrow="Minha listagem" title="Minha listagem">
        <div className="premium-grid premium-grid-2">
          {checklist.map((item) => (
            <PremiumChecklistItem key={item} label={item} />
          ))}
        </div>
      </PremiumSection>

      <PremiumSection
        eyebrow="Atualize seu conteúdo"
        title="Fotos recentes, vídeos e agenda em dia"
        description="Perfis com fotos recentes, vídeos e agenda atualizada tendem a receber mais visualizações."
      >
        <div className="premium-grid premium-grid-2">
          <PremiumActionCard href="/profissional/fotos" icon="image" title="Postar foto" description="Adicione fotos recentes à sua galeria." buttonLabel="Abrir" />
          <PremiumActionCard href="/profissional/configuracoes" icon="video" title="Postar vídeo" description="Vídeos aumentam a confiança e o engajamento." buttonLabel="Abrir" />
          <PremiumActionCard href="/profissional/stories" icon="story" title="Postar story" description="Publique conteúdo rápido e temporário." buttonLabel="Abrir" />
          <PremiumActionCard href="/profissional/agenda" icon="calendar" title="Atualizar agenda" description="Mantenha horários e disponibilidade em dia." buttonLabel="Abrir" />
        </div>
      </PremiumSection>
    </div>
  );
}
