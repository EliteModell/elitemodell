"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { Building2, ChevronRight, ShieldCheck, UserRound, X } from "lucide-react";
import {
  type EntryAccountRole,
  cadastroHrefForRole,
  loginHrefForRole,
} from "@/lib/account-routes";

type EntryChoiceMode = "login" | "register";

const options: Array<{
  role: EntryAccountRole;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  {
    role: "cliente",
    title: "Cliente",
    description: "Quero explorar perfis, salvar favoritos e acessar recursos da plataforma.",
    icon: UserRound,
  },
  {
    role: "profissional",
    title: "Profissional / Acompanhante",
    description: "Quero criar meu perfil profissional e anunciar na plataforma.",
    icon: ShieldCheck,
  },
  {
    role: "anfitriao",
    title: "Anfitrião",
    description: "Quero cadastrar um local para receber profissionais com segurança.",
    icon: Building2,
  },
];

function hrefFor(mode: EntryChoiceMode, role: EntryAccountRole) {
  return mode === "login" ? loginHrefForRole(role) : cadastroHrefForRole(role);
}

export function EntryChoiceCards({
  mode,
  onNavigate,
}: {
  mode: EntryChoiceMode;
  onNavigate?: () => void;
}) {
  return (
    <div className="entry-choice-list">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Link key={option.role} href={hrefFor(mode, option.role)} className="entry-choice-card" onClick={onNavigate}>
            <span className="entry-choice-icon"><Icon size={22} strokeWidth={2.2} /></span>
            <span className="entry-choice-copy">
              <strong>{option.title}</strong>
              <small>{mode === "login" ? `Entrar na área de ${option.title.toLowerCase()}.` : option.description}</small>
            </span>
            <ChevronRight className="entry-choice-arrow" size={20} strokeWidth={2.2} />
          </Link>
        );
      })}
    </div>
  );
}

export function EntryChoiceSheet({
  mode,
  open,
  onClose,
}: {
  mode: EntryChoiceMode | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !mode) return null;

  const title = mode === "login" ? "Entrar como" : "Como você quer se cadastrar?";
  const subtitle = mode === "login"
    ? "Escolha a área correta para entrar no painel certo."
    : "Cada tipo de conta segue para o fluxo correto, sem misturar etapas.";

  return (
    <div className="entry-choice-overlay" role="dialog" aria-modal="true" aria-labelledby="entry-choice-title">
      <button type="button" className="entry-choice-backdrop" aria-label="Fechar" onClick={onClose} />
      <section className="entry-choice-panel">
        <div className="entry-choice-head">
          <div>
            <span>Elite Modell</span>
            <h2 id="entry-choice-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>
        <EntryChoiceCards mode={mode} onNavigate={onClose} />
      </section>
    </div>
  );
}

export function EntryChoiceStyles() {
  return (
    <style>{`
      .entry-choice-list {
        display: grid;
        gap: 12px;
      }
      .entry-choice-card {
        display: grid;
        grid-template-columns: 46px 1fr 24px;
        align-items: center;
        gap: 12px;
        min-height: 88px;
        padding: 14px;
        border: 1px solid rgba(214,168,58,0.25);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(20,20,20,0.98), rgba(10,10,12,0.98));
        color: #fff;
        text-decoration: none;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
      }
      .entry-choice-icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: #f5b83b;
        background: rgba(245,184,59,0.10);
        border: 1px solid rgba(214,168,58,0.22);
      }
      .entry-choice-copy {
        min-width: 0;
      }
      .entry-choice-copy strong {
        display: block;
        color: #fff;
        font-size: 15px;
        font-weight: 950;
        line-height: 1.2;
      }
      .entry-choice-copy small {
        display: block;
        margin-top: 5px;
        color: #b8b8b8;
        font-size: 12.5px;
        line-height: 1.45;
      }
      .entry-choice-arrow {
        color: #f5b83b;
      }
      .entry-choice-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        align-items: end;
      }
      .entry-choice-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(0,0,0,0.72);
        backdrop-filter: blur(10px);
      }
      .entry-choice-panel {
        position: relative;
        width: min(100% - 16px, 430px);
        margin: 0 auto calc(8px + env(safe-area-inset-bottom));
        padding: 18px;
        border: 1px solid rgba(214,168,58,0.28);
        border-radius: 26px;
        background: #050505;
        box-shadow: 0 -24px 70px rgba(0,0,0,0.64);
      }
      .entry-choice-head {
        display: grid;
        grid-template-columns: 1fr 42px;
        gap: 14px;
        align-items: start;
        margin-bottom: 16px;
      }
      .entry-choice-head span {
        display: block;
        color: #f5b83b;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .entry-choice-head h2 {
        margin: 7px 0 0;
        color: #fff;
        font-size: 24px;
        line-height: 1.1;
        font-weight: 950;
      }
      .entry-choice-head p {
        margin: 9px 0 0;
        color: #b8b8b8;
        font-size: 13px;
        line-height: 1.55;
      }
      .entry-choice-head button {
        width: 42px;
        height: 42px;
        border: 1px solid rgba(214,168,58,0.28);
        border-radius: 14px;
        background: #101014;
        color: #f5b83b;
        display: grid;
        place-items: center;
      }
      @media (min-width: 768px) {
        .entry-choice-overlay {
          align-items: center;
        }
        .entry-choice-panel {
          margin-bottom: 0;
        }
      }
    `}</style>
  );
}
