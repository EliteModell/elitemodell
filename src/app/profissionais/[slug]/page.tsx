"use client";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { getPerfil, mockProfiles } from "@/lib/mockProfiles";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

type GaleriaFiltro = "todas" | "fotos" | "videos";

export default function ProfissionalProfilePage() {
  const params = useParams();
  const pro = getPerfil(params.slug as string);
  const photos = [pro.image, pro.coverImage, pro.image, pro.coverImage, pro.image, pro.coverImage];
  const [galeriaFiltro, setGaleriaFiltro] = useState<GaleriaFiltro>("todas");
  const [photoOpen, setPhotoOpen] = useState<number | null>(null);
  const [servicosAbertos, setServicosAbertos] = useState(false);
  const [caracteristicasAbertas, setCaracteristicasAbertas] = useState(false);

  const refGaleria = useRef<HTMLDivElement>(null);
  const refSobre = useRef<HTMLDivElement>(null);
  const refAvaliacoes = useRef<HTMLDivElement>(null);

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const fotosExibidas = galeriaFiltro === "videos"
    ? photos.slice(0, 2)
    : photos;

  const maisProfiles = mockProfiles.filter((p) => p.id !== pro.id).slice(0, 3);

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9", paddingBottom: 72 }}>
      <Navbar />

      {/* ── COVER ── */}
      <div style={{ paddingTop: 64 }}>
        <div style={{ height: 220, position: "relative", overflow: "hidden" }}>
          <img src={pro.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,14,27,0.2) 0%, rgba(6,14,27,0.85) 100%)" }} />
        </div>

        {/* Profile header */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginTop: -44, marginBottom: 16 }}>
            <div style={{ width: 90, height: 90, borderRadius: "50%", flexShrink: 0, border: `3px solid ${GOLD}`, overflow: "hidden", background: "#0b1420", boxShadow: `0 0 20px rgba(212,168,67,0.25)`, position: "relative" }}>
              <img src={pro.image} alt={pro.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
              {pro.online && (
                <div style={{ position: "absolute", bottom: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2px solid #060e1b" }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>{pro.displayName}</h1>
                {pro.verified && <span style={{ padding: "2px 9px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 700 }}>✓ Verificada</span>}
                {pro.featured && <span style={{ padding: "2px 9px", background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 20, fontSize: 11, color: "#cc0000", fontWeight: 700 }}>★ Destaque</span>}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                <span>{pro.idade} anos</span>
                <span>·</span>
                <span>{pro.city}, {pro.state}</span>
                <span>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>{pro.rating}</span>
                  <span>({pro.totalReviews})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: 5, fontSize: 11, color: "#334155", marginBottom: 14, alignItems: "center" }}>
            <Link href="/buscar?tab=acompanhantes" style={{ color: GOLD, textDecoration: "none" }}>Acompanhantes</Link>
            <span>›</span><span>{pro.state}</span>
            <span>›</span><span>{pro.city}</span>
            <span>›</span><span style={{ color: "#64748b" }}>{pro.displayName}</span>
          </div>

          {/* Cards preço + localização */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>💰 Valores</div>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>a partir de</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: PLAYFAIR }}>R$ {pro.priceMin}/h</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{pro.local}</div>
            </div>
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>📍 Localização</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>{pro.city}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{pro.state}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Atende: {pro.atende.join(", ")}</div>
            </div>
          </div>

          {/* Serviços pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {pro.specialties.map((s) => (
              <span key={s} style={{ padding: "4px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── STICKY NAV TABS (scroll atalho) ── */}
      <div style={{ position: "sticky", top: 64, zIndex: 40, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD_DIM}`, marginTop: 16 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", padding: "0 16px" }}>
          {[
            { label: `Fotos (${photos.length})`, ref: refGaleria },
            { label: "Sobre mim", ref: refSobre },
            { label: `Avaliações (${pro.totalReviews})`, ref: refAvaliacoes },
          ].map(({ label, ref }) => (
            <button key={label} onClick={() => scrollTo(ref)}
              style={{ padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#94a3b8", borderBottom: `2px solid transparent`, transition: "all 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = GOLD; (e.currentTarget as HTMLElement).style.borderBottomColor = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent"; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>

        {/* ── GALERIA DE FOTOS E VÍDEOS ── */}
        <div ref={refGaleria} style={{ paddingTop: 28, scrollMarginTop: 120 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>Galeria de fotos e vídeos</span>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </div>

          {/* Info card verificação */}
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Mídias Verificadas</p>
              <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Fotos e vídeos verificados pela EliteModell garantem autenticidade.</p>
            </div>
          </div>

          {/* Filtros galeria */}
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: `1px solid ${GOLD_DIM}`, overflowX: "auto" }}>
            {([
              ["todas", `${photos.length} todas`],
              ["fotos", `${photos.length - 2} fotos`],
              ["videos", "2 vídeos"],
            ] as [GaleriaFiltro, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setGaleriaFiltro(f)}
                style={{ padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: galeriaFiltro === f ? 700 : 400, color: galeriaFiltro === f ? GOLD : "#475569", borderBottom: `2px solid ${galeriaFiltro === f ? GOLD : "transparent"}`, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Grid fotos */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, marginBottom: 28 }}>
            {fotosExibidas.map((url, i) => (
              <div key={i} onClick={() => setPhotoOpen(i)}
                style={{ aspectRatio: "3/4", overflow: "hidden", borderRadius: 6, cursor: "pointer", position: "relative", background: "#0b1420" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                {/* Badge verificado */}
                <div style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(6,14,27,0.85)", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                {/* Ícone de vídeo para os 2 últimos */}
                {i >= photos.length - 2 && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(6,14,27,0.7)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Verificação + Denunciar */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: "#475569", textAlign: "center", marginBottom: 14 }}>
              Verificada em <strong style={{ color: "#94a3b8" }}>Mai/2025</strong>
            </p>
            <button style={{ width: "100%", padding: "13px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)", borderRadius: 10, color: "#cc0000", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Denunciar anonimamente este perfil
            </button>
          </div>
        </div>

        {/* ── SOBRE MIM ── */}
        <div ref={refSobre} style={{ scrollMarginTop: 120 }}>

          {/* Descrição */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Descrição</h2>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line" }}>{pro.bio}</p>
          </section>

          {/* Atendimento e serviços */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Atendimento</h2>
              </div>
            </div>
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 4px" }}><strong style={{ color: "#f1f5f9" }}>Atende:</strong> {pro.atende.join(" e ")}</p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}><strong style={{ color: "#f1f5f9" }}>Local:</strong> {pro.local}</p>
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: "0 0 10px", letterSpacing: 0.5 }}>Serviços oferecidos</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, overflow: "hidden" }}>
              {pro.specialties.slice(0, servicosAbertos ? undefined : 4).map((s, i, arr) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < arr.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{s}</span>
                  <span style={{ padding: "3px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 700 }}>Faço</span>
                </div>
              ))}
            </div>
            {pro.specialties.length > 4 && (
              <button onClick={() => setServicosAbertos(!servicosAbertos)}
                style={{ width: "100%", padding: "10px", marginTop: 8, background: "transparent", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {servicosAbertos ? "Ver menos" : `Ver mais ${pro.specialties.length - 4} serviços ▾`}
              </button>
            )}
          </section>

          {/* Tabela de valores */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><path d="M12 16h.01"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Valores</h2>
            </div>
            <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
              {[
                { label: "30 minutos", value: pro.price1h ? Math.round(pro.price1h * 0.6) : null },
                { label: "1 hora", value: pro.price1h },
                { label: "2 horas", value: pro.price2h },
                { label: "Pernoite", value: pro.priceOvernight },
              ].map((row, i) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < 3 ? `1px solid ${GOLD_DIM}` : "none" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: row.value ? "#f1f5f9" : "#334155", fontWeight: row.value ? 700 : 400 }}>
                    {row.value ? `R$ ${row.value.toLocaleString("pt-BR")}` : "Não realiza"}
                  </span>
                </div>
              ))}
            </div>
            {/* Pagamento */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Formas de pagamento:</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {["Pix", "Dinheiro"].map((m) => (
                  <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {m === "Pix"
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      }
                    </div>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Horário de expediente */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Horário de expediente</h2>
            </div>
            <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
              {pro.schedule.map((s, i) => (
                <div key={s.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < pro.schedule.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
                  <span style={{ fontSize: 13, color: s.available ? "#94a3b8" : "#334155", fontStyle: "italic", width: 90 }}>{s.day}</span>
                  <span style={{ fontSize: 13, color: s.available ? "#f1f5f9" : "#334155", fontWeight: s.available ? 600 : 400 }}>
                    {s.available ? s.time : "Indisponível"}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#334155", marginTop: 10, fontStyle: "italic" }}>A disponibilidade não é garantida pelo horário cadastrado.</p>
          </section>

          {/* Características físicas */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h6"/></svg>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Características físicas</h2>
              </div>
              <button onClick={() => setCaracteristicasAbertas(!caracteristicasAbertas)}
                style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>
                {caracteristicasAbertas ? "▴" : "▾"}
              </button>
            </div>
            {caracteristicasAbertas && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {Object.entries(pro.fisico).map(([k, v]) => (
                  <div key={k} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 14px" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, color: "#475569", textTransform: "capitalize" }}>{k}</p>
                    <p style={{ margin: 0, fontSize: 14, color: "#f1f5f9", fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
            {!caracteristicasAbertas && (
              <button onClick={() => setCaracteristicasAbertas(true)}
                style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, color: "#64748b", fontSize: 12, cursor: "pointer" }}>
                Ver características físicas ▾
              </button>
            )}
          </section>

          {/* Perfil criado */}
          <p style={{ fontSize: 12, color: "#334155", textAlign: "center", marginBottom: 28 }}>
            📋 Perfil criado em janeiro de {pro.memberSince}
          </p>
        </div>

        {/* ── AVALIAÇÕES ── */}
        <div ref={refAvaliacoes} style={{ scrollMarginTop: 120, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Avaliações de {pro.displayName}</h2>
          </div>

          {/* Stats avaliações */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18, textAlign: "center" }}>
            {[
              { icon: "🕐", label: "Última avaliação", val: "há 1 mês" },
              { icon: "👁", label: "Visualizações", val: pro.totalReviews * 30 + "" },
              { icon: "💬", label: "Respondidas", val: "100%" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "10px 8px" }}>
                <p style={{ fontSize: 16, margin: "0 0 2px" }}>{s.icon}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: "0 0 2px" }}>{s.val}</p>
                <p style={{ fontSize: 10, color: "#475569", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Info avaliações seguras */}
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", margin: "0 0 3px" }}>Avaliações seguras</p>
              <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>Somente quem realizou o atendimento pode avaliar. Todas as avaliações são revisadas.</p>
            </div>
          </div>

          {/* Nota geral */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, padding: "16px", background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 42, fontWeight: 900, color: GOLD, margin: 0, fontFamily: PLAYFAIR }}>{pro.rating}</p>
              <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                {[1,2,3,4,5].map(n => (
                  <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= Math.round(pro.rating) ? GOLD : "#334155"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>{pro.totalReviews} avaliações</p>
            </div>
            <div style={{ flex: 1, paddingLeft: 16, borderLeft: `1px solid ${GOLD_DIM}` }}>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 6px" }}>Nota geral verificada</p>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>Baseada em atendimentos reais confirmados pela plataforma.</p>
            </div>
          </div>

          {/* Lista de avaliações */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {pro.reviews.map((r, i) => (
              <div key={i} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: GOLD }}>
                      {r.author[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{r.author}</p>
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

          {/* Foi atendido? */}
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "18px 16px", textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: PLAYFAIR }}>Foi atendido por {pro.displayName}?</p>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px" }}>Deixe sua avaliação gratuita</p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
              {[1,2,3,4,5].map(n => (
                <svg key={n} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" style={{ cursor: "pointer" }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
            <Link href="/login" style={{ display: "inline-block", padding: "10px 28px", background: GOLD, color: "#060e1b", borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: "none", fontFamily: PLAYFAIR }}>
              Entrar para avaliar
            </Link>
          </div>
        </div>

        {/* ── MAIS PERFIS ── */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Mais acompanhantes em {pro.city}</h2>
            <Link href="/buscar?tab=acompanhantes" style={{ fontSize: 12, color: GOLD, textDecoration: "none", fontWeight: 600 }}>Ver todas →</Link>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {maisProfiles.map((p) => (
              <Link key={p.id} href={`/profissionais/${p.id}`} style={{ textDecoration: "none", flexShrink: 0, width: 140 }}>
                <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                  <div style={{ height: 160, position: "relative", overflow: "hidden" }}>
                    <img src={p.image} alt={p.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.85) 0%, transparent 50%)" }} />
                    <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>{p.displayName}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: GOLD, fontWeight: 700 }}>R${p.priceMin}/h</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── CTA FIXO NA BASE ── */}
      <div style={{ position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 55, background: "rgba(6,14,27,0.98)", backdropFilter: "blur(12px)", borderTop: `1px solid ${GOLD_DIM}`, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>a partir de</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: GOLD, fontFamily: PLAYFAIR, lineHeight: 1.1 }}>R$ {pro.priceMin}/h</p>
        </div>
        <a href={`https://wa.me/55${pro.whatsapp}`} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: GOLD, color: "#060e1b", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none", fontFamily: PLAYFAIR }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="#060e1b">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chamar no WhatsApp
        </a>
      </div>

      <BottomNav />

      {/* Lightbox */}
      {photoOpen !== null && (
        <div onClick={() => setPhotoOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,0.97)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={fotosExibidas[photoOpen!]} alt="" style={{ maxHeight: "90vh", maxWidth: "95vw", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={() => setPhotoOpen(null)} style={{ position: "absolute", top: 20, right: 20, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          {photoOpen > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen - 1); }} style={{ position: "absolute", left: 16, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          )}
          {photoOpen < fotosExibidas.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen + 1); }} style={{ position: "absolute", right: 16, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
