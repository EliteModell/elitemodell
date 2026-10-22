import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { AdminHeader, AdminPagination, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

function exactAccountLookup(query: string): Prisma.UserWhereInput | null {
  const value = query.trim();
  if (!value) return null;
  if (value.includes("@")) return { email: { equals: value.toLowerCase(), mode: "insensitive" } };
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  const national = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  const variants = new Set([digits, `+${digits}`, national, `55${national}`, `+55${national}`]);
  if (national.length === 11) {
    variants.add(`(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`);
    variants.add(`${national.slice(0, 2)} ${national.slice(2, 7)}-${national.slice(7)}`);
  }
  return { phone: { in: [...variants] } };
}

async function toggleClientBlock(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("clients:manage");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!id || !["block", "unblock"].includes(action)) return;

  await prisma.user.update({
    where: { id },
    data: {
      blocked: action === "block",
      blockReason: action === "block" ? reason || "Bloqueado pela administracao." : null,
      blockedAt: action === "block" ? new Date() : null,
    },
  });

  await logAudit({
    adminId: session.user.id,
    action: action === "block" ? "USER_BLOCKED" : "USER_UNBLOCKED",
    targetType: "USER",
    targetId: id,
    reason: reason || action,
  });
  revalidatePath("/admin/clientes");
}

export default async function AdminClientesPage({ searchParams }: { searchParams?: Promise<{ page?: string; q?: string }> }) {
  const { session } = await requireAdmin("clients:manage");
  const params = await searchParams;
  const query = params?.q?.trim().slice(0, 160) ?? "";
  const exactLookup = exactAccountLookup(query);
  const parsedPage = Number(params?.page ?? "1");
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const where: Prisma.UserWhereInput = exactLookup ?? { role: "GUEST", accountType: { not: "host" } };
  const [total, clients] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      clientStatus: true,
      blocked: true,
      blockReason: true,
      emailVerified: true,
      phoneVerified: true,
      phoneVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { provider: true } },
      sessions: { orderBy: { expires: "desc" }, take: 1, select: { expires: true } },
      phoneVerificationCodes: { orderBy: { createdAt: "desc" }, take: 1, select: { usedAt: true, sentAt: true, accountType: true } },
      professional: { select: {
        id: true, status: true, kycStatus: true, registrationSubmittedAt: true, lastOnlineAt: true,
        rejectReason: true, submissionReceipt: { select: { status: true, createdAt: true, sentAt: true } },
        _count: { select: { photos: true, profileEvents: true } },
      } },
      _count: { select: { favorites: true, reportsCreated: true, uploadedAssets: true } },
    },
  })]);

  if (query) {
    const lookupHash = createHash("sha256").update(query.toLowerCase()).digest("hex").slice(0, 16);
    await logAudit({
      adminId: session.user.id,
      action: "ADMIN_ACCESS",
      targetType: clients.length === 1 ? "USER" : "SYSTEM",
      targetId: clients.length === 1 ? clients[0].id : `account-lookup:${lookupHash}`,
      reason: "Consulta administrativa exata de conta por identificador.",
      changes: { lookupKind: query.includes("@") ? "email" : "phone", resultCount: clients.length },
    });
  }

  return (
    <div>
      <AdminHeader title="Clientes" subtitle="Lista operacional de clientes, verificação, favoritos e denúncias relacionadas." />
      <AdminPanel>
        <form method="get" action="/admin/clientes" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="q" defaultValue={query} aria-label="E-mail ou telefone exato" placeholder="E-mail ou telefone exato" style={{ flex: "1 1 280px", minWidth: 0, background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 10 }} />
          <button type="submit" style={buttonStyle}>Localizar conta</button>
        </form>
        {query && !exactLookup ? <p style={{ color: "#f59e0b" }}>Informe um e-mail completo ou telefone com DDD.</p> : null}
        {query && exactLookup && clients.length === 0 ? <p style={{ color: "#f59e0b" }}>Nenhuma conta encontrada com o identificador exato.</p> : null}
      </AdminPanel>
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Atividade</th>
              <th style={thStyle}>Cadastro</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={tdStyle}><strong>{client.name ?? "Sem nome"}</strong><br />{client.email}<br />{client.phone ?? "-"}</td>
                <td style={tdStyle}>
                  <StatusPill tone={client.blocked ? "danger" : client.clientStatus === "VERIFIED" ? "success" : "warning"}>
                    {client.blocked ? "BLOQUEADO" : client.clientStatus}
                  </StatusPill>
                  {client.blockReason ? <p style={{ color: "#ef4444", margin: "8px 0 0" }}>{client.blockReason}</p> : null}
                  {query ? <p style={{ margin: "8px 0 0", lineHeight: 1.55 }}>
                    Telefone confirmado: {client.phoneVerified ? "sim" : "não"}<br />
                    E-mail confirmado: {client.emailVerified ? "sim" : "não"}<br />
                    Perfil: {client.professional?.status ?? "não criado"}<br />
                    Rascunho: {client.professional?.status === "DRAFT" && !client.professional.registrationSubmittedAt ? "sim" : "não"}<br />
                    Envio formal: {client.professional?.registrationSubmittedAt ? client.professional.registrationSubmittedAt.toLocaleString("pt-BR") : "não"}<br />
                    KYC: {client.professional?.kycStatus ?? "não iniciado"}<br />
                    Fotos: {client.professional?._count.photos ?? 0}; uploads: {client._count.uploadedAssets}<br />
                    Autenticação: {client.accounts.map((account) => account.provider).join(", ") || "credencial local/telefone"}<br />
                    Última atividade registrada: {client.professional?.lastOnlineAt?.toLocaleString("pt-BR") ?? "não disponível"}<br />
                    Sessão mais recente expira: {client.sessions[0]?.expires.toLocaleString("pt-BR") ?? "sem sessão persistida"}<br />
                    Recibo de envio: {client.professional?.submissionReceipt?.status ?? "não existe"}
                  </p> : null}
                </td>
                <td style={tdStyle}>{client._count.favorites} favoritos<br />{client._count.reportsCreated} denuncias feitas</td>
                <td style={tdStyle}>{client.createdAt.toLocaleDateString("pt-BR")}</td>
                <td style={tdStyle}>
                  <form action={toggleClientBlock} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={client.id} />
                    <input name="reason" placeholder="Motivo" style={{ background: "#050506", border: "1px solid rgba(255,255,255,.14)", borderRadius: 8, color: "#fff", padding: 8 }} />
                    <button name="action" value={client.blocked ? "unblock" : "block"} style={{ ...buttonStyle, color: client.blocked ? "#22c55e" : "#ef4444" }}>
                      {client.blocked ? "Reativar" : "Bloquear"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        {!query ? <AdminPagination basePath="/admin/clientes" page={page} pageSize={PAGE_SIZE} total={total} /> : null}
      </AdminPanel>
    </div>
  );
}
