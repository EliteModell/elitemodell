"use client";
import { NoPrefetchLink as Link } from "@/components/NoPrefetchLink";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight, CalendarDays, Camera, CheckCircle2, FileVideo, ImageIcon, Images,
  Loader2, Play, Plus, Sparkles, Star, Upload, UploadCloud, UserRound,
} from "lucide-react";
import styles from "./ProfessionalPostClient.module.css";

type PhotoRecord = { url: string; cover: boolean; order: number };
type StoryItem = { id: string; mediaUrl: string; mediaType: "image" | "video"; thumbnail: string | null };
type MeResponse = {
  image?: string | null;
  stories?: StoryItem[];
  professional?: {
    id: string; slug: string; image?: string | null; galleryUrls?: string[]; photos?: PhotoRecord[];
    presentationVideoUrl?: string | null; presentationVideoStatus?: string | null;
  } | null;
};
type PendingVideo = { file: File; preview: string; duration: number };

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;

function videoStatusLabel(status?: string | null) {
  if (status === "APPROVED") return "Vídeo publicado";
  if (status === "PENDING") return "Vídeo enviado";
  if (status === "REJECTED") return "Vídeo precisa de ajuste";
  return "Vídeo pendente";
}

function videoStatusTone(status?: string | null) {
  if (status === "APPROVED") return styles.statusApproved;
  if (status === "REJECTED") return styles.statusRejected;
  return styles.statusPending;
}

function formatDuration(duration: number | null) {
  if (!duration || !Number.isFinite(duration)) return null;
  const total = Math.max(0, Math.round(duration));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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

async function inspectVideo(file: File) {
  if (!VIDEO_TYPES.includes(file.type)) return { error: "Escolha um vídeo MP4, WebM ou MOV.", duration: 0 };
  if (file.size > MAX_VIDEO_BYTES) return { error: "O arquivo é muito grande.", duration: 0 };
  const duration = await videoDuration(file).catch(() => 0);
  if (duration > MAX_VIDEO_SECONDS) return { error: `Use um vídeo de até ${MAX_VIDEO_SECONDS} segundos.`, duration };
  return { error: null, duration };
}

function normalizeMedia(data: MeResponse) {
  const savedPhotos = data.professional?.photos ?? [];
  const coverPhoto = savedPhotos.find((photo) => photo.cover)?.url ?? data.professional?.image ?? null;
  const relationGallery = savedPhotos.filter((photo) => !photo.cover).map((photo) => photo.url);
  const gallery = Array.from(new Set(relationGallery.length ? relationGallery : (data.professional?.galleryUrls ?? []))).filter((url) => url !== coverPhoto);
  return { profilePhoto: data.image ?? null, coverPhoto, gallery };
}

export function ProfessionalPostClient() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [professionalSlug, setProfessionalSlug] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoLength, setVideoLength] = useState<number | null>(null);
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
        const media = normalizeMedia(data);
        setProfessionalId(data.professional?.id ?? null);
        setProfessionalSlug(data.professional?.slug ?? null);
        setProfilePhoto(media.profilePhoto);
        setCoverPhoto(media.coverPhoto);
        setGallery(media.gallery);
        setStories(data.stories ?? []);
        setVideoUrl(data.professional?.presentationVideoUrl ?? null);
        setVideoStatus(data.professional?.presentationVideoStatus ?? null);
      } catch {
        if (!controller.signal.aborted) toast.error("Não foi possível carregar seus conteúdos agora.");
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);

  useEffect(() => () => { if (pendingVideo) URL.revokeObjectURL(pendingVideo.preview); }, [pendingVideo]);

  async function handleVideoInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return toast.error("Escolha um vídeo válido.");
    const validation = await inspectVideo(file);
    if (validation.error) return toast.error(validation.error);
    if (pendingVideo) URL.revokeObjectURL(pendingVideo.preview);
    setPendingVideo({ file, preview: URL.createObjectURL(file), duration: validation.duration });
  }

  async function publishVideo() {
    if (!pendingVideo || !professionalId || !professionalSlug) return toast.error("Escolha um vídeo válido.");
    if (!contentDeclarationAccepted) return toast.error("Confirme a declaração de autoria e autorização antes de enviar.");
    setUploadingVideo(true);
    try {
      const body = new FormData();
      body.append("file", pendingVideo.file);
      body.append("contentDeclarationAccepted", "true");
      const uploadRes = await fetch(`/api/upload?folder=profile-videos/${professionalId}`, { method: "POST", body });
      const uploaded = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploaded.url) {
        throw new Error(typeof uploaded.error === "string" ? uploaded.error : typeof uploaded.message === "string" ? uploaded.message : "Não foi possível enviar agora. Tente novamente.");
      }
      const updateRes = await fetch(`/api/professionals/${professionalSlug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ presentationVideoUrl: uploaded.url }),
      });
      const updated = await updateRes.json().catch(() => ({}));
      if (!updateRes.ok) throw new Error(typeof updated.error === "string" ? updated.error : "Não foi possível atualizar seu vídeo agora.");
      setVideoUrl(uploaded.url);
      setVideoStatus("PENDING");
      setVideoLength(pendingVideo.duration);
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

  const activeVideo = pendingVideo?.preview ?? videoUrl;
  const activeDuration = pendingVideo?.duration ?? videoLength;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="post-content-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Conteúdo profissional</span>
          <h1 id="post-content-title">Postar <em>conteúdo</em></h1>
          <p>Atualize fotos, vídeos, stories e agenda para manter seu perfil mais visível para clientes.</p>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.heroSparkOne}><Sparkles /></span><span className={styles.heroSparkTwo}><Sparkles /></span>
          <span className={styles.mediaSheet}><ImageIcon /></span><span className={styles.videoSheet}><Play /></span>
          <span className={styles.uploadOrb}><Upload /></span>
          <span className={styles.opportunityCard}>Seu perfil,<br /><strong>mais oportunidades</strong></span>
        </div>
      </section>

      <ContentCard className={styles.profileCard} icon={<UserRound />} badge="Imagem principal" title="Foto de perfil" description="Adicione ou troque a imagem principal do seu perfil.">
        <div className={styles.profileContent}>
          <div className={styles.avatarWrap}>
            {profilePhoto ? <Image src={profilePhoto} alt="Foto atual do perfil" width={116} height={116} sizes="116px" unoptimized={profilePhoto.startsWith("blob:") || profilePhoto.startsWith("data:")} /> : <UserRound aria-hidden="true" />}
            <span><Camera /></span>
          </div>
          <Link className={styles.primaryButton} href="/profissional/fotos">Editar foto</Link>
        </div>
      </ContentCard>

      <ContentCard icon={<ImageIcon />} badge="Topo do anúncio" title="Foto de capa" description="Escolha uma imagem de destaque para o topo do seu anúncio.">
        <div className={styles.coverPreview}>{coverPhoto ? <Image src={coverPhoto} alt="Foto de capa atual" fill sizes="(max-width: 760px) 100vw, 760px" unoptimized={coverPhoto.startsWith("blob:") || coverPhoto.startsWith("data:")} /> : <EmptyMedia icon={<ImageIcon />} label="Sua capa aparecerá aqui" />}</div>
        <Link className={styles.primaryButton} href="/profissional/fotos">Editar capa</Link>
      </ContentCard>

      <ContentCard icon={<Images />} badge="Portfólio" title="Galeria de fotos" description="Publique fotos recentes para aumentar confiança e conversão.">
        <div className={styles.galleryGrid}>
          {Array.from({ length: 4 }, (_, index) => gallery[index] ? (
            <div className={styles.galleryImage} key={gallery[index]}><Image src={gallery[index]} alt={`Foto ${index + 1} da galeria`} fill sizes="(max-width: 760px) 30vw, 150px" unoptimized={gallery[index].startsWith("blob:") || gallery[index].startsWith("data:")} /></div>
          ) : <div className={styles.galleryPlaceholder} key={`empty-${index}`}><ImageIcon aria-hidden="true" /></div>)}
          <div className={styles.galleryMore}><strong>{gallery.length > 4 ? `+${gallery.length - 4}` : "+"}</strong><span>{gallery.length > 4 ? "mais fotos" : "adicionar"}</span></div>
        </div>
        <Link className={styles.primaryButton} href="/profissional/fotos">Postar fotos</Link>
      </ContentCard>

      <ContentCard id="video-apresentacao" icon={<FileVideo />} badge="Apresentação" title="Vídeo de apresentação" description="Envie um vídeo curto para deixar o perfil mais completo.">
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={handleVideoInput} />
        <div className={styles.videoGrid}>
          <div className={styles.videoPreview}>
            {activeVideo ? <video src={activeVideo} controls playsInline preload="none" onLoadedMetadata={(event) => { if (!pendingVideo) setVideoLength(event.currentTarget.duration || null); }} /> : <EmptyMedia icon={<Play />} label="Seu vídeo aparecerá aqui" />}
            {activeDuration ? <span className={styles.duration}>{formatDuration(activeDuration)}</span> : null}
          </div>
          <div className={styles.videoDetails}>
            <span className={`${styles.statusBadge} ${videoStatusTone(videoStatus)}`}>{videoStatusLabel(videoStatus)}</span>
            {pendingVideo ? <p className={styles.videoFeedback}>Preview pronto. Confira o vídeo antes de enviar.</p> : videoUrl ? <p className={styles.videoSuccess}><CheckCircle2 /> Seu vídeo foi enviado.</p> : null}
            <p className={styles.videoRules}>Escolha um vídeo MP4, WebM ou MOV. Ele será mostrado no perfil quando estiver liberado para clientes.</p>
            <label className={styles.declaration}>
              <input type="checkbox" checked={contentDeclarationAccepted} onChange={(event) => setContentDeclarationAccepted(event.target.checked)} />
              <span>Confirmo que sou autora ou tenho autorização para publicar este vídeo, que não envolve menores, exploração, coerção, tráfico, imagem de terceiros sem autorização ou conteúdo proibido.</span>
            </label>
            <div className={styles.videoActions}>
              <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} className={styles.secondaryButton}><Play /> {videoUrl ? "Trocar vídeo" : "Selecionar vídeo"}</button>
              {pendingVideo ? <button type="button" onClick={publishVideo} disabled={uploadingVideo} className={styles.primaryButton}>{uploadingVideo ? <Loader2 className={styles.spin} /> : <UploadCloud />}{uploadingVideo ? "Enviando..." : "Enviar vídeo"}</button> : null}
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard icon={<Camera />} badge="Conteúdo rápido" title="Stories" description="Publique conteúdos rápidos que aparecem para clientes.">
        <div className={styles.storiesRow}>
          <Link href="/profissional/stories" className={styles.newStory}><span><Plus /></span><small>Novo story</small></Link>
          {stories.slice(0, 5).map((story, index) => { const storyImage = story.thumbnail ?? story.mediaUrl; return <div className={styles.storyItem} key={story.id}><span>{story.mediaType === "image" || story.thumbnail ? <Image src={storyImage} alt={`Story ${index + 1}`} width={72} height={72} sizes="72px" /> : <Play aria-label="Story em vídeo" />}</span><small>Story</small></div>; })}
          {stories.length === 0 ? <p className={styles.emptyStories}>Seus stories ativos aparecem aqui.</p> : null}
        </div>
        <Link className={styles.primaryButton} href="/profissional/stories">Postar story</Link>
      </ContentCard>

      <SupportCard icon={<CalendarDays />} badge="Disponibilidade" title="Agenda" description="Mantenha seus horários e disponibilidade atualizados." href="/profissional/agenda" buttonLabel="Atualizar agenda">
        <div className={styles.calendarArt}><CalendarDays /><span>Seu tempo,<br /><strong>mais encontros</strong></span></div>
      </SupportCard>

      <SupportCard icon={<Star />} badge="Visibilidade" title="Minha listagem" description="Veja como conteúdo, agenda e planos influenciam seu posicionamento." href="/profissional/listagem" buttonLabel="Abrir">
        <div className={styles.visibilityArt}><span /><span /><span /><p>Mais visibilidade<br />Mais clientes<br /><strong>Mais resultados</strong></p></div>
      </SupportCard>
    </div>
  );
}

function ContentCard({ id, className = "", icon, badge, title, description, children }: { id?: string; className?: string; icon: ReactNode; badge: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} className={`${styles.contentCard} ${className}`}><div className={styles.cardHeading}><span className={styles.iconOrb}>{icon}</span><div><span className={styles.categoryBadge}>{badge}</span><h2>{title}</h2><p>{description}</p></div></div><div className={styles.cardBody}>{children}</div></section>;
}

function SupportCard({ icon, badge, title, description, href, buttonLabel, children }: { icon: ReactNode; badge: string; title: string; description: string; href: string; buttonLabel: string; children: ReactNode }) {
  return <section className={`${styles.contentCard} ${styles.supportCard}`}><div className={styles.cardHeading}><span className={styles.iconOrb}>{icon}</span><div><span className={styles.categoryBadge}>{badge}</span><h2>{title}</h2><p>{description}</p><Link className={styles.primaryButton} href={href}>{buttonLabel}<ArrowRight /></Link></div></div>{children}</section>;
}

function EmptyMedia({ icon, label }: { icon: ReactNode; label: string }) {
  return <span className={styles.emptyMedia}>{icon}<small>{label}</small></span>;
}
