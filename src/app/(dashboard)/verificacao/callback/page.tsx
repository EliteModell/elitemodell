import { redirect } from "next/navigation";

// Persona redireciona aqui após o usuário completar (ou abandonar) a verificação.
// O status real chega via webhook — aqui apenas mandamos de volta à tela de verificação.
export default function VerificacaoCallbackPage() {
  redirect("/dashboard/verificacao");
}
