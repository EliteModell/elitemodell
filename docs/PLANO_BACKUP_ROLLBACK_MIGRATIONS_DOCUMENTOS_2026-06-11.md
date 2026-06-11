# Plano de backup e rollback das migrations de documentos

Data: 11 de junho de 2026
Status: BLOQUEADO ANTES DA APLICAÇÃO
Banco identificado: Supabase `jgvmpbrsxegwkrgjncsv`, PostgreSQL 17.6, banco `postgres`, schema `public`

## Gate de segurança

Não existe `DATABASE_URL` separado para homologação nos arquivos locais. O projeto está ligado ao Vercel de produção e o banco configurado é o banco compartilhado da aplicação.

As sete migrations não são todas puramente aditivas:

- uma remove índice único e altera a cardinalidade de pagamentos;
- uma faz backfill monetário em registros existentes;
- uma adiciona valores a enum PostgreSQL, que não possuem rollback simples;
- uma atualiza reservas e requisitos existentes;
- o trigger de proteção não contempla o novo status operacional solicitado.

Por determinação expressa da Fase 2, a aplicação foi interrompida antes de qualquer escrita.

## Backup recomendado

Antes de uma futura homologação:

1. Criar clone/branch de banco separado no Supabase ou outro PostgreSQL isolado.
2. Confirmar que a URL possui outro projeto ou database/schema e não aponta para `public` da produção.
3. Criar backup nativo no painel Supabase.
4. Criar dump lógico completo com PostgreSQL 17.
5. Validar a leitura do dump antes de aplicar migrations.

Comandos recomendados em terminal confiável, sem imprimir a URL:

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
pg_dump --dbname="$env:DIRECT_URL" --format=custom --no-owner --no-acl `
  --file="backups/elitemodell_pre_fase2_2026-06-11.dump"
pg_dump --dbname="$env:DIRECT_URL" --schema-only --no-owner --no-acl `
  --file="backups/elitemodell_pre_fase2_schema_2026-06-11.sql"
pg_restore --list "backups/elitemodell_pre_fase2_2026-06-11.dump" `
  | Set-Content "backups/elitemodell_pre_fase2_2026-06-11.contents.txt"
```

Os binários `pg_dump`, `pg_restore`, Docker e Supabase CLI não estão instalados neste ambiente local. Os comandos não foram executados.

## Auditoria das migrations

### 1. `20260609170000_upload_quarantine`

Objetivo:

- criar quarentena e rastreabilidade de uploads;
- adicionar provedores de antivírus e moderação às configurações.

Tabelas afetadas:

- `PlatformSettings`;
- nova `UploadAsset`;
- relacionamentos com `User`.

Classificação: predominantemente aditiva.

Risco: médio. Há lock de alteração em `PlatformSettings`; novos uploads passam a depender de tabela e provedores que precisam ser homologados.

Rollback:

- remover FKs e tabela `UploadAsset`;
- remover as três colunas adicionadas a `PlatformSettings`;
- restaurar dump se dados de uploads já tiverem sido gravados.

### 2. `20260609180000_data_deletion_worker`

Objetivo:

- adicionar modo, tentativas e legal hold aos jobs de exclusão;
- criar itens idempotentes para execução do worker.

Tabelas afetadas:

- `DataDeletionJob`;
- nova `DataDeletionJobItem`.

Classificação: aditiva.

Risco: médio. O worker novo precisa permanecer desativado até homologação de retenção, legal hold e idempotência.

Rollback:

- remover `DataDeletionJobItem`;
- remover as quatro colunas adicionadas a `DataDeletionJob`.

### 3. `20260609190000_payment_operations_booking_ledger`

Objetivo:

- registrar operações financeiras e ledger de reservas;
- migrar valores monetários para centavos;
- admitir múltiplos pagamentos por reserva;
- adicionar novos estados de pagamento.

Tabelas afetadas:

- `Booking`;
- `Payment`;
- novas `PaymentOperation` e `BookingFinancialEvent`;
- enum `PaymentStatus`.

Classificação: não aditiva e de alto risco.

Riscos:

- remove o índice único `Payment_bookingId_key`;
- executa backfill monetário com arredondamento;
- altera a cardinalidade entre reserva e pagamento;
- adiciona valores a enum PostgreSQL sem rollback simples;
- depois do deploy, múltiplos pagamentos por reserva podem impedir a recriação da unicidade.

Estado atual:

- 10 pagamentos;
- zero pagamentos vinculados a reserva;
- zero reservas;
- índice único ainda presente;
- nenhuma duplicidade atual.

Rollback:

- remover tabelas e colunas novas;
- recriar `Payment_bookingId_key` somente após provar ausência de duplicidades;
- os valores adicionados ao enum permanecem, salvo restauração integral do backup;
- para rollback estrito, restaurar o dump completo.

### 4. `20260609200000_legacy_media_migration_job`

Objetivo:

- controlar staging, finalização e rollback de mídia legada.

Tabelas afetadas:

- novas `LegacyMediaMigrationJob`;
- nova `LegacyMediaMigrationItem`.

Classificação: aditiva.

Risco: médio. A migration é aditiva, mas o processo posterior pode mover ou alterar referências de mídia.

Rollback:

- remover primeiro `LegacyMediaMigrationItem`;
- remover `LegacyMediaMigrationJob`;
- não executar migração de mídia antes de manifesto e rollback testados.

### 5. `20260609210000_publication_requirements`

Objetivo:

- registrar bloqueadores de publicação e histórico;
- inserir requisitos iniciais.

Tabelas afetadas:

- novas `PublicationRequirement`;
- nova `PublicationRequirementHistory`.

Classificação: aditiva com seed.

Risco: baixo a médio. O Admin atual consulta essas tabelas e falhará se o código for implantado antes da migration.

Rollback:

- remover histórico;
- remover requisitos;
- remover as duas tabelas.

### 6. `20260610200000_operational_governance_proposals`

Objetivo:

- criar governança operacional, canais, autoridade de moderação e histórico de política;
- adicionar travas de repasse;
- inserir propostas e atualizar requisitos.

Tabelas afetadas:

- `Booking`;
- `PlatformSettings`;
- `PublicationRequirement`;
- novas `ModerationAuthorityRule`, `CorporateChannel`, `PrivacyOfficerAppointment`, `LegalAddressVisibility` e `BookingPolicyHistory`.

Classificação: mista, com updates em dados.

Riscos:

- altera linhas existentes de `Booking`;
- altera valores de `PublicationRequirement`;
- adiciona defaults operacionais;
- pode modificar comportamento financeiro quando o código correspondente entrar em produção.

Estado atual:

- zero reservas;
- uma linha em `PlatformSettings`;
- `PublicationRequirement` ainda não existe, pois a migration anterior está pendente.

Rollback:

- restaurar valores anteriores de requisitos a partir do backup;
- remover tabelas e colunas novas;
- restaurar dump se houver gravações de governança após o deploy.

### 7. `20260610210000_block_internal_legal_publication`

Objetivo:

- impedir status `PUBLISHED` em documento interno.

Tabelas afetadas:

- trigger em `LegalDocumentVersion`;
- função PostgreSQL.

Classificação: aditiva.

Risco crítico de cobertura:

- o trigger verifica apenas `PUBLISHED`;
- não bloqueia `OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION`;
- usar o novo status em todos os 31 documentos deixaria os seis internos fora da proteção pretendida.

Rollback:

- remover trigger;
- remover função.

## Condições para retomar

- banco de homologação isolado confirmado;
- backup completo criado e validado;
- migration financeira revisada e aprovada;
- decisão explícita sobre um ou vários pagamentos por reserva;
- trigger ampliado para todos os status publicáveis;
- política separada para 25 documentos públicos e seis internos;
- novo status implementado no catálogo, Admin, páginas, aceite e testes;
- plano de rollback testado no clone.
