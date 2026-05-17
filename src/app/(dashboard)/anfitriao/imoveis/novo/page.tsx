"use client";

/* eslint-disable @next/next/no-img-element -- Draft previews use local data URLs before authenticated upload. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const DRAFT_KEY = "elitemodell_property_draft_v1";

const spaceTypes = ["APARTMENT", "HOUSE", "LOFT", "STUDIO", "HOTEL", "OTHER"] as const;
type SpaceTypeValue = (typeof spaceTypes)[number];

const typeLabels: Record<SpaceTypeValue, string> = {
  APARTMENT: "Quarto privado",
  HOUSE: "Suite premium",
  LOFT: "Flat discreto",
  STUDIO: "Studio reservado",
  HOTEL: "Motel parceiro",
  OTHER: "Local compartilhado",
};

const structureOptions = [
  "Cama",
  "Banheiro privativo",
  "Ar-condicionado",
  "Wi-Fi",
  "Espelho",
  "Garagem",
  "Segurança",
  "Portaria",
  "Privacidade acústica",
  "Entrada discreta",
];

const hourOptions = ["24h", "Manhã e tarde", "Noite", "Madrugada", "Sob consulta"];
const bookingModes = ["Por hora", "Diária"];
const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const steps = ["Localização", "Tipo", "Estrutura", "Funcionamento", "Fotos", "Valores", "Finalização"];

type DraftPhoto = {
  id: string;
  name: string;
  type: string;
  dataUrl?: string;
  url?: string;
};

type RoomDraftForm = {
  city: string;
  state: string;
  bairro: string;
  region: string;
  referencePoint: string;
  type: SpaceTypeValue;
  structure: string[];
  serviceAllowed: boolean;
  availableHours: string;
  bookingModes: string[];
  weeklyAvailability: string[];
  photos: DraftPhoto[];
  hourlyRate: string;
  dayRate: string;
  optionalFee: string;
};

type SavedDraft = {
  form: RoomDraftForm;
  step: number;
  updatedAt: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  background: "#111",
  border: "1px solid #2a2620",
  borderRadius: 10,
  color: "#f4f1ea",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#8d8578",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  marginBottom: 8,
};

function emptyForm(): RoomDraftForm {
  return {
    city: "",
    state: "",
    bairro: "",
    region: "",
    referencePoint: "",
    type: "APARTMENT",
    structure: [],
    serviceAllowed: true,
    availableHours: "Sob consulta",
    bookingModes: ["Por hora"],
    weeklyAvailability: ["Seg", "Ter", "Qua", "Qui", "Sex"],
    photos: [],
    hourlyRate: "",
    dayRate: "",
    optionalFee: "",
  };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="step-section">
      <div className="section-title">
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function normalizeDraft(raw: unknown): SavedDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const maybe = raw as Partial<SavedDraft>;
  if (!maybe.form || typeof maybe.form !== "object") return null;

  const current = emptyForm();
  const incoming = maybe.form as Partial<RoomDraftForm> & {
    amenities?: string[];
    address?: string;
    photos?: Array<DraftPhoto | string>;
    pricePerNight?: string;
    cleaningFee?: string;
  };

  const photos: DraftPhoto[] = [];
  if (Array.isArray(incoming.photos)) {
    incoming.photos.forEach((photo, index) => {
      if (typeof photo === "string") {
        photos.push({ id: `saved-${index}`, name: `Foto ${index + 1}`, type: "image/jpeg", url: photo });
        return;
      }
      if (!photo || typeof photo !== "object") return;
      if (photo.dataUrl || photo.url) {
        photos.push({
          id: photo.id || `saved-${index}`,
          name: photo.name || `Foto ${index + 1}`,
          type: photo.type || "image/jpeg",
          dataUrl: photo.dataUrl,
          url: photo.url,
        });
      }
    });
  }

  return {
    form: {
      ...current,
      ...incoming,
      city: incoming.city ?? current.city,
      state: incoming.state ?? current.state,
      bairro: incoming.bairro ?? current.bairro,
      region: incoming.region ?? incoming.address ?? current.region,
      referencePoint: incoming.referencePoint ?? "",
      type: spaceTypes.includes(incoming.type as SpaceTypeValue) ? (incoming.type as SpaceTypeValue) : current.type,
      structure: Array.isArray(incoming.structure)
        ? incoming.structure
        : Array.isArray(incoming.amenities)
          ? incoming.amenities
          : current.structure,
      bookingModes: Array.isArray(incoming.bookingModes)
        ? incoming.bookingModes.map((mode) => mode === "Diaria" ? "Diária" : mode)
        : current.bookingModes,
      weeklyAvailability: Array.isArray(incoming.weeklyAvailability) ? incoming.weeklyAvailability : current.weeklyAvailability,
      hourlyRate: incoming.hourlyRate ?? "",
      dayRate: incoming.dayRate ?? incoming.pricePerNight ?? "",
      optionalFee: incoming.optionalFee ?? incoming.cleaningFee ?? "",
      photos,
    },
    step: typeof maybe.step === "number" ? Math.min(Math.max(maybe.step, 0), steps.length - 1) : 0,
    updatedAt: typeof maybe.updatedAt === "string" ? maybe.updatedAt : new Date().toISOString(),
  };
}

async function readPhoto(file: File): Promise<DraftPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível ler a imagem."));
        return;
      }

      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(photo: DraftPhoto) {
  if (!photo.dataUrl) throw new Error("Foto local sem dados.");
  const res = await fetch(photo.dataUrl);
  const blob = await res.blob();
  return new File([blob], photo.name || "espaco.jpg", { type: photo.type || blob.type || "image/jpeg" });
}

export default function NovoImovelPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<RoomDraftForm>(() => emptyForm());

  const progress = ((step + 1) / steps.length) * 100;
  const isAuthenticated = status === "authenticated";
  const canPublish = session?.user?.role === "HOST" || session?.user?.role === "ADMIN";
  const photoCount = form.photos.length;

  const summary = useMemo(
    () => [
      { label: "Local", value: form.bairro && form.city ? `${form.bairro}, ${form.city}` : "Pendente" },
      { label: "Tipo", value: typeLabels[form.type] },
      { label: "Estrutura", value: `${form.structure.length} itens` },
      { label: "Valor", value: form.hourlyRate ? `R$ ${form.hourlyRate}/h` : form.dayRate ? `R$ ${form.dayRate}/dia` : "Pendente" },
    ],
    [form.bairro, form.city, form.dayRate, form.hourlyRate, form.structure.length, form.type]
  );

  function setField<K extends keyof RoomDraftForm>(key: K, value: RoomDraftForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "structure" | "bookingModes" | "weeklyAvailability", value: string) {
    const current = form[key];
    setField(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const saved = normalizeDraft(JSON.parse(raw));
        if (saved) {
          window.setTimeout(() => {
            setForm(saved.form);
            // Nunca restaurar além da primeira etapa incompleta —
            // impede pular para Finalização com campos vazios.
            setStep(firstIncompleteStep(saved.form));
          }, 0);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    window.setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, updatedAt: new Date().toISOString() }));
    } catch {
      toast.error("Não foi possível salvar o rascunho neste navegador.");
    }
  }, [form, hydrated, step]);

  function validateStep(target: number, f: RoomDraftForm = form) {
    if (target === 0) {
      if (!f.city.trim()) return "Informe a cidade.";
      if (!f.bairro.trim()) return "Informe o bairro.";
      if (!f.region.trim()) return "Informe a região do espaço.";
    }
    if (target === 2 && f.structure.length < 3) return "Selecione pelo menos 3 itens de estrutura.";
    if (target === 3) {
      if (f.bookingModes.length === 0) return "Escolha se aceita por hora, diária ou ambos.";
      if (f.weeklyAvailability.length === 0) return "Informe a disponibilidade semanal.";
    }
    if (target === 4 && f.photos.length === 0) return "Envie pelo menos uma foto do espaço.";
    if (target === 5) {
      if (f.bookingModes.includes("Por hora") && (!f.hourlyRate || Number(f.hourlyRate) <= 0)) {
        return "Informe o valor por hora.";
      }
      if (f.bookingModes.includes("Diária") && (!f.dayRate || Number(f.dayRate) <= 0)) {
        return "Informe o valor da diária.";
      }
    }
    return null;
  }

  function firstIncompleteStep(f: RoomDraftForm): number {
    for (let i = 0; i < steps.length - 1; i++) {
      if (validateStep(i, f) !== null) return i;
    }
    return steps.length - 1;
  }

  function validateAllListingSteps() {
    for (let index = 0; index <= 5; index += 1) {
      const error = validateStep(index);
      if (error) {
        setStep(index);
        return error;
      }
    }
    return null;
  }

  function next() {
    const error = validateStep(step);
    if (error) return toast.error(error);
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPhoto(file: File) {
    if (form.photos.length >= 12) return toast.error("Limite de 12 fotos por espaço.");
    if (!file.type.startsWith("image/")) return toast.error("Envie apenas imagens.");
    if (file.size > 6 * 1024 * 1024) return toast.error("Use imagens de até 6MB para salvar o rascunho.");

    setUploading(true);
    try {
      const photo = await readPhoto(file);
      setField("photos", [...form.photos, photo]);
      toast.success("Foto adicionada ao rascunho.");
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao adicionar foto."));
    } finally {
      setUploading(false);
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.photos.length) return;
    const nextPhotos = [...form.photos];
    [nextPhotos[index], nextPhotos[nextIndex]] = [nextPhotos[nextIndex], nextPhotos[index]];
    setField("photos", nextPhotos);
  }

  async function uploadDraftPhotos() {
    const uploaded: string[] = [];
    for (const photo of form.photos) {
      if (photo.url) {
        uploaded.push(photo.url);
        continue;
      }

      const file = await dataUrlToFile(photo);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=properties", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(typeof data.error === "string" ? data.error : "Erro no upload.");
      uploaded.push(data.url as string);
    }
    return uploaded;
  }

  function buildDescription() {
    return [
      `${typeLabels[form.type]} para atendimento discreto em ${form.bairro}, ${form.city}.`,
      `Região: ${form.region}.`,
      form.referencePoint ? `Ponto de referência: ${form.referencePoint}.` : "",
      `Estrutura: ${form.structure.join(", ")}.`,
      `Funcionamento: ${form.serviceAllowed ? "atendimento permitido" : "atendimento sob avaliação"}; ${form.availableHours}; ${form.bookingModes.join(" e ")}.`,
      `Disponibilidade: ${form.weeklyAvailability.join(", ")}.`,
      form.hourlyRate ? `Valor por hora: R$ ${form.hourlyRate}.` : "",
      form.dayRate ? `Diária: R$ ${form.dayRate}.` : "",
    ].filter(Boolean).join("\n");
  }

  async function handleSubmit() {
    const error = validateAllListingSteps();
    if (error) return toast.error(error);

    if (!isAuthenticated) {
      setStep(steps.length - 1);
      return toast.error("Crie uma conta para publicar seu anúncio.");
    }

    if (!canPublish) {
      setStep(steps.length - 1);
      return toast.error("Ative sua conta de anunciante para publicar.");
    }

    setLoading(true);
    try {
      toast.loading("Preparando fotos...", { id: "property-submit" });
      const photos = await uploadDraftPhotos();
      toast.loading("Enviando para análise...", { id: "property-submit" });

      const visibleLocation = [form.referencePoint || form.region, form.bairro, form.city, form.state].filter(Boolean).join(", ");
      const payload = {
        title: `${typeLabels[form.type]} em ${form.bairro}`,
        description: buildDescription(),
        type: form.type,
        address: visibleLocation || `${form.bairro}, ${form.city}`,
        bairro: form.bairro,
        city: form.city,
        state: form.state || "BR",
        country: "Brasil",
        zipCode: "",
        pricePerNight: Number(form.dayRate || form.hourlyRate),
        cleaningFee: form.optionalFee ? Number(form.optionalFee) : 0,
        maxGuests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: form.structure.includes("Banheiro privativo") ? 1 : 1,
        checkInTime: form.availableHours === "Noite" ? "18:00" : form.availableHours === "Madrugada" ? "22:00" : "08:00",
        checkOutTime: form.availableHours === "Manhã e tarde" ? "18:00" : "23:59",
        minNights: 1,
        instantBook: false,
        allowPets: false,
        allowSmoking: false,
        allowParties: false,
        amenities: [
          ...form.structure,
          `Atendimento: ${form.serviceAllowed ? "permitido" : "sob avaliação"}`,
          `Horário: ${form.availableHours}`,
          `Modalidade: ${form.bookingModes.join(" e ")}`,
          `Disponibilidade: ${form.weeklyAvailability.join(", ")}`,
        ],
        photos,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Revise os dados do espaço.");

      localStorage.removeItem(DRAFT_KEY);
      toast.success("Espaço enviado para aprovação.", { id: "property-submit" });
      router.push(ACCOUNT_ROUTES.verificacaoAnfitriao);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Erro ao cadastrar espaço."), { id: "property-submit" });
    } finally {
      setLoading(false);
    }
  }

  function authHref(path: "/cadastro" | "/login") {
    return `${path}?draft=quarto&tipo=anfitriao`;
  }

  return (
    <div className={status !== "authenticated" ? "property-draft-shell public-draft" : "property-draft-shell"}>
      {status !== "authenticated" ? (
        <header className="draft-topbar">
          <Link href="/" className="draft-logo">
            <span className="draft-logo-star">✦</span>
            <span className="draft-logo-word"><span>elite</span>modell</span>
          </Link>
          <Link href={authHref("/login")} className="draft-login">
            Entrar
          </Link>
        </header>
      ) : null}

      <div className="draft-hero">
        <p>EliteModell Reserve</p>
        <h1>Anuncie um ambiente discreto para profissionais.</h1>
        <span>Cadastre um espaço reservado para atendimento profissional. A conta fica para o final e o rascunho fica salvo neste dispositivo.</span>
      </div>

      <div className="draft-progress">
        <div>
          <span>Etapa {step + 1} de {steps.length}</span>
          <strong>{steps[step]}</strong>
        </div>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="draft-card">
        {step === 0 && (
          <Section title="Onde fica o espaço?" desc="A busca mostra cidade, bairro e região. O detalhe sensível fica privado.">
            <div className="form-stack">
              <div className="city-grid">
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <input style={inputStyle} value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="Belo Horizonte" />
                </div>
                <div>
                  <label style={labelStyle}>UF</label>
                  <input style={inputStyle} value={form.state} onChange={(event) => setField("state", event.target.value.toUpperCase().slice(0, 2))} placeholder="MG" />
                </div>
              </div>
              <div className="two-grid">
                <div>
                  <label style={labelStyle}>Bairro *</label>
                  <input style={inputStyle} value={form.bairro} onChange={(event) => setField("bairro", event.target.value)} placeholder="Savassi" />
                </div>
                <div>
                  <label style={labelStyle}>Região *</label>
                  <input style={inputStyle} value={form.region} onChange={(event) => setField("region", event.target.value)} placeholder="Centro-sul, próximo a avenidas" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Ponto de referência opcional</label>
                <input style={inputStyle} value={form.referencePoint} onChange={(event) => setField("referencePoint", event.target.value)} placeholder="Shopping, hotel, avenida ou metrô próximo" />
              </div>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Tipo do espaço" desc="Escolha como profissionais vão reconhecer o local.">
            <div className="type-grid">
              {spaceTypes.map((type) => (
                <button key={type} type="button" onClick={() => setField("type", type)} className={form.type === type ? "option active" : "option"}>
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Estrutura disponível" desc="Itens objetivos ajudam a profissional decidir rápido.">
            <div className="amenity-grid">
              {structureOptions.map((item) => (
                <button key={item} type="button" onClick={() => toggleList("structure", item)} className={form.structure.includes(item) ? "option active" : "option"}>
                  {item}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Funcionamento" desc="Mostre como o local pode ser usado sem criar conversa desnecessaria.">
            <div className="form-stack">
              <label className="switch-row">
                <input type="checkbox" checked={form.serviceAllowed} onChange={(event) => setField("serviceAllowed", event.target.checked)} />
                <span>
                  <strong>Atendimento permitido</strong>
                  <small>O espaço aceita uso profissional e discreto.</small>
                </span>
              </label>

              <div>
                <label style={labelStyle}>Horário disponível</label>
                <div className="chip-grid">
                  {hourOptions.map((option) => (
                    <button key={option} type="button" onClick={() => setField("availableHours", option)} className={form.availableHours === option ? "chip active" : "chip"}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Modalidade</label>
                <div className="chip-grid">
                  {bookingModes.map((mode) => (
                    <button key={mode} type="button" onClick={() => toggleList("bookingModes", mode)} className={form.bookingModes.includes(mode) ? "chip active" : "chip"}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Disponibilidade semanal</label>
                <div className="week-grid">
                  {weekDays.map((day) => (
                    <button key={day} type="button" onClick={() => toggleList("weeklyAvailability", day)} className={form.weeklyAvailability.includes(day) ? "chip active" : "chip"}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section title="Fotos" desc={`Upload simples pelo celular. Arraste a ordem usando os botões. ${photoCount}/12`}>
            <label className="upload-box">
              {uploading ? "Adicionando..." : "Toque para adicionar fotos"}
              <input type="file" accept="image/*" hidden onChange={(event) => { if (event.target.files?.[0]) uploadPhoto(event.target.files[0]); event.currentTarget.value = ""; }} />
            </label>
            <div className="photo-grid">
              {form.photos.map((photo, index) => (
                <div key={photo.id} className="photo-preview">
                  <img src={photo.url ?? photo.dataUrl} alt={`Foto ${index + 1}`} />
                  <div className="photo-actions">
                    <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === form.photos.length - 1}>↓</button>
                    <button type="button" onClick={() => setField("photos", form.photos.filter((item) => item.id !== photo.id))}>x</button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Valores" desc="Mostre o preço de forma direta. Taxa extra é opcional.">
            <div className="form-stack">
              <div className="two-grid">
                <div>
                  <label style={labelStyle}>Valor por hora</label>
                  <input type="number" inputMode="numeric" style={inputStyle} value={form.hourlyRate} onChange={(event) => setField("hourlyRate", event.target.value)} placeholder="120" />
                </div>
                <div>
                  <label style={labelStyle}>Valor diária</label>
                  <input type="number" inputMode="numeric" style={inputStyle} value={form.dayRate} onChange={(event) => setField("dayRate", event.target.value)} placeholder="450" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Taxa opcional</label>
                <input type="number" inputMode="numeric" style={inputStyle} value={form.optionalFee} onChange={(event) => setField("optionalFee", event.target.value)} placeholder="0" />
              </div>
            </div>
          </Section>
        )}

        {step === 6 && (
          <Section title="Finalização" desc="Seu anúncio já está montado. Agora vinculamos a uma conta segura.">
            <div className="summary-grid">
              {summary.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {status === "loading" ? (
              <div className="auth-final">Verificando sua sessão...</div>
            ) : !isAuthenticated ? (
              <div className="auth-final">
                <h3>Crie sua conta para publicar</h3>
                <p>O rascunho fica salvo. Depois da conta criada, você volta para finalizar o envio.</p>
                <div className="auth-actions">
                  <Link href={authHref("/cadastro")} className="gold-link">Criar conta e publicar</Link>
                  <Link href={authHref("/login")} className="outline-link">Já tenho conta</Link>
                </div>
              </div>
            ) : !canPublish ? (
              <div className="auth-final">
                <h3>Ative a conta de anunciante</h3>
                <p>Sua conta já existe. Falta liberar o perfil de anunciante para enviar este espaço.</p>
                <Link href={authHref("/cadastro")} className="gold-link">Ativar como anunciante</Link>
              </div>
            ) : (
              <div className="auth-final">
                <h3>Tudo pronto para análise</h3>
                <p>As fotos serão enviadas agora e o espaço entrará em revisão.</p>
                <button type="button" onClick={handleSubmit} disabled={loading} className="gold-button wide">
                  {loading ? "Enviando..." : "Enviar para aprovação"}
                </button>
              </div>
            )}
          </Section>
        )}

        <div className="navigation-row">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="back-button">
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="gold-button">
              {step === 5 ? "Finalizar" : "Continuar"}
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading || !canPublish} className="gold-button navigation-submit">
              {loading ? "Enviando..." : canPublish ? "Publicar" : "Conta primeiro"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .property-draft-shell {
          width: min(100%, 920px);
          margin: 0 auto;
          padding: 0 0 90px;
        }

        .property-draft-shell.public-draft {
          padding-top: 72px;
        }

        .draft-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          height: 64px;
          margin: 0;
          padding: 0 max(14px, env(safe-area-inset-right)) 0 max(14px, env(safe-area-inset-left));
          border-bottom: 1px solid rgba(212,168,67,0.16);
          background: rgba(5,5,5,0.94);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 46px rgba(0,0,0,0.28);
        }

        .draft-logo {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 6px 14px;
          border: 1.5px solid rgba(212,168,67,0.34);
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          color: #f4f1ea;
          text-decoration: none;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .draft-logo-star {
          position: absolute;
          top: -10px;
          right: -5px;
          color: ${GOLD};
          font-size: 16px;
          line-height: 1;
          user-select: none;
        }

        .draft-logo-word {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .draft-logo-word span {
          background: linear-gradient(135deg, #ffe5a0 0%, #d4a843 35%, #f5d78c 62%, #9e7b2a 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .draft-login,
        .outline-link {
          border: 1px solid rgba(212,168,67,0.34);
          border-radius: 10px;
          color: ${GOLD};
          padding: 10px 18px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
          background: rgba(255,255,255,0.025);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
          white-space: nowrap;
        }

        .draft-hero {
          margin-bottom: 22px;
          border: 1px solid rgba(212, 168, 67, 0.18);
          border-radius: 12px;
          padding: 22px;
          background:
            linear-gradient(135deg, rgba(212, 168, 67, 0.12), rgba(255,255,255,0.025)),
            #111;
          box-shadow: 0 24px 80px rgba(0,0,0,0.28);
        }

        .draft-hero p,
        .draft-progress span:first-child {
          margin: 0 0 8px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }

        .draft-hero h1 {
          margin: 0;
          color: #f4f1ea;
          font-size: clamp(26px, 5vw, 38px);
          line-height: 1.05;
          font-weight: 950;
        }

        .draft-hero > span {
          display: block;
          margin-top: 12px;
          color: #b8b1a6;
          font-size: 13px;
          line-height: 1.6;
        }

        .draft-progress {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 8px;
        }

        .draft-progress strong {
          display: block;
          color: #f4f1ea;
          font-size: 17px;
        }

        .draft-progress > span {
          color: ${GOLD};
          font-size: 13px;
          font-weight: 900;
        }

        .progress-track {
          height: 5px;
          margin-bottom: 22px;
          overflow: hidden;
          border-radius: 999px;
          background: #24211d;
        }

        .progress-track div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #ffe08b, ${GOLD});
          transition: width 0.25s ease;
        }

        .draft-card {
          border: 1px solid ${GOLD_MID};
          border-radius: 12px;
          background: #111;
          padding: 24px;
          box-shadow: 0 28px 90px rgba(0,0,0,0.32);
        }

        .step-section {
          margin-bottom: 24px;
        }

        .section-title {
          border-bottom: 1px solid ${GOLD_DIM};
          padding-bottom: 10px;
          margin-bottom: 16px;
        }

        .section-title h2 {
          color: #f1f5f9;
          font-size: 16px;
          font-weight: 900;
          margin: 0;
        }

        .section-title p {
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          margin: 6px 0 0;
        }

        .form-stack {
          display: grid;
          gap: 14px;
        }

        .type-grid,
        .amenity-grid,
        .chip-grid,
        .week-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .week-grid {
          grid-template-columns: repeat(7, minmax(58px, 1fr));
        }

        .city-grid {
          display: grid;
          grid-template-columns: 1fr 92px;
          gap: 12px;
        }

        .two-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .option,
        .chip {
          min-height: 48px;
          border: 1.5px solid #1e293b;
          border-radius: 10px;
          background: #0b1420;
          color: #64748b;
          padding: 11px 12px;
          text-align: left;
          font-weight: 850;
          cursor: pointer;
        }

        .chip {
          text-align: center;
        }

        .option.active,
        .chip.active {
          border-color: ${GOLD};
          background: ${GOLD_DIM};
          color: #f1f5f9;
        }

        .switch-row {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid ${GOLD_MID};
          border-radius: 12px;
          background: rgba(212,168,67,0.06);
          padding: 14px;
          color: #f1f5f9;
        }

        .switch-row input {
          width: 20px;
          height: 20px;
          accent-color: ${GOLD};
        }

        .switch-row strong,
        .switch-row small {
          display: block;
        }

        .switch-row small {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
        }

        .upload-box {
          display: block;
          margin-bottom: 14px;
          border: 2px dashed ${GOLD_MID};
          border-radius: 12px;
          background: ${GOLD_DIM};
          color: #f1f5f9;
          cursor: pointer;
          font-size: 13px;
          font-weight: 900;
          padding: 26px;
          text-align: center;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
          gap: 10px;
        }

        .photo-preview {
          position: relative;
          overflow: hidden;
          aspect-ratio: 4 / 3;
          border: 1px solid rgba(212,168,67,0.14);
          border-radius: 10px;
          background: #0b1420;
        }

        .photo-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-actions {
          position: absolute;
          inset-inline: 6px;
          bottom: 6px;
          display: flex;
          gap: 5px;
        }

        .photo-actions button {
          width: 28px;
          height: 26px;
          border: 0;
          border-radius: 999px;
          background: rgba(6,14,27,0.88);
          color: #fff;
          cursor: pointer;
          font-size: 12px;
        }

        .photo-actions button:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .summary-grid div {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          background: #0b1420;
          padding: 13px;
        }

        .summary-grid span {
          display: block;
          margin-bottom: 7px;
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .summary-grid strong {
          color: #f8fafc;
          font-size: 14px;
        }

        .auth-final {
          border: 1px solid ${GOLD_MID};
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(212,168,67,0.10), rgba(255,255,255,0.025));
          color: #94a3b8;
          padding: 18px;
        }

        .auth-final h3 {
          margin: 0 0 8px;
          color: #f8fafc;
          font-size: 18px;
        }

        .auth-final p {
          margin: 0 0 16px;
          font-size: 13px;
          line-height: 1.6;
        }

        .auth-actions,
        .navigation-row {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .gold-button,
        .gold-link {
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 10px;
          background: ${GOLD};
          color: #07111f;
          cursor: pointer;
          font-size: 14px;
          font-weight: 950;
          padding: 0 20px;
          text-decoration: none;
        }

        .gold-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .gold-button.wide {
          width: 100%;
        }

        .back-button {
          min-height: 46px;
          border: 1px solid ${GOLD_MID};
          border-radius: 10px;
          background: transparent;
          color: ${GOLD};
          cursor: pointer;
          font-size: 14px;
          font-weight: 900;
          padding: 0 18px;
        }

        .back-button:disabled {
          border-color: #1e293b;
          color: #334155;
          cursor: default;
        }

        .navigation-row {
          border-top: 1px solid ${GOLD_DIM};
          padding-top: 18px;
        }

        .navigation-submit {
          min-width: 150px;
        }

        @media (max-width: 720px) {
          .property-draft-shell {
            padding-bottom: 70px;
          }

          .draft-hero {
            padding: 18px;
          }

          .draft-card {
            border-radius: 16px;
            padding: 18px;
          }

          .city-grid,
          .two-grid,
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .type-grid,
          .amenity-grid,
          .chip-grid {
            grid-template-columns: 1fr;
          }

          .week-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .auth-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .gold-button,
          .gold-link,
          .outline-link {
            width: 100%;
          }

          .navigation-row {
            position: sticky;
            bottom: 0;
            z-index: 3;
            margin: 0 -18px -18px;
            padding: 12px 18px;
            background: rgba(7,17,31,0.94);
            backdrop-filter: blur(16px);
          }
        }
      `}</style>
    </div>
  );
}
