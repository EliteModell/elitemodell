import { revalidatePath } from "next/cache";
import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { logAudit } from "@/lib/audit";
import { ensureDailyPrizeStock, ensureVoucherDefaults, getBudgetStats, monthRange, todayRange, updateExpiredVouchers, VOUCHER_STATUS_LABEL, weekRange } from "@/lib/voucher-roulette";
import { AdminHeader, AdminPanel, AdminTable, StatCard, StatusPill, adminColors, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

function intField(formData: FormData, name: string, fallback = 0) {
  const value = Number.parseInt(String(formData.get(name) ?? ""), 10);
  return Number.isFinite(value) ? value : fallback;
}

function floatField(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function money(value?: number | null) {
  if (value == null) return "-";
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function statusTone(status: string): "neutral" | "warning" | "success" | "danger" {
  if (status === "AVAILABLE" || status === "USED") return "success";
  if (status === "AWAITING_REGISTRATION") return "warning";
  if (status === "CANCELLED" || status === "EXPIRED") return "danger";
  return "neutral";
}

function periodRange(period: string | undefined, now = new Date()) {
  if (period === "week") return { label: "semana", ...weekRange(now) };
  if (period === "month") return { label: "mês", ...monthRange(now) };
  return { label: "hoje", ...todayRange(now) };
}

async function updateSettings(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("vouchers:manage");
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthlyLimit = floatField(formData, "monthlyBudgetLimit") ?? 3000;
  const dailyLimit = floatField(formData, "dailyBudgetLimit") ?? 100;
  const promotionAuthorizationReference = String(
    formData.get("promotionAuthorizationReference") ?? "",
  ).trim() || null;
  const requestedActive = formData.get("active") === "on";
  const active = requestedActive;

  await prisma.$transaction([
    prisma.voucherSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        active,
        promotionAuthorizationReference,
        dailySpinLimit: intField(formData, "dailySpinLimit", 1),
        guestDailySpinLimit: intField(formData, "guestDailySpinLimit", 1),
        pendingClaimMinutes: intField(formData, "pendingClaimMinutes", 30),
        defaultExpiresInDays: intField(formData, "defaultExpiresInDays", 15),
        monthlyBudgetLimit: monthlyLimit,
        dailyBudgetLimit: dailyLimit,
        dailyBudgetMode: String(formData.get("dailyBudgetMode") ?? "BLOCK_FREE_VOUCHERS"),
        voucherWinCooldownDays: intField(formData, "voucherWinCooldownDays", 7),
        blockMultipleActiveVouchers: formData.get("blockMultipleActiveVouchers") === "on",
        registrationClaimHours: intField(formData, "registrationClaimHours", 24),
        allowMultipleVouchersPerAppointment: formData.get("allowMultipleVouchersPerAppointment") === "on",
      },
      update: {
        active,
        promotionAuthorizationReference,
        dailySpinLimit: intField(formData, "dailySpinLimit", 1),
        guestDailySpinLimit: intField(formData, "guestDailySpinLimit", 1),
        pendingClaimMinutes: intField(formData, "pendingClaimMinutes", 30),
        defaultExpiresInDays: intField(formData, "defaultExpiresInDays", 15),
        monthlyBudgetLimit: monthlyLimit,
        dailyBudgetLimit: dailyLimit,
        dailyBudgetMode: String(formData.get("dailyBudgetMode") ?? "BLOCK_FREE_VOUCHERS"),
        voucherWinCooldownDays: intField(formData, "voucherWinCooldownDays", 7),
        blockMultipleActiveVouchers: formData.get("blockMultipleActiveVouchers") === "on",
        registrationClaimHours: intField(formData, "registrationClaimHours", 24),
        allowMultipleVouchersPerAppointment: formData.get("allowMultipleVouchersPerAppointment") === "on",
      },
    }),
    prisma.voucherBudget.upsert({
      where: { month_year: { month, year } },
      create: {
        id: `voucher-budget-${year}-${month}`,
        month,
        year,
        monthlyLimit,
        dailyLimit,
        active: formData.get("budgetActive") === "on",
      },
      update: {
        monthlyLimit,
        dailyLimit,
        active: formData.get("budgetActive") === "on",
      },
    }),
  ]);

  await logAudit({
    adminId: session.user.id,
    action: "SETTINGS_CHANGED",
    targetType: "SYSTEM",
    targetId: "voucher-roulette",
    reason: requestedActive && !promotionAuthorizationReference
      ? "Roleta ativada sem referencia promocional por decisao administrativa aprovada em reuniao interna"
      : "Orcamento e configuracao da roleta atualizados",
  });
  revalidatePath("/admin/roleta-vouchers");
}

async function updatePrize(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("vouchers:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const probability = floatField(formData, "probability") ?? 0;

  await prisma.voucherPrize.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim() || "Prêmio",
      type: String(formData.get("type") ?? "TRY_AGAIN"),
      value: floatField(formData, "value"),
      probability,
      baseProbability: probability,
      currentProbability: probability,
      active: formData.get("active") === "on",
      requiresPayment: false,
      paymentAmount: null,
      monthlyQuantityLimit: formData.get("monthlyQuantityLimit") ? intField(formData, "monthlyQuantityLimit") : null,
      dailyQuantityLimit: formData.get("dailyQuantityLimit") ? intField(formData, "dailyQuantityLimit") : null,
      weeklyQuantityLimit: formData.get("weeklyQuantityLimit") ? intField(formData, "weeklyQuantityLimit") : null,
      expiresInHours: formData.get("expiresInHours") ? intField(formData, "expiresInHours") : null,
      expiresInDays: intField(formData, "expiresInDays", 1),
      sortOrder: intField(formData, "sortOrder", 0),
    },
  });

  await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "SYSTEM", targetId: id, reason: "Premio da roleta de vouchers atualizado" });
  revalidatePath("/admin/roleta-vouchers");
}

async function cancelVoucher(formData: FormData) {
  "use server";
  const { session } = await requireAdmin("vouchers:manage");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.clientVoucher.update({ where: { id }, data: { status: "CANCELLED" } });
  await logAudit({ adminId: session.user.id, action: "SETTINGS_CHANGED", targetType: "SYSTEM", targetId: id, reason: "Voucher cancelado manualmente" });
  revalidatePath("/admin/roleta-vouchers");
}

export default async function AdminRoletaVouchersPage({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  await requireAdmin("vouchers:manage");
  await ensureVoucherDefaults();
  await updateExpiredVouchers();

  const params = await searchParams;
  const selectedPeriod = params?.period === "week" || params?.period === "month" ? params.period : "day";
  const range = periodRange(selectedPeriod);
  const stats = await getBudgetStats();
  const dailyStock = await ensureDailyPrizeStock({ stats });
  const [
    settings,
    prizes,
    spinsInPeriod,
    winnersInPeriod,
    noPrizeInPeriod,
    availableCount,
    usedCount,
    expiredCount,
    awaitingRegistrationCount,
    cancelledCount,
    prizeCounts,
    recentSpins,
    recentVouchers,
    acceptingProfessionals,
  ] = await Promise.all([
    prisma.voucherSettings.findUnique({ where: { id: "default" } }),
    prisma.voucherPrize.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.voucherSpin.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
    prisma.voucherSpin.count({ where: { result: "VOUCHER", voucherValue: { gt: 0 }, createdAt: { gte: range.start, lt: range.end } } }),
    prisma.voucherSpin.count({ where: { result: { not: "VOUCHER" }, createdAt: { gte: range.start, lt: range.end } } }),
    prisma.clientVoucher.count({ where: { status: "AVAILABLE" } }),
    prisma.clientVoucher.count({ where: { status: "USED" } }),
    prisma.clientVoucher.count({ where: { status: "EXPIRED" } }),
    prisma.clientVoucher.count({ where: { status: "AWAITING_REGISTRATION" } }),
    prisma.clientVoucher.count({ where: { status: "CANCELLED" } }),
    prisma.clientVoucher.groupBy({
      by: ["prizeId"],
      where: { createdAt: { gte: range.start, lt: range.end }, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.voucherSpin.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      orderBy: { createdAt: "desc" },
      take: 35,
      include: {
        client: { select: { name: true, email: true, phone: true } },
        prize: true,
        vouchers: { select: { status: true, usedAt: true, code: true } },
      },
    }),
    prisma.clientVoucher.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      orderBy: { createdAt: "desc" },
      take: 45,
      include: {
        client: { select: { name: true, email: true, phone: true } },
        prize: true,
        appointment: { select: { date: true, professional: { select: { displayName: true, slug: true } } } },
      },
    }),
    prisma.professional.findMany({
      where: { voucherSettings: { acceptsVouchers: true } },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: { id: true, displayName: true, slug: true, city: true, state: true, user: { select: { email: true, phone: true } } },
    }),
  ]);

  const countByPrize = new Map(prizeCounts.map((item) => [item.prizeId, item]));

  return (
    <div>
      <AdminHeader
        title="Roleta de Vouchers"
        subtitle="Controle financeiro da roleta exibida no Buscar Prazer. O backend consome estoque diário em transação e bloqueia vouchers quando o orçamento diário ou mensal acaba."
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          ["day", "Hoje"],
          ["week", "Semana"],
          ["month", "Mês"],
        ].map(([period, label]) => (
          <a key={period} href={`/admin/roleta-vouchers?period=${period}`} style={{ ...buttonStyle, background: selectedPeriod === period ? "rgba(212,168,67,.18)" : "transparent" }}>{label}</a>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard label={`Orçamento mensal ${stats.month}/${stats.year}`} value={money(stats.budget.monthlyLimit)} />
        <StatCard label="Usado no mês" value={money(stats.monthlyUsed)} tone={stats.monthlyRemaining <= 0 ? "danger" : "warning"} />
        <StatCard label="Restante no mês" value={money(stats.monthlyRemaining)} tone={stats.monthlyRemaining > 0 ? "success" : "danger"} />
        <StatCard label="Usado hoje" value={money(stats.dailyUsed)} />
        <StatCard label="Saldo restante hoje" value={money(stats.dailyRemaining)} tone={stats.dailyRemaining > 0 ? "success" : "danger"} />
        <StatCard label="Estoque restante hoje" value={money(stats.dailyStockRemainingBudget)} tone={stats.dailyStockRemainingBudget > 0 ? "success" : "danger"} />
        <StatCard label="Taxa de uso" value={`${Math.round(stats.usageRate * 100)}%`} />
        <StatCard label={`Giros no ${range.label}`} value={spinsInPeriod} />
        <StatCard label={`Ganhadores no ${range.label}`} value={winnersInPeriod} tone="success" />
        <StatCard label={`Sem prêmio no ${range.label}`} value={noPrizeInPeriod} />
        <StatCard label="Vouchers disponíveis" value={availableCount} tone="success" />
        <StatCard label="Vouchers usados" value={usedCount} tone="success" />
        <StatCard label="Aguardando cadastro" value={awaitingRegistrationCount} tone="warning" />
        <StatCard label="Expirados" value={expiredCount} tone="danger" />
        <StatCard label="Cancelados" value={cancelledCount} tone="danger" />
      </div>

      <AdminPanel>
        <p style={{ marginTop: 0, color: settings?.promotionAuthorizationReference ? "#86efac" : "#fbbf24" }}>
          {settings?.promotionAuthorizationReference
            ? "Referência promocional informativa cadastrada. A operação ainda depende de política vigente, pelo menos dois prêmios ativos, orçamento e estoque disponíveis."
            : "Roleta sem referência promocional cadastrada. O campo é opcional e informativo; a ativação sem referência foi aprovada por decisão administrativa em reunião interna e será registrada na auditoria."}
        </p>
        <form action={updateSettings} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
          <label style={labelStyle}>Roleta ativa<input name="active" type="checkbox" defaultChecked={settings?.active ?? false} style={checkStyle} /></label>
          <label style={labelStyle}>Referência promocional (opcional)<input name="promotionAuthorizationReference" defaultValue={settings?.promotionAuthorizationReference ?? ""} placeholder="Certificado/processo, se houver" style={inputStyle} /></label>
          <label style={labelStyle}>Orçamento ativo<input name="budgetActive" type="checkbox" defaultChecked={stats.budget.active} style={checkStyle} /></label>
          <label style={labelStyle}>Orçamento mensal<input name="monthlyBudgetLimit" defaultValue={stats.budget.monthlyLimit} style={inputStyle} /></label>
          <label style={labelStyle}>Orçamento diário base<input name="dailyBudgetLimit" defaultValue={stats.budget.dailyLimit} style={inputStyle} /></label>
          <label style={labelStyle}>Ao bater limite diário
            <select name="dailyBudgetMode" defaultValue={settings?.dailyBudgetMode ?? "BLOCK_FREE_VOUCHERS"} style={inputStyle}>
              <option value="BLOCK_FREE_VOUCHERS">Bloquear vouchers gratuitos</option>
              <option value="REDUCE_FREE_VOUCHERS">Reduzir chances</option>
            </select>
          </label>
          <label style={labelStyle}>Giros por cliente/dia<input name="dailySpinLimit" type="number" min={1} defaultValue={settings?.dailySpinLimit ?? 1} style={inputStyle} /></label>
          <label style={labelStyle}>Giros por visitante/dia<input name="guestDailySpinLimit" type="number" min={1} defaultValue={settings?.guestDailySpinLimit ?? 1} style={inputStyle} /></label>
          <label style={labelStyle}>Minutos para salvar prêmio<input name="pendingClaimMinutes" type="number" min={1} defaultValue={settings?.pendingClaimMinutes ?? 30} style={inputStyle} /></label>
          <label style={labelStyle}>Cadastro do R$ 100 em horas<input name="registrationClaimHours" type="number" min={1} defaultValue={settings?.registrationClaimHours ?? 24} style={inputStyle} /></label>
          <label style={labelStyle}>Cooldown de voucher em dias<input name="voucherWinCooldownDays" type="number" min={1} defaultValue={settings?.voucherWinCooldownDays ?? 7} style={inputStyle} /></label>
          <label style={labelStyle}>Bloquear voucher ativo duplicado<input name="blockMultipleActiveVouchers" type="checkbox" defaultChecked={settings?.blockMultipleActiveVouchers ?? true} style={checkStyle} /></label>
          <label style={labelStyle}>Vários vouchers por agendamento<input name="allowMultipleVouchersPerAppointment" type="checkbox" defaultChecked={settings?.allowMultipleVouchersPerAppointment ?? false} style={checkStyle} /></label>
          <input type="hidden" name="defaultExpiresInDays" value={settings?.defaultExpiresInDays ?? 15} />
          <button style={{ ...buttonStyle, minHeight: 42 }}>Salvar orçamento</button>
        </form>
      </AdminPanel>

      <div style={{ marginTop: 16 }}>
        <AdminPanel>
          <h2 style={sectionTitle}>Estoque de prêmios do dia</h2>
          <AdminTable>
            <thead>
              <tr>
                <th style={thStyle}>Prêmio</th>
                <th style={thStyle}>Estoque inicial</th>
                <th style={thStyle}>Restam</th>
                <th style={thStyle}>Usados</th>
                <th style={thStyle}>Valor inicial</th>
                <th style={thStyle}>Usado</th>
                <th style={thStyle}>Sobra</th>
                <th style={thStyle}>Acumulou/expirou</th>
              </tr>
            </thead>
            <tbody>
              {dailyStock.length ? dailyStock.map((stock) => (
                <tr key={stock.id}>
                  <td style={tdStyle}>{stock.prizeName}</td>
                  <td style={tdStyle}>{stock.initialQuantity}</td>
                  <td style={tdStyle}>{stock.remainingQuantity}</td>
                  <td style={tdStyle}>{stock.usedQuantity}</td>
                  <td style={tdStyle}>{money(stock.initialBudget)}</td>
                  <td style={tdStyle}>{money(stock.usedBudget)}</td>
                  <td style={tdStyle}>{money(stock.remainingBudget)}</td>
                  <td style={tdStyle}>Acumulou {money(stock.carryoverToNext)} · Expirou {money(stock.expiredBudget)}</td>
                </tr>
              )) : (
                <tr>
                  <td style={tdStyle} colSpan={8}>Sem estoque de voucher gratuito para hoje. A roleta retorna apenas opções sem prêmio.</td>
                </tr>
              )}
            </tbody>
          </AdminTable>
        </AdminPanel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(320px,.9fr)", gap: 16, marginTop: 16 }}>
        <AdminPanel>
          <h2 style={sectionTitle}>Prêmios, chances e limites</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {prizes.map((prize) => {
              const counted = countByPrize.get(prize.id);
              return (
                <form key={prize.id} action={updatePrize} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.25fr) 118px 78px 86px 86px 86px 86px 78px", gap: 8, alignItems: "end", border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 10, background: "rgba(255,255,255,0.025)" }}>
                  <input type="hidden" name="id" value={prize.id} />
                  <label style={labelStyle}>Nome<input name="name" defaultValue={prize.name} style={inputStyle} /></label>
                  <label style={labelStyle}>Tipo
                    <select name="type" defaultValue={prize.type === "PAID_VOUCHER" ? "VOUCHER" : prize.type} style={inputStyle}>
                      <option value="VOUCHER">Voucher</option>
                      <option value="TRY_AGAIN">Tente outra vez</option>
                      <option value="TRY_TOMORROW">Tente amanhã</option>
                    </select>
                  </label>
                  <label style={labelStyle}>Valor<input name="value" defaultValue={prize.value ?? ""} style={inputStyle} /></label>
                  <label style={labelStyle}>Chance %<input name="probability" defaultValue={prize.baseProbability || prize.probability} style={inputStyle} /></label>
                  <label style={labelStyle}>Limite mês<input name="monthlyQuantityLimit" type="number" defaultValue={prize.monthlyQuantityLimit ?? ""} style={inputStyle} /></label>
                  <label style={labelStyle}>Limite dia<input name="dailyQuantityLimit" type="number" defaultValue={prize.dailyQuantityLimit ?? ""} style={inputStyle} /></label>
                  <label style={labelStyle}>Limite semana<input name="weeklyQuantityLimit" type="number" defaultValue={prize.weeklyQuantityLimit ?? ""} style={inputStyle} /></label>
                  <label style={labelStyle}>Validade h<input name="expiresInHours" type="number" defaultValue={prize.expiresInHours ?? ""} style={inputStyle} /></label>
                  <label style={labelStyle}>Dias<input name="expiresInDays" type="number" defaultValue={prize.expiresInDays} style={inputStyle} /></label>
                  <label style={labelStyle}>Ordem<input name="sortOrder" type="number" defaultValue={prize.sortOrder} style={inputStyle} /></label>
                  <label style={inlineCheckStyle}><input name="active" type="checkbox" defaultChecked={prize.active} /> Ativo</label>
                  <div style={{ color: adminColors.muted, fontSize: 12 }}>Mês: {counted?._count._all ?? 0} · {money(counted?._sum.value ?? 0)}</div>
                  <button style={{ ...buttonStyle, gridColumn: "span 4" }}>Salvar prêmio</button>
                </form>
              );
            })}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 style={sectionTitle}>Profissionais participantes</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {acceptingProfessionals.length ? acceptingProfessionals.map((professional) => (
              <div key={professional.id} style={{ border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 10, background: "rgba(255,255,255,0.025)" }}>
                <strong style={{ color: "#fff" }}>{professional.displayName}</strong>
                <p style={{ margin: "6px 0 0", color: adminColors.muted, fontSize: 12 }}>{professional.city}, {professional.state} · {professional.user.phone ?? professional.user.email ?? "-"}</p>
              </div>
            )) : <p style={{ color: adminColors.muted, margin: 0 }}>Nenhuma profissional aceitando vouchers no momento.</p>}
          </div>
        </AdminPanel>
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminPanel>
          <h2 style={sectionTitle}>Vouchers emitidos</h2>
          <AdminTable>
            <thead>
              <tr>
                <th style={thStyle}>Voucher</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Validade</th>
                <th style={thStyle}>Uso</th>
                <th style={thStyle}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {recentVouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td style={tdStyle}><strong>{voucher.code}</strong><br />{voucher.prize?.name ?? "Roleta"}</td>
                  <td style={tdStyle}>{voucher.client?.name ?? voucher.recipientName ?? "Visitante"}<br />{voucher.client?.phone ?? voucher.recipientPhone ?? voucher.whatsapp ?? voucher.client?.email ?? voucher.visitorId ?? "-"}</td>
                  <td style={tdStyle}>{money(voucher.value)}</td>
                  <td style={tdStyle}><StatusPill tone={statusTone(voucher.status)}>{VOUCHER_STATUS_LABEL[voucher.status] ?? voucher.status}</StatusPill></td>
                  <td style={tdStyle}>{voucher.expiresAt.toLocaleString("pt-BR")}</td>
                  <td style={tdStyle}>{voucher.appointment ? `${voucher.appointment.professional.displayName} em ${voucher.appointment.date.toLocaleDateString("pt-BR")}` : "-"}</td>
                  <td style={tdStyle}>
                    {["AVAILABLE", "AWAITING_REGISTRATION"].includes(voucher.status) ? (
                      <form action={cancelVoucher}>
                        <input type="hidden" name="id" value={voucher.id} />
                        <button style={{ ...buttonStyle, color: "#ef4444" }}>Cancelar</button>
                      </form>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminPanel>
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminPanel>
          <h2 style={sectionTitle}>Histórico de giros</h2>
          <AdminTable>
            <thead>
              <tr>
                <th style={thStyle}>Quando</th>
                <th style={thStyle}>Resultado</th>
                <th style={thStyle}>Valor</th>
                <th style={thStyle}>Cliente/visitante</th>
                <th style={thStyle}>IP</th>
                <th style={thStyle}>Device</th>
                <th style={thStyle}>Status/uso</th>
              </tr>
            </thead>
            <tbody>
              {recentSpins.map((spin) => (
                <tr key={spin.id}>
                  <td style={tdStyle}>{spin.createdAt.toLocaleString("pt-BR")}</td>
                  <td style={tdStyle}>{spin.prize?.name ?? spin.result}</td>
                  <td style={tdStyle}>{spin.voucherValue ? money(spin.voucherValue) : "-"}</td>
                  <td style={tdStyle}>{spin.client?.name ?? spin.client?.email ?? spin.visitorId ?? "-"}</td>
                  <td style={tdStyle}>{spin.ipAddress ?? "-"}</td>
                  <td style={tdStyle}>{spin.userAgent ? `${spin.userAgent.slice(0, 64)}${spin.userAgent.length > 64 ? "..." : ""}` : "-"}</td>
                  <td style={tdStyle}>
                    {spin.vouchers[0]
                      ? `${VOUCHER_STATUS_LABEL[spin.vouchers[0].status] ?? spin.vouchers[0].status}${spin.vouchers[0].usedAt ? " · usado" : ""}`
                      : spin.claimedAt ? "Salvo" : spin.pendingToken ? "Pendente" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminPanel>
      </div>
    </div>
  );
}

const sectionTitle: CSSProperties = { color: "#fff", fontSize: 16, margin: "0 0 14px" };

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: adminColors.muted,
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 0.7,
};

const inputStyle: CSSProperties = {
  minHeight: 38,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.14)",
  background: "#050506",
  color: "#fff",
  padding: "0 9px",
  fontSize: 12,
};

const checkStyle: CSSProperties = { width: 22, height: 22, accentColor: adminColors.gold };

const inlineCheckStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: adminColors.muted,
  fontSize: 12,
  fontWeight: 800,
};
