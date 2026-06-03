"use client";

/* eslint-disable @next/next/no-img-element -- Avatar/profile image can come from uploaded Supabase URLs. */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BadgeCheck, Eye, MapPin, Save, ShieldCheck, UserRound } from "lucide-react";
import {
  PremiumHeroCard,
  PremiumSection,
} from "@/components/professional-dashboard/ProfessionalPremium";

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
};

type MeResponse = {
  professional?: {
    slug: string;
    displayName: string;
    bio: string;
    city: string;
    state: string;
    status?: string | null;
    verified?: boolean | null;
    image?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    website?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
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
};

function parseMoneyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function statusLabel(status?: string | null) {
  if (status === "ACTIVE") return "ATIVO";
  if (status === "PAUSED") return "PAUSADO";
  if (status === "REJECTED") return "REPROVADO";
  if (status === "SUSPENDED") return "SUSPENSO";
  return "EM ANÁLISE";
}

export default function EditarPerfilPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
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
          return;
        }
        setProfileSlug(professional.slug);
        setProfileImage(professional.image ?? null);
        setProfileStatus(professional.status ?? null);
        setVerified(Boolean(professional.verified));
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
        });
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível carregar seu perfil agora.");
      } finally {
        if (!controller.signal.aborted) setInitialLoading(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);

  async function handleSave() {
    if (!profileSlug) {
      toast.error("Perfil profissional não encontrado.");
      return;
    }

    setLoading(true);
    try {
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
          priceMin: parseMoneyValue(form.priceMin),
          priceMax: parseMoneyValue(form.priceMax),
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

  if (initialLoading) {
    return (
      <div className="professional-premium-page">
        <div className="premium-section-card">
          <div className="premium-skeleton" style={{ height: 28, width: 220, borderRadius: 999 }} />
          <div className="premium-skeleton" style={{ height: 14, width: "70%", borderRadius: 999, marginTop: 16 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="professional-premium-page"><div className="premium-section-card">{error}</div></div>;
  }

  return (
    <div className="professional-premium-page premium-form">
      <PremiumHeroCard
        eyebrow="Meu perfil profissional"
        title={<>Perfil <span className="gold">profissional</span></>}
        subtitle="Mantenha seus dados, descrição, contato e visibilidade atualizados com acabamento premium."
        illustration="profile"
      />

      <section className="premium-section-card">
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 18, alignItems: "center" }}>
          <div className="premium-avatar" style={{ width: 112, height: 112 }}>
            {profileImage ? <img src={profileImage} alt={form.displayName} /> : <UserRound size={52} color="#F5D46B" />}
          </div>
          <div>
            <span className="premium-badge" style={{ color: profileStatus === "ACTIVE" ? "var(--elite-success)" : "var(--elite-gold-light)" }}>
              {statusLabel(profileStatus)}
            </span>
            <h2 className="premium-section-title" style={{ marginTop: 10 }}>{form.displayName || "Perfil Elite"}</h2>
            <p className="premium-action-text" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <MapPin size={18} />
              {form.city || "Cidade"}{form.state ? `, ${form.state}` : ""}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {verified ? <span className="premium-badge"><BadgeCheck size={14} /> Verificação aprovada</span> : null}
              <span className="premium-badge"><ShieldCheck size={14} /> Revisão manual</span>
              <span className="premium-badge"><Eye size={14} /> Visibilidade</span>
            </div>
          </div>
        </div>
      </section>

      <PremiumSection eyebrow="Dados principais" title="Dados principais">
        <div className="premium-grid premium-grid-2">
          <div>
            <label>Nome profissional</label>
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <label>Cidade</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label>Estado</label>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </div>
          <div>
            <label>WhatsApp</label>
            <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
        </div>
      </PremiumSection>

      <PremiumSection eyebrow="Bio/descrição" title="Bio e descrição">
        <label>Descrição pública</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Descreva seu atendimento, diferenciais e estilo de forma clara." />
        <p className="premium-action-text" style={{ marginTop: 8 }}>{form.bio.length}/1000 caracteres</p>
      </PremiumSection>

      <PremiumSection eyebrow="Contato e valores" title="Contato e valores">
        <div className="premium-grid premium-grid-2">
          <div>
            <label>Telefone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label>Instagram</label>
            <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
          </div>
          <div>
            <label>Preço mínimo</label>
            <input inputMode="decimal" value={form.priceMin} onChange={(e) => setForm({ ...form, priceMin: e.target.value.replace(/[^\d,.]/g, "") })} />
          </div>
          <div>
            <label>Preço máximo</label>
            <input inputMode="decimal" value={form.priceMax} onChange={(e) => setForm({ ...form, priceMax: e.target.value.replace(/[^\d,.]/g, "") })} />
          </div>
        </div>
      </PremiumSection>

      <button onClick={handleSave} disabled={loading} className="premium-button" style={{ width: "100%" }}>
        <Save size={18} />
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </div>
  );
}
