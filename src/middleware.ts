import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Rotas que exigem autenticação básica (qualquer usuário logado)
const AUTH_REQUIRED = ["/dashboard", "/anfitriao", "/profissional", "/admin"];

// Rotas que exigem cliente verificado (clientStatus === VERIFIED)
const VERIFIED_REQUIRED = [
  "/profissionais",
  "/buscar",
  "/dashboard/favoritos",
  "/dashboard/mensagens",
  "/dashboard/reservas",
  "/imoveis",
];

// Rotas exclusivas de admin
const ADMIN_ONLY = ["/admin"];

// Rotas exclusivas de profissional aprovado
const PROFESSIONAL_ONLY = ["/profissional"];

// Rotas exclusivas de anfitrião aprovado
const HOST_ONLY = ["/anfitriao"];

function matchesAny(pathname: string, patterns: string[]) {
  return patterns.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req });

  // Rotas que precisam de autenticação
  if (matchesAny(pathname, AUTH_REQUIRED) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (!token) return NextResponse.next();

  const role = token.role as string;
  const clientStatus = (token.clientStatus as string) ?? "UNVERIFIED";

  // Admin: acesso total
  if (role === "ADMIN") return NextResponse.next();

  // Rotas exclusivas de admin
  if (matchesAny(pathname, ADMIN_ONLY)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rotas exclusivas de profissional
  if (matchesAny(pathname, PROFESSIONAL_ONLY) && role !== "HOST") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rotas exclusivas de anfitrião
  if (matchesAny(pathname, HOST_ONLY) && role !== "HOST") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Conteúdo que exige cliente verificado
  if (matchesAny(pathname, VERIFIED_REQUIRED) && role === "GUEST") {
    if (clientStatus !== "VERIFIED") {
      return NextResponse.redirect(new URL("/dashboard/verificacao", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profissionais/:path*",
    "/profissional/:path*",
    "/anfitriao/:path*",
    "/admin/:path*",
    "/buscar/:path*",
    "/imoveis/:path*",
  ],
};
