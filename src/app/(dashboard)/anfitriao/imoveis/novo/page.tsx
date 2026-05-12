"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_MID = "rgba(212,168,67,0.28)";

const amenityOptions = [
  "Wi-Fi", "Piscina", "Estacionamento", "Ar-condicionado", "Cozinha equipada",
  "Suite", "Hidromassagem", "Sauna", "Churrasqueira", "Lavanderia",
  "Portaria 24h", "Self check-in", "Vista premium", "Pet friendly",
];

const propertyTypes = ["APARTMENT", "HOUSE", "STUDIO", "VILLA", "LOFT", "FARM", "HOTEL", "OTHER"];
const typeLabels: Record<string, string> = {
  APARTMENT: "Apartamento",
  HOUSE: "Casa",
  STUDIO: "Studio",
  VILLA: "Villa",
  LOFT: "Loft",
  FARM: "Sitio/Fazenda",
  HOTEL: "Hotel/Flat",
  OTHER: "Outro",
};

const steps = ["Tipo", "Localizacao", "Detalhes", "Fotos", "Valores", "Regras"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#0b1420",
  border: "1px solid #1e293b",
  borderRadius: 10,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#64748b",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 1.3,
  marginBottom: 8,
};

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ borderBottom: `1px solid ${GOLD_DIM}`, paddingBottom: 10, marginBottom: 16 }}>
        <h2 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</h2>
        {desc && <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6, margin: "6px 0 0" }}>{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function NovoImovelPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ placeId: string; text: string; mainText: string; secondaryText: string }>>([]);
  const mapsSessionToken = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `session_${Date.now()}`;
  }, []);
  const [form, setForm] = useState({
    title: "",
    type: "APARTMENT",
    description: "",
    address: "",
    bairro: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
    photos: [] as string[],
    pricePerNight: "",
    cleaningFee: "",
    maxGuests: "2",
    bedrooms: "1",
    beds: "1",
    bathrooms: "1",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    minNights: "1",
    instantBook: true,
    allowPets: false,
    allowSmoking: false,
    allowParties: false,
    amenities: [] as string[],
  });

  const progress = ((step + 1) / steps.length) * 100;
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAmenity = (a: string) => set("amenities", form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  useEffect(() => {
    if (step !== 1 || form.address.trim().length < 4) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAddressLoading(true);
      try {
        const qs = new URLSearchParams({ input: form.address, sessionToken: mapsSessionToken });
        const res = await fetch(`/api/address/search?${qs}`);
        const data = await res.json();
        setAddressSuggestions(data.suggestions ?? []);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.address, mapsSessionToken, step]);

  function validateStep(target: number) {
    if (target === 1) {
      if (form.address.trim().length < 5) return "Informe o endereco completo.";
      if (!form.bairro.trim()) return "Informe o bairro.";
      if (!form.city.trim()) return "Informe a cidade.";
      if (!form.state.trim()) return "Informe o estado.";
      if (!form.latitude || !form.longitude) return "Informe a localizacao GPS do imovel.";
    }
    if (target === 2) {
      if (form.title.trim().length < 5) return "Informe um titulo com pelo menos 5 caracteres.";
      if (form.description.trim().length < 40) return "Descreva o imovel com pelo menos 40 caracteres.";
    }
    if (target === 3 && form.photos.length === 0) return "Envie pelo menos uma foto do imovel.";
    if (target === 4) {
      if (!form.pricePerNight || Number(form.pricePerNight) <= 0) return "Informe o valor da diaria.";
      if (!form.minNights || Number(form.minNights) <= 0) return "Informe o minimo de noites.";
    }
    if (target === 5 && form.amenities.length === 0) return "Selecione pelo menos uma comodidade.";
    return null;
  }

  function next() {
    const error = validateStep(step);
    if (error) return toast.error(error);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadPhoto(file: File) {
    if (form.photos.length >= 12) return toast.error("Limite de 12 fotos por imovel.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=properties", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erro no upload.");
      set("photos", [...form.photos, data.url]);
      toast.success("Foto enviada.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return toast.error("GPS nao disponivel neste navegador.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success("Localizacao GPS capturada.");
      },
      () => {
        setLocating(false);
        toast.error("Nao foi possivel capturar a localizacao.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function lookupCep(rawCep: string) {
    const cleanCep = rawCep.replace(/\D/g, "");
    set("zipCode", cleanCep);
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`/api/address/cep/${cleanCep}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "CEP nao encontrado.");
      setForm((current) => ({
        ...current,
        zipCode: data.zipCode ?? cleanCep,
        address: data.street || current.address,
        bairro: data.bairro || current.bairro,
        city: data.city || current.city,
        state: data.state || current.state,
      }));
      toast.success("Endereco preenchido pelo CEP.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function selectAddressSuggestion(placeId: string, label: string) {
    setAddressLoading(true);
    try {
      const res = await fetch(`/api/address/geocode?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Endereco nao encontrado.");
      setForm((current) => ({
        ...current,
        address: data.address || label,
        bairro: data.bairro || current.bairro,
        city: data.city || current.city,
        state: data.state || current.state,
        zipCode: data.zipCode || current.zipCode,
        latitude: data.latitude ? String(data.latitude) : current.latitude,
        longitude: data.longitude ? String(data.longitude) : current.longitude,
      }));
      setAddressSuggestions([]);
      toast.success("Endereco e coordenadas preenchidos.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao selecionar endereco.");
    } finally {
      setAddressLoading(false);
    }
  }

  async function geocodeTypedAddress() {
    const address = [form.address, form.bairro, form.city, form.state, "Brasil"].filter(Boolean).join(", ");
    if (address.length < 8) return toast.error("Digite um endereco mais completo.");

    setAddressLoading(true);
    try {
      const res = await fetch(`/api/address/geocode?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Endereco nao encontrado.");
      setForm((current) => ({
        ...current,
        address: data.address || current.address,
        bairro: data.bairro || current.bairro,
        city: data.city || current.city,
        state: data.state || current.state,
        zipCode: data.zipCode || current.zipCode,
        latitude: data.latitude ? String(data.latitude) : current.latitude,
        longitude: data.longitude ? String(data.longitude) : current.longitude,
      }));
      toast.success("Coordenadas calculadas pelo Google Maps.");
    } catch (err: any) {
      toast.error(err?.message ?? "Configure Google Maps ou use GPS/manual.");
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleSubmit() {
    const error = validateStep(step);
    if (error) return toast.error(error);

    setLoading(true);
    try {
      const payload = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        pricePerNight: Number(form.pricePerNight),
        cleaningFee: form.cleaningFee ? Number(form.cleaningFee) : 0,
        maxGuests: Number(form.maxGuests),
        bedrooms: Number(form.bedrooms),
        beds: Number(form.beds),
        bathrooms: Number(form.bathrooms),
        minNights: Number(form.minNights),
      };
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Revise os campos do imovel.");
      toast.success("Imovel enviado para aprovacao.");
      router.push("/anfitriao");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao cadastrar imovel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 80 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 8px" }}>EliteModell Rooms</p>
        <h1 style={{ color: "#f1f5f9", fontSize: 30, margin: "0 0 8px", fontWeight: 900 }}>Cadastrar imovel premium</h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Localizacao precisa, fotos reais e regras claras aumentam a confianca antes da reserva.</p>
      </div>

      <div style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Etapa {step + 1} de {steps.length} - {steps[step]}</span>
          <span style={{ color: GOLD, fontSize: 12, fontWeight: 800 }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "#1e293b", borderRadius: 999 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: GOLD, borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ background: "#07111f", border: `1px solid ${GOLD_MID}`, borderRadius: 14, padding: 24 }}>
        {step === 0 && (
          <Section title="Tipo do imovel" desc="Escolha a categoria que melhor descreve o espaco.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {propertyTypes.map((t) => (
                <button key={t} type="button" onClick={() => set("type", t)} style={{ padding: "14px", background: form.type === t ? GOLD_DIM : "#0b1420", border: `1.5px solid ${form.type === t ? GOLD : "#1e293b"}`, borderRadius: 10, color: form.type === t ? "#f1f5f9" : "#64748b", textAlign: "left", cursor: "pointer", fontWeight: 800 }}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Endereco e GPS" desc="O endereco completo fica privado ate a reserva; a busca usa cidade, bairro e coordenadas aproximadas.">
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>CEP</label>
                  <input style={inputStyle} value={form.zipCode} onChange={(e) => lookupCep(e.target.value)} placeholder="00000-000" />
                  {cepLoading && <p style={{ margin: "6px 0 0", color: GOLD, fontSize: 11 }}>Buscando CEP...</p>}
                </div>
                <div style={{ position: "relative" }}>
                  <label style={labelStyle}>Endereco completo *</label>
                  <input style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, numero, complemento" />
                  {(addressLoading || addressSuggestions.length > 0) && (
                    <div style={{ position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, marginTop: 6, background: "#08111f", border: `1px solid ${GOLD_MID}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
                      {addressLoading && <div style={{ padding: 12, color: GOLD, fontSize: 12, fontWeight: 800 }}>Buscando no Google Maps...</div>}
                      {addressSuggestions.map((item) => (
                        <button key={item.placeId} type="button" onClick={() => selectAddressSuggestion(item.placeId, item.text)} style={{ width: "100%", display: "block", textAlign: "left", padding: "11px 12px", background: "transparent", border: "none", borderTop: "1px solid rgba(212,168,67,0.08)", color: "#f1f5f9", cursor: "pointer" }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 800 }}>{item.mainText || item.text}</span>
                          {item.secondaryText && <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 3 }}>{item.secondaryText}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.7fr 90px", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Bairro *</label>
                  <input style={inputStyle} value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Jardins" />
                </div>
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <input style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Sao Paulo" />
                </div>
                <div>
                  <label style={labelStyle}>UF *</label>
                  <input style={inputStyle} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
                </div>
              </div>
              <button type="button" onClick={useCurrentLocation} disabled={locating} style={{ padding: "12px 16px", background: GOLD, border: "none", borderRadius: 10, color: "#07111f", fontWeight: 900, cursor: locating ? "not-allowed" : "pointer" }}>
                {locating ? "Capturando GPS..." : "Usar GPS deste dispositivo"}
              </button>
              <button type="button" onClick={geocodeTypedAddress} disabled={addressLoading} style={{ padding: "12px 16px", background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 10, color: GOLD, fontWeight: 900, cursor: addressLoading ? "not-allowed" : "pointer" }}>
                {addressLoading ? "Calculando..." : "Calcular coordenadas pelo Google"}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Latitude *</label>
                  <input style={inputStyle} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="-23.550520" />
                </div>
                <div>
                  <label style={labelStyle}>Longitude *</label>
                  <input style={inputStyle} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-46.633308" />
                </div>
              </div>
              {form.latitude && form.longitude && (
                <div style={{ border: `1px solid ${GOLD_MID}`, borderRadius: 12, overflow: "hidden", background: "#0b1420" }}>
                  <iframe
                    title="Previa da localizacao do imovel"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}&z=15&output=embed`}
                    style={{ width: "100%", height: 220, border: 0, display: "block" }}
                    loading="lazy"
                  />
                  <div style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>
                    Previa aproximada da localizacao. O endereco completo deve ficar privado ate a reserva ser confirmada.
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Detalhes do anuncio" desc="Texto premium, objetivo e fiel ao espaco.">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Titulo *</label>
                <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Studio discreto com garagem e self check-in" />
              </div>
              <div>
                <label style={labelStyle}>Descricao *</label>
                <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Descreva ambiente, privacidade, acesso, conforto e diferenciais." />
                <p style={{ color: "#334155", fontSize: 11, margin: "6px 0 0" }}>{form.description.length} caracteres</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[["maxGuests", "Hospedes"], ["bedrooms", "Quartos"], ["beds", "Camas"], ["bathrooms", "Banheiros"]].map(([key, label]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input type="number" min="1" style={inputStyle} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Fotos do imovel" desc={`Envie fotos reais e bem iluminadas. ${form.photos.length}/12`}>
            <label style={{ display: "block", border: `2px dashed ${GOLD_MID}`, background: GOLD_DIM, borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>
              {uploading ? "Enviando..." : "Clique para enviar foto"}
              <input type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0]); e.currentTarget.value = ""; }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
              {form.photos.map((url, i) => (
                <div key={url} style={{ position: "relative", aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", background: "#0b1420" }}>
                  <img src={url} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => set("photos", form.photos.filter((x) => x !== url))} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 999, border: "none", background: "rgba(6,14,27,0.9)", color: "#fff", cursor: "pointer" }}>x</button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section title="Valores e disponibilidade">
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Diaria *</label>
                  <input type="number" style={inputStyle} value={form.pricePerNight} onChange={(e) => set("pricePerNight", e.target.value)} placeholder="450" />
                </div>
                <div>
                  <label style={labelStyle}>Taxa de limpeza</label>
                  <input type="number" style={inputStyle} value={form.cleaningFee} onChange={(e) => set("cleaningFee", e.target.value)} placeholder="0" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Noites minimas *</label>
                  <input type="number" min="1" style={inputStyle} value={form.minNights} onChange={(e) => set("minNights", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Check-in</label>
                  <input type="time" style={inputStyle} value={form.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Check-out</label>
                  <input type="time" style={inputStyle} value={form.checkOutTime} onChange={(e) => set("checkOutTime", e.target.value)} />
                </div>
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#94a3b8", fontSize: 13 }}>
                <input type="checkbox" checked={form.instantBook} onChange={(e) => set("instantBook", e.target.checked)} style={{ accentColor: GOLD }} />
                Reserva instantanea
              </label>
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Comodidades e regras">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
              {amenityOptions.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{ padding: "11px 12px", background: form.amenities.includes(a) ? GOLD_DIM : "#0b1420", border: `1.5px solid ${form.amenities.includes(a) ? GOLD : "#1e293b"}`, borderRadius: 10, color: form.amenities.includes(a) ? "#f1f5f9" : "#64748b", textAlign: "left", cursor: "pointer", fontWeight: 700 }}>
                  {a}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {[["allowPets", "Permitir pets"], ["allowSmoking", "Permitir fumar"], ["allowParties", "Permitir festas e eventos"]].map(([key, label]) => (
                <label key={key} style={{ display: "flex", gap: 10, alignItems: "center", color: "#94a3b8", fontSize: 13, background: "#0b1420", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
                  <input type="checkbox" checked={(form as any)[key]} onChange={(e) => set(key, e.target.checked)} style={{ accentColor: GOLD }} />
                  {label}
                </label>
              ))}
            </div>
          </Section>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: `1px solid ${GOLD_DIM}`, paddingTop: 18 }}>
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: "12px 20px", background: "transparent", border: `1px solid ${step === 0 ? "#1e293b" : GOLD_MID}`, borderRadius: 10, color: step === 0 ? "#334155" : GOLD, cursor: step === 0 ? "default" : "pointer", fontWeight: 800 }}>
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} style={{ padding: "12px 28px", background: GOLD, border: "none", borderRadius: 10, color: "#07111f", cursor: "pointer", fontWeight: 900 }}>
              Continuar
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} style={{ padding: "12px 28px", background: loading ? "#9e7b2a" : GOLD, border: "none", borderRadius: 10, color: "#07111f", cursor: loading ? "not-allowed" : "pointer", fontWeight: 900 }}>
              {loading ? "Enviando..." : "Enviar para aprovacao"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
