import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import AgeGateLoader from "@/components/AgeGateLoader";

const siteUrl = "https://elitemodell.com.br";
const brandDescription =
  "Elite Modell é uma plataforma premium para conectar pessoas, profissionais, locais reservados e oportunidades com discrição, segurança e elegância.";

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
      { url: "/brand/elite-modell-icon.svg", type: "image/svg+xml" },
      { url: "/brand/elite-modell-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/elite-modell-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/elite-modell-apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: ["/brand/elite-modell-icon-192.png"],
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
        url: "/og-image.png",
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
    images: ["/og-image.png"],
  },
  other: {
    "theme-color": "#050505",
    "msapplication-TileColor": "#050505",
    "msapplication-TileImage": "/android-chrome-192x192.png",
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
    logo: `${siteUrl}/android-chrome-512x512.png`,
    image: `${siteUrl}/og-image.png`,
    description: brandDescription,
    brand: {
      "@type": "Brand",
      name: "Elite Modell",
    },
  };

  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      style={
        {
          "--font-inter": '"Inter", "Segoe UI", Arial, Helvetica, sans-serif',
          "--font-playfair": '"Playfair Display", Georgia, serif',
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>
          <AgeGateLoader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
