"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Save, X } from "lucide-react";
import ProfileHeaderCard from "@/components/client-area/ProfileHeaderCard";
import ProfileInfoSection from "@/components/client-area/ProfileInfoSection";

export type PremiumProfileData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    phoneVerified?: boolean;
    phoneVerifiedAt?: string | null;
    document?: string | null;
    role: string;
    verified: boolean;
    credits: number;
    emailVerified: string | null;
    createdAt: string;
    birthDate: string | null;
    termsConsent: boolean;
    lgpdConsent: boolean;
  };
  city: string | null;
  vip: {
    label: string;
    description: string;
    progress: number;
  };
  metrics: {
    favoriteProfiles: number;
    appointments: number;
    activeAppointments: number;
    completedAppointments: number;
    reviews: number;
  };
  onboarding: Array<{
    label: string;
    done: boolean;
    detail: string;
  }>;
  recentHistory: Array<{
    id: string;
    type: "Agendamento";
    title: string;
    detail: string;
    date: string;
  }>;
};

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function PremiumProfile({ data }: { data: PremiumProfileData }) {
  const [profile, setProfile] = useState(data.user);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: data.user.name ?? "",
    phone: maskPhone(data.user.phone ?? ""),
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Use uma imagem de até 8MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível salvar a foto.");

      setProfile((current) => ({ ...current, image: payload.image }));
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/\D/g, ""),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível atualizar o perfil.");

      setProfile((current) => ({
        ...current,
        name: payload.name ?? current.name,
        phone: payload.phone ?? current.phone,
      }));
      setEditing(false);
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoUpload} />

      <ProfileHeaderCard
        name={profile.name}
        email={profile.email}
        image={profile.image}
        verified={profile.verified}
        uploading={uploading}
        onChoosePhoto={() => fileInputRef.current?.click()}
        onEdit={() => setEditing(true)}
      />

      {editing ? (
        <section className="bg-white px-5 py-8">
          <form onSubmit={saveProfile} className="rounded-[8px] border border-[#e0e5e7] bg-white p-5">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-[25px] font-black text-[#202a30]">Editar dados</h2>
              <button type="button" onClick={() => setEditing(false)} className="grid h-11 w-11 place-items-center rounded-full bg-[#edf2f4] text-[#536168]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="block">
              <span className="text-[14px] font-black uppercase tracking-[0.08em] text-[#7a858b]">Nome</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-2 h-[56px] w-full rounded-[8px] border border-[#cbd2d4] bg-white px-4 text-[18px] text-[#202a30] outline-none focus:border-[#c9a84c]"
                placeholder="Seu nome"
                required
              />
            </label>
            <label className="mt-5 block">
              <span className="text-[14px] font-black uppercase tracking-[0.08em] text-[#7a858b]">Telefone</span>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: maskPhone(event.target.value) })}
                className="mt-2 h-[56px] w-full rounded-[8px] border border-[#cbd2d4] bg-white px-4 text-[18px] text-[#202a30] outline-none focus:border-[#c9a84c]"
                placeholder="(31) 99999-9999"
                inputMode="tel"
              />
            </label>
            <p className="mt-4 text-[15px] leading-6 text-[#64727a]">
              A foto é atualizada pelo botão no cartão superior e aparece imediatamente após o envio.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="mt-6 flex h-[58px] w-full items-center justify-center gap-3 rounded-[8px] border-0 bg-[#c9a84c] text-[18px] font-black text-[#11191d] disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </section>
      ) : null}

      <ProfileInfoSection
        name={profile.name}
        email={profile.email}
        phone={maskPhone(profile.phone ?? "") || "Não informado"}
        city={data.city}
        emailVerified={Boolean(profile.emailVerified)}
        phoneVerified={Boolean(profile.phoneVerified || profile.phoneVerifiedAt)}
        privacyOk={Boolean(profile.termsConsent && profile.lgpdConsent)}
      />
    </div>
  );
}
