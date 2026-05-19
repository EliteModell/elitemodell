"use client";
/* eslint-disable @next/next/no-img-element -- Fotos novas usam blob: URLs locais para preview imediato antes do upload. */
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type Photo = {
  id: string;
  url: string;
  cover: boolean;
  order: number;
};

const mockPhotos: Photo[] = [
  { id: "ph1", url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop", cover: true, order: 0 },
  { id: "ph2", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop", cover: false, order: 1 },
  { id: "ph3", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop", cover: false, order: 2 },
  { id: "ph4", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop", cover: false, order: 3 },
];

export default function ProfissionalFotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localObjectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const localObjectUrls = localObjectUrlsRef.current;
    return () => {
      localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
      localObjectUrls.clear();
    };
  }, []);

  function setCover(id: string) {
    setPhotos((prev) => prev.map((p) => ({ ...p, cover: p.id === id })));
    toast.success("Foto de capa atualizada.");
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed?.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
        localObjectUrlsRef.current.delete(removed.url);
      }
      return prev.filter((p) => p.id !== id);
    });
    toast.success("Foto removida.");
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setPhotos((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(idx: number) {
    setPhotos((prev) => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
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
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    handleFiles(files);
  }

  function handleFiles(files: File[]) {
    if (photos.length + files.length > 12) {
      toast.error("Máximo de 12 fotos permitidas.");
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      localObjectUrlsRef.current.add(url);
      const newPhoto: Photo = {
        id: `ph-${Date.now()}-${Math.random()}`,
        url,
        cover: photos.length === 0,
        order: photos.length,
      };
      setPhotos((prev) => [...prev, newPhoto]);
    });
    toast.success(`${files.length} foto(s) adicionada(s).`);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleFiles(files);
    e.target.value = "";
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Portfólio de Fotos</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Gerencie suas fotos profissionais. Até 12 fotos. A foto de capa aparece nos resultados de busca.</p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#cc0000" : "#2a2a2a"}`,
          borderRadius: 12,
          padding: "36px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(204,0,0,0.04)" : "#0d0d0d",
          transition: "all 0.2s",
          marginBottom: 28,
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleInputChange} />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#cc0000" : "#333"} strokeWidth="1.5" style={{ margin: "0 auto 12px" }}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div style={{ color: dragging ? "#cc0000" : "#555", fontSize: 14, fontWeight: 600 }}>
          {dragging ? "Solte as fotos aqui" : "Arraste fotos ou clique para selecionar"}
        </div>
        <div style={{ color: "#333", fontSize: 12, marginTop: 4 }}>
          JPG, PNG ou WEBP — máximo 12 fotos, 5 MB cada
        </div>
        <div style={{ marginTop: 14 }}>
          <span style={{ padding: "8px 20px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 8, color: "#cc4444", fontSize: 13, fontWeight: 600 }}>
            Selecionar arquivos
          </span>
        </div>
      </div>

      {/* Counter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "#555", fontSize: 13 }}>{photos.length}/12 fotos</span>
        {photos.length > 0 && (
          <button
            onClick={() => { toast.success("Alterações salvas!"); }}
            style={{ padding: "7px 18px", background: "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Salvar ordem
          </button>
        )}
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <div style={{ color: "#555", fontSize: 14 }}>Nenhuma foto adicionada ainda.</div>
          <div style={{ color: "#333", fontSize: 13, marginTop: 4 }}>Adicione fotos do seu trabalho para atrair mais clientes.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {photos.map((photo, idx) => (
            <div key={photo.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `2px solid ${photo.cover ? "#cc0000" : "#1e1e1e"}`, background: "#111", aspectRatio: "4/5" }}>
              {/* Photo */}
              <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

              {/* Cover badge */}
              {photo.cover && (
                <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", background: "#cc0000", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  CAPA
                </div>
              )}

              {/* Order badge */}
              <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#ccc", fontWeight: 700 }}>
                {idx + 1}
              </div>

              {/* Actions overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 8, gap: 4 }}>
                {/* Reorder buttons */}
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: idx === 0 ? "#444" : "#ccc", fontSize: 11, cursor: idx === 0 ? "default" : "pointer" }}>
                    ← Ant.
                  </button>
                  <button onClick={() => moveDown(idx)} disabled={idx === photos.length - 1}
                    style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: idx === photos.length - 1 ? "#444" : "#ccc", fontSize: 11, cursor: idx === photos.length - 1 ? "default" : "pointer" }}>
                    Próx. →
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

      {/* Tips */}
      <div style={{ marginTop: 28, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: "#555", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Dicas para melhores resultados</div>
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {[
            "Use fotos em alta resolução (mínimo 800×1000px)",
            "Prefira iluminação natural ou estúdio profissional",
            "Varie os looks: editorial, casual, fitness, etc.",
            "A foto de capa é a mais importante — escolha sua melhor foto",
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
