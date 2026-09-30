import "server-only";

import { sendAuthEmail } from "@/lib/auth-email";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function reviewMessage(title: string, name: string | null | undefined, paragraphs: string[]) {
  const greeting = name?.trim() ? `Olá, ${escapeHtml(name.trim())}.` : "Olá.";
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;color:#17131a;border:1px solid #dfd1e5;border-radius:16px;overflow:hidden">
      <div style="height:4px;background:#7d179f"></div>
      <div style="padding:36px 30px">
        <div style="color:#7d179f;font-size:22px;font-weight:900;margin-bottom:24px">ELITE MODELL</div>
        <h1 style="font-size:22px;margin:0 0 14px">${escapeHtml(title)}</h1>
        <p style="color:#625c68;line-height:1.7">${greeting}</p>
        ${paragraphs.map((paragraph) => `<p style="color:#625c68;line-height:1.7">${escapeHtml(paragraph)}</p>`).join("")}
        <div style="margin-top:28px;padding-top:18px;border-top:1px solid #eee6f1;color:#77707b;font-size:12px">Esta mensagem não contém fotos, documentos ou dados biométricos.</div>
      </div>
    </div>`;
}

export async function sendProfessionalCorrectionEmail(
  to: string,
  name: string | null | undefined,
  reason: string,
) {
  await sendAuthEmail(to, {
    subject: "Precisamos de algumas correções no seu cadastro",
    html: reviewMessage("Precisamos de algumas correções no seu cadastro", name, [
      "Nossa equipe analisou seu perfil e precisa que você ajuste os itens abaixo:",
      reason,
      "Você não precisa criar um novo cadastro. Acesse sua área profissional, faça os ajustes e envie novamente para análise.",
    ]),
  });
}

export async function sendProfessionalRejectionEmail(
  to: string,
  name: string | null | undefined,
  reason: string,
) {
  await sendAuthEmail(to, {
    subject: "Atualização sobre seu cadastro na Elite Modell",
    html: reviewMessage("Seu cadastro foi analisado", name, [
      "O cadastro não foi aprovado nesta análise.",
      `Motivo informado pela moderação: ${reason}`,
      "Se precisar de esclarecimentos, entre em contato com o suporte da plataforma.",
    ]),
  });
}
