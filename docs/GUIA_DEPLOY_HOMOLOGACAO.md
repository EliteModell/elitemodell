# Guia de deploy futuro em homologacao

Este guia nao autoriza deploy em producao.

## 1. Preparar recursos isolados

Criar projeto Supabase, storage, Asaas sandbox e projeto/ambiente Preview da Vercel
separados da producao. Nao reutilizar banco, buckets, webhooks ou contas reais.

## 2. Configurar variaveis

Preencher todas as variaveis aplicaveis de `.env.example` no ambiente Preview.
Gerar valores aleatorios independentes para `NEXTAUTH_SECRET`,
`ADMIN_MFA_ENCRYPTION_KEY`, `CRON_SECRET`, webhook e bootstrap.

Definir `NEXTAUTH_URL` para a URL de homologacao e manter
`ASAAS_ENVIRONMENT=sandbox`. Nao habilitar sandbox no dominio de producao.

## 3. Validar localmente

```powershell
npm ci
npm run db:generate
npm run db:validate
npx tsc --noEmit
npm run lint
npm run build
```

## 4. Aplicar banco explicitamente

Confirmar que `DATABASE_URL` e `DIRECT_URL` apontam para homologacao. Fazer backup.

```powershell
npx prisma migrate status
npm run db:migrate:deploy
npx prisma migrate status
```

O build da Vercel nao executa mais migrations automaticamente. Isso evita mutacao
acidental de banco durante Preview ou build de producao.

## 5. Configurar storage e fornecedores

- Criar/validar buckets privados de quarentena e aprovados.
- Configurar ClamAV ou endpoint HTTP de antivirus.
- Configurar moderacao HTTP ou manter revisao humana.
- Configurar webhook Asaas sandbox com token exclusivo.
- Configurar KYC sandbox.
- Testar falha fechada antes de testar aprovacao.

## 6. Agendar worker

Agendar chamada GET para:

```text
/api/internal/workers/data-deletion?limit=5
Authorization: Bearer <CRON_SECRET>
```

Escolher frequencia conforme SLA e limite do plano. Monitorar duracao maxima de 60 s;
aumentar frequencia, nao o lote, quando houver backlog.

## 7. Deploy Preview

Criar o deployment Preview somente depois das migrations. No diretorio vinculado ao
projeto Vercel:

```powershell
vercel deploy
```

Conferir no log que o comando de build foi apenas `npm run build` e que o manifesto
mostra `Proxy (Middleware)`.

## 8. Homologar

Executar `docs/CHECKLIST_HOMOLOGACAO.md`, os projetos Playwright e os testes live dos
fornecedores. Registrar URLs, IDs sandbox, timestamps e evidencias sem segredos.

## 9. Midia legada

Executar apenas `PLAN` inicialmente. `STAGE`, `FINALIZE` e `ROLLBACK` exigem manifesto,
hash, administrador, motivo e `LEGACY_MEDIA_MIGRATION_APPROVAL`. Nao executar em
producao antes do ensaio completo em copia dos dados.

## 10. Criterio de promocao

Nao promover para producao enquanto houver migration pendente, teste obrigatorio
falhando, fornecedor sem homologacao, requisito bloqueante dos socios ou documento
juridico obrigatorio sem revisao.

O repasse live deve permanecer desligado no painel ate que o modelo comercial, a
politica de cancelamento, a integracao de repasse e os testes financeiros estejam
individualmente aprovados. O deploy nao deve alterar essa chave automaticamente.
