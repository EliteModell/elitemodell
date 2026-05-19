import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const unauthorized = () => isApiRoute
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", request.url));
  const forbidden = () => isApiRoute
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : NextResponse.redirect(new URL("/dashboard", request.url));

  if (/\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const publicRoutes = [
    "/",
    "/login",
    "/cadastro",
    "/cadastro-modelo",
    "/cadastro-anfitriao",
    "/app/consumer/register",
    "/app/consumer/verify-phone",
    "/app/consumer/login",
    "/modelo/login",
    "/anfitriao/login",
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
    isProfessional?: boolean;
  };

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (tokenWithRole.role !== "ADMIN") return forbidden();
  }

  if (pathname.startsWith("/anfitriao") || pathname.startsWith("/api/anfitriao")) {
    if (tokenWithRole.role !== "HOST" && tokenWithRole.role !== "ADMIN") return forbidden();
  }

  if (pathname === "/profissional/novo") {
    if (tokenWithRole.role !== "HOST" && tokenWithRole.role !== "ADMIN") return forbidden();
    return NextResponse.next();
  }

  if (pathname.startsWith("/profissional") || pathname.startsWith("/api/profissional")) {
    if (!tokenWithRole.isProfessional && tokenWithRole.role !== "ADMIN") return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|txt|xml|json)$).*)",
  ],
};
