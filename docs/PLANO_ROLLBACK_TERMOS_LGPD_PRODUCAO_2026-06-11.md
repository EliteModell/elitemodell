# Plano de rollback de Termos e LGPD

Data: 11 de junho de 2026
Escopo: migrations, documentos operacionais e deploy da aplicacao.

## Acionamento

Executar rollback somente em incidente confirmado, com janela de manutencao, registro de auditoria e autorizacao do responsavel operacional.

## Rollback da aplicacao

1. Identificar o ultimo deployment estavel no projeto Vercel `elitemodell`.
2. Promover o deployment anterior para producao ou executar rollback pelo painel/CLI.
3. Confirmar `https://www.elitemodell.com.br`, rotas publicas e APIs protegidas.

## Revogacao dos documentos

Em incidente restrito ao conteudo juridico, preferir revogacao transacional:

1. Alterar as 26 versoes operacionais para `REVOKED`.
2. Limpar `publishedAt` apenas pelo fluxo administrativo auditado.
3. Preservar conteudo, hash, historico e aceites existentes.
4. Nao reutilizar a mesma versao para conteudo corrigido.

## Restore completo do banco

O rollback estrito das 9 migrations exige restore completo, pois ha adicao de valores de enum e mudancas estruturais que nao devem ser revertidas manualmente em producao.

```powershell
$env:PGPASSWORD = "<senha-do-banco>"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" `
  --clean --if-exists --no-owner --no-privileges `
  --dbname "$env:DIRECT_URL" `
  "backups/2026-06-11-pre-termos-lgpd-producao.dump"
```

Depois do restore:

```powershell
npx prisma migrate status
node scripts/audit-production-public-state.mjs
```

## Verificacoes

- Conferir hash do dump antes do restore.
- Bloquear escrita da aplicacao durante o restore.
- Verificar contagem de usuarios, profissionais, propriedades e pagamentos.
- Confirmar que as 30 versoes juridicas antigas voltaram ao estado `DRAFT`.
- Registrar inicio, fim, executor, motivo e resultado no log de incidente.
