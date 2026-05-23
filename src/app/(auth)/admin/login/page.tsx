import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "ADMIN") redirect("/admin");

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#050506", color: "#fff", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 430, border: "1px solid rgba(212,168,67,.22)", borderRadius: 8, background: "#0d0d10", padding: 24 }}>
        <p style={{ color: "#d4a843", fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase", margin: "0 0 10px" }}>Admin Elite Model</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>Entrar no painel administrativo</h1>
        <p style={{ color: "rgba(255,255,255,.58)", lineHeight: 1.6, margin: "12px 0 20px" }}>
          Use sua conta autorizada. O acesso real e validado no servidor por role ADMIN.
        </p>
        <Link href="/login?returnUrl=/admin" style={{ display: "flex", justifyContent: "center", borderRadius: 8, background: "#d4a843", color: "#090909", padding: "12px 16px", fontWeight: 900, textDecoration: "none" }}>
          Continuar login
        </Link>
      </div>
    </main>
  );
}
