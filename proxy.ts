import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ADMIN_EMAILS = ["brunorochalp3@gmail.com"];

function adminMasterEmails() {
  return (process.env.ADMIN_MASTER_EMAILS ?? DEFAULT_ADMIN_EMAILS.join(","))
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminToken(token: { role?: string; email?: unknown }) {
  if (token.role === "ADMIN") return true;
  return typeof token.email === "string" && adminMasterEmails().includes(token.email.toLowerCase());
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const unauthorized = () => isApiRoute
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  const forbidden = (target = "/dashboard") => isApiRoute
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : NextResponse.redirect(new URL(target, request.url));

  if (/\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const publicRoutes = [
    "/",
    "/login",
    "/admin/login",
    "/cadastro",
    "/cadastro-modelo",
    "/cadastro-anfitriao",
    "/app/consumer/register",
    "/app/consumer/verify-phone",
    "/app/consumer/login",
    "/modelo/login",
    "/anfitriao/login",
    "/anfitriao/imoveis/novo",
    "/auth/callback",
    "/buscar",
    "/imoveis",
    "/profissionais",
    "/terms",
    "/privacy",
    "/api/auth",
  ];

  const publicGetApiRoutes = ["/api/professionals", "/api/properties"];
  if (
    request.method === "GET" &&
    publicGetApiRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))
  ) {
    return NextResponse.next();
  }

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) return unauthorized();

  const tokenWithRole = token as typeof token & {
    role?: string;
    email?: string;
    isProfessional?: boolean;
    accountType?: string;
    activeProfileType?: string;
    availableProfiles?: string[];
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
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$).*)",
  ],
};
