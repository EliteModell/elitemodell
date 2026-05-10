// API exclusiva para admins visualizarem documentos privados
// Gera signed URL com validade de 60 segundos — nunca expõe URL permanente
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // Só ADMIN acessa
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Path obrigatório." }, { status: 400 });

  // Impede path traversal
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Path inválido." }, { status: 400 });
  }

  // Gera URL assinada válida por 60 segundos
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Erro ao gerar URL." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: 60 });
}
