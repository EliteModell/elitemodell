import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Pendente",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  REJECTED: "Rejeitado",
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");
  return session;
}

async function approveProfessional(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.professional.update({
    where: { id },
    data: {
      status: "ACTIVE",
      verified: true,
      docStatus: "APPROVED",
      verifStatus: "APPROVED",
      kycStatus: "APPROVED",
      rejectReason: null,
    },
  });
  revalidatePath("/admin/profissionais");
}

async function rejectProfessional(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "Rejeitado pela administracao.");
  if (!id) return;

  await prisma.professional.update({
    where: { id },
    data: {
      status: "REJECTED",
      verified: false,
      docStatus: "REJECTED",
      verifStatus: "REJECTED",
      kycStatus: "REJECTED",
      rejectReason: reason,
    },
  });
  revalidatePath("/admin/profissionais");
}

export default async function AdminProfissionaisPage() {
  await requireAdmin();

  const professionals = await prisma.professional.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      photos: { take: 1, orderBy: { order: "asc" } },
    },
  });

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Profissionais</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Perfis reais cadastrados no banco para analise e publicacao.</p>

      {professionals.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 24, color: "#777" }}>
          Nenhum profissional cadastrado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {professionals.map((professional) => {
            const pending = professional.status === "PENDING_REVIEW";
            return (
              <div key={professional.id} style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "#fff" }}>{professional.displayName}</strong>
                    <p style={{ color: "#777", margin: "6px 0" }}>
                      {professional.city}, {professional.state} - {professional.escortCategory ?? "Sem categoria"}
                    </p>
                    <p style={{ color: "#777", margin: 0, fontSize: 13 }}>
                      Conta: {professional.user.name ?? professional.user.email ?? "Sem nome"}
                    </p>
                    {professional.rejectReason ? (
                      <p style={{ color: "#ef4444", margin: "8px 0 0", fontSize: 13 }}>{professional.rejectReason}</p>
                    ) : null}
                  </div>

                  <div style={{ minWidth: 220 }}>
                    <p style={{ color: pending ? "#d4a843" : "#aaa", fontSize: 13, fontWeight: 800, margin: "0 0 10px", textAlign: "right" }}>
                      {statusLabel[professional.status] ?? professional.status}
                    </p>
                    <p style={{ color: "#777", fontSize: 12, margin: "0 0 10px", textAlign: "right" }}>
                      Doc: {professional.docStatus} | Face: {professional.verifStatus}
                    </p>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <form action={approveProfessional}>
                        <input type="hidden" name="id" value={professional.id} />
                        <button
                          type="submit"
                          disabled={!pending}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #22c55e", background: pending ? "rgba(34,197,94,0.1)" : "#151515", color: pending ? "#22c55e" : "#555", cursor: pending ? "pointer" : "not-allowed" }}
                        >
                          Aprovar
                        </button>
                      </form>
                      <form action={rejectProfessional}>
                        <input type="hidden" name="id" value={professional.id} />
                        <input type="hidden" name="reason" value="Rejeitado na revisao administrativa." />
                        <button
                          type="submit"
                          disabled={professional.status === "REJECTED"}
                          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: professional.status === "REJECTED" ? "not-allowed" : "pointer" }}
                        >
                          Rejeitar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
