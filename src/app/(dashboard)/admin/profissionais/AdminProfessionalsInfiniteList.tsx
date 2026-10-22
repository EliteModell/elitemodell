"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminProfessionalCard, type AdminProfessionalRecord } from "./AdminProfessionalCard";

type AuditEntry = {
  id: string;
  action: string;
  reason: string | null;
  changes: unknown;
  actorIdentifier: string | null;
  timestamp: Date;
  admin: { name: string | null; email: string } | null;
};

export type AdminProfessionalListItem = {
  professional: AdminProfessionalRecord;
  profileIssues: string[];
  approvalIssues: string[];
  audits: AuditEntry[];
};

type Filters = {
  status?: string;
  access?: string;
  kyc?: string;
  query?: string;
  professionalId?: string;
  snapshotAt: string;
};

export function AdminProfessionalsInfiniteList({
  initialItems,
  total,
  filters,
  billingEnabled,
  loadMoreAction,
  reviewAction,
}: {
  initialItems: AdminProfessionalListItem[];
  total: number;
  filters: Filters;
  billingEnabled: boolean;
  loadMoreAction: (input: Filters & { offset: number }) => Promise<{ items: AdminProfessionalListItem[]; hasMore: boolean }>;
  reviewAction: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialItems.length < total);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestInFlightRef = useRef(false);
  const offsetRef = useRef(initialItems.length);

  const loadMore = useCallback(async () => {
    if (!hasMore || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setLoading(true);
    try {
      const result = await loadMoreAction({ ...filters, offset: offsetRef.current });
      offsetRef.current += result.items.length;
      setItems((current) => {
        const known = new Set(current.map((item) => item.professional.id));
        const next = result.items.filter((item) => !known.has(item.professional.id));
        return [...current, ...next];
      });
      setHasMore(result.hasMore && result.items.length > 0);
      setLoadError(false);
    } catch {
      setLoadError(true);
      setHasMore(false);
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }, [filters, hasMore, loadMoreAction]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="admin-professionals-list">
        {items.map((item) => (
          <AdminProfessionalCard
            key={item.professional.id}
            professional={item.professional}
            profileIssues={item.profileIssues}
            approvalIssues={item.approvalIssues}
            audits={item.audits}
            reviewAction={reviewAction}
            billingEnabled={billingEnabled}
          />
        ))}
        {!items.length ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#756e79", fontSize: 14 }}>
            Nenhuma profissional encontrada para estes filtros.
          </div>
        ) : null}
      </div>
      <div ref={sentinelRef} aria-live="polite" style={{ minHeight: 48, display: "grid", placeItems: "center", color: "#756e79", fontSize: 13 }}>
        {loading ? "Carregando profissionais..." : loadError ? "Não foi possível carregar mais profissionais. Recarregue a página para tentar novamente." : hasMore ? "" : items.length ? `Todos os ${items.length.toLocaleString("pt-BR")} registros foram carregados.` : ""}
      </div>
    </>
  );
}
