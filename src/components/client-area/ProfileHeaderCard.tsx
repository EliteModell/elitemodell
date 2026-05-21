"use client";

/* eslint-disable @next/next/no-img-element -- User profile photos can be remote or uploaded URLs. */

import { Camera, Loader2, Pencil, ShieldCheck } from "lucide-react";

function initials(name?: string | null) {
  if (!name) return "EM";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfileHeaderCard({
  name,
  email,
  image,
  verified,
  uploading,
  onChoosePhoto,
  onEdit,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  verified: boolean;
  uploading: boolean;
  onChoosePhoto: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="profile-page-header">
      <div className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-avatar">
            {image ? <img src={image} alt={name ?? "Avatar"} /> : <span>{initials(name)}</span>}
          </div>
          <div className="profile-hero-copy">
            <h1>{name ?? "Cliente Elite"}</h1>
            <p>{email ?? "Conta discreta"}</p>
            <span>
              <ShieldCheck />
              {verified ? "Conta verificada" : "Verificação em andamento"}
            </span>
          </div>
        </div>

        <div className="profile-actions">
          <button type="button" onClick={onChoosePhoto} disabled={uploading} className="profile-photo-button">
            {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
            {uploading ? "Enviando foto..." : "Trocar foto"}
          </button>
          <button type="button" onClick={onEdit} className="profile-edit-button">
            <Pencil />
            Editar dados
          </button>
        </div>
      </div>
    </section>
  );
}
