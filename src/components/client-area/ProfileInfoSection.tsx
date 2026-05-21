"use client";

import { BadgeCheck, ChevronRight, Clock3, Globe2, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

type ProfileRow = {
  icon: React.ReactNode;
  label: string;
  value: string;
  status?: "success" | "warning";
};

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="profile-section-header">
      <span>{icon}</span>
      <h2>{title}</h2>
    </div>
  );
}

function InfoRow({ icon, label, value, status }: ProfileRow) {
  return (
    <div className="profile-info-row">
      <span className="profile-row-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      {status === "success" ? <BadgeCheck className="profile-status-success" /> : null}
      {status === "warning" ? <Clock3 className="profile-status-warning" /> : null}
      <ChevronRight className="profile-row-arrow" />
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
    <div className="profile-sections">
      <section className="profile-section-card">
        <SectionHeader icon={<UserRound />} title="Informações pessoais" />
        <div className="profile-row-list">
          <InfoRow icon={<UserRound />} label="NOME" value={name ?? "Não informado"} />
          <InfoRow icon={<Mail />} label="E-MAIL" value={email ?? "Não informado"} />
          <InfoRow icon={<Phone />} label="TELEFONE" value={phone ?? "Não informado"} />
          <InfoRow icon={<MapPin />} label="CIDADE" value={city ?? "Definir pela busca"} />
        </div>
      </section>

      <section className="profile-section-card">
        <SectionHeader icon={<ShieldCheck />} title="Segurança e privacidade" />
        <div className="profile-row-list">
          <InfoRow icon={<ShieldCheck />} label="E-MAIL" value={emailVerified ? "Validado" : "Pendente"} status={emailVerified ? "success" : "warning"} />
          <InfoRow icon={<Phone />} label="TELEFONE" value={phoneVerified ? "Verificado" : "Pendente"} status={phoneVerified ? "success" : "warning"} />
          <InfoRow icon={<LockKeyhole />} label="PRIVACIDADE" value={privacyOk ? "Consentimentos ativos" : "Revisar consentimentos"} />
          <InfoRow icon={<Globe2 />} label="EXPOSIÇÃO PÚBLICA" value="Gerenciar visibilidade do perfil" />
        </div>
      </section>
    </div>
  );
}
