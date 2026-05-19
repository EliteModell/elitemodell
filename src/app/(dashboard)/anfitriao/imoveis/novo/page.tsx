"use client";

/* eslint-disable @next/next/no-img-element -- Previews show files selected on the device before final review. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  AirVent,
  Bath,
  BedDouble,
  Building2,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Flame,
  Home,
  Hotel,
  ImagePlus,
  KeyRound,
  Lamp,
  MapPin,
  Minus,
  Plus,
  Shield,
  ShowerHead,
  Sofa,
  Sparkles,
  Store,
  Tv,
  Wifi,
} from "lucide-react";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const DRAFT_KEY = "elitemodell_location_onboarding_v2";

type LocationType =
  | "HOUSE"
  | "APARTMENT"
  | "PRIVATE_ROOM"
  | "PRIVATE_SUITE"
  | "HOTEL"
  | "MOTEL"
  | "FLAT"
  | "STUDIO"
  | "LOFT"
  | "PRIVATE_OFFICE"
  | "RESERVED_SPACE"
  | "OTHER";
type PricingMode = "platform" | "direct" | "approval";
type PhotoStatus = "uploading" | "uploaded" | "error";

type UploadedPhoto = {
  id: string;
  url?: string;
  preview: string;
  name: string;
  status: PhotoStatus;
  error?: string;
  cover?: boolean;
};

type DraftForm = {
  draftId: string;
  type: LocationType | "";
  useMode: string;
  country: string;
  zipCode: string;
  address: string;
  number: string;
  complement: string;
  bairro: string;
  city: string;
  state: string;
  locationPrivacy: string;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  maxModels: number;
  amenities: string[];
  safetyItems: string[];
  safetyInfo: string[];
  rules: Record<string, boolean>;
  allowedHours: string;
  rulesText: string;
  photos: UploadedPhoto[];
  title: string;
  description: string;
  priceHour: string;
  pricePeriod: string;
  priceDay: string;
  cleaningFee: string;
  pricingMode: PricingMode;
  availabilityMode: string;
  days: string[];
  startTime: string;
  endTime: string;
};

type CardOption<T extends string = string> = {
  value: T;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const locationTypes: CardOption<LocationType>[] = [
  { value: "HOUSE", label: "Casa", icon: Home },
  { value: "APARTMENT", label: "Apartamento", icon: Building2 },
  { value: "PRIVATE_ROOM", label: "Quarto privativo", icon: BedDouble },
  { value: "PRIVATE_SUITE", label: "Suíte privativa", icon: Bath },
  { value: "HOTEL", label: "Hotel", icon: Hotel },
  { value: "MOTEL", label: "Motel", icon: KeyRound },
  { value: "FLAT", label: "Flat", icon: Building2 },
  { value: "STUDIO", label: "Studio", icon: Lamp },
  { value: "LOFT", label: "Loft", icon: DoorOpen },
  { value: "PRIVATE_OFFICE", label: "Sala privativa", icon: Store },
  { value: "RESERVED_SPACE", label: "Espaço reservado", icon: Shield },
  { value: "OTHER", label: "Outro", icon: Sparkles },
];

const useModes = [
  "Exclusivo para atendimentos",
  "Uso compartilhado com horários reservados",
  "Disponível apenas em dias específicos",
  "Disponível mediante aprovação",
];

const privacyOptions = [
  "Mostrar localização aproximada para modelos",
  "Mostrar localização exata somente após aprovação",
  "Nunca exibir publicamente o endereço completo",
];

const amenities: CardOption[] = [
  { value: "Wi-Fi", label: "Wi-Fi", icon: Wifi },
  { value: "Ar-condicionado", label: "Ar-condicionado", icon: AirVent },
  { value: "TV", label: "TV", icon: Tv },
  { value: "Banheiro privativo", label: "Banheiro privativo", icon: Bath },
  { value: "Chuveiro", label: "Chuveiro", icon: ShowerHead },
  { value: "Frigobar", label: "Frigobar", icon: Store },
  { value: "Cama", label: "Cama", icon: BedDouble },
  { value: "Sofá", label: "Sofá", icon: Sofa },
  { value: "Espelho grande", label: "Espelho grande", icon: Sparkles },
  { value: "Iluminação boa", label: "Iluminação boa", icon: Lamp },
  { value: "Som ambiente", label: "Som ambiente", icon: Tv },
  { value: "Estacionamento", label: "Estacionamento", icon: Car },
  { value: "Entrada discreta", label: "Entrada discreta", icon: DoorOpen },
  { value: "Portaria", label: "Portaria", icon: Shield },
  { value: "Elevador", label: "Elevador", icon: Building2 },
  { value: "Cozinha", label: "Cozinha", icon: Store },
  { value: "Toalhas disponíveis", label: "Toalhas disponíveis", icon: Sparkles },
  { value: "Lençóis disponíveis", label: "Lençóis disponíveis", icon: BedDouble },
  { value: "Produtos de higiene", label: "Produtos de higiene", icon: Bath },
  { value: "Hidromassagem", label: "Hidromassagem", icon: ShowerHead },
  { value: "Piscina", label: "Piscina", icon: Sparkles },
  { value: "Área externa", label: "Área externa", icon: Home },
  { value: "Varanda", label: "Varanda", icon: DoorOpen },
  { value: "Vista privilegiada", label: "Vista privilegiada", icon: Sparkles },
];

const safetyItems: CardOption[] = [
  { value: "Câmera externa", label: "Câmera externa", icon: Camera },
  { value: "Portaria", label: "Portaria", icon: Shield },
  { value: "Controle de acesso", label: "Controle de acesso", icon: KeyRound },
  { value: "Fechadura eletrônica", label: "Fechadura eletrônica", icon: KeyRound },
  { value: "Alarme", label: "Alarme", icon: Shield },
  { value: "Detector de fumaça", label: "Detector de fumaça", icon: Flame },
  { value: "Extintor", label: "Extintor", icon: Flame },
  { value: "Saída de emergência", label: "Saída de emergência", icon: DoorOpen },
  { value: "Iluminação externa", label: "Iluminação externa", icon: Lamp },
  { value: "Segurança no prédio/condomínio", label: "Segurança no prédio", icon: Building2 },
  { value: "Interfone", label: "Interfone", icon: Shield },
  { value: "Estacionamento seguro", label: "Estacionamento seguro", icon: Car },
];

const safetyInfo = [
  "Câmera de segurança na parte externa",
  "Câmera em área comum",
  "Medidor de ruído",
  "Portaria com identificação",
  "Entrada compartilhada",
  "Animais no local",
  "Armas na propriedade",
  "Moradores no mesmo imóvel",
  "Outros riscos ou observações importantes",
];

const ruleItems = [
  "Permitido receber cliente no local?",
  "Necessário aviso prévio?",
  "Tem limite de tempo por atendimento?",
  "Tem taxa de limpeza?",
  "Permite pernoite?",
  "Permite uso recorrente?",
  "Exige documento na entrada?",
];

const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const stepTitles = [
  "Introdução",
  "Tipo de local",
  "Uso do local",
  "Endereço",
  "Mapa",
  "Estrutura",
  "Comodidades",
  "Segurança",
  "Informações",
  "Regras",
  "Fotos",
  "Título",
  "Descrição",
  "Condições",
  "Disponibilidade",
  "Revisão",
  "Enviado",
];

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `property-${Date.now()}`;
}

function emptyForm(): DraftForm {
  return {
    draftId: createDraftId(),
    type: "",
    useMode: "",
    country: "Brasil - BR",
    zipCode: "",
    address: "",
    number: "",
    complement: "",
    bairro: "",
    city: "",
    state: "",
    locationPrivacy: "Mostrar localização aproximada para modelos",
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    maxModels: 1,
    amenities: [],
    safetyItems: [],
    safetyInfo: [],
    rules: {},
    allowedHours: "",
    rulesText: "",
    photos: [],
    title: "",
    description: "",
    priceHour: "",
    pricePeriod: "",
    priceDay: "",
    cleaningFee: "",
    pricingMode: "approval",
    availabilityMode: "",
    days: [],
    startTime: "08:00",
    endTime: "22:00",
  };
}

function isUploaded(photo: UploadedPhoto) {
  return photo.status === "uploaded" && Boolean(photo.url);
}

function propertyEnumFromType(type: LocationType | "") {
  if (type === "HOUSE") return "HOUSE";
  if (type === "APARTMENT" || type === "FLAT") return "APARTMENT";
  if (type === "STUDIO") return "STUDIO";
  if (type === "LOFT") return "LOFT";
  if (type === "HOTEL" || type === "MOTEL") return "HOTEL";
  return "OTHER";
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Envie apenas arquivos de imagem.");
  if (file.size <= 2.5 * 1024 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function OptionCard<T extends string>({
  option,
  active,
  onClick,
}: {
  option: CardOption<T>;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = option.icon;
  return (
    <button type="button" className={active ? "select-card active" : "select-card"} onClick={onClick}>
      <Icon size={28} strokeWidth={1.7} />
      <span>{option.label}</span>
    </button>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="counter-row">
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`Diminuir ${label}`}>
          <Minus size={18} />
        </button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`Aumentar ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export default function NovoImovelPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DraftForm>(() => emptyForm());
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const progress = ((step + 1) / stepTitles.length) * 100;
  const uploadedPhotos = form.photos.filter(isUploaded);

  const selectedType = locationTypes.find((item) => item.value === form.type);

  const canPublish = session?.user?.role === "HOST" || session?.user?.role === "ADMIN";

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { form?: Partial<DraftForm>; step?: number };
        if (saved.form) {
          setForm({ ...emptyForm(), ...saved.form, photos: saved.form.photos ?? [] });
          setStep(Math.min(Math.max(saved.step ?? 0, 0), stepTitles.length - 2));
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, updatedAt: new Date().toISOString() }));
  }, [form, hydrated, step]);

  function setField<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "amenities" | "safetyItems" | "safetyInfo" | "days", value: string) {
    setForm((current) => {
      const list = current[key];
      return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  function updateRule(rule: string, value: boolean) {
    setForm((current) => ({ ...current, rules: { ...current.rules, [rule]: value } }));
  }

  function validate(target = step) {
    if (target === 1 && !form.type) return false;
    if (target === 2 && !form.useMode) return false;
    if (target === 3) return Boolean(form.zipCode && form.address && form.number && form.bairro && form.city && form.state);
    if (target === 4 && !form.locationPrivacy) return false;
    if (target === 5) return form.bathrooms > 0 && form.maxModels > 0;
    if (target === 6 && form.amenities.length === 0) return false;
    if (target === 7 && form.safetyItems.length === 0) return false;
    if (target === 10) return uploadedPhotos.length >= 5 && form.photos.every((photo) => photo.status !== "uploading");
    if (target === 11) return form.title.trim().length >= 5 && form.title.trim().length <= 50;
    if (target === 12) return form.description.trim().length >= 30;
    if (target === 14) return Boolean(form.availabilityMode && (form.availabilityMode !== "Dias específicos" || form.days.length > 0));
    return true;
  }

  async function fillCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    setField("zipCode", cep);
    if (clean.length !== 8) return;

    try {
      const res = await fetch(`/api/address/cep/${clean}`);
      const data = await res.json();
      if (!res.ok) return;
      setForm((current) => ({
        ...current,
        address: data.street ?? data.logradouro ?? current.address,
        bairro: data.neighborhood ?? data.bairro ?? current.bairro,
        city: data.city ?? data.localidade ?? current.city,
        state: data.state ?? data.uf ?? current.state,
      }));
    } catch {}
  }

  async function uploadFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    for (const original of incoming) {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowed.includes(original.type)) {
        toast.error("Use fotos em JPG, PNG ou WebP.");
        continue;
      }
      if (original.size > 10 * 1024 * 1024) {
        toast.error("Cada foto pode ter no máximo 10MB.");
        continue;
      }

      const id = createDraftId();
      const preview = URL.createObjectURL(original);
      setForm((current) => ({
        ...current,
        photos: [...current.photos, { id, name: original.name, preview, status: "uploading", cover: current.photos.length === 0 }],
      }));

      try {
        const file = await compressImage(original);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/upload?folder=properties/${form.draftId}`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(typeof data.error === "string" ? data.error : "Falha no upload da foto.");
        setForm((current) => ({
          ...current,
          photos: current.photos.map((photo) => photo.id === id ? { ...photo, url: data.url, status: "uploaded" } : photo),
        }));
      } catch (err) {
        setForm((current) => ({
          ...current,
          photos: current.photos.map((photo) => photo.id === id ? { ...photo, status: "error", error: err instanceof Error ? err.message : "Erro ao enviar." } : photo),
        }));
        toast.error(err instanceof Error ? err.message : "Erro ao enviar foto.");
      }
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.photos.length) return;
    const photos = [...form.photos];
    [photos[index], photos[next]] = [photos[next], photos[index]];
    setField("photos", photos);
  }

  function removePhoto(id: string) {
    const remaining = form.photos.filter((photo) => photo.id !== id);
    if (remaining.length && !remaining.some((photo) => photo.cover)) remaining[0].cover = true;
    setField("photos", remaining);
  }

  function makeCover(id: string) {
    setField("photos", form.photos.map((photo) => ({ ...photo, cover: photo.id === id })));
  }

  function next() {
    if (!validate()) {
      toast.error(step === 10 ? "Adicione no mínimo 5 fotos enviadas com sucesso." : "Preencha esta etapa para avançar.");
      return;
    }
    setStep((current) => Math.min(current + 1, stepTitles.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveAndExit() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, updatedAt: new Date().toISOString() }));
    toast.success("Rascunho salvo.");
    router.push(ACCOUNT_ROUTES.dashboardAnfitriao);
  }

  const summary = useMemo(() => [
    ["Tipo", selectedType?.label ?? "Pendente"],
    ["Localização", [form.bairro, form.city, form.state].filter(Boolean).join(", ") || "Pendente"],
    ["Comodidades", `${form.amenities.length} itens selecionados`],
    ["Segurança", `${form.safetyItems.length} itens selecionados`],
    ["Fotos", `${uploadedPhotos.length} fotos enviadas`],
    ["Título", form.title || "Pendente"],
    ["Disponibilidade", form.availabilityMode || "Pendente"],
    ["Condições", form.priceHour ? `R$ ${form.priceHour}/h` : form.pricePeriod ? `R$ ${form.pricePeriod}/período` : "Opcional"],
  ], [form, selectedType?.label, uploadedPhotos.length]);

  async function submit() {
    for (let i = 1; i <= 14; i += 1) {
      if (!validate(i)) {
        setStep(i);
        toast.error("Revise as etapas obrigatórias antes de enviar.");
        return;
      }
    }
    if (status !== "authenticated") {
      toast.error("Entre com sua conta de anfitrião para enviar.");
      return;
    }
    if (!canPublish) {
      toast.error("Sua conta precisa estar habilitada como anfitrião.");
      return;
    }

    setSaving(true);
    try {
      const orderedPhotos = [...form.photos].sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover))).filter(isUploaded);
      const payload = {
        title: form.title.trim(),
        description: [
          form.description.trim(),
          "",
          `Uso do local: ${form.useMode}.`,
          `Privacidade: ${form.locationPrivacy}.`,
          `Regras: ${form.allowedHours ? `Horário permitido: ${form.allowedHours}. ` : ""}${form.rulesText}`,
          `Informações de segurança: ${form.safetyInfo.join(", ") || "Sem observações adicionais"}.`,
        ].join("\n"),
        type: propertyEnumFromType(form.type),
        address: `${form.address}, ${form.number}${form.complement ? ` - ${form.complement}` : ""}`,
        bairro: form.bairro,
        city: form.city,
        state: form.state,
        country: form.country,
        zipCode: form.zipCode,
        pricePerNight: Number(form.priceDay || form.pricePeriod || form.priceHour || 1),
        cleaningFee: Number(form.cleaningFee || 0),
        maxGuests: form.maxModels,
        bedrooms: Math.max(1, form.bedrooms),
        beds: Math.max(1, form.beds),
        bathrooms: Math.max(1, form.bathrooms),
        checkInTime: form.startTime,
        checkOutTime: form.endTime,
        minNights: 1,
        instantBook: false,
        allowPets: false,
        allowSmoking: false,
        allowParties: false,
        amenities: [
          selectedType?.label ? `Tipo: ${selectedType.label}` : "",
          ...form.amenities,
          ...form.safetyItems.map((item) => `Segurança: ${item}`),
          `Disponibilidade: ${form.availabilityMode}`,
          form.days.length ? `Dias: ${form.days.join(", ")}` : "",
          `Pagamento: ${form.pricingMode === "platform" ? "pela plataforma" : form.pricingMode === "direct" ? "direto" : "sob aprovação"}`,
        ].filter(Boolean),
        photos: orderedPhotos.map((photo) => photo.url),
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível enviar o local.");
      localStorage.removeItem(DRAFT_KEY);
      setStep(16);
      toast.success("Cadastro enviado para análise.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  const canGoNext = validate();

  return (
    <main className="onboarding-shell">
      <header className="top-actions">
        <button type="button" onClick={saveAndExit}>Salvar e sair</button>
        <Link href="/suporte">Dúvidas?</Link>
      </header>

      <section className="step-panel">
        {step === 0 && (
          <div className="intro-screen">
            <div className="intro-mark"><Shield size={54} /></div>
            <h1>Cadastre seu local para receber modelos com segurança e discrição</h1>
            <p>Você poderá cadastrar casas, apartamentos, suítes, flats ou espaços privados disponíveis para atendimento. As informações serão avaliadas antes da publicação.</p>
            <button type="button" onClick={next} className="primary standalone">Começar cadastro</button>
          </div>
        )}

        {step === 1 && (
          <>
            <StepTitle title="Qual tipo de local você quer cadastrar?" />
            <div className="card-grid">
              {locationTypes.map((option) => (
                <OptionCard key={option.value} option={option} active={form.type === option.value} onClick={() => setField("type", option.value)} />
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle title="Como esse local será disponibilizado?" helper="Essa informação ajuda as modelos a entenderem como o espaço funciona antes de solicitar o uso." />
            <div className="stack">
              {useModes.map((mode) => (
                <button key={mode} type="button" className={form.useMode === mode ? "choice active" : "choice"} onClick={() => setField("useMode", mode)}>{mode}</button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle title="Informe o endereço do local" helper="Buscaremos o endereço pelo CEP quando possível. Você pode ajustar tudo manualmente." />
            <div className="form-grid">
              <Input label="País/região" value={form.country} onChange={(value) => setField("country", value)} />
              <Input label="CEP" value={form.zipCode} onChange={fillCep} />
              <Input label="Endereço" value={form.address} onChange={(value) => setField("address", value)} />
              <Input label="Número" value={form.number} onChange={(value) => setField("number", value)} />
              <Input label="Complemento" value={form.complement} onChange={(value) => setField("complement", value)} />
              <Input label="Bairro" value={form.bairro} onChange={(value) => setField("bairro", value)} />
              <Input label="Cidade" value={form.city} onChange={(value) => setField("city", value)} />
              <Input label="Estado" value={form.state} onChange={(value) => setField("state", value.toUpperCase().slice(0, 2))} />
            </div>
            <p className="privacy-note">O endereço exato não será exibido publicamente. Ele será compartilhado apenas quando houver uma solicitação aprovada ou conforme regra definida pela plataforma.</p>
          </>
        )}

        {step === 4 && (
          <>
            <StepTitle title="Confirme a localização do local" />
            <div className="map-card">
              <div className="map-pin"><MapPin size={28} fill={GOLD} color="#111" /></div>
              <div className="address-chip"><MapPin size={18} /> {[form.address, form.number, form.bairro, form.city, form.state].filter(Boolean).join(", ")}</div>
            </div>
            <div className="stack">
              {privacyOptions.map((option) => (
                <button key={option} type="button" className={form.locationPrivacy === option ? "choice active" : "choice"} onClick={() => setField("locationPrivacy", option)}>{option}</button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <StepTitle title="Qual estrutura o local oferece?" />
            <Counter label="Quantidade de quartos disponíveis" value={form.bedrooms} onChange={(value) => setField("bedrooms", value)} />
            <Counter label="Quantidade de banheiros" value={form.bathrooms} onChange={(value) => setField("bathrooms", value)} />
            <Counter label="Camas, macas ou sofás utilizáveis" value={form.beds} onChange={(value) => setField("beds", value)} />
            <Counter label="Máximo de modelos usando o local por vez" value={form.maxModels} onChange={(value) => setField("maxModels", Math.max(1, value))} />
          </>
        )}

        {step === 6 && (
          <>
            <StepTitle title="O que o local oferece?" />
            <div className="card-grid">
              {amenities.map((option) => (
                <OptionCard key={option.value} option={option} active={form.amenities.includes(option.value)} onClick={() => toggleList("amenities", option.value)} />
              ))}
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <StepTitle title="Quais itens de segurança o local possui?" />
            <div className="card-grid">
              {safetyItems.map((option) => (
                <OptionCard key={option.value} option={option} active={form.safetyItems.includes(option.value)} onClick={() => toggleList("safetyItems", option.value)} />
              ))}
            </div>
            <p className="privacy-note">Câmeras em áreas internas de atendimento não são permitidas. Caso existam câmeras externas, informe com transparência.</p>
          </>
        )}

        {step === 8 && (
          <>
            <StepTitle title="Compartilhe informações importantes de segurança" helper="O local possui alguma dessas opções?" />
            <div className="checkbox-list">
              {safetyInfo.map((item) => (
                <label key={item}><span>{item}</span><input type="checkbox" checked={form.safetyInfo.includes(item)} onChange={() => toggleList("safetyInfo", item)} /></label>
              ))}
            </div>
            <p className="privacy-note">Essas informações ajudam a manter a segurança das modelos e a transparência da plataforma.</p>
          </>
        )}

        {step === 9 && (
          <>
            <StepTitle title="Quais são as regras do local?" />
            <Input label="Horário permitido de uso" value={form.allowedHours} onChange={(value) => setField("allowedHours", value)} placeholder="Ex.: 08h às 22h, sob agendamento" />
            <div className="checkbox-list">
              {ruleItems.map((item) => (
                <label key={item}><span>{item}</span><input type="checkbox" checked={Boolean(form.rules[item])} onChange={(event) => updateRule(item, event.target.checked)} /></label>
              ))}
            </div>
            <Textarea label="Descreva regras importantes do local" value={form.rulesText} onChange={(value) => setField("rulesText", value)} />
          </>
        )}

        {step === 10 && (
          <>
            <StepTitle title="Adicione fotos do local" helper="Você precisa adicionar no mínimo 5 fotos para continuar. Mostre os ambientes principais com boa iluminação." />
            <label className="upload-box">
              <ImagePlus size={34} />
              <strong>Adicionar fotos</strong>
              <span>Entrada, suíte, banheiro, área principal e comodidade especial</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { if (event.target.files) uploadFiles(event.target.files); event.currentTarget.value = ""; }} />
            </label>
            <div className="photo-list">
              {form.photos.map((photo, index) => (
                <article key={photo.id} className="photo-item">
                  <img src={photo.url ?? photo.preview} alt={photo.name} />
                  <div>
                    <strong>{photo.cover ? "Foto de capa" : `Foto ${index + 1}`}</strong>
                    <span className={photo.status}>{photo.status === "uploading" ? "Enviando..." : photo.status === "uploaded" ? "Enviada com sucesso" : photo.error ?? "Falha no envio"}</span>
                    <div className="photo-actions">
                      <button type="button" onClick={() => makeCover(photo.id)}>Capa</button>
                      <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0}>Subir</button>
                      <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === form.photos.length - 1}>Descer</button>
                      <button type="button" onClick={() => removePhoto(photo.id)}>Excluir</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="privacy-note">{uploadedPhotos.length}/5 fotos enviadas com sucesso.</p>
          </>
        )}

        {step === 11 && (
          <>
            <StepTitle title="Agora, dê um título para o seu local" helper="Títulos curtos funcionam melhor. Você poderá alterar depois." />
            <Textarea label="Título" value={form.title} onChange={(value) => setField("title", value.slice(0, 50))} placeholder="Suíte discreta no Centro" maxLength={50} />
            <span className="counter-text">{form.title.length}/50</span>
          </>
        )}

        {step === 12 && (
          <>
            <StepTitle title="Descreva o local para as modelos" helper="Evite colocar dados sensíveis ou endereço completo na descrição pública." />
            <Textarea label="Descrição" value={form.description} onChange={(value) => setField("description", value)} placeholder="Descreva o ambiente, diferenciais, privacidade, acesso, conforto e regras importantes." rows={8} />
          </>
        )}

        {step === 13 && (
          <>
            <StepTitle title="Defina o valor de uso do local" helper="Se o financeiro ainda não estiver ativo para este local, deixe os valores em branco e use aprovação manual." />
            <div className="form-grid">
              <Input label="Preço por hora" value={form.priceHour} onChange={(value) => setField("priceHour", value)} type="number" />
              <Input label="Preço por período" value={form.pricePeriod} onChange={(value) => setField("pricePeriod", value)} type="number" />
              <Input label="Preço por diária" value={form.priceDay} onChange={(value) => setField("priceDay", value)} type="number" />
              <Input label="Taxa de limpeza" value={form.cleaningFee} onChange={(value) => setField("cleaningFee", value)} type="number" />
            </div>
            <div className="stack compact">
              {[
                ["platform", "Pagamento pela plataforma"],
                ["direct", "Pagamento direto"],
                ["approval", "Condição definida após aprovação"],
              ].map(([value, label]) => (
                <button key={value} type="button" className={form.pricingMode === value ? "choice active" : "choice"} onClick={() => setField("pricingMode", value as PricingMode)}>{label}</button>
              ))}
            </div>
          </>
        )}

        {step === 14 && (
          <>
            <StepTitle title="Quando o local fica disponível?" />
            <div className="stack compact">
              {["Todos os dias", "Dias específicos", "Apenas com aprovação manual", "Horários personalizados"].map((item) => (
                <button key={item} type="button" className={form.availabilityMode === item ? "choice active" : "choice"} onClick={() => setField("availabilityMode", item)}>{item}</button>
              ))}
            </div>
            <div className="day-grid">
              {weekDays.map((day) => <button key={day} type="button" className={form.days.includes(day) ? "day active" : "day"} onClick={() => toggleList("days", day)}>{day}</button>)}
            </div>
            <div className="form-grid two">
              <Input label="Horário inicial" value={form.startTime} onChange={(value) => setField("startTime", value)} type="time" />
              <Input label="Horário final" value={form.endTime} onChange={(value) => setField("endTime", value)} type="time" />
            </div>
          </>
        )}

        {step === 15 && (
          <>
            <StepTitle title="Revise seu cadastro" />
            <div className="review-grid">
              {summary.map(([label, value], index) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <button type="button" onClick={() => setStep([1, 3, 6, 7, 10, 11, 14, 13][index] ?? 1)}>Editar seção</button>
                </div>
              ))}
            </div>
            <button type="button" className="primary standalone" onClick={submit} disabled={saving}>{saving ? "Enviando..." : "Enviar para análise"}</button>
          </>
        )}

        {step === 16 && (
          <div className="intro-screen">
            <div className="intro-mark"><Check size={56} /></div>
            <h1>Cadastro enviado para análise</h1>
            <p>Nossa equipe irá revisar as informações antes de liberar o local para as modelos.</p>
            <div className="next-steps">
              {["Análise de segurança", "Validação das fotos", "Aprovação do local", "Publicação na área das modelos"].map((item) => <span key={item}>{item}</span>)}
            </div>
            <Link href={ACCOUNT_ROUTES.verificacaoAnfitriao} className="primary standalone">Acompanhar análise</Link>
          </div>
        )}
      </section>

      {step > 0 && step < 16 && (
        <footer className="fixed-footer">
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="footer-actions">
            <button type="button" className="back" onClick={back}><ChevronLeft size={20} /> Voltar</button>
            <button type="button" className="primary" onClick={next} disabled={!canGoNext}>
              Avançar <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      )}

      <style>{`
        .onboarding-shell {
          min-height: 100vh;
          background: #fbfaf7;
          color: #171717;
          padding: max(24px, env(safe-area-inset-top)) 18px 124px;
        }
        .top-actions {
          max-width: 720px;
          margin: 0 auto 34px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .top-actions button,
        .top-actions a {
          min-height: 42px;
          border: 1px solid #ded8ca;
          border-radius: 999px;
          background: #fff;
          color: #171717;
          padding: 0 17px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .step-panel {
          max-width: 720px;
          margin: 0 auto;
        }
        .intro-screen {
          min-height: calc(100vh - 220px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 18px;
        }
        .intro-mark {
          width: 96px;
          height: 96px;
          border-radius: 28px;
          display: grid;
          place-items: center;
          background: #15120d;
          color: ${GOLD};
          box-shadow: 0 22px 50px rgba(20, 16, 10, 0.16);
        }
        h1 {
          margin: 0;
          font-size: clamp(32px, 9vw, 54px);
          line-height: 0.98;
          letter-spacing: 0;
          font-weight: 950;
        }
        p {
          margin: 0;
          color: #6f6a60;
          font-size: 17px;
          line-height: 1.55;
        }
        .helper {
          margin-top: 12px;
        }
        .step-title {
          margin-bottom: 28px;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .select-card {
          min-height: 128px;
          border: 1.5px solid #ded8ca;
          border-radius: 12px;
          background: #fff;
          color: #171717;
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          text-align: left;
          font-size: 17px;
          font-weight: 850;
        }
        .select-card.active,
        .choice.active,
        .day.active {
          border-color: ${GOLD};
          background: rgba(212,168,67,0.12);
          box-shadow: inset 0 0 0 1px ${GOLD};
        }
        .stack {
          display: grid;
          gap: 12px;
        }
        .stack.compact {
          margin-top: 18px;
        }
        .choice {
          min-height: 68px;
          border: 1.5px solid #ded8ca;
          border-radius: 14px;
          background: #fff;
          padding: 18px;
          text-align: left;
          color: #171717;
          font-size: 16px;
          font-weight: 850;
        }
        .form-grid {
          display: grid;
          gap: 12px;
        }
        .form-grid.two {
          grid-template-columns: 1fr 1fr;
          margin-top: 16px;
        }
        .field {
          display: grid;
          gap: 7px;
        }
        .field label {
          color: #6f6a60;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .field input,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1.5px solid #cfc8b8;
          border-radius: 12px;
          background: #fff;
          color: #171717;
          min-height: 54px;
          padding: 14px;
          font: inherit;
          outline: none;
        }
        .field textarea {
          min-height: 150px;
          resize: vertical;
        }
        .privacy-note {
          margin-top: 16px;
          border-left: 3px solid ${GOLD};
          padding-left: 14px;
          font-size: 14px;
          color: #6f6a60;
        }
        .map-card {
          height: 390px;
          border-radius: 22px;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            #ede7dc;
          background-size: 46px 46px;
          position: relative;
          overflow: hidden;
          margin-bottom: 18px;
        }
        .map-pin {
          position: absolute;
          left: 50%;
          top: 55%;
          transform: translate(-50%, -50%);
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #161616;
          display: grid;
          place-items: center;
          box-shadow: 0 18px 44px rgba(0,0,0,0.18);
        }
        .address-chip {
          position: absolute;
          left: 18px;
          right: 18px;
          top: 22px;
          border-radius: 18px;
          background: #fff;
          padding: 18px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-weight: 800;
          box-shadow: 0 14px 40px rgba(0,0,0,0.08);
        }
        .counter-row {
          min-height: 78px;
          border-bottom: 1px solid #e2dccf;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          font-size: 17px;
          font-weight: 760;
        }
        .counter-row div {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .counter-row button {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #d8d2c6;
          background: #fff;
          display: grid;
          place-items: center;
        }
        .counter-row button:disabled {
          opacity: 0.35;
        }
        .checkbox-list {
          display: grid;
          gap: 4px;
        }
        .checkbox-list label {
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #e5dfd3;
          font-size: 16px;
          font-weight: 720;
        }
        .checkbox-list input {
          width: 24px;
          height: 24px;
          accent-color: ${GOLD};
        }
        .upload-box {
          min-height: 300px;
          border: 2px dashed #c9c1b2;
          border-radius: 22px;
          background: #fff;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          text-align: center;
          cursor: pointer;
          color: #171717;
        }
        .upload-box strong {
          font-size: 18px;
        }
        .upload-box span {
          max-width: 360px;
          color: #7d766a;
          font-size: 14px;
          line-height: 1.45;
        }
        .photo-list {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }
        .photo-item {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 14px;
          background: #fff;
          border: 1px solid #ded8ca;
          border-radius: 16px;
          padding: 10px;
        }
        .photo-item img {
          width: 120px;
          height: 100px;
          object-fit: cover;
          border-radius: 12px;
          background: #eee;
        }
        .photo-item strong,
        .photo-item span {
          display: block;
        }
        .photo-item span {
          margin-top: 4px;
          color: #6f6a60;
          font-size: 13px;
        }
        .photo-item span.uploaded {
          color: #12753f;
        }
        .photo-item span.error {
          color: #9f241f;
        }
        .photo-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }
        .photo-actions button {
          border: 1px solid #ded8ca;
          border-radius: 999px;
          background: #fbfaf7;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
        }
        .counter-text {
          display: block;
          margin-top: 8px;
          color: #6f6a60;
          font-weight: 800;
        }
        .day-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-top: 16px;
        }
        .day {
          min-height: 44px;
          border: 1px solid #ded8ca;
          border-radius: 999px;
          background: #fff;
          font-weight: 900;
        }
        .review-grid {
          display: grid;
          gap: 12px;
          margin-bottom: 22px;
        }
        .review-grid div {
          border: 1px solid #ded8ca;
          border-radius: 16px;
          background: #fff;
          padding: 16px;
        }
        .review-grid span {
          display: block;
          color: #6f6a60;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .review-grid strong {
          display: block;
          margin: 7px 0 12px;
          font-size: 16px;
        }
        .review-grid button {
          border: 0;
          background: transparent;
          padding: 0;
          color: ${GOLD};
          font-weight: 900;
        }
        .next-steps {
          display: grid;
          gap: 10px;
          width: 100%;
        }
        .next-steps span {
          border: 1px solid #ded8ca;
          background: #fff;
          border-radius: 14px;
          padding: 14px;
          font-weight: 850;
        }
        .primary {
          min-height: 58px;
          border: 0;
          border-radius: 16px;
          background: #171717;
          color: #fff;
          padding: 0 24px;
          font-size: 16px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }
        .primary:disabled {
          background: #eee9df;
          color: #b7afa1;
        }
        .standalone {
          width: 100%;
          margin-top: 8px;
        }
        .fixed-footer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 30;
          background: rgba(255,255,255,0.96);
          border-top: 1px solid #ded8ca;
          padding-bottom: env(safe-area-inset-bottom);
          backdrop-filter: blur(16px);
        }
        .progress {
          height: 5px;
          background: #e8e2d6;
        }
        .progress span {
          display: block;
          height: 100%;
          background: #171717;
          transition: width 0.2s ease;
        }
        .footer-actions {
          max-width: 720px;
          margin: 0 auto;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }
        .back {
          min-height: 54px;
          border: 0;
          background: transparent;
          color: #171717;
          font-size: 16px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        @media (min-width: 760px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
          .field:has(textarea) {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 520px) {
          .onboarding-shell {
            padding-left: 18px;
            padding-right: 18px;
          }
          .card-grid {
            gap: 10px;
          }
          .select-card {
            min-height: 116px;
            padding: 14px;
            font-size: 15px;
          }
          .form-grid.two,
          .day-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .photo-item {
            grid-template-columns: 96px 1fr;
          }
          .photo-item img {
            width: 96px;
            height: 96px;
          }
        }
      `}</style>
    </main>
  );
}

function StepTitle({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="step-title">
      <h1>{title}</h1>
      {helper ? <p className="helper">{helper}</p> : null}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} />
    </div>
  );
}
