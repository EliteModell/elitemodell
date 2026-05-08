"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type StoryItem = { id: string; mediaUrl: string; mediaType: string; thumbnail: string | null; views: number; createdAt: string };
type StoryGroup = { userId: string; nome: string; foto: string | null; stories: StoryItem[]; visto?: boolean };

export default function Stories() {
  const { data: session } = useSession();
  const rowRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [grupos, setGrupos] = useState<StoryGroup[]>([]);
  const [aberto, setAberto] = useState<{ grupo: StoryGroup; idx: number } | null>(null);
  const [vistos, setVistos] = useState<Set<string>>(new Set());
  const [progresso, setProgresso] = useState(0);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/stories");
      if (res.ok) setGrupos(await res.json());
    } catch {}
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function scroll(dir: "left" | "right") {
    rowRef.current?.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  }

  function iniciarProgresso(onEnd: () => void) {
    setProgresso(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgresso((p) => {
        if (p >= 100) { clearInterval(timerRef.current!); onEnd(); return 0; }
        return p + (p < 90 ? 1 : 2);
      });
    }, 50);
  }

  function abrirGrupo(grupo: StoryGroup, idx = 0) {
    if (timerRef.current) clearInterval(timerRef.current);
    setAberto({ grupo, idx });
    setVistos((v) => new Set([...v, grupo.userId]));
    // registra view
    fetch(`/api/stories/${grupo.stories[idx].id}`, { method: "PATCH" }).catch(() => {});
    iniciarProgresso(() => {
      const proximo = idx + 1;
      if (proximo < grupo.stories.length) abrirGrupo(grupo, proximo);
      else setAberto(null);
    });
  }

  function fechar() {
    if (timerRef.current) clearInterval(timerRef.current);
    setAberto(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) { alert("Erro no upload. Configure o Cloudinary no .env"); return; }
      const { url, type, thumbnail } = await up.json();
      await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaUrl: url, mediaType: type, thumbnail }) });
      await carregar();
    } catch { alert("Erro ao publicar story."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const story = aberto ? aberto.grupo.stories[aberto.idx] : null;

  return (
    <>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <div ref={rowRef} style={{ display: "flex", gap: 14, overflowX: "auto", scrollbarWidth: "none", padding: "4px 32px" }}>

          {/* Botão adicionar story (só para logados) */}
          {session && (
            <div onClick={() => fileRef.current?.click()}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: uploading ? "wait" : "pointer", flexShrink: 0, opacity: uploading ? 0.6 : 1 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1a1a1a", border: "2px dashed #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#555", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d4a843")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}>
                {uploading ? "⏳" : "+"}
              </div>
              <span style={{ fontSize: 10, color: "#555", fontWeight: 500 }}>Seu story</span>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleUpload} />
            </div>
          )}

          {/* Stories da API */}
          {grupos.map((g) => {
            const visto = vistos.has(g.userId);
            return (
              <div key={g.userId} onClick={() => abrirGrupo(g)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", padding: 2, background: visto ? "linear-gradient(135deg,#333,#555)" : "linear-gradient(135deg,#d4a843,#f0c060,#c9963a)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid #0a0a0a", background: "#1a1a1a" }}>
                    {g.foto
                      ? <img src={g.foto} alt={g.nome} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#555" }}>👤</div>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 10, color: visto ? "#555" : "#ccc", fontWeight: visto ? 400 : 600, maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.nome.split(" ")[0]}
                </span>
              </div>
            );
          })}

          {/* Placeholder quando vazio */}
          {grupos.length === 0 && !session && (
            <p style={{ fontSize: 12, color: "#333", alignSelf: "center", padding: "0 8px" }}>Nenhum story ativo</p>
          )}
        </div>

        <button onClick={() => scroll("left")} style={{ position: "absolute", left: 0, top: "38%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", background: "rgba(20,20,20,0.95)", border: "1px solid #2a2a2a", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>‹</button>
        <button onClick={() => scroll("right")} style={{ position: "absolute", right: 0, top: "38%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: "50%", background: "rgba(20,20,20,0.95)", border: "1px solid #2a2a2a", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>›</button>
      </div>

      {/* Viewer */}
      {aberto && story && (
        <div onClick={fechar} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(380px, 95vw)", borderRadius: 16, overflow: "hidden", position: "relative", background: "#000" }}>
            {/* Barras de progresso (uma por story do grupo) */}
            <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 3, zIndex: 3 }}>
              {aberto.grupo.stories.map((s, i) => (
                <div key={s.id} style={{ flex: 1, height: 2, background: "#333", borderRadius: 2 }}>
                  <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#d4a843,#cc0000)", width: i < aberto.idx ? "100%" : i === aberto.idx ? `${progresso}%` : "0%", transition: i === aberto.idx ? "width 0.05s linear" : "none" }} />
                </div>
              ))}
            </div>

            {/* Mídia */}
            <div style={{ position: "relative", paddingTop: "170%", background: "#111" }}>
              {story.mediaType === "video"
                ? <video src={story.mediaUrl} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                : <img src={story.mediaUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              }
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)" }} />
            </div>

            {/* Header */}
            <div style={{ position: "absolute", top: 20, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #d4a843", background: "#1a1a1a" }}>
                  {aberto.grupo.foto && <img src={aberto.grupo.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#fff" }}>{aberto.grupo.nome}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#aaa" }}>{new Date(story.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <button onClick={fechar} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Views */}
            <div style={{ position: "absolute", bottom: 14, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>👁 {story.views} visualizações</span>
            </div>
          </div>
        </div>
      )}

      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </>
  );
}
