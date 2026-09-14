"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FiltersModal from "@/components/FiltersModal";
import ProfessionalContactAction from "@/components/professionals/ProfessionalContactAction";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import {
  canonicalizeBrazilianLocation,
  SUPPORTED_PUBLIC_LOCATIONS,
} from "@/lib/brazilian-location";

const GOLD = "#CA4651";
const GOLD_DIM = "rgba(202,70,81,0.12)";
const GOLD_MID = "rgba(202,70,81,0.28)";
const PLAYFAIR = "var(--font-playfair), serif";

type MainTab = "acompanhantes";
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

const SUGGESTED_LOCATIONS: LocationChoice[] = SUPPORTED_PUBLIC_LOCATIONS.map(
  (location) => cityChoice(location.city, location.state),
);

function cityChoice(city: string, state: string): LocationChoice {
  const canonical = canonicalizeBrazilianLocation(city, state) ?? {
    city: city.trim(),
    state: state.trim().toUpperCase(),
  };
  return {
    city: canonical.city,
    state: canonical.state,
    label: `${canonical.city}, ${canonical.state}`,
    slug: `${slugify(canonical.city)}-${canonical.state.toLowerCase()}`,
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
  return value === "acompanhantes";
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
  const [showLocationModal, setShowLocationModal] = useState(
    initialParams.get("selecionarCidade") === "1" &&
    !getLocationFromParams(initialParams) &&
    initialParams.get("virtual") !== "1",
  );
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
  const locationSelectionRequired =
    params.get("selecionarCidade") === "1" &&
    !selectedLocation &&
    !virtualOnly;

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
      if (
        nextParams.get("selecionarCidade") === "1" &&
        !getLocationFromParams(nextParams) &&
        nextParams.get("virtual") !== "1"
      ) {
        setShowLocationModal(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    if (locationSelectionRequired) return;
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
  }, [locationSelectionRequired, selectedLocation]);

  useEffect(() => {
    if (mainTab !== "acompanhantes") return;
    if (locationSelectionRequired) return;

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
  }, [busca, filtros, locationSelectionRequired, mainTab, selectedLocation, sortBy, subTab, virtualOnly]);

  function replaceQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    const query = next.toString();
    router.replace(query ? `/buscar?${query}` : "/buscar", { scroll: false });
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
      selecionarCidade: null,
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
              next.delete("selecionarCidade");
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
    <div className="public-search-page" style={{ background: "#f7f7fa", minHeight: "100vh", color: "#17141d" }}>
      <style>{`
        .perfil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .perfil-card { border-radius: 16px; overflow: hidden; background: #fff; border: 1px solid #e7e2ec; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; cursor: pointer; box-shadow: 0 10px 30px rgba(47,28,68,.07); contain: layout paint; }
        .perfil-card:hover { transform: translateY(-3px); border-color: rgba(124,34,238,.3); box-shadow: 0 16px 40px rgba(47,28,68,.11); }
        .perfil-card:active { transform: translateY(1px) scale(0.995); }
        .perfil-foto { position: relative; padding-top: 130%; }
        .perfil-info { padding: 14px 16px; }
        .search-shell { background: #fff; border-bottom: 1px solid #e7e2ec; }
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
          background: #fff;
          color: #17141d;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 8px 24px rgba(47,28,68,.06);
        }
        .location-bar span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stories-strip { display: flex; gap: 12px; overflow-x: auto; padding: 2px 0 18px; margin-bottom: 6px; -webkit-overflow-scrolling: touch; }
        .stories-strip::-webkit-scrollbar, .filtros-scroll::-webkit-scrollbar, .action-scroll::-webkit-scrollbar { display: none; }
        .story-item { width: 72px; flex: 0 0 auto; color: #514b59; text-align: center; text-decoration: none; }
        .story-avatar { width: 64px; height: 64px; margin: 0 auto 7px; border-radius: 999px; padding: 2px; background: linear-gradient(135deg, #e1a6ff, #b72cff, #6900a3); position: relative; }
        .story-avatar-inner { position: relative; width: 100%; height: 100%; border-radius: 999px; overflow: hidden; background: #f0ecf3; border: 2px solid #fff; }
        .dynamic-title { margin: 0 0 16px; max-width: 920px; color: #17141d; font-family: var(--font-inter), Inter, sans-serif; font-size: clamp(1.75rem, 5vw, 3.7rem); line-height: 1.08; letter-spacing: -.03em; }
        .dynamic-title strong { color: ${GOLD}; font-weight: 900; }
        .filtros-scroll, .action-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; align-items: center; -webkit-overflow-scrolling: touch; }
        .filter-chip {
          min-height: 36px;
          padding: 0 14px;
          background: #fff;
          border: 1px solid #e4ddea;
          border-radius: 999px;
          color: #62687a;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .filter-chip.active { background: #f4edff; border-color: ${GOLD}; color: #6518cf; font-weight: 800; }
        .action-select {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid ${GOLD_MID};
          background: #fff;
          color: #514b59;
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
          background: rgba(35,24,29,0.48);
          backdrop-filter: blur(4px);
          padding: 16px;
        }
        .location-modal {
          width: 100%;
          max-width: 560px;
          max-height: min(720px, 92vh);
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: #fff;
          box-shadow: 0 22px 58px rgba(47,28,68,.16);
        }
        .location-list { max-height: 280px; overflow-y: auto; padding: 4px 18px 0; }
        .location-option {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          color: #17141d;
          padding: 0 14px;
          margin-bottom: 8px;
          cursor: pointer;
          text-align: left;
        }
        .location-option:hover { border-color: #ddb8bd; background: var(--surface-soft); }
        .location-option.active { border-color: var(--primary); background: var(--primary-soft); color: var(--text-primary); }
        .location-modal-header { padding: 18px 18px 14px; border-bottom: 1px solid var(--border); }
        .location-modal-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .location-modal-kicker { margin: 0 0 4px; color: var(--primary); font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
        .location-modal-title { margin: 0; color: var(--text-primary); font-family: ${PLAYFAIR}; font-size: 24px; line-height: 1.12; }
        .location-modal-close { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: #fff; color: var(--text-primary); font-size: 22px; cursor: pointer; }
        .location-modal-search { position: relative; }
        .location-modal-search input { width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid var(--border-strong); background: #fff; color: var(--text-primary); padding: 0 14px 0 38px; outline: none; font-size: 15px; }
        .location-modal-search input::placeholder { color: #756f78; opacity: 1; }
        .location-modal-search input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
        .location-modal-message { margin: 0 0 10px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
        .location-modal-empty { color: var(--text-secondary); font-size: 13px; }
        .location-modal-footer { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; padding: 14px 18px 18px; border-top: 1px solid var(--border); }
        .location-modal-secondary, .location-modal-primary { min-height: 46px; border-radius: 999px; font-weight: 800; cursor: pointer; }
        .location-modal-secondary { border: 1px solid #ddb8bd; background: #fff; color: var(--primary); }
        .location-modal-primary { border: 1px solid var(--primary); background: var(--primary); color: var(--text-on-primary); font-weight: 900; }
        .location-modal-primary:disabled { border-color: #dfc9cc; background: #eadde0; color: #6c6266; cursor: not-allowed; opacity: 1; }
        .profiles-empty, .rooms-coming-soon {
          min-height: 330px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 1px solid rgba(183,44,255,0.16);
          border-radius: 18px;
          background: #fff;
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
          border: 1px solid rgba(183,44,255,0.26);
          border-radius: 999px;
          color: ${GOLD};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(183,44,255,0.08);
        }
        .profiles-empty h2, .rooms-coming-soon h2 {
          margin: 16px 0 10px;
          color: #17141d;
          font-family: var(--font-inter), Inter, sans-serif;
          font-size: clamp(1.9rem, 6vw, 3.5rem);
          line-height: 0.98;
          letter-spacing: 0;
        }
        .profiles-empty p, .rooms-coming-soon p {
          margin: 0 auto;
          max-width: 520px;
          color: #686d7d;
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
          background: linear-gradient(135deg, #e1a6ff, #b72cff 50%, #6900a3);
          color: #fff;
        }
        .profiles-empty-actions a, .coming-actions .secondary {
          border: 1px solid rgba(183,44,255,0.22);
          background: #fff;
          color: #6c18d7;
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
          onClose={() => {
            if (locationSelectionRequired) {
              router.push("/");
              return;
            }
            setShowLocationModal(false);
          }}
          onGeo={useApproximateLocation}
          onSearch={setLocationSearch}
          onSelectCity={selectCity}
          onSelectVirtual={selectVirtual}
        />
      )}

      <Navbar />

      <div className="search-shell">
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}, rgba(183,44,255,0.3), transparent)` }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px 14px" }}>
          <div className="top-search-grid">
            <div className="type-toggle" style={{ padding: "9px 16px", background: "#f4edff", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, color: GOLD, fontWeight: 700, fontSize: 13, fontFamily: PLAYFAIR }}>Acompanhantes</div>

            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              <SearchIcon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyKeywordSearch();
                }}
                placeholder="Nome, serviço ou especialidade..."
                style={{ width: "100%", padding: "10px 14px 10px 36px", background: "#fff", border: `1px solid ${GOLD_DIM}`, borderRadius: 10, color: "#17141d", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
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
        {mainTab === "acompanhantes" && !locationSelectionRequired && (
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
                  style={{ padding: "11px 20px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 14, color: subTab === tab ? "#f8f5fa" : "#968a9e", borderBottom: `2px solid ${subTab === tab ? GOLD : "transparent"}`, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="filtros-scroll" style={{ marginBottom: 10 }}>
              {QUICK_FILTERS.map((filter) => {
                const active = filtros.has(filter.id);
                return (
                  <button key={filter.id} type="button" onClick={() => toggleFiltro(filter.id)} className={`filter-chip ${active ? "active" : ""}`}>
                    {filter.id === "online" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: active ? "#22c55e" : "#66566f", marginRight: 6, verticalAlign: "middle" }} />}
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

            <p style={{ fontSize: 12, color: "#968a9e", marginBottom: 14 }}>
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
                    <Link href={ACCOUNT_ROUTES.cadastroAcompanhante}>Cadastre-se como acompanhante</Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

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
        <div className="location-modal-header">
          <div className="location-modal-heading">
            <div>
              <p className="location-modal-kicker">Localização</p>
              <h2 className="location-modal-title">Onde deseja buscar?</h2>
            </div>
            <button type="button" className="location-modal-close" onClick={onClose} aria-label="Fechar seleção de localização">×</button>
          </div>
          <div className="location-modal-search">
            <SearchIcon style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={locationSearch}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Digite cidade, bairro ou região"
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
          {geoMessage && <p className="location-modal-message">{geoMessage}</p>}
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
          {locations.length === 0 && <p className="location-modal-empty">Nenhuma cidade sugerida encontrada. Tente outra busca.</p>}
        </div>

        <div className="location-modal-footer">
          <button type="button" className="location-modal-secondary" onClick={onClose}>Fechar</button>
          <button
            type="button"
            className="location-modal-primary"
            onClick={onApply}
            disabled={!draft && !draftVirtual}
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
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: profile.online ? "#22c55e" : "#aaa0b2", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: profile.online ? "#15803d" : "#625b66", fontWeight: 600 }}>{profile.online ? "Online agora" : "Offline"}</span>
            </div>
            <span style={{ fontSize: 14, color: GOLD, fontWeight: 800, fontFamily: PLAYFAIR }}>
              {profile.preco ? `R$${profile.preco}/h` : "Consultar"}
            </span>
          </div>

          <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 18, color: "#17141d", fontFamily: PLAYFAIR, lineHeight: 1.2 }}>{profile.nome}</p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#625b66", display: "flex", alignItems: "center", gap: 4 }}>
            <LocationIcon size={11} color="#625b66" />
            {profile.cidade}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#625b66", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{profile.bio}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <span style={{ color: "#f59e0b", fontSize: 13 }}>★</span>
            <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>{profile.avaliacao}</span>
            <span style={{ fontSize: 11, color: "#625b66" }}>({profile.total} avaliações)</span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {profile.idade && (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #2d1d35", color: "#968a9e", padding: "3px 8px", borderRadius: 8 }}>{profile.idade} anos</span>
            )}
            {profile.local && (
              <span style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid #2d1d35", color: "#968a9e", padding: "3px 8px", borderRadius: 8 }}>{profile.local}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: profile.contactAvailable ? 10 : 0 }}>
            {profile.servicos.slice(0, 3).map((service) => (
              <span key={service} style={{ fontSize: 10, background: GOLD_DIM, border: "1px solid rgba(183,44,255,0.15)", color: "#b9adbf", padding: "3px 8px", borderRadius: 10 }}>{service}</span>
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
