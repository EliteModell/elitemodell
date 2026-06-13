"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Settings = {
  id: string;
  slug: string;
  status: string;
  hidePhone: boolean;
  contactVisibility: "PUBLIC" | "LOGGED_IN" | "PREMIUM";
  hideAge: boolean;
  voucherSettings?: { acceptsVouchers: boolean } | null;
  pauseUntil?: string | null;
  pauseReason?: string | null;
  boostActive: boolean;
  boostUntil?: string | null;
  boostSource?: string | null;
  presentationVideoUrl?: string | null;
  presentationVideoStatus: string;
  presentationVideoRejectReason?: string | null;
};

export default function ProfissionalConfiguracoesPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [maxPauseDays, setMaxPauseDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pauseDays, setPauseDays] = useState(7);
  const [pauseReason, setPauseReason] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [contentDeclarationAccepted, setContentDeclarationAccepted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/professional/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return await res.json();
      })
      .then((data) => {
        if (!active) return;
        setSettings(data.professional);
        setMaxPauseDays(data.maxPauseDays ?? 60);
        setPauseReason(data.professional?.pauseReason ?? "");
      })
      .catch(() => {
        toast.error("Não foi possível carregar suas configurações agora.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function save(payload: Record<string, unknown>, success = "Sua configuração foi salva.") {
    setSaving(true);
    try {
      const res = await fetch("/api/professional/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSettings(data.professional);
      toast.success(success);
    } catch {
      toast.error("Não foi possível concluir agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(file: File) {
    if (!settings) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Envie um vídeo MP4, WebM ou MOV.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("O vídeo deve ter no máximo 50 MB.");
      return;
    }
    if (!contentDeclarationAccepted) {
      toast.error("Confirme a declaracao de autoria e autorizacao antes de enviar.");
      return;
    }
    setUploadingVideo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("contentDeclarationAccepted", "true");
      const res = await fetch(`/api/upload?folder=profile-videos/${settings.id}`, { method: "POST", body });
      const data: { url?: string | null; error?: string; message?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || data.message || "Não foi possível concluir agora.");
      }
      await save({ presentationVideoUrl: data.url }, "Seu vídeo foi enviado para análise.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível concluir agora. Tente novamente.");
    } finally {
      setUploadingVideo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const card = { background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: 22 } as const;
  const muted = { color: "#777", fontSize: 13, lineHeight: 1.6 } as const;

  if (loading) return <div className="premium-skeleton" style={{ height: 180, borderRadius: 12 }} />;
  if (!settings) return <div className="premium-empty-state" style={{ padding: 32 }}>Perfil profissional não encontrado.</div>;

  const isPaused = settings.status === "PAUSED";
  const isBoostActive = settings.boostActive && (!settings.boostUntil || new Date(settings.boostUntil) > new Date());

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Configurações profissionais</h1>
        <p style={{ color: "#777", fontSize: 14 }}>Controle privacidade, pausa temporária, impulsionamento e vídeo de apresentação.</p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 12px" }}>Privacidade do perfil público</h2>
          <p style={{ ...muted, margin: "0 0 12px" }}>Escolha quem poderá abrir seus botões de telefone e WhatsApp.</p>
          <div style={{ display: "grid", gap: 8, paddingBottom: 14, borderBottom: "1px solid #1e1e1e" }}>
            {([
              ["PUBLIC", "Público para todos", "Visitantes podem acessar o contato sem criar conta."],
              ["LOGGED_IN", "Somente usuários logados", "O contato é liberado depois do login."],
              ["PREMIUM", "Somente clientes Premium", "O contato vira um benefício exclusivo do plano Premium."],
            ] as const).map(([value, label, description]) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: settings.contactVisibility === value
                    ? "1px solid rgba(212,168,67,.5)"
                    : "1px solid #252525",
                  background: settings.contactVisibility === value
                    ? "rgba(212,168,67,.08)"
                    : "#0d0d0d",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                <input
                  type="radio"
                  name="contactVisibility"
                  value={value}
                  checked={settings.contactVisibility === value}
                  disabled={saving}
                  onChange={() => save(
                    { contactVisibility: value },
                    "Visibilidade do contato atualizada.",
                  )}
                  style={{ marginTop: 3, accentColor: "#d4a843" }}
                />
                <span>
                  <strong style={{ color: "#eee" }}>{label}</strong>
                  <span style={{ ...muted, display: "block", marginTop: 3 }}>{description}</span>
                </span>
              </label>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0 0" }}>
            <span>
              <strong style={{ color: "#eee" }}>Ocultar idade</strong>
              <p style={{ ...muted, margin: "4px 0 0" }}>Recurso preparado para planos premium. A idade não aparece no perfil público.</p>
            </span>
            <input type="checkbox" checked={settings.hideAge} disabled={saving} onChange={(event) => save({ hideAge: event.target.checked })} />
          </label>
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 12px" }}>Vouchers promocionais</h2>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "4px 0" }}>
            <span>
              <strong style={{ color: "#eee" }}>Aceitar vouchers promocionais da plataforma?</strong>
              <p style={{ ...muted, margin: "4px 0 0" }}>Quando ativado, clientes podem aplicar vouchers da Elite Modell nos agendamentos com você.</p>
            </span>
            <input
              type="checkbox"
              checked={Boolean(settings.voucherSettings?.acceptsVouchers)}
              disabled={saving}
              onChange={(event) => save({ acceptsVouchers: event.target.checked }, event.target.checked ? "Vouchers promocionais aceitos." : "Vouchers promocionais desativados.")}
            />
          </label>
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 8px" }}>Pausar perfil temporariamente</h2>
          <p style={{ ...muted, margin: "0 0 14px" }}>Enquanto pausado, o perfil não aparece na busca pública. Limite atual: {maxPauseDays} dias.</p>
          {isPaused ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "#f5d78c", border: "1px solid rgba(212,168,67,.24)", borderRadius: 10, padding: 12 }}>
                Perfil pausado até {settings.pauseUntil ? new Date(settings.pauseUntil).toLocaleDateString("pt-BR") : "data não informada"}.
              </div>
              <button disabled={saving} onClick={() => save({ pause: { enabled: false } }, "Perfil reativado.")} style={{ minHeight: 44, borderRadius: 8, border: 0, background: "#d4a843", color: "#080704", fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>Reativar perfil</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <input type="number" min={1} max={maxPauseDays} value={pauseDays} onChange={(event) => setPauseDays(Number(event.target.value))} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: 12 }} />
              <textarea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} placeholder="Motivo interno opcional" rows={3} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: 12 }} />
              <button disabled={saving} onClick={() => save({ pause: { enabled: true, days: pauseDays, reason: pauseReason } }, "Perfil pausado temporariamente.")} style={{ minHeight: 44, borderRadius: 8, border: "1px solid rgba(212,168,67,.28)", background: "rgba(212,168,67,.1)", color: "#f5d78c", fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>Pausar perfil</button>
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 8px" }}>Impulsionamento individual</h2>
          <p style={{ ...muted, margin: "0 0 14px" }}>Recurso opcional de destaque. Ele nunca é ativado ou cobrado automaticamente.</p>
          {isBoostActive ? (
            <div style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,.22)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                Impulsionado até {settings.boostUntil ? new Date(settings.boostUntil).toLocaleString("pt-BR") : "data não informada"}.
            </div>
          ) : null}
          <Link href="/profissional/planos" className="premium-button" style={{ width: "100%" }}>
            Ver destaques opcionais
          </Link>
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 8px" }}>Vídeo de apresentação</h2>
          <p style={{ ...muted, margin: "0 0 14px" }}>Envie um vídeo curto. Ele fica pendente até aprovação da equipe antes de aparecer publicamente.</p>
          {settings.presentationVideoUrl ? (
            <div style={{ display: "grid", gap: 12 }}>
              <video src={settings.presentationVideoUrl} controls style={{ width: "100%", maxHeight: 360, borderRadius: 10, background: "#050506" }} />
              <div style={{ color: settings.presentationVideoStatus === "APPROVED" ? "#22c55e" : settings.presentationVideoStatus === "REJECTED" ? "#ef4444" : "#f5d78c", fontWeight: 800 }}>
                Status: {settings.presentationVideoStatus === "APPROVED" ? "aprovado" : settings.presentationVideoStatus === "REJECTED" ? "reprovado" : "pendente de análise"}
              </div>
              {settings.presentationVideoRejectReason ? <p style={muted}>{settings.presentationVideoRejectReason}</p> : null}
              <button disabled={saving} onClick={() => save({ removePresentationVideo: true }, "Vídeo removido.")} style={{ minHeight: 42, borderRadius: 10, border: "1px solid #2a2a2a", background: "transparent", color: "#aaa", fontWeight: 800 }}>Remover vídeo</button>
            </div>
          ) : null}
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12, color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={contentDeclarationAccepted}
              onChange={(event) => setContentDeclarationAccepted(event.target.checked)}
              style={{ marginTop: 3, accentColor: "#d4a843" }}
            />
            <span>
              Confirmo que sou autora ou tenho autorizacao para publicar este video, sem menoridade, exploracao, coercao, trafico, imagem de terceiros sem autorizacao ou conteudo proibido.
            </span>
          </label>
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVideo(file); }} />
          <button disabled={uploadingVideo} onClick={() => fileRef.current?.click()} style={{ marginTop: 12, minHeight: 44, width: "100%", borderRadius: 8, border: "1px solid rgba(212,168,67,.28)", background: "rgba(212,168,67,.1)", color: "#f5d78c", fontWeight: 900, cursor: uploadingVideo ? "wait" : "pointer" }}>
            {uploadingVideo ? "Enviando..." : settings.presentationVideoUrl ? "Substituir vídeo" : "Enviar vídeo"}
          </button>
        </section>
      </div>
    </div>
  );
}
