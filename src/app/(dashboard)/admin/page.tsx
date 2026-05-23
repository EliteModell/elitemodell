import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, StatCard, StatusPill, adminColors, tdStyle, thStyle, AdminTable } from "./_components/AdminPrimitives";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { adminRole } = await requireAdmin("dashboard:view");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeUsers,
    pendingProperties,
    activeProperties,
    pendingProfessionals,
    activeProfessionals,
    rejectedProfessionals,
    manualKyc,
    pendingReports,
    paidThisMonth,
    recentAudits,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { blocked: false } }),
    prisma.property.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.professional.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.professional.count({ where: { status: "ACTIVE" } }),
    prisma.professional.count({ where: { status: "REJECTED" } }),
    prisma.professional.count({ where: { kycStatus: { in: ["KYC_MANUAL_PENDENTE", "MANUAL_REVIEW"] } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 8,
      include: { admin: { select: { name: true, email: true } } },
    }),
  ]);

  const revenue = paidThisMonth._sum.amount ?? 0;

  return (
    <div>
      <AdminHeader
        title="Painel administrativo"
        subtitle={`Operacao central da Elite Model. Cargo atual: ${adminRole}. Acesso protegido por servidor e proxy para usuarios ADMIN.`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard label="Cadastros pendentes" value={pendingProfessionals + pendingProperties + manualKyc} tone="warning" />
        <StatCard label="Profissionais pendentes" value={pendingProfessionals} href="/admin/profissionais" tone="warning" />
        <StatCard label="Anfitrioes pendentes" value={pendingProperties} href="/admin/anfitrioes" tone="warning" />
        <StatCard label="Imoveis pendentes" value={pendingProperties} href="/admin/imoveis" tone="warning" />
        <StatCard label="KYC manual pendente" value={manualKyc} href="/admin/kyc" tone="warning" />
        <StatCard label="Denuncias abertas" value={pendingReports} href="/admin/denuncias" tone={pendingReports ? "danger" : "neutral"} />
        <StatCard label="Usuarios ativos" value={activeUsers} href="/admin/clientes" />
        <StatCard label="Perfis aprovados" value={activeProfessionals + activeProperties} tone="success" />
        <StatCard label="Perfis reprovados" value={rejectedProfessionals} tone="danger" />
        <StatCard label="Receita estimada no mes" value={`R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} href="/admin/financeiro" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(300px, 0.75fr)", gap: 16 }}>
        <AdminPanel>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ color: "#fff", fontSize: 16, margin: 0 }}>Centros de trabalho</h2>
            <StatusPill tone={pendingReports || manualKyc ? "warning" : "success"}>{pendingReports || manualKyc ? "Atencao" : "Estavel"}</StatusPill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              ["Profissionais", "/admin/profissionais", "Documentos, selfie, videos e perfil publico"],
              ["Anfitrioes", "/admin/anfitrioes", "Solicitacoes de anfitriao e imoveis vinculados"],
              ["Imoveis", "/admin/imoveis", "Quartos, apartamentos, fotos, regras e precos"],
              ["KYC", "/admin/kyc", "Persona, manual, documentos e aprovacao sensivel"],
              ["Denuncias", "/admin/denuncias", "Moderacao de risco e conteudo"],
              ["Auditoria", "/admin/auditoria", "Trilha das acoes administrativas"],
            ].map(([label, href, desc]) => (
              <Link key={href} href={href} style={{ textDecoration: "none", border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 14, background: "rgba(255,255,255,0.025)" }}>
                <strong style={{ color: "#fff", display: "block", marginBottom: 6 }}>{label}</strong>
                <span style={{ color: adminColors.muted, fontSize: 12, lineHeight: 1.5 }}>{desc}</span>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 style={{ color: "#fff", fontSize: 16, margin: "0 0 14px" }}>Alertas criticos</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <StatusPill tone={manualKyc ? "warning" : "success"}>{manualKyc} KYC manual pendente</StatusPill>
            <StatusPill tone={pendingReports ? "danger" : "success"}>{pendingReports} denuncias abertas</StatusPill>
            <StatusPill tone={pendingProperties ? "warning" : "success"}>{pendingProperties} imoveis aguardando</StatusPill>
          </div>
        </AdminPanel>
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminPanel>
          <h2 style={{ color: "#fff", fontSize: 16, margin: "0 0 14px" }}>Ultimas acoes administrativas</h2>
          <AdminTable>
            <thead>
              <tr>
                <th style={thStyle}>Acao</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>Entidade</th>
                <th style={thStyle}>Quando</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.length ? recentAudits.map((audit) => (
                <tr key={audit.id}>
                  <td style={tdStyle}>{audit.action}</td>
                  <td style={tdStyle}>{audit.admin.name ?? audit.admin.email ?? "Admin"}</td>
                  <td style={tdStyle}>{audit.targetType} / {audit.targetId}</td>
                  <td style={tdStyle}>{audit.timestamp.toLocaleString("pt-BR")}</td>
                </tr>
              )) : (
                <tr><td style={tdStyle} colSpan={4}>Ainda nao ha acoes registradas.</td></tr>
              )}
            </tbody>
          </AdminTable>
        </AdminPanel>
      </div>
    </div>
  );
}
