import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import AgeGateLoader from "@/components/AgeGateLoader";
import CookiePreferences from "@/components/privacy/CookiePreferences";

const siteUrl = "https://www.elitemodell.com.br";
const publicBrandDescription =
  "Elite Modell e uma plataforma de acesso restrito para adultos, com foco em privacidade, seguranca e verificacao de contas.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Elite Modell",
  title: {
    default: "Elite Modell | Acesso Restrito",
    template: "%s | Elite Modell",
  },
  description: publicBrandDescription,
  keywords: [
    "Elite Modell",
    "elite modell",
    "acesso restrito",
    "maioridade",
    "verificacao de conta",
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
    title: "Elite Modell",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": 0,
      "max-video-preview": 0,
    },
  },
  openGraph: {
    title: "Elite Modell | Acesso Restrito",
    description: publicBrandDescription,
    url: siteUrl,
    siteName: "Elite Modell",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Elite Modell | Acesso Restrito",
    description: publicBrandDescription,
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
    name: "Elite Modell",
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
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
