"use client";
import { NoPrefetchLink as Link } from "@/components/NoPrefetchLink";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight, BadgeCheck, BarChart3, CalendarDays, Camera, Check, ChevronRight,
  CircleAlert, CirclePlay, Clock3, Crown, Eye, FileImage, FileText, Images,
  MapPin, Pencil, Save, Share2, ShieldCheck, Star, UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./profile.module.css";

type ProfileForm = {
  displayName: string;
  escortCategory: "" | "MULHER" | "TRANS" | "HOMEM";
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

type ScheduleDay = { dayOfWeek: number; available: boolean; startTime: string; endTime: string };
type MeResponse = {
  image?: string | null;
  premiumUntil?: string | null;
  stories?: Array<{ id: string }>;
  professional?: {
    slug: string;
    displayName: string;
    escortCategory?: "MULHER" | "TRANS" | "HOMEM" | null;
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
    schedule?: ScheduleDay[];
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
    profileViews?: number;
    contactClicks?: number;
  } | null;
};

type ProfileFacts = {
  coverPhoto: boolean;
  galleryCount: number;
  hasVideo: boolean;
  hasStories: boolean;
  hasAgenda: boolean;
  verified: boolean;
  schedule: ScheduleDay[];
  profileViews: number;
  contactClicks: number;
  premiumActive: boolean;
};

type SignalStatus = "complete" | "pending" | "recommended";
type ProfileSignal = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  status: SignalStatus;
  href: string;
  icon: LucideIcon;
};

const emptyForm: ProfileForm = {
  displayName: "", escortCategory: "", bio: "", city: "", state: "", bairro: "",
  phone: "", whatsapp: "", instagram: "", website: "", priceMin: "", priceMax: "",
  pricePerHour: "", paymentMethods: "", attendanceTypes: "", servesGenders: "", idiomas: "",
  diasDisponiveis: "", horarioInicio: "08:00", horarioFim: "22:00", services: "",
  servicesNotOffered: "", amenities: "", serviceCities: "", approximateLocation: "", onlineVisible: true,
};

const emptyFacts: ProfileFacts = {
  coverPhoto: false, galleryCount: 0, hasVideo: false, hasStories: false, hasAgenda: false,
  verified: false, schedule: [], profileViews: 0, contactClicks: 0, premiumActive: false,
};

function parseMoneyValue(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
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

function signalLabel(status: SignalStatus) {
  if (status === "complete") return "Completo";
  if (status === "pending") return "Pendente";
  return "Recomendado";
}

function categoryLabel(value: ProfileForm["escortCategory"]) {
  if (value === "MULHER") return "Mulheres";
  if (value === "TRANS") return "Trans";
  if (value === "HOMEM") return "Homens";
  return "Não definida";
}

export default function EditarPerfilPage() {
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [facts, setFacts] = useState<ProfileFacts>(emptyFacts);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setInitialLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users/me", { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data: MeResponse = await res.json();
        const professional = data.professional;
        if (!professional) {
          setError("Nenhum perfil profissional encontrado para esta conta.");
          return;
        }
        const coverPhoto = professional.photos?.find((photo) => photo.cover)?.url ?? professional.image ?? null;
        const galleryCount = professional.photos?.filter((photo) => !photo.cover).length || (professional.galleryUrls ?? []).filter((url) => url !== coverPhoto).length;
        const verified = Boolean(professional.verified || professional.kycStatus === "APPROVED" || professional.docStatus === "APPROVED" || professional.verifStatus === "APPROVED");
        const schedule = professional.schedule ?? [];
        setProfileSlug(professional.slug);
        setProfileImage(data.image ?? null);
        setProfileStatus(professional.status ?? null);
        setFacts({
          coverPhoto: Boolean(coverPhoto),
          galleryCount,
          hasVideo: Boolean(professional.presentationVideoUrl && professional.presentationVideoStatus !== "REJECTED"),
          hasStories: (data.stories?.length ?? 0) > 0,
          hasAgenda: schedule.some((day) => day.available),
          verified,
          schedule,
          profileViews: professional.profileViews ?? 0,
          contactClicks: professional.contactClicks ?? 0,
          premiumActive: Boolean(data.premiumUntil && new Date(data.premiumUntil) > new Date()),
        });
        setForm({
          displayName: professional.displayName ?? "",
          escortCategory: professional.escortCategory ?? "",
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

  const signals = useMemo<ProfileSignal[]>(() => {
    const hasDescription = form.bio.trim().length >= 80;
    return [
      { key: "profile", label: "Foto de perfil", description: "Sua foto principal no perfil.", done: Boolean(profileImage), status: profileImage ? "complete" : "pending", href: "/profissional/fotos", icon: UserRound },
      { key: "cover", label: "Foto de capa", description: "Destaque seu perfil com uma imagem de capa.", done: facts.coverPhoto, status: facts.coverPhoto ? "complete" : "pending", href: "/profissional/fotos", icon: FileImage },
      { key: "gallery", label: "Galeria", description: "Adicione mais fotos para mostrar seu trabalho.", done: facts.galleryCount >= 3, status: facts.galleryCount >= 3 ? "complete" : "pending", href: "/profissional/fotos", icon: Images },
      { key: "video", label: "Vídeo", description: "Grave um vídeo curto de apresentação.", done: facts.hasVideo, status: facts.hasVideo ? "complete" : "recommended", href: "/profissional/postar#video-apresentacao", icon: CirclePlay },
      { key: "stories", label: "Stories", description: "Conecte seus stories e mostre seu dia a dia.", done: facts.hasStories, status: facts.hasStories ? "complete" : "recommended", href: "/profissional/stories", icon: Camera },
      { key: "agenda", label: "Agenda", description: "Mantenha seus horários atualizados.", done: facts.hasAgenda, status: facts.hasAgenda ? "complete" : "pending", href: "/profissional/agenda", icon: CalendarDays },
      { key: "description", label: "Descrição", description: "Conte mais sobre você e seu trabalho.", done: hasDescription, status: hasDescription ? "complete" : "pending", href: "#dados-principais", icon: FileText },
      { key: "verification", label: "Verificação", description: "Sua identidade verificada traz mais segurança.", done: facts.verified, status: facts.verified ? "complete" : "pending", href: "/profissional/analise", icon: ShieldCheck },
    ];
  }, [facts, form.bio, profileImage]);

  const profileProgress = Math.round((signals.filter((item) => item.done).length / signals.length) * 100);
  const pendingSignals = signals.filter((item) => !item.done);
  const contentReady = facts.coverPhoto && facts.galleryCount >= 3 && form.bio.trim().length >= 80;
  const firstSchedule = facts.schedule.find((day) => day.available);
  const displayStart = firstSchedule?.startTime ?? form.horarioInicio;
  const displayEnd = firstSchedule?.endTime ?? form.horarioFim;
  const visibilityScores = [
    { label: "Fotos e galeria", value: Math.round(([Boolean(profileImage), facts.coverPhoto, facts.galleryCount >= 3].filter(Boolean).length / 3) * 100) },
    { label: "Descrição", value: Math.min(100, Math.round((form.bio.trim().length / 80) * 100)) },
    { label: "Agenda", value: facts.hasAgenda ? 100 : 0 },
    { label: "Plano", value: facts.premiumActive ? 100 : 0 },
  ];

  async function handleSave() {
    if (!profileSlug) return toast.error("Perfil profissional não encontrado.");
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${profileSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          escortCategory: form.escortCategory || undefined,
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
      if (!res.ok) throw new Error("save");
      toast.success("Seu perfil foi atualizado.");
    } catch {
      toast.error("Não foi possível concluir agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function shareProfile() {
    if (!profileSlug) return;
    const url = `${window.location.origin}/profissionais/${profileSlug}`;
    try {
      if (navigator.share) await navigator.share({ title: form.displayName || "Perfil Elite Modell", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link do perfil copiado.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      toast.error("Não foi possível compartilhar o perfil agora.");
    }
  }

  if (initialLoading) return <ProfileLoading />;
  if (error) return <div className={styles.page}><section className={styles.stateCard}>{error}</section></div>;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="profile-title">
        <div><span className={styles.eyebrow}>Meu perfil profissional</span><h1 id="profile-title">Perfil profissional</h1><p>Mantenha seus dados, descrição, contato e visibilidade atualizados com acabamento premium.</p></div>
        <div className={styles.heroCrown} aria-hidden="true"><Crown /></div>
      </section>

      <section className={styles.overviewCard} aria-label="Visão geral do perfil">
        <div className={styles.overviewTop}>
          <Link href="/profissional/fotos" className={styles.avatarLink} aria-label="Editar foto de perfil">
            <span className={styles.avatar}>{profileImage ? <Image src={profileImage} alt={form.displayName || "Foto do perfil"} width={174} height={174} sizes="174px" /> : <UserRound />}</span>
            <span className={styles.onlineDot} /><span className={styles.cameraBadge}><Camera /></span>
          </Link>
          <div className={styles.identity}>
            <span className={`${styles.liveBadge} ${profileStatus === "ACTIVE" ? styles.live : styles.inactive}`}><i /> {statusLabel(profileStatus)}</span>
            <h2>{form.displayName || "Perfil Elite"}</h2>
            <p><MapPin /> {form.city || "Cidade"}{form.state ? `, ${form.state}` : ""}</p>
            <div className={styles.trustBadges}>
              <span><BadgeCheck /> {facts.verified ? "Verificação aprovada" : "Verificação em análise"}</span>
              <span><ShieldCheck /> Revisão manual</span>
              <span><Eye /> {form.onlineVisible ? "Visibilidade ativa" : "Visibilidade limitada"}</span>
            </div>
            <div className={styles.signalBadges}>
              {pendingSignals.slice(0, 5).map((item) => <span key={item.key} className={item.status === "pending" ? styles.pendingChip : styles.recommendedChip}><item.icon /> {item.label} {signalLabel(item.status).toLowerCase()}</span>)}
              {pendingSignals.length === 0 ? <span className={styles.completeChip}><Check /> Perfil completo</span> : null}
            </div>
          </div>
        </div>
        <div className={styles.overviewProgress}><div><strong>Perfil {profileProgress}% completo</strong><a href="#progresso">Ver detalhes <ArrowRight /></a></div><ProgressBar value={profileProgress} /></div>
        <div className={styles.overviewActions}>
          <a className={styles.primaryButton} href="#dados-principais"><Pencil /> Editar perfil</a>
          {profileSlug ? <Link className={styles.secondaryButton} href={`/profissionais/${profileSlug}`}><Eye /> Ver anúncio</Link> : null}
          <button className={styles.secondaryButton} type="button" onClick={shareProfile}><Share2 /> Compartilhar</button>
        </div>
      </section>

      <section id="progresso" className={styles.progressSection}>
        <div className={styles.progressHero}>
          <div><span className={styles.eyebrow}>Seu perfil profissional</span><h2>Perfil <em>{profileProgress}%</em> completo</h2><p>Veja o que está completo e o que ainda merece atenção.</p></div>
          <a href="#proximos-passos" className={styles.guidanceButton}><CircleAlert /> Orientação</a>
          <div className={styles.progressCrown} aria-hidden="true"><Crown /></div>
          <div className={styles.heroProgress}><ProgressBar value={profileProgress} /><strong>{profileProgress}%</strong></div>
        </div>
        <div className={styles.checklist}>{signals.map((item) => <SignalRow key={item.key} signal={item} />)}</div>
        <div className={styles.growthCard}>
          <span className={styles.growthIcon}><BarChart3 /></span>
          <div><span className={styles.eyebrow}>Mais oportunidades</span><h3>Perfis mais completos recebem mais visualizações e mais contatos.</h3><p>Quanto mais informações você adiciona, maiores são as chances de ser encontrada.</p></div>
          <div className={styles.growthArt} aria-hidden="true"><ArrowRight /></div>
        </div>
      </section>

      <section id="dados-principais" className={styles.formSection}>
        <SectionHeading eyebrow="Dados principais" title="Dados principais" description="Mantenha seus dados sempre atualizados para transmitir mais confiança e atrair melhores oportunidades." icon={UserRound} />
        <div className={styles.identityStrip}>
          <span className={styles.miniAvatar}>{profileImage ? <Image src={profileImage} alt="" width={62} height={62} sizes="62px" /> : <UserRound />}</span>
          <div><strong>{form.displayName || "Perfil Elite"}</strong><small><MapPin /> {form.city || "Cidade"}{form.state ? `, ${form.state}` : ""}</small></div>
          <span className={`${styles.liveBadge} ${profileStatus === "ACTIVE" ? styles.live : styles.inactive}`}><i /> {statusLabel(profileStatus)}</span>
          <span className={styles.summaryBadge}><BadgeCheck /> {facts.verified ? "Verificado" : "Em análise"}</span>
          <span className={styles.summaryBadge}><Eye /> {form.onlineVisible ? "Visível" : "Oculto"}</span>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
          <FormGroup title="Identidade e localização" description="Informações exibidas no seu anúncio público.">
            <Field label="Nome profissional" help="Nome que clientes verão no perfil."><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
            <Field label="Categoria pública" help={`Categoria atual: ${categoryLabel(form.escortCategory)}.`}><select value={form.escortCategory} onChange={(event) => setForm({ ...form, escortCategory: event.target.value as ProfileForm["escortCategory"] })}><option value="">Selecione</option><option value="MULHER">Mulheres</option><option value="TRANS">Trans</option><option value="HOMEM">Homens</option></select></Field>
            <Field label="Cidade" help="Ajuda clientes da sua região a encontrarem você."><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="Estado"><input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></Field>
            <Field label="Bairro"><input value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} /></Field>
            <Field label="Localização aproximada"><input value={form.approximateLocation} onChange={(event) => setForm({ ...form, approximateLocation: event.target.value })} placeholder="Região central, próximo ao bairro..." /></Field>
          </FormGroup>

          <FormGroup title="Descrição do perfil" description="Apresente sua personalidade, seu estilo e seus diferenciais." wide>
            <Field label="Sobre você" help="Esta descrição será exibida publicamente no seu perfil." counter={`${form.bio.length}/1000`} wide><textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} placeholder="Conte um pouco mais sobre você, seu estilo, interesses e o que torna seu atendimento único." /></Field>
          </FormGroup>

          <FormGroup title="Contato e valores" description="Mantenha seus canais e valores comerciais atualizados.">
            <Field label="Telefone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="WhatsApp"><input value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></Field>
            <Field label="Instagram"><input value={form.instagram} onChange={(event) => setForm({ ...form, instagram: event.target.value })} /></Field>
            <Field label="Website"><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></Field>
            <Field label="Preço mínimo"><input inputMode="decimal" value={form.priceMin} onChange={(event) => setForm({ ...form, priceMin: event.target.value.replace(/[^\d,.]/g, "") })} /></Field>
            <Field label="Preço máximo"><input inputMode="decimal" value={form.priceMax} onChange={(event) => setForm({ ...form, priceMax: event.target.value.replace(/[^\d,.]/g, "") })} /></Field>
            <Field label="Valor por hora"><input inputMode="decimal" value={form.pricePerHour} onChange={(event) => setForm({ ...form, pricePerHour: event.target.value.replace(/[^\d,.]/g, "") })} /></Field>
            <Field label="Formas de pagamento"><input value={form.paymentMethods} onChange={(event) => setForm({ ...form, paymentMethods: event.target.value })} placeholder="Pix, Dinheiro, Cartão" /></Field>
          </FormGroup>

          <FormGroup title="Atendimento e serviços" description="Separe vários itens com vírgulas para organizar seu anúncio.">
            <Field label="Tipos de atendimento"><input value={form.attendanceTypes} onChange={(event) => setForm({ ...form, attendanceTypes: event.target.value })} placeholder="Com local, Hotel, Atendimento virtual" /></Field>
            <Field label="Atende"><input value={form.servesGenders} onChange={(event) => setForm({ ...form, servesGenders: event.target.value })} placeholder="Homens, Mulheres, Casais" /></Field>
            <Field label="Serviços oferecidos"><input value={form.services} onChange={(event) => setForm({ ...form, services: event.target.value })} /></Field>
            <Field label="Serviços não oferecidos"><input value={form.servicesNotOffered} onChange={(event) => setForm({ ...form, servicesNotOffered: event.target.value })} /></Field>
            <Field label="Comodidades"><input value={form.amenities} onChange={(event) => setForm({ ...form, amenities: event.target.value })} placeholder="Estacionamento, Ar-condicionado" /></Field>
            <Field label="Cidades atendidas"><input value={form.serviceCities} onChange={(event) => setForm({ ...form, serviceCities: event.target.value })} /></Field>
            <Field label="Idiomas"><input value={form.idiomas} onChange={(event) => setForm({ ...form, idiomas: event.target.value })} /></Field>
            <Field label="Dias disponíveis"><input value={form.diasDisponiveis} onChange={(event) => setForm({ ...form, diasDisponiveis: event.target.value })} /></Field>
            <Field label="Início do atendimento"><input type="time" value={form.horarioInicio} onChange={(event) => setForm({ ...form, horarioInicio: event.target.value })} /></Field>
            <Field label="Fim do atendimento"><input type="time" value={form.horarioFim} onChange={(event) => setForm({ ...form, horarioFim: event.target.value })} /></Field>
            <label className={styles.visibilityToggle}><input type="checkbox" checked={form.onlineVisible} onChange={(event) => setForm({ ...form, onlineVisible: event.target.checked })} /><span><strong>Exibir status online</strong><small>Mostre quando você estiver usando a área profissional.</small></span></label>
          </FormGroup>

          <div className={styles.formActions}>
            <button type="submit" disabled={saving} className={styles.primaryButton}><Save /> {saving ? "Salvando..." : "Salvar alterações"}</button>
            {profileSlug ? <Link href={`/profissionais/${profileSlug}`} className={styles.secondaryButton}><Eye /> Visualizar perfil</Link> : null}
          </div>
        </form>
      </section>

      <section className={styles.detailCard}>
        <SectionHeading eyebrow="Apresentação" title="Descrição do perfil" description="Uma boa descrição destaca sua personalidade, serviços e diferenciais. Seja autêntica e mostre o que te torna única." icon={FileText} action={<a href="#dados-principais" className={styles.outlineButton}><Pencil /> Editar</a>} />
        <div className={styles.bioPreview}>{form.bio.trim() || "Sua apresentação aparecerá aqui quando você adicionar uma descrição ao perfil."}</div>
      </section>

      <section className={styles.detailCard}>
        <SectionHeading eyebrow="Confiança" title="Confiança e verificação" description={facts.verified ? "Seu perfil passou pelas verificações e está em conformidade com nossas diretrizes." : "Acompanhe as etapas de análise para fortalecer a confiança do seu perfil."} icon={ShieldCheck} />
        <div className={styles.confidenceGrid}>
          <ConfidenceItem complete={facts.verified} icon={BadgeCheck} title={facts.verified ? "Verificação aprovada" : "Verificação em análise"} description="Documento e identidade" />
          <ConfidenceItem complete={facts.verified} icon={ShieldCheck} title="Revisão manual" description={facts.verified ? "Concluída" : "Em andamento"} />
          <ConfidenceItem complete={contentReady} icon={Check} title={contentReady ? "Conteúdo em dia" : "Conteúdo incompleto"} description={contentReady ? "Em conformidade" : "Revise as pendências"} />
        </div>
      </section>

      <section className={styles.detailCard}>
        <SectionHeading eyebrow="Desempenho" title="Visibilidade do anúncio" description="Seu posicionamento na plataforma é influenciado por conteúdo, agenda e planos." icon={BarChart3} action={<Link href="/profissional/listagem" className={styles.outlineButton}><Eye /> Abrir listagem</Link>} />
        <div className={styles.visibilityLayout}>
          <div className={styles.chart}>{visibilityScores.map((score) => <div key={score.label} className={styles.barItem}><strong>{score.value}%</strong><span className={styles.barTrack}><i style={{ height: `${Math.max(6, score.value)}%` }} /></span><small>{score.label}</small></div>)}</div>
          <div className={styles.metricsCard}><Crown /><div><strong>{facts.profileViews.toLocaleString("pt-BR")}</strong><span>visualizações do perfil</span></div><div><strong>{facts.contactClicks.toLocaleString("pt-BR")}</strong><span>contatos recebidos</span></div></div>
        </div>
      </section>

      <section className={styles.detailCard}>
        <SectionHeading eyebrow="Organização" title="Atendimento e agenda" description="Mantenha seus horários atualizados para que os clientes encontrem você no momento certo." icon={CalendarDays} action={<Link href="/profissional/agenda" className={styles.outlineButton}><CalendarDays /> Atualizar agenda</Link>} />
        <div className={styles.scheduleStrip}>
          <span className={facts.hasAgenda ? styles.available : styles.unavailable}><i /> {facts.hasAgenda ? "Disponibilidade cadastrada" : "Agenda pendente"}</span>
          <span>Das {displayStart} às {displayEnd}</span>
          <span><Clock3 /> Fuso horário <strong>Brasília (GMT-3)</strong></span>
        </div>
      </section>

      <section id="proximos-passos" className={`${styles.detailCard} ${styles.nextStepsCard}`}>
        <SectionHeading eyebrow="Próximos passos" title={pendingSignals.length ? "Seu perfil está quase pronto!" : "Seu perfil está completo!"} description={pendingSignals.length ? "Complete os itens abaixo para aumentar sua visibilidade e atrair mais oportunidades." : "Continue mantendo seus dados e conteúdos atualizados."} icon={Star} />
        <div className={styles.nextSteps}>{(pendingSignals.length ? pendingSignals.slice(0, 3) : signals.slice(0, 3)).map((item) => <Link key={item.key} href={item.href}><span><item.icon /></span><div><strong>{item.done ? `Revisar ${item.label.toLowerCase()}` : item.label}</strong><small>{item.description}</small></div><ChevronRight /></Link>)}</div>
      </section>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return <div className={styles.progressTrack} role="progressbar" aria-label="Completude do perfil" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>;
}

function SignalRow({ signal }: { signal: ProfileSignal }) {
  const Icon = signal.icon;
  const StatusIcon = signal.status === "complete" ? Check : signal.status === "pending" ? CircleAlert : Star;
  return <Link href={signal.href} className={styles.signalRow}><span className={`${styles.signalIcon} ${styles[`signal_${signal.status}`]}`}><Icon /></span><div><strong>{signal.label}</strong><small>{signal.description}</small></div><span className={`${styles.statusPill} ${styles[`status_${signal.status}`]}`}><StatusIcon /> {signalLabel(signal.status)}</span><ChevronRight /></Link>;
}

function SectionHeading({ eyebrow, title, description, icon: Icon, action }: { eyebrow: string; title: string; description: string; icon: LucideIcon; action?: React.ReactNode }) {
  return <div className={styles.sectionHeading}><span className={styles.sectionIcon}><Icon /></span><div><span className={styles.eyebrow}>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action ? <div className={styles.headingAction}>{action}</div> : null}</div>;
}

function FormGroup({ title, description, wide = false, children }: { title: string; description: string; wide?: boolean; children: React.ReactNode }) {
  return <fieldset className={`${styles.formGroup} ${wide ? styles.formGroupWide : ""}`}><legend>{title}</legend><p>{description}</p><div className={styles.fieldGrid}>{children}</div></fieldset>;
}

function Field({ label, help, counter, wide = false, children }: { label: string; help?: string; counter?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`}><span>{label}{counter ? <small>{counter}</small> : null}</span>{children}{help ? <em>{help}</em> : null}</label>;
}

function ConfidenceItem({ complete, icon: Icon, title, description }: { complete: boolean; icon: LucideIcon; title: string; description: string }) {
  return <div className={complete ? styles.confidenceComplete : styles.confidencePending}><span><Icon /></span><div><strong>{title}</strong><small>{description}</small></div></div>;
}

function ProfileLoading() {
  return <div className={styles.page}><section className={styles.loadingCard}><span /><span /><span /></section><section className={styles.loadingCard}><span /><span /></section></div>;
}
