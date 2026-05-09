import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AgeGate from "@/components/AgeGate";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Elite Modell — Conectando pessoas, locais e oportunidades",
  description:
    "Plataforma inteligente onde modelos, clientes e imóveis se encontram com segurança, privacidade e controle total.",
  keywords: "elite modell, modelos, imóveis, plataforma, marketplace",
  openGraph: {
    title: "Elite Modell",
    description: "Uma nova forma de conectar pessoas, locais e oportunidades.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen">
        <Providers>
          <AgeGate />
          {children}
        </Providers>
      </body>
    </html>
  );
}
