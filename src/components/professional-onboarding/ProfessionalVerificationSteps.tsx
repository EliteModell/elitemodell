"use client";

import type { ReactNode } from "react";

const GOLD = "#b72cff";
const GOLD_DIM = "rgba(183, 44, 255,0.10)";
const GOLD_MID = "rgba(183, 44, 255,0.28)";

type Props = {
  mode: "verification" | "summary";
  displayName: string;
  escortCategory: string;
  city: string;
  state: string;
  galleryCount: number;
  mainPhotoUrl: string;
  whatsapp: string;
  diditApproved: boolean;
  diditPending: boolean;
  diditRejected: boolean;
  diditRetryAllowed: boolean;
  diditAvailable: boolean;
  diditMessage: string | null;
  verificationUrl: string;
  startingVerification: boolean;
  onStartVerification: () => void;
};

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: desc ? 6 : 14, paddingBottom: 10, borderBottom: `1px solid ${GOLD_DIM}` }}>
        <div style={{ width: 20, height: 2, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ color: "#fcf7ff", fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>
      </div>
      {desc ? <p style={{ color: "#aaa0b2", fontSize: 12, margin: "0 0 14px", lineHeight: 1.6 }}>{desc}</p> : null}
      {children}
    </div>
  );
}

function SummaryTiles({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {items.map(([label, value]) => (
        <div className="model-summary-tile" key={label} style={{ background: "#080808", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: "#aaa0b2", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 13, color: value.startsWith("✓") ? "#22c55e" : "#fcf7ff", fontWeight: value.startsWith("✓") ? 700 : 400 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ProfessionalVerificationSteps(props: Props) {
  const location = `${props.city}${props.state ? `, ${props.state}` : ""}` || "—";

  if (props.mode === "summary") {
    return (
      <div>
        <Section title="Resumo do perfil">
          <SummaryTiles items={[
            ["Nome artístico", props.displayName || "—"],
            ["Categoria", props.escortCategory || "—"],
            ["Cidade", location],
            ["Foto principal", props.mainPhotoUrl ? "✓ Enviada" : "Não enviada"],
            ["Fotos na galeria", `${props.galleryCount} foto(s)`],
            ["Identidade", props.diditApproved ? "✓ Verificada pela Didit" : "Não verificada"],
            ["WhatsApp", props.whatsapp || "—"],
          ]} />
        </Section>
        <div style={{ padding: "14px 18px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 10, marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#b4adb0", lineHeight: 1.7 }}>
            Ao enviar, você confirma ter <strong>18 anos ou mais</strong> e concorda com os Termos de Uso da plataforma. Seu perfil fica em análise por até <strong>3 dias úteis</strong> e só ficará visível após aprovação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Section title="Revise seus dados" desc="Confira as informações principais antes de verificar sua identidade.">
        <SummaryTiles items={[
          ["Nome artístico", props.displayName || "—"],
          ["Categoria", props.escortCategory || "—"],
          ["Localização", location],
          ["Fotos", `${1 + props.galleryCount} foto(s)`],
          ["Contato", props.whatsapp || "—"],
        ]} />
      </Section>

      <Section title="🔐 Verifique sua identidade" desc="Para aumentar a segurança da Elite Modell, precisamos confirmar sua identidade antes de enviar seu cadastro para análise.">
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 24 }}>
          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🛡️</span>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "#22c55e" }}>Verificação segura pela Didit</p>
            <p style={{ margin: 0, fontSize: 12, color: "#b4adb0", lineHeight: 1.65 }}>Você será direcionada para a verificação segura da Didit. Será necessário apresentar seu documento e realizar a verificação solicitada. Clientes nunca verão seus documentos.</p>
          </div>
        </div>

        {props.diditApproved ? (
          <div data-field="kycSessionId" style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: 15, fontWeight: 800 }}>✓ Identidade verificada</div>
        ) : (
          <>
            <button data-field="kycSessionId" type="button" onClick={props.onStartVerification} disabled={props.startingVerification || !props.diditAvailable} style={{ width: "100%", minHeight: 52, padding: "14px 16px", borderRadius: 12, border: "none", background: !props.diditAvailable ? "#676064" : GOLD, color: !props.diditAvailable ? "#e7e0ea" : "#080808", fontSize: 15, fontWeight: 800, cursor: props.startingVerification || !props.diditAvailable ? "not-allowed" : "pointer", marginBottom: 14 }}>
              {props.startingVerification ? "Iniciando verificação..." : props.diditPending ? props.verificationUrl ? "Retomar verificação" : "Verificação em análise" : props.diditRejected && props.diditRetryAllowed ? "Tentar novamente" : "Verificar minha identidade"}
            </button>
            {props.diditPending ? <div style={{ padding: "12px 14px", borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>Verificação em análise<span style={{ display: "block", color: "#d8cfdd", fontSize: 12, fontWeight: 500, marginTop: 4 }}>Seu cadastro ainda não será considerado verificado até recebermos o resultado final da Didit.</span></div> : null}
            {props.diditRejected ? <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ff8b8b", fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>Não foi possível concluir sua verificação de identidade.{props.diditRetryAllowed ? <span style={{ display: "block", color: "#d8cfdd", fontSize: 12, fontWeight: 500, marginTop: 4 }}>Você pode tentar novamente pelo botão acima.</span> : null}</div> : null}
            {!props.diditAvailable ? <div style={{ padding: "12px 14px", borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: "#e8b8ff", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>A verificação Didit está temporariamente indisponível. Seu cadastro permanece salvo; tente novamente em alguns minutos.</div> : null}
            {props.diditMessage && !props.diditPending && !props.diditRejected ? <p style={{ margin: "10px 0 0", color: "#d8cfdd", fontSize: 12 }}>{props.diditMessage}</p> : null}
          </>
        )}
      </Section>
    </div>
  );
}
