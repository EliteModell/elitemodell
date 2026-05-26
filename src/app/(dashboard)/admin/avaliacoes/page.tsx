import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-access";
import { AdminHeader, AdminPanel, AdminTable, StatusPill, buttonStyle, tdStyle, thStyle } from "../_components/AdminPrimitives";

export const dynamic = "force-dynamic";

async function refreshProfessionalRating(professionalId: string) {
  const [count, aggregate] = await Promise.all([
    prisma.professionalReview.count({ where: { professionalId, hidden: false } }),
    prisma.professionalReview.aggregate({
      where: { professionalId, hidden: false },
      _avg: { rating: true },
    }),
  ]);

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      totalReviews: count,
      rating: aggregate._avg.rating ?? 0,
    },
  });
}

async function moderateReviewDispute(formData: FormData) {
  "use server";
  await requireAdmin("professionals:review");

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  if (!id || !["remove", "keep"].includes(action)) return;

  const dispute = await prisma.professionalReviewDispute.findUnique({
    where: { id },
    select: { id: true, reviewId: true, professionalId: true },
  });
  if (!dispute) return;

  await prisma.$transaction([
    prisma.professionalReviewDispute.update({
      where: { id },
      data: {
        status: action === "remove" ? "ACCEPTED" : "REJECTED",
        adminNote: adminNote || null,
      },
    }),
    prisma.professionalReview.update({
      where: { id: dispute.reviewId },
      data: action === "remove"
        ? { hidden: true, moderationStatus: "REMOVED" }
        : { hidden: false, moderationStatus: "VISIBLE" },
    }),
  ]);

  await refreshProfessionalRating(dispute.professionalId);
  revalidatePath("/admin/avaliacoes");
  revalidatePath("/admin/profissionais");
}

export default async function AdminAvaliacoesPage() {
  await requireAdmin("professionals:review");

  const disputes = await prisma.professionalReviewDispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      professional: { select: { displayName: true, slug: true, city: true, state: true } },
      author: { select: { name: true, email: true } },
      review: {
        select: {
          rating: true,
          comment: true,
          hidden: true,
          moderationStatus: true,
          createdAt: true,
          author: { select: { name: true, email: true } },
        },
      },
    },
  });

  return (
    <div>
      <AdminHeader title="Avaliações contestadas" subtitle="Analise contestações de profissionais e decida se a avaliação deve ser removida ou mantida." />
      <AdminPanel>
        <AdminTable>
          <thead>
            <tr>
              <th style={thStyle}>Profissional</th>
              <th style={thStyle}>Avaliacao</th>
              <th style={thStyle}>Contestacao</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Acao</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>
                  <strong>{item.professional.displayName}</strong><br />
                  {item.professional.city}, {item.professional.state}<br />
                  <Link href={`/profissionais/${item.professional.slug}`} style={{ color: "#d4a843" }}>Abrir perfil</Link>
                </td>
                <td style={tdStyle}>
                  Nota: {item.review.rating}/5<br />
                  Autor: {item.review.author.name ?? item.review.author.email ?? "Cliente"}<br />
                  <span style={{ color: "#94a3b8" }}>{item.review.comment}</span>
                </td>
                <td style={tdStyle}>
                  Enviada por {item.author.name ?? item.author.email ?? "Profissional"}<br />
                  <span style={{ color: "#94a3b8" }}>{item.reason}</span>
                  {item.adminNote ? <p style={{ color: "#f5d78c", margin: "8px 0 0" }}>Admin: {item.adminNote}</p> : null}
                </td>
                <td style={tdStyle}>
                  <StatusPill tone={item.status === "PENDING" ? "warning" : item.status === "ACCEPTED" ? "success" : "danger"}>
                    {item.status === "PENDING" ? "Pendente" : item.status === "ACCEPTED" ? "Removida" : "Mantida"}
                  </StatusPill>
                  <p style={{ color: "#94a3b8", margin: "8px 0 0" }}>Review: {item.review.moderationStatus}</p>
                </td>
                <td style={tdStyle}>
                  <form action={moderateReviewDispute} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="id" value={item.id} />
                    <textarea name="adminNote" placeholder="Observação interna" style={{ minHeight: 64, borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", background: "#050506", color: "#fff", padding: 8 }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button name="action" value="remove" style={{ ...buttonStyle, color: "#22c55e" }}>Remover avaliacao</button>
                      <button name="action" value="keep" style={{ ...buttonStyle, color: "#f5d78c" }}>Manter avaliacao</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
            {!disputes.length ? <tr><td style={tdStyle} colSpan={5}>Nenhuma contestacao recebida.</td></tr> : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
