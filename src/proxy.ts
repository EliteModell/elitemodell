import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { ageGateCacheHeaders, isAgeRestrictedPath } from "@/lib/age-gate-policy";

function isAdminToken(token: { role?: string }) {
  return token.role === "ADMIN";
}

function withAgeGateHeaders(response: NextResponse) {
  const headers = ageGateCacheHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const unauthorized = () => isApiRoute
    ? withAgeGateHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    : NextResponse.redirect(new URL("/login", request.url));
  const forbidden = (target = "/dashboard") => isApiRoute
    ? withAgeGateHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
    : NextResponse.redirect(new URL(target, request.url));

  if (/\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const publicRoutes = [
    "/",
    "/login",
    "/esqueci-senha",
    "/redefinir-senha",
    "/admin/login",
    "/cadastro",
    "/cadastro/acompanhante",
    "/cadastro-modelo",
    "/cadastro-anfitriao",
    "/app/consumer/register",
    "/app/consumer/verify-phone",
    "/app/consumer/login",
    "/modelo/login",
    "/anfitriao/login",
    "/anfitriao/imoveis/novo",
    "/auth/callback",
    "/verificacao-idade",
    "/terms",
    "/privacy",
    "/politica-conteudo",
    "/documentos",
    "/buscar",
    "/profissionais",
    "/cidade",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/api/auth",
    "/api/professionals",
    "/api/stories",
    "/api/reviews",
    "/api/media",
    "/api/vouchers/roulette",
    "/api/moderation/report",
    "/api/address/geocode",
    "/api/didit/webhook",
    "/api/kyc/webhook",
  ];

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) return NextResponse.next();

  const isSensitivePublicContent = isAgeRestrictedPath(pathname);

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });

  if (!token) {
    if (isSensitivePublicContent) {
      return isApiRoute
        ? withAgeGateHeaders(NextResponse.json({ error: "Verificacao de maioridade obrigatoria." }, { status: 403 }))
        : withAgeGateHeaders(NextResponse.redirect(new URL("/verificacao-idade", request.url)));
    }
    return unauthorized();
  }

  const tokenWithRole = token as typeof token & {
    role?: string;
    email?: string;
    isProfessional?: boolean;
    accountType?: string;
    activeProfileType?: string;
    availableProfiles?: string[];
    adultVerified?: boolean;
  };
  const availableProfiles = tokenWithRole.availableProfiles ?? [];
  const hasClientProfile = availableProfiles.length === 0 || availableProfiles.includes("CLIENTE");
  const isHostAccount = ["host", "property_host", "PROPERTY_HOST"].includes(tokenWithRole.accountType ?? "") || availableProfiles.includes("HOST");
  const isProfessionalAccount =
    tokenWithRole.isProfessional ||
    tokenWithRole.accountType === "model" ||
    tokenWithRole.accountType === "professional" ||
    availableProfiles.includes("PROFESSIONAL");
  const isAdmin = isAdminToken(tokenWithRole);
  if (isSensitivePublicContent && !tokenWithRole.adultVerified && !isAdmin) {
    return forbidden("/dashboard/verificacao-idade");
  }

  const homeForToken = () => {
    if (isAdmin) return "/admin";
    if (tokenWithRole.activeProfileType === "CLIENTE") return "/dashboard";
    if (tokenWithRole.activeProfileType === "PROFESSIONAL") return "/profissional";
    if (tokenWithRole.activeProfileType === "HOST") return "/anfitriao";
    if (isProfessionalAccount) {
      return tokenWithRole.isProfessional ? "/profissional" : "/profissional/novo";
    }
    if (isHostAccount) return "/anfitriao";
    return "/dashboard";
  };

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!isAdmin) return forbidden(homeForToken());
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/cliente") || pathname.startsWith("/painel/cliente")) {
    if (!isAdmin && !hasClientProfile) return forbidden(homeForToken());
  }

  if (pathname.startsWith("/painel/acompanhante")) {
    if (!tokenWithRole.isProfessional && !isAdmin) return forbidden(homeForToken());
  }

  if (pathname.startsWith("/painel/anfitriao")) {
    if (!isAdmin && !isHostAccount) return forbidden(homeForToken());
  }

  if (pathname.startsWith("/anfitriao") || pathname.startsWith("/api/anfitriao")) {
    if (!isAdmin && !isHostAccount) return forbidden(homeForToken());
  }

  if (pathname === "/profissional/novo") {
    if (!isProfessionalAccount && !isAdmin) return forbidden(homeForToken());
    return NextResponse.next();
  }

  if (pathname.startsWith("/profissional") || pathname.startsWith("/api/profissional")) {
    if (!tokenWithRole.isProfessional && !isAdmin) return forbidden(homeForToken());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp)$).*)",
  ],
};
