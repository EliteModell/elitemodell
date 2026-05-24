"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export type CaptchaFieldHandle = {
  getToken: () => Promise<string | undefined>;
  reset: () => void;
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Nao foi possivel carregar o CAPTCHA."));
    document.head.appendChild(script);
  });
}

export const CaptchaField = forwardRef<CaptchaFieldHandle>(function CaptchaField(_, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !mountRef.current || widgetIdRef.current) return;

    let active = true;
    loadScript("cf-turnstile-script", "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit")
      .then(() => {
        if (!active || !mountRef.current || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(mountRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (value: string) => {
            setToken(value);
            setError("");
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setError("Nao foi possivel validar o CAPTCHA. Tente novamente.");
          },
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar o CAPTCHA.");
      });

    return () => {
      active = false;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async getToken() {
      if (TURNSTILE_SITE_KEY) {
        if (!token) throw new Error("Confirme a verificacao anti-spam.");
        return token;
      }

      if (RECAPTCHA_SITE_KEY) {
        await loadScript(
          "google-recaptcha-script",
          `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`
        );
        if (!window.grecaptcha) throw new Error("Nao foi possivel carregar o reCAPTCHA.");
        await new Promise<void>((resolve) => window.grecaptcha?.ready(resolve));
        const recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "register" });
        if (!recaptchaToken) throw new Error("Nao foi possivel validar o reCAPTCHA.");
        return recaptchaToken;
      }

      return undefined;
    },
    reset() {
      setToken("");
      if (TURNSTILE_SITE_KEY && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }), [token]);

  if (!TURNSTILE_SITE_KEY && !RECAPTCHA_SITE_KEY) return null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {TURNSTILE_SITE_KEY ? (
        <div
          ref={mountRef}
          style={{
            minHeight: 65,
            overflow: "hidden",
          }}
        />
      ) : (
        <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
          Protecao anti-spam ativa.
        </p>
      )}
      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
});
