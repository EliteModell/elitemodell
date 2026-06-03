import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function professionalHref(link?: string | null) {
  if (!link) return null;
  return link.startsWith("/profissional") ? link : null;
}

export default async function ProfessionalNotificationsPage() {
  const access = await requireCompanionPanel();
  const notifications = await prisma.notification.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="professional-premium-page">
      <section className="premium-section-card">
        <Link href="/profissional" className="premium-button-secondary">
          <span aria-hidden="true">{"<"}</span>
          Voltar ao painel
        </Link>
        <p className="premium-eyebrow" style={{ marginTop: 24 }}>Central profissional</p>
        <h1 className="premium-section-title">Notificações</h1>
        <p className="premium-description" style={{ marginTop: 10 }}>
          Atualizações sobre perfil, verificação, planos, destaques, mensagens e agenda aparecem aqui.
        </p>
      </section>

      {notifications.length === 0 ? (
        <section className="premium-section-card professional-empty-center">
          <span className="professional-empty-icon">
            <span aria-hidden="true">EM</span>
          </span>
          <h2>Você ainda não tem notificações profissionais.</h2>
          <p>
            Quando houver novas mensagens, atualizações de perfil, verificação, planos ou destaques, elas aparecerão aqui.
          </p>
        </section>
      ) : (
        <section className="professional-notification-list">
          {notifications.map((notification) => {
            const href = professionalHref(notification.link);
            const content = (
              <>
                <span className={notification.read ? "notification-status read" : "notification-status"}>
                  <span aria-hidden="true">{notification.read ? "OK" : "!"}</span>
                </span>
                <span className="notification-copy">
                  <strong>{notification.title}</strong>
                  <small>{notification.body}</small>
                  <em>{formatDate(notification.createdAt)}</em>
                </span>
                {href ? <span className="notification-arrow" aria-hidden="true">{">"}</span> : null}
              </>
            );

            return href ? (
              <Link key={notification.id} href={href} className="professional-notification-card">
                {content}
              </Link>
            ) : (
              <article key={notification.id} className="professional-notification-card">
                {content}
              </article>
            );
          })}
        </section>
      )}

      <style>{`
        .professional-empty-center {
          display: grid;
          justify-items: center;
          gap: 12px;
          padding: 42px 22px;
          text-align: center;
        }
        .professional-empty-icon {
          position: relative;
          width: 86px;
          height: 86px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,212,107,0.34);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(245,212,107,0.22), rgba(214,168,58,0.06) 62%, transparent);
          color: var(--elite-gold-light);
          box-shadow: 0 0 28px rgba(214,168,58,0.12);
        }
        .professional-empty-icon::after {
          content: "";
          position: absolute;
          right: 6px;
          top: 8px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: var(--elite-gold-light);
          box-shadow: 0 0 14px rgba(245,212,107,0.52);
        }
        .professional-empty-icon span {
          color: var(--elite-gold-light);
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.08em;
        }
        .professional-empty-center h2 {
          margin: 8px 0 0;
          color: #fff;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 28px;
          line-height: 1.08;
        }
        .professional-empty-center p {
          max-width: 520px;
          margin: 0;
          color: var(--elite-text-muted);
          font-size: 16px;
          line-height: 1.6;
        }
        .professional-notification-list {
          display: grid;
          gap: 12px;
        }
        .professional-notification-card {
          min-height: 104px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          border: 1px solid var(--elite-border-soft);
          border-radius: 22px;
          background: linear-gradient(145deg, rgba(22,22,22,0.98), rgba(8,8,8,0.98));
          padding: 18px;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 14px 36px rgba(0,0,0,0.32);
        }
        .professional-notification-card:hover {
          border-color: rgba(245,212,107,0.56);
        }
        .notification-status {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,212,107,0.34);
          border-radius: 999px;
          background: rgba(214,168,58,0.10);
          color: var(--elite-gold-light);
          font-size: 14px;
          font-weight: 950;
        }
        .notification-status.read {
          border-color: rgba(117,217,154,0.34);
          background: rgba(117,217,154,0.10);
          color: var(--elite-success);
        }
        .notification-copy {
          min-width: 0;
          display: grid;
          gap: 6px;
        }
        .notification-copy strong {
          color: #fff;
          font-size: 17px;
          line-height: 1.2;
        }
        .notification-copy small {
          color: var(--elite-text-muted);
          font-size: 14px;
          line-height: 1.45;
        }
        .notification-copy em {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(245,212,107,0.72);
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }
        .notification-arrow {
          color: var(--elite-gold-light);
          font-size: 22px;
          font-weight: 950;
        }
        @media (max-width: 430px) {
          .professional-notification-card {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .notification-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
