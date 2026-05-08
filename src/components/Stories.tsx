"use client";
import { useRef, useState } from "react";

const STORIES = [
  { id: 1, nome: "Amanda R.", foto: "/model1.jpg", visto: false },
  { id: 2, nome: "Letícia M.", foto: "/model2.jpg", visto: false },
  { id: 3, nome: "Bruna S.", foto: "/model1.jpg", visto: true },
  { id: 4, nome: "Fernanda K.", foto: "/model2.jpg", visto: false },
  { id: 5, nome: "Valentina G.", foto: "/model1.jpg", visto: false },
  { id: 6, nome: "Isabela C.", foto: "/model2.jpg", visto: true },
  { id: 7, nome: "Melissa F.", foto: "/model1.jpg", visto: false },
  { id: 8, nome: "Luna P.", foto: "/model2.jpg", visto: false },
  { id: 9, nome: "Bianca T.", foto: "/model1.jpg", visto: true },
  { id: 10, nome: "Sophia A.", foto: "/model2.jpg", visto: false },
];

export default function Stories() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState<typeof STORIES[0] | null>(null);
  const [vistos, setVistos] = useState<Set<number>>(new Set());
  const [progresso, setProgresso] = useState(0);

  function scroll(dir: "left" | "right") {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  }

  function abrirStory(s: typeof STORIES[0]) {
    setAberto(s);
    setVistos((prev) => new Set([...prev, s.id]));
    setProgresso(0);
    const timer = setInterval(() => {
      setProgresso((p) => {
        if (p >= 100) { clearInterval(timer); setAberto(null); return 0; }
        return p + 2;
      });
    }, 80);
  }

  return (
    <>
      <div style={{ position: "relative", marginBottom: 24 }}>
        {/* Row com padding para as setas ficarem por cima */}
        <div ref={rowRef} style={{ display: "flex", gap: 16, overflowX: "auto", scrollbarWidth: "none", padding: "4px 36px" }}>
          {STORIES.map((s) => {
            const visto = vistos.has(s.id) || s.visto;
            return (
              <div key={s.id} onClick={() => abrirStory(s)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                {/* Círculo com borda */}
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  padding: 2,
                  background: visto
                    ? "linear-gradient(135deg, #333 0%, #555 100%)"
                    : "linear-gradient(135deg, #d4a843 0%, #f0c060 50%, #c9963a 100%)",
                }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid #0a0a0a" }}>
                    <img src={s.foto} alt={s.nome}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, color: visto ? "#555" : "#ccc", fontWeight: visto ? 400 : 600, maxWidth: 64, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.nome.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Botão esquerda */}
        <button onClick={() => scroll("left")}
          style={{ position: "absolute", left: 0, top: "38%", transform: "translateY(-50%)", zIndex: 2, width: 28, height: 28, borderRadius: "50%", background: "rgba(20,20,20,0.9)", border: "1px solid #333", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ‹
        </button>

        {/* Botão direita */}
        <button onClick={() => scroll("right")}
          style={{ position: "absolute", right: 0, top: "38%", transform: "translateY(-50%)", zIndex: 2, width: 28, height: 28, borderRadius: "50%", background: "rgba(20,20,20,0.9)", border: "1px solid #333", color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ›
        </button>
      </div>

      {/* Modal Story */}
      {aberto && (
        <div onClick={() => setAberto(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "min(380px, 95vw)", borderRadius: 16, overflow: "hidden", position: "relative", background: "#111" }}>

            {/* Barra de progresso */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#333", zIndex: 2 }}>
              <div style={{ height: "100%", width: `${progresso}%`, background: "linear-gradient(90deg, #d4a843, #cc0000)", transition: "width 0.08s linear" }} />
            </div>

            {/* Foto */}
            <div style={{ position: "relative", paddingTop: "160%", background: "#1a1a1a" }}>
              <img src={aberto.foto} alt={aberto.nome}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
            </div>

            {/* Info */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid #d4a843" }}>
                  <img src={aberto.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff" }}>{aberto.nome}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>Agora mesmo</p>
                </div>
              </div>
              <button onClick={() => setAberto(null)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
