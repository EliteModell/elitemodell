"use client";
/* eslint-disable @next/next/no-img-element -- A tela gerencia URLs remotas e previews de portfólio vindos do Supabase. */
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type Photo = {
  id: string;
  url: string;
  cover: boolean;
  order: number;
};

type MeResponse = {
  professional?: {
    id: string;
    slug: string;
    image?: string | null;
    galleryUrls?: string[];
  } | null;
};

function photosFromProfile(profile: NonNullable<MeResponse["professional"]>): Photo[] {
  const urls = [profile.image, ...(profile.galleryUrls ?? [])].filter(Boolean) as string[];
  return Array.from(new Set(urls)).map((url, index) => ({
    id: `${index}-${url}`,
    url,
    cover: index === 0,
    order: index,
  }));
}

export default function ProfissionalFotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPhotos() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load profile");
        const data: MeResponse = await res.json();
        if (!data.professional) {
          setError("Nenhum perfil profissional encontrado para esta conta.");
          return;
        }
        setProfileId(data.professional.id);
        setProfileSlug(data.professional.slug);
        setPhotos(photosFromProfile(data.professional));
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível carregar suas fotos agora.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPhotos();
    return () => controller.abort();
  }, []);

  async function persistPhotos(nextPhotos: Photo[], successMessage = "Alterações salvas!") {
    if (!profileSlug) {
      toast.error("Perfil profissional não encontrado.");
      return false;
    }
    const ordered = nextPhotos.map((photo, index) => ({ ...photo, order: index }));
    const cover = ordered.find((photo) => photo.cover) ?? ordered[0];
    const normalized = ordered.map((photo) => ({ ...photo, cover: cover ? photo.url === cover.url : false }));

    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${profileSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: cover?.url ?? null,
          galleryUrls: cover ? normalized.filter((photo) => photo.url !== cover.url).map((photo) => photo.url) : [],
        }),
      });
      if (!res.ok) throw new Error("Failed to save photos");
      setPhotos(normalized);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Não foi possível salvar as fotos.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function setCover(id: string) {
    const next = photos.map((p) => ({ ...p, cover: p.id === id }));
    setPhotos(next);
    void persistPhotos(next, "Foto de capa atualizada.");
  }

  function removePhoto(id: string) {
    const remaining = photos.filter((p) => p.id !== id).map((p, index) => ({ ...p, order: index }));
    const hasCover = remaining.some((p) => p.cover);
    const next = hasCover ? remaining : remaining.map((p, index) => ({ ...p, cover: index === 0 }));
    setPhotos(next);
    void persistPhotos(next, "Foto removida.");
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setPhotos((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((p, index) => ({ ...p, order: index }));
    });
  }

  function moveDown(idx: number) {
    setPhotos((prev) => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((p, index) => ({ ...p, order: index }));
    });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void handleFiles(files);
  }

  async function handleFiles(files: File[]) {
    if (!profileId) {
      toast.error("Perfil profissional não encontrado.");
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    if (photos.length + images.length > 12) {
      toast.error("Máximo de 12 fotos permitidas.");
      return;
    }
    const oversized = images.find((file) => file.size > 5 * 1024 * 1024);
    if (oversized) {
      toast.error("Cada foto deve ter no máximo 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const uploaded: Photo[] = [];
      for (const file of images) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/upload?folder=profiles/${profileId}`, { method: "POST", body });
        if (!res.ok) throw new Error("Upload failed");
        const data: { url?: string | null } = await res.json();
        if (!data.url) throw new Error("Missing upload URL");
        uploaded.push({
          id: `${Date.now()}-${file.name}-${uploaded.length}`,
          url: data.url,
          cover: photos.length === 0 && uploaded.length === 0,
          order: photos.length + uploaded.length,
        });
      }
      const next = [...photos, ...uploaded];
      setPhotos(next);
      await persistPhotos(next, `${uploaded.length} foto(s) enviada(s).`);
    } catch {
      toast.error("Não foi possível enviar uma ou mais fotos.");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void handleFiles(files);
    e.target.value = "";
  }

  if (loading) {
    return (
      <div className="premium-card premium-enter" style={{ borderRadius: 8, padding: 24 }}>
        <div className="premium-skeleton" style={{ height: 24, width: 220, borderRadius: 999 }} />
        <div className="premium-skeleton" style={{ height: 12, width: "70%", borderRadius: 999, marginTop: 14 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-empty-state premium-enter" style={{ borderRadius: 8, padding: 32, color: "#aaa" }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Portfólio de fotos</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Gerencie fotos reais salvas no Supabase. A foto de capa aparece nos resultados de busca.</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#cc0000" : "#2a2a2a"}`,
          borderRadius: 18,
          padding: "36px 24px",
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          background: dragging ? "rgba(204,0,0,0.04)" : "#0d0d0d",
          transition: "all 0.2s",
          marginBottom: 28,
          opacity: uploading ? 0.75 : 1,
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleInputChange} disabled={uploading} />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#cc0000" : "#333"} strokeWidth="1.5" style={{ margin: "0 auto 12px" }}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ color: dragging ? "#cc0000" : "#555", fontSize: 14, fontWeight: 600 }}>
          {uploading ? "Enviando fotos..." : dragging ? "Solte as fotos aqui" : "Arraste fotos ou clique para selecionar"}
        </div>
        <div style={{ color: "#333", fontSize: 12, marginTop: 4 }}>
          JPG, PNG ou WEBP - máximo 12 fotos, 5 MB cada
        </div>
        <div style={{ marginTop: 14 }}>
          <span style={{ padding: "10px 20px", background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.32)", borderRadius: 12, color: "#f5d78c", fontSize: 13, fontWeight: 800 }}>
            Selecionar arquivos
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "#555", fontSize: 13 }}>{photos.length}/12 fotos</span>
        {photos.length > 0 && (
          <button
            onClick={() => void persistPhotos(photos, "Ordem salva!")}
            disabled={saving}
            style={{ padding: "7px 18px", background: saving ? "#8a0000" : "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? "Salvando..." : "Salvar ordem"}
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>Foto</div>
          <div style={{ color: "#555", fontSize: 14 }}>Nenhuma foto adicionada ainda.</div>
          <div style={{ color: "#333", fontSize: 13, marginTop: 4 }}>Adicione fotos do seu trabalho para atrair mais clientes.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {photos.map((photo, idx) => (
            <div key={photo.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `2px solid ${photo.cover ? "#cc0000" : "#1e1e1e"}`, background: "#111", aspectRatio: "4/5" }}>
              <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

              {photo.cover && (
                <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", background: "#cc0000", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  CAPA
                </div>
              )}

              <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#ccc", fontWeight: 700 }}>
                {idx + 1}
              </div>

              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 8, gap: 4 }}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: idx === 0 ? "#444" : "#ccc", fontSize: 11, cursor: idx === 0 ? "default" : "pointer" }}>
                    Ant.
                  </button>
                  <button onClick={() => moveDown(idx)} disabled={idx === photos.length - 1}
                    style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: idx === photos.length - 1 ? "#444" : "#ccc", fontSize: 11, cursor: idx === photos.length - 1 ? "default" : "pointer" }}>
                    Prox.
                  </button>
                </div>

                <div style={{ display: "flex", gap: 4 }}>
                  {!photo.cover && (
                    <button onClick={() => setCover(photo.id)}
                      style={{ flex: 1, padding: "5px 4px", background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.4)", borderRadius: 6, color: "#cc6666", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                      Def. capa
                    </button>
                  )}
                  <button onClick={() => removePhoto(photo.id)}
                    style={{ flex: 1, padding: "5px 4px", background: "rgba(80,0,0,0.2)", border: "1px solid rgba(150,0,0,0.3)", borderRadius: 6, color: "#cc4444", fontSize: 10, cursor: "pointer" }}>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28, background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Dicas para melhores resultados</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {[
            "Use fotos em alta resolução (mínimo 800x1000px)",
            "Prefira iluminação natural ou estúdio profissional",
            "Varie os looks: editorial, casual, fitness, etc.",
            "A foto de capa é a mais importante - escolha sua melhor foto",
            "Mantenha o portfólio atualizado com trabalhos recentes",
          ].map((tip) => (
            <li key={tip} style={{ color: "#444", fontSize: 12, marginBottom: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>

      <style>{`
        @media (max-width: 600px) {
          div[style*="minmax(200px"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
