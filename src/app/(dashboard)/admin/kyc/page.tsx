import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function reviewProfessionalKyc(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("kyc:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["approve", "reject"].includes(action)) return;
  if (action === "reject" && reason.trim().length < 4) return;

  await prisma.professional.update({
    where: { id },
    data: {
      kycStatus: action === "approve" ? "APPROVED" : "REJECTED",
      verifStatus: action === "approve" ? "APPROVED" : "REJECTED",
      rejectReason: action === "reject" ? reason : null,
    },
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "PROFESSIONAL_APPROVED" : "PROFESSIONAL_REJECTED",
    targetType: "PROFESSIONAL",
    targetId: id,
    reason: reason || "Revisao manual de KYC",
  });

  revalidatePath("/admin/kyc");
}

async function reviewClientKyc(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("kyc:review");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["approve", "reject"].includes(action)) return;
  if (action === "reject" && reason.trim().length < 4) return;

  await prisma.user.update({
    where: { id },
    data: {
      clientStatus: action === "approve" ? "VERIFIED" : "REJECTED",
      kycReviewedAt: new Date(),
      kycRejectionReason: action === "reject" ? reason : null,
    },
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "approve" ? "USER_VERIFIED" : "USER_BLOCKED",
    targetType: "USER",
    targetId: id,
    reason: reason || "Revisao manual de KYC",
  });

  revalidatePath("/admin/kyc");
}

function toneFor(status?: string | null) {
  if (status === "APPROVED" || status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === "KYC_MANUAL_PENDENTE" || status === "PENDING" || status === "PENDING_REVIEW") return "warning" as const;
  return "neutral" as const;
}

export default async function AdminKycPage() {
  await requireAdmin("kyc:review");

  const [professionals, clients] = await Promise.all([
    prisma.professional.findMany({
      where: { OR: [{ kycStatus: { not: "APPROVED" } }, { verifStatus: { not: "APPROVED" } }] },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.user.findMany({
      where: { clientStatus: { in: ["PENDING_REVIEW", "UNVERIFIED", "REJECTED"] } },
      orderBy: { kycSubmittedAt: "desc" },
      take: 80,
      select: { id: true, name: true, email: true, phone: true, clientStatus: true, kycSessionId: true, kycSubmittedAt: true, kycRejectionReason: true },
    }),
  ]);

  return (
    <div>
      <AdminHeader title="KYC e verificacao facial/manual" subtitle="Analise Persona, selfie, video, documentos e codigo unico. Toda acao manual registra auditoria." />

      <AdminPanel>
        <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Profissionais</h2>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Pessoa</th>
              <th style={thStyle}>Provider</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Arquivos</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((pro) => (
              <tr key={pro.id}>
                <td style={tdStyle}><strong>{pro.displayName}</strong><br />{pro.user.email}</td>
                <td style={tdStyle}>{pro.kycProvider ?? "MANUAL"}<br /><span style={{ color: "#94a3b8" }}>{pro.kycSessionId ?? "sem sessao"}</span></td>
                <td style={tdStyle}><StatusPill tone={toneFor(pro.kycStatus)}>{pro.kycStatus}</StatusPill></td>
                <td style={tdStyle}>
                  Doc: {pro.docFrenteUrl ? "frente" : "-"} / {pro.docVersoUrl ? "verso" : "-"}<br />
                  Verificacao: {pro.verificationUrl ? pro.verificationType ?? "arquivo" : "nao enviada"}<br />
                  Codigo: {pro.verificationCode ?? "-"}
                </td>
                <td style={tdStyle}>
                  <form action={reviewProfessionalKyc} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={pro.id} />
                    <input name="reason" placeholder="Motivo/observacao" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                      <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444", borderColor: "#ef444455", background: "#ef444416" }}>Reprovar</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!professionals.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma verificacao profissional pendente.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <div style={{ height: 16 }} />

      <AdminPanel>
        <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Clientes</h2>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Sessao</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={tdStyle}>{client.name ?? "Sem nome"}<br />{client.email}</td>
                <td style={tdStyle}><StatusPill tone={toneFor(client.clientStatus)}>{client.clientStatus}</StatusPill></td>
                <td style={tdStyle}>{client.kycSessionId ?? "-"}<br />{client.kycSubmittedAt?.toLocaleString("pt-BR") ?? "-"}</td>
                <td style={tdStyle}>
                  <form action={reviewClientKyc} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={client.id} />
                    <input name="reason" placeholder="Motivo/observacao" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button name="action" value="approve" style={buttonStyle}>Aprovar</button>
                      <button name="action" value="reject" style={{ ...buttonStyle, color: "#ef4444", borderColor: "#ef444455", background: "#ef444416" }}>Reprovar</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!clients.length ? <tr><td style={tdStyle} colSpan={4}>Nenhum cliente pendente.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
