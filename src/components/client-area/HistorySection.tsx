"use client";
import Link from "next/link";
import { CirclePlus, MapPin, UserRound } from "lucide-react";

type RecentProfile = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  image: string | null;
};

export default function HistorySection({ profiles = [] }: { profiles?: RecentProfile[] }) {
  return (
    <section className="client-page-tight client-dashboard-section">
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b72cff]/24 bg-[#b72cff]/12 px-3 py-1 text-[12px] font-semibold text-[#e1a6ff]">
          exclusivo premium
        </span>
      </div>

      <h2 className="text-[30px] font-black leading-8 text-[var(--text-primary)]">Histórico de perfis</h2>

      {profiles.length ? (
        <div className="client-history-grid mt-6 grid gap-3">
          {profiles.slice(0, 4).map((profile) => (
            <Link
              key={profile.id}
              href={`/profissionais/${profile.slug}`}
              className="client-history-profile group relative min-h-[148px] overflow-hidden rounded-[18px] border border-white/10 bg-[#15101b] p-4 no-underline"
            >
              {profile.image ? (
                <span
                  className="absolute inset-0 bg-cover bg-center opacity-30 transition group-hover:opacity-40"
                  style={{ backgroundImage: `url(${profile.image})` }}
                />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-t from-[#0b0710] via-[#0b0710]/70 to-transparent" />
              <span className="relative flex h-full flex-col justify-end">
                <strong className="text-[18px] text-white">{profile.name}</strong>
                <span className="mt-1 inline-flex items-center gap-1 text-[12px] text-white/60">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city}, {profile.state}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
      <div className="client-empty mt-6 px-6 py-12 text-center">
        <div className="client-dashboard-history-art mx-auto grid h-[70px] w-[70px] place-items-center rounded-[8px] border border-white/10 bg-white/[0.045]">
          <UserRound className="h-9 w-9 stroke-[1.5] text-[#e1a6ff]" />
        </div>
        <p className="mx-auto mt-6 max-w-[320px] text-[17px] leading-8 text-[var(--text-secondary)]">
          Você ainda não possui nenhum perfil acessado no seu histórico.
        </p>
        <Link
          href="/dashboard/acompanhantes"
          className="mt-7 inline-flex items-center gap-2 text-[15px] font-black text-[#e1a6ff] underline underline-offset-2"
        >
          <CirclePlus className="h-4 w-4" />
          Encontre acompanhantes
        </Link>
      </div>
      )}
    </section>
  );
}
