"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, MessageCircle, Play, Send } from "lucide-react";
import { LEGAL_CHANNELS, PUBLIC_FOOTER_LEGAL_LINKS } from "@/lib/legal-document-catalog";
import styles from "./Footer.module.css";

const platformLinks = [
  { label: "Explorar perfis", href: "/buscar?tab=acompanhantes" },
  { label: "Seja acompanhante", href: "/cadastro/acompanhante" },
  { label: "Minha área", href: "/dashboard" },
  { label: "Suporte", href: `mailto:${LEGAL_CHANNELS.support}` },
];

const socialLinks = [
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL, icon: Camera },
  { label: "WhatsApp", href: process.env.NEXT_PUBLIC_WHATSAPP_URL, icon: MessageCircle },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL, icon: Play },
  { label: "Telegram", href: process.env.NEXT_PUBLIC_TELEGRAM_URL, icon: Send },
];

export default function Footer({ tone = "light" }: { tone?: "dark" | "light" }) {
  return <footer className={`${styles.footer} ${tone === "light" ? styles.light : ""}`}>
    <div className={styles.inner}>
      <div className={styles.grid}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.brand}><Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={2172} height={724}/></Link>
          <p className={styles.intro}>Conexões premium com discrição, segurança e privacidade em primeiro lugar.</p>
          <span className={styles.seal}>Ambiente exclusivo para maiores de 18 anos</span>
        </div>
        <div className={styles.column}><h3>Plataforma</h3><div className={styles.links}>{platformLinks.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}</div></div>
        <div className={styles.column}><h3>Legal e segurança</h3><div className={styles.links}>
          {PUBLIC_FOOTER_LEGAL_LINKS.slice(0,7).map(({ label, href }) => <Link key={label} href={href}>{label}</Link>)}
          <button type="button" onClick={() => window.dispatchEvent(new Event("elite-open-cookie-settings"))}>Configurações de cookies</button>
          <a href={`mailto:${LEGAL_CHANNELS.privacy}`}>Canal de Privacidade</a>
        </div></div>
        <div className={`${styles.column} ${styles.socialColumn}`}><h3>Redes sociais</h3><div className={styles.social}>
          {socialLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href || undefined} aria-label={label} aria-disabled={!href} target={href ? "_blank" : undefined} rel={href ? "noreferrer noopener" : undefined} onClick={href ? undefined : (event) => event.preventDefault()}><Icon size={19}/></a>)}
        </div></div>
      </div>
      <div className={styles.bottom}><span>© 2026 Elite Modell. Todos os direitos reservados.</span><span>Discrição • Segurança • Exclusividade</span></div>
    </div>
  </footer>;
}
