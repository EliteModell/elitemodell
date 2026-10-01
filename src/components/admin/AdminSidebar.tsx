"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Banknote, ClipboardList, FileCheck, Headphones, LayoutDashboard, LogOut, MessageCircle, Scale, Settings, ShieldAlert, TicketPercent, UserCog, UserRound, UsersRound } from "lucide-react";
import { loadSupabaseAuth } from "@/lib/supabase-auth-loader";

const adminNav = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["Profissionais", "/admin/profissionais", UserRound],
  ["Avaliações", "/admin/avaliacoes", MessageCircle],
  ["KYC", "/admin/kyc", FileCheck],
  ["Clientes", "/admin/clientes", UsersRound],
  ["Denúncias", "/admin/denuncias", ShieldAlert],
  ["Suporte", "/admin/suporte", Headphones],
  ["Financeiro", "/admin/financeiro", Banknote],
  ["Funcionários", "/admin/funcionarios", UserCog],
  ["Auditoria", "/admin/auditoria", ClipboardList],
  ["Jurídico", "/admin/juridico", Scale],
  ["Configurações", "/admin/configuracoes", Settings],
  ["Cupons", "/admin/cupons", TicketPercent],
] as const;

type Props = { mobileOpen: boolean; onClose: () => void; name?: string | null; email?: string | null };

function initials(name?: string | null) {
  if (!name) return "AD";
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export default function AdminSidebar({ mobileOpen, onClose, name, email }: Props) {
  const pathname = usePathname() ?? "/admin";

  async function handleSignOut() {
    const supabase = await loadSupabaseAuth();
    await supabase.auth.signOut();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <>
      {mobileOpen ? <button type="button" aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-40 bg-[#141212]/45 md:hidden" /> : null}
      <aside className={`dash-sidebar fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-[320px] flex-col border-r border-[#eee8f1] bg-white shadow-[14px_0_42px_rgba(37,31,32,.08)] transition-transform duration-200 md:w-[280px] md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-[#eee8f1] p-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" onClick={onClose} className="text-sm font-black uppercase tracking-[.18em] text-[#8f1fd1] no-underline">Elite Modell Admin</Link>
            <button type="button" onClick={onClose} aria-label="Fechar menu" className="grid h-8 w-8 place-items-center rounded-lg border border-[#eee8f1] text-[#737684] md:hidden">×</button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-[#eee8f1] p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#b72cff]/10 text-sm font-black text-[#8f1fd1]">{initials(name)}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#141212]">{name || "Administrador"}</p>
            <p className="truncate text-xs text-[#737684]">{email || "Acesso administrativo"}</p>
          </div>
        </div>
        <nav aria-label="Navegação administrativa" className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {adminNav.map(([label, href, Icon]) => {
              const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
              return <Link key={href} href={href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold no-underline transition-colors ${active ? "bg-[#f7ebff] text-[#8f1fd1]" : "text-[#555866] hover:bg-[#faf7fc] hover:text-[#8f1fd1]"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}</Link>;
            })}
          </div>
        </nav>
        <div className="border-t border-[#eee8f1] p-3">
          <button type="button" onClick={handleSignOut} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#9b3039] transition hover:bg-[#fff1f2]"><LogOut className="h-4 w-4" aria-hidden="true" />Sair</button>
        </div>
      </aside>
    </>
  );
}
