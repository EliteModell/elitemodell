"use client";

import {
  PremiumActionCard,
  PremiumHeroCard,
  PremiumSection,
} from "@/components/professional-dashboard/ProfessionalPremium";

export function ProfessionalPostClient() {
  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Conteúdo profissional"
        title={<>Postar <span className="gold">conteúdo</span></>}
        subtitle="Perfis que atualizam fotos, vídeos, stories e agenda passam mais confiança e recebem mais visualizações."
        illustration="content"
      />

      <PremiumActionCard
        href="/profissional/fotos"
        icon="image"
        badge="Galeria e capa"
        title="Postar foto"
        description="Atualize capa e galeria para aumentar confiança no perfil."
        buttonLabel="Abrir"
      />
      <PremiumActionCard
        href="/profissional/configuracoes"
        icon="video"
        badge="Apresentação"
        title="Postar vídeo"
        description="Prepare um vídeo de apresentação quando o recurso estiver disponível."
        buttonLabel="Abrir"
      />
      <PremiumActionCard
        href="/profissional/stories"
        icon="story"
        badge="Conteúdo rápido"
        title="Postar story"
        description="Publique conteúdo temporário para manter o perfil ativo."
        buttonLabel="Abrir"
      />
      <PremiumActionCard
        href="/profissional/agenda"
        icon="calendar"
        badge="Disponibilidade"
        title="Atualizar agenda"
        description="Mantenha seus horários, disponibilidade e presença sempre atualizados."
        buttonLabel="Abrir"
      />

      <PremiumSection
        eyebrow="Atualize seu conteúdo"
        title="Fotos recentes, vídeos e agenda em dia"
        description="Perfis com fotos recentes, vídeos e agenda atualizada tendem a receber mais visualizações."
      />
    </div>
  );
}
