"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type LocationData = {
  city: string; state: string; neighborhood: string | null; additionalNeighborhoods: string[];
  updatedAt: string | null; verificationStatus: string; temporaryFrom: string | null; temporaryUntil: string | null;
  attendanceTypes: string[];
};
type LocationPolicy = { initialFreeChanges: number; permanentChangesUsed: number; freeChangesRemaining: number; voucherRequiredAfterFreeChanges: boolean; voucherPurchaseAvailable: boolean; price: null };

export default function ProfessionalLocationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [policy, setPolicy] = useState<LocationPolicy | null>(null);
  const [form, setForm] = useState({
    city: "", state: "", neighborhood: "", additionalNeighborhoods: "", mode: "PERMANENT",
    effectiveFrom: "", effectiveUntil: "", hasOwnPlace: false, servesHotel: false, servesMotel: false,
    acceptsTravel: false, acceptsExternal: false,
  });

  useEffect(() => {
    fetch("/api/professional/location", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const current = data.location as LocationData;
      setLocation(current);
      setPolicy(data.policy as LocationPolicy);
      setForm((value) => ({ ...value,
        city: current.city ?? "", state: current.state ?? "", neighborhood: current.neighborhood ?? "",
        additionalNeighborhoods: (current.additionalNeighborhoods ?? []).join(", "),
        hasOwnPlace: current.attendanceTypes.includes("Local próprio"),
        servesHotel: current.attendanceTypes.includes("Hotéis"), servesMotel: current.attendanceTypes.includes("Motéis"),
        acceptsTravel: current.attendanceTypes.includes("Aceita viajar"), acceptsExternal: current.attendanceTypes.includes("A domicílio"),
      }));
    }).catch(() => toast.error("Não foi possível carregar sua localização.")).finally(() => setLoading(false));
  }, []);

  async function save(useGps = false) {
    setSaving(true);
    try {
      let coordinates: { latitude?: number; longitude?: number } = {};
      if (useGps) coordinates = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }), reject,
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
      ));
      const response = await fetch("/api/professional/location", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...form,
        state: form.state.toUpperCase(),
        additionalNeighborhoods: form.additionalNeighborhoods.split(",").map((item) => item.trim()).filter(Boolean),
        effectiveFrom: form.mode === "TEMPORARY" && form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : undefined,
        effectiveUntil: form.mode === "TEMPORARY" && form.effectiveUntil ? new Date(form.effectiveUntil).toISOString() : undefined,
        ...coordinates,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.applied ? "Localização atualizada." : "Mudança enviada para validação.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a localização.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="location-page"><p>Carregando localização…</p></main>;
  return (
    <main className="location-page">
      <header><div><small>MEU ANÚNCIO</small><h1>Minha localização de atendimento</h1><p>Atualize onde você está atendendo. Seu endereço residencial e suas coordenadas nunca são exibidos ao cliente.</p></div><Link href="/profissional/perfil">Voltar ao perfil</Link></header>
      {location && <section className="location-current"><strong>{location.city}/{location.state}{location.neighborhood ? ` · ${location.neighborhood}` : ""}</strong><span>Status: {location.verificationStatus === "VERIFIED" ? "verificada" : "aguardando validação"}</span><span>{location.updatedAt ? `Atualizada em ${new Date(location.updatedAt).toLocaleString("pt-BR")}` : "Data não registrada"}</span></section>}
      {policy && <section className="location-policy"><strong>{policy.freeChangesRemaining} de {policy.initialFreeChanges} alterações gratuitas disponíveis</strong><span>{policy.freeChangesRemaining === 0 ? "Próximas alterações exigirão voucher. A compra ainda não está disponível e nenhum valor foi definido." : "Depois das gratuitas, será necessário voucher."}</span></section>}
      <section className="location-card">
        <label>Tipo de alteração<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="PERMANENT">Alterar cidade de atendimento</option><option value="TEMPORARY">Vou viajar / atender temporariamente</option></select></label>
        <div className="location-grid"><label>Cidade<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label>UF<input maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} /></label><label>Bairro/região<input value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} /></label><label>Outros bairros<input value={form.additionalNeighborhoods} onChange={(event) => setForm({ ...form, additionalNeighborhoods: event.target.value })} placeholder="Separe por vírgulas" /></label></div>
        {form.mode === "TEMPORARY" && <div className="location-grid"><label>Início<input type="datetime-local" value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} /></label><label>Fim<input type="datetime-local" value={form.effectiveUntil} onChange={(event) => setForm({ ...form, effectiveUntil: event.target.value })} /></label></div>}
        <div className="location-options">{[["hasOwnPlace","Possuo local próprio"],["servesHotel","Atendo em hotel"],["servesMotel","Atendo em motel"],["acceptsExternal","Faço atendimento externo"],["acceptsTravel","Aceito viajar"]].map(([key,label]) => <label key={key}><input type="checkbox" checked={Boolean(form[key as keyof typeof form])} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} />{label}</label>)}</div>
        <div className="location-actions"><button disabled={saving} onClick={() => void save(false)}>{saving ? "Salvando…" : "Salvar localização"}</button><button className="secondary" disabled={saving || typeof navigator === "undefined" || !navigator.geolocation} onClick={() => void save(true)}>Atualizar com GPS</button></div>
        <p className="privacy-note">O GPS é usado somente quando você toca no botão. A plataforma usa a cidade/região e não publica coordenadas exatas.</p>
      </section>
      <style>{`
        .location-page{max-width:920px;margin:0 auto;padding:28px;color:#f8effc}.location-page header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.location-page h1{margin:6px 0;font-size:32px}.location-page header p{color:#a99fad;max-width:650px;line-height:1.6}.location-page a{color:#e1a6ff}.location-current,.location-policy,.location-card{margin-top:20px;padding:20px;border:1px solid rgba(183,44,255,.26);border-radius:16px;background:#111}.location-current,.location-policy{display:flex;gap:10px 22px;flex-wrap:wrap}.location-current span,.location-policy span{color:#aaa}.location-card label{display:grid;gap:7px;font-size:12px;font-weight:800}.location-card input,.location-card select{min-height:44px;border:1px solid #3a2a40;border-radius:10px;background:#080808;color:#fff;padding:0 12px}.location-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}.location-options{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.location-options label{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #38273f;border-radius:10px}.location-options input{min-height:auto}.location-actions{display:flex;gap:10px}.location-actions button{min-height:46px;padding:0 18px;border:0;border-radius:11px;background:#b72cff;color:#fff;font-weight:900}.location-actions .secondary{background:#261d2a}.privacy-note{color:#928897;font-size:12px;line-height:1.6}@media(max-width:680px){.location-page{padding:18px}.location-page header{display:block}.location-page header a{display:inline-block;margin-top:8px}.location-grid{grid-template-columns:1fr}.location-actions{display:grid}.location-page h1{font-size:26px}}
      `}</style>
    </main>
  );
}
