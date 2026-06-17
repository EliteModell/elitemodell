# Plano de backup e rollback do deploy técnico

Data: 11 de junho de 2026
Alvo: homologação isolada, sem alteração do schema `public`

## Backup

O schema de produção permanecerá intacto. Para uma futura aplicação em produção, é obrigatório:

```powershell
pg_dump --dbname="$env:DIRECT_URL" --format=custom --no-owner --no-acl `
  --file="backups/elitemodell_pre_deploy_2026-06-11.dump"
```

As ferramentas PostgreSQL não estão instaladas localmente, portanto esse dump não será simulado nem declarado como concluído.

## Migrations e riscos

1. `upload_quarantine`: aditiva; cria `UploadAsset` e configurações.
2. `data_deletion_worker`: aditiva; cria itens idempotentes de exclusão.
3. `payment_operations_booking_ledger`: risco alto; remove unicidade de pagamento por reserva, adiciona enum e faz backfill.
4. `legacy_media_migration_job`: aditiva; cria controle de migração de mídia.
5. `publication_requirements`: aditiva com seed.
6. `operational_governance_proposals`: mista; cria tabelas e atualiza dados.
7. `block_internal_legal_publication`: aditiva; trigger de proteção.
8. `operational_legal_publication`: aditiva; metadados e hardening do trigger.

As migrations 3 e 6 não serão aplicadas ao schema `public` sem backup, janela e aprovação específica. No schema vazio de homologação, não há dados financeiros a transformar.

## Rollback da homologação

Rollback de banco:

```sql
DROP SCHEMA IF EXISTS homolog_legal_20260611 CASCADE;
```

O comando remove apenas o schema isolado. Antes da remoção será conferido que o nome resolvido é exatamente `homolog_legal_20260611`.

Rollback de deploy:

- remover o deployment Preview pela Vercel;
- não promover nem criar alias de produção;
- revogar qualquer variável específica passada apenas ao deployment.

## Rollback funcional

- versões públicas operacionais podem ser marcadas `REVOKED`;
- aceites antigos nunca serão sobrescritos;
- uma correção jurídica deve criar nova versão e hash;
- documentos internos nunca podem usar status público;
- a ratificação jurídica futura não altera retroativamente a versão operacional aceita.

## Condição para produção

Produção permanece bloqueada até:

- backup validado;
- migrations homologadas com dados representativos;
- decisão sobre múltiplos pagamentos por reserva;
- teste de rollback;
- aprovação explícita da promoção;
- monitoramento e plano de incidente disponíveis.
