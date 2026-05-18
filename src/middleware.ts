import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// ─── Rotas públicas — acessíveis sem qualquer autenticação ───────────────────
// Visitantes podem navegar normalmente, ver cards e perfis públicos.
const PUBLIC_ROUTES = [
  "/profissionais",   // listagem pública de profissionais
  "/buscar",          // busca pública
  "/imoveis",         // listagem pública de imóveis
  "/termos",
  "/terms",
  "/privacy",
  "/privacidade",
  "/sobre",
  "/anfitriao/imoveis/novo", // cadastro de imóvel começa sem login (rascunho)
];

// ─── Rotas que exigem autenticação básica (qualquer usuário logado) ──────────
const AUTH_REQUIRED_PREFIXES = [
  "/dashboard",
  "/profissional",
  "/admin",
];

// ─── Rotas de /anfitriao que exigem auth (exceto /novo que é público) ────────
// Só bloqueia sub-rotas do anfitrião que não são o onboarding inicial.
const ANFITRIAO_AUTH_PREFIXES = [
  "/anfitriao/imoveis/editar",
  "/anfitriao/imoveis/",
  "/anfitriao/reservas",
  "/anfitriao/ganhos",
  "/anfitriao/painel",
  "/anfitriao/perfil",
];

// ─── Rotas que exigem cliente verificado (clientStatus === VERIFIED) ──────────
const VERIFIED_REQUIRED_PREFIXES = [
  "/dashboard/favoritos",
  "/dashboard/mensagens",
  "/dashboard/reservas",
];

// ─── Exclusivas de admin ──────────────────────────────────────────────────────
const ADMIN_ONLY_PREFIXES = ["/admin"];

// ─── Exclusivas de profissional/HOST ─────────────────────────────────────────
const PROFESSIONAL_ONLY_PREFIXES = ["/profissional"];

function matchesAny(pathname: string, patterns: string[]) {
  return patterns.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Rotas explicitamente públicas → sempre libera
  if (matchesAny(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  const token = await getToken({ req });

  // 2. Rotas do anfitrião (exceto /novo) exigem auth
  if (matchesAny(pathname, ANFITRIAO_AUTH_PREFIXES) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 3. Rotas que exigem autenticação básica → redireciona para login
  if (matchesAny(pathname, AUTH_REQUIRED_PREFIXES) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Sem token nas demais rotas → passa (são públicas ou protegidas no server-side)
  if (!token) return NextResponse.next();

  const role = (token.role as string) ?? "GUEST";
  const clientStatus = (token.clientStatus as string) ?? "UNVERIFIED";

  // 4. Admin: acesso total
  if (role === "ADMIN") return NextResponse.next();

  // 5. Rotas exclusivas de admin
  if (matchesAny(pathname, ADMIN_ONLY_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 6. Rotas exclusivas de profissional/HOST
  if (matchesAny(pathname, PROFESSIONAL_ONLY_PREFIXES) && role !== "HOST") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 7. Rotas do anfitrião (pós-draft) exigem role HOST
  if (matchesAny(pathname, ANFITRIAO_AUTH_PREFIXES) && role !== "HOST") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 8. Conteúdo privado exige cliente verificado (favoritos, mensagens, reservas)
  if (matchesAny(pathname, VERIFIED_REQUIRED_PREFIXES) && role === "GUEST") {
    if (clientStatus !== "VERIFIED") {
      return NextResponse.redirect(new URL("/dashboard/verificacao", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplica o middleware apenas em rotas relevantes (exclui static/api de auth)
    "/((?!_next/static|_next/image|favicon|api/auth|api/kyc/request|manifest|brand|og-image|apple-touch|android-chrome|favicon).*)",
  ],
};
