"use client";

/* eslint-disable @next/next/no-img-element -- Favorite profile covers come from uploaded public URLs. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Heart, Plus, Search, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";

type FavoriteProfessional = {
  id: string;
  createdAt: string;
  professional: {
    id: string;
    slug: string;
    displayName: string;
    city: string;
    state: string;
    image: string | null;
    verified: boolean;
    rating: number;
    totalReviews: number;
    photos: Array<{ url: string }>;
  };
};

function CollectionCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href="/dashboard/acompanhantes" className="lists-collection-card no-underline">
      <span className="lists-collection-icon">{icon}</span>
      <span className="lists-collection-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        <small>
          <ShieldCheck />
          PERFIS SALVOS
        </small>
      </span>
      <ChevronRight className="lists-card-arrow" />
    </Link>
  );
}

function FavoriteCard({ favorite }: { favorite: FavoriteProfessional }) {
  const professional = favorite.professional;
  const cover = professional.photos[0]?.url ?? professional.image;

  return (
    <Link href={`/profissionais/${professional.slug}`} className="client-card flex gap-4 p-4 no-underline">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[14px] border border-[#d4a843]/20 bg-white/[0.04]">
        {cover ? (
          <img src={cover} alt={professional.displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#f5d78c]">
            <Heart className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-[18px] font-black text-[#f5f0e4]">{professional.displayName}</h2>
          {professional.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#7ed58a]" /> : null}
        </div>
        <p className="mt-1 truncate text-[13px] text-[#f5f0e4]/54">
          {professional.city}, {professional.state}
        </p>
        <p className="mt-3 text-[12px] font-black uppercase text-[#f5d78c]">
          Ver perfil
        </p>
      </div>
      <ChevronRight className="mt-7 h-5 w-5 shrink-0 text-[#f5d78c]" />
    </Link>
  );
}

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<FavoriteProfessional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites/professionals", { signal: controller.signal });
        const data = (await response.json()) as { favorites?: FavoriteProfessional[] };
        setFavorites(data.favorites ?? []);
      } catch {
        if (!controller.signal.aborted) setFavorites([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadFavorites();
    return () => controller.abort();
  }, []);

  return (
    <section className="lists-page">
      <div className="lists-hero">
        <div className="lists-hero-copy">
          <p>COLECOES PRIVADAS</p>
          <h1>Listas</h1>
          <span>Salve, acompanhe e organize perfis favoritos com privacidade.</span>
        </div>
        <button type="button" className="lists-create-button" title="Recurso de listas personalizadas em breve">
          <Plus />
          Lista
        </button>
      </div>

      <div className="lists-cards">
        <CollectionCard
          title="Perfis curtidos"
          description={`${favorites.length} perfil${favorites.length === 1 ? "" : "s"} salvo${favorites.length === 1 ? "" : "s"}.`}
          icon={<Heart />}
        />
        <CollectionCard
          title="Perfis seguidos"
          description="Use esta area para acompanhar novidades de perfis salvos."
          icon={<UserRoundCheck />}
        />
      </div>

      {loading ? (
        <section className="lists-empty-card">
          <div className="lists-empty-icon">
            <UsersRound />
          </div>
          <h2>Carregando favoritos</h2>
          <p>Estamos buscando seus perfis salvos com privacidade.</p>
        </section>
      ) : favorites.length > 0 ? (
        <div className="space-y-4">
          {favorites.map((favorite) => (
            <FavoriteCard key={favorite.id} favorite={favorite} />
          ))}
        </div>
      ) : (
        <section className="lists-empty-card">
          <div className="lists-empty-icon">
            <UsersRound />
          </div>
          <h2>Comece salvando perfis</h2>
          <p>Quando encontrar acompanhantes que combinam com voce, salve para acessar depois.</p>
          <Link href="/dashboard/acompanhantes" className="lists-primary-button">
            <Search />
            Explorar cidade
          </Link>
        </section>
      )}
    </section>
  );
}
