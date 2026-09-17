"use client";

import { useEffect, useState } from "react";

const COOKIE = "elite_cookie_consent";
const PREFERENCES = "elite_cookie_preferences";

type CookieChoices = {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

const disabledChoices: CookieChoices = {
  preferences: false,
  analytics: false,
  marketing: false,
};

function persist(value: "all" | "necessary" | "marketing", choices: CookieChoices) {
  localStorage.setItem(COOKIE, value);
  localStorage.setItem(PREFERENCES, JSON.stringify(choices));
  document.cookie = `${COOKIE}=${value}; Max-Age=15552000; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent("elite-cookie-consent", { detail: { value, choices } }));
}

export default function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const [choices, setChoices] = useState<CookieChoices>(disabledChoices);

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setConfigured(Boolean(localStorage.getItem(COOKIE)));
      try {
        const stored = JSON.parse(localStorage.getItem(PREFERENCES) ?? "null") as CookieChoices | null;
        if (stored) setChoices(stored);
      } catch {
        setChoices(disabledChoices);
      }
    }, 0);
    const listener = () => {
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener("elite-open-cookie-settings", listener);
    return () => {
      window.clearTimeout(hydrate);
      window.removeEventListener("elite-open-cookie-settings", listener);
    };
  }, []);

  if (configured && !open) return null;

  function closeWith(value: "all" | "necessary" | "marketing", nextChoices: CookieChoices) {
    persist(value, nextChoices);
    setChoices(nextChoices);
    setConfigured(true);
    setCustomizing(false);
    setOpen(false);
  }

  function saveCustomChoices() {
    closeWith(choices.marketing ? "marketing" : "necessary", choices);
  }

  return (
    <div className="cookie-consent-panel fixed inset-x-0 bottom-0 z-[400] border-t border-[#fcf7ff] bg-white p-4 text-[#141212] shadow-[0_-20px_60px_rgba(37, 31, 32,.14)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="max-w-2xl">
          <h2 className="text-base font-black">Cookies e tecnologias semelhantes</h2>
          <p className="mt-1 text-sm leading-6 text-[#686270]">
            Necessários mantêm login e segurança. Preferências, analytics e campanhas ficam desativados quando você
            rejeita os não necessários.
          </p>
        </div>

        {customizing ? (
          <div className="cookie-preferences-grid grid gap-2 rounded-xl border border-[#fcf7ff] bg-[#f7f7fa] p-3 sm:grid-cols-2 lg:grid-cols-4">
            <CookieCategory
              label="Necessários"
              description="Login, segurança e funcionamento básico."
              checked
              disabled
              onChange={() => undefined}
            />
            <CookieCategory
              label="Preferências"
              description="Memoriza escolhas de interface."
              checked={choices.preferences}
              onChange={(checked) => setChoices((current) => ({ ...current, preferences: checked }))}
            />
            <CookieCategory
              label="Analytics"
              description="Mede uso e desempenho da plataforma."
              checked={choices.analytics}
              onChange={(checked) => setChoices((current) => ({ ...current, analytics: checked }))}
            />
            <CookieCategory
              label="Marketing e campanhas"
              description="Preferências de campanhas e comunicações promocionais."
              checked={choices.marketing}
              onChange={(checked) => setChoices((current) => ({ ...current, marketing: checked }))}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setCustomizing(true);
              setOpen(true);
            }}
            className="cookie-button cookie-button-secondary min-h-11 rounded-[8px] border border-[#e1a6ff] bg-transparent px-4 font-black text-[#514b59]"
          >
            Configurar
          </button>
          <button
            type="button"
            onClick={() => closeWith("necessary", disabledChoices)}
            className="cookie-button cookie-button-outline min-h-11 rounded-[8px] border border-[#b72cff] bg-transparent px-4 font-black text-[#e1a6ff]"
          >
            Rejeitar não necessários
          </button>
          {customizing ? (
            <button
              type="button"
              onClick={saveCustomChoices}
              className="cookie-button cookie-button-primary min-h-11 rounded-[8px] border border-[#b72cff] bg-[#b72cff] px-4 font-black text-white"
            >
              Salvar preferências
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => closeWith("all", { preferences: true, analytics: true, marketing: true })}
            className="cookie-button cookie-button-primary min-h-11 rounded-[8px] border border-[#b72cff] bg-[#b72cff] px-4 font-black text-white"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}

function CookieCategory({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="cookie-category flex cursor-pointer items-start gap-3 rounded-lg border border-[#fcf7ff] bg-white p-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="cookie-toggle mt-1 h-4 w-4 accent-[#b72cff]"
      />
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-[#686270]">{description}</span>
      </span>
    </label>
  );
}
