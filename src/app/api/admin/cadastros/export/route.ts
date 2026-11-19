import type { NextRequest } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { professionalRegistrationIdentity, registrationCsvCell, registrationReportFilters } from "@/lib/registration-admin-report";

const MAX_EXPORT_ROWS = 10_000;

export async function GET(req: NextRequest) {
  const access = await authorizeAdminRequest("registration:export");
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

  const filters = registrationReportFilters(Object.fromEntries(req.nextUrl.searchParams));
  if (["hours", "type", "stage", "professional", "identity"].some((key) => {
    const value = req.nextUrl.searchParams.get(key);
    return value && value !== filters[key as keyof typeof filters];
  })) return Response.json({ error: "Filtro de relatório inválido." }, { status: 400 });
  const identity = filters.professional ? await professionalRegistrationIdentity(filters.professional) : filters.identity;
  if (filters.professional && !identity) {
    return Response.json({ error: "Referência profissional indisponível." }, { status: 404 });
  }

  const rows = await prisma.registrationEvent.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - Number(filters.hours) * 3_600_000) },
      accountType: filters.professional ? "model" : filters.type,
      stage: filters.stage,
      identity,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS + 1,
    select: { createdAt: true, identity: true, accountType: true, stage: true, step: true, outcome: true, status: true, reason: true, provider: true, providerCode: true },
  });
  if (rows.length > MAX_EXPORT_ROWS) {
    return Response.json({ error: "O relatório excede 10.000 eventos. Reduza o período ou filtre a etapa." }, { status: 422 });
  }

  const lines = [
    ["Horário UTC", "Referência", "Tipo", "Etapa", "Passo", "Resultado", "HTTP", "Motivo", "Provedor", "Código do provedor"],
    ...rows.map((r) => [r.createdAt.toISOString(), r.identity?.slice(0, 12) ?? null, r.accountType, r.stage, r.step === null ? null : r.step + 1, r.outcome, r.status, r.reason, r.provider, r.providerCode]),
  ];
  return new Response("\uFEFF" + lines.map((row) => row.map(registrationCsvCell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cadastros-elitemodell.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
