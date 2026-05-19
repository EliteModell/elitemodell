import ClientAreaShell from "@/components/client-area/ClientAreaShell";
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
      className="flex min-h-[64px] items-center gap-3.5 border-b border-[#e8edef] px-5 no-underline transition-colors active:bg-[#f5f8f9]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#f0f3f5] text-[#5a6a71]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[#1f2a30]">{label}</p>
        {description && <p className="mt-0.5 text-[12px] text-[#6a7a81]">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9aabaf]" />
    </Link>
  );
}

export default function ConfiguracoesPage() {
  return (
    <ClientAreaShell backHref="/dashboard">
      <div className="py-6">
        <div className="px-4 mb-4">
          <h1 className="text-[20px] font-bold text-[#1f2a30]">Configurações do cadastro</h1>
          <p className="mt-1 text-[13px] text-[#566570]">Gerencie suas preferências e privacidade.</p>
        </div>

        <div className="bg-white shadow-[0_1px_4px_rgba(20,31,36,0.06)]">
          <p className="border-b border-[#e8edef] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6a7a81]">
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

        <div className="mt-3 bg-white shadow-[0_1px_4px_rgba(20,31,36,0.06)]">
          <p className="border-b border-[#e8edef] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6a7a81]">
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
    </ClientAreaShell>
  );
}
