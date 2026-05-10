"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const GOLD = "#d4a843";

interface Props {
  professionalId: string;
  appointmentId:  string;
  onSubmitted?: () => void;
}

export default function ReviewForm({ professionalId, appointmentId, onSubmitted }: Props) {
  const [rating, setRating]     = useState(0);
  const [hover, setHover]       = useState(0);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit() {
    if (rating < 1) return toast.error("Selecione uma nota.");
    if (comment.trim().length < 10) return toast.error("Comentário precisa ter pelo menos 10 caracteres.");
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId, appointmentId, rating, comment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao enviar avaliação.");
      toast.success("Avaliação enviada!");
      onSubmitted?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar avaliação.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ background: "#0b1420", border: `1px solid rgba(212,168,67,0.18)`, borderRadius: 14, padding: 20 }}>
      <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Avalie sua experiência</h3>

      {/* Star rating */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: 32, lineHeight: 1, color: (hover || rating) >= n ? GOLD : "#1e293b", transition: "color 0.15s" }}>
            ★
          </button>
        ))}
        <span style={{ alignSelf: "center", marginLeft: 12, color: "#94a3b8", fontSize: 13 }}>
          {rating > 0 ? `${rating} de 5 estrelas` : "Selecione uma nota"}
        </span>
      </div>

      {/* Comment */}
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={1000}
        placeholder="Compartilhe sua experiência. O que você gostou? O que pode melhorar?"
        style={{ width: "100%", padding: 12, background: "#060e1b", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.5, marginBottom: 8 }}
        onFocus={e => (e.target.style.borderColor = GOLD)}
        onBlur={e => (e.target.style.borderColor = "#1e293b")}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{comment.length} / 1000</span>
        <span style={{ fontSize: 11, color: comment.trim().length < 10 ? "#ef4444" : "#22c55e" }}>
          {comment.trim().length < 10 ? `Faltam ${10 - comment.trim().length} caracteres` : "✓ OK"}
        </span>
      </div>

      <button onClick={submit} disabled={loading || rating < 1 || comment.trim().length < 10}
        style={{
          width: "100%", padding: 12,
          background: loading || rating < 1 || comment.trim().length < 10 ? "rgba(212,168,67,0.3)" : GOLD,
          color: "#060e1b", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800,
          cursor: loading || rating < 1 || comment.trim().length < 10 ? "not-allowed" : "pointer",
        }}>
        {loading ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
