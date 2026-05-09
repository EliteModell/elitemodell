"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const STEPS = ["Identidade", "Aparência", "Atendimento", "Serviços", "Valores", "Contato"];

const SERVICOS = [
  "Acompanhamento", "Jantar a dois", "Viagens", "Festas e eventos",
  "Massagem", "Massagem tântrica", "Ensaio fotográfico", "Vídeo chamada",
  "Pernoite", "Final de semana", "Hotéis", "Local próprio",
];

const FETICHES = [
  "Striptease", "Dominação", "Roleplay", "Bondage", "Voyeurismo",
  "Podolatria", "Fantasias/uniformes", "Acessórios eróticos", "Squirt",
  "Ativo", "Passivo", "Versátil", "Permite filmagem", "Faz sexo virtual",
];

const ATENDIMENTO = ["A domicílio", "Local próprio", "Hotéis", "Motéis", "Aceita viajar", "Festas e eventos"];
const ATENDE = ["Homens", "Mulheres", "Casais", "Homens trans", "Mulheres trans", "Não binário"];
const GRUPOS = ["1 pessoa", "2 pessoas", "3 pessoas", "4 ou mais"];
const PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência"];
const CABELOS = ["Loira", "Morena", "Ruiva", "Castanho", "Colorido", "Preto", "Sem cabelo"];
const OLHOS = ["Azul", "Castanho", "Verde", "Mel", "Cinza", "Preto"];
const ETNIAS = ["Branca", "Negra", "Parda", "Oriental", "Indígena", "Latina", "Outra"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", background: "#0d0d0d",
  border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#888", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
};

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
      border: `1.5px solid ${active ? "#cc0000" : "#2a2a2a"}`,
      background: active ? "rgba(204,0,0,0.1)" : "transparent",
      color: active ? "#fff" : "#777", transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 16px", paddingBottom: 10, borderBottom: "1px solid #1e1e1e", textTransform: "uppercase", letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function ProfissionalNovoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    displayName: "", bio: "", city: "", state: "", escortCategory: "",
    birthDate: "", height: "", weight: "",
    hairColor: "", eyeColor: "", ethnicity: "",
    hasTattoos: false, hasSilicone: false,
    attendanceTypes: [] as string[], servesGenders: [] as string[], grupos: [] as string[],
    services: [] as string[], fetishes: [] as string[],
    pricePerHour: "", price30min: "", price2h: "", priceOvernight: "",
    paymentMethods: [] as string[],
    phone: "", whatsapp: "", instagram: "", website: "",
  });

  function set(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleArr(field: string, val: string) {
    setForm((f) => {
      const arr = (f as any)[field] as string[];
      return { ...f, [field]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }

  function toggleSingle(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: (f as any)[field] === val ? "" : val }));
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceMin: form.pricePerHour ? Number(form.pricePerHour) : undefined,
          priceMax: form.pricePerHour ? Number(form.pricePerHour) : undefined,
          pricePerHour: form.pricePerHour ? Number(form.pricePerHour) : undefined,
          price30min: form.price30min ? Number(form.price30min) : undefined,
          price2h: form.price2h ? Number(form.price2h) : undefined,
          priceOvernight: form.priceOvernight ? Number(form.priceOvernight) : undefined,
          height: form.height ? Number(form.height) : undefined,
          weight: form.weight ? Number(form.weight) : undefined,
          specialties: form.services,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Erro ao criar perfil.");
        return;
      }
      toast.success("Perfil criado! Aguardando aprovação.");
      router.push("/profissional");
    } catch {
      toast.error("Erro ao criar perfil.");
    } finally {
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>
          Criar Perfil
        </h1>
        <p style={{ color: "#555", fontSize: 14 }}>
          Preencha com atenção — essas informações aparecem nos filtros de busca.
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Etapa {step + 1} de {STEPS.length} — {STEPS[step]}
          </span>
          <span style={{ fontSize: 12, color: "#cc0000", fontWeight: 700 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#cc0000", borderRadius: 3, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 16 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < step ? "#cc0000" : i === step ? "#cc0000" : "#1a1a1a", border: `2px solid ${i <= step ? "#cc0000" : "#2a2a2a"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", fontSize: 11, fontWeight: 700, color: i <= step ? "#fff" : "#444" }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, color: i === step ? "#fff" : "#444", fontWeight: i === step ? 700 : 400, textTransform: "uppercase", letterSpacing: 0.5 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 0 — Identidade */}
      {step === 0 && (
        <div>
          <Section title="Dados básicos">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome artístico</label>
                <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} style={inputStyle} placeholder="Como quer ser chamada(o)" />
              </div>
              <div>
                <label style={labelStyle}>Biografia</label>
                <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  placeholder="Conte sobre você, seus diferenciais, o que oferece de especial..." />
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{form.bio.length} caracteres</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inputStyle} placeholder="São Paulo" />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <input value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle} placeholder="SP" maxLength={2} />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Categoria">
            <div style={{ display: "flex", gap: 10 }}>
              {["MULHER", "TRANS", "HOMEM"].map((c) => (
                <button key={c} type="button" onClick={() => toggleSingle("escortCategory", c)}
                  style={{ flex: 1, padding: "14px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, border: `2px solid ${form.escortCategory === c ? "#cc0000" : "#2a2a2a"}`, background: form.escortCategory === c ? "rgba(204,0,0,0.1)" : "#0d0d0d", color: form.escortCategory === c ? "#fff" : "#555" }}>
                  {c === "MULHER" ? "Mulher" : c === "TRANS" ? "Trans" : "Homem"}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* STEP 1 — Aparência */}
      {step === 1 && (
        <div>
          <Section title="Medidas">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Idade</label>
                <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Altura (cm)</label>
                <input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} style={inputStyle} placeholder="170" min={140} max={220} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg)</label>
                <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} style={inputStyle} placeholder="60" min={40} max={200} />
              </div>
            </div>
          </Section>

          <Section title="Cabelo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CABELOS.map((c) => <Tag key={c} label={c} active={form.hairColor === c} onClick={() => toggleSingle("hairColor", c)} />)}
            </div>
          </Section>

          <Section title="Cor dos olhos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {OLHOS.map((c) => <Tag key={c} label={c} active={form.eyeColor === c} onClick={() => toggleSingle("eyeColor", c)} />)}
            </div>
          </Section>

          <Section title="Etnia">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ETNIAS.map((c) => <Tag key={c} label={c} active={form.ethnicity === c} onClick={() => toggleSingle("ethnicity", c)} />)}
            </div>
          </Section>

          <Section title="Outros">
            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={() => set("hasTattoos", !form.hasTattoos)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, border: `2px solid ${form.hasTattoos ? "#cc0000" : "#2a2a2a"}`, background: form.hasTattoos ? "rgba(204,0,0,0.1)" : "#0d0d0d", color: form.hasTattoos ? "#fff" : "#555" }}>
                {form.hasTattoos ? "Com tatuagens" : "Sem tatuagens"}
              </button>
              <button type="button" onClick={() => set("hasSilicone", !form.hasSilicone)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, border: `2px solid ${form.hasSilicone ? "#cc0000" : "#2a2a2a"}`, background: form.hasSilicone ? "rgba(204,0,0,0.1)" : "#0d0d0d", color: form.hasSilicone ? "#fff" : "#555" }}>
                {form.hasSilicone ? "Com silicone" : "Sem silicone"}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* STEP 2 — Atendimento */}
      {step === 2 && (
        <div>
          <Section title="Tipo de atendimento">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ATENDIMENTO.map((a) => <Tag key={a} label={a} active={form.attendanceTypes.includes(a)} onClick={() => toggleArr("attendanceTypes", a)} />)}
            </div>
          </Section>

          <Section title="Atendo">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ATENDE.map((a) => <Tag key={a} label={a} active={form.servesGenders.includes(a)} onClick={() => toggleArr("servesGenders", a)} />)}
            </div>
          </Section>

          <Section title="Grupos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {GRUPOS.map((g) => <Tag key={g} label={g} active={form.grupos.includes(g)} onClick={() => toggleArr("grupos", g)} />)}
            </div>
          </Section>
        </div>
      )}

      {/* STEP 3 — Serviços */}
      {step === 3 && (
        <div>
          <Section title="Serviços oferecidos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SERVICOS.map((s) => <Tag key={s} label={s} active={form.services.includes(s)} onClick={() => toggleArr("services", s)} />)}
            </div>
          </Section>

          <Section title="Comportamento e fetiches">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FETICHES.map((f) => <Tag key={f} label={f} active={form.fetishes.includes(f)} onClick={() => toggleArr("fetishes", f)} />)}
            </div>
          </Section>
        </div>
      )}

      {/* STEP 4 — Valores */}
      {step === 4 && (
        <div>
          <Section title="Tabela de preços (R$)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { field: "price30min", label: "30 minutos" },
                { field: "pricePerHour", label: "1 hora" },
                { field: "price2h", label: "2 horas" },
                { field: "priceOvernight", label: "Pernoite" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 14 }}>R$</span>
                    <input type="number" min={0} value={(form as any)[field]} onChange={(e) => set(field, e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 36 }} placeholder="0" />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Formas de pagamento">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PAGAMENTO.map((p) => <Tag key={p} label={p} active={form.paymentMethods.includes(p)} onClick={() => toggleArr("paymentMethods", p)} />)}
            </div>
          </Section>
        </div>
      )}

      {/* STEP 5 — Contato */}
      {step === 5 && (
        <div>
          <Section title="Contato">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={inputStyle} placeholder="5511900000000" />
                <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Formato: 55 + DDD + número (ex: 5511912345678)</div>
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} placeholder="(11) 9 0000-0000" />
              </div>
              <div>
                <label style={labelStyle}>Instagram</label>
                <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} style={inputStyle} placeholder="@seuperfil" />
              </div>
              <div>
                <label style={labelStyle}>Site / Portfólio</label>
                <input value={form.website} onChange={(e) => set("website", e.target.value)} style={inputStyle} placeholder="https://" />
              </div>
            </div>
          </Section>

          <div style={{ padding: "16px 20px", background: "rgba(204,0,0,0.05)", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 10, fontSize: 13, color: "#888", lineHeight: 1.7 }}>
            Após envio, seu perfil passará por revisão da nossa equipe em até 48 horas antes de aparecer publicamente.
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 24, borderTop: "1px solid #1a1a1a" }}>
        <button onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}
          style={{ padding: "12px 24px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8, color: step === 0 ? "#333" : "#888", fontSize: 14, cursor: step === 0 ? "default" : "pointer", fontWeight: 600 }}>
          Voltar
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            style={{ padding: "12px 32px", background: "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.5px" }}>
            Continuar
          </button>
        ) : (
          <button onClick={submit} disabled={loading}
            style={{ padding: "12px 32px", background: loading ? "#5a0000" : "#cc0000", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.5px" }}>
            {loading ? "Enviando..." : "Criar perfil"}
          </button>
        )}
      </div>
    </div>
  );
}
