"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const SPECIALTIES = [
  "Modelo Fotográfico", "Modelo Editorial", "Modelo Fitness", "Modelo Plus Size",
  "Modelo Comercial", "Modelo Infantil", "Ator / Atriz", "Influencer Digital",
  "Fotógrafo(a)", "Videomaker", "Make Artist", "Stylist", "Designer Gráfico",
  "Produtor(a) Musical", "DJ", "Coreógrafo(a)",
];

const STEPS = ["Informações", "Especialidades", "Preços", "Contato"];

export default function ProfissionalNovoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    website: "",
    priceMin: "",
    priceMax: "",
    specialties: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleSpecialty(sp: string) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(sp)
        ? prev.specialties.filter((s) => s !== sp)
        : [...prev.specialties, sp],
    }));
    setErrors((prev) => ({ ...prev, specialties: "" }));
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.displayName || form.displayName.length < 2) e.displayName = "Nome deve ter pelo menos 2 caracteres.";
      if (!form.bio || form.bio.length < 20) e.bio = "Bio deve ter pelo menos 20 caracteres.";
      if (!form.city || form.city.length < 2) e.city = "Informe sua cidade.";
      if (!form.state || form.state.length < 2) e.state = "Informe seu estado.";
    }
    if (step === 1) {
      if (form.specialties.length === 0) e.specialties = "Selecione pelo menos uma especialidade.";
    }
    if (step === 2) {
      if (form.priceMin && form.priceMax && Number(form.priceMin) > Number(form.priceMax)) {
        e.priceMax = "Preço máximo deve ser maior que o mínimo.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceMin: form.priceMin ? Number(form.priceMin) : undefined,
          priceMax: form.priceMax ? Number(form.priceMax) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao criar perfil.");
        return;
      }
      toast.success("Perfil criado! Aguarde a aprovação.");
      router.push("/profissional");
    } catch {
      toast.error("Erro ao criar perfil.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "#111",
    border: "1px solid #222",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#666",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#cc4444",
    marginTop: 4,
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Criar Perfil Profissional</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Preencha seu perfil para aparecer no marketplace. Após envio, nossa equipe fará a revisão.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, padding: "10px 4px", textAlign: "center", background: i === step ? "rgba(204,0,0,0.12)" : "transparent", borderRight: i < STEPS.length - 1 ? "1px solid #1e1e1e" : "none" }}>
            <div style={{ fontSize: 10, color: i === step ? "#cc4444" : i < step ? "#00cc66" : "#333", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {i < step ? "✓" : i + 1}. {label}
            </div>
          </div>
        ))}
      </div>

      {/* Step 0: Info */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome artístico / profissional *</label>
            <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} style={inputStyle} placeholder="Ex: Juliana Oliveira" />
            {errors.displayName && <div style={errorStyle}>{errors.displayName}</div>}
          </div>
          <div>
            <label style={labelStyle}>Bio profissional *</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              placeholder="Conte sobre sua experiência, estilo de trabalho, projetos anteriores..." />
            <div style={{ fontSize: 11, color: form.bio.length < 20 ? "#555" : "#00cc66", marginTop: 4 }}>
              {form.bio.length}/20 caracteres mínimos
            </div>
            {errors.bio && <div style={errorStyle}>{errors.bio}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Cidade *</label>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inputStyle} placeholder="São Paulo" />
              {errors.city && <div style={errorStyle}>{errors.city}</div>}
            </div>
            <div>
              <label style={labelStyle}>Estado *</label>
              <input value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle} placeholder="SP" maxLength={2} />
              {errors.state && <div style={errorStyle}>{errors.state}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Specialties */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
            Selecione todas as especialidades que se aplicam ao seu perfil.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SPECIALTIES.map((sp) => {
              const selected = form.specialties.includes(sp);
              return (
                <button key={sp} onClick={() => toggleSpecialty(sp)}
                  style={{
                    padding: "8px 14px",
                    background: selected ? "rgba(204,0,0,0.12)" : "#111",
                    border: `1.5px solid ${selected ? "#cc0000" : "#1e1e1e"}`,
                    borderRadius: 20,
                    color: selected ? "#fff" : "#666",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: selected ? 600 : 400,
                    transition: "all 0.15s",
                  }}>
                  {selected && "✓ "}{sp}
                </button>
              );
            })}
          </div>
          {errors.specialties && <div style={{ ...errorStyle, marginTop: 12 }}>{errors.specialties}</div>}
          {form.specialties.length > 0 && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(0,200,100,0.05)", border: "1px solid rgba(0,200,100,0.15)", borderRadius: 8, fontSize: 13, color: "#00cc66" }}>
              {form.specialties.length} especialidade(s) selecionada(s)
            </div>
          )}
        </div>
      )}

      {/* Step 2: Prices */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: "14px 16px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, fontSize: 13, color: "#666", lineHeight: 1.6 }}>
            Defina uma faixa de preço por hora ou por sessão. Este valor é indicativo e pode ser negociado diretamente com o cliente. Deixe em branco se preferir não exibir.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Preço mínimo (R$)</label>
              <input type="number" min="0" value={form.priceMin} onChange={(e) => set("priceMin", e.target.value)}
                style={inputStyle} placeholder="Ex: 150" />
            </div>
            <div>
              <label style={labelStyle}>Preço máximo (R$)</label>
              <input type="number" min="0" value={form.priceMax} onChange={(e) => set("priceMax", e.target.value)}
                style={inputStyle} placeholder="Ex: 500" />
              {errors.priceMax && <div style={errorStyle}>{errors.priceMax}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Contact */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} placeholder="(11) 9 0000-0000" />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={inputStyle} placeholder="5511900000000" />
            <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Formato internacional, sem espaços (ex: 5511912345678)</div>
          </div>
          <div>
            <label style={labelStyle}>Instagram</label>
            <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} style={inputStyle} placeholder="@seuperfil" />
          </div>
          <div>
            <label style={labelStyle}>Website / Portfólio</label>
            <input value={form.website} onChange={(e) => set("website", e.target.value)} style={inputStyle} placeholder="https://seusite.com" />
          </div>

          <div style={{ marginTop: 8, padding: "14px 16px", background: "rgba(204,0,0,0.04)", border: "1px solid rgba(204,0,0,0.15)", borderRadius: 10, fontSize: 13, color: "#888", lineHeight: 1.6 }}>
            <strong style={{ color: "#cc4444" }}>Revisão obrigatória:</strong> Após envio, seu perfil passará por revisão da nossa equipe antes de aparecer publicamente. O processo leva até 48 horas.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <button onClick={prevStep} disabled={step === 0}
          style={{ padding: "10px 20px", background: "transparent", border: "1px solid #222", borderRadius: 8, color: step === 0 ? "#333" : "#888", fontSize: 14, cursor: step === 0 ? "default" : "pointer" }}>
          ← Voltar
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={nextStep}
            style={{ padding: "10px 24px", background: "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Continuar →
          </button>
        ) : (
          <button onClick={submit} disabled={loading}
            style={{ padding: "10px 24px", background: loading ? "#444" : "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
            {loading ? "Enviando..." : "Criar perfil"}
          </button>
        )}
      </div>
    </div>
  );
}
