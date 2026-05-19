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
    <div className="flex items-center gap-4 border-b border-[#e1e6e8] py-4 last:border-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#edf2f4] text-[#5f7179]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold uppercase tracking-[0.08em] text-[#7a858b]">{label}</p>
        <p className="mt-1 truncate text-[18px] font-black text-[#202a30]">{value}</p>
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
    <div className="bg-white px-5 py-8">
      <section className="rounded-[8px] border border-[#e0e5e7] bg-white p-5">
        <h2 className="text-[25px] font-black text-[#202a30]">Informações pessoais</h2>
        <div className="mt-4">
          <InfoRow icon={<UserRound className="h-5 w-5" />} label="Nome" value={name ?? "Não informado"} />
          <InfoRow icon={<Mail className="h-5 w-5" />} label="E-mail" value={email ?? "Não informado"} />
          <InfoRow icon={<Phone className="h-5 w-5" />} label="Telefone" value={phone ?? "Não informado"} />
          <InfoRow icon={<MapPin className="h-5 w-5" />} label="Cidade" value={city ?? "Definir pela busca"} />
        </div>
      </section>

      <section className="mt-7 rounded-[8px] border border-[#e0e5e7] bg-[#f8faf9] p-5">
        <h2 className="text-[25px] font-black text-[#202a30]">Segurança e privacidade</h2>
        <div className="mt-4">
          <InfoRow icon={<BadgeCheck className="h-5 w-5" />} label="E-mail" value={emailVerified ? "Validado" : "Pendente"} />
          <InfoRow icon={<Phone className="h-5 w-5" />} label="Telefone" value={phoneVerified ? "Verificado" : "Pendente"} />
          <InfoRow icon={<LockKeyhole className="h-5 w-5" />} label="Privacidade" value={privacyOk ? "Consentimentos ativos" : "Revisar consentimentos"} />
          <InfoRow icon={<ShieldCheck className="h-5 w-5" />} label="Exposição pública" value="Telefone protegido no perfil de cliente" />
        </div>
      </section>
    </div>
  );
}
