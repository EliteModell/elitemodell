import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme-v2.css";
import Providers from "@/components/Providers";
import AgeGateLoader from "@/components/AgeGateLoader";
import CookiePreferences from "@/components/privacy/CookiePreferences";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = "https://www.elitemodell.com.br";
const publicBrandDescription =
  "Perfis verificados, privacidade total e uma experiência marcante do início ao fim. Ambiente seguro, discreto e sofisticado em cada detalhe.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Elite Modell",
  title: {
    default: "Elite Modell | Conexões Premium com Discrição e Segurança",
    template: "%s | Elite Modell",
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
  authors: [{ name: "Elite Modell" }],
  creator: "Elite Modell",
  publisher: "Elite Modell",
  category: "restricted access",
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/elite-modell-symbol-v20260911-512.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/brand/elite-modell-symbol-v20260911-180.png", type: "image/png", sizes: "180x180" }],
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
    },
  },
  openGraph: {
    title: "Elite Modell | Conexões Premium com Discrição e Segurança",
    description: publicBrandDescription,
    url: siteUrl,
    siteName: "Elite Modell",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: `${siteUrl}/brand/elite-modell-social-v20260911.png`,
        width: 1200,
        height: 630,
        alt: "Elite Modell",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Modell | Conexões Premium com Discrição e Segurança",
    description: publicBrandDescription,
    images: [`${siteUrl}/brand/elite-modell-social-v20260911.png`],
  },
  other: {
    "theme-color": "#ffffff",
    "msapplication-TileColor": "#ffffff",
    "msapplication-TileImage": "/brand/elite-modell-symbol-v20260911-512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
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
    logo: `${siteUrl}/brand/elite-modell-symbol-v20260911-512.png`,
    image: `${siteUrl}/brand/elite-modell-social-v20260911.png`,
    description: publicBrandDescription,
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
          "--font-inter": '"Inter", "Segoe UI Variable Text", "Segoe UI", Arial, Helvetica, sans-serif',
          "--font-playfair": '"Inter", "Segoe UI Variable Text", "Segoe UI", Arial, Helvetica, sans-serif',
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
