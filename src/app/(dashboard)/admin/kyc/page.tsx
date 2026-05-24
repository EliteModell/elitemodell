import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { MANUAL_PENDING_STATUS, PERSONA_PENDING_STATUS, personaProviderLabel } from "@/lib/persona";
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

type VerificationCheck = { name: string; status: string; reasons?: string[] };
type VerificationEntry = { status: string; checks?: VerificationCheck[] };
type KycChecksJson = {
  isSandbox?: boolean;
  inquiryId?: string;
  inquiryStatus?: string;
  verifications?: Record<string, VerificationEntry>;
  ageFromDocument?: number;
  birthdateMissing?: boolean;
  missingGovernmentId?: boolean;
  missingSelfie?: boolean;
};

function parseChecksJson(raw: unknown): KycChecksJson | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as KycChecksJson;
}

function CheckStatusIcon({ status }: { status: string }) {
  if (status === "passed") return <span style={{ color: "#22c55e" }}>✓</span>;
  if (status === "failed") return <span style={{ color: "#ef4444" }}>✗</span>;
  if (status === "not_applicable") return <span style={{ color: "#64748b" }}>–</span>;
  return <span style={{ color: "#f59e0b" }}>?</span>;
}

function KycChecksDisplay({ raw }: { raw: unknown }) {
  const checks = parseChecksJson(raw);
  if (!checks) return null;
  const { verifications, ageFromDocument, birthdateMissing, missingGovernmentId, missingSelfie } = checks;
  if (!verifications && !missingGovernmentId && !missingSelfie) return null;

  return (
    <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8" }}>
      {missingGovernmentId && <div style={{ color: "#f59e0b" }}>⚠ Documento de identidade ausente</div>}
      {missingSelfie && <div style={{ color: "#f59e0b" }}>⚠ Selfie ausente</div>}
      {verifications && Object.entries(verifications).map(([verType, ver]) => (
        <div key={verType} style={{ marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{verType}</span>{" "}
          <CheckStatusIcon status={ver.status} />{" "}
          <span>{ver.status}</span>
          {ver.checks?.filter(c => c.status !== "not_applicable").map(c => (
            <div key={c.name} style={{ paddingLeft: 10 }}>
              <CheckStatusIcon status={c.status} /> {c.name}
              {c.status === "failed" && c.reasons?.length ? (
                <span style={{ color: "#ef4444" }}> ({c.reasons.join(", ")})</span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
      {ageFromDocument !== undefined && (
        <div style={{ color: ageFromDocument < 18 ? "#ef4444" : "#22c55e" }}>
          Idade (doc): {ageFromDocument} anos
        </div>
      )}
      {birthdateMissing && <div style={{ color: "#f59e0b" }}>⚠ Data de nascimento não disponível no documento</div>}
    </div>
  );
}

function toneFor(status?: string | null) {
  if (status === "APPROVED" || status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  if (status === MANUAL_PENDING_STATUS || status === PERSONA_PENDING_STATUS || status === "PENDING" || status === "PENDING_REVIEW") return "warning" as const;
  return "neutral" as const;
}

export default async function AdminKycPage() {
  await requireAdmin("kyc:review");

  const [professionals, clients] = await Promise.all([
    prisma.professional.findMany({
      where: { OR: [{ kycStatus: { not: "APPROVED" } }, { verifStatus: { not: "APPROVED" } }] },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        displayName: true,
        kycProvider: true,
        kycSessionId: true,
        kycStatus: true,
        verifStatus: true,
        docFrenteUrl: true,
        docVersoUrl: true,
        verificationUrl: true,
        verificationType: true,
        verificationCode: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    }),
    prisma.user.findMany({
      where: { clientStatus: { in: ["PENDING_REVIEW", "UNVERIFIED", "REJECTED"] } },
      orderBy: { kycSubmittedAt: "desc" },
      take: 80,
      select: {
        id: true, name: true, email: true, phone: true,
        clientStatus: true, kycSessionId: true, kycSubmittedAt: true,
        kycRejectionReason: true, kycIsSandbox: true, kycChecksJson: true,
      },
    }),
  ]);

  return (
    <div>
      <AdminHeader title="KYC e verificacao facial/manual" subtitle="Origem da verificacao, Inquiry Persona, status retornado e revisao manual quando necessaria." />

      <AdminPanel>
        <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: 16 }}>Profissionais</h2>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Pessoa</th>
              <th style={thStyle}>Origem / Inquiry</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Arquivos</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((pro) => (
              <tr key={pro.id}>
                <td style={tdStyle}><strong>{pro.displayName}</strong><br />{pro.user.email}</td>
                <td style={tdStyle}>
                  {personaProviderLabel(pro.kycProvider, pro.kycSessionId)}<br />
                  <span style={{ color: "#94a3b8" }}>{pro.kycSessionId ?? "sem inquiry/sessao"}</span>
                </td>
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
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {personaProviderLabel(pro.kycProvider, pro.kycSessionId) === "PERSONA" ? "Use revisao manual apenas em excecao ou falha do webhook." : "Verificacao manual pendente."}
                    </span>
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
              <th style={thStyle}>Origem / Inquiry</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={tdStyle}>
                  {client.name ?? "Sem nome"}<br />
                  {client.email}<br />
                  {client.kycIsSandbox && (
                    <span style={{
                      display: "inline-block", marginTop: 4, padding: "2px 8px",
                      background: "#854d0e", color: "#fef08a", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    }}>
                      SANDBOX — DADO SIMULADO
                    </span>
                  )}
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={toneFor(client.clientStatus)}>{client.clientStatus}</StatusPill>
                  {client.kycRejectionReason && (
                    <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{client.kycRejectionReason}</div>
                  )}
                </td>
                <td style={tdStyle}>
                  {personaProviderLabel(null, client.kycSessionId)}<br />
                  <span style={{ color: "#94a3b8" }}>{client.kycSessionId ?? "sem inquiry/sessao"}</span><br />
                  {client.kycSubmittedAt?.toLocaleString("pt-BR") ?? "-"}
                  <KycChecksDisplay raw={client.kycChecksJson} />
                </td>
                <td style={tdStyle}>
                  <form action={reviewClientKyc} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={client.id} />
                    <input name="reason" placeholder="Motivo/observacao" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    {client.kycIsSandbox && (
                      <span style={{ color: "#fef08a", fontSize: 11, fontWeight: 600, background: "#78350f", padding: "4px 8px", borderRadius: 6 }}>
                        ATENCAO: Este e um dado SANDBOX (simulado). Aprovacao manual nao valida identidade real.
                      </span>
                    )}
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {personaProviderLabel(null, client.kycSessionId) === "PERSONA" ? "Use revisao manual apenas em excecao ou falha do webhook." : "Verificacao manual pendente."}
                    </span>
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
