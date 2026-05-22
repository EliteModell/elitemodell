import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPersonaInquiry, buildPersonaUrl } from "@/lib/persona";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { consentGiven?: boolean };
  if (!body.consentGiven) {
    return NextResponse.json({ error: "Consentimento é obrigatório." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { clientStatus: true, termsConsent: true, lgpdConsent: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (user.clientStatus === "VERIFIED") return NextResponse.json({ error: "Conta já verificada." }, { status: 400 });
  if (user.clientStatus === "PENDING_REVIEW") return NextResponse.json({ error: "Verificação já em análise." }, { status: 400 });
  if (!user.termsConsent || !user.lgpdConsent) {
    return NextResponse.json(
      { error: "Aceite os Termos de Uso e a Política de Privacidade primeiro." },
      { status: 400 },
    );
  }

  // Normaliza: aceita "persona", "PERSONA", "Persona " etc.
  const kycProvider = process.env.KYC_PROVIDER?.trim().toUpperCase();

  if (kycProvider === "PERSONA") {
    const apiKey = process.env.PERSONA_API_KEY?.trim();
    const templateId = process.env.PERSONA_TEMPLATE_ID?.trim();

    // Validações de configuração antes de qualquer escrita no banco
    if (!apiKey) {
      console.error("[KYC] PERSONA_API_KEY nao configurada.");
      return NextResponse.json(
        { error: "Verificação indisponível: PERSONA_API_KEY ausente. Configure nas variáveis de ambiente." },
        { status: 503 },
      );
    }

    if (!templateId) {
      console.error("[KYC] PERSONA_TEMPLATE_ID nao configurado.");
      return NextResponse.json(
        { error: "Verificação indisponível: PERSONA_TEMPLATE_ID ausente. Configure nas variáveis de ambiente." },
        { status: 503 },
      );
    }

    // Persona exige Inquiry Template (itmpl_), não Verification Template (vtmpl_)
    if (!templateId.startsWith("itmpl_")) {
      console.error(`[KYC] PERSONA_TEMPLATE_ID invalido: ${templateId.slice(0, 12)}... | Deve comecar com itmpl_`);
      return NextResponse.json(
        {
          error:
            "Configuração inválida: PERSONA_TEMPLATE_ID deve ser um Inquiry Template (itmpl_), não um Verification Template (vtmpl_). Crie um Inquiry Template no Persona Dashboard.",
        },
        { status: 503 },
      );
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
    if (!appUrl) {
      console.error("[KYC] NEXT_PUBLIC_APP_URL e NEXTAUTH_URL ambos ausentes.");
      return NextResponse.json(
        { error: "Verificação indisponível: URL da aplicação não configurada." },
        { status: 503 },
      );
    }

    const redirectUri = `${appUrl}/verificacao/callback`;

    // Cria o inquiry NO PERSONA antes de escrever qualquer coisa no banco
    let inquiryId: string;
    let sessionToken: string | undefined;

    try {
      ({ inquiryId, sessionToken } = await createPersonaInquiry(session.user.id, redirectUri));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[KYC] Persona createInquiry falhou:", msg);
      return NextResponse.json(
        { error: `Não foi possível iniciar a verificação no Persona: ${msg}` },
        { status: 502 },
      );
    }

    // Só grava PENDING_REVIEW depois que o Persona confirmou criação
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        clientStatus: "PENDING_REVIEW",
        kycSubmittedAt: new Date(),
        kycSessionId: inquiryId,
        kycRejectionReason: null,
        termsVersion: "v1.0",
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      status: "PENDING_REVIEW",
      provider: "PERSONA",
      url: buildPersonaUrl(inquiryId, sessionToken),
    });
  }

  // Sem KYC_PROVIDER configurado: fallback manual (dev / sem integração)
  // Em produção isso cria uma pendência para revisão manual da equipe.
  if (kycProvider && kycProvider !== "LOCAL_MANUAL") {
    console.warn(`[KYC] KYC_PROVIDER desconhecido: "${kycProvider}". Usando fallback manual.`);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      clientStatus: "PENDING_REVIEW",
      kycSubmittedAt: new Date(),
      kycRejectionReason: null,
      termsVersion: "v1.0",
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, status: "PENDING_REVIEW" });
}
