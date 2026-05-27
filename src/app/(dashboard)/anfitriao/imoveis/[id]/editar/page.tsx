import Link from "next/link";
import { notFound } from "next/navigation";
import { saveHostProperty } from "@/lib/host-property-actions";
import { prisma } from "@/lib/prisma";
import { requireHostPanel } from "@/lib/account-access";
import { PROPERTY_STATUS_LABEL } from "@/lib/property-status";

export const dynamic = "force-dynamic";

const GOLD = "#d4a843";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 7, color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <input name={name} type={type} defaultValue={defaultValue ?? ""} style={inputStyle} />
    </label>
  );
}

function TextArea({ label, name, defaultValue, rows = 5 }: { label: string; name: string; defaultValue?: string | null; rows?: number }) {
  return (
    <label style={{ display: "grid", gap: 7, color: GOLD, fontSize: 11, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase" }}>
      {label}
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} />
    </label>
  );
}

function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label style={{ minHeight: 48, display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, padding: "0 12px", color: "#f5f5f5", fontSize: 13, fontWeight: 800 }}>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} style={{ accentColor: GOLD }} />
      {label}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 48,
  border: "1px solid rgba(212,168,67,0.26)",
  borderRadius: 8,
  background: "rgba(8,8,10,0.92)",
  color: "#fff",
  padding: "12px 13px",
  outline: "none",
  fontSize: 14,
  textTransform: "none",
  letterSpacing: 0,
};

export default async function EditarImovelAnfitriaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ erro?: string }>;
}) {
  const access = await requireHostPanel();
  const { id } = await params;
  const query = await searchParams;

  const property = await prisma.property.findFirst({
    where: access.isAdmin ? { id } : { id, hostId: access.user.id },
    include: {
      amenities: { orderBy: { name: "asc" } },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!property) notFound();

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 980 }}>
      <header>
        <Link href={`/anfitriao/imoveis/${property.id}`} style={{ color: GOLD, textDecoration: "none", fontSize: 13, fontWeight: 900 }}>Voltar para detalhes</Link>
        <h1 style={{ color: "#fff", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 950, margin: "10px 0 8px", lineHeight: 1.05 }}>Editar imóvel</h1>
        <p style={{ color: "#b8b8b8", margin: 0, lineHeight: 1.7 }}>
          Status atual: <strong style={{ color: GOLD }}>{PROPERTY_STATUS_LABEL[property.status] ?? property.status}</strong>. Ao enviar para análise, o imóvel só volta a aparecer depois da aprovação do admin.
        </p>
      </header>

      {query?.erro === "dados-obrigatorios" ? (
        <div style={{ border: "1px solid rgba(239,68,68,0.36)", background: "rgba(239,68,68,0.10)", color: "#fecaca", borderRadius: 8, padding: 12, fontWeight: 850 }}>
          Preencha título, descrição, endereço, cidade e estado antes de salvar.
        </div>
      ) : null}

      <form action={saveHostProperty} style={{ display: "grid", gap: 18, border: "1px solid rgba(212,168,67,0.18)", borderRadius: 8, background: "rgba(255,255,255,0.035)", padding: 18 }}>
        <input type="hidden" name="id" value={property.id} />

        <section style={{ display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 950 }}>Dados principais</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Field label="Título" name="title" defaultValue={property.title} />
            <Field label="Preço por período" name="pricePerNight" type="number" defaultValue={property.pricePerNight} />
            <Field label="Taxa de limpeza" name="cleaningFee" type="number" defaultValue={property.cleaningFee} />
            <Field label="Capacidade" name="maxGuests" type="number" defaultValue={property.maxGuests} />
          </div>
          <TextArea label="Descrição" name="description" defaultValue={property.description} rows={6} />
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 950 }}>Endereço e estrutura</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Field label="Endereço" name="address" defaultValue={property.address} />
            <Field label="Bairro" name="bairro" defaultValue={property.bairro} />
            <Field label="Cidade" name="city" defaultValue={property.city} />
            <Field label="Estado" name="state" defaultValue={property.state} />
            <Field label="CEP" name="zipCode" defaultValue={property.zipCode} />
            <Field label="Quartos" name="bedrooms" type="number" defaultValue={property.bedrooms} />
            <Field label="Camas" name="beds" type="number" defaultValue={property.beds} />
            <Field label="Banheiros" name="bathrooms" type="number" defaultValue={property.bathrooms} />
          </div>
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 950 }}>Regras e horários</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Check-in" name="checkInTime" defaultValue={property.checkInTime} />
            <Field label="Check-out" name="checkOutTime" defaultValue={property.checkOutTime} />
            <Field label="Mínimo de períodos" name="minNights" type="number" defaultValue={property.minNights} />
            <Field label="Máximo de períodos" name="maxNights" type="number" defaultValue={property.maxNights} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <Toggle label="Reserva instantânea" name="instantBook" defaultChecked={property.instantBook} />
            <Toggle label="Aceita pets" name="allowPets" defaultChecked={property.allowPets} />
            <Toggle label="Permite fumar" name="allowSmoking" defaultChecked={property.allowSmoking} />
            <Toggle label="Permite festas/eventos" name="allowParties" defaultChecked={property.allowParties} />
          </div>
        </section>

        <section style={{ display: "grid", gap: 14 }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 950 }}>Comodidades e fotos</h2>
          <TextArea
            label="Comodidades"
            name="amenities"
            defaultValue={property.amenities.map((amenity) => amenity.name).join("\n")}
            rows={5}
          />
          <TextArea
            label="URLs das fotos"
            name="photos"
            defaultValue={property.photos.map((photo) => photo.url).join("\n")}
            rows={6}
          />
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 13, lineHeight: 1.6 }}>
            Para adicionar fotos novas com upload guiado, use o cadastro de imóvel. Esta edição permite reorganizar ou corrigir URLs já salvas.
          </p>
        </section>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", borderTop: "1px solid rgba(212,168,67,0.14)", paddingTop: 16 }}>
          <button name="intent" value="draft" style={{ minHeight: 46, borderRadius: 8, border: "1px solid rgba(212,168,67,0.28)", background: "rgba(212,168,67,0.08)", color: "#f5d78c", padding: "0 16px", fontWeight: 950, cursor: "pointer" }}>
            Salvar rascunho
          </button>
          <button name="intent" value="review" style={{ minHeight: 46, border: "none", borderRadius: 8, background: GOLD, color: "#070707", padding: "0 18px", fontWeight: 950, cursor: "pointer" }}>
            Salvar e enviar para análise
          </button>
        </div>
      </form>
    </div>
  );
}
