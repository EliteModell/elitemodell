"use client";

import Link from "next/link";
import { BadgeCheck, ChevronRight, Clock3, Globe2, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import {
  clientAgeVerificationLabel,
  type ClientAgeVerificationStatus,
} from "@/lib/client-age-verification";
import { CLIENT_AGE_VERIFY_HREF } from "@/components/client-area/ClientSensitiveGate";

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

function LinkedInfoRow({ href, ...row }: ProfileRow & { href: string }) {
  return (
    <Link href={href} className="block no-underline">
      <InfoRow {...row} />
    </Link>
  );
}

export default function ProfileInfoSection({
  name,
  email,
  phone,
  city,
  emailVerified,
  phoneVerified,
  ageVerified,
  ageVerificationStatus,
  privacyOk,
}: {
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  ageVerified: boolean;
  ageVerificationStatus: ClientAgeVerificationStatus;
  privacyOk: boolean;
}) {
  return (
    <div className="profile-sections">
      <section className="profile-section-card">
        <SectionHeader icon={<UserRound />} title="Informacoes pessoais" />
        <div className="profile-row-list">
          <InfoRow icon={<UserRound />} label="NOME" value={name ?? "Nao informado"} />
          <InfoRow icon={<Mail />} label="E-MAIL" value={email ?? "Nao informado"} />
          <InfoRow icon={<Phone />} label="TELEFONE" value={phone ?? "Nao informado"} />
          <InfoRow icon={<MapPin />} label="CIDADE" value={city ?? "Definir pela busca"} />
        </div>
      </section>

      <section className="profile-section-card">
        <SectionHeader icon={<ShieldCheck />} title="Seguranca e verificacao" />
        <div className="profile-row-list">
          <InfoRow icon={<ShieldCheck />} label="E-MAIL" value={emailVerified ? "Validado" : "Pendente"} status={emailVerified ? "success" : "warning"} />
          <InfoRow icon={<Phone />} label="TELEFONE" value={phoneVerified ? "Validado" : "Pendente"} status={phoneVerified ? "success" : "warning"} />
          <LinkedInfoRow
            href={CLIENT_AGE_VERIFY_HREF}
            icon={<LockKeyhole />}
            label="IDADE"
            value={ageVerified ? "Verificada" : clientAgeVerificationLabel(ageVerificationStatus)}
            status={ageVerified ? "success" : "warning"}
          />
          <InfoRow icon={<Globe2 />} label="PRIVACIDADE" value={privacyOk ? "Consentimentos ativos" : "Revisar consentimentos"} status={privacyOk ? "success" : "warning"} />
        </div>
      </section>
    </div>
  );
}
