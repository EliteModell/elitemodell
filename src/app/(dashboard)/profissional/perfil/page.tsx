"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const GOLD = "#d4a843";

const specialtyOptions = [
  "Modelo Fotográfico", "Modelo Publicitário", "Modelo Fitness", "Modelo Plus Size",
  "Modelo Editorial", "Atriz/Ator", "Influencer", "Promoter",
  "Make Artist", "Stylist", "Fotógrafo", "Videomaker",
];

type ProfileForm = {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  priceMin: string;
  priceMax: string;
  specialties: string[];
};

type MeResponse = {
  professional?: {
    slug: string;
    displayName: string;
    bio: string;
    city: string;
    state: string;
    phone?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    website?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    specialties: { name: string }[];
  } | null;
};

const emptyForm: ProfileForm = {
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
  specialties: [],
};

function parseMoneyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function MoneyField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="profile-money-field">
      <span aria-hidden="true">R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d,.]/g, ""))}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function EditarPerfilPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setInitialLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to load profile");
        const data: MeResponse = await res.json();
        const professional = data.professional;
        if (!professional) {
          setError("Nenhum perfil profissional encontrado para esta conta.");
          setForm(emptyForm);
          return;
        }
        setProfileSlug(professional.slug);
        setForm({
          displayName: professional.displayName ?? "",
          bio: professional.bio ?? "",
          city: professional.city ?? "",
          state: professional.state ?? "",
          phone: professional.phone ?? "",
          whatsapp: professional.whatsapp ?? "",
          instagram: professional.instagram ?? "",
          website: professional.website ?? "",
          priceMin: professional.priceMin ? String(professional.priceMin) : "",
          priceMax: professional.priceMax ? String(professional.priceMax) : "",
          specialties: professional.specialties?.map((s) => s.name) ?? [],
        });
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível carregar seu perfil agora.");
      } finally {
        if (!controller.signal.aborted) setInitialLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, []);

  const toggle = (s: string) =>
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));

  async function handleSave() {
    if (!profileSlug) {
      toast.error("Perfil profissional não encontrado.");
      return;
    }

    setLoading(true);
    try {
      const priceMin = parseMoneyValue(form.priceMin);
      const priceMax = parseMoneyValue(form.priceMax);
      const res = await fetch(`/api/professionals/${profileSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          bio: form.bio,
          city: form.city,
          state: form.state,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          instagram: form.instagram || undefined,
          website: form.website || undefined,
          priceMin,
          priceMax,
          specialties: form.specialties,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Não foi possível salvar o perfil.");
    } finally {
      setLoading(false);
    }
  }

  const input = {
    width: "100%",
    padding: "11px 14px",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    color: "#fff" as const,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const label = { fontSize: 13, color: "#aaa", display: "block", marginBottom: 6, fontWeight: 500 } as const;
  const focus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = GOLD;
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = "#2a2a2a";
    },
  };
  const allSpecialtyOptions = Array.from(new Set([...specialtyOptions, ...form.specialties]));

  if (initialLoading) {
    return (
      <div className="premium-card premium-enter" style={{ maxWidth: 700, borderRadius: 8, padding: 24 }}>
        <div className="premium-skeleton" style={{ height: 24, width: 220, borderRadius: 999 }} />
        <div className="premium-skeleton" style={{ height: 12, width: "75%", borderRadius: 999, marginTop: 14 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-empty-state premium-enter" style={{ maxWidth: 700, borderRadius: 8, padding: 32, color: "#aaa" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Editar perfil</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Mantenha suas informações sempre atualizadas com dados salvos no banco.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Informações básicas</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>Nome artístico / nome público</label>
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

        <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Especialidades</h2>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>Selecione todas que se aplicam ao seu trabalho.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allSpecialtyOptions.map((s) => (
              <button
                key={s}
                onClick={() => toggle(s)}
                style={{
                  padding: "7px 14px",
                  background: form.specialties.includes(s) ? "rgba(204,0,0,0.12)" : "#0d0d0d",
                  border: `1.5px solid ${form.specialties.includes(s) ? "#cc0000" : "#222"}`,
                  borderRadius: 999,
                  color: form.specialties.includes(s) ? "#fff" : "#888",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: form.specialties.includes(s) ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {form.specialties.includes(s) ? "OK " : ""}{s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Faixa de preço</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <div>
              <label style={label}>Preço mínimo (R$)</label>
              <MoneyField value={form.priceMin} onChange={(value) => setForm({ ...form, priceMin: value })} placeholder="500" />
            </div>
            <div>
              <label style={label}>Preço máximo (R$)</label>
              <MoneyField value={form.priceMax} onChange={(value) => setForm({ ...form, priceMax: value })} placeholder="2000" />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#555", marginTop: 10 }}>Os valores são uma referência. O preço final é negociado com cada cliente.</p>
        </div>

        <div style={{ background: "#111", border: "1px solid rgba(212,168,67,.16)", borderRadius: 18, padding: "22px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Contato e redes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "phone", label: "Telefone", placeholder: "11 99999-9999" },
              { key: "whatsapp", label: "WhatsApp (para contato direto)", placeholder: "11 99999-9999" },
              { key: "instagram", label: "Instagram", placeholder: "@seuperfil" },
              { key: "website", label: "Site / portfólio", placeholder: "www.seuperfil.com" },
            ].map((f) => (
              <div key={f.key}>
                <label style={label}>{f.label}</label>
                <input style={input} value={form[f.key as keyof Pick<ProfileForm, "phone" | "whatsapp" | "instagram" | "website">]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} {...focus} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: "14px",
            background: loading ? "#8f7128" : "#d4a843",
            color: "#080704",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#f5d78c"; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#d4a843"; }}
        >
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
      <style>{`
        .profile-money-field {
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr);
          min-height: 46px;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          background: #0d0d0d;
          overflow: hidden;
        }
        .profile-money-field > span {
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(212,168,67,0.25);
          color: ${GOLD};
          font-size: 14px;
          font-weight: 900;
          user-select: none;
        }
        .profile-money-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: #fff;
          padding: 11px 14px;
          font-size: 14px;
          outline: none;
          box-shadow: none;
        }
        .profile-money-field:focus-within {
          border-color: ${GOLD};
          box-shadow: 0 0 0 3px rgba(212,168,67,0.14);
        }
      `}</style>
    </div>
  );
}
