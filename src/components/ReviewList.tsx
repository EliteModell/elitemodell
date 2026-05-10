"use client";
import { useState, useEffect } from "react";

const GOLD = "#d4a843";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: { name: string | null; image: string | null };
}

interface Props {
  professionalId: string;
}

export default function ReviewList({ professionalId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews?professionalId=${professionalId}`)
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [professionalId]);

  if (loading) {
    return <div style={{ color: "#475569", fontSize: 13, padding: 20, textAlign: "center" }}>Carregando avaliações...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div style={{ color: "#475569", fontSize: 13, padding: 24, textAlign: "center", background: "#0b1420", borderRadius: 12, border: "1px solid rgba(212,168,67,0.10)" }}>
        Ainda não há avaliações. Seja o primeiro a avaliar.
      </div>
    );
  }

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header com média */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, borderBottom: "1px solid rgba(212,168,67,0.12)" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, fontFamily: "var(--font-playfair), serif" }}>
          {avgRating.toFixed(1)}
        </div>
        <div>
          <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{ fontSize: 16, color: n <= Math.round(avgRating) ? GOLD : "#1e293b" }}>★</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{reviews.length} avaliações</div>
        </div>
      </div>

      {/* Lista de reviews */}
      {reviews.map(r => (
        <div key={r.id} style={{ background: "#0b1420", border: "1px solid rgba(212,168,67,0.10)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontWeight: 700, fontSize: 14 }}>
                {r.author?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{r.author?.name ?? "Anônimo"}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  {new Date(r.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 1 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} style={{ fontSize: 13, color: n <= r.rating ? GOLD : "#1e293b" }}>★</span>
              ))}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.65 }}>{r.comment}</p>
        </div>
      ))}
    </div>
  );
}
