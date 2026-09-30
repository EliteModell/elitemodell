import "server-only";

import { sendAuthEmail } from "@/lib/auth-email";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function html(title: string, name: string | null | undefined, lines: string[]) {
  const greeting = name?.trim() ? `Olá, ${escapeHtml(name.trim())}.` : "Olá.";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:30px;color:#17131a"><h1>${escapeHtml(title)}</h1><p>${greeting}</p>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}<hr><small>Elite Modell · mensagem transacional</small></div>`;
}

export async function sendProfessionalReminderEmail(to: string, name: string | null | undefined, missingItems: string[]) {
  await sendAuthEmail(to, {
    subject: "Complete seu cadastro na Elite Modell",
    html: html("Seu cadastro ainda possui pendências", name, [
      "Para continuar, atualize os itens abaixo:",
      ...missingItems.map((item) => `• ${item}`),
      "Acesse sua área profissional. Cada pendência indica a etapa correta para ajuste.",
    ]),
  });
}

export async function sendProfessionalLocationEmail(
  to: string,
  name: string | null | undefined,
  location: { city: string; state: string; approved: boolean; rejected?: boolean },
) {
  await sendAuthEmail(to, {
    subject: location.approved ? "Cidade de atendimento atualizada" : location.rejected ? "Mudança de cidade não aprovada" : "Mudança de cidade em análise",
    html: html(location.approved ? "Localização atualizada" : location.rejected ? "Localização não aprovada" : "Localização em análise", name, [
      location.approved
        ? `Seu anúncio agora está configurado para ${location.city}/${location.state}.`
        : location.rejected ? `A solicitação para ${location.city}/${location.state} não foi aprovada. Consulte a notificação no painel.`
        : `Recebemos sua solicitação para ${location.city}/${location.state}. Ela aguarda validação de segurança.`,
      "Se você não fez esta alteração, entre em contato com o suporte.",
    ]),
  });
}

export async function sendProfessionalKycActionEmail(to: string, name: string | null | undefined, reason: string | null) {
  await sendAuthEmail(to, {
    subject: "Sua verificação de identidade precisa de atenção",
    html: html("Refaça sua verificação de identidade", name, [
      reason || "A verificação não pôde ser concluída.",
      "Acesse seu cadastro profissional e siga as instruções da Didit para tentar novamente.",
    ]),
  });
}
