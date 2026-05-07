"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const specialtyOptions = [
  "Modelo Fotográfico", "Modelo Publicitário", "Modelo Fitness", "Modelo Plus Size",
  "Modelo Editorial", "Atriz/Ator", "Influencer", "Promoter",
  "Make Artist", "Stylist", "Fotógrafo", "Videomaker",
];

export default function EditarPerfilPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: "Juliana Oliveira",
    bio: "Modelo fotográfica e publicitária com 6 anos de experiência.",
    city: "São Paulo",
    state: "SP",
    phone: "11999999999",
    whatsapp: "11999999999",
    instagram: "@juliana.oliveira",
    website: "www.julianaoliveira.com.br",
    priceMin: "500",
    priceMax: "2000",
    specialties: ["Modelo Fotográfico", "Modelo Editorial"] as string[],
  });

  const toggle = (s: string) =>
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));

  async function handleSave() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Perfil atualizado com sucesso!");
    setLoading(false);
  }

  const input = {
    width: "100%",
    padding: "11px 14px",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#fff" as const,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const label = { fontSize: 13, color: "#aaa", display: "block", marginBottom: 6, fontWeight: 500 } as const;
  const focus = { onFocus: (e: any) => (e.target.style.borderColor = "#cc0000"), onBlur: (e: any) => (e.target.style.borderColor = "#2a2a2a") };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Editar perfil</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Mantenha suas informações sempre atualizadas.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Basic info */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Informações básicas</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>Nome artístico / Nome público</label>
              <input style={input} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} {...focus} />
            </div>
            <div>
              <label style={label}>Biografia profissional</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={5}
                placeholder="Descreva sua experiência, especialidades e diferenciais..."
                style={{ ...input, resize: "vertical" }} {...focus} />
              <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{form.bio.length}/1000 caracteres</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>Cidade</label>
                <input style={input} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" {...focus} />
              </div>
              <div>
                <label style={label}>Estado</label>
                <input style={input} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="SP" {...focus} />
              </div>
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Especialidades</h2>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Selecione todas que se aplicam ao seu trabalho.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {specialtyOptions.map((s) => (
              <button
                key={s}
                onClick={() => toggle(s)}
                style={{
                  padding: "7px 14px",
                  background: form.specialties.includes(s) ? "rgba(204,0,0,0.12)" : "#0d0d0d",
                  border: `1.5px solid ${form.specialties.includes(s) ? "#cc0000" : "#222"}`,
                  borderRadius: 20,
                  color: form.specialties.includes(s) ? "#fff" : "#888",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: form.specialties.includes(s) ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {form.specialties.includes(s) ? "✓ " : ""}{s}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Faixa de preço</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Preço mínimo (R$)</label>
              <input type="number" style={input} value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value })} placeholder="500" {...focus} />
            </div>
            <div>
              <label style={label}>Preço máximo (R$)</label>
              <input type="number" style={input} value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value })} placeholder="2000" {...focus} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#555", marginTop: 10 }}>Os valores são uma referência. O preço final é negociado com cada cliente.</p>
        </div>

        {/* Contact */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Contato e redes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "phone", label: "Telefone", placeholder: "11 99999-9999" },
              { key: "whatsapp", label: "WhatsApp (para contato direto)", placeholder: "11 99999-9999" },
              { key: "instagram", label: "Instagram", placeholder: "@seuperfil" },
              { key: "website", label: "Site / Portfólio", placeholder: "www.seuperfil.com" },
            ].map((f) => (
              <div key={f.key}>
                <label style={label}>{f.label}</label>
                <input style={input} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} {...focus} />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: "14px",
            background: loading ? "#8a0000" : "#cc0000",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
        >
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
