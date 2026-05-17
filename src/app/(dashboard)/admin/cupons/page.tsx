import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";

export const dynamic = "force-dynamic";

export default async function AdminCuponsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect(ACCOUNT_ROUTES.painelCliente);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Cupons</h1>
      <p style={{ color: "#777", marginBottom: 24 }}>Cupons cadastrados no banco e usados pelo fluxo de reserva.</p>

      {coupons.length === 0 ? (
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 24, color: "#777" }}>
          Nenhum cupom cadastrado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {coupons.map((coupon) => (
            <div key={coupon.id} style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#fff" }}>{coupon.code}</strong>
                  <p style={{ color: "#777", margin: "6px 0 0" }}>{coupon.description ?? "Sem descrição"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: coupon.active ? "#22c55e" : "#777", fontSize: 13, fontWeight: 700 }}>
                    {coupon.active ? "Ativo" : "Inativo"}
                  </span>
                  <p style={{ color: "#aaa", margin: "8px 0 0", fontSize: 13 }}>
                    {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `R$ ${coupon.value.toLocaleString("pt-BR")}`}
                  </p>
                  <p style={{ color: "#777", margin: "6px 0 0", fontSize: 12 }}>
                    Usos: {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
