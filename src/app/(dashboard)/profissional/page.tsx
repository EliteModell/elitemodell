import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #1e1e1e",
  borderRadius: 12,
  padding: 18,
};

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REJECTED: "Rejeitado",
};

export default async function ProfissionalDashPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const professional = await prisma.professional.findUnique({
    where: { userId: session.user.id },
    include: {
      appointments: {
        orderBy: { date: "desc" },
        take: 5,
        include: { client: { select: { name: true, email: true } } },
      },
      photos: true,
    },
  });

  if (!professional) {
    redirect("/profissional/novo");
  }

  const pendingAppointments = professional.appointments.filter((item) => item.status === "PENDING");
  const profileChecks = [
    professional.displayName,
    professional.bio,
    professional.city,
    professional.whatsapp,
    professional.image,
    professional.docFrenteUrl,
    professional.docVersoUrl,
    professional.verificationUrl || professional.kycSessionId,
  ];
  const completeness = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel profissional</h1>
          <p style={{ color: "#777", fontSize: 14 }}>
            {professional.displayName} - {statusLabel[professional.status] ?? professional.status}
          </p>
        </div>
        <Link
          href={`/profissionais/${professional.slug}`}
          style={{ padding: "10px 20px", background: "#111", border: "1px solid #333", borderRadius: 8, color: "#ccc", textDecoration: "none", fontSize: 14 }}
        >
          Ver perfil publico
        </Link>
      </div>

      <div style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#ccc", fontWeight: 700 }}>Completude do perfil</span>
          <span style={{ fontSize: 13, color: "#d4a843", fontWeight: 800 }}>{completeness}%</span>
        </div>
        <div style={{ height: 6, background: "#222", borderRadius: 3 }}>
          <div style={{ width: `${completeness}%`, height: "100%", background: "#d4a843", borderRadius: 3 }} />
        </div>
        {professional.rejectReason ? (
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12 }}>{professional.rejectReason}</p>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Status", value: statusLabel[professional.status] ?? professional.status },
          { label: "Fotos", value: String(professional.photos.length || professional.galleryUrls.length) },
          { label: "Agendamentos", value: professional.totalAppointments.toLocaleString("pt-BR") },
          { label: "Avaliacoes", value: professional.totalReviews.toLocaleString("pt-BR") },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Agendamentos pendentes</h2>
          <Link href="/profissional/agendamentos" style={{ fontSize: 13, color: "#d4a843", textDecoration: "none" }}>Ver todos</Link>
        </div>

        {pendingAppointments.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ color: "#777", fontSize: 14, margin: 0 }}>Nenhum agendamento pendente.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {pendingAppointments.map((appointment) => (
              <div key={appointment.id} style={cardStyle}>
                <strong style={{ color: "#fff" }}>{appointment.client.name ?? appointment.client.email ?? "Cliente"}</strong>
                <p style={{ color: "#777", margin: "6px 0 0" }}>
                  {new Date(appointment.date).toLocaleString("pt-BR")} - {appointment.duration} min
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { href: "/profissional/perfil", label: "Editar perfil", desc: "Atualizar bio, contato e valores" },
          { href: "/profissional/fotos", label: "Fotos", desc: "Gerenciar galeria" },
          { href: "/profissional/agenda", label: "Agenda", desc: "Disponibilidade semanal" },
          { href: "/profissional/planos", label: "Planos", desc: "Assinatura e destaque" },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{link.label}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
