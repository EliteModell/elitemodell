import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro de profissional | Elite Modell",
  description: "Cadastre-se como profissional verificada na Elite Modell e gerencie seu perfil com discrição.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
