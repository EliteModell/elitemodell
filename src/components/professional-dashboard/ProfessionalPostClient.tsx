"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Camera, CheckCircle2, FileVideo, ImageIcon, Images, Loader2, Play, UploadCloud, UserRound } from "lucide-react";
import {
  PremiumActionCard,
  PremiumHeroCard,
  PremiumSection,
} from "@/components/professional-dashboard/ProfessionalPremium";

type MeResponse = {
  professional?: {
    id: string;
    slug: string;
    presentationVideoUrl?: string | null;
    presentationVideoStatus?: string | null;
  } | null;
};

type PendingVideo = {
  file: File;
  preview: string;
};

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;

function videoStatusLabel(status?: string | null) {
  if (status === "APPROVED") return "Vídeo publicado";
  if (status === "PENDING") return "Vídeo enviado";
  if (status === "REJECTED") return "Vídeo precisa de ajuste";
  return "Vídeo pendente";
}

async function videoDuration(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    return await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration || 0);
      video.onerror = () => reject(new Error("video"));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function validateVideo(file: File) {
  if (!VIDEO_TYPES.includes(file.type)) return "Escolha um vídeo MP4, WebM ou MOV.";
  if (file.size > MAX_VIDEO_BYTES) return "O arquivo é muito grande.";
  const duration = await videoDuration(file).catch(() => 0);
  if (duration > MAX_VIDEO_SECONDS) return `Use um vídeo de até ${MAX_VIDEO_SECONDS} segundos.`;
  return null;
}

export function ProfessionalPostClient() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [professionalSlug, setProfessionalSlug] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingVideo | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [contentDeclarationAccepted, setContentDeclarationAccepted] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const data: MeResponse = await res.json();
        setProfessionalId(data.professional?.id ?? null);
        setProfessionalSlug(data.professional?.slug ?? null);
        setVideoUrl(data.professional?.presentationVideoUrl ?? null);
        setVideoStatus(data.professional?.presentationVideoStatus ?? null);
      } catch {
        if (!controller.signal.aborted) toast.error("Não foi possível carregar seus conteúdos agora.");
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (pendingVideo) URL.revokeObjectURL(pendingVideo.preview);
    };
  }, [pendingVideo]);

  async function handleVideoInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      toast.error("Escolha um vídeo válido.");
      return;
    }
    const error = await validateVideo(file);
    if (error) {
      toast.error(error);
      return;
    }
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.preview);
    setPendingVideo({ file, preview: URL.createObjectURL(file) });
  }

  async function publishVideo() {
    if (!pendingVideo || !professionalId || !professionalSlug) {
      toast.error("Escolha um vídeo válido.");
      return;
    }
    if (!contentDeclarationAccepted) {
      toast.error("Confirme a declaracao de autoria e autorizacao antes de enviar.");
      return;
    }
    setUploadingVideo(true);
    try {
      const body = new FormData();
      body.append("file", pendingVideo.file);
      body.append("contentDeclarationAccepted", "true");
      const uploadRes = await fetch(`/api/upload?folder=profile-videos/${professionalId}`, { method: "POST", body });
      const uploaded = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploaded.url) {
        throw new Error(
          typeof uploaded.error === "string"
            ? uploaded.error
            : typeof uploaded.message === "string"
              ? uploaded.message
              : "Não foi possível enviar agora. Tente novamente.",
        );
      }
      const updateRes = await fetch(`/api/professionals/${professionalSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentationVideoUrl: uploaded.url }),
      });
      const updated = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) throw new Error(typeof updated.error === "string" ? updated.error : "Não foi possível atualizar seu vídeo agora.");
      setVideoUrl(uploaded.url);
      setVideoStatus("PENDING");
      URL.revokeObjectURL(pendingVideo.preview);
      setPendingVideo(null);
      setContentDeclarationAccepted(false);
      toast.success("Vídeo enviado com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setUploadingVideo(false);
    }
  }

  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Conteúdo profissional"
        title={<>Postar <span className="gold">conteúdo</span></>}
        subtitle="Atualize fotos, vídeos, stories e agenda para manter seu perfil mais visível para clientes."
        illustration="content"
      />

      <div className="premium-grid premium-grid-2">
        <QuickContentCard href="/profissional/fotos" icon={<UserRound />} badge="Imagem principal" title="Foto de perfil" description="Adicione ou troque a imagem principal do seu perfil." buttonLabel="Editar foto" />
        <QuickContentCard href="/profissional/fotos" icon={<ImageIcon />} badge="Topo do anúncio" title="Foto de capa" description="Escolha uma imagem de destaque para o topo do seu anúncio." buttonLabel="Editar capa" />
        <QuickContentCard href="/profissional/fotos" icon={<Images />} badge="Portfólio" title="Galeria de fotos" description="Publique fotos recentes para aumentar confiança e conversão." buttonLabel="Postar fotos" />
        <QuickContentCard href="#video-apresentacao" icon={<FileVideo />} badge="Apresentação" title="Vídeo de apresentação" description="Envie um vídeo curto para deixar o perfil mais completo." buttonLabel="Selecionar vídeo" />
        <QuickContentCard href="/profissional/stories" icon={<Camera />} badge="Conteúdo rápido" title="Stories" description="Publique conteúdos rápidos que aparecem para clientes." buttonLabel="Postar story" />
        <QuickContentCard href="/profissional/agenda" icon={<CalendarDays />} badge="Disponibilidade" title="Agenda" description="Mantenha seus horários e disponibilidade atualizados." buttonLabel="Atualizar agenda" />
      </div>

      <PremiumSection eyebrow="Apresentação" title="Vídeo de apresentação" description="Adicione um vídeo curto para apresentar melhor seu perfil.">
        <section id="video-apresentacao" className="premium-upload-zone" style={{ padding: 18, textAlign: "left" }}>
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={handleVideoInput} />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)", gap: 18, alignItems: "center" }}>
            <div style={{ aspectRatio: "9 / 16", borderRadius: 24, overflow: "hidden", border: "1px solid var(--elite-border-soft)", background: "rgba(255,255,255,0.035)", display: "grid", placeItems: "center" }}>
              {pendingVideo ? (
                <video src={pendingVideo.preview} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : videoUrl ? (
                <video src={videoUrl} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <FileVideo size={54} color="var(--elite-gold-light)" />
              )}
            </div>
            <div>
              <span className="premium-badge">{videoStatusLabel(videoStatus)}</span>
              {pendingVideo ? (
                <p style={{ margin: "12px 0 0", color: "var(--elite-gold-light)", lineHeight: 1.6, fontSize: 14, fontWeight: 800 }}>
                  Preview pronto. Confira o vídeo antes de enviar.
                </p>
              ) : videoUrl ? (
                <p style={{ margin: "12px 0 0", color: "var(--elite-success)", lineHeight: 1.6, fontSize: 14, fontWeight: 800 }}>
                  <CheckCircle2 size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "-3px" }} />
                  Seu vídeo foi enviado.
                </p>
              ) : null}
              <p style={{ margin: "12px 0 0", color: "var(--elite-text-muted)", lineHeight: 1.65, fontSize: 14 }}>
                Escolha um vídeo MP4, WebM ou MOV. Ele será mostrado no perfil quando estiver liberado para clientes.
              </p>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, color: "var(--elite-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={contentDeclarationAccepted}
                  onChange={(event) => setContentDeclarationAccepted(event.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--elite-gold)" }}
                />
                <span>
                  Confirmo que sou autora ou tenho autorizacao para publicar este video, que nao envolve menores, exploracao, coercao, trafico, imagem de terceiros sem autorizacao ou conteudo proibido.
                </span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className="premium-button-secondary">
                  <Play size={17} />
                  {videoUrl ? "Trocar vídeo" : "Selecionar vídeo"}
                </button>
                {pendingVideo ? (
                  <button type="button" onClick={publishVideo} disabled={uploadingVideo} className="premium-button">
                    {uploadingVideo ? <Loader2 size={17} className="spin" /> : <UploadCloud size={17} />}
                    {uploadingVideo ? "Enviando..." : "Enviar vídeo"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </PremiumSection>

      <PremiumActionCard
        href="/profissional/listagem"
        icon="star"
        badge="Visibilidade"
        title="Minha listagem"
        description="Veja como conteúdo, agenda e planos influenciam seu posicionamento."
        buttonLabel="Abrir"
      />

      <style jsx>{`
        .spin {
          animation: spin 900ms linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 640px) {
          section > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function QuickContentCard({
  href,
  icon,
  badge,
  title,
  description,
  buttonLabel,
}: {
  href: string;
  icon: ReactNode;
  badge: string;
  title: string;
  description: string;
  buttonLabel: string;
}) {
  return (
    <Link href={href} className="premium-action-card" style={{ gridTemplateColumns: "auto minmax(0,1fr)", alignItems: "start" }}>
      <span className="premium-icon-orb">{icon}</span>
      <span className="premium-action-body">
        <span className="premium-badge">{badge}</span>
        <span className="premium-action-title">{title}</span>
        <span className="premium-action-text">{description}</span>
        <span className="premium-button" style={{ width: "fit-content", marginTop: 6 }}>{buttonLabel}</span>
      </span>
    </Link>
  );
}
