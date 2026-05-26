import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, StatusPill } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const { adminRole } = await requireAdmin("dashboard:view");
  const envStatus = [
    ["KYC_PROVIDER", process.env.KYC_PROVIDER],
    ["PERSONA_API_KEY", process.env.PERSONA_API_KEY ? "configurada" : ""],
    ["PERSONA_TEMPLATE_ID", process.env.PERSONA_TEMPLATE_ID || process.env.PERSONA_INQUIRY_TEMPLATE_ID],
    ["PERSONA_WEBHOOK_SECRET", process.env.PERSONA_WEBHOOK_SECRET ? "configurado" : ""],
    ["ADMIN_MASTER_EMAILS", process.env.ADMIN_MASTER_EMAILS],
  ];

  return (
    <div>
      <AdminHeader title="Configurações" subtitle="Resumo seguro das configurações críticas. Valores secretos nunca são exibidos." />
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
    </div>
  );
}
