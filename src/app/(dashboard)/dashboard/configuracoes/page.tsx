"use client";
import { Bell, ChevronRight, Globe, Lock, Shield, Smartphone } from "lucide-react";
import Link from "next/link";

function SettingRow({
  icon,
  label,
  description,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[88px] items-center gap-4 border-b border-white/10 px-5 no-underline transition-colors active:bg-white/10 last:border-0"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/14 bg-white/[0.045] text-[#f5d78c]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-bold text-[#f5f0e4]">{label}</p>
        {description && <p className="mt-1 text-[13px] leading-5 text-[#f5f0e4]/54">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#f5d78c]" />
    </Link>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="client-page">
      <div className="mb-7">
        <p className="client-kicker">Preferências</p>
        <h1 className="client-title mt-1">Configurações</h1>
        <p className="client-subtitle mt-2">Gerencie suas preferências e privacidade.</p>
      </div>

      <div className="client-card overflow-hidden">
        <p className="border-b border-white/10 px-5 py-4 text-[12px] font-black uppercase text-[#f5f0e4]/44">
          Conta
        </p>
        <SettingRow
          icon={<Lock className="h-5 w-5" />}
          label="Segurança e senha"
          description="Altere sua senha e dados de acesso"
          href="/dashboard/perfil"
        />
        <SettingRow
          icon={<Smartphone className="h-5 w-5" />}
          label="Verificação de telefone"
          description="Verifique seu número de celular"
          href="/dashboard/perfil"
        />
        <SettingRow
          icon={<Shield className="h-5 w-5" />}
          label="Documentos verificados"
          description="Aumente a credibilidade da sua conta"
          href="/dashboard/perfil"
        />
      </div>

      <div className="client-card mt-6 overflow-hidden">
        <p className="border-b border-white/10 px-5 py-4 text-[12px] font-black uppercase text-[#f5f0e4]/44">
          Preferências
        </p>
        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          label="Notificações"
          description="Gerencie alertas e avisos"
          href="/notifications"
        />
        <SettingRow
          icon={<Globe className="h-5 w-5" />}
          label="Privacidade"
          description="Controle quem vê seu perfil"
          href="/privacy"
        />
      </div>
    </div>
  );
}
