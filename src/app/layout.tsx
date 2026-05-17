import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AgeGate from "@/components/AgeGate";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Elite Modell — Conectando pessoas, locais e oportunidades",
  description:
    "Plataforma premium onde acompanhantes, clientes e quartos discretos se encontram com segurança, privacidade e controle total.",
  keywords: "elite modell, acompanhantes, quartos discretos, plataforma premium",
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
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <AgeGate />
          {children}
        </Providers>
      </body>
    </html>
  );
}
