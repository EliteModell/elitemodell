"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type Settings = {
  id: string;
  slug: string;
  status: string;
  hidePhone: boolean;
  hideAge: boolean;
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
  const [boostDays, setBoostDays] = useState(1);
  const [uploadingVideo, setUploadingVideo] = useState(false);
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
        toast.error("Nao foi possivel carregar as configuracoes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function save(payload: Record<string, unknown>, success = "Configuracao salva.") {
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
      toast.error("Nao foi possivel salvar agora.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadVideo(file: File) {
    if (!settings) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Envie um video MP4, WebM ou MOV.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("O video deve ter no maximo 50 MB.");
      return;
    }
    setUploadingVideo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/upload?folder=profile-videos/${settings.id}`, { method: "POST", body });
      if (!res.ok) throw new Error();
      const data: { url?: string | null } = await res.json();
      if (!data.url) throw new Error();
      await save({ presentationVideoUrl: data.url }, "Video enviado para analise.");
    } catch {
      toast.error("Nao foi possivel enviar o video.");
    } finally {
      setUploadingVideo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 20 } as const;
  const muted = { color: "#777", fontSize: 13, lineHeight: 1.6 } as const;

  if (loading) return <div className="premium-skeleton" style={{ height: 180, borderRadius: 12 }} />;
  if (!settings) return <div className="premium-empty-state" style={{ padding: 32 }}>Perfil profissional nao encontrado.</div>;

  const isPaused = settings.status === "PAUSED";
  const isBoostActive = settings.boostActive && (!settings.boostUntil || new Date(settings.boostUntil) > new Date());

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Configuracoes profissionais</h1>
        <p style={{ color: "#777", fontSize: 14 }}>Controle privacidade, pausa temporaria, impulsionamento e video de apresentacao.</p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 12px" }}>Privacidade do perfil publico</h2>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: "1px solid #1e1e1e" }}>
            <span>
              <strong style={{ color: "#eee" }}>Ocultar telefone/WhatsApp</strong>
              <p style={{ ...muted, margin: "4px 0 0" }}>Clientes veem contato indisponivel e devem solicitar pela plataforma.</p>
            </span>
            <input type="checkbox" checked={settings.hidePhone} disabled={saving} onChange={(event) => save({ hidePhone: event.target.checked })} />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0 0" }}>
            <span>
              <strong style={{ color: "#eee" }}>Ocultar idade</strong>
              <p style={{ ...muted, margin: "4px 0 0" }}>Recurso preparado para planos premium. A idade nao aparece no perfil publico.</p>
            </span>
            <input type="checkbox" checked={settings.hideAge} disabled={saving} onChange={(event) => save({ hideAge: event.target.checked })} />
          </label>
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 8px" }}>Pausar perfil temporariamente</h2>
          <p style={{ ...muted, margin: "0 0 14px" }}>Enquanto pausado, o perfil nao aparece na busca publica. Limite atual: {maxPauseDays} dias.</p>
          {isPaused ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "#f5d78c", border: "1px solid rgba(212,168,67,.24)", borderRadius: 10, padding: 12 }}>
                Perfil pausado ate {settings.pauseUntil ? new Date(settings.pauseUntil).toLocaleDateString("pt-BR") : "data nao informada"}.
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
          <p style={{ ...muted, margin: "0 0 14px" }}>Estrutura pronta para cobranca por diaria. Enquanto ativo, o perfil ganha prioridade na listagem.</p>
          {isBoostActive ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "#22c55e", border: "1px solid rgba(34,197,94,.22)", borderRadius: 10, padding: 12 }}>
                Impulsionado ate {settings.boostUntil ? new Date(settings.boostUntil).toLocaleString("pt-BR") : "data nao informada"}.
              </div>
              <button disabled={saving} onClick={() => save({ boost: { enabled: false } }, "Impulsionamento desativado.")} style={{ minHeight: 44, borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#aaa", fontWeight: 800 }}>Desativar</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <input type="number" min={1} max={30} value={boostDays} onChange={(event) => setBoostDays(Number(event.target.value))} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: 12 }} />
              <button disabled={saving} onClick={() => save({ boost: { enabled: true, days: boostDays } }, "Impulsionamento ativado para teste.")} style={{ minHeight: 44, borderRadius: 8, border: 0, background: "#d4a843", color: "#080704", fontWeight: 900 }}>Ativar impulsionamento</button>
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ color: "#fff", fontSize: 17, margin: "0 0 8px" }}>Video de apresentacao</h2>
          <p style={{ ...muted, margin: "0 0 14px" }}>Envie um video curto. Ele fica pendente ate aprovacao da equipe antes de aparecer publicamente.</p>
          {settings.presentationVideoUrl ? (
            <div style={{ display: "grid", gap: 12 }}>
              <video src={settings.presentationVideoUrl} controls style={{ width: "100%", maxHeight: 360, borderRadius: 10, background: "#050506" }} />
              <div style={{ color: settings.presentationVideoStatus === "APPROVED" ? "#22c55e" : settings.presentationVideoStatus === "REJECTED" ? "#ef4444" : "#f5d78c", fontWeight: 800 }}>
                Status: {settings.presentationVideoStatus === "APPROVED" ? "aprovado" : settings.presentationVideoStatus === "REJECTED" ? "reprovado" : "pendente de analise"}
              </div>
              {settings.presentationVideoRejectReason ? <p style={muted}>{settings.presentationVideoRejectReason}</p> : null}
              <button disabled={saving} onClick={() => save({ removePresentationVideo: true }, "Video removido.")} style={{ minHeight: 42, borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#aaa", fontWeight: 800 }}>Remover video</button>
            </div>
          ) : null}
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadVideo(file); }} />
          <button disabled={uploadingVideo} onClick={() => fileRef.current?.click()} style={{ marginTop: 12, minHeight: 44, width: "100%", borderRadius: 8, border: "1px solid rgba(212,168,67,.28)", background: "rgba(212,168,67,.1)", color: "#f5d78c", fontWeight: 900, cursor: uploadingVideo ? "wait" : "pointer" }}>
            {uploadingVideo ? "Enviando..." : settings.presentationVideoUrl ? "Substituir video" : "Enviar video"}
          </button>
        </section>
      </div>
    </div>
  );
}
