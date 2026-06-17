"use client";

import { LockKeyhole, MessageCircle } from "lucide-react";
import { useState } from "react";
import ActionAuthModal from "@/components/auth/ActionAuthModal";
import PremiumUpsellModal from "@/components/premium/PremiumUpsellModal";

type Visibility = "PUBLIC" | "LOGGED_IN" | "PREMIUM";

type Props = {
  slug: string;
  visibility: Visibility;
  initialWhatsapp?: string | null;
  initialPhone?: string | null;
  contactAvailable?: boolean;
  returnTo: string;
  label?: string;
  compact?: boolean;
  onContact?: () => void;
};

function whatsappUrl(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("55") && digits.length >= 12
    ? digits
    : `55${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent("Olá, vi seu perfil na Elite Modell e gostaria de mais informações.")}`;
}

export default function ProfessionalContactAction({
  slug,
  visibility,
  initialWhatsapp,
  initialPhone,
  contactAvailable = true,
  returnTo,
  label = "Chamar no WhatsApp",
  compact = false,
  onContact,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  if (!contactAvailable) return null;

  async function openContact() {
    if (visibility === "PUBLIC" && (initialWhatsapp || initialPhone)) {
      onContact?.();
      window.open(
        initialWhatsapp ? whatsappUrl(initialWhatsapp) : `tel:${initialPhone}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (visibility === "LOGGED_IN" && !initialWhatsapp) {
      setLoading(true);
    } else if (visibility === "PREMIUM") {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/professionals/${encodeURIComponent(slug)}/contact`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || data.reason === "LOGIN_REQUIRED") {
        setAuthOpen(true);
        return;
      }
      if (response.status === 402 || data.reason === "PREMIUM_REQUIRED") {
        setPremiumOpen(true);
        return;
      }
      if (!response.ok || (!data.whatsapp && !data.phone)) return;
      onContact?.();
      window.open(
        data.whatsapp ? whatsappUrl(data.whatsapp) : `tel:${data.phone}`,
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openContact()}
        disabled={loading}
        style={{
          width: "100%",
          minHeight: compact ? 42 : 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: visibility === "PREMIUM" ? "1px solid rgba(212,168,67,.42)" : 0,
          borderRadius: compact ? 10 : 13,
          padding: compact ? "9px 12px" : "12px 16px",
          background: visibility === "PREMIUM"
            ? "linear-gradient(135deg,rgba(212,168,67,.18),rgba(88,64,20,.22))"
            : "#d4a843",
          color: visibility === "PREMIUM" ? "#f5d78c" : "#080704",
          fontWeight: 900,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.68 : 1,
        }}
      >
        {visibility === "PREMIUM" ? <LockKeyhole size={compact ? 15 : 18} /> : <MessageCircle size={compact ? 15 : 18} />}
        {loading
          ? "Verificando..."
          : visibility === "PREMIUM"
            ? "Contato exclusivo Premium"
            : initialWhatsapp
              ? label
              : initialPhone
                ? "Ligar"
                : "Ver contato"}
      </button>

      <ActionAuthModal
        open={authOpen}
        actionLabel="visualizar o contato desta profissional"
        returnTo={returnTo}
        onClose={() => setAuthOpen(false)}
      />
      <PremiumUpsellModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        featureLabel="o contato exclusivo"
        returnTo={returnTo}
      />
    </>
  );
}
