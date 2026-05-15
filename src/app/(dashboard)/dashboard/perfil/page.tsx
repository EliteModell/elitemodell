"use client";

import { useEffect, useState } from "react";

type User = { name?: string | null; email?: string | null; phone?: string | null; role?: string | null };

export default function PerfilClientePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Meu perfil</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Dados principais da sua conta.</p>
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 20, color: "#ccc" }}>
        <p><strong>Nome:</strong> {user?.name ?? "-"}</p>
        <p><strong>Email:</strong> {user?.email ?? "-"}</p>
        <p><strong>Telefone:</strong> {user?.phone ?? "-"}</p>
        <p><strong>Perfil:</strong> {user?.role ?? "-"}</p>
      </div>
    </div>
  );
}
