import { revalidatePath } from "next/cache";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getProfessionalFreeTrialDays } from "@/lib/professional-access";
import { AdminHeader, AdminPanel, StatusPill, buttonStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function updateProfessionalFreeTrial(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const days = Number(formData.get("presetDays") ?? formData.get("professionalFreeTrialDays"));
  if (!Number.isInteger(days) || days < 1 || days > 3650) return;

  const previousDays = await getProfessionalFreeTrialDays();
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: { id: "default", professionalFreeTrialDays: days },
    update: { professionalFreeTrialDays: days },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "professional-free-trial-days",
    changes: { previousDays, days },
    reason: "Prazo gratuito das novas profissionais atualizado.",
  });
  revalidatePath("/admin/configuracoes");
}

async function updateUploadSecurity(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("settings:manage");
  const uploadAvProvider = String(formData.get("uploadAvProvider") || "").toUpperCase();
  const uploadModerationProvider = String(formData.get("uploadModerationProvider") || "").toUpperCase();
  const uploadSecurityEnabled = formData.get("uploadSecurityEnabled") === "on";
  if (!["CLAMAV", "HTTP", "MANUAL"].includes(uploadAvProvider)) return;
  if (!["HTTP", "MANUAL"].includes(uploadModerationProvider)) return;

  const previous = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: {
      uploadSecurityEnabled: true,
      uploadAvProvider: true,
      uploadModerationProvider: true,
    },
  });
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      uploadSecurityEnabled,
      uploadAvProvider,
      uploadModerationProvider,
    },
    update: {
      uploadSecurityEnabled,
      uploadAvProvider,
      uploadModerationProvider,
    },
  });
  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "upload-security-providers",
    changes: {
      previous,
      uploadSecurityEnabled,
      uploadAvProvider,
      uploadModerationProvider,
    },
    reason: "Fornecedores do fluxo de quarentena atualizados.",
  });
  revalidatePath("/admin/configuracoes");
}

export default async function AdminConfiguracoesPage() {
  const { adminRole } = await requireAdmin("settings:manage");
  const professionalFreeTrialDays = await getProfessionalFreeTrialDays();
  const uploadSettings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
    select: {
      uploadSecurityEnabled: true,
      uploadAvProvider: true,
      uploadModerationProvider: true,
    },
  });
  const envStatus = [
    ["KYC_PROVIDER", process.env.KYC_PROVIDER],
    ["PERSONA_API_KEY", process.env.PERSONA_API_KEY ? "configurada" : ""],
    ["PERSONA_TEMPLATE_ID", process.env.PERSONA_TEMPLATE_ID || process.env.PERSONA_INQUIRY_TEMPLATE_ID],
    ["PERSONA_WEBHOOK_SECRET", process.env.PERSONA_WEBHOOK_SECRET ? "configurado" : ""],
    ["UPLOAD_QUARANTINE_BUCKET", process.env.UPLOAD_QUARANTINE_BUCKET || "upload-quarantine"],
    ["APPROVED_MEDIA_BUCKET", process.env.APPROVED_MEDIA_BUCKET || "approved-media"],
    ["CLAMAV_HOST", process.env.CLAMAV_HOST ? "configurado" : ""],
    ["AV_HTTP_ENDPOINT", process.env.AV_HTTP_ENDPOINT ? "configurado" : ""],
    ["CONTENT_MODERATION_ENDPOINT", process.env.CONTENT_MODERATION_ENDPOINT ? "configurado" : ""],
    ["CONTENT_MODERATION_TOKEN", process.env.CONTENT_MODERATION_TOKEN ? "configurado" : ""],
  ];

  return (
    <div>
      <AdminHeader
        title="Configurações"
        subtitle="Resumo seguro das configurações críticas. Valores secretos nunca são exibidos."
        action={<Link href="/admin/juridico/governanca" style={buttonStyle}>Governança operacional</Link>}
      />
      <AdminPanel>
        <h2 style={{ color: "#fff", margin: "0 0 14px", fontSize: 16 }}>Ambiente operacional</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ color: "#94a3b8" }}>Cargo desta sessao: <strong style={{ color: "#fff" }}>{adminRole}</strong></div>
          {envStatus.map(([name, value]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 10 }}>
              <span style={{ color: "#fff", fontWeight: 800 }}>{name}</span>
              <StatusPill tone={value ? "success" : "warning"}>{value ? "OK" : "PENDENTE"}</StatusPill>
            </div>
          ))}
        </div>
      </AdminPanel>
      <div style={{ height: 16 }} />
      <AdminPanel>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 16 }}>Quarentena, antimalware e moderação</h2>
        <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 13 }}>
          Arquivos sem decisão explícita permanecem privados. Selecionar revisão manual ou desativar a automação nunca libera mídia automaticamente.
        </p>
        <form action={updateUploadSecurity} style={{ display: "grid", gap: 14, maxWidth: 620 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontWeight: 800 }}>
            <input
              type="checkbox"
              name="uploadSecurityEnabled"
              defaultChecked={uploadSettings?.uploadSecurityEnabled ?? true}
            />
            Executar fornecedores automáticos configurados
          </label>
          <label style={{ display: "grid", gap: 7, color: "#fff", fontWeight: 800, fontSize: 13 }}>
            Antimalware
            <select name="uploadAvProvider" defaultValue={uploadSettings?.uploadAvProvider ?? "CLAMAV"} style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 11 }}>
              <option value="CLAMAV">ClamAV privado</option>
              <option value="HTTP">Fornecedor HTTP</option>
              <option value="MANUAL">Revisão manual, sem liberação automática</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 7, color: "#fff", fontWeight: 800, fontSize: 13 }}>
            Moderação de conteúdo
            <select name="uploadModerationProvider" defaultValue={uploadSettings?.uploadModerationProvider ?? "MANUAL"} style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 11 }}>
              <option value="HTTP">Fornecedor HTTP configurado</option>
              <option value="MANUAL">Revisão humana</option>
            </select>
          </label>
          <button type="submit" style={{ justifySelf: "start", border: 0, borderRadius: 8, background: "#d4a843", color: "#080704", padding: "10px 16px", fontWeight: 950, cursor: "pointer" }}>
            Salvar segurança de uploads
          </button>
        </form>
      </AdminPanel>
      <div style={{ height: 16 }} />
      <AdminPanel>
        <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 16 }}>Acesso gratuito das profissionais</h2>
        <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 13 }}>
          O prazo começa somente na primeira aprovação do perfil. Contas já cadastradas permanecem com acesso legado.
          Alterar este valor afeta apenas profissionais aprovadas depois da mudança.
        </p>
        <form action={updateProfessionalFreeTrial} style={{ display: "grid", gap: 14, maxWidth: 520 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                type="submit"
                name="presetDays"
                value={days}
                style={{
                  border: "1px solid rgba(212,168,67,.24)",
                  borderRadius: 8,
                  background: professionalFreeTrialDays === days ? "rgba(212,168,67,.22)" : "rgba(255,255,255,.03)",
                  color: "#f5d78c",
                  padding: "10px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {days} dias
              </button>
            ))}
          </div>
          <label style={{ display: "grid", gap: 7, color: "#fff", fontWeight: 800, fontSize: 13 }}>
            Valor personalizado
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                name="professionalFreeTrialDays"
                min={1}
                max={3650}
                defaultValue={professionalFreeTrialDays}
                required
                style={{ minWidth: 0, flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: "11px 12px" }}
              />
              <button type="submit" style={{ border: 0, borderRadius: 8, background: "#d4a843", color: "#080704", padding: "10px 16px", fontWeight: 950, cursor: "pointer" }}>
                Salvar
              </button>
            </div>
          </label>
          <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 800 }}>
            Configuração atual: {professionalFreeTrialDays} dias gratuitos
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}
