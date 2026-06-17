export type FirebaseSmsAccountType = "client" | "model" | "host";

export type FirebaseSmsConsent = {
  termsConsent: boolean;
  lgpdConsent: boolean;
  ageConfirmed: boolean;
  ownershipConfirmed: boolean;
};

export type FirebaseSmsAudit = {
  verificationId: string;
  provider: "firebase-phone-auth";
  expiresInSeconds: number;
  resendInSeconds: number;
};

async function readResponseError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}

export async function prepareFirebaseSmsAudit({
  phone,
  accountType,
  consent,
}: {
  phone: string;
  accountType: FirebaseSmsAccountType;
  consent: FirebaseSmsConsent;
}): Promise<FirebaseSmsAudit> {
  const response = await fetch("/api/auth/phone/firebase-send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "prepare",
      phone,
      accountType,
      ...consent,
    }),
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, "Nao foi possivel iniciar o envio por SMS."));
  }

  return (await response.json()) as FirebaseSmsAudit;
}

async function reportFirebaseSmsResult({
  action,
  verificationId,
  phone,
  accountType,
  error,
}: {
  action: "sent" | "error";
  verificationId: string;
  phone: string;
  accountType: FirebaseSmsAccountType;
  error?: string;
}) {
  try {
    await fetch("/api/auth/phone/firebase-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        verificationId,
        phone,
        accountType,
        error,
      }),
    });
  } catch (err) {
    console.warn("[firebase-phone-audit] Nao foi possivel registrar status do SMS.", err);
  }
}

export function reportFirebaseSmsAccepted(input: {
  verificationId: string;
  phone: string;
  accountType: FirebaseSmsAccountType;
}) {
  return reportFirebaseSmsResult({ action: "sent", ...input });
}

export function reportFirebaseSmsFailed(input: {
  verificationId: string;
  phone: string;
  accountType: FirebaseSmsAccountType;
  error: string;
}) {
  return reportFirebaseSmsResult({ action: "error", ...input });
}
