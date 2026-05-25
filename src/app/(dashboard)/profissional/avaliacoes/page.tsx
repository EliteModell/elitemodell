"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  moderationStatus?: string;
  author: { name: string | null; email?: string | null } | null;
  dispute?: { status: string; reason: string; adminNote?: string | null } | null;
};

type MeResponse = {
  professional?: {
    reviews: Review[];
  } | null;
};

export default function ProfissionalAvaliacoesPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: MeResponse = await res.json();
      setReviews(data.professional?.reviews ?? []);
    } catch {
      toast.error("Nao foi possivel carregar as avaliacoes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/users/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as MeResponse;
      })
      .then((data) => {
        if (active) setReviews(data.professional?.reviews ?? []);
      })
      .catch(() => {
        toast.error("Nao foi possivel carregar as avaliacoes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function disputeReview(reviewId: string) {
    if (reason.trim().length < 10) {
      toast.error("Explique o motivo da contestacao com pelo menos 10 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/professional/reviews/${reviewId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Contestacao enviada para analise.");
      setOpenId(null);
      setReason("");
      await load();
    } catch {
      toast.error("Nao foi possivel enviar a contestacao.");
    } finally {
      setSaving(false);
    }
  }

  const card = { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 18 } as const;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 4 }}>Avaliacoes recebidas</h1>
        <p style={{ color: "#777", fontSize: 14 }}>Veja comentarios de clientes e conteste avaliacoes que precisam de analise da equipe.</p>
      </div>

      {loading ? (
        <div className="premium-skeleton" style={{ height: 120, borderRadius: 12 }} />
      ) : reviews.length === 0 ? (
        <div className="premium-empty-state" style={{ padding: 32 }}>Nenhuma avaliacao recebida ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {reviews.map((review) => (
            <article key={review.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#fff" }}>{review.author?.name ?? review.author?.email ?? "Cliente"}</strong>
                  <p style={{ color: "#777", margin: "4px 0 0", fontSize: 12 }}>{new Date(review.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div style={{ color: "#d4a843", fontWeight: 900 }}>{"★".repeat(review.rating)}<span style={{ color: "#333" }}>{"★".repeat(5 - review.rating)}</span></div>
              </div>
              <p style={{ color: "#aaa", lineHeight: 1.65, margin: "14px 0" }}>{review.comment}</p>
              {review.dispute ? (
                <div style={{ border: "1px solid rgba(212,168,67,.22)", background: "rgba(212,168,67,.07)", borderRadius: 10, padding: 12, color: "#f5d78c", fontSize: 13 }}>
                  Contestacao: {review.dispute.status === "PENDING" ? "em analise" : review.dispute.status === "ACCEPTED" ? "aceita" : "mantida"}.
                  {review.dispute.adminNote ? <div style={{ color: "#aaa", marginTop: 6 }}>Resposta admin: {review.dispute.adminNote}</div> : null}
                </div>
              ) : openId === review.id ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Explique por que esta avaliacao deve ser analisada..."
                    rows={4}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#fff", padding: 12 }}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button disabled={saving} onClick={() => disputeReview(review.id)} style={{ padding: "10px 16px", background: "#d4a843", color: "#080704", border: 0, borderRadius: 8, fontWeight: 900, cursor: saving ? "wait" : "pointer" }}>Enviar contestacao</button>
                    <button onClick={() => { setOpenId(null); setReason(""); }} style={{ padding: "10px 16px", background: "transparent", color: "#aaa", border: "1px solid #2a2a2a", borderRadius: 8 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOpenId(review.id)} style={{ padding: "9px 14px", background: "transparent", border: "1px solid rgba(212,168,67,.28)", borderRadius: 8, color: "#d4a843", fontWeight: 800, cursor: "pointer" }}>
                  Contestar avaliacao
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
