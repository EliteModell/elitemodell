import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { personaProviderLabel } from "@/lib/persona";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Cadastro incompleto",
  PENDING_REVIEW: "Pendente aprovacao",
  ACTIVE: "Aprovada",
  SUSPENDED: "Suspensa",
  REJECTED: "Reprovada",
};

async function reviewProfessional(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("professionals:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["approve", "reject", "correction", "suspend", "block"].includes(action)) return;
  if (["reject", "correction", "suspend", "block"].includes(action) && reason.trim().length < 4) return;

  const data =
    action === "approve"
      ? { status: "ACTIVE" as const, verified: true, docStatus: "APPROVED", verifStatus: "APPROVED", kycStatus: "APPROVED", rejectReason: null }
      : action === "suspend"
        ? { status: "SUSPENDED" as const, verified: false, rejectReason: reason }
        : { status: "REJECTED" as const, verified: false, docStatus: "REJECTED", verifStatus: "REJECTED", kycStatus: "REJECTED", rejectReason: reason };

  const professional = await prisma.professional.update({ where: { id }, data, select: { id: true, userId: true } });
  if (action === "block") {
    await prisma.user.update({ where: { id: professional.userId }, data: { blocked: true, blockReason: reason, blockedAt: new Date() } });
  }

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROFESSIONAL_APPROVED" : "PROFESSIONAL_REJECTED",
    targetType: "PROFESSIONAL",
    targetId: id,
    reason: reason || `professional:${action}`,
  });
  revalidatePath("/admin/profissionais");
}

export default async function AdminProfissionaisPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  await requireAdmin("professionals:review");
  const params = await searchParams;
  const status = params?.status;
  const where = status && status !== "ALL" ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "REJECTED" } : {};

  const professionals = await prisma.professional.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true, phone: true, blocked: true } },
      photos: { take: 3, orderBy: { order: "asc" } },
      specialties: true,
    },
  });

  return (
    <div>
      <AdminHeader title="Acompanhantes e profissionais" subtitle="Analise cadastro, documentos, selfie/video, KYC, fotos publicas, descricao, servicos, cidade e historico de moderacao." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["ALL", "DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SUSPENDED"].map((item) => (
          <Link key={item} href={item === "ALL" ? "/admin/profissionais" : `/admin/profissionais?status=${item}`} style={{ ...buttonStyle, textDecoration: "none", background: item === (status ?? "ALL") ? "rgba(212,168,67,.22)" : "rgba(255,255,255,.03)" }}>
            {item === "ALL" ? "Todos" : statusLabel[item] ?? item}
          </Link>
        ))}
      </div>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Profissional</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>KYC e arquivos</th>
              <th style={thStyle}>Perfil</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((pro) => (
              <tr key={pro.id}>
                <td style={tdStyle}>
                  <Link href={`/profissionais/${pro.slug}`} style={{ color: "#fff", fontWeight: 900 }}>{pro.displayName}</Link><br />
                  {pro.city}, {pro.state} - {pro.escortCategory ?? "sem categoria"}<br />
                  <span style={{ color: "#94a3b8" }}>{pro.user.email} / {pro.whatsapp ?? pro.user.phone ?? "-"}</span>
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={pro.status === "ACTIVE" ? "success" : pro.status === "REJECTED" || pro.status === "SUSPENDED" ? "danger" : "warning"}>{statusLabel[pro.status] ?? pro.status}</StatusPill>
                  {pro.rejectReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{pro.rejectReason}</p> : null}
                </td>
                <td style={tdStyle}>
                  KYC: {personaProviderLabel(pro.kycProvider, pro.kycSessionId)} / {pro.kycStatus}<br />
                  Inquiry: {pro.kycSessionId ?? "-"}<br />
                  Doc: {pro.docStatus} | Face: {pro.verifStatus}<br />
                  Codigo: {pro.verificationCode ?? "-"}<br />
                  Verificacao: {pro.verificationUrl ? pro.verificationType ?? "arquivo" : "nao enviada"}
                </td>
                <td style={tdStyle}>
                  {pro.photos.length} midia(s), {pro.specialties.length} servico(s)<br />
                  Bio: {pro.bio.length} caracteres<br />
                  Enviado em {pro.createdAt.toLocaleDateString("pt-BR")}
                </td>
                <td style={tdStyle}>
                  <form action={reviewProfessional} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={pro.id} />
                    <textarea name="reason" placeholder="Motivo obrigatorio para reprovar/corrigir/suspender" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8, minHeight: 58 }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                      <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444" }}>Reprovar</button>
                      <button name="action" value="correction" style={{ ...buttonStyle, color: "#f97316" }}>Solicitar correcao</button>
                      <button name="action" value="suspend" style={{ ...buttonStyle, color: "#f97316" }}>Suspender</button>
                      <button name="action" value="block" style={{ ...buttonStyle, color: "#ef4444" }}>Bloquear</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!professionals.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma profissional encontrada.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
