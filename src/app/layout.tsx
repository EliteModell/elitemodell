import type { Metadata, Viewport } from "next";
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

const siteUrl = "https://elitemodell.vercel.app";
const brandDescription =
  "Elite Modell e uma plataforma premium para conectar pessoas, profissionais, locais reservados e oportunidades com discricao, seguranca e elegancia.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Elite Modell",
  title: {
    default: "Elite Modell | Plataforma Premium e Discreta",
    template: "%s | Elite Modell",
  },
  description: brandDescription,
  keywords: [
    "Elite Modell",
    "elite modell",
    "plataforma premium",
    "acompanhantes verificadas",
    "profissionais verificados",
    "locais reservados",
    "quartos discretos",
    "atendimento reservado",
    "privacidade",
    "luxo discreto",
    "dark luxury",
  ],
  authors: [{ name: "Elite Modell" }],
  creator: "Elite Modell",
  publisher: "Elite Modell",
  category: "premium marketplace",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/brand/elite-modell-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Elite Modell",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Elite Modell | Plataforma Premium e Discreta",
    description: brandDescription,
    url: siteUrl,
    siteName: "Elite Modell",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/brand/elite-modell-preview.png",
        width: 1200,
        height: 630,
        alt: "Elite Modell - conectando pessoas, locais e oportunidades",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Modell | Plataforma Premium e Discreta",
    description: brandDescription,
    images: ["/brand/elite-modell-preview.png"],
  },
  other: {
    "theme-color": "#050505",
    "msapplication-TileColor": "#050505",
    "msapplication-TileImage": "/brand/elite-modell-icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Elite Modell",
    url: siteUrl,
    logo: `${siteUrl}/brand/elite-modell-icon-512.png`,
    image: `${siteUrl}/brand/elite-modell-preview.png`,
    description: brandDescription,
    brand: {
      "@type": "Brand",
      name: "Elite Modell",
    },
  };

  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <AgeGate />
          {children}
        </Providers>
      </body>
    </html>
  );
}
