import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro de profissional | Elite Modell",
  description:
    "Crie seu perfil profissional na Elite Modell, organize sua disponibilidade e gerencie seu anúncio em um único lugar.",
  alternates: {
    canonical: "/cadastro-modelo",
  },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
