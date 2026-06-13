"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import VoucherRouletteModal from "@/components/vouchers/VoucherRouletteModal";
import ProfessionalContactAction from "@/components/professionals/ProfessionalContactAction";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

type MainTab = "acompanhantes" | "imoveis";
type SubTab = "mulheres" | "trans" | "homens";
type QuickFilter = "price" | "online" | "reviews" | "place" | "photos";
type DistanceFilter = "any" | "5" | "10" | "25" | "50";
type SortFilter = "relevance" | "distance" | "online" | "rating" | "price_asc" | "price_desc" | "recent";

type LocationChoice = {
  city: string;
  state: string;
  label: string;
  slug: string;
};

type CardPerfil = {
  id: string;
  slug: string;
  nome: string;
  cidade: string;
  preco: number | null;
  foto: string | null;
  online: boolean;
  avaliacao: number;
  total: number;
  idade: number | null;
  local: string | null;
  attendanceTypes: string[];
  servicos: string[];
  bio: string;
  phone: string | null;
  whatsapp: string | null;
  contactVisibility: "PUBLIC" | "LOGGED_IN" | "PREMIUM";
  contactAvailable: boolean;
  verified: boolean;
  sponsored: boolean;
};

type StoryGroup = {
  userId: string;
  slug: string;
  nome: string;
  foto: string | null;
  stories: Array<{ id: string; mediaUrl: string; mediaType: string; thumbnail: string | null }>;
};

const SUB_TO_CATEGORY: Record<SubTab, string> = {
  mulheres: "MULHER",
  trans: "TRANS",
  homens: "HOMEM",
};

const SUB_LABEL: Record<SubTab, string> = {
  mulheres: "Mulheres",
  trans: "Trans",
  homens: "Homens",
};

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: "price", label: "Até R$300" },
  { id: "online", label: "Online" },
  { id: "reviews", label: "Possui avaliações" },
  { id: "place", label: "Com local" },
  { id: "photos", label: "Fotos" },
];

const DISTANCE_OPTIONS: Array<{ id: DistanceFilter; label: string }> = [
  { id: "any", label: "Qualquer distância" },
  { id: "5", label: "Até 5 km" },
  { id: "10", label: "Até 10 km" },
  { id: "25", label: "Até 25 km" },
  { id: "50", label: "Até 50 km" },
];

const SORT_OPTIONS: Array<{ id: SortFilter; label: string }> = [
  { id: "relevance", label: "Mais relevantes" },
  { id: "distance", label: "Mais próximas" },
  { id: "online", label: "Online agora" },
  { id: "rating", label: "Melhor avaliadas" },
  { id: "price_asc", label: "Menor preço" },
  { id: "price_desc", label: "Maior preço" },
  { id: "recent", label: "Mais recentes" },
];

const SUGGESTED_LOCATIONS: LocationChoice[] = [
  cityChoice("São Paulo", "SP"),
  cityChoice("Rio de Janeiro", "RJ"),
  cityChoice("Brasília", "DF"),
  cityChoice("Belo Horizonte", "MG"),
  cityChoice("Itaúna", "MG"),
  cityChoice("Divinópolis", "MG"),
  cityChoice("Pará de Minas", "MG"),
  cityChoice("Brumadinho", "MG"),
  cityChoice("Igarapé", "MG"),
  cityChoice("Mateus Leme", "MG"),
  cityChoice("Juatuba", "MG"),
  cityChoice("Formiga", "MG"),
  cityChoice("Oliveira", "MG"),
];

function cityChoice(city: string, state: string): LocationChoice {
  return {
    city,
    state,
    label: `${city}, ${state}`,
    slug: `${slugify(city)}-${state.toLowerCase()}`,
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMainTab(value: string | null): value is MainTab {
  return value === "acompanhantes" || value === "imoveis";
}

function isSubTab(value: string | null): value is SubTab {
  return value === "mulheres" || value === "trans" || value === "homens";
}

function isDistance(value: string | null): value is DistanceFilter {
  return value === "any" || value === "5" || value === "10" || value === "25" || value === "50";
}

function isSort(value: string | null): value is SortFilter {
  return value === "relevance" || value === "distance" || value === "online" || value === "rating" || value === "price_asc" || value === "price_desc" || value === "recent";
}

function getMainTab(value: string | null): MainTab {
  return isMainTab(value) ? value : "acompanhantes";
}

function getSubTab(value: string | null): SubTab {
  return isSubTab(value) ? value : "mulheres";
}

function getDistance(value: string | null): DistanceFilter {
  return isDistance(value) ? value : "any";
}

function getSort(value: string | null): SortFilter {
  return isSort(value) ? value : "relevance";
}

function getLocationFromParams(params: URLSearchParams): LocationChoice | null {
  const city = params.get("cidade") ?? params.get("city");
  const state = params.get("estado") ?? params.get("state");
  if (!city || !state) return null;
  return cityChoice(city, state.toUpperCase());
}

function apiSortBy(sortBy: SortFilter) {
  if (sortBy === "price_asc" || sortBy === "price_desc" || sortBy === "recent") return sortBy;
  if (sortBy === "online") return "online";
  if (sortBy === "rating" || sortBy === "relevance" || sortBy === "distance") return "rating";
  return "rating";
}

function BuscarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initialParams = useMemo(() => new URLSearchParams(params.toString()), [params]);

  const [mainTab, setMainTab] = useState<MainTab>(() => getMainTab(initialParams.get("tab")));
  const [subTab, setSubTab] = useState<SubTab>(() => getSubTab(initialParams.get("sub")));
  const [busca, setBusca] = useState(initialParams.get("q") ?? "");
  const [selectedLocation, setSelectedLocation] = useState<LocationChoice | null>(() => getLocationFromParams(initialParams));
  const [virtualOnly, setVirtualOnly] = useState(initialParams.get("virtual") === "1");
  const [distance, setDistance] = useState<DistanceFilter>(() => getDistance(initialParams.get("distance")));
  const [sortBy, setSortBy] = useState<SortFilter>(() => getSort(initialParams.get("sort")));
  const [showFilters, setShowFilters] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDraft, setLocationDraft] = useState<LocationChoice | null>(null);
  const [draftVirtual, setDraftVirtual] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Set<QuickFilter>>(new Set());
  const [perfis, setPerfis] = useState<CardPerfil[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geoAutoAttemptedRef = useRef(false);

  useEffect(() => {
    const nextParams = new URLSearchParams(params.toString());
    const timer = window.setTimeout(() => {
      setMainTab(getMainTab(nextParams.get("tab")));
      setSubTab(getSubTab(nextParams.get("sub")));
      setBusca(nextParams.get("q") ?? "");
      setSelectedLocation(getLocationFromParams(nextParams));
      setVirtualOnly(nextParams.get("virtual") === "1");
      setDistance(getDistance(nextParams.get("distance")));
      setSortBy(getSort(nextParams.get("sort")));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (selectedLocation) {
      query.set("city", selectedLocation.city);
      query.set("state", selectedLocation.state);
    }
    fetch(`/api/stories${query.size ? `?${query}` : ""}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StoryGroup[]) => setStories(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("[buscar] Falha ao carregar stories públicos", err);
          setStories([]);
        }
      });
    return () => controller.abort();
  }, [selectedLocation]);

  useEffect(() => {
    if (mainTab !== "acompanhantes") return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          category: SUB_TO_CATEGORY[subTab],
          sortBy: apiSortBy(sortBy),
          limit: "24",
        });
        if (busca) qs.set("search", busca);
        if (selectedLocation) {
          qs.set("city", selectedLocation.city);
          qs.set("state", selectedLocation.state);
        }
        if (virtualOnly) qs.set("virtual", "1");
        if (filtros.has("price")) qs.set("priceMax", "300");

        const res = await fetch(`/api/professionals?${qs}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Falha ao carregar profissionais: HTTP ${res.status}`);
        const data = await res.json();
        const list: CardPerfil[] = (data.professionals ?? []).map((p: {
          id: string;
          slug: string;
          displayName: string;
          city: string;
          state: string;
          priceMin?: number | null;
          pricePerHour?: number | null;
          image?: string | null;
          rating?: number;
          totalReviews?: number;
          age?: number | null;
          boostActive?: boolean;
          boostUntil?: string | null;
          attendanceTypes?: string[];
          specialties?: Array<{ name: string }>;
          services?: string[];
          bio?: string;
          photos?: Array<{ url: string }>;
          phone?: string | null;
          whatsapp?: string | null;
          contactVisibility?: "PUBLIC" | "LOGGED_IN" | "PREMIUM";
          contactAvailable?: boolean;
          online?: boolean;
          verified?: boolean;
          sponsored?: boolean;
        }) => ({
          id: p.id,
          slug: p.slug,
          nome: p.displayName,
          cidade: `${p.city}, ${p.state}`,
          preco: p.priceMin ?? p.pricePerHour ?? null,
          foto: p.image ?? p.photos?.[0]?.url ?? null,
          online: Boolean(p.online),
          avaliacao: p.rating ?? 0,
          total: p.totalReviews ?? 0,
          idade: p.age ?? null,
          local: p.attendanceTypes?.[0] ?? null,
          attendanceTypes: p.attendanceTypes ?? [],
          servicos: Array.from(new Set([...(p.services ?? []), ...(p.specialties ?? []).map((s) => s.name)])),
          bio: p.bio ?? "",
          phone: p.phone ?? null,
          whatsapp: p.whatsapp ?? null,
          contactVisibility: p.contactVisibility ?? "PUBLIC",
          contactAvailable: Boolean(p.contactAvailable),
          verified: Boolean(p.verified),
          sponsored: Boolean(p.sponsored),
        }));
        setPerfis(list);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("[buscar] Erro técnico ao carregar perfis", err);
          setPerfis([]);
          setError("Não foi possível carregar os perfis agora.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [busca, filtros, mainTab, selectedLocation, sortBy, subTab, virtualOnly]);

  function replaceQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    const query = next.toString();
    router.replace(query ? `/buscar?${query}` : "/buscar", { scroll: false });
  }

  function setTab(next: MainTab) {
    setMainTab(next);
    replaceQuery({ tab: next === "acompanhantes" ? null : next });
  }

  function setCategory(next: SubTab) {
    setSubTab(next);
    replaceQuery({ sub: next === "mulheres" ? null : next });
  }

  function applyKeywordSearch() {
    replaceQuery({ q: busca.trim() || null });
  }

  function toggleFiltro(filter: QuickFilter) {
    setFiltros((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  function updateDistance(next: DistanceFilter) {
    setDistance(next);
    replaceQuery({ distance: next === "any" ? null : next });
  }

  function updateSort(next: SortFilter) {
    setSortBy(next);
    replaceQuery({ sort: next === "relevance" ? null : next });
  }

  function openLocationModal() {
    setLocationDraft(selectedLocation);
    setDraftVirtual(virtualOnly);
    setLocationSearch("");
    setGeoMessage(null);
    setShowLocationModal(true);
  }

  function applyLocationChoice() {
    if (!locationDraft && !draftVirtual) return;
    setSelectedLocation(draftVirtual ? null : locationDraft);
    setVirtualOnly(draftVirtual);
    setShowLocationModal(false);
    replaceQuery({
      cidade: draftVirtual ? null : locationDraft?.city ?? null,
      estado: draftVirtual ? null : locationDraft?.state.toLowerCase() ?? null,
      virtual: draftVirtual ? "1" : null,
    });
  }

  function selectCity(city: LocationChoice) {
    setLocationDraft(city);
    setDraftVirtual(false);
  }

  function selectVirtual() {
    setLocationDraft(null);
    setDraftVirtual(true);
  }

  function useApproximateLocation() {
    setGeoMessage(null);
    if (!("geolocation" in navigator)) {
      setGeoMessage("Seu navegador não liberou localização. Escolha uma cidade na lista.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => void resolveCoordinates(position, false),
      () => {
        setGeoLoading(false);
        setGeoMessage("Não foi possível acessar sua localização. Você pode buscar por cidade.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 },
    );
  }

  async function resolveCoordinates(position: GeolocationPosition, applyImmediately: boolean) {
    try {
      const latlng = `${position.coords.latitude},${position.coords.longitude}`;
      const response = await fetch(`/api/address/geocode?latlng=${encodeURIComponent(latlng)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.city) throw new Error("city_not_found");
      const choice = cityChoice(data.city, String(data.state ?? "").toUpperCase());
      setLocationDraft(choice);
      setDraftVirtual(false);
      setGeoMessage(`Localização detectada: ${choice.label}.`);
      if (applyImmediately) {
        setSelectedLocation(choice);
        replaceQuery({
          cidade: choice.city,
          estado: choice.state.toLowerCase(),
          virtual: null,
        });
      }
    } catch {
      setGeoMessage("Localização autorizada, mas não foi possível identificar a cidade. Escolha manualmente.");
    } finally {
      setGeoLoading(false);
    }
  }

  useEffect(() => {
    if (geoAutoAttemptedRef.current || selectedLocation || virtualOnly || !("geolocation" in navigator)) return;
    geoAutoAttemptedRef.current = true;
    if (!navigator.permissions) return;
    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (permission.state !== "granted") return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = `${position.coords.latitude},${position.coords.longitude}`;
          void fetch(`/api/address/geocode?latlng=${encodeURIComponent(latlng)}`)
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
              if (!data?.city) return;
              const choice = cityChoice(data.city, String(data.state ?? "").toUpperCase());
              setSelectedLocation(choice);
              const next = new URLSearchParams(params.toString());
              next.set("cidade", choice.city);
              next.set("estado", choice.state.toLowerCase());
              next.delete("virtual");
              router.replace(`/buscar?${next.toString()}`, { scroll: false });
            })
            .catch(() => undefined);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 15 * 60 * 1000 },
      );
    }).catch(() => undefined);
  }, [params, router, selectedLocation, virtualOnly]);

  function clearSearch() {
    setBusca("");
    setFiltros(new Set());
    setSelectedLocation(null);
    setVirtualOnly(false);
    setDistance("any");
    setSortBy("relevance");
    setSubTab("mulheres");
    router.replace("/buscar", { scroll: false });
  }

  const filteredLocations = useMemo(() => {
    const query = slugify(locationSearch.trim());
    if (!query) return SUGGESTED_LOCATIONS;
    return SUGGESTED_LOCATIONS.filter((item) => slugify(item.label).includes(query));
  }, [locationSearch]);

  const lista = useMemo(() => perfis.filter((a) => {
    if (filtros.has("online") && !a.online) return false;
    if (filtros.has("reviews") && a.total === 0) return false;
    if (filtros.has("place") && !a.attendanceTypes.some((s) => s.toLowerCase().includes("local"))) return false;
    if (filtros.has("price") && (a.preco ?? 0) > 300) return false;
    if (filtros.has("photos") && !a.foto) return false;
    return true;
  }), [filtros, perfis]);

  const locationLabel = virtualOnly ? "Atendimento virtual" : selectedLocation?.label;
  const dynamicTitle = virtualOnly
    ? `Encontre acompanhantes ${SUB_LABEL[subTab]} em atendimento virtual`
    : selectedLocation
      ? `Encontre acompanhantes ${SUB_LABEL[subTab]} em ${selectedLocation.label}`
      : `Encontre acompanhantes ${SUB_LABEL[subTab]}`;
  const emptyContext = virtualOnly ? "atendimento virtual" : selectedLocation?.label;

  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "#f4f1ea" }}>
      <style>{`
        .perfil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .perfil-card { border-radius: 8px; overflow: hidden; background: #111; border: 1px solid #2a2620; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; cursor: pointer; box-shadow: 0 18px 48px rgba(0,0,0,0.28); contain: layout paint; }
        .perfil-card:hover { transform: translateY(-3px); border-color: rgba(212,168,67,0.3); box-shadow: 0 24px 72px rgba(0,0,0,0.36); }
        .perfil-card:active { transform: translateY(1px) scale(0.995); }
        .perfil-foto { position: relative; padding-top: 130%; }
        .perfil-info { padding: 14px 16px; }
        .search-shell { background: #0a0a0a; border-bottom: 1px solid ${GOLD_DIM}; }
        .top-search-grid { display: grid; grid-template-columns: auto minmax(0, 1fr) 42px; gap: 8px; align-items: center; }
        .location-bar {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 12px 0 0;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid ${GOLD_MID};
          background: linear-gradient(135deg, rgba(212,168,67,0.09), rgba(255,255,255,0.025)), #0b0b0b;
          color: #f4f1ea;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 18px 44px rgba(0,0,0,0.24);
        }
        .location-bar span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stories-strip { display: flex; gap: 12px; overflow-x: auto; padding: 2px 0 18px; margin-bottom: 6px; -webkit-overflow-scrolling: touch; }
        .stories-strip::-webkit-scrollbar, .filtros-scroll::-webkit-scrollbar, .action-scroll::-webkit-scrollbar { display: none; }
        .story-item { width: 72px; flex: 0 0 auto; color: #d9d1c3; text-align: center; text-decoration: none; }
        .story-avatar { width: 64px; height: 64px; margin: 0 auto 7px; border-radius: 999px; padding: 2px; background: linear-gradient(135deg, #f6d979, #d4a843, #6f4b10); position: relative; }
        .story-avatar-inner { position: relative; width: 100%; height: 100%; border-radius: 999px; overflow: hidden; background: #151515; border: 2px solid #050505; }
        .dynamic-title { margin: 0 0 16px; max-width: 920px; color: #f4f1ea; font-family: ${PLAYFAIR}; font-size: clamp(1.75rem, 5vw, 3.7rem); line-height: 1.02; letter-spacing: 0; }
        .dynamic-title strong { color: ${GOLD}; font-weight: 900; }
        .filtros-scroll, .action-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; align-items: center; -webkit-overflow-scrolling: touch; }
        .filter-chip {
          min-height: 36px;
          padding: 0 14px;
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 999px;
          color: #7d8795;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .filter-chip.active { background: rgba(212,168,67,0.15); border-color: ${GOLD}; color: #f1f5f9; font-weight: 800; }
        .action-select {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid ${GOLD_MID};
          background: #0b0f18;
          color: #d8d1c7;
          padding: 0 12px;
          font-size: 12px;
          outline: none;
          flex: 0 0 auto;
        }
        .location-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0,0,0,0.72);
          padding: 16px;
        }
        .location-modal {
          width: 100%;
          max-width: 560px;
          max-height: min(720px, 92vh);
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid ${GOLD_MID};
          background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(8,8,8,0.98));
          box-shadow: 0 22px 58px rgba(0,0,0,0.54);
        }
        .location-list { max-height: 280px; overflow-y: auto; padding: 4px 18px 0; }
        .location-option {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid rgba(212,168,67,0.12);
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
          color: #f4f1ea;
          padding: 0 14px;
          margin-bottom: 8px;
          cursor: pointer;
          text-align: left;
        }
        .location-option.active { border-color: ${GOLD}; background: rgba(212,168,67,0.12); }
        .profiles-empty, .rooms-coming-soon {
          min-height: 330px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 18px;
          background: radial-gradient(circle at 50% 0%, rgba(212,168,67,0.10), transparent 42%), linear-gradient(145deg, rgba(255,255,255,0.035), rgba(212,168,67,0.025)), #080808;
          padding: 42px 22px;
          margin-top: 18px;
        }
        .rooms-coming-soon { min-height: 420px; }
        .profiles-empty-inner, .rooms-coming-soon-inner { max-width: 620px; }
        .empty-kicker, .soon-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border: 1px solid rgba(212,168,67,0.26);
          border-radius: 999px;
          color: ${GOLD};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(212,168,67,0.08);
        }
        .profiles-empty h2, .rooms-coming-soon h2 {
          margin: 16px 0 10px;
          color: #f4f1ea;
          font-family: ${PLAYFAIR};
          font-size: clamp(1.9rem, 6vw, 3.5rem);
          line-height: 0.98;
          letter-spacing: 0;
        }
        .profiles-empty p, .rooms-coming-soon p {
          margin: 0 auto;
          max-width: 520px;
          color: #a9a297;
          font-size: 14px;
          line-height: 1.7;
        }
        .profiles-empty-actions, .coming-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 22px;
        }
        .profiles-empty-actions button, .profiles-empty-actions a, .coming-actions a {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
        }
        .profiles-empty-actions button, .coming-actions .primary {
          border: 1px solid transparent;
          background: linear-gradient(135deg, #f6d979, #d4a843 50%, #a57920);
          color: #080704;
        }
        .profiles-empty-actions a, .coming-actions .secondary {
          border: 1px solid rgba(212,168,67,0.22);
          background: rgba(255,255,255,0.035);
          color: #f4f1ea;
        }
        @media (max-width: 640px) {
          .search-shell { margin-top: 18px; }
          .top-search-grid { grid-template-columns: 1fr 42px; }
          .type-toggle { grid-column: 1 / -1; width: 100%; }
          .type-toggle button { flex: 1; }
          .perfil-grid { grid-template-columns: 1fr; gap: 14px; }
          .perfil-foto { padding-top: 0; width: 100%; height: 320px; flex-shrink: 0; }
          .perfil-info { padding: 16px 18px; }
          .dynamic-title { font-size: 1.85rem; }
          .location-modal-backdrop { padding: 0; align-items: flex-end; }
          .location-modal { border-radius: 18px 18px 0 0; max-height: 90vh; }
          .profiles-empty, .rooms-coming-soon { min-height: 300px; border-radius: 14px; padding: 36px 18px; }
          .profiles-empty-actions, .coming-actions { flex-direction: column; }
          .profiles-empty-actions button, .profiles-empty-actions a, .coming-actions a { width: 100%; }
        }
      `}</style>

      {showFilters && <FiltersModal onClose={() => setShowFilters(false)} onApply={() => setShowFilters(false)} />}
      {showLocationModal && (
        <LocationModal
          draft={locationDraft}
          draftVirtual={draftVirtual}
          geoLoading={geoLoading}
          geoMessage={geoMessage}
          locationSearch={locationSearch}
          locations={filteredLocations}
          onApply={applyLocationChoice}
          onClose={() => setShowLocationModal(false)}
          onGeo={useApproximateLocation}
          onSearch={setLocationSearch}
          onSelectCity={selectCity}
          onSelectVirtual={selectVirtual}
        />
      )}

      <Navbar />

      <div className="search-shell">
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(212,168,67,0.3), transparent)` }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px 14px" }}>
          <div className="top-search-grid">
            <div className="type-toggle" style={{ display: "flex", gap: 0, background: "#111", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              {([["acompanhantes", "Acompanhantes"], ["imoveis", "Quartos"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setTab(tab)}
                  style={{ padding: "9px 16px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mainTab === tab ? GOLD : "transparent", color: mainTab === tab ? "#080704" : "#8d8578", transition: "all 0.2s", fontFamily: PLAYFAIR }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              <SearchIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyKeywordSearch();
                }}
                placeholder={mainTab === "acompanhantes" ? "Nome, serviço ou especialidade..." : "Cidade, bairro ou estrutura..."}
                style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#111", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, color: "#f4f1ea", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                onFocus={(event) => ((event.target as HTMLElement).style.borderColor = GOLD)}
                onBlur={(event) => ((event.target as HTMLElement).style.borderColor = GOLD_DIM)}
              />
            </div>

            <button
              type="button"
              aria-label="Buscar"
              onClick={applyKeywordSearch}
              style={{ width: 42, height: 42, borderRadius: "50%", background: GOLD, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <SearchIcon color="#080704" size={17} strokeWidth={2.5} />
            </button>
          </div>

          <button type="button" className="location-bar" onClick={openLocationModal}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <LocationIcon />
              <span>
                {locationLabel ? (
                  <>
                    <small style={{ display: "block", color: "#8d8578", fontSize: 11, lineHeight: 1.2 }}>Localização da busca</small>
                    <strong style={{ fontSize: 15 }}>{locationLabel}</strong>
                  </>
                ) : (
                  <strong style={{ fontSize: 15 }}>Buscar por cidade</strong>
                )}
              </span>
            </span>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Alterar</span>
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 56px" }}>
        {mainTab === "acompanhantes" && (
          <>
            {stories.length > 0 && <StoriesStrip stories={stories} />}

            <h1 className="dynamic-title">
              {virtualOnly ? (
                <>Encontre acompanhantes {SUB_LABEL[subTab]} em <strong>atendimento virtual</strong></>
              ) : selectedLocation ? (
                <>Encontre acompanhantes {SUB_LABEL[subTab]} em <strong>{selectedLocation.label}</strong></>
              ) : (
                dynamicTitle
              )}
            </h1>

            <div style={{ display: "flex", marginBottom: 16, borderBottom: `1px solid ${GOLD_DIM}`, overflowX: "auto" }}>
              {([["mulheres", "Mulheres"], ["trans", "Trans"], ["homens", "Homens"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setCategory(tab)}
                  style={{ padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#f1f5f9" : "#64748b", borderBottom: `2px solid ${subTab === tab ? GOLD : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="filtros-scroll" style={{ marginBottom: 10 }}>
              {QUICK_FILTERS.map((filter) => {
                const active = filtros.has(filter.id);
                return (
                  <button key={filter.id} type="button" onClick={() => toggleFiltro(filter.id)} className={`filter-chip ${active ? "active" : ""}`}>
                    {filter.id === "online" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: active ? "#22c55e" : "#334155", marginRight: 6, verticalAlign: "middle" }} />}
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="action-scroll" style={{ marginBottom: 20 }}>
              <button type="button" onClick={() => setShowFilters(true)} className="filter-chip active">
                Filtros
              </button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#756f66", fontSize: 12, flex: "0 0 auto" }}>
                Distância
                <select className="action-select" value={distance} onChange={(event) => updateDistance(event.target.value as DistanceFilter)}>
                  {DISTANCE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#756f66", fontSize: 12, flex: "0 0 auto" }}>
                Ordenar
                <select className="action-select" value={sortBy} onChange={(event) => updateSort(event.target.value as SortFilter)}>
                  {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
              {loading ? "Buscando..." : `${lista.length} perfil${lista.length !== 1 ? "is" : ""} encontrado${lista.length !== 1 ? "s" : ""}`}
            </p>

            {loading ? <BuscarProfilesSkeleton /> : null}

            {!loading && error ? (
              <div className="profiles-empty">
                <div className="profiles-empty-inner">
                  <span className="empty-kicker">Instabilidade temporária</span>
                  <h2>Não conseguimos atualizar os perfis.</h2>
                  <p>{error}</p>
                </div>
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="perfil-grid">
                {lista.map((profile) => (
                  <ProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            ) : null}

            {!loading && !error && lista.length === 0 && (
              <div className="profiles-empty">
                <div className="profiles-empty-inner">
                  <span className="empty-kicker">Curadoria em andamento</span>
                  <h2>Perfis premium em breve.</h2>
                  <p>
                    {emptyContext
                      ? `Estamos liberando apenas profissionais verificadas em ${emptyContext}. Novas presenças entram no ar assim que a curadoria for concluída.`
                      : "Estamos liberando apenas profissionais verificadas e alinhadas ao padrão Elite Modell. Novas presenças entram no ar assim que a curadoria for concluída."}
                  </p>
                  <div className="profiles-empty-actions">
                    <button type="button" onClick={clearSearch}>Limpar busca</button>
                    <Link href={`${ACCOUNT_ROUTES.cadastro}?tipo=acompanhante`}>Ativar perfil profissional</Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {mainTab === "imoveis" && (
          <section className="rooms-coming-soon" aria-labelledby="rooms-coming-title">
            <div className="rooms-coming-soon-inner">
              <span className="soon-kicker">Ambientes reservados</span>
              <h2 id="rooms-coming-title">Quartos discretos em breve.</h2>
              <p>
                Estamos selecionando os primeiros espaços profissionais da Elite Modell.
                As listagens públicas só entram no ar depois de curadoria e aprovação.
              </p>
              <div className="coming-actions">
                <Link className="primary" href={ACCOUNT_ROUTES.onboardingAnfitriao}>Cadastrar para anunciar</Link>
                <Link className="secondary" href={ACCOUNT_ROUTES.login}>Já sou anfitrião</Link>
              </div>
            </div>
          </section>
        )}
      </div>

      <VoucherRouletteModal
        key={params.get("demonstrarRoleta") === "1" ? "roulette-demo" : "roulette-live"}
        demoMode={params.get("demonstrarRoleta") === "1"}
      />
      <Footer />
    </div>
  );
}

function LocationModal({
  draft,
  draftVirtual,
  geoLoading,
  geoMessage,
  locationSearch,
  locations,
  onApply,
  onClose,
  onGeo,
  onSearch,
  onSelectCity,
  onSelectVirtual,
}: {
  draft: LocationChoice | null;
  draftVirtual: boolean;
  geoLoading: boolean;
  geoMessage: string | null;
  locationSearch: string;
  locations: LocationChoice[];
  onApply: () => void;
  onClose: () => void;
  onGeo: () => void;
  onSearch: (value: string) => void;
  onSelectCity: (city: LocationChoice) => void;
  onSelectVirtual: () => void;
}) {
  return (
    <div className="location-modal-backdrop" role="dialog" aria-modal="true" aria-label="Selecionar localização">
      <div className="location-modal">
        <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${GOLD_DIM}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div>
              <p style={{ margin: "0 0 4px", color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Localização</p>
              <h2 style={{ margin: 0, color: "#f4f1ea", fontFamily: PLAYFAIR, fontSize: 24, lineHeight: 1 }}>Onde deseja buscar?</h2>
            </div>
            <button type="button" onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${GOLD_DIM}`, background: "rgba(255,255,255,0.03)", color: "#f4f1ea", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ position: "relative" }}>
            <SearchIcon style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={locationSearch}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Digite cidade, bairro ou região"
              style={{ width: "100%", minHeight: 48, borderRadius: 12, border: `1px solid ${GOLD_MID}`, background: "#090909", color: "#f4f1ea", padding: "0 14px 0 38px", outline: "none", fontSize: 15 }}
            />
          </div>
        </div>

        <div style={{ padding: "14px 18px 8px" }}>
          <button type="button" className="location-option" onClick={onGeo} style={{ marginBottom: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <LocationIcon />
              {geoLoading ? "Solicitando permissão..." : "Usar minha localização aproximada"}
            </span>
            <span style={{ color: GOLD }}>↗</span>
          </button>
          {geoMessage && <p style={{ margin: "0 0 10px", color: "#9b948a", fontSize: 12, lineHeight: 1.5 }}>{geoMessage}</p>}
          <button type="button" className={`location-option ${draftVirtual ? "active" : ""}`} onClick={onSelectVirtual}>
            <span>Atendimento virtual</span>
            {draftVirtual && <span style={{ color: GOLD, fontWeight: 900 }}>Selecionado</span>}
          </button>
        </div>

        <div className="location-list">
          {locations.map((city) => {
            const active = draft?.slug === city.slug && !draftVirtual;
            return (
              <button key={city.slug} type="button" className={`location-option ${active ? "active" : ""}`} onClick={() => onSelectCity(city)}>
                <span>{city.label}</span>
                {active && <span style={{ color: GOLD, fontWeight: 900 }}>Selecionada</span>}
              </button>
            );
          })}
          {locations.length === 0 && <p style={{ color: "#9b948a", fontSize: 13 }}>Nenhuma cidade sugerida encontrada. Tente outra busca.</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, padding: "14px 18px 18px", borderTop: `1px solid ${GOLD_DIM}` }}>
          <button type="button" onClick={onClose} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${GOLD_MID}`, background: "transparent", color: "#f4f1ea", fontWeight: 800, cursor: "pointer" }}>Fechar</button>
          <button
            type="button"
            onClick={onApply}
            disabled={!draft && !draftVirtual}
            style={{ minHeight: 46, borderRadius: 999, border: "none", background: !draft && !draftVirtual ? "#40392c" : `linear-gradient(135deg, #f6d979, ${GOLD} 52%, #a57920)`, color: "#080704", fontWeight: 900, cursor: !draft && !draftVirtual ? "not-allowed" : "pointer" }}
          >
            Buscar acompanhantes
          </button>
        </div>
      </div>
    </div>
  );
}

function StoriesStrip({ stories }: { stories: StoryGroup[] }) {
  return (
    <div className="stories-strip" aria-label="Destaques">
      {stories.map((story) => (
        <Link key={story.userId} href={`/profissionais/${story.slug}`} className="story-item">
          <div className="story-avatar">
            <div className="story-avatar-inner">
              <Image
                src={story.foto ?? story.stories[0]?.thumbnail ?? story.stories[0]?.mediaUrl ?? "/android-chrome-512x512.png"}
                alt={story.nome}
                fill
                sizes="64px"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{story.nome}</span>
        </Link>
      ))}
    </div>
  );
}

function ProfileCard({ profile }: { profile: CardPerfil }) {
  return (
    <div className="perfil-card">
      {/*
        O <Link> cobre apenas foto + info para evitar <a> aninhado com o botão WhatsApp.
        O botão de WhatsApp é um <a> irmão, fora do <Link>.
      */}
      <Link href={`/profissionais/${profile.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <div className="perfil-foto" style={{ background: "#1a2a40", position: "relative" }}>
          <Image
            src={profile.foto ?? "/android-chrome-512x512.png"}
            alt={profile.nome}
            fill
            sizes="(max-width: 640px) 100vw, 260px"
            quality={70}
            style={{ objectFit: "cover" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,14,27,0.92) 0%, rgba(6,14,27,0.2) 50%, transparent 100%)" }} />
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {profile.sponsored && <span style={{ padding: "4px 8px", borderRadius: 999, background: GOLD, color: "#080704", fontSize: 9, fontWeight: 900 }}>Patrocinado</span>}
            {profile.verified && <span style={{ padding: "4px 8px", borderRadius: 999, background: "rgba(5,5,5,.76)", border: `1px solid ${GOLD_MID}`, color: GOLD, fontSize: 9, fontWeight: 900 }}>Verificada</span>}
          </div>
        </div>

        <div className="perfil-info">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: profile.online ? "#22c55e" : "#475569", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: profile.online ? "#22c55e" : "#64748b", fontWeight: 600 }}>{profile.online ? "Online agora" : "Offline"}</span>
            </div>
            <span style={{ fontSize: 14, color: GOLD, fontWeight: 800, fontFamily: PLAYFAIR }}>
              {profile.preco ? `R$${profile.preco}/h` : "Consultar"}
            </span>
          </div>

          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 18, color: "#f1f5f9", fontFamily: PLAYFAIR, lineHeight: 1.2 }}>{profile.nome}</p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
            <LocationIcon size={11} color="#64748b" />
            {profile.cidade}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{profile.bio}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ color: "#f59e0b", fontSize: 13 }}>★</span>
            <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>{profile.avaliacao}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>({profile.total} avaliações)</span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {profile.idade && (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", color: "#64748b", padding: "3px 8px", borderRadius: 8 }}>{profile.idade} anos</span>
            )}
            {profile.local && (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", color: "#64748b", padding: "3px 8px", borderRadius: 8 }}>{profile.local}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: profile.contactAvailable ? 10 : 0 }}>
            {profile.servicos.slice(0, 3).map((service) => (
              <span key={service} style={{ fontSize: 10, background: GOLD_DIM, border: "1px solid rgba(212,168,67,0.15)", color: "#94a3b8", padding: "3px 8px", borderRadius: 10 }}>{service}</span>
            ))}
          </div>

          {!profile.contactAvailable && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GOLD, fontSize: 12, fontWeight: 700, fontFamily: PLAYFAIR }}>
              Ver perfil <span aria-hidden="true">→</span>
            </div>
          )}
        </div>
      </Link>

      {/* Ação de contato fica fora do Link para não criar elementos interativos aninhados. */}
      {profile.contactAvailable && (
        <div style={{ padding: "0 16px 14px" }}>
          <ProfessionalContactAction
            slug={profile.slug}
            visibility={profile.contactVisibility}
            initialWhatsapp={profile.whatsapp}
            initialPhone={profile.phone}
            contactAvailable={profile.contactAvailable}
            returnTo={`/profissionais/${profile.slug}`}
            compact
          />
        </div>
      )}
    </div>
  );
}

function SearchIcon({ color = "#615b52", size = 14, strokeWidth = 2, style }: { color?: string; size?: number; strokeWidth?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} style={style}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LocationIcon({ color = GOLD, size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BuscarProfilesSkeleton() {
  return (
    <div className="perfil-grid premium-enter">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="premium-card" style={{ borderRadius: 8, overflow: "hidden" }}>
          <div className="premium-skeleton" style={{ height: 300 }} />
          <div style={{ padding: "14px 16px" }}>
            <div className="premium-skeleton" style={{ height: 16, width: "48%", borderRadius: 999 }} />
            <div className="premium-skeleton" style={{ height: 24, width: "62%", borderRadius: 8, marginTop: 10 }} />
            <div className="premium-skeleton" style={{ height: 12, width: "70%", borderRadius: 999, marginTop: 10 }} />
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <div className="premium-skeleton" style={{ height: 22, width: 76, borderRadius: 999 }} />
              <div className="premium-skeleton" style={{ height: 22, width: 62, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BuscarPage() {
  return (
    <Suspense>
      <BuscarContent />
    </Suspense>
  );
}
