"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { getPerfil } from "@/lib/mockProfiles";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

type Tab = "fotos" | "sobre" | "avaliacoes";

export default function ProfissionalProfilePage() {
  const params = useParams();
  const pro = getPerfil(params.slug as string);
  const photos = [pro.image, pro.coverImage, pro.image, pro.coverImage, pro.image, pro.coverImage];
  const [tab, setTab] = useState<Tab>("fotos");
  const [photoOpen, setPhotoOpen] = useState<number | null>(null);

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", paddingBottom: 80 }}>
      <Navbar />

      {/* ── COVER + HEADER ── */}
      <div style={{ paddingTop: 64 }}>
        {/* Cover */}
        <div style={{ height: 200, position: "relative", overflow: "hidden" }}>
          <img src={pro.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,14,27,0.3) 0%, rgba(6,14,27,0.8) 100%)" }} />
        </div>

        {/* Breadcrumb */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 16px 0", display: "flex", gap: 6, fontSize: 12, color: "#475569", alignItems: "center" }}>
          <Link href="/buscar?tab=acompanhantes" style={{ color: GOLD, textDecoration: "none" }}>Acompanhantes</Link>
          <span>›</span>
          <span>{pro.displayName}</span>
        </div>

        {/* Profile info */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: -40, marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ width: 96, height: 96, borderRadius: "50%", flexShrink: 0, border: `3px solid ${GOLD}`, overflow: "hidden", background: "#0b1420", position: "relative", boxShadow: `0 0 24px rgba(212,168,67,0.3)` }}>
              <img src={pro.image} alt={pro.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              {pro.online && (
                <div style={{ position: "absolute", bottom: 5, right: 5, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2px solid #060e1b" }} />
              )}
            </div>

            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>{pro.displayName}</h1>
                {pro.verified && (
                  <span style={{ padding: "3px 10px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 700 }}>
                    ✓ Verificada
                  </span>
                )}
                {pro.featured && (
                  <span style={{ padding: "3px 10px", background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 20, fontSize: 11, color: "#cc0000", fontWeight: 700 }}>
                    ★ Destaque
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {pro.city}, {pro.state}
                </span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{pro.idade} anos</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>{pro.rating}</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>({pro.totalReviews})</span>
                </span>
                <span style={{ fontSize: 12, color: "#475569" }}>{pro.totalAppointments} atendimentos</span>
                <span style={{ fontSize: 12, color: "#475569" }}>Desde {pro.memberSince}</span>
              </div>
            </div>
          </div>

          {/* ── CARDS DE PREÇO + LOCALIZAÇÃO (destaque) ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Preços */}
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>Valores</span>
              </div>
              <p style={{ fontSize: 11, color: "#475569", margin: "0 0 6px" }}>a partir de</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: GOLD, margin: "0 0 10px", fontFamily: PLAYFAIR }}>R$ {pro.priceMin}/h</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: `1px solid ${GOLD_DIM}`, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>1 hora</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>R$ {pro.price1h}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>2 horas</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>R$ {pro.price2h}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>Pernoite</span>
                  <span style={{ color: "#f1f5f9", fontWeight: 600 }}>R$ {pro.priceOvernight}</span>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>Localização</span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: PLAYFAIR }}>{pro.city}</p>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>{pro.state}</p>
              <div style={{ borderTop: `1px solid ${GOLD_DIM}`, paddingTop: 10 }}>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{pro.local}</p>
                <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Atende: {pro.atende.join(", ")}</p>
              </div>
            </div>
          </div>

          {/* Serviços */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {pro.specialties.map((s) => (
              <span key={s} style={{ padding: "5px 14px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 12, color: "#d4a843", fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── STICKY TABS ── */}
      <div style={{ position: "sticky", top: 64, zIndex: 40, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD_DIM}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", padding: "0 16px" }}>
          {([
            ["fotos", `Fotos e vídeos (${photos.length})`],
            ["sobre", "Sobre mim"],
            ["avaliacoes", `Avaliações (${pro.totalReviews})`],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 13, color: tab === t ? "#f1f5f9" : "#475569", borderBottom: `2px solid ${tab === t ? GOLD : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTEÚDO DAS TABS ── */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* FOTOS */}
        {tab === "fotos" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {photos.map((url, i) => (
                <div key={i} onClick={() => setPhotoOpen(i)}
                  style={{ aspectRatio: "3/4", overflow: "hidden", borderRadius: 8, cursor: "pointer", position: "relative", background: "#0b1420" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", transition: "transform 0.2s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLImageElement).style.transform = "scale(1)")} />
                  {/* Verified badge */}
                  <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(6,14,27,0.8)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOBRE MIM */}
        {tab === "sobre" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Bio */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 2, background: GOLD, borderRadius: 2 }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Sobre mim</h2>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line" }}>{pro.bio}</p>
            </div>

            {/* Características físicas */}
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="17" x2="11" y2="17"/></svg>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Características físicas</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.entries(pro.fisico).map(([k, v]) => (
                  <div key={k}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: "#475569", textTransform: "capitalize" }}>{k}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "#f1f5f9", fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Horário */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Horário de atendimento</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
                {pro.schedule.map((s, i) => (
                  <div key={s.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < pro.schedule.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
                    <span style={{ fontSize: 13, color: s.available ? "#94a3b8" : "#334155", fontStyle: "italic" }}>{s.day}</span>
                    <span style={{ fontSize: 13, color: s.available ? "#f1f5f9" : "#334155", fontWeight: s.available ? 600 : 400 }}>
                      {s.available ? s.time : "Indisponível"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagamento */}
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Formas de pagamento</h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Pix", "Dinheiro"].map((m) => (
                  <span key={m} style={{ padding: "6px 16px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 12, color: GOLD, fontWeight: 600 }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AVALIAÇÕES */}
        {tab === "avaliacoes" && (
          <div>
            {/* Resumo */}
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, padding: "20px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 40, fontWeight: 900, color: GOLD, margin: 0, fontFamily: PLAYFAIR }}>{pro.rating}</p>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", margin: "4px 0" }}>
                  {[1,2,3,4,5].map(n => (
                    <svg key={n} width="14" height="14" viewBox="0 0 24 24" fill={n <= Math.round(pro.rating) ? GOLD : "#334155"}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{pro.totalReviews} avaliações</p>
              </div>
              <div style={{ flex: 1, paddingLeft: 16, borderLeft: `1px solid ${GOLD_DIM}` }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>Avaliações verificadas</p>
                <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>Somente clientes que realizaram atendimento podem avaliar.</p>
              </div>
            </div>

            {/* Lista */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pro.reviews.map((r, i) => (
                <div key={i} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: GOLD }}>
                        {r.author[0]}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{r.author}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>{r.date}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1,2,3,4,5].map(n => (
                        <svg key={n} width="12" height="12" viewBox="0 0 24 24" fill={n <= r.rating ? GOLD : "#334155"}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.65, margin: 0 }}>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CTA FIXO NA BASE ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(12px)", borderTop: `1px solid ${GOLD_DIM}`, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 10, color: "#475569" }}>a partir de</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: GOLD, fontFamily: PLAYFAIR }}>R$ {pro.priceMin}/h</p>
        </div>
        <a
          href={`https://wa.me/55${pro.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", background: GOLD, color: "#060e1b", borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: "none", fontFamily: PLAYFAIR, transition: "background 0.2s" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#060e1b">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chamar no WhatsApp
        </a>
      </div>

      <BottomNav />

      {/* Lightbox */}
      {photoOpen !== null && (
        <div onClick={() => setPhotoOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,0.97)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={pro.photos[photoOpen!]} alt="" style={{ maxHeight: "90vh", maxWidth: "95vw", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={() => setPhotoOpen(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(212,168,67,0.15)", border: `1px solid ${GOLD_MID}`, color: GOLD, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          {photoOpen > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen - 1); }} style={{ position: "absolute", left: 16, background: "rgba(212,168,67,0.15)", border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          )}
          {photoOpen < photos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen + 1); }} style={{ position: "absolute", right: 16, background: "rgba(212,168,67,0.15)", border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
