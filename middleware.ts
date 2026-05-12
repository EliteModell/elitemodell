import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Arquivos estaticos em /public sao servidos na raiz (/model.jpeg, /logo.png etc.).
  // Eles nunca devem cair no fluxo de autenticacao.
  if (/\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Rotas públicas (não precisam autenticação)
  const publicRoutes = [
    "/",
    "/login",
    "/cadastro",
    "/buscar",
    "/imoveis",
    "/profissionais",
    "/terms",
    "/privacy",
    "/api/auth",
    "/api/professionals",
    "/api/properties",
  ];

  // Verificar se é rota pública
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) return NextResponse.next();

  // Para rotas protegidas, validar token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Se não tem token, redirecionar para login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rotas de admin - apenas ADMIN
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Rotas de anfitrião - apenas HOST e ADMIN
  if (pathname.startsWith("/anfitriao") || pathname.startsWith("/api/anfitriao")) {
    if (token.role !== "HOST" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // A tela de novo perfil precisa estar aberta para HOST antes do perfil existir.
  if (pathname === "/profissional/novo") {
    if (token.role !== "HOST" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Rotas de profissional - apenas com perfil profissional
  if (pathname.startsWith("/profissional") || pathname.startsWith("/api/profissional")) {
    if (!(token as any).isProfessional && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$).*)",
  ],
};
