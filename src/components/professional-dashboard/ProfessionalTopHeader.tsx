"use client";

import { useEffect } from "react";
import { NoPrefetchLink as Link } from "@/components/NoPrefetchLink";
import { usePathname } from "next/navigation";
import { Bell, Mail, Menu } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import styles from "@/app/(dashboard)/profissional/professional-dashboard.module.css";

export function ProfessionalTopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname() ?? "";
  const inProfessionalArea = pathname.startsWith("/profissional");
  const messagesHref = inProfessionalArea ? "/profissional/mensagens" : "/dashboard/mensagens";
  const notificationsHref = inProfessionalArea ? "/profissional/notificacoes" : "/notifications";

  useEffect(() => {
    if (!inProfessionalArea) return;
    const updatePresence = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/professional/presence", { method: "POST", keepalive: true }).catch(() => undefined);
      }
    };
    updatePresence();
    const interval = window.setInterval(updatePresence, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", updatePresence);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updatePresence);
    };
  }, [inProfessionalArea]);

  return (
    <header className={styles.topHeader}>
      <div className={styles.topHeaderInner}>
        <div className={styles.topHeaderGrid}>
          <button
            onClick={onMenuClick}
            className={styles.headerIconButton}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>

          <Link href="/profissional" className={styles.headerLogo} aria-label="Elite Modell">
            <span><BrandMark priority /></span>
          </Link>

          <div className={styles.headerActions}>
            <Link
              href={messagesHref}
              className={styles.headerIconButton}
              aria-label="Mensagens"
            >
              <Mail />
              <i aria-hidden="true" />
            </Link>
            <Link
              href={notificationsHref}
              className={styles.headerIconButton}
              aria-label="Notificações"
            >
              <Bell />
              <i aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
