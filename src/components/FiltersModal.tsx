"use client";
import { useState } from "react";

type Props = { onClose: () => void; onApply: (f: Filters) => void };

type Filters = {
  online: boolean;
  possuiAvaliacao: boolean;
  aceitaViajar: boolean;
  localProprio: boolean;
  idadeMin: number;
  idadeMax: number;
  precoMin: number;
  precoMax: number;
  atende: string[];
  grupos: string[];
  pagamento: string[];
  aparencia: { cabelo: string[]; olhos: string[]; etnia: string[]; tatuagem: string; silicone: string };
  servicos: string[];
  fetiches: string[];
  atendimento: string[];
};

const defaultFilters: Filters = {
  online: false, possuiAvaliacao: false, aceitaViajar: false, localProprio: false,
  idadeMin: 18, idadeMax: 60,
  precoMin: 50, precoMax: 1000,
  atende: [], grupos: [], pagamento: [],
  aparencia: { cabelo: [], olhos: [], etnia: [], tatuagem: "", silicone: "" },
  servicos: [], fetiches: [], atendimento: [],
};

type Section = "populares" | "localizacao" | "preferencias" | "aparencia" | "pagamento" | "servicos";

function Tag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${active ? "#cc0000" : "#2a2a2a"}`,
      background: active ? "rgba(204,0,0,0.12)" : "transparent", color: active ? "#fff" : "#888",
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
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#cc0000", fontWeight: 700, fontSize: 14 }}>{labelMin}</span>
        <span style={{ color: "#cc0000", fontWeight: 700, fontSize: 14 }}>{labelMax}</span>
      </div>
      <input type="range" min={min} max={max} value={valueMin}
        onChange={(e) => onChange(Number(e.target.value), valueMax)}
        style={{ width: "100%", accentColor: "#cc0000" }} />
      <input type="range" min={min} max={max} value={valueMax}
        onChange={(e) => onChange(valueMin, Number(e.target.value))}
        style={{ width: "100%", accentColor: "#cc0000", marginTop: 4 }} />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid #1e1e1e" }}>{children}</h3>;
}

function TagGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 16 }}>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 16, width: "100%", maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1e1e1e" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>Filtros avançados</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Sidebar */}
          <div style={{ width: 200, borderRight: "1px solid #1e1e1e", padding: "12px 0", overflowY: "auto", flexShrink: 0 }}>
            {sections.map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                width: "100%", padding: "11px 20px", textAlign: "left", background: section === s.id ? "rgba(204,0,0,0.1)" : "transparent",
                border: "none", borderLeft: `3px solid ${section === s.id ? "#cc0000" : "transparent"}`,
                color: section === s.id ? "#fff" : "#777", fontSize: 13, fontWeight: section === s.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s",
              }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

            {/* POPULARES */}
            {section === "populares" && (
              <div>
                <SectionTitle>Filtros rápidos</SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
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

            {/* LOCALIZAÇÃO */}
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

            {/* PREFERÊNCIAS */}
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

            {/* APARÊNCIA */}
            {section === "aparencia" && (
              <div>
                <SectionTitle>Cabelo</SectionTitle>
                <TagGroup items={["Loira(o)", "Morena(o)", "Ruiva(o)", "Castanho", "Colorido", "Preto", "Sem cabelo"]}
                  selected={filters.aparencia.cabelo} onToggle={(v) => toggleAparencia("cabelo", v)} />

                <SectionTitle>Cor dos olhos</SectionTitle>
                <TagGroup items={["Azul", "Castanho", "Verde", "Mel", "Cinza", "Preto"]}
                  selected={filters.aparencia.olhos} onToggle={(v) => toggleAparencia("olhos", v)} />

                <SectionTitle>Etnia</SectionTitle>
                <TagGroup items={["Branca", "Negra", "Parda", "Oriental", "Indígena", "Latina", "Outra"]}
                  selected={filters.aparencia.etnia} onToggle={(v) => toggleAparencia("etnia", v)} />

                <SectionTitle>Tatuagens</SectionTitle>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <Tag label="Sem tatuagens" active={filters.aparencia.tatuagem === "sem"} onClick={() => toggleAparencia("tatuagem", "sem")} />
                  <Tag label="Com tatuagens" active={filters.aparencia.tatuagem === "com"} onClick={() => toggleAparencia("tatuagem", "com")} />
                </div>

                <SectionTitle>Silicone</SectionTitle>
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  <Tag label="Sem silicone" active={filters.aparencia.silicone === "sem"} onClick={() => toggleAparencia("silicone", "sem")} />
                  <Tag label="Com silicone" active={filters.aparencia.silicone === "com"} onClick={() => toggleAparencia("silicone", "com")} />
                </div>
              </div>
            )}

            {/* PAGAMENTO */}
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

            {/* SERVIÇOS */}
            {section === "servicos" && (
              <div>
                <SectionTitle>Serviços</SectionTitle>
                <TagGroup
                  items={["Acompanhamento", "Jantar a dois", "Viagens", "Festas e eventos", "Massagem", "Massagem tântrica", "Ensaio fotográfico", "Vídeo chamada"]}
                  selected={filters.servicos} onToggle={(v) => toggleArr("servicos", v)} />

                <SectionTitle>Comportamento</SectionTitle>
                <TagGroup
                  items={["Ativo", "Passivo", "Versátil", "Gosta de comandar", "Gosta de ser comandado", "Permite filmagem", "Faz sexo virtual"]}
                  selected={filters.fetiches} onToggle={(v) => toggleArr("fetiches", v)} />

                <SectionTitle>Fetiches</SectionTitle>
                <TagGroup
                  items={["Striptease", "Dominação", "Roleplay", "Bondage", "Voyeurismo", "Podolatria", "Fantasias/uniformes", "Acessórios eróticos", "Squirt"]}
                  selected={filters.fetiches} onToggle={(v) => toggleArr("fetiches", v)} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid #1e1e1e" }}>
          <button onClick={() => setFilters(defaultFilters)}
            style={{ background: "none", border: "none", color: "#666", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
            Limpar filtros
          </button>
          <button onClick={() => { onApply(filters); onClose(); }}
            style={{ padding: "11px 28px", background: "#cc0000", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  );
}
