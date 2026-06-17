import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import AgeGateLoader from "@/components/AgeGateLoader";
import CookiePreferences from "@/components/privacy/CookiePreferences";

const siteUrl = "https://elitemodell.com.br";
const publicBrandDescription =
  "EliteModell — plataforma de acompanhantes verificadas no Brasil. Perfis reais, privacidade e segurança em cada contato.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "EliteModell",
  title: {
    default: "EliteModell | Acompanhantes Verificadas",
    template: "%s | EliteModell",
  },
  description: publicBrandDescription,
  keywords: [
    "EliteModell",
    "acompanhantes verificadas",
    "elite modell",
    "acompanhante",
    "perfil verificado",
    "privacidade",
    "seguranca",
  ],
  authors: [{ name: "EliteModell" }],
  creator: "EliteModell",
  publisher: "EliteModell",
  category: "restricted access",
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EliteModell",
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
    },
  },
  openGraph: {
    title: "EliteModell | Acompanhantes Verificadas",
    description: publicBrandDescription,
    url: siteUrl,
    siteName: "EliteModell",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "EliteModell",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EliteModell | Acompanhantes Verificadas",
    description: publicBrandDescription,
    images: [`${siteUrl}/og-image.png`],
  },
  other: {
    "theme-color": "#050505",
    "msapplication-TileColor": "#050505",
    "msapplication-TileImage": "/icon.png",
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
    name: "EliteModell",
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    image: `${siteUrl}/og-image.png`,
    description: publicBrandDescription,
    brand: {
      "@type": "Brand",
      name: "EliteModell",
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
          <CookiePreferences />
          {children}
        </Providers>
      </body>
    </html>
  );
}
