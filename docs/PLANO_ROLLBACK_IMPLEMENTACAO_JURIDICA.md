# Plano de rollback da implementacao juridica

## Principios

1. Fazer backup logico e registrar o SHA/horario antes de cada migration.
2. Desativar funcionalidades por configuracao antes de alterar dados.
3. Nunca apagar auditoria, aceites, comprovantes, operacoes financeiras ou evidencias.
4. Em falha de seguranca, manter acesso e midia bloqueados.
5. Reversao estrutural deve usar nova migration revisada; nunca `DROP` manual em
   producao.

## Aplicacao

- Revogar sessoes administrativas e girar `ADMIN_MFA_ENCRYPTION_KEY`/segredos em
  incidente de MFA ou RBAC.
- Definir fornecedores de upload como `MANUAL`; arquivos continuam privados.
- Suspender o cron de exclusao e colocar jobs afetados em `LEGAL_HOLD`.
- Desativar novas operacoes financeiras, sem reverter status localmente sem consultar
  o Asaas.
- Preservar `PaymentOperation`, `BookingFinancialEvent`, `AuditLog` e recibos.

## Midia legada

- Antes de `--stage`, guardar manifesto e hash.
- Antes de `--finalize`, validar cada item aprovado.
- Usar `--rollback` com a mesma aprovacao, hash e justificativa.
- Nao remover bucket ou manifesto antes da validacao visual e de cache.

## Banco

1. Interromper escrita da funcionalidade afetada.
2. Exportar tabelas novas e dependencias.
3. Restaurar backup em ambiente paralelo, nunca sobre o original sem aprovacao.
4. Criar migration compensatoria.
5. Executar `prisma validate`, `prisma migrate status`, testes e smoke test.
6. Registrar decisao, responsavel, horario e resultado.

## Validacao pos-rollback

Validar login, proxy, admin, MFA, KYC, uploads privados, pagamentos, trial, reservas,
privacidade, exportacao e bloqueio de documentos incompletos.
