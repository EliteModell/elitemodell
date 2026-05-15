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
  padding: "20px",
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeProperties,
    pendingProperties,
    activeProfessionals,
    pendingProfessionals,
    pendingReports,
    bookingsThisMonth,
    paidThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.professional.count({ where: { status: "ACTIVE" } }),
    prisma.professional.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);

  const stats = [
    { label: "Usuarios totais", value: totalUsers.toLocaleString("pt-BR") },
    { label: "Imoveis ativos", value: activeProperties.toLocaleString("pt-BR") },
    { label: "Profissionais ativos", value: activeProfessionals.toLocaleString("pt-BR") },
    { label: "Reservas no mes", value: bookingsThisMonth.toLocaleString("pt-BR") },
  ];

  const alerts = [
    { label: "Imoveis pendentes", value: pendingProperties, href: "/admin/imoveis" },
    { label: "Profissionais pendentes", value: pendingProfessionals, href: "/admin/profissionais" },
    { label: "Denuncias pendentes", value: pendingReports, href: "/admin/reservas" },
  ];

  const revenue = paidThisMonth._sum.amount ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Painel Administrativo</h1>
        <p style={{ color: "#777", fontSize: 14 }}>Visao operacional baseada em dados reais do banco.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{stat.label}</div>
          </div>
        ))}
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            R$ {revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: "#777" }}>Receita paga no mes</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        {alerts.map((alert) => (
          <Link key={alert.label} href={alert.href} style={{ ...cardStyle, textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: alert.value > 0 ? "#d4a843" : "#777", marginBottom: 4 }}>
              {alert.value.toLocaleString("pt-BR")}
            </div>
            <div style={{ fontSize: 13, color: "#ccc" }}>{alert.label}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          { href: "/admin/usuarios", label: "Usuarios", desc: "Auditar contas e permissoes" },
          { href: "/admin/imoveis", label: "Imoveis", desc: "Revisar anuncios pendentes" },
          { href: "/admin/profissionais", label: "Profissionais", desc: "Validar documentos e perfis" },
          { href: "/admin/cupons", label: "Cupons", desc: "Consultar cupons cadastrados" },
        ].map((link) => (
          <Link key={link.href} href={link.href} style={{ ...cardStyle, textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{link.label}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
