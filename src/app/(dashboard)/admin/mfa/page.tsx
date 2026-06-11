import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdminIdentity } from "@/lib/admin-access";
import {
  createAdminMfaSession,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  mfaOtpAuthUri,
  verifyTotp,
} from "@/lib/admin-mfa";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function verifyMfa(formData: FormData) {
  "use server";
  const { session } = await requireAdminIdentity("dashboard:view");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const enrollment = await prisma.adminMfaEnrollment.findUnique({
    where: { userId: session.user.id },
  });
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || undefined;
  const userAgent = requestHeaders.get("user-agent") ?? undefined;

  if (!enrollment || !verifyTotp(decryptMfaSecret(enrollment.encryptedSecret), code)) {
    await logAudit({
      adminId: session.user.id,
      action: "ADMIN_ACCESS",
      targetType: "SYSTEM",
      targetId: "mfa",
      reason: "Falha de MFA administrativo",
      ipAddress,
      userAgent,
    });
    redirect("/admin/mfa?erro=1");
  }

  await prisma.adminMfaEnrollment.update({
    where: { userId: session.user.id },
    data: { verifiedAt: enrollment.verifiedAt ?? new Date(), disabledAt: null },
  });
  await createAdminMfaSession(session.user.id, ipAddress, userAgent);
  await logAudit({
    adminId: session.user.id,
    action: "ADMIN_ACCESS",
    targetType: "SYSTEM",
    targetId: "mfa",
    reason: enrollment.verifiedAt ? "MFA administrativo validado" : "MFA administrativo ativado",
    ipAddress,
    userAgent,
  });
  redirect("/admin");
}

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { session } = await requireAdminIdentity("dashboard:view");
  let enrollment = await prisma.adminMfaEnrollment.findUnique({
    where: { userId: session.user.id },
  });

  if (!enrollment || enrollment.disabledAt) {
    const secret = generateMfaSecret();
    enrollment = await prisma.adminMfaEnrollment.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, encryptedSecret: encryptMfaSecret(secret) },
      update: {
        encryptedSecret: encryptMfaSecret(secret),
        verifiedAt: null,
        disabledAt: null,
      },
    });
  }

  const secret = decryptMfaSecret(enrollment.encryptedSecret);
  const uri = mfaOtpAuthUri(session.user.email ?? session.user.id, secret);
  const { erro } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", background: "#050506", color: "#fff", padding: "48px 20px" }}>
      <section style={{ maxWidth: 560, margin: "0 auto", border: "1px solid rgba(212,168,67,.28)", borderRadius: 8, background: "#101012", padding: 28 }}>
        <p style={{ color: "#d4a843", fontWeight: 900, textTransform: "uppercase", fontSize: 12 }}>Seguranca administrativa</p>
        <h1 style={{ margin: "8px 0 12px", fontSize: 30 }}>Verificacao em duas etapas</h1>
        <p style={{ color: "#b8b1a6", lineHeight: 1.6 }}>
          {enrollment.verifiedAt
            ? "Digite o codigo atual do seu aplicativo autenticador."
            : "Adicione a chave abaixo ao Google Authenticator, Microsoft Authenticator ou aplicativo TOTP compativel. Depois confirme o codigo de seis digitos."}
        </p>

        {!enrollment.verifiedAt ? (
          <div style={{ margin: "20px 0", padding: 16, background: "#080809", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
            <strong>Chave manual</strong>
            <code style={{ display: "block", marginTop: 10, color: "#f5d78c", overflowWrap: "anywhere", fontSize: 16 }}>{secret}</code>
            <details style={{ marginTop: 14, color: "#8d8578" }}>
              <summary>URI para configuracao</summary>
              <code style={{ display: "block", marginTop: 8, overflowWrap: "anywhere", fontSize: 11 }}>{uri}</code>
            </details>
          </div>
        ) : null}

        <form action={verifyMfa} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="code" style={{ fontWeight: 800 }}>Codigo de seis digitos</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            style={{ minHeight: 52, borderRadius: 8, border: "1px solid rgba(212,168,67,.34)", background: "#050506", color: "#fff", padding: "0 14px", fontSize: 22, letterSpacing: 0 }}
          />
          {erro ? <p style={{ color: "#ef4444", margin: 0 }}>Codigo invalido ou expirado.</p> : null}
          <button type="submit" style={{ minHeight: 50, border: 0, borderRadius: 8, background: "#d4a843", color: "#080704", fontWeight: 900, cursor: "pointer" }}>
            Verificar e acessar
          </button>
        </form>
      </section>
    </main>
  );
}
