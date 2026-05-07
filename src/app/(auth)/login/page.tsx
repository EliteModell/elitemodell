"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Email ou senha inválidos.");
      } else {
        toast.success("Bem-vindo de volta!");
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "#111",
        border: "1px solid #222",
        borderRadius: 16,
        padding: "40px 36px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontWeight: 800, fontSize: 26, color: "#fff" }}>
            elite<span style={{ color: "#cc0000" }}>modell</span>
          </span>
        </Link>
        <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
          Entre na sua conta
        </p>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogle}
        style={{
          width: "100%",
          padding: "12px",
          background: "transparent",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ccc",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 20,
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#444")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0112 4.9c1.84 0 3.5.67 4.79 1.77l3.56-3.56A11.96 11.96 0 0012 .96C7.43.96 3.48 3.77 1.6 7.76l3.67 2z" />
          <path fill="#34A853" d="M16.04 18.02A7.06 7.06 0 0112 19.1c-2.96 0-5.49-1.82-6.64-4.44l-3.68 2.01C3.59 20.3 7.5 23.04 12 23.04c2.93 0 5.72-1.08 7.81-3.01l-3.77-2.01z" />
          <path fill="#4A90D9" d="M19.81 20.03A11.95 11.95 0 0023.04 12c0-.72-.07-1.47-.2-2.18H12v4.36h6.19a5.26 5.26 0 01-2.29 3.45l3.91 2.4z" />
          <path fill="#FBBC05" d="M5.36 14.66A7.17 7.17 0 014.9 12c0-.92.16-1.8.46-2.62L1.6 7.37A11.97 11.97 0 00.96 12c0 1.63.33 3.18.93 4.6l3.47-1.94z" />
        </svg>
        Continuar com Google
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
        <span style={{ color: "#555", fontSize: 13 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: "#1e1e1e" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="seu@email.com"
            style={{
              width: "100%",
              padding: "11px 14px",
              background: "#0d0d0d",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>
            Senha
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "11px 14px",
              background: "#0d0d0d",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => ((e.target as HTMLElement).style.borderColor = "#cc0000")}
            onBlur={(e) => ((e.target as HTMLElement).style.borderColor = "#2a2a2a")}
          />
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <Link
              href="/esqueci-senha"
              style={{ fontSize: 12, color: "#cc0000", textDecoration: "none" }}
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "13px",
            background: loading ? "#8a0000" : "#cc0000",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
            marginTop: 4,
          }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e00000"; }}
          onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#cc0000"; }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#666" }}>
        Não tem uma conta?{" "}
        <Link href="/cadastro" style={{ color: "#cc0000", textDecoration: "none", fontWeight: 600 }}>
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
