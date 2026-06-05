"use client";

import Link from "next/link";
import { CalendarDays, Check, CirclePlay, ImagePlus, Sparkles, Star, Trophy, Video } from "lucide-react";
import {
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
    { label: "Completar perfil", description: "Dados, descrição, contatos e fotos principais.", icon: Check, done: data.tips.find((item) => item.label === "Completar perfil")?.done ?? false },
    { label: "Manter fotos recentes", description: "Galeria atualizada aumenta confiança.", icon: ImagePlus, done: data.tips.find((item) => item.label === "Adicionar fotos recentes")?.done ?? false },
    { label: "Postar vídeos/stories", description: "Conteúdo novo deixa o perfil mais ativo.", icon: CirclePlay, done: false },
    { label: "Atualizar agenda", description: "Disponibilidade clara reduz atrito.", icon: CalendarDays, done: data.tips.find((item) => item.label === "Manter agenda ativa")?.done ?? false },
    { label: "Receber boas avaliações", description: "Reputação ajuda clientes a decidirem.", icon: Star, done: Number(data.ratingLabel.replace(",", ".")) >= 4.5 },
    { label: "Manter plano ativo", description: "Plano ativo melhora presença comercial.", icon: Trophy, done: data.planLabel !== "Básico" },
    { label: "Comprar destaque/boost", description: "Impulsos ajudam em horários estratégicos.", icon: Sparkles, done: data.isHighlighted },
  ];
  const contentActions = [
    { href: "/profissional/fotos", icon: ImagePlus, title: "Postar foto", description: "Adicione fotos recentes à sua galeria." },
    { href: "/profissional/postar", icon: Video, title: "Postar vídeo", description: "Publique um vídeo curto de apresentação." },
    { href: "/profissional/stories", icon: CirclePlay, title: "Postar story", description: "Atualize clientes com conteúdo temporário." },
    { href: "/profissional/agenda", icon: CalendarDays, title: "Atualizar agenda", description: "Mantenha horários e disponibilidade em dia." },
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
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="premium-check-card" style={{ alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", flex: "0 0 auto", border: "1px solid rgba(214,168,58,0.28)", background: "rgba(214,168,58,0.10)" }}>
                  <Icon size={17} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", color: "#fff", fontSize: 15, fontWeight: 900 }}>{item.label}</span>
                  <span style={{ display: "block", marginTop: 4, color: "var(--elite-text-muted)", fontSize: 12, lineHeight: 1.45 }}>{item.description}</span>
                </span>
                <span className={item.done ? "premium-status-badge active" : "premium-status-badge recommended"} style={{ marginLeft: "auto" }}>
                  {item.done ? "OK" : "Ajustar"}
                </span>
              </div>
            );
          })}
        </div>
      </PremiumSection>

      <PremiumSection
        eyebrow="Atualize seu conteúdo"
        title="Fotos recentes, vídeos e agenda em dia"
        description="Perfis com fotos recentes, vídeos e agenda atualizada tendem a receber mais visualizações."
      >
        <div className="premium-grid premium-grid-2">
          {contentActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="premium-upload-zone" style={{ minHeight: 190, display: "grid", placeItems: "center", textDecoration: "none", color: "inherit" }}>
                <span className="premium-icon-orb">
                  <Icon />
                </span>
                <span style={{ display: "block", marginTop: 12, color: "#fff", fontSize: 18, fontWeight: 950 }}>{action.title}</span>
                <span style={{ display: "block", maxWidth: 260, margin: "8px auto 0", color: "var(--elite-text-muted)", fontSize: 13, lineHeight: 1.5 }}>{action.description}</span>
              </Link>
            );
          })}
        </div>
      </PremiumSection>
    </div>
  );
}
