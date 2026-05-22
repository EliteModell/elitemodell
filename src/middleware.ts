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

function requiresAuth(pathname: string): boolean {
  if (isProtectedAnfitriaoRoute(pathname)) return true;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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
    }
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* exige role ADMIN — redireciona para dashboard em caso de acesso indevido
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
