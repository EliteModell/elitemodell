import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Rota pública dentro do /anfitriao — permite acesso sem login (draft de imóvel)
const ANFITRIAO_PUBLIC_EXCEPTION = "/anfitriao/imoveis/novo";

function isAnfitriaoPublic(pathname: string) {
  return (
    pathname === ANFITRIAO_PUBLIC_EXCEPTION ||
    pathname.startsWith(ANFITRIAO_PUBLIC_EXCEPTION + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /anfitriao/imoveis/novo é acessível sem autenticação (rascunho público de imóvel)
  if (isAnfitriaoPublic(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    req.nextUrl.pathname + req.nextUrl.search
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profissional/:path*",
    "/modelo/:path*",
    "/cliente/:path*",
    "/admin/:path*",
    "/painel/:path*",
    "/premium/:path*",
    "/notifications/:path*",
    "/app/:path*",
    "/completar-cadastro",
    "/anfitriao/:path*",
  ],
};
