import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCompanionPanel } from "@/lib/account-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function clientLabel(client: { name: string | null; email: string | null }) {
  return client.name ?? client.email ?? "Cliente";
}

function initials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EM";
}

export default async function ProfessionalMessagesPage() {
  const access = await requireCompanionPanel();
  const professionalId = access.user.professional?.id ?? null;
  const appointments = professionalId
    ? await prisma.appointment.findMany({
        where: { professionalId },
        include: { client: { select: { name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <div className="professional-premium-page">
      <section className="premium-section-card">
        <Link href="/profissional" className="premium-button-secondary">
          <span aria-hidden="true">{"<"}</span>
          Voltar ao painel
        </Link>
        <p className="premium-eyebrow" style={{ marginTop: 24 }}>Central profissional</p>
        <h1 className="premium-section-title">Mensagens</h1>
        <p className="premium-description" style={{ marginTop: 10 }}>
          Acompanhe contatos, solicitações e conversas profissionais sem sair do painel.
        </p>
      </section>

      {appointments.length === 0 ? (
        <section className="premium-section-card professional-empty-center">
          <span className="professional-empty-icon">
            <span aria-hidden="true">MSG</span>
          </span>
          <h2>Você ainda não tem mensagens profissionais.</h2>
          <p>
            Quando clientes enviarem solicitações, mensagens ou atualizações de agendamento, elas aparecerão aqui.
          </p>
          <Link href="/profissional/agendamentos" className="premium-button" style={{ marginTop: 8 }}>
            Ver agendamentos
          </Link>
        </section>
      ) : (
        <section className="professional-message-list">
          {appointments.map((appointment) => {
            const label = clientLabel(appointment.client);
            return (
              <Link key={appointment.id} href="/profissional/agendamentos" className="professional-message-card">
                <span className="message-avatar">
                  {initials(label)}
                </span>
                <span className="message-copy">
                  <strong>{label}</strong>
                  <small>
                    {appointment.notes || "Solicitação de agendamento profissional."}
                  </small>
                  <em>
                    {statusLabel[appointment.status] ?? appointment.status}
                    <span>·</span>
                    {formatDate(appointment.date)}
                  </em>
                </span>
                <span className="message-action">
                  Abrir
                </span>
              </Link>
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
        .professional-empty-icon span {
          color: var(--elite-gold-light);
          font-size: 17px;
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
        .professional-message-list {
          display: grid;
          gap: 12px;
        }
        .professional-message-card {
          min-height: 112px;
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
        .professional-message-card:hover {
          border-color: rgba(245,212,107,0.56);
        }
        .message-avatar {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,212,107,0.38);
          border-radius: 999px;
          background: rgba(214,168,58,0.12);
          color: var(--elite-gold-light);
          font-size: 15px;
          font-weight: 950;
        }
        .message-copy {
          min-width: 0;
          display: grid;
          gap: 6px;
        }
        .message-copy strong {
          color: #fff;
          font-size: 17px;
          line-height: 1.2;
        }
        .message-copy small {
          color: var(--elite-text-muted);
          font-size: 14px;
          line-height: 1.45;
        }
        .message-copy em {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          color: rgba(245,212,107,0.72);
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }
        .message-action {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(214,168,58,0.32);
          border-radius: 16px;
          color: var(--elite-gold-light);
          padding: 0 14px;
          font-size: 13px;
          font-weight: 900;
        }
        @media (max-width: 520px) {
          .professional-message-card {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .message-action {
            grid-column: 1 / -1;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
