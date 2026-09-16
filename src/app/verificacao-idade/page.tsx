import Link from "next/link";

export const metadata = {
  title: "Verificacao de maioridade | Elite Modell",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PublicAgeVerificationPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f7fa", color: "#141212", padding: 24 }}>
      <section style={{ width: "min(560px,100%)", border: "1px solid rgba(202, 70, 81,.28)", borderRadius: 8, background: "#101012", padding: 30 }}>
        <p style={{ color: "#ca4651", fontWeight: 900, textTransform: "uppercase", fontSize: 12 }}>Conteudo restrito a adultos</p>
        <h1 style={{ fontSize: 32, margin: "8px 0 14px" }}>Verificacao de maioridade necessaria</h1>
        <p style={{ color: "#b8b1a6", lineHeight: 1.65 }}>
          Uma simples declaracao de idade nao libera perfis, fotos, videos, stories, contatos ou conteudo sensivel. Entre na sua conta e conclua a verificacao de maioridade.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
          <Link href="/login?returnUrl=%2Fdashboard%2Fverificacao-idade" style={{ background: "#ca4651", color: "#fff", borderRadius: 10, padding: "13px 18px", textDecoration: "none", fontWeight: 900 }}>Entrar e verificar</Link>
          <Link href="/cadastro" style={{ border: "1px solid rgba(255,255,255,.18)", color: "#fff", borderRadius: 8, padding: "13px 18px", textDecoration: "none", fontWeight: 800 }}>Criar conta</Link>
        </div>
      </section>
    </main>
  );
}
