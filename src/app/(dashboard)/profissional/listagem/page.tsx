import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import { ProfessionalListingClient, type ProfessionalListingViewData } from "@/components/professional-dashboard/ProfessionalListingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function formatDate(date: Date | null | undefined) {
  if (!date) return "Sem vencimento";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo na listagem";
  if (status === "PAUSED") return "Perfil pausado";
  if (status === "PENDING_REVIEW") return "Em analise";
  if (status === "SUSPENDED") return "Suspenso";
  if (status === "REJECTED") return "Reprovado";
  return "Oculto";
}

function categoryLabel(value: string | null | undefined) {
  if (!value) return "Categoria nao informada";
  const normalized = value.toLowerCase();
  if (normalized === "mulher") return "Mulher";
  if (normalized === "homem") return "Homem";
  if (normalized === "trans") return "Trans";
  return value;
}

export default async function ProfessionalListingPage() {
  const access = await requireCompanionPanel();
  const now = new Date();

  const professional = await prisma.professional.findUnique({
    where: { userId: access.user.id },
    include: {
      user: { select: { premiumUntil: true } },
      photos: { orderBy: { order: "asc" } },
      schedule: true,
    },
  });

  if (!professional) {
    redirect(ACCOUNT_ROUTES.onboardingAcompanhante);
  }

  const cityRanking = professional.city
    ? await prisma.professional.findMany({
        where: { city: professional.city, status: "ACTIVE" },
        select: { id: true },
        orderBy: [{ boostActive: "desc" }, { featured: "desc" }, { rating: "desc" }, { totalReviews: "desc" }, { createdAt: "asc" }],
      })
    : [];

  const rankingIndex = cityRanking.findIndex((item) => item.id === professional.id);
  const rankingPosition = rankingIndex >= 0 ? rankingIndex + 1 : null;
  const hasActivePlan = Boolean(professional.user.premiumUntil && professional.user.premiumUntil > now);
  const isBoostActive = Boolean(professional.boostActive && (!professional.boostUntil || professional.boostUntil > now));
  const allPhotosCount = professional.photos.length || professional.galleryUrls.length + (professional.image ? 1 : 0);
  const cityLabel = professional.city && professional.state ? `${professional.city}, ${professional.state}` : "Cidade nao informada";
  const planLabel = hasActivePlan ? "Premium Elite" : "Basico";
  const services = (professional.services.length ? professional.services : ["Companhia", "Eventos sociais"]).slice(0, 2);

  const data: ProfessionalListingViewData = {
    displayName: professional.displayName,
    cityLabel,
    categoryLabel: categoryLabel(professional.escortCategory ?? access.user.category),
    planLabel,
    planStatus: hasActivePlan ? `${planLabel} ate ${formatDate(professional.user.premiumUntil)}` : "Modo basico",
    listingStatus: statusLabel(professional.status),
    rankingLabel: rankingPosition ? `${rankingPosition}a posicao` : "Indisponivel",
    publicProfileHref: `/profissionais/${professional.slug}`,
    image: professional.image,
    services,
    ratingLabel: professional.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
    priceLabel: `R$ ${Math.round(professional.priceMin ?? professional.pricePerHour ?? 100)}`,
    isHighlighted: professional.featured || isBoostActive,
    tips: [
      { label: "Adicionar fotos recentes", done: allPhotosCount >= 3 },
      { label: "Manter agenda ativa", done: professional.schedule.length > 0 || professional.diasDisponiveis.length > 0 },
      { label: "Completar valores e contatos", done: Boolean((professional.priceMin || professional.pricePerHour) && (professional.phone || professional.whatsapp)) },
      { label: "Ativar plano ou destaque", done: hasActivePlan || professional.featured || isBoostActive },
    ],
  };

  return <ProfessionalListingClient data={data} />;
}
