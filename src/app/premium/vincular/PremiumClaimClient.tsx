"use client";

import Link from "next/link";
import { Check, LoaderCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function PremiumClaimClient({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vinculando seu pagamento à conta...");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void fetch("/api/premium/claim", { method: "POST" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível vincular a compra.");
        setStatus("success");
        setMessage("Acesso Premium vinculado com sucesso.");
        window.setTimeout(() => router.replace(returnTo), 1200);
      })
      .catch((cause) => {
        setStatus("error");
        setMessage(cause instanceof Error ? cause.message : "Não foi possível vincular a compra.");
      });
  }, [returnTo, router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "radial-gradient(circle at 50% 0%,rgba(212,168,67,.15),transparent 38%),#050505", color: "#f4f1ea" }}>
      <section style={{ width: "min(460px,100%)", padding: 28, borderRadius: 22, border: "1px solid rgba(212,168,67,.3)", background: "linear-gradient(180deg,#15120d,#080808)", textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,.7)" }}>
        <div style={{ width: 66, height: 66, display: "grid", placeItems: "center", margin: "0 auto", borderRadius: 999, background: status === "error" ? "rgba(239,68,68,.1)" : "rgba(212,168,67,.12)", color: status === "error" ? "#fca5a5" : "#d4a843" }}>
          {status === "loading" && <LoaderCircle className="animate-spin" size={30} />}
          {status === "success" && <Check size={32} />}
          {status === "error" && <ShieldAlert size={30} />}
        </div>
        <p style={{ margin: "18px 0 7px", color: "#d4a843", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 2 }}>Elite Modell Premium</p>
        <h1 style={{ margin: 0, fontSize: 25 }}>{status === "error" ? "Vínculo pendente" : "Ativando seu acesso"}</h1>
        <p style={{ margin: "13px 0 0", color: "#aaa298", fontSize: 14, lineHeight: 1.65 }}>{message}</p>
        {status === "error" && (
          <Link href={returnTo} style={{ display: "grid", minHeight: 48, placeItems: "center", marginTop: 18, borderRadius: 12, background: "#d4a843", color: "#080704", fontWeight: 900, textDecoration: "none" }}>
            Voltar para a plataforma
          </Link>
        )}
      </section>
    </main>
  );
}
