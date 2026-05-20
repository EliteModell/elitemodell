"use client";

import { BadgeCheck, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[82px] items-center gap-4 border-b border-white/10 py-4 last:border-0">
      <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[8px] border border-[#d4a843]/14 bg-white/[0.045] text-[#f5d78c]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold uppercase text-[#f5f0e4]/42">{label}</p>
        <p className="mt-1 break-words text-[17px] font-black leading-6 text-[#f5f0e4]">{value}</p>
      </div>
    </div>
  );
}

export default function ProfileInfoSection({
  name,
  email,
  phone,
  city,
  emailVerified,
  phoneVerified,
  privacyOk,
}: {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  privacyOk: boolean;
}) {
  return (
    <div className="client-page-tight">
      <section className="client-card p-6">
        <h2 className="text-[25px] font-black text-[#f5f0e4]">Informações pessoais</h2>
        <div className="mt-5">
          <InfoRow icon={<UserRound className="h-5 w-5" />} label="Nome" value={name ?? "Não informado"} />
          <InfoRow icon={<Mail className="h-5 w-5" />} label="E-mail" value={email ?? "Não informado"} />
          <InfoRow icon={<Phone className="h-5 w-5" />} label="Telefone" value={phone ?? "Não informado"} />
          <InfoRow icon={<MapPin className="h-5 w-5" />} label="Cidade" value={city ?? "Definir pela busca"} />
        </div>
      </section>

      <section className="client-panel mt-6 p-6">
        <h2 className="text-[25px] font-black text-[#f5f0e4]">Segurança e privacidade</h2>
        <div className="mt-5">
          <InfoRow icon={<BadgeCheck className="h-5 w-5" />} label="E-mail" value={emailVerified ? "Validado" : "Pendente"} />
          <InfoRow icon={<Phone className="h-5 w-5" />} label="Telefone" value={phoneVerified ? "Verificado" : "Pendente"} />
          <InfoRow icon={<LockKeyhole className="h-5 w-5" />} label="Privacidade" value={privacyOk ? "Consentimentos ativos" : "Revisar consentimentos"} />
          <InfoRow icon={<ShieldCheck className="h-5 w-5" />} label="Exposição pública" value="Telefone protegido no perfil de cliente" />
        </div>
      </section>
    </div>
  );
}
