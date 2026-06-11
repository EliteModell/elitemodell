"use client";
/* eslint-disable @next/next/no-img-element -- Stories exibem previews locais e midias publicadas pela profissional. */

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";
import { Camera, CirclePlus, Loader2, Play, Trash2, UploadCloud } from "lucide-react";
import { PremiumHeroCard, PremiumSection } from "@/components/professional-dashboard/ProfessionalPremium";

type StoryItem = {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  thumbnail: string | null;
  views: number;
  expiresAt: string;
  createdAt: string;
};

type PendingStory = {
  file: File;
  preview: string;
  mediaType: "image" | "video";
};

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_STORY_BYTES = 30 * 1024 * 1024;
const MAX_STORY_SECONDS = 60;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function friendlyUploadError(message: string) {
  if (message.toLowerCase().includes("profissionais aprovadas")) {
    return "Stories ficam disponíveis para profissionais aprovadas.";
  }
  if (message.toLowerCase().includes("muito grande")) return "O arquivo é muito grande.";
  if (message.toLowerCase().includes("tipo")) return "Escolha uma imagem ou vídeo válido.";
  return message || "Não foi possível publicar agora. Tente novamente.";
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

async function validateStoryFile(file: File) {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) return "Escolha uma imagem JPG, PNG, WebP ou um vídeo MP4/WebM.";
  if (file.size > MAX_STORY_BYTES) return "O arquivo é muito grande.";
  if (isVideo) {
    const duration = await videoDuration(file).catch(() => 0);
    if (duration > MAX_STORY_SECONDS) return `Use um vídeo de até ${MAX_STORY_SECONDS} segundos.`;
  }
  return null;
}

export function ProfessionalStoriesClient() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [pending, setPending] = useState<PendingStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [contentDeclarationAccepted, setContentDeclarationAccepted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadStories() {
      setLoading(true);
      try {
        const res = await fetch("/api/stories?mine=1", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data: { stories?: StoryItem[] } = await res.json();
        setStories(data.stories ?? []);
      } catch {
        if (!controller.signal.aborted) toast.error("Não foi possível carregar seus stories agora.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadStories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (pending) URL.revokeObjectURL(pending.preview);
    };
  }, [pending]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      toast.error("Escolha uma imagem ou vídeo válido.");
      return;
    }
    const error = await validateStoryFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending({
      file,
      preview: URL.createObjectURL(file),
      mediaType: file.type.startsWith("video/") ? "video" : "image",
    });
  }

  async function publishStory() {
    if (!pending) {
      toast.error("Escolha uma imagem ou vídeo válido.");
      return;
    }
    if (!contentDeclarationAccepted) {
      toast.error("Confirme a declaracao de autoria e autorizacao antes de publicar.");
      return;
    }
    setPublishing(true);
    try {
      const body = new FormData();
      body.append("file", pending.file);
      body.append("contentDeclarationAccepted", "true");
      const uploadRes = await fetch("/api/upload?folder=stories", { method: "POST", body });
      const uploaded = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploaded.url) {
        const detail = typeof uploaded.error === "string"
          ? uploaded.error
          : typeof uploaded.message === "string"
            ? uploaded.message
            : "";
        throw new Error(friendlyUploadError(detail));
      }

      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: uploaded.url, mediaType: pending.mediaType }),
      });
      const story = await storyRes.json().catch(() => ({}));
      if (!storyRes.ok) throw new Error(friendlyUploadError(typeof story.error === "string" ? story.error : ""));

      setStories((current) => [story as StoryItem, ...current]);
      URL.revokeObjectURL(pending.preview);
      setPending(null);
      setContentDeclarationAccepted(false);
      toast.success("Story publicado com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível publicar agora. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  }

  async function removeStory(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/stories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove");
      setStories((current) => current.filter((story) => story.id !== id));
      toast.success("Story removido.");
    } catch {
      toast.error("Não foi possível remover agora. Tente novamente.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Conteúdo rápido"
        title={<>Postar <span className="gold">story</span></>}
        subtitle="Publique conteúdos rápidos que aparecem para clientes na área de stories e expiram automaticamente em 24 horas."
        illustration="content"
      />

      <PremiumSection eyebrow="Novo story" title="Escolha a mídia" description="Use uma imagem ou vídeo curto. Você verá o preview antes de publicar.">
        <section className="premium-card" style={{ padding: 18 }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" hidden onChange={handleFile} />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)", gap: 18, alignItems: "center" }}>
            <div style={{ aspectRatio: "9 / 16", borderRadius: 24, overflow: "hidden", border: "1px solid var(--elite-border-soft)", background: "rgba(255,255,255,0.035)", display: "grid", placeItems: "center" }}>
              {pending ? (
                pending.mediaType === "video" ? (
                  <video src={pending.preview} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <img src={pending.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )
              ) : (
                <CirclePlus size={54} color="var(--elite-gold-light)" />
              )}
            </div>
            <div>
              <p style={{ margin: 0, color: pending ? "var(--elite-success)" : "var(--elite-text-muted)", fontWeight: 900 }}>
                {pending ? "Preview pronto para publicar." : "Nenhum story selecionado."}
              </p>
              <p style={{ margin: "10px 0 0", color: "var(--elite-text-muted)", lineHeight: 1.65, fontSize: 14 }}>
                Stories ativos aparecem para clientes na área de conteúdo recente. Vídeos devem ser curtos para carregar bem no celular.
              </p>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, color: "var(--elite-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={contentDeclarationAccepted}
                  onChange={(event) => setContentDeclarationAccepted(event.target.checked)}
                  style={{ marginTop: 3, accentColor: "var(--elite-gold)" }}
                />
                <span>
                  Confirmo que sou autora ou tenho autorizacao para publicar esta midia, que nao envolve menores, exploracao, coercao, trafico, imagem de terceiros sem autorizacao ou conteudo proibido.
                </span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={publishing} className="premium-button-secondary">
                  <Camera size={17} />
                  Selecionar mídia
                </button>
                {pending ? (
                  <button type="button" onClick={publishStory} disabled={publishing} className="premium-button">
                    {publishing ? <Loader2 size={17} className="spin" /> : <UploadCloud size={17} />}
                    {publishing ? "Publicando..." : "Publicar story"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </PremiumSection>

      <PremiumSection eyebrow="Stories ativos" title="Conteúdos publicados" description="Acompanhe o que está visível para clientes agora.">
        {loading ? (
          <div className="premium-section-card">
            <div className="premium-skeleton" style={{ height: 140, borderRadius: 20 }} />
          </div>
        ) : stories.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {stories.map((story) => (
              <article key={story.id} className="premium-card" style={{ padding: 10 }}>
                <div style={{ aspectRatio: "9 / 16", borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.04)", position: "relative" }}>
                  {story.mediaType === "video" ? (
                    <video src={story.mediaUrl} poster={story.thumbnail ?? undefined} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <img src={story.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                  {story.mediaType === "video" ? (
                    <span style={{ position: "absolute", left: 8, top: 8, width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.62)", color: "#fff" }}>
                      <Play size={16} />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeStory(story.id)}
                    disabled={removingId === story.id}
                    aria-label="Remover story"
                    style={{ position: "absolute", right: 8, top: 8, width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.62)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer" }}
                  >
                    {removingId === story.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
                <div style={{ padding: "10px 2px 2px" }}>
                  <p style={{ margin: 0, color: "#fff", fontWeight: 900, fontSize: 13 }}>Story ativo</p>
                  <p style={{ margin: "4px 0 0", color: "var(--elite-text-muted)", fontSize: 12 }}>
                    Expira às {formatTime(story.expiresAt)} · {story.views} visualizações
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="premium-empty-state">Nenhum story ativo agora.</div>
        )}
      </PremiumSection>

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
