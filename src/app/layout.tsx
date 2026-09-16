import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme-v2.css";
import "./coral-design-system.css";
import Providers from "@/components/Providers";
import AgeGateLoader from "@/components/AgeGateLoader";
import CookiePreferences from "@/components/privacy/CookiePreferences";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = "https://www.elitemodell.com.br";
const publicBrandDescription =
  "Encontre perfis verificados com privacidade, segurança e liberdade. Conheça a Elite Modell e explore perfis disponíveis na sua região com facilidade.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Elite Modell",
  title: {
    default: "Elite Modell | Conexões Discretas e Seguras",
    template: "%s | Elite Modell",
  },
  description: publicBrandDescription,
  keywords: [
    "Elite Modell",
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
    title: "Elite Modell | Conexões Discretas e Seguras",
    description: publicBrandDescription,
    url: siteUrl,
    siteName: "Elite Modell",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Modell | Conexões Discretas e Seguras",
    description: publicBrandDescription,
  },
  other: {
    "theme-color": "#CA4651",
    "msapplication-TileColor": "#FDE7E9",
    "msapplication-TileImage": "/android-chrome-512x512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#CA4651",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Elite Modell",
    url: siteUrl,
    description: publicBrandDescription,
    publisher: {
      "@type": "Organization",
      name: "Elite Modell",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/brand/elite-modell-symbol.png`,
        width: 1254,
        height: 1254,
      },
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
