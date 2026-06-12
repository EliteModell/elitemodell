"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

type StoryItem = { id: string; mediaUrl: string; mediaType: string; thumbnail: string | null; views: number; createdAt: string };
type StoryGroup = { userId: string; slug: string; nome: string; foto: string | null; stories: StoryItem[]; visto?: boolean };

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

  const carregar = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/stories", { signal });
      if (res.ok) setGrupos(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void carregar(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [carregar]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      fd.append("contentDeclarationAccepted", "true");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const uploaded = await up.json().catch(() => ({}));
      if (!up.ok || !uploaded.url) {
        alert(uploaded.error || uploaded.message || "Arquivo aguardando revisão.");
        return;
      }
      const { url, type, thumbnail } = uploaded;
      await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaUrl: url, mediaType: type, thumbnail }) });
      await carregar();
    } catch { alert("Erro ao publicar story."); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const story = aberto ? aberto.grupo.stories[aberto.idx] : null;
  const canPostStory = Boolean(session?.user?.isProfessional);

  if (grupos.length === 0 && !canPostStory) return null;

  return (
    <>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <div ref={rowRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollbarWidth: "none", padding: "18px 40px 12px 8px", WebkitOverflowScrolling: "touch" }}>

          {/* Botão adicionar story (só para profissionais) */}
          {canPostStory && (
            <div onClick={() => fileRef.current?.click()}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: uploading ? "wait" : "pointer", flexShrink: 0, opacity: uploading ? 0.6 : 1 }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#0f172a", border: "2px dashed rgba(212,168,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#475569" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d4a843")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,67,0.3)")}>
                {uploading ? "..." : "+"}
              </div>
              <span style={{ fontSize: 10, color: "#475569", fontWeight: 600, fontFamily: "var(--font-playfair), serif" }}>Seu story</span>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleUpload} />
            </div>
          )}

          {/* Stories da API */}
          {grupos.map((g) => {
            const visto = vistos.has(g.userId);
            return (
              <div key={g.userId} onClick={() => abrirGrupo(g)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 70, height: 70, borderRadius: "50%", padding: 2.5, background: visto ? "linear-gradient(135deg,#334155,#475569)" : "linear-gradient(135deg,#ffe5a0,#d4a843,#f0c060,#9e7b2a)" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2.5px solid #060e1b", background: "#0f172a", position: "relative" }}>
                    {g.foto
                      ? <Image src={g.foto} alt={g.nome} fill sizes="70px" style={{ objectFit: "cover", objectPosition: "top" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#475569" }}>✦</div>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 10, color: visto ? "#475569" : "#cbd5e1", fontWeight: 600, maxWidth: 70, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-playfair), serif" }}>
                  {g.nome.split(" ")[0]}
                </span>
              </div>
            );
          })}

        </div>

        {/* Setas navegação */}
        <button onClick={() => scroll("left")} style={{ position: "absolute", left: 0, top: "40%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(6,14,27,0.9)", border: "1px solid rgba(212,168,67,0.2)", color: "#d4a843", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>‹</button>
        <button onClick={() => scroll("right")} style={{ position: "absolute", right: 0, top: "40%", transform: "translateY(-50%)", width: 28, height: 28, borderRadius: "50%", background: "rgba(6,14,27,0.9)", border: "1px solid rgba(212,168,67,0.2)", color: "#d4a843", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>›</button>
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
                ? <video src={story.mediaUrl} poster={story.thumbnail ?? undefined} autoPlay loop muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                : <Image src={story.mediaUrl} alt="" fill sizes="min(380px, 95vw)" style={{ objectFit: "cover" }} />
              }
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)" }} />
            </div>

            {/* Header */}
            <div style={{ position: "absolute", top: 20, left: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #d4a843", background: "#1a1a1a", position: "relative" }}>
                  {aberto.grupo.foto && <Image src={aberto.grupo.foto} alt="" fill sizes="32px" style={{ objectFit: "cover" }} />}
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
            <a href={`/profissionais/${aberto.grupo.slug}`} style={{ position: "absolute", right: 14, bottom: 12, zIndex: 3, borderRadius: 999, background: "#d4a843", color: "#060e1b", padding: "7px 12px", textDecoration: "none", fontSize: 11, fontWeight: 900 }}>
              Ver perfil
            </a>
          </div>
        </div>
      )}

      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </>
  );
}
