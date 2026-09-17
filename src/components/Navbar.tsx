"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EntryChoiceCards, EntryChoiceSheet, EntryChoiceStyles } from "@/components/EntryChoiceSheet";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import styles from "./Navbar.module.css";

const NavbarSessionControls = dynamic(() => import("@/components/NavbarSessionControls"), { ssr: false });

export default function Navbar({ tone = "light", accent = "purple" }: { tone?: "dark" | "light"; accent?: "default" | "purple" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [entryChoice, setEntryChoice] = useState<"login" | null>(null);
  const router = useRouter();

  function openLogin() {
    setMenuOpen(false);
    setEntryChoice("login");
  }

  return <nav className={`${styles.nav} ${tone === "light" ? styles.light : ""} ${accent === "purple" ? styles.purple : ""}`} aria-label="Navegação principal">
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label="Elite Modell — início">
        <Image src="/brand/elite-modell-logo.png" alt="Elite Modell" width={2172} height={724} priority className={styles.logo}/>
      </Link>
      <div className={styles.center}>
        <Link href="/buscar?tab=acompanhantes">Explorar</Link>
        <Link href={ACCOUNT_ROUTES.cadastroAcompanhante}>Seja acompanhante</Link>
        <Link href="mailto:suporte@elitemodell.com.br">Ajuda</Link>
      </div>
      <div className={styles.actions}>
        <NavbarSessionControls variant="authActions" onLoginChoice={openLogin} onRegisterChoice={() => router.push(ACCOUNT_ROUTES.cadastro)}/>
        <button type="button" className={styles.menuButton} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={24}/> : <Menu size={25}/>}
        </button>
      </div>
    </div>
    {menuOpen && <div className={styles.mobileMenu}>
      <Link href="/buscar?tab=acompanhantes" onClick={() => setMenuOpen(false)}>Explorar acompanhantes</Link>
      <NavbarSessionControls variant="mobileMenu" onNavigate={() => setMenuOpen(false)} onLoginChoice={openLogin} onRegisterChoice={() => router.push(ACCOUNT_ROUTES.cadastro)} showGuestActions={false}/>
      <p className={styles.menuLabel}>Cadastre-se</p>
      <Link href={ACCOUNT_ROUTES.cadastro} onClick={() => setMenuOpen(false)}>Criar minha conta</Link>
      <p className={styles.menuLabel}>Entrar</p>
      <EntryChoiceCards mode="login" onNavigate={() => setMenuOpen(false)}/>
    </div>}
    <EntryChoiceSheet mode={entryChoice} open={entryChoice !== null} onClose={() => setEntryChoice(null)}/>
    <EntryChoiceStyles/>
  </nav>;
}
