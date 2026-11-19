import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-access";
import { professionalRegistrationIdentity, registrationReportFilters, registrationStages } from "@/lib/registration-admin-report";
import { prisma } from "@/lib/prisma";
import { registrationTelemetryReady } from "@/lib/registration-monitor";
import { twilioVerifyEnvironmentStatus } from "@/lib/twilio-verify";
import { AdminHeader, AdminPagination, AdminPanel, AdminTable, StatCard, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

const path = "/admin/cadastros";
const periods = { "24": "24 horas", "48": "48 horas", "168": "7 dias", "720": "30 dias" };
const types = { model: "Profissional", client: "Cliente", host: "Anfitrião" };
const stages: Record<string, string> = registrationStages;
const pageSize = 30;
const formatDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" });

type Totals = {
  started: number; completed: number; inactive: number; errors: number;
  smsAccepted: number; smsVerified: number; smsRejected: number; phoneReached: number;
  emailReached: number; emailDelivered: number; emailConfirmed: number; identityReached: number; accounts: number;
};

export default async function RegistrationMonitorPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdmin("registration:monitor");
  const telemetryReady = await registrationTelemetryReady().catch(() => null);
  if (telemetryReady !== true) {
    return (
      <div>
        <AdminHeader title="Monitor de cadastros" />
        <AdminPanel>
          {telemetryReady === null
            ? <p role="alert">Não foi possível consultar o banco.</p>
            : <p role="status">A coleta de eventos começa após a ativação da telemetria no banco.</p>}
        </AdminPanel>
      </div>
    );
  }
  const params = await searchParams;
  const filters = registrationReportFilters(params);
  const { hours, professional, stage } = filters;
  const type = professional ? "model" : filters.type;
  const identity = professional ? await professionalRegistrationIdentity(professional) : filters.identity;
  const page = typeof params.page === "string" && /^\d{1,5}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  // eslint-disable-next-line react-hooks/purity -- Each dynamic request defines its own reporting window.
  const now = Date.now();
  const since = new Date(now - Number(hours) * 3_600_000);
  const inactiveBefore = new Date(now - 2 * 3_600_000);
  const baseWhere = { createdAt: { gte: since }, ...(type ? { accountType: type } : {}) };
  const where = { ...baseWhere, stage, identity: identity ?? (professional ? "__unavailable__" : undefined) };
  const emailWhere = {
    createdAt: { gte: since },
    category: type ? "REGISTRATION_" + type.toUpperCase() : { startsWith: "REGISTRATION_" },
  };
  const twilio = twilioVerifyEnvironmentStatus();
  const services = [
    ["Vercel", process.env.VERCEL === "1"],
    ["Supabase Auth", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), "SUPABASE"],
    ["Redis", Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)],
    ["Twilio Verify", twilio.hasAccountSid && twilio.hasAuthToken && twilio.hasVerifyServiceSid, "TWILIO"],
    ["Resend", Boolean(process.env.RESEND_API_KEY), "RESEND"],
    ["Webhook Resend", Boolean(process.env.RESEND_WEBHOOK_SECRET)],
    ["Didit", Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID), "DIDIT"],
    ["Zoho Mail", null],
  ] as const;
  const settings = { hours, type, identity: professional ? undefined : identity, professional, stage };
  const exportParams = new URLSearchParams(Object.entries(settings).flatMap(([key, value]) => value ? [[key, value]] : []));

  let data;
  try {
    data = await Promise.all([
      prisma.$queryRaw<Totals[]>`
        WITH events AS (
          SELECT e.*, m."deliveredAt" FROM "RegistrationEvent" e
          LEFT JOIN "EmailDelivery" m ON e.provider = 'RESEND' AND e."providerReference" = m."providerMessageId"
          WHERE e."createdAt" >= ${since}
          ${type ? Prisma.sql`AND e."accountType" = ${type}` : Prisma.empty}
        ), journeys AS (
          SELECT identity, "accountType", MIN("createdAt") FILTER (WHERE stage IN ('PHONE_SEND', 'EMAIL_SEND')) AS started_at,
                 MAX("createdAt") AS last_seen,
                 BOOL_OR(outcome = 'ACCOUNT_COMPLETED') AS account_created,
                 BOOL_OR(CASE WHEN "accountType" = 'model' THEN outcome = 'PROFILE_SUBMITTED' ELSE outcome = 'ACCOUNT_COMPLETED' END) AS completed,
                 BOOL_OR(outcome = 'EXISTING_ACCOUNT') AS existing_account,
                 BOOL_OR(outcome = 'ERROR') AS errored,
                 BOOL_OR(stage = 'PHONE_CHECK' AND outcome <> 'ERROR') AS phone_reached,
                 BOOL_OR(stage IN ('EMAIL_SEND', 'EMAIL_CONFIRMATION') AND provider = 'RESEND' AND outcome = 'SUCCESS') AS email_reached,
                 BOOL_OR("deliveredAt" IS NOT NULL) AS email_delivered,
                 BOOL_OR(outcome = 'EMAIL_VERIFIED') AS email_confirmed,
                 BOOL_OR(stage = 'IDENTITY' AND outcome IN ('IDENTITY_PENDING', 'IDENTITY_APPROVED', 'IDENTITY_REJECTED')) AS identity_reached
          FROM events WHERE identity IS NOT NULL GROUP BY identity, "accountType"
        ), cohort AS (
          SELECT j.* FROM journeys j WHERE j.started_at IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "RegistrationEvent" previous
              WHERE previous.identity = j.identity AND previous."accountType" IS NOT DISTINCT FROM j."accountType"
                AND previous.stage IN ('PHONE_SEND', 'EMAIL_SEND') AND previous."createdAt" < ${since}
            )
        )
        SELECT
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed))::int AS started,
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND completed)::int AS completed,
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND account_created)::int AS accounts,
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND NOT completed AND last_seen <= ${inactiveBefore})::int AS inactive,
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND errored)::int AS errors,
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND phone_reached)::int AS "phoneReached",
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND email_reached)::int AS "emailReached",
          count(*) FILTER (WHERE (NOT existing_account OR account_created OR completed) AND email_delivered)::int AS "emailDelivered",
          count(*) FILTER (WHERE (NOT existing_account OR account_created OR completed) AND email_confirmed)::int AS "emailConfirmed",
          count(*) FILTER (WHERE started_at IS NOT NULL AND (NOT existing_account OR account_created OR completed) AND identity_reached)::int AS "identityReached",
          (SELECT count(*)::int FROM events WHERE channel = 'sms' AND stage = 'PHONE_SEND' AND outcome = 'SUCCESS') AS "smsAccepted",
          (SELECT count(*)::int FROM events WHERE channel = 'sms' AND stage = 'PHONE_CHECK' AND outcome <> 'ERROR') AS "smsVerified",
          (SELECT count(*)::int FROM events WHERE channel = 'sms' AND outcome = 'ERROR' AND provider IN ('TWILIO', 'FIREBASE')) AS "smsRejected"
        FROM cohort`,
      type && type !== "model" ? Promise.resolve(null) : Promise.all([
        prisma.user.count({ where: { accountType: "model", createdAt: { gte: since } } }),
        prisma.professional.count({ where: { registrationSubmittedAt: { gte: since } } }),
      ]),
      prisma.registrationEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.registrationEvent.count({ where }),
      prisma.registrationEvent.findMany({
        where, orderBy: [{ createdAt: identity ? "asc" : "desc" }, { id: identity ? "asc" : "desc" }], skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, createdAt: true, identity: true, accountType: true, stage: true, step: true, outcome: true, status: true, reason: true, provider: true, providerCode: true, providerReference: true, channel: true },
      }),
      prisma.registrationEvent.groupBy({
        by: ["stage", "reason", "provider", "providerCode", "status"],
        where: { ...baseWhere, createdAt: { gte: new Date(now - 86_400_000) }, outcome: { in: ["ERROR", "IDENTITY_REJECTED"] } },
        _count: { _all: true },
      }),
      prisma.emailDelivery.groupBy({ by: ["status"], where: emailWhere, _count: { _all: true, acceptedAt: true } }),
      prisma.registrationEvent.groupBy({
        by: ["provider", "outcome"], where: { ...baseWhere, provider: { not: null } }, _max: { createdAt: true },
      }),
      type && type !== "model" ? Promise.resolve([]) : prisma.professional.findMany({
        where: professional ? { id: professional } : { registrationSubmittedAt: null, updatedAt: { gte: since } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 30,
        select: {
          id: true, updatedAt: true, registrationSubmittedAt: true, kycStatus: true,
          user: { select: { phoneVerified: true, emailVerified: true, kycReviewedAt: true } },
        },
      }),
      type && type !== "model" ? Promise.resolve(null) : prisma.professional.count({ where: { kycStatus: { in: ["PENDING", "KYC_MANUAL_PENDENTE"] } } }),
    ]);
  } catch {
    return <div><AdminHeader title="Monitor de cadastros" /><AdminPanel><p role="alert">Dados indisponíveis. Verifique o acesso ao banco e a migração de telemetria.</p></AdminPanel></div>;
  }

  const [[totals], historical, first, count, events, failures, emails, providerOutcomes, drafts, pending] = data;
  const delivery = await prisma.emailDelivery.findMany({
    where: { providerMessageId: { in: events.filter((event) => event.provider === "RESEND").flatMap((event) => event.providerReference ? [event.providerReference] : []) } },
    select: { providerMessageId: true, status: true, lastEvent: true },
  });
  const deliveryByReference = new Map(delivery.map((item) => [item.providerMessageId, item]));
  const alerts = failures.filter((item) => item._count._all >= 3).sort((a, b) => b._count._all - a._count._all).slice(0, 10);
  const cards = [
    ["Cadastros iniciados", totals.started], ["Cadastros concluídos", totals.completed],
    ["Possíveis abandonos", totals.inactive], ["Cadastros com erros", totals.errors],
    ["SMS aceitos para envio", totals.smsAccepted], ["SMS validados", totals.smsVerified], ["Falhas no fluxo SMS", totals.smsRejected],
    ["E-mails aceitos para envio", emails.reduce((total, item) => total + item._count.acceptedAt, 0)],
    ["E-mails entregues", emails.find((item) => item.status === "DELIVERED")?._count._all ?? 0],
    ["E-mails rejeitados ou com falha", emails.filter((item) => ["REJECTED", "FAILED"].includes(item.status)).reduce((total, item) => total + item._count._all, 0)],
    ["Identidade pendente agora", pending ?? "Não aplicável"],
  ] as const;
  const funnel = [
    ["Início", totals.started], ["Telefone validado", totals.phoneReached], ["E-mail aceito", totals.emailReached],
    ["Conta criada", totals.accounts], ["E-mail entregue", totals.emailDelivered], ["E-mail confirmado", totals.emailConfirmed], ["Identidade iniciada", totals.identityReached], ["Cadastro concluído", totals.completed],
  ] as const;

  return (
    <div className="space-y-5">
      <AdminHeader title="Monitor de cadastros" subtitle="Acompanhe o cadastro da primeira solicitação à criação da conta e a verificação da identidade." />
      <AdminPanel>
        <form action={path} className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-sm font-semibold">Período
            <select name="hours" defaultValue={hours} className="rounded-md border p-2">
              {Object.entries(periods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Tipo de usuário
            <select name="type" defaultValue={type ?? ""} className="rounded-md border p-2">
              <option value="">Todos</option>
              {Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">ID do perfil profissional
            <input name="professional" defaultValue={professional ?? ""} className="rounded-md border p-2" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Etapa do evento
            <select name="stage" defaultValue={stage ?? ""} className="rounded-md border p-2">
              <option value="">Todas</option>
              {Object.entries(stages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          {filters.identity && !professional && <input type="hidden" name="identity" value={filters.identity} />}
          <button className="rounded-md bg-[#8f1fd1] px-4 py-2 font-semibold text-white">Filtrar</button>
        </form>
        <p className="mt-3 text-sm text-gray-600">{first ? "Primeiro evento disponível em " + formatDate.format(first.createdAt) + " (Brasília)." : "A telemetria ainda não recebeu eventos."} Possível abandono indica ausência de conclusão e duas horas sem atividade. Para profissionais, a conclusão corresponde ao envio do perfil para análise. A janela de 24 horas pode não conter toda a trajetória.</p>
      </AdminPanel>
      {historical && <AdminPanel>
        <h2 className="mb-2 font-bold">Marcos registrados no banco</h2>
        <p className="text-sm text-gray-600">Contas profissionais criadas e perfis enviados no período, incluindo registros anteriores à telemetria.</p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div><dt>Contas criadas</dt><dd className="font-bold">{historical[0]}</dd></div>
          <div><dt>Perfis enviados</dt><dd className="font-bold">{historical[1]}</dd></div>
        </dl>
      </AdminPanel>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel>
          <h2 className="mb-2 font-bold">Funil por etapa</h2>
          <p className="mb-4 text-sm text-gray-600">A coorte usa a primeira solicitação registrada no período. A ordem das etapas varia por fluxo.</p>
          <div className="space-y-3">
            {funnel.map(([label, amount]) => {
              const percent = totals.started ? Math.round(100 * amount / totals.started) : 0;
              return <div key={label}><div className="flex justify-between gap-2 text-sm"><span>{label}</span><strong>{amount} ({percent}%)</strong></div><progress aria-label={label} className="h-2 w-full accent-[#8f1fd1]" value={percent} max={100} /></div>;
            })}
          </div>
        </AdminPanel>
        <AdminPanel>
          <h2 className="mb-3 font-bold">Alertas de recorrência</h2>
          <p className="mb-3 text-sm text-gray-600">Três ou mais eventos com o mesmo motivo em 24 horas.</p>
          {alerts.length ? <ul className="space-y-2">{alerts.map((alert) => <li className="rounded-md bg-red-50 p-2 text-sm text-red-900" key={JSON.stringify([alert.stage, alert.reason, alert.provider, alert.providerCode, alert.status])}>{stages[alert.stage]} · {alert.provider ?? "Aplicação"} · {alert.reason ?? "HTTP " + alert.status}{alert.providerCode ? " / " + alert.providerCode : ""} · {alert._count._all}</li>)}</ul> : <p className="text-sm">Nenhum alerta nos eventos observados.</p>}
        </AdminPanel>
      </div>
      <AdminPanel>
        <h2 className="mb-3 font-bold">Serviços</h2>
        <p className="mb-3 text-sm text-gray-600">Configuração local e último evento observado no recorte. A consulta ao banco respondeu via Prisma.</p>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(([label, configured, provider]) => {
            const latest = providerOutcomes.filter((item) => item.provider === provider).sort((a, b) =>
              (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0))[0];
            return <div key={label} className="rounded-md bg-[#faf9fc] p-3">
              <dt className="font-semibold">{label}</dt>
              <dd className="text-sm">{configured === null ? "MX externo, sem sonda" : configured ? "Configurado" : "Configuração ausente"}</dd>
              {latest?._max.createdAt && <dd className="text-xs text-gray-600">{latest.outcome === "ERROR" ? "Falha registrada" : "Operação registrada"} em {formatDate.format(latest._max.createdAt)}</dd>}
            </div>;
          })}
        </dl>
      </AdminPanel>
      <AdminPanel>
        <h2 className="mb-2 font-bold">Fila de profissionais</h2>
        <p className="mb-3 text-sm text-gray-600">Até 30 perfis recentes. O horário indica a última atualização persistida do perfil.</p>
        <AdminTable>
          <thead><tr>{["Referência", "Etapa atual", "Última atualização", "Identidade"].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
          <tbody>{drafts.map((draft) => {
            const currentStage = draft.registrationSubmittedAt ? "Enviado para análise"
              : !draft.user.phoneVerified ? "Telefone pendente"
              : !draft.user.emailVerified ? "E-mail pendente"
              : draft.kycStatus !== "APPROVED" ? "Identidade" : "Perfil pendente";
            return <tr key={draft.id}>
              <td style={tdStyle}><Link className="text-[#8f1fd1] underline" href={{ pathname: path, query: { hours, professional: draft.id } }}>{draft.id.slice(-8)}</Link></td>
              <td style={tdStyle}>{currentStage}{!draft.registrationSubmittedAt && draft.updatedAt <= inactiveBefore ? " · Inativo" : ""}</td>
              <td style={tdStyle}>{formatDate.format(draft.updatedAt)}</td>
              <td style={tdStyle}>{draft.kycStatus}{draft.user.kycReviewedAt && draft.kycStatus === "REJECTED" ? " · Revisado em " + formatDate.format(draft.user.kycReviewedAt) : ""}</td>
            </tr>;
          })}{!drafts.length && <tr><td style={tdStyle} colSpan={4}>Sem perfis no recorte selecionado.</td></tr>}</tbody>
        </AdminTable>
      </AdminPanel>
      <AdminPanel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{identity ? "Histórico individual " + identity.slice(0, 12) : "Histórico de eventos"}</h2>
          <div className="flex gap-3">
            {(identity || professional) && <Link className="text-sm text-[#8f1fd1] underline" href={{ pathname: path, query: { hours, type, stage } }}>Ver todos os eventos</Link>}
            {access.permissions.includes("registration:export") && <a className="text-sm text-[#8f1fd1] underline" href={"/api/admin/cadastros/export?" + exportParams}>Exportar CSV</a>}
          </div>
        </div>
        <AdminTable>
          <thead><tr>{["Data e hora", "Referência", "Usuário", "Etapa", "Resultado", "Motivo técnico"].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
          <tbody>
            {events.map((event) => {
              const mail = event.providerReference ? deliveryByReference.get(event.providerReference) : undefined;
              return <tr key={event.id}>
                <td style={tdStyle}>{formatDate.format(event.createdAt)}</td>
                <td style={tdStyle}>{event.identity ? <Link className="text-[#8f1fd1] underline" href={{ pathname: path, query: { hours, type, identity: event.identity } }}>{event.identity.slice(0, 12)}</Link> : "—"}</td>
                <td style={tdStyle}>{types[event.accountType as keyof typeof types] ?? "Indefinido"}</td>
                <td style={tdStyle}>{stages[event.stage] ?? event.stage}{event.step !== null ? " · " + (event.step + 1) : ""}{event.channel ? " · " + event.channel : ""}</td>
                <td style={tdStyle}>{event.outcome}{mail ? " · " + mail.status : ""}</td>
                <td style={tdStyle}>{[event.provider, event.reason, event.providerCode, mail?.lastEvent, "HTTP " + event.status].filter(Boolean).join(" · ")}</td>
              </tr>;
            })}
            {!events.length && <tr><td style={tdStyle} colSpan={6}>Sem eventos no período selecionado.</td></tr>}
          </tbody>
        </AdminTable>
        <AdminPagination basePath={path} page={page} pageSize={pageSize} total={count} query={settings} />
      </AdminPanel>
    </div>
  );
}
