"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Role = "GUEST" | "HOST";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "GUEST" as Role });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao cadastrar.");
        return;
      }

      toast.success("Conta criada! Entrando...");
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { value: "GUEST", label: "Hóspede / Cliente", desc: "Quero reservar imóveis e contratar serviços" },
    { value: "HOST", label: "Anfitrião", desc: "Quero anunciar meu imóvel na plataforma" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        background: "#111",
        border: "1px solid #222",
        borderRadius: 16,
        padding: "40px 36px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontWeight: 800, fontSize: 26, color: "#fff" }}>
            elite<span style={{ color: "#cc0000" }}>modell</span>
          </span>
        </Link>
        <p style={{ color: "#666", fontSize: 14, marginTop: 8 }}>
          Crie sua conta gratuitamente
        </p>
      </div>

      {/* Role selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {roles.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setForm({ ...form, role: r.value as Role })}
            style={{
              padding: "12px 10px",
              background: form.role === r.value ? "rgba(204,0,0,0.1)" : "#0d0d0d",
              border: `1.5px solid ${form.role === r.value ? "#cc0000" : "#222"}`,
              borderRadius: 8,
              color: form.role === r.value ? "#fff" : "#777",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 11, lineHeight: 1.4, color: form.role === r.value ? "#aaa" : "#555" }}>{r.desc}</div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { key: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
          { key: "email", label: "Email", type: "email", placeholder: "seu@email.com" },
          { key: "password", label: "Senha", type: "password", placeholder: "Mínimo 6 caracteres" },
        ].map((field) => (
          <div key={field.key}>
            <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6, fontWeight: 500 }}>
              {field.label}
            </label>
            <input
              type={field.type}
              required
              placeholder={field.placeholder}
              value={(form as any)[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
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
        ))}

        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginTop: 4 }}>
          Ao criar uma conta você concorda com nossos{" "}
          <Link href="/termos" style={{ color: "#cc0000", textDecoration: "none" }}>Termos de Uso</Link>{" "}
          e{" "}
          <Link href="/privacidade" style={{ color: "#cc0000", textDecoration: "none" }}>Política de Privacidade</Link>.
        </p>

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
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#666" }}>
        Já tem uma conta?{" "}
        <Link href="/login" style={{ color: "#cc0000", textDecoration: "none", fontWeight: 600 }}>
          Entrar
        </Link>
      </p>
    </div>
  );
}
