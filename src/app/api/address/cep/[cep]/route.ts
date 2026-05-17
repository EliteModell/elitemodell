export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cep: string }> }
) {
  const { cep } = await params;
  const cleanCep = cep.replace(/\D/g, "");

  if (cleanCep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao consultar CEP." }, { status: 502 });
  }

  const data = (await res.json()) as ViaCepResponse;
  if (data.erro) {
    return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    zipCode: data.cep ?? cleanCep,
    street: data.logradouro ?? "",
    complement: data.complemento ?? "",
    bairro: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  });
}
