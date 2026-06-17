# Relatório de homologação das migrations de documentos

Data: 11 de junho de 2026
Resultado: NÃO APLICADAS — HOMOLOGAÇÃO BLOQUEADA

## Ambiente identificado

- arquivo ativo: `.env`;
- Supabase: projeto `jgvmpbrsxegwkrgjncsv`;
- PostgreSQL: 17.6;
- database: `postgres`;
- schema: `public`;
- conexão de aplicação: pooler Supabase;
- conexão direta: mesmo projeto Supabase;
- Vercel: projeto `elite-modell-s-projects/elitemodell`;
- deployment inspecionado: produção;
- aliases: `elitemodell.com.br` e `www.elitemodell.com.br`;
- ambiente Persona: sandbox.

Não foi encontrada URL de banco separada para preview, teste ou homologação. O banco atual possui dados compartilhados da aplicação.

## Validação Prisma

`npx prisma validate`: aprovado.

`npx prisma migrate status`: sete migrations pendentes:

1. `20260609170000_upload_quarantine`
2. `20260609180000_data_deletion_worker`
3. `20260609190000_payment_operations_booking_ledger`
4. `20260609200000_legacy_media_migration_job`
5. `20260609210000_publication_requirements`
6. `20260610200000_operational_governance_proposals`
7. `20260610210000_block_internal_legal_publication`

## Estado do banco antes de qualquer escrita

- 30 documentos jurídicos;
- 30 versões `DRAFT`;
- 25 documentos públicos;
- cinco documentos internos;
- zero aceites de usuário;
- zero aceites de checkout;
- zero reservas;
- 10 pagamentos;
- zero pagamentos vinculados a reserva;
- uma configuração de plataforma;
- zero jobs de exclusão.

## Tabelas solicitadas

| Nome solicitado | Estado atual |
|---|---|
| `LegalDocument` | Existe |
| `LegalDocumentVersion` | Existe |
| `UserAcceptance` | Existe |
| `ConsentLog` | Não existe; o modelo atual é `ConsentPreference` |
| `CookieConsent` | Não existe como tabela separada |
| `PrivacyRequest` | Existe |
| `DataDeletionRequest` | Não existe com esse nome; há `PrivacyRequest` e `DataDeletionJob` |
| `DataExportRequest` | Não existe com esse nome |
| `ModerationCase` | Existe |
| `Evidence` | Não existe com esse nome; há `EvidenceArtifact` |
| `LegalAuditLog` | Não existe com esse nome; há `AuditLog` |
| matriz de fornecedores | Não existe em tabela; está documentada em Markdown |

## Motivos do bloqueio

1. Não existe banco de homologação identificado.
2. A migration financeira remove uma restrição única e faz backfill.
3. Valores de enum não possuem rollback SQL simples.
4. A migration de governança atualiza dados.
5. O código atual depende de tabelas ainda inexistentes, portanto deploy antes da migration quebraria rotas administrativas.
6. O novo status operacional não existe no catálogo de status.
7. O trigger de documentos internos não cobre o novo status.
8. Não há backup lógico local porque as ferramentas PostgreSQL não estão instaladas.

## Resultado

Nenhuma migration foi aplicada. Nenhum dado foi alterado. Nenhum deploy foi iniciado.
