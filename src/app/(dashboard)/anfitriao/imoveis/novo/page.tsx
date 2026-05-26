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

async function compressLocalDraftImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Envie apenas arquivos de imagem.");

  const bitmap = await createImageBitmap(file);
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível preparar a foto para rascunho."));
    reader.readAsDataURL(file);
  });
}

function isLocalDataUrl(value: string | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}

async function dataUrlToFile(dataUrl: string, name: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name.replace(/\.\w+$/, ".jpg"), { type: blob.type || "image/jpeg" });
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
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const progress = ((step + 1) / stepTitles.length) * 100;
  const uploadedPhotos = form.photos.filter(isUploaded);

  const selectedType = locationTypes.find((item) => item.value === form.type);

  const canPublish =
    status === "authenticated" && (session?.user?.role === "ADMIN" || session?.user?.accountType !== "model");

  function persistDraft(nextForm = form, nextStep = step) {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          form: nextForm,
          step: nextStep,
          status: status === "authenticated" ? "draft" : "draft_local",
          updatedAt: new Date().toISOString(),
        })
      );
      return true;
    } catch (err) {
      console.warn("[property-draft] Não foi possível salvar rascunho local.", err);
      return false;
    }
  }

  function currentReturnUrl() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function goToLoginForThisStep() {
    persistDraft();
    router.push(`${ACCOUNT_ROUTES.login}?returnUrl=${encodeURIComponent(currentReturnUrl())}`);
  }

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as { form?: Partial<DraftForm>; step?: number };
        if (saved.form) {
          setForm({ ...emptyForm(), ...saved.form, photos: saved.form.photos ?? [] });
          setStep(Math.min(Math.max(saved.step ?? 0, 0), stepTitles.length - 2));
          setDraftLoaded(true);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistDraft(form, step);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (status !== "authenticated") {
          const file = await compressLocalDraftImage(original);
          const dataUrl = await fileToDataUrl(file);
          setForm((current) => ({
            ...current,
            photos: current.photos.map((photo) => photo.id === id ? { ...photo, preview: dataUrl, url: dataUrl, status: "uploaded" } : photo),
          }));
          continue;
        }

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
    const saved = persistDraft();
    toast.success(saved ? "Rascunho salvo. Você poderá continuar depois." : "Rascunho mantido nesta sessão.");
    if (status !== "authenticated") {
      router.push("/");
      return;
    }
    router.push(ACCOUNT_ROUTES.dashboardCliente);
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm());
    setStep(0);
    setDraftLoaded(false);
    toast.success("Rascunho descartado.");
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
      toast.error("Entre com sua conta para enviar o cadastro.");
      goToLoginForThisStep();
      return;
    }
    if (!canPublish) {
      toast.error("Sua conta precisa estar habilitada como anfitrião.");
      return;
    }

    setSaving(true);
    try {
      const orderedPhotos = [...form.photos].sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover))).filter(isUploaded);
      const submittedPhotos: string[] = [];
      for (const [order, photo] of orderedPhotos.entries()) {
        if (!photo.url) continue;
        if (!isLocalDataUrl(photo.url)) {
          submittedPhotos.push(photo.url);
          continue;
        }

        const file = await dataUrlToFile(photo.url, photo.name || `foto-${order + 1}.jpg`);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/upload?folder=properties/${form.draftId}`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(typeof data.error === "string" ? data.error : "Falha no upload da foto.");
        submittedPhotos.push(data.url);
      }

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
        photos: submittedPhotos,
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
    <main className="onboarding-shell host-flow-page">
      <header className="top-actions">
        <Link href="/" className="flow-brand" aria-label="Elite Modell">
          <span>elite</span><strong>modell</strong>
        </Link>
        <button type="button" onClick={saveAndExit}>Salvar e sair</button>
        <button type="button" onClick={discardDraft}>Descartar rascunho</button>
        <Link href="/suporte">Dúvidas?</Link>
      </header>

      {hydrated && draftLoaded && step < 16 && (
        <div className="draft-banner">
          <strong>Cadastro incompleto salvo</strong>
          <span>Continue de onde parou, edite as etapas abaixo ou descarte o rascunho.</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Continuar</button>
        </div>
      )}

      <section className="step-panel host-flow-content">
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
              <Input label="Preço por hora" value={form.priceHour} onChange={(value) => setField("priceHour", value)} type="number" prefix="R$" />
              <Input label="Preço por período" value={form.pricePeriod} onChange={(value) => setField("pricePeriod", value)} type="number" prefix="R$" />
              <Input label="Preço por diária" value={form.priceDay} onChange={(value) => setField("priceDay", value)} type="number" prefix="R$" />
              <Input label="Taxa de limpeza" value={form.cleaningFee} onChange={(value) => setField("cleaningFee", value)} type="number" prefix="R$" />
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
        .draft-banner {
          max-width: 720px;
          margin: -12px auto 28px;
          border: 1px solid #ded8ca;
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 5px 14px;
          align-items: center;
        }
        .draft-banner strong,
        .draft-banner span {
          display: block;
        }
        .draft-banner span {
          color: #6f6a60;
          font-size: 14px;
        }
        .draft-banner button {
          grid-row: 1 / span 2;
          grid-column: 2;
          border: 0;
          border-radius: 10px;
          background: #171717;
          color: #fff;
          min-height: 42px;
          padding: 0 16px;
          font-weight: 900;
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
        .input-prefix-wrap {
          position: relative;
        }
        .input-prefix {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: ${GOLD};
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 1;
        }
        .field input.has-prefix {
          padding-left: 56px;
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
          .draft-banner {
            grid-template-columns: 1fr;
          }
          .draft-banner button {
            grid-row: auto;
            grid-column: auto;
          }
        }
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }
        :global(html),
        :global(body) {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          background: #050505;
        }
        img,
        svg {
          max-width: 100%;
          height: auto;
        }
        .onboarding-shell {
          position: relative;
          width: 100%;
          max-width: 430px;
          min-height: 100dvh;
          margin: 0 auto;
          overflow-x: hidden;
          isolation: isolate;
          background:
            radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%),
            radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%),
            #050505;
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center;
          color: #fff;
          padding: max(18px, env(safe-area-inset-top)) 16px calc(144px + env(safe-area-inset-bottom));
        }
        .host-flow-page::before,
        .host-flow-page::after {
          content: none !important;
          display: none !important;
        }
        .top-actions {
          max-width: 430px;
          margin: 0 auto 30px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          align-items: center;
        }
        .flow-brand {
          min-height: 42px;
          border: 1px solid rgba(214,168,58,0.20);
          border-radius: 999px;
          background: rgba(16,16,20,0.72);
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          gap: 1px;
          text-decoration: none;
          box-shadow: 0 18px 46px rgba(0,0,0,0.24);
        }
        .flow-brand span {
          color: #d6a83a;
          font-size: 14px;
          font-weight: 950;
        }
        .flow-brand strong {
          color: #fff;
          font-size: 14px;
          font-weight: 950;
        }
        .top-actions button,
        .top-actions a:not(.flow-brand) {
          min-height: 42px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 999px;
          background: rgba(11,11,13,0.82);
          color: #f3f3f3;
          padding: 0 13px;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 14px 36px rgba(0,0,0,0.22);
        }
        .top-actions button:nth-of-type(2) {
          grid-column: 1 / -1;
          min-height: 38px;
          color: #d6a83a;
          background: rgba(214,168,58,0.08);
        }
        .step-panel {
          max-width: 430px;
          margin: 0 auto;
        }
        .host-flow-content {
          position: relative;
          z-index: 1;
        }
        .draft-banner {
          max-width: 430px;
          margin: -12px auto 28px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          padding: 18px;
          color: #fff;
          box-shadow: 0 24px 70px rgba(0,0,0,0.32);
        }
        .draft-banner span {
          color: #b8b8b8;
        }
        .draft-banner button {
          border-radius: 14px;
          background: linear-gradient(135deg, #f5d77a, #d6a83a 46%, #a77818);
          color: #070707;
          box-shadow: 0 14px 34px rgba(214,168,58,0.20);
        }
        .intro-screen {
          min-height: calc(100dvh - 210px);
          justify-content: center;
          gap: 22px;
        }
        .intro-mark {
          width: 92px;
          height: 92px;
          border-radius: 26px;
          background: linear-gradient(180deg, #141414, #0b0b0d);
          color: #d6a83a;
          border: 1px solid rgba(214,168,58,0.28);
          box-shadow: 0 26px 80px rgba(214,168,58,0.10), 0 28px 70px rgba(0,0,0,0.55);
        }
        h1 {
          color: #fff;
          font-size: clamp(32px, 10vw, 46px);
          line-height: 1.02;
          letter-spacing: 0;
          text-wrap: balance;
        }
        p,
        .helper {
          color: #b8b8b8;
          font-size: 16px;
          line-height: 1.62;
        }
        .step-title {
          margin-bottom: 32px;
        }
        .step-title > span {
          display: block;
          margin-bottom: 12px;
          color: #d6a83a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }
        .card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          width: 100%;
          position: relative;
          z-index: 1;
          overflow: visible;
        }
        .select-card,
        .choice,
        .review-grid div,
        .next-steps span,
        .photo-item,
        .checkbox-list label,
        .counter-row {
          border: 1px solid rgba(214,168,58,0.25);
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(11,11,13,0.98));
          color: #fff;
          box-shadow: 0 22px 60px rgba(0,0,0,0.28);
        }
        .select-card {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: 126px;
          border-radius: 18px;
          padding: 17px;
          color: #fff;
          overflow: hidden;
          background-repeat: no-repeat !important;
          background-size: cover !important;
          background-position: center !important;
          transform: translateZ(0);
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .select-card::before,
        .select-card::after,
        .choice::before,
        .choice::after {
          content: none !important;
          display: none !important;
        }
        .select-card svg,
        .choice svg,
        .upload-box svg {
          position: relative;
          z-index: 1;
          color: #d6a83a;
          stroke: #d6a83a;
        }
        .select-card span {
          position: relative;
          z-index: 1;
        }
        .select-card.active,
        .choice.active,
        .day.active {
          border-color: rgba(245,184,59,0.72);
          background:
            radial-gradient(circle at 20% 10%, rgba(245,184,59,0.20), transparent 38%),
            linear-gradient(145deg, rgba(24,22,16,0.98), rgba(10,10,10,0.98)) !important;
          background-repeat: no-repeat !important;
          background-size: cover !important;
          background-position: center !important;
          box-shadow: inset 0 0 0 1px rgba(245,184,59,0.38), 0 18px 42px rgba(214,168,58,0.10);
        }
        .stack {
          gap: 16px;
        }
        .choice {
          min-height: 74px;
          border-radius: 18px;
          padding: 20px;
          color: #fff;
          line-height: 1.35;
        }
        .form-grid {
          gap: 16px;
        }
        .form-grid.two {
          gap: 14px;
        }
        .field {
          gap: 9px;
        }
        .field label,
        .review-grid span {
          color: #d6a83a;
          letter-spacing: 0.12em;
        }
        .field input,
        .field textarea {
          min-height: 58px;
          border: 1px solid rgba(214,168,58,0.28);
          border-radius: 18px;
          background: rgba(11,11,13,0.94);
          color: #fff;
          padding: 15px 16px;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
          scroll-margin-bottom: 160px;
        }
        .field input::placeholder,
        .field textarea::placeholder {
          color: rgba(184,184,184,0.55);
        }
        .field input.has-prefix {
          padding-left: 58px;
          color: #fff;
        }
        .field input:focus,
        .field textarea:focus {
          border-color: rgba(245,184,59,0.72);
          box-shadow: 0 0 0 4px rgba(214,168,58,0.12);
        }
        .field textarea {
          min-height: 154px;
        }
        .privacy-note {
          margin-top: 18px;
          border: 1px solid rgba(214,168,58,0.22);
          border-left: 4px solid #d6a83a;
          border-radius: 16px;
          background: rgba(16,16,20,0.88);
          padding: 16px 16px 16px 18px;
          color: #b8b8b8;
          font-size: 14px;
          line-height: 1.55;
        }
        .map-card {
          height: 360px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 24px;
          background:
            linear-gradient(90deg, rgba(214,168,58,0.09) 1px, transparent 1px),
            linear-gradient(rgba(214,168,58,0.09) 1px, transparent 1px),
            radial-gradient(circle at 50% 45%, rgba(214,168,58,0.18), transparent 34%),
            #101014;
          background-size: 44px 44px, 44px 44px, auto, auto;
          box-shadow: 0 28px 80px rgba(0,0,0,0.38);
        }
        .map-pin {
          background: linear-gradient(135deg, #f5d77a, #d6a83a);
          color: #0b0b0d;
        }
        .address-chip {
          border: 1px solid rgba(214,168,58,0.25);
          background: rgba(5,5,5,0.82);
          color: #fff;
          box-shadow: 0 18px 46px rgba(0,0,0,0.35);
        }
        .address-chip svg {
          color: #d6a83a;
        }
        .counter-row {
          min-height: 82px;
          border-radius: 18px;
          border-bottom: 1px solid rgba(214,168,58,0.25);
          padding: 16px;
          margin-bottom: 14px;
        }
        .counter-row button {
          border: 1px solid rgba(214,168,58,0.35);
          background: rgba(214,168,58,0.10);
          color: #d6a83a;
        }
        .checkbox-list {
          gap: 12px;
        }
        .checkbox-list label {
          min-height: 68px;
          border-radius: 18px;
          border-bottom: 1px solid rgba(214,168,58,0.25);
          padding: 16px;
        }
        .checkbox-list input {
          accent-color: #d6a83a;
        }
        .upload-box {
          min-height: 300px;
          border: 1.5px dashed rgba(214,168,58,0.42);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(20,20,20,0.96), rgba(11,11,13,0.96));
          color: #fff;
          box-shadow: 0 26px 80px rgba(0,0,0,0.34);
        }
        .upload-box span,
        .photo-item span,
        .counter-text {
          color: #b8b8b8;
        }
        .photo-item {
          border-radius: 18px;
          padding: 12px;
        }
        .photo-item img {
          background: #141414;
          border: 1px solid rgba(214,168,58,0.18);
        }
        .photo-item span.uploaded {
          color: #75d691;
        }
        .photo-item span.error {
          color: #ff8b86;
        }
        .photo-actions button {
          border: 1px solid rgba(214,168,58,0.25);
          background: rgba(214,168,58,0.08);
          color: #f3f3f3;
        }
        .day-grid {
          gap: 10px;
        }
        .day {
          min-height: 48px;
          border: 1px solid rgba(214,168,58,0.25);
          background: rgba(11,11,13,0.94);
          color: #fff;
        }
        .review-grid {
          gap: 16px;
        }
        .review-grid div,
        .next-steps span {
          border-radius: 18px;
          padding: 18px;
        }
        .review-grid strong {
          color: #fff;
        }
        .review-grid button {
          color: #d6a83a;
        }
        .primary {
          min-height: 58px;
          border-radius: 18px;
          background: linear-gradient(135deg, #f5d77a, #d6a83a 45%, #a77818);
          color: #070707;
          box-shadow: 0 18px 46px rgba(214,168,58,0.22);
        }
        .primary:disabled {
          background: rgba(214,168,58,0.15);
          color: rgba(255,255,255,0.38);
          box-shadow: none;
        }
        .fixed-footer {
          left: 50%;
          right: auto;
          bottom: 0;
          transform: translateX(-50%);
          width: calc(100% - 16px);
          max-width: 430px;
          z-index: 9999;
          padding: 0 16px calc(14px + env(safe-area-inset-bottom));
          background: rgba(5,5,5,0.96);
          border: 1px solid rgba(214,168,58,0.25);
          border-bottom: none;
          border-radius: 22px 22px 0 0;
          overflow: hidden;
          backdrop-filter: blur(16px);
        }
        .progress {
          height: 4px;
          margin: 14px 0 12px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.10);
        }
        .progress span {
          background: linear-gradient(90deg, #d6a83a, #f5d77a);
        }
        .footer-actions {
          max-width: 430px;
          padding: 0;
          gap: 14px;
        }
        .back {
          min-height: 56px;
          border: 1px solid rgba(214,168,58,0.25);
          border-radius: 18px;
          background: rgba(16,16,20,0.88);
          color: #fff;
          padding: 0 18px;
        }
        @media (min-width: 760px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-grid.two {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 390px) {
          .onboarding-shell {
            padding-left: 14px;
            padding-right: 14px;
          }
          .top-actions {
            grid-template-columns: 1fr 1fr;
          }
          .flow-brand {
            grid-column: 1 / -1;
            justify-content: center;
          }
          .card-grid {
            grid-template-columns: 1fr;
          }
          h1 {
            font-size: 31px;
          }
        }
      `}</style>
    </main>
  );
}

function StepTitle({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="step-title">
      <span>Cadastro de local</span>
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
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className={prefix ? "input-prefix-wrap" : undefined}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          className={prefix ? "has-prefix" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          inputMode={prefix ? "decimal" : undefined}
        />
      </div>
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
