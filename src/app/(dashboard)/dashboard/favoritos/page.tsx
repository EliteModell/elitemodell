import Link from "next/link";

export default function FavoritosPage() {
  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Favoritos</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>A area de favoritos ainda nao tem persistencia implementada.</p>
      <Link href="/buscar" style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>
        Voltar para busca
      </Link>
    </div>
  );
}
