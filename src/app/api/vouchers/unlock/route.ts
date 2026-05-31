export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "O desbloqueio por Pix foi removido. O voucher de R$ 100 agora é gratuito e exige cadastro completo." },
    { status: 410 },
  );
}
