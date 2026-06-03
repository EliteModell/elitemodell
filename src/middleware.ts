import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

// Rotas que exigem autenticação — sem exceção
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/profissional",
  "/painel",
  "/verificacao",
  "/completar-cadastro",
];

// /anfitriao/* é protegido EXCETO login e onboarding público de imóvel
function isProtectedAnfitriaoRoute(pathname: string): boolean {
  if (pathname === "/anfitriao/login") return false;
  if (pathname === "/anfitriao/imoveis/novo") return false;
  return pathname === "/anfitriao" || pathname.startsWith("/anfitriao/");
}

// /admin/login é público — qualquer um pode acessar para se autenticar
function isProtectedAdminRoute(pathname: string): boolean {
  if (pathname === "/admin/login") return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function requiresAuth(pathname: string): boolean {
  if (isProtectedAnfitriaoRoute(pathname)) return true;
  if (isProtectedAdminRoute(pathname) === false) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return PROTECTED_PREFIXES.filter(p => p !== "/admin").some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function roleIntentForProtectedPath(pathname: string) {
  if (pathname.startsWith("/profissional") || pathname.startsWith("/verificacao/acompanhante") || pathname.startsWith("/painel/acompanhante")) {
    return "profissional";
  }
  if (pathname.startsWith("/anfitriao") || pathname.startsWith("/verificacao/anfitriao") || pathname.startsWith("/painel/anfitriao")) {
    return "anfitriao";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/painel/cliente") || pathname === "/completar-cadastro") {
    return "cliente";
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!requiresAuth(pathname)) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    // Preserva returnUrl para redirecionar de volta após login
    if (!pathname.startsWith("/api")) {
      loginUrl.searchParams.set("returnUrl", pathname);
      const roleIntent = roleIntentForProtectedPath(pathname);
      if (roleIntent) loginUrl.searchParams.set("role", roleIntent);
    }
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* exige role ADMIN — redireciona para dashboard em caso de acesso indevido
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const professionalStatus = typeof token.professionalStatus === "string" ? token.professionalStatus : null;
    const isProfessionalAccount =
      token.accountType === "model" ||
      token.accountType === "professional" ||
      token.activeProfileType === "PROFESSIONAL" ||
      token.isProfessional === true;

    if (isProfessionalAccount && professionalStatus !== "ACTIVE" && professionalStatus !== "PAUSED") {
      const target = !professionalStatus || professionalStatus === "DRAFT" ? "/profissional/novo" : "/profissional/analise";
      return NextResponse.redirect(new URL(target, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/profissional/:path*",
    "/anfitriao/:path*",
    "/painel/:path*",
    "/verificacao/:path*",
    "/completar-cadastro",
  ],
};
