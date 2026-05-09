"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

const mockPro = {
  slug: "amanda-r",
  displayName: "Amanda R.",
  image: "/model1.jpg",
  online: true,
  bio: `Olá, seja bem-vindo ao meu perfil. Sou uma acompanhante sofisticada, discreta e de alto nível. Ofereço momentos únicos e inesquecíveis para homens que valorizam qualidade e elegância.

Atendo em local próprio, hotéis e aceito viagens. Cuido bem de cada detalhe para que você se sinta à vontade e especial em cada encontro.

Pontualidade, discrição e higiene são fundamentais para mim. Aguardo seu contato.`,
  city: "São Paulo",
  state: "SP",
  phone: "11999999999",
  whatsapp: "11999999999",
  instagram: "@amanda.elite",
  website: "",
  pricePerHour: 350,
  price2h: 600,
  priceOvernight: 1500,
  priceMin: 350,
  priceMax: 1500,
  specialties: ["Acompanhamento", "Viagens", "Jantar a dois", "Hotéis", "Local próprio"],
  attendanceTypes: ["Local próprio", "Hotéis", "Aceita viajar"],
  paymentMethods: ["Pix", "Dinheiro"],
  rating: 4.9,
  totalReviews: 87,
  totalAppointments: 203,
  verified: true,
  featured: true,
  memberSince: "2023",
  photos: [
    { id: "1", url: "/model1.jpg", caption: "" },
    { id: "2", url: "/model2.jpg", caption: "" },
    { id: "3", url: "/model1.jpg", caption: "" },
    { id: "4", url: "/model2.jpg", caption: "" },
    { id: "5", url: "/model1.jpg", caption: "" },
    { id: "6", url: "/model2.jpg", caption: "" },
  ],
  schedule: [
    { day: "Segunda", available: true, time: "14:00 – 00:00" },
    { day: "Terça", available: true, time: "14:00 – 00:00" },
    { day: "Quarta", available: true, time: "14:00 – 00:00" },
    { day: "Quinta", available: true, time: "14:00 – 00:00" },
    { day: "Sexta", available: true, time: "14:00 – 02:00" },
    { day: "Sábado", available: true, time: "16:00 – 02:00" },
    { day: "Domingo", available: false, time: "" },
  ],
  reviews: [
    { author: "Rodrigo M.", rating: 5, comment: "Atendimento impecável, muito discreta e elegante. Superou todas as expectativas. Com certeza voltarei.", date: "Abr 2025" },
    { author: "Felipe S.", rating: 5, comment: "Pontual, educada e muito agradável. Faz você se sentir especial desde o primeiro momento.", date: "Mar 2025" },
    { author: "Lucas A.", rating: 5, comment: "Melhor companhia que já tive. Recomendo sem hesitar.", date: "Fev 2025" },
  ],
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= rating ? "#cc0000" : "#333", fontSize: 15 }}>★</span>
      ))}
    </div>
  );
}

function BookingModal({ pro, onClose }: { pro: typeof mockPro; onClose: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ date: "", time: "", duration: "60", contact: "whatsapp", notes: "" });
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!session) { router.push("/login"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Agendamento solicitado! A profissional entrará em contato.");
    onClose();
    setLoading(false);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, padding: 32, width: "100%", maxWidth: 480, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20 }}>✕</button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Agendar com {pro.displayName}</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Solicite um horário disponível</p>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Data</label>
                <input type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Horário</label>
                <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}>
                  <option value="" style={{ background: "#111" }}>Selecione</option>
                  {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((t) => (
                    <option key={t} value={t} style={{ background: "#111" }}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Duração</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "60", l: "1 hora" }, { v: "120", l: "2 horas" }, { v: "240", l: "Meio dia" }, { v: "480", l: "Dia inteiro" }].map((d) => (
                  <button key={d.v} onClick={() => setForm({ ...form, duration: d.v })}
                    style={{ flex: 1, padding: "9px 4px", background: form.duration === d.v ? "rgba(204,0,0,0.12)" : "#0d0d0d", border: `1.5px solid ${form.duration === d.v ? "#cc0000" : "#222"}`, borderRadius: 8, color: form.duration === d.v ? "#fff" : "#888", fontSize: 12, cursor: "pointer", fontWeight: form.duration === d.v ? 600 : 400 }}>
                    {d.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Contato preferido</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "whatsapp", l: "WhatsApp", icon: "💬" }, { v: "chat", l: "Chat interno", icon: "✉️" }].map((c) => (
                  <button key={c.v} onClick={() => setForm({ ...form, contact: c.v })}
                    style={{ flex: 1, padding: "10px", background: form.contact === c.v ? "rgba(204,0,0,0.12)" : "#0d0d0d", border: `1.5px solid ${form.contact === c.v ? "#cc0000" : "#222"}`, borderRadius: 8, color: form.contact === c.v ? "#fff" : "#888", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {c.icon} {c.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Descrição do projeto</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Descreva o que você precisa..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
            </div>

            <button
              onClick={() => form.date && form.time ? setStep(2) : toast.error("Selecione data e horário.")}
              style={{ padding: "13px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
            >
              Próximo →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Resumo do agendamento</h3>
              {[
                { label: "Profissional", value: pro.displayName },
                { label: "Data", value: form.date ? new Date(form.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "" },
                { label: "Horário", value: form.time },
                { label: "Duração", value: `${Number(form.duration) / 60}h${Number(form.duration) % 60 ? `${Number(form.duration) % 60}min` : ""}` },
                { label: "Contato", value: form.contact === "whatsapp" ? "WhatsApp" : "Chat interno" },
                { label: "Faixa de preço", value: `R$ ${pro.priceMin?.toLocaleString("pt-BR")} – R$ ${pro.priceMax?.toLocaleString("pt-BR")}` },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "#666" }}>{r.label}</span>
                  <span style={{ color: "#ccc", fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 20 }}>
              O valor final será negociado diretamente com a profissional. Ao confirmar, você receberá uma notificação quando ela aceitar o pedido.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #333", borderRadius: 8, color: "#ccc", fontSize: 14, cursor: "pointer" }}>← Voltar</button>
              <button onClick={handleConfirm} disabled={loading}
                style={{ flex: 2, padding: "12px", background: loading ? "#8a0000" : "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
                onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
              >
                {loading ? "Enviando..." : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfissionalProfilePage() {
  const pro = mockPro;
  const [showModal, setShowModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState<number | null>(null);

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Navbar />
      {showModal && <BookingModal pro={pro} onClose={() => setShowModal(false)} />}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 24px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "#666", marginBottom: 24, alignItems: "center" }}>
          <Link href="/profissionais" style={{ color: "#cc0000", textDecoration: "none" }}>Profissionais</Link>
          <span>›</span>
          <span style={{ color: "#aaa" }}>{pro.displayName}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "flex-start" }} className="profile-grid">
          {/* Left */}
          <div>
            {/* Header */}
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", flexShrink: 0, border: "3px solid #cc0000", overflow: "hidden", position: "relative" }}>
                {(pro as any).image ? (
                  <img src={(pro as any).image} alt={pro.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff" }}>
                    {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                )}
                {(pro as any).online && (
                  <div style={{ position: "absolute", bottom: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "#22c55e", border: "2px solid #0d0d0d" }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{pro.displayName}</h1>
                  {pro.verified && (
                    <span style={{ padding: "3px 10px", background: "rgba(204,0,0,0.1)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 20, fontSize: 12, color: "#cc0000", fontWeight: 600 }}>
                      ✓ Verificada
                    </span>
                  )}
                  {pro.featured && (
                    <span style={{ padding: "3px 10px", background: "#cc0000", borderRadius: 20, fontSize: 12, color: "#fff", fontWeight: 600 }}>
                      ★ Destaque
                    </span>
                  )}
                </div>
                <p style={{ color: "#777", fontSize: 14, marginBottom: 10 }}>📍 {pro.city}, {pro.state}</p>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#cc0000", fontSize: 18 }}>★</span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{pro.rating.toFixed(1)}</span>
                    <span style={{ color: "#555", fontSize: 13 }}>· {pro.totalReviews} avaliações</span>
                  </div>
                  <span style={{ color: "#444" }}>·</span>
                  <span style={{ color: "#666", fontSize: 14 }}>{pro.totalAppointments} trabalhos</span>
                  <span style={{ color: "#444" }}>·</span>
                  <span style={{ color: "#666", fontSize: 14 }}>Desde {pro.memberSince}</span>
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {pro.specialties.map((s) => (
                <span key={s} style={{ padding: "5px 14px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 20, fontSize: 13, color: "#cc4444", fontWeight: 500 }}>
                  {s}
                </span>
              ))}
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #1a1a1a" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Sobre mim</h2>
              <p style={{ color: "#888", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-line" }}>{pro.bio}</p>
            </div>

            {/* Photos gallery */}
            <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #1a1a1a" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Portfólio</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {pro.photos.map((photo, i) => (
                  <div key={photo.id} onClick={() => setActivePhoto(i)}
                    style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", position: "relative", border: "1px solid #1e1e1e" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    {(photo as any).url ? (
                      <img src={(photo as any).url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: `linear-gradient(${135 + i * 25}deg, #1a0000 0%, #111 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #1a1a1a" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Disponibilidade</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pro.schedule.map((s) => (
                  <div key={s.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: s.available ? "#111" : "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8 }}>
                    <span style={{ fontSize: 14, color: s.available ? "#ccc" : "#444", fontWeight: 500, width: 90 }}>{s.day}</span>
                    {s.available
                      ? <span style={{ fontSize: 14, color: "#888" }}>{s.time}</span>
                      : <span style={{ fontSize: 13, color: "#333" }}>Indisponível</span>
                    }
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.available ? "#00cc66" : "#333" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#fff" }}>{pro.rating.toFixed(1)}</span>
                <div>
                  <StarRow rating={Math.round(pro.rating)} />
                  <span style={{ color: "#666", fontSize: 13 }}>{pro.totalReviews} avaliações</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pro.reviews.map((r, i) => (
                  <div key={i} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#666" }}>
                          {r.author[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{r.author}</div>
                          <div style={{ fontSize: 12, color: "#555" }}>{r.date}</div>
                        </div>
                      </div>
                      <StarRow rating={r.rating} />
                    </div>
                    <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Contact card */}
          <div>
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "24px", position: "sticky", top: 90 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: "#888", marginBottom: 6 }}>Faixa de preço</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(pro as any).pricePerHour && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "#666" }}>1 hora</span><span style={{ color: "#cc0000", fontWeight: 700 }}>R$ {(pro as any).pricePerHour}</span></div>}
                  {(pro as any).price2h && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "#666" }}>2 horas</span><span style={{ color: "#cc0000", fontWeight: 700 }}>R$ {(pro as any).price2h}</span></div>}
                  {(pro as any).priceOvernight && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ color: "#666" }}>Pernoite</span><span style={{ color: "#cc0000", fontWeight: 700 }}>R$ {(pro as any).priceOvernight}</span></div>}
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                style={{ width: "100%", padding: "14px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12, transition: "background 0.2s", letterSpacing: "0.5px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
              >
                Solicitar encontro
              </button>

              <a
                href={`https://wa.me/55${pro.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", background: "transparent", border: "1.5px solid #25D366", borderRadius: 8, color: "#25D366", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 20, boxSizing: "border-box", transition: "background 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(37,211,102,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contato pelo WhatsApp
              </a>

              {/* Social */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pro.instagram && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#666" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    {pro.instagram}
                  </div>
                )}
                {pro.website && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#666" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                    {pro.website}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
                <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, textAlign: "center" }}>
                  Perfil verificado pela Elite Modell.<br />Seus dados são protegidos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
