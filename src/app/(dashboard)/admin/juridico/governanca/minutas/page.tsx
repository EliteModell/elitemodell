import Link from "next/link";
import { requireAdmin } from "@/lib/admin-access";
import { INTERNAL_GOVERNANCE_MINUTES } from "@/lib/internal-governance-minutes";
import { legalContentHash } from "@/lib/legal-documents";
import {
  AdminHeader,
  AdminPanel,
  StatusPill,
  buttonStyle,
} from "../../../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const PENDING_FIELD_LABELS: Record<string, string> = {
  DATA_DE_INICIO: "Data de início",
  SUBSTITUTO: "Substituto",
  REPRESENTANTE_LEGAL: "Representante legal",
  CPF_SE_NECESSARIO: "CPF, se necessário",
  ASSINATURA: "Assinatura",
};

export default async function InternalGovernanceMinutesPage() {
  await requireAdmin("legal:manage");

  return (
    <div>
      <AdminHeader
        title="Minutas internas"
        subtitle="Documentos restritos de governança operacional. Não publicar, não exibir no site ou app e não disponibilizar a usuários."
        action={<Link href="/admin/juridico/governanca" style={buttonStyle}>Voltar à governança</Link>}
      />

      <AdminPanel>
        <StatusPill tone="warning">Rascunho interno — não publicar</StatusPill>
        <p style={muted}>
          Esta área é exclusivamente administrativa. As minutas abaixo não integram os Termos de Uso,
          não possuem fluxo de aceite e não são consumidas por páginas ou APIs públicas.
        </p>
      </AdminPanel>

      {INTERNAL_GOVERNANCE_MINUTES.map((minute) => (
        <div key={minute.key} style={{ marginTop: 16 }}>
          <AdminPanel>
            <div style={metadataGrid}>
              <div>
                <span style={label}>Documento</span>
                <strong style={value}>{minute.name}</strong>
              </div>
              <div>
                <span style={label}>Status</span>
                <strong style={value}>RASCUNHO INTERNO — NÃO PUBLICAR</strong>
              </div>
              <div>
                <span style={label}>Empresa</span>
                <strong style={value}>ELITE MODEL LTDA — CNPJ 66.807.135/0001-71</strong>
              </div>
              <div>
                <span style={label}>Versão e hash</span>
                <strong style={value}>
                  {minute.version} / <code>{legalContentHash(minute.content).slice(0, 16)}</code>
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <span style={label}>Campos pendentes autorizados</span>
              <div style={pendingList}>
                {minute.pendingFields.map((field) => (
                  <StatusPill key={field} tone="warning">
                    {PENDING_FIELD_LABELS[field] ?? field}
                  </StatusPill>
                ))}
              </div>
            </div>

            <article style={documentStyle}>
              <pre style={preStyle}>{minute.content}</pre>
            </article>
          </AdminPanel>
        </div>
      ))}
    </div>
  );
}

const muted: React.CSSProperties = {
  color: "#94a3b8",
  lineHeight: 1.6,
  fontSize: 13,
  marginBottom: 0,
};

const metadataGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
};

const label: React.CSSProperties = {
  color: "#94a3b8",
  display: "block",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1,
  marginBottom: 5,
  textTransform: "uppercase",
};

const value: React.CSSProperties = {
  color: "#fff",
  display: "block",
  fontSize: 13,
  lineHeight: 1.5,
};

const pendingList: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
};

const documentStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderRadius: 8,
  color: "#111827",
  marginTop: 20,
  padding: "clamp(18px, 4vw, 42px)",
};

const preStyle: React.CSSProperties = {
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 14,
  lineHeight: 1.72,
  margin: 0,
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};
