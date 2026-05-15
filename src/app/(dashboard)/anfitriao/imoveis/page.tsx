import Link from "next/link";

export default function ImoveisAnfitriaoPage() {
  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Meus imoveis</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>
        A listagem privada dos imoveis do anfitriao sera ligada a uma API dedicada. Por enquanto, voce pode cadastrar um novo imovel.
      </p>
      <Link href="/anfitriao/imoveis/novo" style={{ color: "#d4a843", textDecoration: "none", fontWeight: 700 }}>
        Cadastrar novo imovel
      </Link>
    </div>
  );
}
