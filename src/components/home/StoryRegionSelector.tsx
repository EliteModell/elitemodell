"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { normalizeLocationText } from "@/lib/brazilian-location";

export type StoryRegion = { city: string; state: string; label: string };
type CityOption = StoryRegion & { profileCount: number; storyCount: number };
type StoryGroup = { city?: string; state?: string; institutional?: boolean; stories?: unknown[] };

export function StoryRegionSelector({ open, current, onClose, onSelect }: {
  open: boolean;
  current: StoryRegion | null;
  onClose: () => void;
  onSelect: (region: StoryRegion) => void;
}) {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setLoading(true));
    const controller = new AbortController();
    Promise.all([
      fetch("/api/locations/available-cities", { signal: controller.signal }).then((response) => response.ok ? response.json() : { cities: [] }),
      fetch("/api/stories", { signal: controller.signal }).then((response) => response.ok ? response.json() : []),
    ]).then(([cityPayload, storyPayload]) => {
      const merged = new Map<string, CityOption>();
      for (const item of cityPayload.cities ?? []) {
        const key = `${normalizeLocationText(item.city)}|${item.state}`;
        merged.set(key, { city: item.city, state: item.state, label: `${item.city}, ${item.state}`, profileCount: item.count ?? 0, storyCount: 0 });
      }
      for (const group of (Array.isArray(storyPayload) ? storyPayload : []) as StoryGroup[]) {
        if (group.institutional || !group.city || !group.state) continue;
        const key = `${normalizeLocationText(group.city)}|${group.state}`;
        const existing = merged.get(key) ?? { city: group.city, state: group.state, label: `${group.city}, ${group.state}`, profileCount: 0, storyCount: 0 };
        existing.storyCount += Array.isArray(group.stories) ? group.stories.length : 0;
        merged.set(key, existing);
      }
      setCities([...merged.values()].sort((a, b) => b.storyCount - a.storyCount || b.profileCount - a.profileCount || a.city.localeCompare(b.city, "pt-BR")));
    }).finally(() => setLoading(false));
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => { controller.abort(); window.clearTimeout(focusTimer); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose, open]);

  const filtered = useMemo(() => {
    const needle = normalizeLocationText(query);
    return needle ? cities.filter((item) => normalizeLocationText(`${item.city} ${item.state}`).includes(needle)) : cities;
  }, [cities, query]);

  if (!open) return null;
  return (
    <div className="story-region-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="story-region-dialog" role="dialog" aria-modal="true" aria-labelledby="story-region-title">
        <header>
          <div><span>Stories por região</span><h3 id="story-region-title">Escolha uma cidade</h3></div>
          <button type="button" onClick={onClose} aria-label="Fechar seletor de cidades"><X /></button>
        </header>
        <label className="story-region-search"><Search aria-hidden="true" /><input ref={inputRef} type="search" inputMode="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar cidade ou UF" /></label>
        <div className="story-region-list">
          {loading ? <p>Carregando cidades...</p> : filtered.length ? filtered.map((item) => (
            <button key={`${item.city}-${item.state}`} type="button" className={current?.city === item.city && current.state === item.state ? "selected" : ""} onClick={() => { onSelect(item); onClose(); }}>
              <MapPin aria-hidden="true" />
              <span><strong>{item.city}, {item.state}</strong><small>{item.storyCount > 0 ? `${item.storyCount} ${item.storyCount === 1 ? "story disponível" : "stories disponíveis"}` : `${item.profileCount} ${item.profileCount === 1 ? "perfil publicado" : "perfis publicados"}`}</small></span>
            </button>
          )) : <p>Nenhuma cidade encontrada.</p>}
        </div>
      </section>
      <style>{`
        .story-region-backdrop{position:fixed;inset:0;z-index:1100;display:grid;place-items:end center;padding:16px;background:rgba(31,8,49,.38);backdrop-filter:blur(8px)}
        .story-region-dialog{width:min(560px,100%);max-height:min(720px,calc(100dvh - 32px));display:flex;flex-direction:column;overflow:hidden;border:1px solid #ead9f5;border-radius:24px;background:#fff;box-shadow:0 24px 80px rgba(74,24,105,.24)}
        .story-region-dialog header{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 22px 14px}.story-region-dialog header span{color:#7b1fa2;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.story-region-dialog h3{margin:5px 0 0;color:#24102f;font:800 25px/1.1 var(--font-playfair),serif}.story-region-dialog header button{display:grid;place-items:center;width:42px;height:42px;border:1px solid #ead9f5;border-radius:50%;background:#faf5fd;color:#6c238e}.story-region-dialog header svg{width:20px}
        .story-region-search{display:flex;align-items:center;gap:10px;margin:0 18px 12px;padding:0 14px;border:1px solid #dfc8ec;border-radius:14px;background:#fcf9fe;color:#7b1fa2}.story-region-search:focus-within{border-color:#8e24aa;box-shadow:0 0 0 3px rgba(142,36,170,.1)}.story-region-search svg{width:19px}.story-region-search input{width:100%;min-height:48px;border:0;outline:0;background:transparent;color:#26132f;font-size:16px}
        .story-region-list{min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding:0 12px max(16px,env(safe-area-inset-bottom))}.story-region-list>p{padding:22px;text-align:center;color:#74677b}.story-region-list button{width:100%;display:flex;align-items:center;gap:12px;padding:13px 11px;border:0;border-radius:14px;background:transparent;color:#2a1733;text-align:left}.story-region-list button:hover,.story-region-list button.selected{background:#f5ebfa}.story-region-list button>svg{width:20px;color:#8e24aa}.story-region-list button span{display:grid;gap:3px}.story-region-list strong{font-size:15px}.story-region-list small{color:#786a80;font-size:12px}
        @media(min-width:641px){.story-region-backdrop{place-items:center}.story-region-dialog{max-height:min(680px,calc(100dvh - 48px))}}
        @media(max-width:640px){.story-region-backdrop{padding:0;align-items:end}.story-region-dialog{max-height:calc(100dvh - 12px);border-radius:24px 24px 0 0}.story-region-list{padding-bottom:max(20px,env(safe-area-inset-bottom))}}
      `}</style>
    </div>
  );
}
