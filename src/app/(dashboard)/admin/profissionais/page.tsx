"use client";
import { useState } from "react";
import toast from "react-hot-toast";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";
const GOLD_MID = "rgba(212,168,67,0.28)";

const mockProfessionals = [
  {
    id: "p1", displayName: "Lora", slug: "lora", city: "São Paulo", state: "SP",
    category: "MULHER", age: 27,
    status: "ACTIVE", verified: true, docStatus: "APPROVED", verifStatus: "APPROVED",
    rating: 5.0, totalReviews: 42, createdAt: "2024-11-10",
    mainPhoto: "/model.jpeg", docType: "CNH",
    verificationCode: "ABCD-1234", verificationUrl: "/model.jpeg", verificationType: "foto",
    rejectReason: "", docFrenteUrl: "documentos/mock/frente.jpg", docVersoUrl: "documentos/mock/verso.jpg",
  },
  {
    id: "p2", displayName: "Amanda R.", slug: "amanda-r", city: "São Paulo", state: "SP",
    category: "MULHER", age: 26,
    status: "ACTIVE", verified: true, docStatus: "APPROVED", verifStatus: "APPROVED",
    rating: 4.9, totalReviews: 87, createdAt: "2024-10-05",
    mainPhoto: "/model1.jpg", docType: "RG / DNI",
    verificationCode: "EFGH-5678", verificationUrl: "/model1.jpg", verificationType: "foto",
    rejectReason: "", docFrenteUrl: "documentos/mock/frente.jpg", docVersoUrl: "documentos/mock/verso.jpg",
  },
  {
    id: "p3", displayName: "Valentina S.", slug: "valentina-s", city: "Rio de Janeiro", state: "RJ",
    category: "TRANS", age: 24,
    status: "PENDING_REVIEW", verified: false, docStatus: "PENDING", verifStatus: "PENDING",
    rating: 0, totalReviews: 0, createdAt: "2025-05-08",
    mainPhoto: "/model2.jpg", docType: "CNH",
    verificationCode: "XKPR-9021", verificationUrl: "/model2.jpg", verificationType: "foto",
    rejectReason: "", docFrenteUrl: "documentos/mock/frente.jpg", docVersoUrl: "documentos/mock/verso.jpg",
  },
  {
    id: "p4", displayName: "Carlos M.", slug: "carlos-m", city: "Curitiba", state: "PR",
    category: "HOMEM", age: 30,
    status: "PENDING_REVIEW", verified: false, docStatus: "PENDING", verifStatus: "NOT_SENT",
    rating: 0, totalReviews: 0, createdAt: "2025-05-09",
    mainPhoto: "", docType: "Passaporte",
    verificationCode: "MNTQ-4432", verificationUrl: "", verificationType: "foto",
    rejectReason: "", docFrenteUrl: "documentos/mock/frente.jpg", docVersoUrl: "documentos/mock/verso.jpg",
  },
  {
    id: "p5", displayName: "Ana B.", slug: "ana-b", city: "Belo Horizonte", state: "MG",
    category: "MULHER", age: 29,
    status: "SUSPENDED", verified: false, docStatus: "REJECTED", verifStatus: "REJECTED",
    rating: 3.5, totalReviews: 5, createdAt: "2024-09-15",
    mainPhoto: "/model1.jpg", docType: "RG / DNI",
    verificationCode: "ZPLW-8810", verificationUrl: "/model1.jpg", verificationType: "foto",
    rejectReason: "Documento com data de emissão ilegível.",
    docFrenteUrl: "documentos/mock/frente.jpg", docVersoUrl: "documentos/mock/verso.jpg",
  },
];

type Prof = typeof mockProfessionals[0];

const statusMap: Record<string, { color: string; label: string; bg: string }> = {
  ACTIVE:         { color: "#22c55e", label: "Ativo",    bg: "rgba(34,197,94,0.1)" },
  PENDING_REVIEW: { color: "#f59e0b", label: "Pendente", bg: "rgba(245,158,11,0.1)" },
  SUSPENDED:      { color: "#ef4444", label: "Suspenso", bg: "rgba(239,68,68,0.1)" },
  REJECTED:       { color: "#64748b", label: "Rejeitado",bg: "rgba(100,116,139,0.1)" },
};

const docStatusMap: Record<string, { color: string; label: string }> = {
  APPROVED:  { color: "#22c55e", label: "✓ Doc aprovado" },
  PENDING:   { color: "#f59e0b", label: "⏳ Aguardando" },
  REJECTED:  { color: "#ef4444", label: "✗ Rejeitado" },
  NOT_SENT:  { color: "#64748b", label: "— Não enviado" },
};

export default function AdminProfissionaisPage() {
  const [professionals, setProfessionals] = useState(mockProfessionals);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<Prof | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [docModal, setDocModal] = useState<Prof | null>(null);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [signedVerifUrl, setSignedVerifUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadingVerif, setLoadingVerif] = useState(false);

  const filtered = professionals.filter((p) => {
    const matchSearch = !search || p.displayName.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "ALL" || p.status === filter || (filter === "PENDING_DOC" && p.docStatus === "PENDING");
    return matchSearch && matchFilter;
  });

  function updateStatus(id: string, status: string) {
    setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, status, verified: status === "ACTIVE" } : p));
    if (selected?.id === id) setSelected(s => s ? { ...s, status, verified: status === "ACTIVE" } : s);
    const labels: Record<string, string> = { ACTIVE: "aprovado", SUSPENDED: "suspenso", REJECTED: "rejeitado" };
    toast.success(`Perfil ${labels[status] ?? "atualizado"}.`);
  }

  function approveDoc(id: string) {
    setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, docStatus: "APPROVED", verifStatus: "APPROVED", status: "ACTIVE", verified: true } : p));
    if (selected?.id === id) setSelected(s => s ? { ...s, docStatus: "APPROVED", verifStatus: "APPROVED", status: "ACTIVE", verified: true } : s);
    setDocModal(null);
    toast.success("Documentos aprovados! Perfil ativado.");
  }

  function isPrivateStoragePath(path?: string) {
    return !!path && !path.startsWith("http") && !path.startsWith("/");
  }

  async function loadSignedDoc(path: string, target: "doc" | "verif" = "doc") {
    if (target === "doc") {
      setLoadingDoc(true);
      setSignedDocUrl(null);
    } else {
      setLoadingVerif(true);
      setSignedVerifUrl(null);
    }
    try {
      const res = await fetch(`/api/admin/documento?path=${encodeURIComponent(path)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (target === "doc") {
        setSignedDocUrl(d.url);
        setTimeout(() => setSignedDocUrl(null), 58000); // expira em 58s
      } else {
        setSignedVerifUrl(d.url);
        setTimeout(() => setSignedVerifUrl(null), 58000);
      }
    } catch { toast.error("Erro ao carregar documento."); }
    finally {
      if (target === "doc") setLoadingDoc(false);
      else setLoadingVerif(false);
    }
  }

  function rejectDoc(id: string) {
    if (!rejectReason.trim()) { toast.error("Informe o motivo da rejeição."); return; }
    setProfessionals((prev) => prev.map((p) => p.id === id ? { ...p, docStatus: "REJECTED", verifStatus: "REJECTED", status: "REJECTED", rejectReason } : p));
    if (selected?.id === id) setSelected(s => s ? { ...s, docStatus: "REJECTED", verifStatus: "REJECTED", status: "REJECTED", rejectReason } : s);
    setDocModal(null);
    setRejectReason("");
    toast.success("Documentos rejeitados. Profissional será notificada.");
  }

  const tabs = [
    { key: "ALL", label: "Todos", count: professionals.length },
    { key: "PENDING_REVIEW", label: "Pendentes", count: professionals.filter(p => p.status === "PENDING_REVIEW").length },
    { key: "PENDING_DOC", label: "Doc pendente", count: professionals.filter(p => p.docStatus === "PENDING").length },
    { key: "ACTIVE", label: "Ativos", count: professionals.filter(p => p.status === "ACTIVE").length },
    { key: "SUSPENDED", label: "Suspensos", count: professionals.filter(p => p.status === "SUSPENDED").length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 6px" }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>Profissionais</h1>
          <p style={{ color: "#475569", fontSize: 13, margin: "4px 0 0" }}>Aprovar, moderar e verificar perfis e documentos.</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }} className="admin-stats-grid">
        {[
          { label: "Total", value: professionals.length, color: "#f1f5f9" },
          { label: "Pendentes", value: professionals.filter(p => p.status === "PENDING_REVIEW").length, color: "#f59e0b" },
          { label: "Doc pendente", value: professionals.filter(p => p.docStatus === "PENDING").length, color: GOLD },
          { label: "Ativos", value: professionals.filter(p => p.status === "ACTIVE").length, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#0b1420", border: `1px solid rgba(212,168,67,0.15)`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou cidade..."
            style={{ width: "100%", padding: "9px 12px 9px 32px", background: "#0b1420", border: "1px solid #1e293b", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: "8px 12px", background: filter === t.key ? GOLD_DIM : "#0b1420", border: `1.5px solid ${filter === t.key ? GOLD_MID : "#1e293b"}`, borderRadius: 8, color: filter === t.key ? GOLD : "#475569", fontSize: 12, fontWeight: filter === t.key ? 700 : 400, cursor: "pointer", display: "flex", gap: 5, alignItems: "center" }}>
              {t.label}
              {t.count > 0 && <span style={{ background: filter === t.key ? GOLD_MID : "#1e293b", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Layout split: lista + detalhe */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 16 }} className="admin-pro-grid">
        {/* Lista */}
        <div style={{ background: "#0b1420", border: `1px solid rgba(212,168,67,0.12)`, borderRadius: 12, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Nenhum profissional encontrado.</div>
          ) : (
            filtered.map((p) => {
              const s = statusMap[p.status] ?? statusMap.REJECTED;
              const ds = docStatusMap[p.docStatus];
              const isSelected = selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(isSelected ? null : p)}
                  style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: `1px solid rgba(212,168,67,0.08)`, cursor: "pointer", background: isSelected ? GOLD_DIM : "transparent", transition: "background 0.15s", alignItems: "center" }}
                >
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#060e1b", border: `1px solid ${isSelected ? GOLD_MID : "#1e293b"}` }}>
                    {p.mainPhoto ? <img src={p.mainPhoto} alt={p.displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "38% top" }} /> :
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: GOLD }}>{p.displayName[0]}</div>
                    }
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.displayName}</span>
                      {p.verified && <span style={{ fontSize: 10, background: GOLD_DIM, color: GOLD, padding: "1px 6px", borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{p.city}, {p.state} · {p.category} · {p.age}a</div>
                    <div style={{ fontSize: 11, color: ds.color, marginTop: 2 }}>{ds.label}</div>
                  </div>
                  {/* Status */}
                  <div>
                    <span style={{ padding: "3px 8px", background: s.bg, color: s.color, borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Painel detalhe */}
        {selected && (
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 12, padding: "20px", overflowY: "auto", maxHeight: 700 }}>
            {/* Header do detalhe */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 50, height: 50, borderRadius: 10, overflow: "hidden", background: "#060e1b", flexShrink: 0 }}>
                  {selected.mainPhoto ? <img src={selected.mainPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "38% top" }} /> :
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: GOLD }}>{selected.displayName[0]}</div>
                  }
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{selected.displayName}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{selected.city}, {selected.state}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
            </div>

            {/* Status atual */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                ["Status", statusMap[selected.status]?.label ?? selected.status],
                ["Categoria", selected.category],
                ["Idade", `${selected.age} anos`],
                ["Cadastro", new Date(selected.createdAt).toLocaleDateString("pt-BR")],
                ["Documento", selected.docType || "—"],
                ["Cód. verif.", selected.verificationCode],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#060e1b", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Doc status */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: "10px 12px", background: "#060e1b", borderRadius: 8, border: `1px solid ${docStatusMap[selected.docStatus].color}30` }}>
                <div style={{ fontSize: 10, color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Documentos</div>
                <div style={{ fontSize: 12, color: docStatusMap[selected.docStatus].color, fontWeight: 700 }}>{docStatusMap[selected.docStatus].label}</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", background: "#060e1b", borderRadius: 8, border: `1px solid ${docStatusMap[selected.verifStatus]?.color ?? "#334155"}30` }}>
                <div style={{ fontSize: 10, color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Verificação</div>
                <div style={{ fontSize: 12, color: docStatusMap[selected.verifStatus]?.color ?? "#334155", fontWeight: 700 }}>
                  {selected.verificationUrl ? (docStatusMap[selected.verifStatus]?.label ?? "—") : "— Não enviada"}
                </div>
              </div>
            </div>

            {/* Mídia de verificação */}
            {selected.verificationUrl && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Mídia de verificação</div>
                <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${GOLD_MID}` }}>
                  {selected.verificationType === "biometria" ? (
                    <div style={{ padding: "14px", background: "#060e1b", color: GOLD, fontSize: 12, fontWeight: 700 }}>
                      Biometria facial iniciada: {selected.verificationUrl}
                    </div>
                  ) : selected.verificationType === "foto" ? (
                    <img src={selected.verificationUrl} alt="verificação" style={{ width: "100%", maxHeight: 180, objectFit: "cover", objectPosition: "center top", display: "block" }} />
                  ) : (
                    <video src={selected.verificationUrl} controls style={{ width: "100%", maxHeight: 180 }} />
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Código esperado: <strong style={{ color: GOLD }}>{selected.verificationCode}</strong></div>
              </div>
            )}

            {/* Motivo rejeição se houver */}
            {selected.rejectReason && (
              <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 2 }}>Motivo da rejeição</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{selected.rejectReason}</div>
              </div>
            )}

            {/* Ações */}
            {selected.status === "PENDING_REVIEW" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => setDocModal(selected)}
                  style={{ padding: "11px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                  Revisar documentos e aprovar
                </button>
                <button onClick={() => { setRejectReason(""); setDocModal({ ...selected, _reject: true } as any); }}
                  style={{ padding: "11px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Rejeitar documentos
                </button>
              </div>
            )}
            {selected.status === "ACTIVE" && (
              <button onClick={() => updateStatus(selected.id, "SUSPENDED")}
                style={{ width: "100%", padding: "11px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Suspender perfil
              </button>
            )}
            {(selected.status === "SUSPENDED" || selected.status === "REJECTED") && (
              <button onClick={() => updateStatus(selected.id, "ACTIVE")}
                style={{ width: "100%", padding: "11px", background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Reativar perfil
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal aprovação/rejeição de doc ── */}
      {docModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0b1420", border: `1px solid ${GOLD_MID}`, borderRadius: 16, padding: "28px 24px", maxWidth: 480, width: "100%", position: "relative" }}>
            <button onClick={() => { setDocModal(null); setRejectReason(""); setSignedDocUrl(null); setSignedVerifUrl(null); }} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20 }}>×</button>

            {!(docModal as any)._reject ? (
              <>
                <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Revisar documentos — {docModal.displayName}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Documento ({docModal.docType})</div>
                    <div style={{ background: "#060e1b", borderRadius: 8, minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${GOLD_MID}`, overflow: "hidden" }}>
                      {signedDocUrl ? (
                        <img src={signedDocUrl} alt="documento" style={{ width: "100%", maxHeight: 200, objectFit: "contain" }} />
                      ) : (
                        <div style={{ textAlign: "center", padding: 16 }}>
                          <p style={{ color: "#475569", fontSize: 12, margin: "0 0 10px" }}>🔒 Documento criptografado</p>
                          <button onClick={() => docModal?.docFrenteUrl && loadSignedDoc(docModal.docFrenteUrl)} disabled={loadingDoc}
                            style={{ padding: "8px 16px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {loadingDoc ? "Carregando..." : "🔓 Ver documento (60s)"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {docModal.verificationUrl && (
                    <div>
                      <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Mídia de verificação</div>
                      <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${GOLD_MID}` }}>
                        {docModal.verificationType === "biometria" ? (
                          <div style={{ padding: "14px", background: "#060e1b", color: GOLD, fontSize: 12, fontWeight: 700 }}>
                            Biometria facial iniciada
                          </div>
                        ) : isPrivateStoragePath(docModal.verificationUrl) && !signedVerifUrl ? (
                          <div style={{ minHeight: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060e1b", padding: 16 }}>
                            <p style={{ color: "#475569", fontSize: 12, margin: "0 0 10px" }}>🔒 Verificacao facial privada</p>
                            <button onClick={() => docModal?.verificationUrl && loadSignedDoc(docModal.verificationUrl, "verif")} disabled={loadingVerif}
                              style={{ padding: "8px 16px", background: GOLD_DIM, border: `1px solid ${GOLD_MID}`, borderRadius: 8, color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              {loadingVerif ? "Carregando..." : "🔓 Ver midia (60s)"}
                            </button>
                          </div>
                        ) : docModal.verificationType === "video" ? (
                          <video src={signedVerifUrl ?? docModal.verificationUrl} controls style={{ width: "100%", maxHeight: 220, display: "block" }} />
                        ) : (
                          <img src={signedVerifUrl ?? docModal.verificationUrl} alt="verif" style={{ width: "100%", height: 120, objectFit: "cover", objectPosition: "center top", display: "block" }} />
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Código: <strong style={{ color: GOLD }}>{docModal.verificationCode}</strong></div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => approveDoc(docModal.id)}
                    style={{ flex: 1, padding: "12px", background: GOLD, color: "#060e1b", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    ✓ Aprovar e Ativar perfil
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Rejeitar documentos</h3>
                <p style={{ color: "#475569", fontSize: 13, margin: "0 0 16px" }}>Informe o motivo para que a profissional possa corrigir e reenviar.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Motivo da rejeição</label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                    style={{ width: "100%", padding: "12px 14px", background: "#060e1b", border: "1px solid #1e293b", borderRadius: 10, color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical" }}
                    placeholder="Ex: Documento com data de emissão ilegível. Por favor reenvie com melhor qualidade." />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setDocModal(null); setRejectReason(""); }}
                    style={{ flex: 1, padding: "11px", background: "transparent", border: `1px solid #1e293b`, borderRadius: 8, color: "#475569", fontSize: 13, cursor: "pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={() => rejectDoc(docModal.id)}
                    style={{ flex: 1, padding: "11px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ✗ Confirmar rejeição
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .admin-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .admin-pro-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
