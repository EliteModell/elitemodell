"use client";

import { BrandMark } from "@/components/BrandMark";
import {
  AGE_DECLARATION_COOKIE,
  AGE_DECLARATION_MAX_AGE_SECONDS,
  AGE_DECLARATION_VALUE,
} from "@/lib/age-declaration";

function safeReturnUrl(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") && value !== "/verificacao-idade"
    ? value
    : "/";
}

export default function AgeDeclarationPageClient({ returnUrl }: { returnUrl: string }) {
  function confirmAge() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGE_DECLARATION_COOKIE}=${AGE_DECLARATION_VALUE}; Max-Age=${AGE_DECLARATION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_modell_ageConsentAcceptedAt", new Date().toISOString());
    window.location.assign(safeReturnUrl(returnUrl));
  }

  return (
    <main className="age-declaration-page">
      <section className="age-declaration-card" aria-labelledby="age-declaration-title">
        <div className="age-declaration-brand"><BrandMark priority /></div>
        <p className="age-declaration-eyebrow">Conteúdo +18</p>
        <div className="age-declaration-badge" aria-hidden="true">18+</div>
        <h1 id="age-declaration-title">Conteúdo destinado a maiores de 18 anos.</h1>
        <p>Ao continuar, você declara possuir 18 anos ou mais.</p>
        <div className="age-declaration-actions">
          <button type="button" onClick={confirmAge}>Tenho 18 anos ou mais</button>
          <a href="/saida">Sair</a>
        </div>
      </section>
      <style>{`
        .age-declaration-page{min-height:100dvh;display:grid;place-items:center;overflow-x:hidden;padding:max(18px,env(safe-area-inset-top)) 14px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 0%,rgba(183,44,255,.2),transparent 36%),#050505;color:#fff}
        .age-declaration-card{width:min(100%,430px);max-height:calc(100dvh - 36px);overflow:auto;border:1px solid rgba(183,44,255,.3);border-radius:24px;padding:26px 20px 20px;text-align:center;background:linear-gradient(180deg,rgba(22,20,24,.99),rgba(8,8,9,.99));box-shadow:0 30px 90px rgba(0,0,0,.7);box-sizing:border-box}
        .age-declaration-brand{display:inline-grid;width:min(208px,64vw);margin-bottom:22px;padding:8px 14px;border:1px solid rgba(183,44,255,.28);border-radius:18px;background:#090909;box-sizing:border-box}
        .age-declaration-eyebrow{margin:0 0 12px;color:#d786ff;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
        .age-declaration-badge{display:inline-grid;place-items:center;min-width:82px;min-height:50px;margin-bottom:16px;border:1px solid rgba(225,166,255,.55);border-radius:999px;color:#e1a6ff;font-size:20px;font-weight:950}
        h1{margin:0;font-size:clamp(26px,7vw,34px);line-height:1.08;text-wrap:balance}p:not(.age-declaration-eyebrow){margin:16px 0 0;color:#c4bec8;line-height:1.6}
        .age-declaration-actions{display:grid;gap:10px;margin-top:24px}.age-declaration-actions button,.age-declaration-actions a{display:flex;min-height:54px;width:100%;align-items:center;justify-content:center;border-radius:16px;font:inherit;font-weight:900;box-sizing:border-box}.age-declaration-actions button{border:0;background:linear-gradient(135deg,#e1a6ff,#b72cff 48%,#65009b);color:#090909;cursor:pointer}.age-declaration-actions a{border:1px solid rgba(255,255,255,.18);color:#fff;text-decoration:none;background:#111}
        @media(max-width:360px){.age-declaration-card{padding:22px 16px 16px;border-radius:20px}.age-declaration-brand{margin-bottom:18px}}
      `}</style>
    </main>
  );
}
