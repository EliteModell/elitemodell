"use client";

/* eslint-disable @next/next/no-img-element -- Avatar/profile image can come from uploaded Supabase URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { BadgeCheck, CalendarDays, Camera, CirclePlay, Eye, Images, MapPin, Save, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import {
  PremiumHeroCard,
  PremiumSection,
} from "@/components/professional-dashboard/ProfessionalPremium";

type ProfileForm = {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  bairro: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  priceMin: string;
  priceMax: string;
  pricePerHour: string;
  paymentMethods: string;
  attendanceTypes: string;
  servesGenders: string;
  idiomas: string;
  diasDisponiveis: string;
  horarioInicio: string;
  horarioFim: string;
  services: string;
  servicesNotOffered: string;
  amenities: string;
  serviceCities: string;
  approximateLocation: string;
  onlineVisible: boolean;
};

type MeResponse = {
  image?: string | null;
  premiumUntil?: string | null;
  stories?: Array<{ id: string }>;
  professional?: {
    slug: string;
    displayName: string;
    bio: string;
    city: string;
    state: string;
    bairro?: string | null;
    status?: string | null;
    verified?: boolean | null;
    kycStatus?: string | null;
    docStatus?: string | null;
    verifStatus?: string | null;
    image?: string | null;
    galleryUrls?: string[];
    presentationVideoUrl?: string | null;
    presentationVideoStatus?: string | null;
    photos?: Array<{ id: string; url: string; cover: boolean; order: number }>;
    schedule?: Array<{ dayOfWeek: number; available: boolean; startTime: string; endTime: string }>;
    phone?: string | null;
    whatsapp?: string | null;
    instagram?: string | null;
    website?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    pricePerHour?: number | null;
    paymentMethods?: string[];
    attendanceTypes?: string[];
    servesGenders?: string[];
    idiomas?: string[];
    diasDisponiveis?: string[];
    horarioInicio?: string | null;
    horarioFim?: string | null;
    services?: string[];
    servicesNotOffered?: string[];
    amenities?: string[];
    serviceCities?: string[];
    approximateLocation?: string | null;
    onlineVisible?: boolean;
  } | null;
};

type ProfileSignal = {
  label: string;
  done: boolean;
  status: "completo" | "pendente" | "recomendado";
};

const emptyForm: ProfileForm = {
  displayName: "",
  bio: "",
  city: "",
  state: "",
  bairro: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  website: "",
  priceMin: "",
  priceMax: "",
  pricePerHour: "",
  paymentMethods: "",
  attendanceTypes: "",
  servesGenders: "",
  idiomas: "",
  diasDisponiveis: "",
  horarioInicio: "08:00",
  horarioFim: "22:00",
  services: "",
  servicesNotOffered: "",
  amenities: "",
  serviceCities: "",
  approximateLocation: "",
  onlineVisible: true,
};

function parseMoneyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
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
  const [profileSignals, setProfileSignals] = useState<ProfileSignal[]>([]);
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
        const coverPhoto = professional.photos?.find((photo) => photo.cover)?.url ?? professional.image ?? null;
        const galleryCount = professional.photos?.filter((photo) => !photo.cover).length || (professional.galleryUrls ?? []).filter((url) => url !== coverPhoto).length;
        const hasVideo = Boolean(professional.presentationVideoUrl && professional.presentationVideoStatus !== "REJECTED");
        const hasStories = (data.stories?.length ?? 0) > 0;
        const hasAgenda = Boolean(professional.schedule?.some((day) => day.available));
        const hasVerification = Boolean(professional.verified || professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED");
        setProfileSlug(professional.slug);
        setProfileImage(data.image ?? null);
        setProfileStatus(professional.status ?? null);
        setVerified(hasVerification);
        setProfileSignals([
          { label: "Foto de perfil", done: Boolean(data.image), status: data.image ? "completo" : "pendente" },
          { label: "Foto de capa", done: Boolean(coverPhoto), status: coverPhoto ? "completo" : "pendente" },
          { label: "Galeria", done: galleryCount >= 3, status: galleryCount >= 3 ? "completo" : "pendente" },
          { label: "Vídeo", done: hasVideo, status: hasVideo ? "completo" : "recomendado" },
          { label: "Stories", done: hasStories, status: hasStories ? "completo" : "recomendado" },
          { label: "Agenda", done: hasAgenda, status: hasAgenda ? "completo" : "pendente" },
          { label: "Descrição", done: Boolean(professional.bio && professional.bio.trim().length >= 80), status: professional.bio && professional.bio.trim().length >= 80 ? "completo" : "pendente" },
          { label: "Verificação", done: hasVerification, status: hasVerification ? "completo" : "pendente" },
        ]);
        setForm({
          displayName: professional.displayName ?? "",
          bio: professional.bio ?? "",
          city: professional.city ?? "",
          state: professional.state ?? "",
          bairro: professional.bairro ?? "",
          phone: professional.phone ?? "",
          whatsapp: professional.whatsapp ?? "",
          instagram: professional.instagram ?? "",
          website: professional.website ?? "",
          priceMin: professional.priceMin ? String(professional.priceMin) : "",
          priceMax: professional.priceMax ? String(professional.priceMax) : "",
          pricePerHour: professional.pricePerHour ? String(professional.pricePerHour) : "",
          paymentMethods: (professional.paymentMethods ?? []).join(", "),
          attendanceTypes: (professional.attendanceTypes ?? []).join(", "),
          servesGenders: (professional.servesGenders ?? []).join(", "),
          idiomas: (professional.idiomas ?? []).join(", "),
          diasDisponiveis: (professional.diasDisponiveis ?? []).join(", "),
          horarioInicio: professional.horarioInicio ?? "08:00",
          horarioFim: professional.horarioFim ?? "22:00",
          services: (professional.services ?? []).join(", "),
          servicesNotOffered: (professional.servicesNotOffered ?? []).join(", "),
          amenities: (professional.amenities ?? []).join(", "),
          serviceCities: (professional.serviceCities ?? []).join(", "),
          approximateLocation: professional.approximateLocation ?? "",
          onlineVisible: professional.onlineVisible !== false,
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
          bairro: form.bairro || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          instagram: form.instagram || undefined,
          website: form.website || undefined,
          priceMin: parseMoneyValue(form.priceMin),
          priceMax: parseMoneyValue(form.priceMax),
          pricePerHour: parseMoneyValue(form.pricePerHour),
          paymentMethods: parseList(form.paymentMethods),
          attendanceTypes: parseList(form.attendanceTypes),
          servesGenders: parseList(form.servesGenders),
          idiomas: parseList(form.idiomas),
          diasDisponiveis: parseList(form.diasDisponiveis),
          horarioInicio: form.horarioInicio,
          horarioFim: form.horarioFim,
          services: parseList(form.services),
          servicesNotOffered: parseList(form.servicesNotOffered),
          amenities: parseList(form.amenities),
          serviceCities: parseList(form.serviceCities),
          approximateLocation: form.approximateLocation || null,
          onlineVisible: form.onlineVisible,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Seu perfil foi atualizado.");
    } catch {
      toast.error("Não foi possível concluir agora. Tente novamente.");
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

  const profileProgress = profileSignals.length
    ? Math.round((profileSignals.filter((item) => item.done).length / profileSignals.length) * 100)
    : 0;
  const statusBadges = profileSignals.filter((item) => !item.done);
  const lowerSections = [
    {
      eyebrow: "Mídia principal",
      title: "Foto de perfil e capa",
      description: "Revise as imagens que aparecem primeiro no seu anúncio.",
      href: "/profissional/fotos",
      action: "Editar fotos",
      icon: Camera,
      chips: ["Foto de perfil", "Foto de capa"],
    },
    {
      eyebrow: "Galeria",
      title: "Galeria",
      description: "Organize fotos recentes para transmitir mais confiança e melhorar a apresentação.",
      href: "/profissional/fotos",
      action: "Gerenciar galeria",
      icon: Images,
      chips: ["Fotos recentes", "Ordem da galeria", "Capa"],
    },
    {
      eyebrow: "Vídeos e stories",
      title: "Vídeos e stories",
      description: "Conteúdos recentes ajudam clientes a conhecerem melhor seu perfil.",
      href: "/profissional/postar",
      action: "Postar conteúdo",
      icon: CirclePlay,
      chips: ["Vídeo", "Stories", "Conteúdo recente"],
    },
    {
      eyebrow: "Agenda",
      title: "Agenda",
      description: "Mantenha dias e horários disponíveis para reduzir atrito no contato.",
      href: "/profissional/agenda",
      action: "Atualizar agenda",
      icon: CalendarDays,
      chips: ["Dias", "Horários", "Disponibilidade"],
    },
    {
      eyebrow: "Verificação",
      title: "Verificação",
      description: verified ? "Sua verificação está aprovada. Mantenha os dados alinhados ao perfil." : "Acompanhe sua análise para liberar sinais de confiança.",
      href: "/profissional/analise",
      action: verified ? "Ver status" : "Acompanhar análise",
      icon: ShieldCheck,
      chips: [verified ? "Aprovada" : "Em análise", "Documento", "Segurança"],
    },
    {
      eyebrow: "Visibilidade",
      title: "Visibilidade",
      description: "Controle como o perfil aparece para clientes e quais recursos comerciais estão ativos.",
      href: "/profissional/configuracoes",
      action: "Configurar",
      icon: Sparkles,
      chips: [statusLabel(profileStatus), "Privacidade", "Boost"],
    },
  ];

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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {statusBadges.length ? statusBadges.slice(0, 6).map((item) => (
                <span key={item.label} className="premium-badge" style={{ color: item.status === "pendente" ? "var(--elite-warning)" : "var(--elite-gold-light)" }}>
                  {item.label === "Galeria" ? "Adicione mais fotos" : `${item.label} ${item.status}`}
                </span>
              )) : <span className="premium-badge" style={{ color: "var(--elite-success)" }}>Perfil completo</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="premium-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p className="premium-eyebrow">Seu perfil profissional</p>
            <h2 className="premium-section-title">Perfil {profileProgress}% completo</h2>
            <p className="premium-action-text" style={{ marginTop: 10 }}>Veja o que está completo e o que ainda merece atenção.</p>
          </div>
          <span className="premium-badge">{profileProgress === 100 ? "Perfil completo" : "Orientação"}</span>
        </div>
        <div style={{ height: 10, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,0.10)", marginTop: 18 }}>
          <div style={{ width: `${profileProgress}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#D6A83A,#F5D46B)" }} />
        </div>
        <div className="premium-grid premium-grid-3" style={{ marginTop: 18 }}>
          {profileSignals.map((item) => (
            <div key={item.label} className="premium-check-card" style={{ justifyContent: "space-between" }}>
              <span>{item.label}</span>
              <span style={{ color: item.done ? "var(--elite-success)" : item.status === "pendente" ? "var(--elite-warning)" : "var(--elite-gold-light)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {item.status}
              </span>
            </div>
          ))}
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
            <label>Bairro</label>
            <input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
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
          <div>
            <label>Valor por hora</label>
            <input inputMode="decimal" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value.replace(/[^\d,.]/g, "") })} />
          </div>
        </div>
      </PremiumSection>

      <PremiumSection eyebrow="Anúncio público" title="Atendimento e serviços" description="Estes dados alimentam automaticamente Home, cidade, busca e perfil público. Separe vários itens com vírgulas.">
        <div className="premium-grid premium-grid-2">
          <div>
            <label>Tipos de atendimento</label>
            <input value={form.attendanceTypes} onChange={(e) => setForm({ ...form, attendanceTypes: e.target.value })} placeholder="Com local, Hotel, Atendimento virtual" />
          </div>
          <div>
            <label>Atende</label>
            <input value={form.servesGenders} onChange={(e) => setForm({ ...form, servesGenders: e.target.value })} placeholder="Homens, Mulheres, Casais" />
          </div>
          <div>
            <label>Serviços oferecidos</label>
            <input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
          </div>
          <div>
            <label>Serviços não oferecidos</label>
            <input value={form.servicesNotOffered} onChange={(e) => setForm({ ...form, servicesNotOffered: e.target.value })} />
          </div>
          <div>
            <label>Comodidades</label>
            <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Estacionamento, Ar-condicionado" />
          </div>
          <div>
            <label>Cidades atendidas</label>
            <input value={form.serviceCities} onChange={(e) => setForm({ ...form, serviceCities: e.target.value })} />
          </div>
          <div>
            <label>Localização aproximada</label>
            <input value={form.approximateLocation} onChange={(e) => setForm({ ...form, approximateLocation: e.target.value })} placeholder="Região central, próximo ao bairro..." />
          </div>
          <div>
            <label>Formas de pagamento</label>
            <input value={form.paymentMethods} onChange={(e) => setForm({ ...form, paymentMethods: e.target.value })} placeholder="Pix, Dinheiro, Cartão" />
          </div>
          <div>
            <label>Idiomas</label>
            <input value={form.idiomas} onChange={(e) => setForm({ ...form, idiomas: e.target.value })} />
          </div>
          <div>
            <label>Dias disponíveis</label>
            <input value={form.diasDisponiveis} onChange={(e) => setForm({ ...form, diasDisponiveis: e.target.value })} />
          </div>
          <div>
            <label>Início do atendimento</label>
            <input type="time" value={form.horarioInicio} onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })} />
          </div>
          <div>
            <label>Fim do atendimento</label>
            <input type="time" value={form.horarioFim} onChange={(e) => setForm({ ...form, horarioFim: e.target.value })} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <input type="checkbox" checked={form.onlineVisible} onChange={(e) => setForm({ ...form, onlineVisible: e.target.checked })} />
          Exibir meu status online quando eu estiver usando a área profissional
        </label>
      </PremiumSection>

      <div className="premium-grid">
        {lowerSections.map((section) => {
          const Icon = section.icon;
          return (
            <PremiumSection key={section.title} eyebrow={section.eyebrow} title={section.title} description={section.description}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", minWidth: 0 }}>
                    <span className="premium-icon-orb" style={{ width: 58, height: 58, flex: "0 0 auto" }}>
                      <Icon />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="premium-card-title">{section.title}</h3>
                      <div className="premium-chip-row" style={{ marginTop: 12 }}>
                        {section.chips.map((chip) => (
                          <span key={chip} className="premium-chip">{chip}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link href={section.href} className="premium-button-secondary">
                    {section.action}
                  </Link>
              </div>
            </PremiumSection>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={loading} className="premium-button" style={{ width: "100%" }}>
        <Save size={18} />
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </div>
  );
}
