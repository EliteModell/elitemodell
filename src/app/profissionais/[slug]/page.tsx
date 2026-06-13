"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import PublicReportButton from "@/components/moderation/PublicReportButton";
import ProfessionalContactAction from "@/components/professionals/ProfessionalContactAction";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import styles from "./profile.module.css";

const ActionAuthModal = dynamic(() => import("@/components/auth/ActionAuthModal"));
const PremiumUpsellModal = dynamic(() => import("@/components/premium/PremiumUpsellModal"));
const ReviewForm = dynamic(() => import("@/components/ReviewForm"));

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

type GaleriaFiltro = "todas" | "fotos" | "videos";

type ApiProfessional = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  city: string;
  state: string;
  bairro?: string | null;
  image?: string | null;
  galleryUrls?: string[];
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  hidePhone?: boolean;
  contactVisibility?: "PUBLIC" | "LOGGED_IN" | "PREMIUM";
  contactAvailable?: boolean;
  priceMin?: number | null;
  pricePerHour?: number | null;
  price30min?: number | null;
  price2h?: number | null;
  priceOvernight?: number | null;
  priceWebcam?: number | null;
  paymentMethods?: string[];
  escortCategory?: string | null;
  birthDate?: string | null;
  age?: number | null;
  hideAge?: boolean;
  height?: number | null;
  weight?: number | null;
  hairColor?: string | null;
  eyeColor?: string | null;
  ethnicity?: string | null;
  signo?: string | null;
  hasTattoos?: boolean;
  hasSilicone?: boolean;
  isDepilada?: boolean;
  attendanceTypes?: string[];
  servesGenders?: string[];
  idiomas?: string[];
  diasDisponiveis?: string[];
  horarioInicio?: string | null;
  horarioFim?: string | null;
  services?: string[];
  servicesNotOffered?: string[];
  fetishes?: string[];
  amenities?: string[];
  serviceCities?: string[];
  approximateLocation?: string | null;
  presentationVideoUrl?: string | null;
  presentationVideoStatus?: string | null;
  hasPremiumVideo?: boolean;
  hasMoreReviews?: boolean;
  verified: boolean;
  featured: boolean;
  boostActive?: boolean;
  boostUntil?: string | null;
  online?: boolean;
  sponsored?: boolean;
  profileViews?: number;
  rating: number;
  totalReviews: number;
  specialties: { id: string; name: string }[];
  photos: { id: string; url: string; cover: boolean }[];
  reviews: { id: string; rating: number; comment: string; createdAt: string; author: { name: string | null; image: string | null } | null }[];
  verificationUrl?: string | null;
  verificationType?: string | null;
  createdAt: string;
  user?: { name: string | null; image: string | null; createdAt: string };
  stories?: Array<{ id: string; mediaUrl: string; mediaType: string; thumbnail: string | null; views: number; createdAt: string }>;
};

type SimilarPro = {
  id: string;
  slug: string;
  displayName: string;
  image?: string | null;
  priceMin?: number | null;
  pricePerHour?: number | null;
};

type AvailableVoucher = {
  id: string;
  code: string;
  value: number;
  expiresAt: string;
  requiresPayment: boolean;
  paymentStatus: string;
};

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export default function ProfissionalProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [pro, setPro] = useState<ApiProfessional | null>(null);
  const [similar, setSimilar] = useState<SimilarPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDuration, setBookingDuration] = useState(60);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");
  const [acceptsVouchers, setAcceptsVouchers] = useState<boolean | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [authIntent, setAuthIntent] = useState<"review" | "favorite" | "report" | null>(null);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [eligibleAppointmentId, setEligibleAppointmentId] = useState<string | null | undefined>(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumFeature, setPremiumFeature] = useState("recursos exclusivos");
  const [premiumVideoUrl, setPremiumVideoUrl] = useState<string | null>(null);
  const [premiumReviews, setPremiumReviews] = useState<ApiProfessional["reviews"] | null>(null);
  const resumedActionRef = useRef<string | null>(null);

  const [galeriaFiltro, setGaleriaFiltro] = useState<GaleriaFiltro>("todas");
  const [photoOpen, setPhotoOpen] = useState<number | null>(null);
  const [servicosAbertos, setServicosAbertos] = useState(false);
  const [caracteristicasAbertas, setCaracteristicasAbertas] = useState(true);

  const refGaleria = useRef<HTMLDivElement>(null);
  const refSobre = useRef<HTMLDivElement>(null);
  const refAvaliacoes = useRef<HTMLDivElement>(null);

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function trackContactClick() {
    void fetch(`/api/professionals/${slug}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "contact_click" }),
    }).catch(() => undefined);
  }

  function actionReturnUrl(action: "review" | "favorite" | "report") {
    const hash = action === "review" ? "#avaliacoes" : "";
    return `/profissionais/${slug}?action=${action}${hash}`;
  }

  function requireAccount(action: "review" | "favorite" | "report", run: () => void) {
    if (authStatus === "authenticated") {
      run();
      return;
    }
    setAuthIntent(action);
  }

  async function beginFavorite() {
    requireAccount("favorite", () => {
      if (!pro || favoriteSaving) return;
      setFavoriteSaving(true);
      void fetch("/api/favorites/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId: pro.id }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("favorite_failed");
          setFavoriteSaved(true);
        })
        .catch(() => setFavoriteSaved(false))
        .finally(() => setFavoriteSaving(false));
    });
  }

  function beginReport() {
    requireAccount("report", () => setReportOpen(true));
  }

  function beginReview() {
    requireAccount("review", () => {
      if (!pro) return;
      setReviewOpen(true);
      setEligibleAppointmentId(undefined);
      void fetch(`/api/reviews?professionalId=${encodeURIComponent(pro.id)}&eligibility=1`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : { eligible: false, appointment: null })
        .then((data) => setEligibleAppointmentId(data.eligible ? data.appointment?.id ?? null : null))
        .catch(() => setEligibleAppointmentId(null));
    });
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/professionals/${slug}`, {
          signal: controller.signal,
          cache: "default",
        });
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error();
        const data: ApiProfessional = await res.json();
        setPro(data);
        void fetch(`/api/professionals/${slug}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "profile_view" }),
        }).catch(() => undefined);
      } catch {
        if (!controller.signal.aborted) setNotFound(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!pro) return;
    const controller = new AbortController();
    void fetch(
      `/api/professionals?city=${encodeURIComponent(pro.city)}&state=${encodeURIComponent(pro.state)}&sortBy=rating&limit=4`,
      { signal: controller.signal, cache: "default" },
    )
      .then((response) => response.ok ? response.json() : { professionals: [] })
      .then((data) => {
        if (controller.signal.aborted) return;
        setSimilar(
          (data.professionals ?? [])
            .filter((professional: SimilarPro) => professional.id !== pro.id)
            .slice(0, 3),
        );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pro]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !pro) return;
    const controller = new AbortController();
    void fetch(`/api/professionals/${slug}/premium-content`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data || controller.signal.aborted) return;
        setPremiumVideoUrl(data.presentationVideoUrl ?? null);
        setPremiumReviews(Array.isArray(data.reviews) ? data.reviews : null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [authStatus, pro, slug]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (authStatus !== "authenticated" || !pro || !action || resumedActionRef.current === action) return;
    resumedActionRef.current = action;
    const timer = window.setTimeout(() => {
      if (action === "favorite") {
        setFavoriteSaving(true);
        void fetch("/api/favorites/professionals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId: pro.id }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("favorite_failed");
            setFavoriteSaved(true);
          })
          .catch(() => setFavoriteSaved(false))
          .finally(() => setFavoriteSaving(false));
      }
      if (action === "review") {
        setReviewOpen(true);
        setEligibleAppointmentId(undefined);
        void fetch(`/api/reviews?professionalId=${encodeURIComponent(pro.id)}&eligibility=1`, { cache: "no-store" })
          .then((response) => response.ok ? response.json() : { eligible: false, appointment: null })
          .then((data) => setEligibleAppointmentId(data.eligible ? data.appointment?.id ?? null : null))
          .catch(() => setEligibleAppointmentId(null));
      }
      if (action === "report") setReportOpen(true);
      router.replace(`/profissionais/${slug}`, { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authStatus, pro, router, searchParams, slug]);

  useEffect(() => {
    if (!bookingOpen || authStatus !== "authenticated") return;
    const controller = new AbortController();
    async function loadAvailableVouchers() {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setVoucherLoading(true);
      try {
        const res = await fetch(`/api/vouchers/available?professionalSlug=${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error("Não foi possível carregar seus vouchers.");
        const data = await res.json();
        setAcceptsVouchers(Boolean(data.acceptsVouchers));
        setAvailableVouchers(data.vouchers ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setAcceptsVouchers(false);
          setAvailableVouchers([]);
        }
      } finally {
        if (!controller.signal.aborted) setVoucherLoading(false);
      }
    }
    void loadAvailableVouchers();
    return () => controller.abort();
  }, [authStatus, bookingOpen, slug]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.user) {
      setBookingError("Entre ou crie uma conta rápida para confirmar o agendamento e usar voucher.");
      return;
    }
    if (!bookingDate) {
      setBookingError("Escolha a data e o horário do atendimento.");
      return;
    }

    setBookingSaving(true);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalSlug: slug,
          date: bookingDate,
          duration: bookingDuration,
          contactMethod: "whatsapp",
          notes: bookingNotes || undefined,
          voucherId: selectedVoucherId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar o agendamento.");
      setBookingSuccess("Agendamento enviado. A profissional verá o voucher aplicado antes de confirmar.");
      setSelectedVoucherId("");
      setBookingNotes("");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Não foi possível criar o agendamento.");
    } finally {
      setBookingSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: "#060e1b", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Navbar />
        <p style={{ color: GOLD, fontSize: 16 }}>Carregando perfil...</p>
      </div>
    );
  }

  if (notFound || !pro) {
    return (
      <div style={{ background: "#060e1b", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Navbar />
        <p style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 700 }}>Perfil não encontrado</p>
        <Link href="/buscar" style={{ color: GOLD, textDecoration: "none" }}>← Voltar para a busca</Link>
      </div>
    );
  }

  // Monta capa, avatar e galeria sem misturar os papéis das imagens.
  const coverImage = pro.photos?.find((photo) => photo.cover)?.url ?? pro.image ?? pro.galleryUrls?.[0] ?? "";
  const relationGallery = pro.photos?.filter((photo) => !photo.cover).map((photo) => photo.url) ?? [];
  const legacyGallery = pro.galleryUrls ?? [];
  const allPhotos = Array.from(new Set([coverImage, ...(relationGallery.length ? relationGallery : legacyGallery)].filter(Boolean))) as string[];
  const profileImage = pro.user?.image ?? null;
  const fotosExibidas = galeriaFiltro === "videos" ? allPhotos.slice(0, 1) : allPhotos;

  // Serviços
  const specialtyNames = pro.specialties.map((s) => s.name);
  const allServices = [...new Set([...specialtyNames, ...(pro.services ?? [])])];

  // Características físicas
  const fisico: [string, string][] = [
    pro.height ? ["Altura", `${pro.height} cm`] : null,
    pro.weight ? ["Peso", `${pro.weight} kg`] : null,
    pro.hairColor ? ["Cabelo", pro.hairColor] : null,
    pro.eyeColor ? ["Olhos", pro.eyeColor] : null,
    pro.ethnicity ? ["Etnia", pro.ethnicity] : null,
    pro.signo ? ["Signo", pro.signo] : null,
    ["Tatuagens", pro.hasTattoos ? "Sim" : "Não"],
    ["Silicone", pro.hasSilicone ? "Sim" : "Não"],
    ["Depilada", pro.isDepilada !== false ? "Sim" : "Não"],
  ].filter(Boolean) as [string, string][];

  // Horário
  const schedule = DIAS_SEMANA.map((dia) => ({
    day: dia,
    time: `${pro.horarioInicio ?? "08:00"} – ${pro.horarioFim ?? "22:00"}`,
    available: (pro.diasDisponiveis ?? []).some((d) =>
      d.toLowerCase().startsWith(dia.toLowerCase().slice(0, 3))
    ),
  }));

  // Reviews
  const reviews = (premiumReviews ?? pro.reviews ?? []).map((r) => ({
    author: r.author?.name ?? "Anônimo",
    rating: r.rating,
    comment: r.comment ?? "",
    date: new Date(r.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  }));

  const idade = pro.age ?? calcAge(pro.birthDate);
  const preco = pro.priceMin ?? pro.pricePerHour;
  const memberYear = new Date(pro.createdAt).getFullYear();
  const bookingBasePrice = pro.pricePerHour ?? pro.priceMin ?? bookingDuration;
  const selectedVoucher = availableVouchers.find((voucher) => voucher.id === selectedVoucherId) ?? null;
  const voucherDiscount = selectedVoucher ? Math.min(bookingBasePrice, selectedVoucher.value) : 0;
  const bookingFinalPrice = Math.max(0, bookingBasePrice - voucherDiscount);

  return (
    <div style={{ background: "#060e1b", minHeight: "100vh", color: "#f1f5f9", paddingBottom: 72 }}>
      <Navbar />
      <div style={{ position: "fixed", right: 18, bottom: 82, zIndex: 90, background: "rgba(8,8,10,.92)", border: "1px solid rgba(239,68,68,.35)", borderRadius: 8, padding: "10px 12px" }}>
        {authStatus === "authenticated" ? (
          <PublicReportButton key={reportOpen ? "report-open" : "report-closed"} targetType="PROFESSIONAL" targetId={pro.id} initialOpen={reportOpen} />
        ) : (
          <button type="button" onClick={beginReport} style={{ border: 0, background: "transparent", color: "#fca5a5", textDecoration: "underline", fontWeight: 800, cursor: "pointer" }}>
            Denunciar
          </button>
        )}
      </div>

      {/* COVER com nome overlay */}
      <div style={{ paddingTop: 64 }}>
        <div className={styles.cover}>
          {coverImage ? (
            <Image
              src={coverImage}
              alt=""
              fill
              preload
              sizes="100vw"
              quality={72}
              style={{ objectFit: "cover", objectPosition: "center 15%" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0b1420, #1a0a0a)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,14,27,0.1) 0%, rgba(6,14,27,0.5) 45%, rgba(6,14,27,0.93) 100%)" }} />
          <div className={styles.coverIdentity}>
            <h1 style={{ fontSize: "clamp(34px, 9vw, 56px)", fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR, letterSpacing: "-1px", lineHeight: 1, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>
              {pro.displayName}
            </h1>
            <p data-testid="profile-tier" style={{ fontSize: 10, color: "rgba(212,168,67,0.8)", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "7px 0 0" }}>
              {pro.verified ? "Verificada · " : ""}Premium
            </p>
          </div>
        </div>

        {/* Avatar + badges */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          <div className={styles.profileSummary}>
            <div data-testid="profile-avatar" className={styles.avatar} style={{ borderColor: GOLD }}>
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={pro.displayName}
                  fill
                  sizes="88px"
                  quality={62}
                  loading="eager"
                  style={{ objectFit: "cover", objectPosition: "top" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 28, fontWeight: 800, color: GOLD }}>
                  {pro.displayName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
              )}
            </div>
            <div className={styles.summaryDetails}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                {pro.verified && <span style={{ padding: "3px 10px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 700 }}>✓ Verificada</span>}
                {pro.featured && <span style={{ padding: "3px 10px", background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 20, fontSize: 11, color: "#cc0000", fontWeight: 700 }}>★ Destaque</span>}
                {pro.boostActive && <span style={{ padding: "3px 10px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.28)", borderRadius: 20, fontSize: 11, color: "#22c55e", fontWeight: 700 }}>Impulsionado</span>}
                <span style={{ padding: "3px 10px", background: pro.online ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,.04)", border: `1px solid ${pro.online ? "rgba(34,197,94,.28)" : "rgba(255,255,255,.08)"}`, borderRadius: 20, fontSize: 11, color: pro.online ? "#34d399" : "#64748b", fontWeight: 700 }}>{pro.online ? "Online agora" : "Offline"}</span>
                <button type="button" onClick={() => void beginFavorite()} disabled={favoriteSaving} style={{ padding: "3px 10px", background: favoriteSaved ? GOLD : GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: favoriteSaved ? "#060e1b" : GOLD, fontWeight: 800, cursor: "pointer" }}>
                  {favoriteSaved ? "Salvo" : favoriteSaving ? "Salvando..." : "Favoritar"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#64748b", alignItems: "center" }}>
                {idade && <><span>{idade} anos</span><span>·</span></>}
                <span>{pro.city}, {pro.state}</span><span>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ color: "#f59e0b", fontWeight: 700 }}>{(pro.rating ?? 0).toFixed(1)}</span>
                  <span>({pro.totalReviews ?? 0})</span>
                </span>
                <span>·</span><span>{(pro.profileViews ?? 0).toLocaleString("pt-BR")} visualizações</span>
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
              <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, fontFamily: PLAYFAIR }}>{preco ? `R$ ${preco.toLocaleString("pt-BR")}/h` : "Consulte"}</div>
              {pro.attendanceTypes && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{pro.attendanceTypes.join(", ")}</div>}
            </div>
            <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>📍 Localização</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>{pro.city}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{pro.state}{pro.bairro ? ` · ${pro.bairro}` : ""}</div>
              {pro.servesGenders && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Atende: {pro.servesGenders.join(", ")}</div>}
            </div>
          </div>

          {/* Serviços pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            {allServices.slice(0, 6).map((s) => (
              <span key={s} style={{ padding: "4px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD }}>{s}</span>
            ))}
          </div>
          {pro.stories && pro.stories.length > 0 ? (
            <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "18px 0 4px" }}>
              {pro.stories.map((story) => (
                <a key={story.id} href={story.mediaUrl} target="_blank" rel="noreferrer" style={{ position: "relative", width: 74, height: 100, flex: "0 0 auto", overflow: "hidden", borderRadius: 12, border: `2px solid ${GOLD}`, background: "#111" }}>
                  <Image src={story.thumbnail ?? story.mediaUrl} alt={`Story de ${pro.displayName}`} fill sizes="74px" quality={60} style={{ objectFit: "cover" }} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* STICKY NAV */}
      <div style={{ position: "sticky", top: 64, zIndex: 40, background: "rgba(6,14,27,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${GOLD_DIM}`, marginTop: 16 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", padding: "0 16px" }}>
          {[
            { label: `Fotos (${allPhotos.length})`, ref: refGaleria },
            { label: "Sobre mim", ref: refSobre },
            { label: `Avaliações (${pro.totalReviews ?? 0})`, ref: refAvaliacoes },
          ].map(({ label, ref }) => (
            <button key={label} onClick={() => scrollTo(ref)}
              style={{ padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 12, color: "#94a3b8", borderBottom: "2px solid transparent", transition: "all 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderBottomColor = GOLD; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderBottomColor = "transparent"; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>

        {/* GALERIA */}
        <div ref={refGaleria} style={{ paddingTop: 28, scrollMarginTop: 120 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>Galeria de fotos e vídeos</span>
            </div>
          </div>

          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            </div>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Mídias Verificadas</p>
              <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Fotos e vídeos verificados pela EliteModell garantem autenticidade.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: `1px solid ${GOLD_DIM}`, overflowX: "auto" }}>
            {([["todas", `${allPhotos.length} todas`], ["fotos", `${allPhotos.length} fotos`]] as [GaleriaFiltro, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setGaleriaFiltro(f)}
                style={{ padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: galeriaFiltro === f ? 700 : 400, color: galeriaFiltro === f ? GOLD : "#475569", borderBottom: `2px solid ${galeriaFiltro === f ? GOLD : "transparent"}`, whiteSpace: "nowrap", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          {allPhotos.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, marginBottom: 28 }}>
              {fotosExibidas.map((url, i) => (
                <div key={i} onClick={() => setPhotoOpen(i)}
                  style={{ aspectRatio: "3/4", overflow: "hidden", borderRadius: 6, cursor: "pointer", position: "relative", background: "#0b1420" }}>
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="(max-width: 720px) 33vw, 220px"
                    quality={60}
                    style={{ objectFit: "cover", objectPosition: "top" }}
                  />
                  <div style={{ position: "absolute", bottom: 5, right: 5, background: "rgba(6,14,27,0.85)", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#334155", marginBottom: 28 }}>
              <p>Nenhuma foto disponível ainda.</p>
            </div>
          )}

          {/* Verificação */}
          {(premiumVideoUrl || pro.presentationVideoUrl) && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>Video de apresentacao</span>
              </div>
              <video
                src={premiumVideoUrl ?? pro.presentationVideoUrl ?? undefined}
                controls
                preload="metadata"
                style={{ width: "100%", maxHeight: 420, borderRadius: 14, border: `1px solid ${GOLD_MID}`, background: "#050506" }}
              />
            </div>
          )}
          {!premiumVideoUrl && !pro.presentationVideoUrl && pro.hasPremiumVideo && (
            <button
              type="button"
              onClick={() => {
                setPremiumFeature("o vídeo exclusivo desta profissional");
                setPremiumOpen(true);
              }}
              style={{ width: "100%", marginBottom: 24, padding: 22, borderRadius: 16, border: `1px solid ${GOLD_MID}`, background: "radial-gradient(circle at 50% 0%,rgba(212,168,67,.16),transparent 55%),#0b1420", color: "#f5d78c", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ display: "block", color: GOLD, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2 }}>Conteúdo Premium</span>
              <strong style={{ display: "block", marginTop: 8, color: "#f1f5f9", fontSize: 18, fontFamily: PLAYFAIR }}>Vídeo exclusivo disponível</strong>
              <span style={{ display: "block", marginTop: 7, color: "#64748b", fontSize: 13 }}>Toque para conhecer os planos e desbloquear este conteúdo.</span>
            </button>
          )}

          {pro.verificationUrl && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>Mídia de verificação</span>
              </div>
              <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", border: `1px solid ${GOLD_MID}` }}>
                <Image
                  src={pro.verificationUrl}
                  alt="Verificação"
                  fill
                  sizes="(max-width: 720px) 100vw, 720px"
                  style={{ objectFit: "cover", objectPosition: "top" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.7) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(6,14,27,0.85)", border: `1px solid ${GOLD_MID}`, borderRadius: 20, padding: "4px 12px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  <span style={{ fontSize: 10, fontWeight: 800, color: GOLD, letterSpacing: 1 }}>ELITEMODELL VERIFICADA</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <button type="button" onClick={beginReport} style={{ width: "100%", padding: "13px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.25)", borderRadius: 10, color: "#cc0000", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Denunciar este perfil
            </button>
          </div>
        </div>

        {/* SOBRE MIM */}
        <div ref={refSobre} style={{ scrollMarginTop: 120 }}>

          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Descrição</h2>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line" }}>{pro.bio}</p>
          </section>

          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Atendimento</h2>
            </div>
            {(pro.attendanceTypes?.length || pro.servesGenders?.length) ? (
              <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                {pro.servesGenders?.length && <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 4px" }}><strong style={{ color: "#f1f5f9" }}>Atende:</strong> {pro.servesGenders.join(" e ")}</p>}
                {pro.attendanceTypes?.length && <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}><strong style={{ color: "#f1f5f9" }}>Local:</strong> {pro.attendanceTypes.join(", ")}</p>}
              </div>
            ) : null}
            {allServices.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: "0 0 10px", letterSpacing: 0.5 }}>Serviços oferecidos</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, overflow: "hidden" }}>
                  {allServices.slice(0, servicosAbertos ? undefined : 4).map((s, i, arr) => (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < arr.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{s}</span>
                      <span style={{ padding: "3px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 700 }}>Faço</span>
                    </div>
                  ))}
                </div>
                {allServices.length > 4 && (
                  <button onClick={() => setServicosAbertos(!servicosAbertos)}
                    style={{ width: "100%", padding: "10px", marginTop: 8, background: "transparent", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {servicosAbertos ? "Ver menos" : `Ver mais ${allServices.length - 4} serviços ▾`}
                  </button>
                )}
              </>
            )}
            {pro.servicesNotOffered && pro.servicesNotOffered.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: "0 0 10px" }}>Serviços não oferecidos</h3>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {pro.servicesNotOffered.map((service) => (
                    <span key={service} style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(239,68,68,.22)", background: "rgba(239,68,68,.06)", color: "#fca5a5", fontSize: 11 }}>{service}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {(pro.amenities?.length || pro.serviceCities?.length || pro.approximateLocation) ? (
              <div style={{ marginTop: 16, display: "grid", gap: 10, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, padding: "14px 16px", background: "#0b1420" }}>
                {pro.approximateLocation ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}><strong style={{ color: "#f1f5f9" }}>Localização aproximada:</strong> {pro.approximateLocation}</p> : null}
                {pro.amenities?.length ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}><strong style={{ color: "#f1f5f9" }}>Comodidades:</strong> {pro.amenities.join(", ")}</p> : null}
                {pro.serviceCities?.length ? <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}><strong style={{ color: "#f1f5f9" }}>Cidades atendidas:</strong> {pro.serviceCities.join(", ")}</p> : null}
              </div>
            ) : null}
          </section>

          {/* Tabela de valores */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><path d="M12 16h.01"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Valores</h2>
            </div>
            <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
              {[
                { label: "30 minutos", value: pro.price30min },
                { label: "1 hora", value: pro.pricePerHour },
                { label: "2 horas", value: pro.price2h },
                { label: "Pernoite", value: pro.priceOvernight },
                { label: "Vídeo chamada", value: pro.priceWebcam },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < arr.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: row.value ? "#f1f5f9" : "#334155", fontWeight: row.value ? 700 : 400 }}>
                    {row.value ? `R$ ${row.value.toLocaleString("pt-BR")}` : "Não realiza"}
                  </span>
                </div>
              ))}
            </div>
            {pro.paymentMethods && pro.paymentMethods.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>Formas de pagamento:</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pro.paymentMethods.map((m) => (
                    <span key={m} style={{ padding: "4px 12px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 20, fontSize: 11, color: GOLD, fontWeight: 600 }}>{m}</span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Horário */}
          <section style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${GOLD_DIM}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Horário de expediente</h2>
            </div>
            <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
              {schedule.map((s, i) => (
                <div key={s.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", background: i % 2 === 0 ? "#0b1420" : "#08101e", borderBottom: i < schedule.length - 1 ? `1px solid ${GOLD_DIM}` : "none" }}>
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
          {fisico.length > 0 && (
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
                  {fisico.map(([k, v]) => (
                    <div key={k} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 11, color: "#475569", textTransform: "capitalize" }}>{k}</p>
                      <p style={{ margin: 0, fontSize: 14, color: "#f1f5f9", fontWeight: 600 }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <p style={{ fontSize: 12, color: "#334155", textAlign: "center", marginBottom: 28 }}>
            📋 Perfil criado em {memberYear}
          </p>
        </div>

        {/* AVALIAÇÕES */}
        <div ref={refAvaliacoes} style={{ scrollMarginTop: 120, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Avaliações de {pro.displayName}</h2>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20, padding: "16px", background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 42, fontWeight: 900, color: GOLD, margin: 0, fontFamily: PLAYFAIR }}>{(pro.rating ?? 0).toFixed(1)}</p>
              <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                {[1,2,3,4,5].map(n => (
                  <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= Math.round(pro.rating ?? 0) ? GOLD : "#334155"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#475569", margin: "4px 0 0" }}>{pro.totalReviews ?? 0} avaliações</p>
            </div>
            <div style={{ flex: 1, paddingLeft: 16, borderLeft: `1px solid ${GOLD_DIM}` }}>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 6px" }}>Nota geral verificada</p>
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>Baseada em atendimentos reais confirmados pela plataforma.</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {reviews.length > 0 ? reviews.map((r, i) => (
              <div key={i} style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: GOLD }}>
                      {r.author[0]?.toUpperCase()}
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
            )) : (
              <p style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "24px 0" }}>Ainda sem avaliações. Seja o primeiro!</p>
            )}
          </div>

          {!premiumReviews && pro.hasMoreReviews && (
            <button
              type="button"
              onClick={() => {
                setPremiumFeature("todas as avaliações");
                setPremiumOpen(true);
              }}
              style={{ width: "100%", minHeight: 48, margin: "-6px 0 20px", borderRadius: 12, border: `1px solid ${GOLD_MID}`, background: GOLD_DIM, color: "#f5d78c", fontWeight: 900, cursor: "pointer" }}
            >
              Ver todas as {pro.totalReviews} avaliações com Premium
            </button>
          )}

          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "18px 16px", textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px", fontFamily: PLAYFAIR }}>Foi atendido por {pro.displayName}?</p>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 14px" }}>Deixe sua avaliação gratuita</p>
            <button type="button" onClick={beginReview} style={{ display: "inline-block", padding: "10px 28px", border: 0, background: GOLD, color: "#060e1b", borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: PLAYFAIR, cursor: "pointer" }}>
              Avaliar perfil
            </button>
          </div>
        </div>

        {/* MAIS PERFIS */}
        {similar.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: PLAYFAIR }}>Mais acompanhantes em {pro.city}</h2>
              <Link href="/buscar?tab=acompanhantes" style={{ fontSize: 12, color: GOLD, textDecoration: "none", fontWeight: 600 }}>Ver todas →</Link>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {similar.map((p) => (
                <Link key={p.id} href={`/profissionais/${p.slug}`} style={{ textDecoration: "none", flexShrink: 0, width: 140 }}>
                  <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ height: 160, position: "relative", overflow: "hidden" }}>
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.displayName}
                          fill
                          sizes="140px"
                          quality={60}
                          style={{ objectFit: "cover", objectPosition: "top" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0b1420, #1a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: GOLD }}>
                          {p.displayName[0]}
                        </div>
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.85) 0%, transparent 50%)" }} />
                      <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>{p.displayName}</p>
                        {(p.priceMin ?? p.pricePerHour) && <p style={{ margin: "2px 0 0", fontSize: 11, color: GOLD, fontWeight: 700 }}>R${(p.priceMin ?? p.pricePerHour)!.toLocaleString("pt-BR")}/h</p>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {bookingOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(2,6,15,0.82)", backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "min(100%, 560px)", maxHeight: "88vh", overflowY: "auto", border: `1px solid ${GOLD_MID}`, borderRadius: 14, background: "linear-gradient(180deg,#111827,#060e1b)", boxShadow: "0 30px 90px rgba(0,0,0,0.58)" }}>
            <div style={{ padding: 18, borderBottom: `1px solid ${GOLD_DIM}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 6px", color: GOLD, fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Agendamento Elite</p>
                <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 24, fontFamily: PLAYFAIR }}>Agendar com {pro.displayName}</h2>
                <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>Use um voucher disponível se a profissional aceitar vouchers promocionais.</p>
              </div>
              <button onClick={() => setBookingOpen(false)} aria-label="Fechar agendamento" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "rgba(255,255,255,0.03)", color: GOLD, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {authStatus !== "authenticated" ? (
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                <div style={{ border: `1px solid ${GOLD_DIM}`, background: "#0b1420", borderRadius: 12, padding: 14 }}>
                  <p style={{ margin: "0 0 6px", color: "#f8fafc", fontWeight: 800 }}>Confirme sua conta para usar voucher</p>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, lineHeight: 1.55 }}>Você pode ganhar voucher sem cadastro na roleta, mas para usar no agendamento precisa entrar ou concluir um cadastro simples.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Link href={`${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(`/profissionais/${slug}`)}`} style={{ textAlign: "center", padding: "12px", borderRadius: 10, background: GOLD, color: "#060e1b", fontWeight: 900, textDecoration: "none" }}>Entrar</Link>
                  <Link href={ACCOUNT_ROUTES.cadastro} style={{ textAlign: "center", padding: "12px", borderRadius: 10, border: `1px solid ${GOLD_MID}`, color: GOLD, fontWeight: 900, textDecoration: "none" }}>Criar conta</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submitBooking} style={{ padding: 18, display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 6, color: "#e2e8f0", fontSize: 13, fontWeight: 800 }}>
                  Data e horário
                  <input
                    type="datetime-local"
                    value={bookingDate}
                    onChange={(event) => setBookingDate(event.target.value)}
                    style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "#050b15", color: "#f8fafc", padding: "0 12px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6, color: "#e2e8f0", fontSize: 13, fontWeight: 800 }}>
                  Duração
                  <select
                    value={bookingDuration}
                    onChange={(event) => setBookingDuration(Number(event.target.value))}
                    style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "#050b15", color: "#f8fafc", padding: "0 12px" }}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={120}>2 horas</option>
                  </select>
                </label>

                <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, background: "#0b1420", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#94a3b8", fontSize: 13 }}>
                    <span>Valor do atendimento</span>
                    <strong style={{ color: "#f8fafc" }}>R$ {bookingBasePrice.toLocaleString("pt-BR")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                    <span>Voucher aplicado</span>
                    <strong style={{ color: voucherDiscount ? "#22c55e" : "#64748b" }}>- R$ {voucherDiscount.toLocaleString("pt-BR")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#f8fafc", fontSize: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${GOLD_DIM}` }}>
                    <span>Total com desconto</span>
                    <strong style={{ color: GOLD }}>R$ {bookingFinalPrice.toLocaleString("pt-BR")}</strong>
                  </div>
                </div>

                <label style={{ display: "grid", gap: 6, color: "#e2e8f0", fontSize: 13, fontWeight: 800 }}>
                  Voucher
                  <select
                    value={selectedVoucherId}
                    onChange={(event) => setSelectedVoucherId(event.target.value)}
                    disabled={!acceptsVouchers || voucherLoading || availableVouchers.length === 0}
                    style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "#050b15", color: "#f8fafc", padding: "0 12px" }}
                  >
                    <option value="">
                      {voucherLoading
                        ? "Carregando vouchers..."
                        : acceptsVouchers === false
                          ? "Profissional não aceita vouchers promocionais"
                          : availableVouchers.length
                            ? "Não usar voucher"
                            : "Nenhum voucher disponível"}
                    </option>
                    {availableVouchers.map((voucher) => (
                      <option key={voucher.id} value={voucher.id}>
                        {voucher.code} - R$ {voucher.value.toLocaleString("pt-BR")} - vence em {new Date(voucher.expiresAt).toLocaleDateString("pt-BR")}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, color: "#e2e8f0", fontSize: 13, fontWeight: 800 }}>
                  Observação
                  <textarea
                    value={bookingNotes}
                    onChange={(event) => setBookingNotes(event.target.value)}
                    placeholder="Mensagem opcional para a profissional"
                    style={{ minHeight: 86, resize: "vertical", borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "#050b15", color: "#f8fafc", padding: 12 }}
                  />
                </label>

                {bookingError ? <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>{bookingError}</p> : null}
                {bookingSuccess ? <p style={{ margin: 0, color: "#86efac", fontSize: 13 }}>{bookingSuccess}</p> : null}

                <button
                  type="submit"
                  disabled={bookingSaving}
                  style={{ minHeight: 48, borderRadius: 10, border: "none", background: GOLD, color: "#060e1b", fontSize: 15, fontWeight: 950, cursor: bookingSaving ? "wait" : "pointer" }}
                >
                  {bookingSaving ? "Enviando..." : "Confirmar agendamento"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 920, background: "rgba(0,0,0,.84)", backdropFilter: "blur(14px)", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ width: "min(100%,560px)", border: `1px solid ${GOLD_MID}`, borderRadius: 16, background: "#070d17", padding: 18, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div>
                <p style={{ margin: 0, color: GOLD, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2 }}>Avaliação verificada</p>
                <h2 style={{ margin: "5px 0 0", color: "#f8fafc", fontFamily: PLAYFAIR }}>Avaliar {pro.displayName}</h2>
              </div>
              <button type="button" onClick={() => setReviewOpen(false)} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "transparent", color: GOLD, cursor: "pointer" }}>×</button>
            </div>
            {eligibleAppointmentId === undefined ? (
              <p style={{ color: "#94a3b8" }}>Verificando atendimentos concluídos...</p>
            ) : eligibleAppointmentId ? (
              <ReviewForm professionalId={pro.id} appointmentId={eligibleAppointmentId} onSubmitted={() => window.location.reload()} />
            ) : (
              <div style={{ border: `1px solid ${GOLD_DIM}`, borderRadius: 12, background: "#0b1420", padding: 16 }}>
                <p style={{ margin: "0 0 8px", color: "#f8fafc", fontWeight: 800 }}>Avaliações são vinculadas a atendimentos reais.</p>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>Quando um agendamento com esta profissional estiver concluído, a avaliação será liberada aqui automaticamente.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {authIntent ? (
        <ActionAuthModal
          open
          actionLabel={authIntent === "review" ? "avaliar este perfil" : authIntent === "favorite" ? "salvar este perfil" : "enviar esta denúncia"}
          returnTo={actionReturnUrl(authIntent)}
          onClose={() => setAuthIntent(null)}
        />
      ) : null}
      {premiumOpen ? (
        <PremiumUpsellModal
          open
          onClose={() => setPremiumOpen(false)}
          featureLabel={premiumFeature}
          returnTo={`/profissionais/${slug}`}
        />
      ) : null}

      {/* CTA FIXO */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 55, background: "rgba(6,14,27,0.98)", backdropFilter: "blur(12px)", borderTop: `1px solid ${GOLD_DIM}`, padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 9, color: "#475569" }}>a partir de</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: GOLD, fontFamily: PLAYFAIR, lineHeight: 1.1 }}>{preco ? `R$ ${preco.toLocaleString("pt-BR")}/h` : "Consulte"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBookingError(null);
            setBookingSuccess(null);
            setBookingOpen(true);
          }}
          style={{ flex: 1, minWidth: 0, padding: "12px 10px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 900, fontFamily: PLAYFAIR, cursor: "pointer" }}
        >
          Agendar
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProfessionalContactAction
            slug={slug}
            visibility={pro.contactVisibility ?? "PUBLIC"}
            initialWhatsapp={pro.whatsapp}
            initialPhone={pro.phone}
            contactAvailable={pro.contactAvailable}
            returnTo={`/profissionais/${slug}`}
            label="WhatsApp"
            compact
            onContact={trackContactClick}
          />
        </div>
      </div>

      {/* Lightbox */}
      {photoOpen !== null && allPhotos[photoOpen] && (
        <div onClick={() => setPhotoOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,0.97)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "95vw", height: "90vh" }}>
            <Image
              src={allPhotos[photoOpen]}
              alt=""
              fill
              sizes="95vw"
              style={{ objectFit: "contain", borderRadius: 8 }}
            />
          </div>
          <button onClick={() => setPhotoOpen(null)} style={{ position: "absolute", top: 20, right: 20, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          {photoOpen > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen - 1); }} style={{ position: "absolute", left: 16, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          )}
          {photoOpen < allPhotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoOpen(photoOpen + 1); }} style={{ position: "absolute", right: 16, background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, color: GOLD, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
