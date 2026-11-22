import { identityRuntimeEnabled } from "@/lib/manual-identity-runtime";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-access";
import { identityParts } from "@/lib/manual-identity-policy";
import { prisma } from "@/lib/prisma";
import { AdminHeader, AdminPanel } from "../../_components/AdminPrimitives";
import Review from "./review";

const labels = { back: "Verso do documento", front: "Frente do documento", portrait: "Selfie segurando o documento" };
const statuses: Record<string, string> = {
  PENDING_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Reprovado", RESUBMISSION_REQUESTED: "Novo envio solicitado",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ profissional?: string; pagina?: string }> }) {
  if (!(await identityRuntimeEnabled())) notFound();
  await requireAdmin("kyc:review");
  const query = await searchParams;
  const userId = typeof query.profissional === "string" ? query.profissional : undefined;
  const requestedPage = Number(query.pagina ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10_000 ? requestedPage : 1;
  const attempts = await prisma.manualIdentityAttempt.findMany({
    where: { submittedAt: { not: null }, ...(userId ? { userId } : {}) },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 26,
  });
  const accounts = await prisma.user.findMany({
    where: { id: { in: attempts.map((attempt) => attempt.userId) } },
    select: { id: true, name: true, birthDate: true, professional: { select: { id: true, displayName: true, birthDate: true } } },
  });
  const notes = await prisma.auditLog.findMany({
    where: { OR: attempts.map((attempt) => ({ targetType: "USER", targetId: attempt.userId, changes: { path: ["attemptId"], equals: attempt.id } })) },
    orderBy: { timestamp: "desc" },
    select: { id: true, reason: true, timestamp: true, adminId: true, changes: true },
  });
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const pageLink = (number: number) => "?" + new URLSearchParams({ pagina: String(number), ...(userId ? { profissional: userId } : {}) });
  return <section>
    <AdminHeader title="Verificação documental manual" subtitle="Análise humana de documento e fotografia com desafio datado." />
    <Link href="/admin/kyc">Voltar ao painel de KYC</Link>
    {userId && <p><Link href="/admin/kyc/documental">Ver todas as solicitações</Link></p>}
    {attempts.length === 0 && <p>Nenhuma solicitação encontrada.</p>}
    {attempts.slice(0, 25).map((attempt) => {
      const account = accounts.find((item) => item.id === attempt.userId);
      const available = !attempt.purgedAt && attempt.purgeAfter > new Date();
      const attemptNotes = notes.filter((note) => {
        const changes = note.changes as { attemptId?: string; status?: string } | null;
        return changes?.attemptId === attempt.id && changes.status;
      });
      return <div id={"tentativa-" + attempt.id} key={attempt.id} className="scroll-mt-6"><AdminPanel>
        <h2>{account?.professional?.displayName ?? account?.name ?? "Cadastro indisponível"} · {attempt.documentType}</h2>
        <p>{statuses[attempt.status] ?? attempt.status} · Envio em {date.format(attempt.submittedAt!)}</p>
        <p>Data do desafio: {attempt.challengeDate.split("-").reverse().join("/")}{attempt.backUnavailable ? " · Verso declarado indisponível" : ""}</p>
        <p>Nascimento cadastrado: {(account?.professional?.birthDate ?? account?.birthDate)?.toISOString().slice(0, 10).split("-").reverse().join("/") ?? "Indisponível"}
          {attempt.birthDate && " · Nascimento conferido: " + attempt.birthDate.toISOString().slice(0, 10).split("-").reverse().join("/")}</p>
        <p><Link href={"?profissional=" + encodeURIComponent(attempt.userId)}>Histórico da profissional</Link></p>
        {account?.professional && <p><Link prefetch={false} href={"/admin/profissionais?professionalId=" + encodeURIComponent(account.professional.id)}>Ver cadastro profissional</Link></p>}
        {available ? <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...identityParts(attempt.backUnavailable)].sort((a, b) => ["front", "back", "portrait"].indexOf(a) - ["front", "back", "portrait"].indexOf(b)).map((part) => {
            const url = "/api/admin/kyc/manual?" + new URLSearchParams({ id: attempt.id, part });
            return <a key={part} target="_blank" rel="noopener noreferrer" href={url} className="grid gap-2 rounded-xl border p-3">

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={url} alt={labels[part]} className="h-40 w-full rounded-lg bg-neutral-100 object-contain" />
              <span>{labels[part]} · Ampliar</span>
            </a>;
          })}
        </div> : <p>Evidências indisponíveis pelo prazo de retenção.</p>}
        {attemptNotes.length > 0 && <details><summary>Histórico de decisões</summary><ul>{attemptNotes.map((note) => <li key={note.id}>
          {date.format(note.timestamp)} · {note.adminId ?? "Administrador removido"} · {note.reason}
        </li>)}</ul></details>}
        {account && available && attempt.status === "PENDING_REVIEW" &&
          <Review key={attempt.reviewVersion} id={attempt.id} version={attempt.reviewVersion} />}
      </AdminPanel></div>;
    })}
    {page > 1 && <Link href={pageLink(page - 1)}>Página anterior</Link>}
    {attempts.length > 25 && <Link href={pageLink(page + 1)}>Próxima página</Link>}
  </section>;
}
