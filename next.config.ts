import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["mercadopago"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "elitemodell.com.br" }],
        destination: "https://www.elitemodell.com.br/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/profissional/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/painel/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
          // HSTS: força HTTPS por 2 anos em todos os subdomínios
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js exige unsafe-inline/unsafe-eval para hidratação e estilos em runtime
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://maps.googleapis.com https://cdn.withpersona.com https://www.asaas.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.withpersona.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdn.withpersona.com",
              // img-src amplo: Next Image usa blob e data URIs; imagens vêm de Supabase e CDNs
              "img-src 'self' data: blob: https:",
              // connect-src: lista todos os serviços externos que o app chama via fetch/XHR/WS
              [
                "connect-src 'self'",
                "https://*.supabase.co",
                "wss://*.supabase.co",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com",
                "https://firebaseinstallations.googleapis.com",
                "https://*.googleapis.com",
                "https://api.withpersona.com",
                "https://maps.googleapis.com",
                "https://*.sentry.io",
                "https://*.ingest.sentry.io",
                "https://api.asaas.com",
                "https://www.asaas.com",
              ].join(" "),
              // frame-src: Persona usa iframe para KYC
              "frame-src 'self' https://withpersona.com https://cdn.withpersona.com",
              "media-src 'self' blob: https://*.supabase.co",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  experimental: {
    webpackMemoryOptimizations: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [32, 48, 64, 96, 128, 160, 256, 384],
    qualities: [60, 62, 70, 72, 75],
    maximumRedirects: 1,
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Só faz upload de source maps se SENTRY_AUTH_TOKEN estiver configurado
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  automaticVercelMonitors: false,
  // Não quebra o build se o Sentry não estiver configurado
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
