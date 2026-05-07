"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const amenityOptions = [
  "Wi-Fi", "Piscina", "Pet Friendly", "Estacionamento", "Ar-condicionado",
  "Cozinha", "Churrasqueira", "Academia", "TV", "Lavanderia",
  "Varanda", "Vista para o mar", "Sauna", "Banheira de hidromassagem",
];

const propertyTypes = ["APARTMENT", "HOUSE", "STUDIO", "VILLA", "LOFT", "FARM", "HOTEL", "OTHER"];
const typeLabels: Record<string, string> = {
  APARTMENT: "Apartamento", HOUSE: "Casa", STUDIO: "Studio", VILLA: "Villa",
  LOFT: "Loft", FARM: "Sítio/Fazenda", HOTEL: "Hotel", OTHER: "Outro",
};

export default function NovoImovelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "APARTMENT",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    pricePerNight: "",
    cleaningFee: "",
    maxGuests: "2",
    bedrooms: "1",
    beds: "1",
    bathrooms: "1",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    minNights: "1",
    instantBook: true,
    allowPets: false,
    allowSmoking: false,
    allowParties: false,
    amenities: [] as string[],
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAmenity = (a: string) =>
    set("amenities", form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  async function handleSubmit() {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      toast.success("Imóvel cadastrado! Aguardando aprovação.");
      router.push("/anfitriao/imoveis");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const labelStyle = { fontSize: 13, color: "#aaa", display: "block", marginBottom: 6, fontWeight: 500 } as const;

  const steps = ["Tipo", "Localização", "Detalhes", "Preços", "Comodidades", "Regras"];

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Cadastrar novo imóvel</h1>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 20,
                background: i + 1 === step ? "rgba(204,0,0,0.15)" : i + 1 < step ? "#111" : "transparent",
                border: `1px solid ${i + 1 === step ? "#cc0000" : i + 1 < step ? "#333" : "#1e1e1e"}`,
                fontSize: 13,
                color: i + 1 === step ? "#cc0000" : i + 1 < step ? "#666" : "#444",
                fontWeight: i + 1 === step ? 700 : 400,
              }}
            >
              {i + 1 < step ? "✓ " : `${i + 1}. `}{s}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "28px" }}>
        {/* Step 1 - Type */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Qual é o tipo do imóvel?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {propertyTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => set("type", t)}
                  style={{
                    padding: "14px",
                    background: form.type === t ? "rgba(204,0,0,0.1)" : "#0d0d0d",
                    border: `1.5px solid ${form.type === t ? "#cc0000" : "#222"}`,
                    borderRadius: 10,
                    color: form.type === t ? "#fff" : "#888",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: form.type === t ? 600 : 400,
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 - Location */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Onde está o imóvel?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>CEP</label>
                <input style={inputStyle} value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="00000-000"
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label style={labelStyle}>Endereço completo</label>
                <input style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número, complemento"
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="São Paulo"
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <input style={inputStyle} value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="SP"
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Details */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Detalhes do imóvel</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Título do anúncio</label>
                <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Cobertura com vista panorâmica"
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Descreva seu imóvel..."
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                  onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Hóspedes", key: "maxGuests" },
                  { label: "Quartos", key: "bedrooms" },
                  { label: "Camas", key: "beds" },
                  { label: "Banheiros", key: "bathrooms" },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input
                      type="number"
                      min="1"
                      style={inputStyle}
                      value={(form as any)[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                      onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4 - Prices */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Preços e disponibilidade</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Diária (R$)</label>
                  <input type="number" style={inputStyle} value={form.pricePerNight} onChange={(e) => set("pricePerNight", e.target.value)} placeholder="0,00"
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
                <div>
                  <label style={labelStyle}>Taxa de limpeza (R$)</label>
                  <input type="number" style={inputStyle} value={form.cleaningFee} onChange={(e) => set("cleaningFee", e.target.value)} placeholder="0,00"
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Noites mínimas</label>
                  <input type="number" min="1" style={inputStyle} value={form.minNights} onChange={(e) => set("minNights", e.target.value)}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
                <div>
                  <label style={labelStyle}>Check-in</label>
                  <input type="time" style={inputStyle} value={form.checkInTime} onChange={(e) => set("checkInTime", e.target.value)}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
                <div>
                  <label style={labelStyle}>Check-out</label>
                  <input type="time" style={inputStyle} value={form.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)}
                    onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
                    onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")} />
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.instantBook} onChange={(e) => set("instantBook", e.target.checked)} style={{ accentColor: "#cc0000", width: 16, height: 16 }} />
                <span style={{ fontSize: 14, color: "#ccc" }}>Ativar reserva instantânea (sem aprovação manual)</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 5 - Amenities */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Quais comodidades seu imóvel oferece?</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {amenityOptions.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  style={{
                    padding: "12px 14px",
                    background: form.amenities.includes(a) ? "rgba(204,0,0,0.1)" : "#0d0d0d",
                    border: `1.5px solid ${form.amenities.includes(a) ? "#cc0000" : "#222"}`,
                    borderRadius: 8,
                    color: form.amenities.includes(a) ? "#fff" : "#888",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                >
                  {form.amenities.includes(a) ? "✓ " : ""}{a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6 - Rules */}
        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Regras da casa</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { key: "allowPets", label: "Permitir animais de estimação", icon: "🐾" },
                { key: "allowSmoking", label: "Permitir fumar", icon: "🚬" },
                { key: "allowParties", label: "Permitir festas e eventos", icon: "🎉" },
              ].map((r) => (
                <label key={r.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#0d0d0d", border: "1px solid #222", borderRadius: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form as any)[r.key]} onChange={(e) => set(r.key, e.target.checked)} style={{ accentColor: "#cc0000", width: 16, height: 16 }} />
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{ fontSize: 14, color: "#ccc" }}>{r.label}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: "16px", background: "rgba(204,0,0,0.05)", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
                ✅ Seu imóvel será revisado pela equipe Elite Modell antes de ser publicado. O prazo médio é de 24 horas.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid #1a1a1a" }}>
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            style={{ padding: "10px 20px", background: "transparent", border: "1px solid #333", borderRadius: 8, color: step === 1 ? "#444" : "#ccc", cursor: step === 1 ? "not-allowed" : "pointer", fontSize: 14 }}
          >
            ← Anterior
          </button>

          {step < 6 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{ padding: "10px 24px", background: "#cc0000", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e00000")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#cc0000")}
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: "10px 24px", background: loading ? "#8a0000" : "#cc0000", border: "none", borderRadius: 8, color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
            >
              {loading ? "Publicando..." : "Publicar imóvel ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
