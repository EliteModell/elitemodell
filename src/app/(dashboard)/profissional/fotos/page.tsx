"use client";
/* eslint-disable @next/next/no-img-element -- Imagens sao previews locais ou URLs publicas enviadas pela propria profissional. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode, RefObject } from "react";
import toast from "react-hot-toast";
import { Camera, ImageIcon, Images, Loader2, Trash2, UploadCloud, UserRound } from "lucide-react";
import { PremiumHeroCard, PremiumSection } from "@/components/professional-dashboard/ProfessionalPremium";

type PhotoRecord = {
  id?: string;
  url: string;
  cover: boolean;
  order: number;
};

type PendingFile = {
  file: File;
  preview: string;
};

type MeResponse = {
  id: string;
  image?: string | null;
  professional?: {
    id: string;
    slug: string;
    image?: string | null;
    galleryUrls?: string[];
    photos?: PhotoRecord[];
  } | null;
};

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_GALLERY = 12;

function formatSize(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function validateImage(file: File) {
  if (!file) return "Escolha uma imagem válida.";
  if (!IMAGE_TYPES.includes(file.type)) return "Escolha uma imagem JPG, PNG ou WebP.";
  if (file.size > MAX_IMAGE_BYTES) return `O arquivo é muito grande. Use uma imagem de até ${formatSize(MAX_IMAGE_BYTES)}.`;
  return null;
}

function normalizeMedia(data: MeResponse) {
  const professional = data.professional;
  const savedPhotos = professional?.photos ?? [];
  const coverPhoto = savedPhotos.find((photo) => photo.cover)?.url ?? professional?.image ?? null;
  const relationGallery = savedPhotos.filter((photo) => !photo.cover).map((photo) => photo.url);
  const legacyGallery = professional?.galleryUrls ?? [];
  const gallery = Array.from(new Set(relationGallery.length ? relationGallery : legacyGallery)).filter((url) => url !== coverPhoto);

  return {
    profilePhoto: data.image ?? null,
    coverPhoto,
    gallery,
  };
}

function createPending(file: File): PendingFile {
  return { file, preview: URL.createObjectURL(file) };
}

export default function ProfissionalFotosPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [profilePending, setProfilePending] = useState<PendingFile | null>(null);
  const [coverPending, setCoverPending] = useState<PendingFile | null>(null);
  const [galleryPending, setGalleryPending] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const galleryTotal = useMemo(() => gallery.length + galleryPending.length, [gallery.length, galleryPending.length]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMedia() {
      setLoading(true);
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data: MeResponse = await res.json();
        if (!data.professional) throw new Error("missing-profile");
        const media = normalizeMedia(data);
        setProfileId(data.professional.id);
        setProfileSlug(data.professional.slug);
        setProfilePhoto(media.profilePhoto);
        setCoverPhoto(media.coverPhoto);
        setGallery(media.gallery);
      } catch {
        if (!controller.signal.aborted) toast.error("Não foi possível carregar suas fotos agora.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadMedia();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (profilePending) URL.revokeObjectURL(profilePending.preview);
      if (coverPending) URL.revokeObjectURL(coverPending.preview);
      galleryPending.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [coverPending, galleryPending, profilePending]);

  function setSinglePending(kind: "profile" | "cover", file: File) {
    const error = validateImage(file);
    if (error) {
      toast.error(error);
      return;
    }
    const pending = createPending(file);
    if (kind === "profile") {
      if (profilePending) URL.revokeObjectURL(profilePending.preview);
      setProfilePending(pending);
    } else {
      if (coverPending) URL.revokeObjectURL(coverPending.preview);
      setCoverPending(pending);
    }
  }

  function handleSingleInput(kind: "profile" | "cover", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setSinglePending(kind, file);
    event.target.value = "";
  }

  function handleGalleryInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) {
      toast.error("Escolha uma imagem válida.");
      return;
    }
    if (galleryTotal + files.length > MAX_GALLERY) {
      toast.error(`Você pode manter até ${MAX_GALLERY} fotos na galeria.`);
      return;
    }
    const next: PendingFile[] = [];
    for (const file of files) {
      const error = validateImage(file);
      if (error) {
        toast.error(error);
        return;
      }
      next.push(createPending(file));
    }
    setGalleryPending((current) => [...current, ...next]);
  }

  async function uploadImage(file: File) {
    if (!profileId) throw new Error("Perfil profissional não encontrado.");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/upload?folder=profiles/${profileId}`, { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      throw new Error(typeof data.error === "string" ? data.error : "Não foi possível enviar agora. Tente novamente.");
    }
    return data.url as string;
  }

  async function saveUserImage(image: string | null) {
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível atualizar sua foto agora.");
  }

  async function saveProfessionalPhotos(nextCover: string | null, nextGallery: string[]) {
    if (!profileSlug) throw new Error("Perfil profissional não encontrado.");
    const photos = [
      ...(nextCover ? [{ url: nextCover, cover: true, order: 0 }] : []),
      ...nextGallery.map((url, index) => ({ url, cover: false, order: nextCover ? index + 1 : index })),
    ];
    const res = await fetch(`/api/professionals/${profileSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível salvar suas fotos agora.");
  }

  async function publishProfilePhoto() {
    if (!profilePending) {
      toast.error("Escolha uma imagem válida.");
      return;
    }
    setSavingKey("profile");
    try {
      const url = await uploadImage(profilePending.file);
      await saveUserImage(url);
      setProfilePhoto(url);
      URL.revokeObjectURL(profilePending.preview);
      setProfilePending(null);
      toast.success("Sua foto foi atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  async function publishCoverPhoto() {
    if (!coverPending) {
      toast.error("Escolha uma imagem válida.");
      return;
    }
    setSavingKey("cover");
    try {
      const url = await uploadImage(coverPending.file);
      await saveProfessionalPhotos(url, gallery);
      setCoverPhoto(url);
      URL.revokeObjectURL(coverPending.preview);
      setCoverPending(null);
      toast.success("Capa atualizada com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  async function publishGalleryPhotos() {
    if (!galleryPending.length) {
      toast.error("Escolha uma imagem válida.");
      return;
    }
    setSavingKey("gallery");
    try {
      const uploaded: string[] = [];
      for (const pending of galleryPending) {
        uploaded.push(await uploadImage(pending.file));
      }
      const nextGallery = [...gallery, ...uploaded];
      await saveProfessionalPhotos(coverPhoto, nextGallery);
      setGallery(nextGallery);
      galleryPending.forEach((item) => URL.revokeObjectURL(item.preview));
      setGalleryPending([]);
      toast.success(uploaded.length === 1 ? "Foto publicada com sucesso." : "Fotos publicadas com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeProfilePhoto() {
    setSavingKey("profile-remove");
    try {
      await saveUserImage(null);
      setProfilePhoto(null);
      toast.success("Sua foto foi removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeCoverPhoto() {
    setSavingKey("cover-remove");
    try {
      await saveProfessionalPhotos(null, gallery);
      setCoverPhoto(null);
      toast.success("Capa removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  async function removeGalleryPhoto(url: string) {
    const nextGallery = gallery.filter((item) => item !== url);
    setSavingKey(url);
    try {
      await saveProfessionalPhotos(coverPhoto, nextGallery);
      setGallery(nextGallery);
      toast.success("Foto removida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover agora. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  function removePendingGallery(index: number) {
    setGalleryPending((current) => {
      const item = current[index];
      if (item) URL.revokeObjectURL(item.preview);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  if (loading) {
    return (
      <div className="professional-premium-page">
        <div className="premium-section-card">
          <div className="premium-skeleton" style={{ height: 28, width: 220, borderRadius: 999 }} />
          <div className="premium-skeleton" style={{ height: 180, width: "100%", borderRadius: 22, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="professional-premium-page">
      <PremiumHeroCard
        eyebrow="Fotos profissionais"
        title={<>Fotos, <span className="gold">capa</span> e galeria</>}
        subtitle="Separe a imagem principal, a capa do anúncio e as fotos recentes que ajudam clientes a confiar no seu perfil."
        illustration="camera"
      />

      <PremiumSection eyebrow="Imagem principal" title="Foto de perfil" description="Essa é a imagem principal do seu perfil.">
        <MediaEditor
          icon={<UserRound size={34} />}
          currentUrl={profilePending?.preview ?? profilePhoto}
          emptyLabel="Nenhuma foto de perfil publicada."
          primaryLabel={profilePhoto ? "Trocar foto" : "Adicionar foto"}
          removeLabel="Remover foto"
          inputRef={profileInputRef}
          accept="image/jpeg,image/png,image/webp"
          onPick={() => profileInputRef.current?.click()}
          onInput={(event) => handleSingleInput("profile", event)}
          onPublish={publishProfilePhoto}
          onRemove={profilePhoto ? removeProfilePhoto : undefined}
          pending={Boolean(profilePending)}
          saving={savingKey === "profile" || savingKey === "profile-remove"}
        />
      </PremiumSection>

      <PremiumSection eyebrow="Topo do anúncio" title="Foto de capa" description="Essa imagem aparece no topo do seu anúncio e nos cards de listagem.">
        <MediaEditor
          icon={<ImageIcon size={34} />}
          currentUrl={coverPending?.preview ?? coverPhoto}
          emptyLabel="Nenhuma capa publicada."
          primaryLabel={coverPhoto ? "Trocar capa" : "Adicionar capa"}
          removeLabel="Remover capa"
          inputRef={coverInputRef}
          accept="image/jpeg,image/png,image/webp"
          onPick={() => coverInputRef.current?.click()}
          onInput={(event) => handleSingleInput("cover", event)}
          onPublish={publishCoverPhoto}
          onRemove={coverPhoto ? removeCoverPhoto : undefined}
          pending={Boolean(coverPending)}
          saving={savingKey === "cover" || savingKey === "cover-remove"}
        />
      </PremiumSection>

      <PremiumSection eyebrow="Portfólio" title="Galeria de fotos" description="Adicione fotos recentes para aumentar a confiança dos clientes.">
        <section className="premium-card" style={{ padding: 18 }}>
          <div className="premium-upload-zone" style={{ padding: 22, cursor: "pointer" }} onClick={() => galleryInputRef.current?.click()}>
            <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleGalleryInput} />
            <div style={{ display: "grid", placeItems: "center", gap: 10, textAlign: "center" }}>
              <Images size={36} color="var(--elite-gold-light)" />
              <strong style={{ color: "#fff" }}>Postar fotos</strong>
              <span style={{ color: "var(--elite-text-muted)", fontSize: 13 }}>JPG, PNG ou WebP. Até {MAX_GALLERY} fotos, {formatSize(MAX_IMAGE_BYTES)} cada.</span>
            </div>
          </div>

          {galleryPending.length ? (
            <div style={{ marginTop: 18 }}>
              <p className="premium-eyebrow">Preview antes de publicar</p>
              <PhotoGrid
                items={galleryPending.map((item) => item.preview)}
                savingKey={savingKey}
                onRemove={(url) => removePendingGallery(galleryPending.findIndex((item) => item.preview === url))}
              />
              <button type="button" onClick={publishGalleryPhotos} disabled={savingKey === "gallery"} className="premium-button" style={{ width: "100%", marginTop: 14 }}>
                {savingKey === "gallery" ? <Loader2 size={18} className="spin" /> : <UploadCloud size={18} />}
                {savingKey === "gallery" ? "Enviando..." : "Publicar fotos"}
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <p className="premium-eyebrow">Fotos publicadas</p>
              <p style={{ margin: "8px 0 0", color: "var(--elite-text-muted)", fontSize: 13 }}>{gallery.length}/{MAX_GALLERY} fotos na galeria</p>
            </div>
            <button type="button" onClick={() => galleryInputRef.current?.click()} className="premium-button-secondary">
              <Camera size={17} />
              Adicionar
            </button>
          </div>

          {gallery.length ? (
            <PhotoGrid items={gallery} savingKey={savingKey} onRemove={removeGalleryPhoto} />
          ) : (
            <div className="premium-empty-state" style={{ marginTop: 18 }}>
              Nenhuma foto de galeria publicada ainda.
            </div>
          )}
        </section>
      </PremiumSection>
    </div>
  );
}

function MediaEditor({
  icon,
  currentUrl,
  emptyLabel,
  primaryLabel,
  removeLabel,
  inputRef,
  accept,
  onPick,
  onInput,
  onPublish,
  onRemove,
  pending,
  saving,
}: {
  icon: ReactNode;
  currentUrl: string | null;
  emptyLabel: string;
  primaryLabel: string;
  removeLabel: string;
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  onPick: () => void;
  onInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onPublish: () => void;
  onRemove?: () => void;
  pending: boolean;
  saving: boolean;
}) {
  return (
    <section className="premium-card" style={{ padding: 18 }}>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={onInput} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)", gap: 18, alignItems: "center" }}>
        <div style={{ aspectRatio: "4 / 5", borderRadius: 22, border: "1px solid var(--elite-border-soft)", overflow: "hidden", background: "rgba(255,255,255,0.035)", display: "grid", placeItems: "center" }}>
          {currentUrl ? <img src={currentUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "var(--elite-gold-light)" }}>{icon}</span>}
        </div>
        <div>
          <p style={{ margin: 0, color: currentUrl ? "var(--elite-success)" : "var(--elite-text-muted)", fontWeight: 900 }}>
            {pending ? "Preview pronto para publicar." : currentUrl ? "Imagem publicada." : emptyLabel}
          </p>
          <p style={{ margin: "8px 0 0", color: "var(--elite-text-muted)", lineHeight: 1.6, fontSize: 14 }}>
            Escolha uma imagem nítida em JPG, PNG ou WebP. Você pode conferir o preview antes de publicar.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            <button type="button" onClick={onPick} disabled={saving} className="premium-button-secondary">
              <UploadCloud size={17} />
              {primaryLabel}
            </button>
            {pending ? (
              <button type="button" onClick={onPublish} disabled={saving} className="premium-button">
                {saving ? <Loader2 size={17} className="spin" /> : <Camera size={17} />}
                {saving ? "Enviando..." : "Publicar"}
              </button>
            ) : null}
            {onRemove ? (
              <button type="button" onClick={onRemove} disabled={saving} className="premium-button-secondary">
                {saving ? <Loader2 size={17} className="spin" /> : <Trash2 size={17} />}
                {removeLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
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
    </section>
  );
}

function PhotoGrid({ items, onRemove, savingKey }: { items: string[]; onRemove: (url: string) => void; savingKey: string | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 14 }}>
      {items.map((url, index) => (
        <div key={`${url}-${index}`} style={{ position: "relative", aspectRatio: "4 / 5", borderRadius: 18, overflow: "hidden", border: "1px solid var(--elite-border-soft)", background: "rgba(255,255,255,0.04)" }}>
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            type="button"
            onClick={() => onRemove(url)}
            disabled={savingKey === url}
            aria-label="Remover foto"
            style={{ position: "absolute", right: 8, top: 8, width: 36, height: 36, borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.62)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}
          >
            {savingKey === url ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      ))}
      <style jsx>{`
        .spin {
          animation: spin 900ms linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
