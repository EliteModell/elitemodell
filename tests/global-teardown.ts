// Teardown global do Playwright — garante saída limpa após todos os testes.
// O storageState em tests/.auth/user.json é preservado entre execuções locais.
export default async function globalTeardown() {
  // Sem cleanup ativo; arquivo existe para que o Playwright feche o processo
  // de forma controlada sem acionar timeout no webServer teardown.
}
