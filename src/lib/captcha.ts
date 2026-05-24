/**
 * Integração de CAPTCHA — suporta Cloudflare Turnstile e Google reCAPTCHA v3.
 *
 * Para ativar, defina no ambiente:
 *   CAPTCHA_PROVIDER=turnstile   (recomendado — gratuito, GDPR-friendly)
 *   TURNSTILE_SECRET_KEY=...
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
 *
 *   ou
 *
 *   CAPTCHA_PROVIDER=recaptcha
 *   RECAPTCHA_SECRET_KEY=...
 *   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
 *
 * Enquanto CAPTCHA_PROVIDER não estiver definido, todas as verificações passam
 * automaticamente (modo dev/bypass).
 */

export type CaptchaResult = { success: boolean; error?: string };

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

async function verifyTurnstile(token: string, ip: string): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return isProductionRuntime()
      ? { success: false, error: "TURNSTILE_SECRET_KEY ausente em producao." }
      : { success: true };
  }
  if (!token) return { success: false, error: "Token CAPTCHA ausente." };

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
  return { success: data.success, error: data["error-codes"]?.[0] };
}

async function verifyRecaptcha(token: string): Promise<CaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return isProductionRuntime()
      ? { success: false, error: "RECAPTCHA_SECRET_KEY ausente em producao." }
      : { success: true };
  }
  if (!token) return { success: false, error: "Token CAPTCHA ausente." };

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "POST" });
  const data = (await res.json()) as { success: boolean; score?: number };
  // reCAPTCHA v3: score < 0.5 indica provável bot
  const passed = data.success && (data.score === undefined || data.score >= 0.5);
  return { success: passed };
}

/**
 * Verifica o token CAPTCHA enviado pelo cliente.
 * @param token - Valor de `cf-turnstile-response` ou `g-recaptcha-response`
 * @param ip    - IP do cliente (para Turnstile)
 */
export async function verifyCaptcha(token: string, ip = ""): Promise<CaptchaResult> {
  const provider = process.env.CAPTCHA_PROVIDER ?? "none";
  if (provider === "turnstile") return verifyTurnstile(token, ip);
  if (provider === "recaptcha") return verifyRecaptcha(token);
  if (isProductionRuntime()) {
    return { success: false, error: "CAPTCHA_PROVIDER deve ser turnstile ou recaptcha em producao." };
  }
  return { success: true }; // bypass em dev
}
