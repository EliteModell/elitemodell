# Relatório pré-deploy técnico controlado

Data: 11 de junho de 2026
Objetivo: homologação pública isolada em Vercel Preview

## Repositório

- branch: `main`;
- commit-base: `72da494`;
- worktree: possui alterações técnicas, migrations, testes e documentação ainda não commitados;
- remoto: `origin`, repositório `EliteModell/elitemodell`;
- Vercel conectado: sim, projeto `elite-modell-s-projects/elitemodell`.

## Produção identificada

- domínio: `https://elitemodell.com.br`;
- banco: Supabase, projeto `jgvmpbrsxegwkrgjncsv`;
- PostgreSQL: 17.6;
- database/schema: `postgres/public`;
- dados reais: 24 usuários, 12 profissionais, um imóvel, 10 pagamentos, zero reservas;
- documentos: 30 documentos e 30 versões `DRAFT`.

O schema `public` não será usado para a homologação das migrations.

## Integrações

| Integração | Local | Vercel Preview |
|---|---|---|
| Supabase URL/anon/service role | configurada | ausente |
| `DATABASE_URL`/`DIRECT_URL` | configurada para produção | ausente |
| Asaas | chave local ausente | configurado, ambiente Preview |
| Persona | configurada, sandbox | configurada, ambiente Preview |
| Upstash | não auditado localmente | configurado |
| NextAuth | configurado | configurado |
| `CRON_SECRET` | ausente | ausente |

## Migrations

Sete migrations estavam pendentes no schema de produção. Uma migration adicional de hardening operacional será criada para:

- registrar metadados da publicação operacional;
- proteger documentos internos contra qualquer status público;
- preservar o fluxo de ratificação jurídica posterior.

## Estratégia controlada

1. Criar schema isolado `homolog_legal_20260611`.
2. Aplicar todas as migrations nesse schema vazio.
3. Não copiar usuários ou dados pessoais de produção.
4. Persistir somente os 31 documentos jurídicos e dados técnicos mínimos.
5. Publicar operacionalmente apenas os 25 documentos públicos.
6. Manter seis documentos internos como `DRAFT_INTERNAL`.
7. Fazer deploy Vercel Preview sem aliases de produção.
8. Executar testes públicos e de segurança no Preview.
9. Não promover o Preview para produção nesta rodada.

## Gates

O deploy Preview será interrompido se:

- qualquer migration falhar;
- o schema não estiver isolado;
- não existirem exatamente 31 documentos;
- documento interno receber status público;
- aparecer `LEGAL_APPROVED` ou `PUBLISHED_FINAL`;
- TypeScript, Prisma, lint, build ou testes falharem;
- proteção `adultVerified` falhar.
