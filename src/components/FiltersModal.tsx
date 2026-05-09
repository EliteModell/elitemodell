"use client";
import { useState } from "react";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_MID = "rgba(212,168,67,0.25)";
const PLAYFAIR = "var(--font-playfair), serif";

type Props = { onClose: () => void; onApply: (f: Filters) => void };

type Filters = {
  online: boolean; possuiAvaliacao: boolean; aceitaViajar: boolean; localProprio: boolean;
  idadeMin: number; idadeMax: number; precoMin: number; precoMax: number;
  atende: string[]; grupos: string[]; pagamento: string[];
  aparencia: { cabelo: string[]; olhos: string[]; etnia: string[]; tatuagem: string; silicone: string };
  servicos: string[]; fetiches: string[]; atendimento: string[];
};

const defaultFilters: Filters = {
  online: false, possuiAvaliacao: false, aceitaViajar: false, localProprio: false,
  idadeMin: 18, idadeMax: 60, precoMin: 50, precoMax: 1000,
  atende: [], grupos: [], pagamento: [],
  aparencia: { cabelo: [], olhos: [], etnia: [], tatuagem: "", silicone: "" },
  servicos: [], fetiches: [], atendimento: [],
};

type Section = "populares" | "localizacao" | "preferencias" | "aparencia" | "pagamento" | "servicos";

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", borderRadius: 20,
      border: `1.5px solid ${active ? GOLD : "#1e293b"}`,
      background: active ? GOLD_DIM : "transparent",
      color: active ? "#f1f5f9" : "#64748b",
      fontSize: 13, cursor: "pointer", transition: "all 0.15s", fontWeight: active ? 600 : 400,
    }}>
      {label}
    </button>
  );
}

function RangeSlider({ min, max, valueMin, valueMax, labelMin, labelMax, onChange }: {
  min: number; max: number; valueMin: number; valueMax: number;
  labelMin: string; labelMax: string;
  onChange: (min: number, max: number) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, fontFamily: PLAYFAIR }}>{labelMin}</span>
        <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, fontFamily: PLAYFAIR }}>{labelMax}</span>
      </div>
      <input type="range" min={min} max={max} value={valueMin}
        onChange={(e) => onChange(Number(e.target.value), valueMax)}
        style={{ width: "100%", accentColor: GOLD, cursor: "pointer" }} />
      <input type="range" min={min} max={max} value={valueMax}
        onChange={(e) => onChange(valueMin, Number(e.target.value))}
        style={{ width: "100%", accentColor: GOLD, marginTop: 6, cursor: "pointer" }} />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ width: 28, height: 2, background: GOLD, borderRadius: 2, marginBottom: 8 }} />
      <h3 style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700, margin: 0, fontFamily: PLAYFAIR }}>{children}</h3>
    </div>
  );
}

function TagGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
      {items.map((item) => (
        <Tag key={item} label={item} active={selected.includes(item)} onClick={() => onToggle(item)} />
      ))}
    </div>
  );
}

export default function FiltersModal({ onClose, onApply }: Props) {
  const [section, setSection] = useState<Section>("populares");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  function toggle(key: keyof Pick<Filters, "online" | "possuiAvaliacao" | "aceitaViajar" | "localProprio">) {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }

  function toggleArr(key: keyof Pick<Filters, "atende" | "grupos" | "pagamento" | "servicos" | "fetiches" | "atendimento">, val: string) {
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val] }));
  }

  function toggleAparencia(key: keyof Filters["aparencia"], val: string) {
    if (key === "tatuagem" || key === "silicone") {
      setFilters((f) => ({ ...f, aparencia: { ...f.aparencia, [key]: f.aparencia[key] === val ? "" : val } }));
    } else {
      const arr = filters.aparencia[key] as string[];
      setFilters((f) => ({ ...f, aparencia: { ...f.aparencia, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] } }));
    }
  }

  const sections: { id: Section; label: string }[] = [
    { id: "populares", label: "Populares" },
    { id: "localizacao", label: "Localização" },
    { id: "preferencias", label: "Preferências" },
    { id: "aparencia", label: "Aparência" },
    { id: "pagamento", label: "Pagamento" },
    { id: "servicos", label: "Serviços" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,10,20,0.92)", padding: 16, backdropFilter: "blur(6px)" }}>
      <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 20, width: "100%", maxWidth: 820, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>

        {/* Linha dourada no topo */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${GOLD_DIM}` }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9", fontFamily: PLAYFAIR }}>Filtros avançados</h2>
          <button onClick={onClose} style={{ background: "rgba(212,168,67,0.08)", border: `1px solid ${GOLD_DIM}`, color: "#94a3b8", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: 190, borderRight: `1px solid ${GOLD_DIM}`, padding: "12px 0", overflowY: "auto", flexShrink: 0, background: "#08101e" }}>
            {sections.map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                width: "100%", padding: "11px 20px", textAlign: "left",
                background: section === s.id ? GOLD_DIM : "transparent",
                border: "none", borderLeft: `3px solid ${section === s.id ? GOLD : "transparent"}`,
                color: section === s.id ? "#f1f5f9" : "#475569",
                fontSize: 13, fontWeight: section === s.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
              }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

            {section === "populares" && (
              <div>
                <SectionTitle>Filtros rápidos</SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                  <Tag label="Online agora" active={filters.online} onClick={() => toggle("online")} />
                  <Tag label="Possui avaliações" active={filters.possuiAvaliacao} onClick={() => toggle("possuiAvaliacao")} />
                  <Tag label="Aceita viajar" active={filters.aceitaViajar} onClick={() => toggle("aceitaViajar")} />
                  <Tag label="Local próprio" active={filters.localProprio} onClick={() => toggle("localProprio")} />
                </div>
                <SectionTitle>Faixa etária</SectionTitle>
                <RangeSlider min={18} max={60} valueMin={filters.idadeMin} valueMax={filters.idadeMax}
                  labelMin={`${filters.idadeMin} anos`} labelMax={`${filters.idadeMax === 60 ? "+60" : filters.idadeMax} anos`}
                  onChange={(min, max) => setFilters((f) => ({ ...f, idadeMin: min, idadeMax: max }))} />
                <SectionTitle>Preço por hora</SectionTitle>
                <RangeSlider min={50} max={1000} valueMin={filters.precoMin} valueMax={filters.precoMax}
                  labelMin={`R$${filters.precoMin}`} labelMax={`R$${filters.precoMax === 1000 ? "+999" : filters.precoMax}`}
                  onChange={(min, max) => setFilters((f) => ({ ...f, precoMin: min, precoMax: max }))} />
              </div>
            )}

            {section === "localizacao" && (
              <div>
                <SectionTitle>Tipo de atendimento</SectionTitle>
                <TagGroup items={["A domicílio", "Aceita viajar", "Festas e eventos", "Hotéis", "Local próprio", "Motéis"]}
                  selected={filters.atendimento} onToggle={(v) => toggleArr("atendimento", v)} />
                <SectionTitle>Região</SectionTitle>
                <TagGroup items={["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste", "Grande SP", "Interior"]}
                  selected={filters.atende} onToggle={(v) => toggleArr("atende", v)} />
              </div>
            )}

            {section === "preferencias" && (
              <div>
                <SectionTitle>Atende</SectionTitle>
                <TagGroup items={["Casais", "Homens", "Mulheres", "Homens trans", "Mulheres trans", "Não binário"]}
                  selected={filters.atende} onToggle={(v) => toggleArr("atende", v)} />
                <SectionTitle>Grupos</SectionTitle>
                <TagGroup items={["1 pessoa", "2 pessoas", "3 pessoas", "4 ou mais"]}
                  selected={filters.grupos} onToggle={(v) => toggleArr("grupos", v)} />
              </div>
            )}

            {section === "aparencia" && (
              <div>
                <SectionTitle>Cabelo</SectionTitle>
                <TagGroup items={["Loira(o)", "Morena(o)", "Ruiva(o)", "Castanho", "Colorido", "Preto"]}
                  selected={filters.aparencia.cabelo} onToggle={(v) => toggleAparencia("cabelo", v)} />
                <SectionTitle>Cor dos olhos</SectionTitle>
                <TagGroup items={["Azul", "Castanho", "Verde", "Mel", "Cinza", "Preto"]}
                  selected={filters.aparencia.olhos} onToggle={(v) => toggleAparencia("olhos", v)} />
                <SectionTitle>Etnia</SectionTitle>
                <TagGroup items={["Branca", "Negra", "Parda", "Oriental", "Indígena", "Latina"]}
                  selected={filters.aparencia.etnia} onToggle={(v) => toggleAparencia("etnia", v)} />
                <SectionTitle>Tatuagens</SectionTitle>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  <Tag label="Sem tatuagens" active={filters.aparencia.tatuagem === "sem"} onClick={() => toggleAparencia("tatuagem", "sem")} />
                  <Tag label="Com tatuagens" active={filters.aparencia.tatuagem === "com"} onClick={() => toggleAparencia("tatuagem", "com")} />
                </div>
                <SectionTitle>Silicone</SectionTitle>
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                  <Tag label="Sem silicone" active={filters.aparencia.silicone === "sem"} onClick={() => toggleAparencia("silicone", "sem")} />
                  <Tag label="Com silicone" active={filters.aparencia.silicone === "com"} onClick={() => toggleAparencia("silicone", "com")} />
                </div>
              </div>
            )}

            {section === "pagamento" && (
              <div>
                <SectionTitle>Forma de pagamento</SectionTitle>
                <TagGroup items={["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência"]}
                  selected={filters.pagamento} onToggle={(v) => toggleArr("pagamento", v)} />
                <SectionTitle>Faixa de preço (por hora)</SectionTitle>
                <RangeSlider min={50} max={1000} valueMin={filters.precoMin} valueMax={filters.precoMax}
                  labelMin={`R$${filters.precoMin}`} labelMax={`R$${filters.precoMax === 1000 ? "+999" : filters.precoMax}`}
                  onChange={(min, max) => setFilters((f) => ({ ...f, precoMin: min, precoMax: max }))} />
              </div>
            )}

            {section === "servicos" && (
              <div>
                <SectionTitle>Serviços</SectionTitle>
                <TagGroup
                  items={["Acompanhamento", "Jantar a dois", "Viagens", "Festas e eventos", "Massagem", "Massagem tântrica", "Ensaio fotográfico", "Vídeo chamada"]}
                  selected={filters.servicos} onToggle={(v) => toggleArr("servicos", v)} />
                <SectionTitle>Comportamento</SectionTitle>
                <TagGroup
                  items={["Ativo", "Passivo", "Versátil", "Gosta de comandar", "Permite filmagem", "Faz sexo virtual"]}
                  selected={filters.fetiches} onToggle={(v) => toggleArr("fetiches", v)} />
                <SectionTitle>Fetiches</SectionTitle>
                <TagGroup
                  items={["Striptease", "Dominação", "Roleplay", "Bondage", "Voyeurismo", "Podolatria", "Fantasias/uniformes", "Squirt"]}
                  selected={filters.fetiches} onToggle={(v) => toggleArr("fetiches", v)} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: `1px solid ${GOLD_DIM}`, background: "#08101e" }}>
          <button onClick={() => setFilters(defaultFilters)}
            style={{ background: "none", border: "none", color: "#475569", fontSize: 14, cursor: "pointer", fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}>
            Limpar filtros
          </button>
          <button onClick={() => { onApply(filters); onClose(); }}
            style={{ padding: "11px 32px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: PLAYFAIR, transition: "background 0.2s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#e8bb47")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = GOLD)}>
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}
