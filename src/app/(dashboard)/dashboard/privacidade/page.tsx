import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function updateMarketing(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  const granted = formData.get("granted") === "true";
  await prisma.consentPreference.create({
    data: {
      userId: session.user.id,
      purpose: "MARKETING",
      granted,
      source: "privacy-center",
      legalBasis: "CONSENT",
      version: "1",
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
    },
  });
}

export default async function PrivacyCenterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const [acceptances, preferences, requests] = await Promise.all([
    prisma.userAcceptance.findMany({
      where: { userId: session.user.id },
      orderBy: { acceptedAt: "desc" },
      include: { version: { include: { document: true } } },
    }),
    prisma.consentPreference.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.privacyRequest.findMany({ where: { userId: session.user.id }, orderBy: { requestedAt: "desc" }, take: 20 }),
  ]);
  const marketing = preferences.find((item) => item.purpose === "MARKETING")?.granted ?? false;

  return (
    <main className="min-h-screen bg-[#050506] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">Privacidade e meus dados</h1>
        <p className="mt-2 text-white/60">Consulte registros, baixe uma copia e acompanhe solicitacoes.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-[8px] border border-white/10 bg-white/[.035] p-5">
            <h2 className="text-lg font-black">Copia dos dados</h2>
            <p className="mt-2 text-sm text-white/60">Arquivo JSON estruturado, sem credenciais ou dados de terceiros.</p>
            <a href="/api/users/me/export" className="mt-4 inline-flex rounded-[8px] bg-[#d4a843] px-4 py-3 font-black text-black no-underline">Baixar meus dados</a>
          </section>
          <section className="rounded-[8px] border border-white/10 bg-white/[.035] p-5">
            <h2 className="text-lg font-black">Marketing opcional</h2>
            <p className="mt-2 text-sm text-white/60">A recusa nao afeta o uso da plataforma.</p>
            <form action={updateMarketing} className="mt-4 flex gap-2">
              <button name="granted" value="true" className="rounded-[8px] border border-white/15 px-4 py-2">Aceitar</button>
              <button name="granted" value="false" className="rounded-[8px] border border-white/15 px-4 py-2">Revogar</button>
            </form>
            <p className="mt-3 text-xs text-white/50">Status atual: {marketing ? "aceito" : "nao aceito"}</p>
          </section>
        </div>
        <section className="mt-4 rounded-[8px] border border-white/10 bg-white/[.035] p-5">
          <h2 className="text-lg font-black">Aceites registrados</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            {acceptances.map((item) => <li key={item.id}>{item.version.document.name} - {item.versionNumber} - {item.acceptedAt.toLocaleString("pt-BR")}</li>)}
            {!acceptances.length ? <li>Nenhum aceite versionado registrado ainda.</li> : null}
          </ul>
        </section>
        <section className="mt-4 rounded-[8px] border border-white/10 bg-white/[.035] p-5">
          <h2 className="text-lg font-black">Solicitacoes</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            {requests.map((item) => <li key={item.id}>{item.protocol} - {item.type} - {item.status}</li>)}
            {!requests.length ? <li>Nenhuma solicitacao aberta.</li> : null}
          </ul>
          <Link href="/dashboard/configuracoes/excluir-conta" className="mt-4 inline-flex text-[#f5d78c]">Solicitar exclusao da conta</Link>
        </section>
      </div>
    </main>
  );
}
