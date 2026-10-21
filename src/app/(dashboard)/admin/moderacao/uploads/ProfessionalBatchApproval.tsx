"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type BatchAsset = {
  id: string;
  originalName: string;
  previewUrl: string;
  malwareStatus: string;
  ageIdentityStatus: string;
  consentStatus: string;
};

function ApprovalButton({ selectedCount }: { selectedCount: number }) {
  const { pending } = useFormStatus();
  const disabled = pending || selectedCount === 0;
  const title = selectedCount === 0
    ? "Selecione ao menos uma foto elegível e informe a justificativa."
    : "A decisão será revalidada no servidor antes de qualquer publicação.";

  return (
    <button
      type="submit"
      disabled={disabled}
      title={title}
      style={{
        border: 0,
        borderRadius: 8,
        background: "#b72cff",
        color: "#080704",
        padding: "11px 14px",
        fontWeight: 950,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {pending ? "Validando e aprovando…" : `Aprovar ${selectedCount} foto(s) selecionada(s)`}
    </button>
  );
}

export function ProfessionalBatchApproval({
  professionalId,
  assets,
  action,
}: {
  professionalId: string;
  assets: BatchAsset[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = assets.length > 0 && selected.length === assets.length;

  if (!assets.length) {
    return (
      <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>
        Aprovação em lote desabilitada: nenhuma foto desta profissional passou por todos os controles obrigatórios.
      </p>
    );
  }

  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="professionalId" value={professionalId} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "#b4adb0", fontSize: 13 }}>
          Habilitadas: foto de perfil, upload concluído, AV limpo, titular maior e identificada, consentimento registrado, cadastro elegível, nenhuma denúncia e todas as pessoas retratadas verificadas.
        </p>
        <button
          type="button"
          onClick={() => setSelected(allSelected ? [] : assets.map((asset) => asset.id))}
          style={{ border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, background: "transparent", color: "#fff", padding: "8px 11px", fontWeight: 800 }}
        >
          {allSelected ? "Limpar seleção" : "Selecionar todas as elegíveis"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {assets.map((asset) => (
          <label key={asset.id} style={{ display: "grid", gap: 8, padding: 10, border: "1px solid rgba(183,44,255,.35)", borderRadius: 10, background: "#09080a", cursor: "pointer" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- protected dynamic admin preview */}
            <img src={asset.previewUrl} alt={`Revisar ${asset.originalName}`} style={{ width: "100%", height: 190, objectFit: "contain", background: "#050506", borderRadius: 7 }} />
            <span style={{ color: "#fff", fontWeight: 850, overflowWrap: "anywhere" }}>{asset.originalName}</span>
            <span style={{ color: "#b4adb0", fontSize: 12 }}>
              AV {asset.malwareStatus} · idade {asset.ageIdentityStatus} · consentimento {asset.consentStatus}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#e9d5ff", fontWeight: 800 }}>
              <input
                type="checkbox"
                name="assetIds"
                value={asset.id}
                checked={selectedSet.has(asset.id)}
                onChange={(event) => setSelected((current) => event.target.checked
                  ? [...current, asset.id]
                  : current.filter((id) => id !== asset.id))}
              />
              Revisada visualmente e aprovada
            </span>
          </label>
        ))}
      </div>
      <input
        name="reason"
        minLength={8}
        required
        placeholder="Justificativa obrigatória da revisão humana em lote"
        style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, background: "#050506", color: "#fff", padding: 11 }}
      />
      <ApprovalButton selectedCount={selected.length} />
    </form>
  );
}
