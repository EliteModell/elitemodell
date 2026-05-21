"use client";

import Link from "next/link";
import { ChevronRight, Heart, Plus, Search, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";

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
          O PERFIL SALVO
        </small>
      </span>
      <ChevronRight className="lists-card-arrow" />
    </Link>
  );
}

export default function FavoritosPage() {
  return (
    <section className="lists-page">
      <div className="lists-hero">
        <div className="lists-hero-copy">
          <p>COLEÇÕES PRIVADAS</p>
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
          description="Acompanhantes que você marcar com coração aparecerão aqui."
          icon={<Heart />}
        />
        <CollectionCard
          title="Perfis seguidos"
          description="Use esta área para acompanhar novidades de perfis salvos."
          icon={<UserRoundCheck />}
        />
      </div>

      <section className="lists-empty-card">
        <div className="lists-empty-icon">
          <UsersRound />
        </div>
        <h2>Comece salvando perfis</h2>
        <p>Quando encontrar acompanhantes que combinam com você, salve para acessar depois.</p>
        <Link href="/dashboard/acompanhantes" className="lists-primary-button">
          <Search />
          Explorar cidade
        </Link>
      </section>
    </section>
  );
}
