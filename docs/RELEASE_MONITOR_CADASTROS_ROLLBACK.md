# Publicação e rollback do monitor de cadastros

## Condições para publicar

- Confirmar o projeto Supabase `jgvmpbrsxegwkrgjncsv` e o SHA atualmente servido em `/api/release`. Registrar o SHA aprovado e o deployment correspondente.
- Validar com a **mesma identidade do Prisma da aplicação**, em transação somente leitura, acesso às seis colunas de `auth.users` usadas na confirmação de e-mail. A identidade do conector de auditoria, por si só, não comprova essa permissão.
- Confirmar backup recuperável para o banco, incluindo os esquemas usados por cadastro, autenticação e pagamentos. Confirmar separadamente a cobertura dos objetos físicos de mídia. Registrar data, escopo, SHA-256 do artefato quando disponível, local protegido, e resultado de restauração em banco isolado. A listagem do arquivo por `pg_restore --list` é uma verificação preliminar.
- Revisar os resultados do build e dos testes, inclusive o controle de acesso ao monitor e à exportação. Confirmar os eventos de entrega esperados no Resend e os webhooks da Didit.
- Obter autorização explícita para a migração e a publicação. Usar exclusivamente o fluxo GitHub → Vercel pela branch `main`. Validar o contexto com `npm run release:check-context` no checkout de publicação aprovado.

## Sequência após autorização

1. Preservar o SHA anterior e a referência do backup validado.
2. Aplicar somente as migrações aprovadas, verificando antes quais estão pendentes. A migração `20261119120000_registration_monitor` cria apenas a tabela de telemetria, seus índices e a proteção RLS. Conferir esses objetos no banco antes do deploy da aplicação.
3. Confirmar que a implantação via GitHub está pronta e que `npm run release:verify-public -- --url https://www.elitemodell.com.br --sha <sha-aprovado>` identifica o SHA ativo.
4. Validar no ambiente publicado a abertura do cadastro, a retomada de rascunho autorizado, a permissão administrativa e a recusa de exportação sem sessão. Usar uma conta de teste autorizada para verificações que alteram estado ou acionam provedores. Conferir se SMS aceito, e-mail entregue e e-mail confirmado aparecem como eventos distintos.

## Rollback

- Se a versão falhar, reverter o commit da aplicação em `main` pelo fluxo aprovado. Validar o SHA efetivamente servido e repetir as verificações funcionais. Manter o monitor indisponível até a correção.
- Preservar `RegistrationEvent` e seus índices. A versão anterior pode operar com a tabela adicional presente. A reversão da aplicação não exige apagar telemetria ou restaurar um snapshot sobre o banco ativo.
- Se a migração falhar, interromper a publicação, inspecionar `_prisma_migrations` e comparar o esquema efetivo com o SQL esperado. Preparar uma correção aditiva ou resolução de estado da migração após revisão e autorização.
- Se houver suspeita de dados corrompidos, preservar o estado atual e restaurar o backup primeiro em ambiente isolado para comparar os registros afetados. Qualquer recuperação em produção exige aprovação separada e reconciliação das gravações posteriores ao backup, inclusive pagamentos.
