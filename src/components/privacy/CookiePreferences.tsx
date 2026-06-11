"use client";

import { useEffect, useState } from "react";

const COOKIE = "elite_cookie_consent";

function persist(value: "all" | "necessary") {
  localStorage.setItem(COOKIE, value);
  document.cookie = `${COOKIE}=${value}; Max-Age=15552000; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent("elite-cookie-consent", { detail: value }));
}

export default function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const hydrate = window.setTimeout(() => setConfigured(Boolean(localStorage.getItem(COOKIE))), 0);
    const listener = () => setOpen(true);
    window.addEventListener("elite-open-cookie-settings", listener);
    return () => {
      window.clearTimeout(hydrate);
      window.removeEventListener("elite-open-cookie-settings", listener);
    };
  }, []);

  if (configured && !open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[400] border-t border-[#d4a843]/30 bg-[#0b0b0d] p-4 text-white shadow-[0_-20px_60px_rgba(0,0,0,.55)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-base font-black">Cookies e tecnologias semelhantes</h2>
          <p className="mt-1 text-sm leading-6 text-white/60">Necessarios mantêm login e seguranca. Preferencias, analytics e campanhas ficam desativados quando voce rejeita os nao necessarios.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => { persist("necessary"); setConfigured(true); setOpen(false); }} className="min-h-11 rounded-[8px] border border-[#d4a843] bg-transparent px-4 font-black text-[#f5d78c]">Rejeitar nao necessarios</button>
          <button type="button" onClick={() => { persist("all"); setConfigured(true); setOpen(false); }} className="min-h-11 rounded-[8px] border border-[#d4a843] bg-[#d4a843] px-4 font-black text-black">Aceitar todos</button>
        </div>
      </div>
    </div>
  );
}
