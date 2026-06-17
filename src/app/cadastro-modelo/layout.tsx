import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro de acompanhante | Elite Modell",
  description:
    "Cadastre-se como acompanhante na Elite Modell começando pela validação segura do telefone.",
  alternates: {
    canonical: "/cadastro/acompanhante",
  },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
