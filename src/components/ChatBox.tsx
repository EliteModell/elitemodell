"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.10)";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string | null; image: string | null };
}

interface Props {
  bookingId: string;
  title?: string;
}

export default function ChatBox({ bookingId, title }: Props) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  // Polling a cada 4s para novas mensagens
  useEffect(() => {
    let cancelled = false;

    async function fetchMessages(initial = false) {
      try {
        const url = initial || !lastFetchRef.current
          ? `/api/messages?bookingId=${bookingId}`
          : `/api/messages?bookingId=${bookingId}&since=${encodeURIComponent(lastFetchRef.current)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;

        if (initial) {
          setMessages(data);
        } else if (data.length > 0) {
          setMessages(prev => [...prev, ...data]);
        }
        lastFetchRef.current = new Date().toISOString();
      } catch {} finally { if (initial) setLoading(false); }
    }

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [bookingId]);

  // Auto-scroll para baixo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, content }),
      });
      const msg = await res.json();
      if (!res.ok) throw new Error(msg.error ?? "Erro ao enviar.");
      setMessages(prev => [...prev, msg]);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar.");
      setInput(content);
    } finally { setSending(false); }
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ background: "#0b1420", border: `1px solid ${GOLD_DIM}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", height: 480 }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${GOLD_DIM}`, background: "#060e1b" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Chat da reserva</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "#f1f5f9", fontWeight: 700 }}>{title ?? "Conversa"}</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", margin: "auto" }}>Carregando...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", margin: "auto", padding: 16 }}>
            Nenhuma mensagem ainda.<br />Inicie a conversa abaixo.
          </div>
        ) : (
          messages.map(m => {
            const mine = m.senderId === session?.user?.id;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                <div style={{
                  maxWidth: "78%",
                  padding: "9px 14px",
                  background: mine ? GOLD : "#0f172a",
                  color: mine ? "#060e1b" : "#f1f5f9",
                  borderRadius: 14,
                  borderBottomRightRadius: mine ? 4 : 14,
                  borderBottomLeftRadius: mine ? 14 : 4,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  fontWeight: mine ? 600 : 400,
                }}>
                  {m.content}
                </div>
                <span style={{ fontSize: 10, color: "#475569", padding: "0 6px" }}>
                  {!mine && (m.sender?.name?.split(" ")[0] ?? "")} · {fmtTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${GOLD_DIM}`, padding: 12, display: "flex", gap: 8, background: "#060e1b" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Digite uma mensagem..." disabled={sending}
          style={{ flex: 1, padding: "10px 14px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 22, color: "#f1f5f9", fontSize: 13, outline: "none" }}
          onFocus={e => (e.target.style.borderColor = GOLD)}
          onBlur={e => (e.target.style.borderColor = "#1e293b")} />
        <button onClick={send} disabled={!input.trim() || sending}
          style={{ padding: "0 18px", background: !input.trim() || sending ? "rgba(212,168,67,0.3)" : GOLD, color: "#060e1b", border: "none", borderRadius: 22, fontSize: 13, fontWeight: 800, cursor: !input.trim() || sending ? "not-allowed" : "pointer" }}>
          {sending ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
