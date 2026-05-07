"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const mockProfessionals = [
  { id: "p1", displayName: "Juliana Oliveira", slug: "juliana-oliveira", city: "São Paulo", specialties: ["Modelo Fotográfico", "Editorial"], status: "ACTIVE", verified: true, rating: 4.9, totalReviews: 38, createdAt: "2024-11-10" },
  { id: "p2", displayName: "Carlos Mendes", slug: "carlos-mendes-foto", city: "São Paulo", specialties: ["Fotógrafo"], status: "ACTIVE", verified: true, rating: 4.8, totalReviews: 61, createdAt: "2024-10-05" },
  { id: "p3", displayName: "Maria Novata", slug: "maria-novata", city: "Rio de Janeiro", specialties: ["Modelo Fitness"], status: "PENDING_REVIEW", verified: false, rating: 0, totalReviews: 0, createdAt: "2024-12-09" },
  { id: "p4", displayName: "Rafael Tentativa", slug: "rafael-tentativa", city: "Curitiba", specialties: ["Influencer"], status: "PENDING_REVIEW", verified: false, rating: 0, totalReviews: 0, createdAt: "2024-12-10" },
  { id: "p5", displayName: "Ana Beta", slug: "ana-beta", city: "Belo Horizonte", specialties: ["Make Artist"], status: "SUSPENDED", verified: false, rating: 3.5, totalReviews: 5, createdAt: "2024-09-15" },
];

const statusMap: Record<string, { color: string; label: string; bg: string }> = {
  ACTIVE:         { color: "#00cc66", label: "Ativo",          bg: "rgba(0,204,102,0.1)" },
  PENDING_REVIEW: { color: "#ccaa00", label: "Pendente",       bg: "rgba(204,170,0,0.1)" },
  SUSPENDED:      { color: "#cc4444", label: "Suspenso",       bg: "rgba(204,68,68,0.1)" },
  REJECTED:       { color: "#555",    label: "Rejeitado",      bg: "rgba(85,85,85,0.1)" },
  DRAFT:          { color: "#555",    label: "Rascunho",       bg: "rgba(85,85,85,0.1)" },
};

export default function AdminProfissionaisPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [professionals, setProfessionals] = useState(mockProfessionals);

  const filtered = professionals.filter((p) => {
    const matchSearch = !search || p.displayName.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || p.status === filter;
    return matchSearch && matchFilter;
  });

  function updateStatus(id: string, status: string) {
    setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, status, verified: status === "ACTIVE" } : p));
    const labels: Record<string, string> = { ACTIVE: "aprovado", SUSPENDED: "suspenso", REJECTED: "rejeitado" };
    toast.success(`Perfil ${labels[status] ?? "atualizado"}.`);
  }

  const tabs = [
    { key: "ALL", label: "Todos" },
    { key: "PENDING_REVIEW", label: "Pendentes" },
    { key: "ACTIVE", label: "Ativos" },
    { key: "SUSPENDED", label: "Suspensos" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Profissionais</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Aprovar, suspender e moderar perfis profissionais.</p>
      </div>

      {/* Stats quick */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }} className="admin-pro-stats">
        {[
          { label: "Total", value: professionals.length },
          { label: "Pendentes", value: professionals.filter((p) => p.status === "PENDING_REVIEW").length, alert: true },
          { label: "Ativos", value: professionals.filter((p) => p.status === "ACTIVE").length },
          { label: "Suspensos", value: professionals.filter((p) => p.status === "SUSPENDED").length },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: `1px solid ${s.alert && s.value > 0 ? "#cc000040" : "#1e1e1e"}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.alert && s.value > 0 ? "#cc0000" : "#fff" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar profissional..."
            style={{ width: "100%", padding: "9px 12px 9px 32px", background: "#111", border: "1px solid #222", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#222")} />
        </div>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: "9px 14px", background: filter === t.key ? "rgba(204,0,0,0.12)" : "#111", border: `1.5px solid ${filter === t.key ? "#cc0000" : "#1e1e1e"}`, borderRadius: 8, color: filter === t.key ? "#fff" : "#777", fontSize: 13, fontWeight: filter === t.key ? 700 : 400, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
              {["Profissional", "Especialidades", "Cidade", "Avaliação", "Status", "Ações"].map((h) => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const s = statusMap[p.status] ?? statusMap.DRAFT;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #141414" }}>
                  <td style={{ padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#cc0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {p.displayName[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{p.displayName}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.specialties.slice(0, 2).map((sp) => (
                        <span key={sp} style={{ padding: "2px 8px", background: "rgba(204,0,0,0.08)", border: "1px solid rgba(204,0,0,0.2)", borderRadius: 20, fontSize: 11, color: "#cc4444" }}>{sp}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "14px", fontSize: 13, color: "#888" }}>{p.city}</td>
                  <td style={{ padding: "14px", fontSize: 13, color: "#ccc" }}>
                    {p.totalReviews > 0 ? <span><span style={{ color: "#cc0000" }}>★</span> {p.rating} ({p.totalReviews})</span> : <span style={{ color: "#444" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px" }}>
                    <span style={{ padding: "3px 10px", background: s.bg, color: s.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {p.status === "PENDING_REVIEW" && (
                        <>
                          <button onClick={() => updateStatus(p.id, "ACTIVE")} style={{ padding: "5px 10px", background: "rgba(0,200,100,0.1)", border: "1px solid #00cc66", borderRadius: 6, color: "#00cc66", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✓ Aprovar</button>
                          <button onClick={() => updateStatus(p.id, "REJECTED")} style={{ padding: "5px 10px", background: "rgba(204,0,0,0.1)", border: "1px solid #cc0000", borderRadius: 6, color: "#cc4444", fontSize: 11, cursor: "pointer" }}>✗ Rejeitar</button>
                        </>
                      )}
                      {p.status === "ACTIVE" && (
                        <button onClick={() => updateStatus(p.id, "SUSPENDED")} style={{ padding: "5px 10px", background: "rgba(204,170,0,0.08)", border: "1px solid #ccaa00", borderRadius: 6, color: "#ccaa00", fontSize: 11, cursor: "pointer" }}>Suspender</button>
                      )}
                      {(p.status === "SUSPENDED" || p.status === "REJECTED") && (
                        <button onClick={() => updateStatus(p.id, "ACTIVE")} style={{ padding: "5px 10px", background: "rgba(0,200,100,0.08)", border: "1px solid #00cc66", borderRadius: 6, color: "#00cc66", fontSize: 11, cursor: "pointer" }}>Reativar</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#555", fontSize: 14 }}>Nenhum profissional encontrado.</div>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-pro-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}
