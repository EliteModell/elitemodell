import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default async function ProfissionalEstatisticasPage() {
  const access = await requireCompanionPanel();
  const professional = await prisma.professional.findUnique({
    where: { userId: access.user.id },
    select: {
      id: true,
      displayName: true,
      profileViews: true,
      contactClicks: true,
      rating: true,
      totalReviews: true,
      favorites: { select: { id: true } },
    },
  });

  if (!professional) {
    return <div className="premium-empty-state" style={{ padding: 28 }}>Perfil profissional não encontrado.</div>;
  }

  const referenceDate = new Date();
  const since = new Date(referenceDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.professionalProfileEvent.findMany({
    where: { professionalId: professional.id, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const last30 = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = startOfDay(new Date(referenceDate.getTime() - (13 - index) * 24 * 60 * 60 * 1000));
    const key = date.toISOString().slice(0, 10);
    const views = events.filter((event) => event.eventType === "profile_view" && startOfDay(event.createdAt).toISOString().slice(0, 10) === key).length;
    const contacts = events.filter((event) => event.eventType === "contact_click" && startOfDay(event.createdAt).toISOString().slice(0, 10) === key).length;
    return { key, label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), views, contacts };
  });
  const max = Math.max(1, ...days.map((day) => Math.max(day.views, day.contacts)));

  const card = { background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: 20 } as const;

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Estatísticas do perfil</h1>
        <p style={{ color: "#777", fontSize: 14 }}>Acompanhe visualizações, cliques de contato, favoritos e desempenho recente.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 22 }}>
        {[
          ["Visualizações", professional.profileViews],
          ["Cliques em contato", professional.contactClicks],
          ["Favoritos", professional.favorites.length],
          ["Avaliações", professional.totalReviews],
          ["Nota média", professional.rating.toFixed(1)],
        ].map(([label, value]) => (
          <div key={label} style={card}>
            <p style={{ margin: "0 0 8px", color: "#777", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>{label}</p>
            <strong style={{ color: "#d4a843", fontSize: 26 }}>{value}</strong>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h2 style={{ color: "#fff", fontSize: 17, margin: 0 }}>Últimos 30 dias</h2>
            <p style={{ color: "#777", fontSize: 13, margin: "4px 0 0" }}>
              {last30.profile_view ?? 0} visualizações, {last30.contact_click ?? 0} contatos e {last30.favorite ?? 0} favoritos.
            </p>
          </div>
          <span style={{ color: "#f5d78c", fontSize: 12, border: "1px solid rgba(212,168,67,.25)", borderRadius: 999, padding: "8px 12px", alignSelf: "flex-start" }}>
            Dados reais do perfil público
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))`, gap: 8, alignItems: "end", minHeight: 180 }}>
          {days.map((day) => (
            <div key={day.key} style={{ display: "grid", gap: 5, alignItems: "end" }}>
              <div title={`${day.views} visualizações`} style={{ height: Math.max(6, (day.views / max) * 120), background: "linear-gradient(180deg,#f5d78c,#d4a843)", borderRadius: 6 }} />
              <div title={`${day.contacts} contatos`} style={{ height: Math.max(4, (day.contacts / max) * 80), background: "rgba(255,255,255,.18)", borderRadius: 6 }} />
              <span style={{ color: "#666", fontSize: 10, textAlign: "center" }}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
