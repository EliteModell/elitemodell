# Elite Modell — auditoria de escala, capacidade e stress test

Data da auditoria: 1º de outubro de 2026
Escopo: código e configuração local, leitura leve da produção, PostgreSQL isolado com dados sintéticos e carga HTTP local.
Regra aplicada: nenhum stress em produção; nenhum SMS, e-mail, KYC, pagamento ou upload pago foi disparado.

## Resumo executivo

O banco, depois dos índices comprovados, executou as consultas críticas em menos de 20 ms com 50.000 profissionais sintéticas. O primeiro limite medido não foi o PostgreSQL: foi uma única instância Next.js, que saturou CPU e perdeu a meta de latência já com 50 usuários simultâneos. Com 500 e 1.000 usuários, a maioria das tentativas foi abortada/retornou erro de rede.

A base comporta 1.000 registros profissionais, mas a plataforma inteira **não está comprovadamente pronta** para um pico de lançamento. Faltam corrigir a configuração externa do pool da produção, observabilidade, upload direto/assíncrono e entrega de mídia otimizada. O plano real da Vercel, Supabase, Cloudflare e terceiros não pôde ser comprovado; portanto permanece `UNKNOWN`.

Resultados centrais:

| Indicador | Resultado medido |
|---|---:|
| Maior concorrência testada | 1.000 |
| Maior concorrência sem erro HTTP/rede | 200, mas com P95 de 7.009 ms |
| Melhor throughput estável sem erro | 57,12 RPS com concorrência 100 |
| P95 com 50 concorrentes | 2.402 ms |
| P95 com 100 concorrentes | 2.778 ms |
| P95 com 200 concorrentes | 7.009 ms |
| Conexões máximas no teste local | 28 |
| Limite PostgreSQL de produção | 60 conexões |
| Headroom observado em um snapshot | 49 conexões aparentes; reservas do provedor são `UNKNOWN` |
| Consulta de cidade, 50 mil, antes/depois do índice | 22,440 ms → 0,165 ms |
| Busca textual, 50 mil, antes/depois | 38,172 ms → 0,991 ms |
| Registro DB-only, 100 concorrentes | 100/100; P95 102,47 ms |
| Upload simulado, 50 × 10 MB | +998,99 MB de RSS, limite inferior |

## 1. Inventário da capacidade atual

### Vercel

| Campo | Evidência |
|---|---|
| `VERCEL_PLAN` | `UNKNOWN`; o CLI não expôs o plano |
| `VERCEL_FUNCTION_LIMITS` | Limites do plano atual `UNKNOWN`; a documentação informa 2 GB no Hobby e 2 GB padrão/4 GB máximo no Pro/Enterprise para Node, mas isso não prova o plano do projeto |
| `VERCEL_BANDWIDTH_LIMIT` | `UNKNOWN`; documentação indica 100 GB no Hobby e 1 TB no Pro, mas o plano não foi identificado |
| `VERCEL_IMAGE_LIMITS` | `UNKNOWN`; documentação indica cotas por plano e entrada máxima de 10 MB por imagem transformada |
| `VERCEL_CONCURRENCY` | Configuração real `UNKNOWN`; documentação informa autoscaling, mas isso não valida a aplicação nem o plano |
| Projeto | `elitemodell`, Next.js, Node 24 |
| Build remoto | **CORRIGIDO/CONFIRMADO:** o deployment final `dpl_BuXYSPRz6o5bTF94YkPGiQVT9B5R` informou `buildCommand: npm run build` e ficou `READY` |

Durante a auditoria foi observado um override remoto antigo que executava diretamente uma migration antes do build:

```text
npx prisma db execute --url "$DIRECT_URL" --file prisma/migrations/20260522120000_pre_production_safety_fixes/migration.sql && npm run build
```

Esse override não apareceu no deployment final: a configuração efetiva voltou a `npm run build`. Migrations devem continuar fora do build, em job controlado com `prisma migrate deploy`. O item de Build Command está concluído; não permanece como bloqueador.

Fontes oficiais: [limites de Functions](https://vercel.com/docs/functions/limitations), [uso e preço de Fluid Compute](https://vercel.com/docs/functions/usage-and-pricing), [limites e preço de imagens](https://vercel.com/docs/image-optimization/limits-and-pricing), [limites gerais](https://vercel.com/docs/limits).

### Supabase/PostgreSQL

| Campo | Evidência medida |
|---|---|
| `SUPABASE_PLAN` | `UNKNOWN`; CLI respondeu `Unauthorized` ao listar projetos |
| `DATABASE_CPU` | `UNKNOWN` |
| `DATABASE_MEMORY` | `UNKNOWN`; `shared_buffers=224 MiB` não é RAM total |
| `DATABASE_CONNECTION_LIMIT` | `max_connections=60` |
| `POOLER_CONFIGURATION` | Runtime na porta 6543, `pgbouncer=true`; migrations na porta 5432 |
| `DATABASE_STORAGE` | Banco atual 26.586.259 bytes, aproximadamente 25,4 MiB |
| `DATABASE_BANDWIDTH` | `UNKNOWN` |
| `AUTH_LIMITS` | `UNKNOWN` |
| `STORAGE_LIMITS` | `UNKNOWN` |
| `EGRESS_LIMITS` | `UNKNOWN` |

Configurações observadas: `statement_timeout=120s`, `idle_in_transaction_session_timeout=0`, `work_mem=2184kB`, `effective_cache_size=384MiB`. Havia 11 conexões no snapshot: 2 ativas, 4 idle, 3 idle-in-transaction e 2 internas/sem estado. As três transações ociosas e a ausência de timeout são alertas operacionais.

O limite de 60 corresponde às classes Nano ou Micro documentadas, mas não permite distinguir a classe nem o plano. Fonte: [compute e conexões Supabase](https://supabase.com/docs/guides/platform/compute-and-disk), [pooling e limites](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [billing Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase).

### Cloudflare e terceiros

| Campo | Resultado |
|---|---|
| `CLOUDFLARE_PLAN` | `UNKNOWN` |
| `RATE_LIMITING` na borda | `UNKNOWN`; não foi possível provar regra ativa |
| `CDN_STATUS` | `UNKNOWN`; nenhuma configuração de cache adulto foi comprovada |
| `TWILIO_LIMITS` | `UNKNOWN` |
| `RESEND_LIMITS` | `UNKNOWN` |
| `DIDIT_LIMITS` | `UNKNOWN` |
| `PERSONA_LIMITS` | `UNKNOWN` |
| `UPSTASH_LIMITS` | `UNKNOWN` |

Há variáveis de ambiente para Twilio, Didit, Resend, Asaas, Supabase, Persona e Upstash, sem revelar valores. A presença da variável não comprova plano, saldo ou quota. As variáveis de Bunny, assinatura de mídia e cron de produção não estavam presentes no inventário Vercel.

Referências de quota/preço, não confirmação de plano: [Cloudflare](https://www.cloudflare.com/plans/), [Upstash Redis](https://upstash.com/pricing/redis), [Resend](https://resend.com/pricing), [Didit](https://didit.me/pricing/), [Persona](https://withpersona.com/pricing), [Twilio Verify](https://www.twilio.com/en-us/verify/pricing).

## 2. Rotas críticas

Os números HTTP abaixo são da execução indexada com **50 concorrentes**, banco isolado com 50 mil profissionais e provedores externos desligados. `DATABASE_QUERIES` permanece `UNKNOWN`: a carga não capturou telemetria por query, e estimar por leitura do código seria apresentar uma medição inexistente.

| Rota | Requests | Média | P95 | P99 | Payload médio | Erro | Cache | Gargalo |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Home | 50 | 318,69 ms | 551,20 ms | 566,08 ms | 42.430 B | 0% | estática | CPU/entrega local |
| Busca por cidade | 111 | 1.487,48 ms | 2.502,39 ms | 2.697,47 ms | 18.971 B | 0% | privado/no-store após age gate | SSR/API/serialização; SQL já rápido |
| Listagem | 60 | 1.541,44 ms | 2.533,01 ms | 2.661,18 ms | 18.979 B | 0% | privado/no-store | SSR/API/serialização |
| Perfil | 70 | 1.240,57 ms | 2.285,11 ms | 2.441,95 ms | 1.584 B | 0% | privado/no-store | relações, SSR e mídia |
| Stories | 27 | 1.361,97 ms | 1.723,31 ms | 1.767,46 ms | 2 B | 0% | privado/no-store | CPU/consultas dinâmicas |
| Login | 42 | 284,72 ms | 563,94 ms | 601,77 ms | 21.855 B | 0% | página estática | CPU local |
| Página de cidade | 12 | 1.701,81 ms | 3.131,54 ms | 3.131,54 ms | 21.383 B | 0% | privado/no-store | SSR dinâmico |

Demais rotas:

| Rota | Requests/latência/payload/erro | Banco | Cache | Diagnóstico |
|---|---|---|---|---|
| Media | `UNKNOWN`, não carregada para evitar conteúdo/custo | dinâmica | privado/no-store | baixa o arquivo inteiro do storage para Buffer na função para imagens |
| Cadastro | HTTP E2E `UNKNOWN`; DB-only medido separadamente | transação | no-store | concorrência corrigida com lock advisory + unicidade |
| OTP | `UNKNOWN`; provedor real não chamado | dinâmica | no-store | dependência externa, rate limit presente |
| KYC | `UNKNOWN`; provedor real não chamado | dinâmica | no-store | dependência externa, rate limit adicionado |
| Upload | carga de memória medida, sem storage | dinâmica | no-store | `formData` + `arrayBuffer` + `Buffer`, processamento síncrono |
| Admin | SQL isolado medido | dinâmica | no-store | páginas principais paginadas; alguns limites fixos sem paginação |
| Aprovados/pendentes/reprovados/trial | HTTP `UNKNOWN` | dinâmica | no-store | aprovação tornou-se idempotente; dataset de pendentes não foi representativo |

O endpoint de tracking de perfil ainda usa cabeçalho público em respostas de `POST`; não há dado sensível na resposta `{ok}`, mas cache de escrita é desnecessário e deve ser removido em P1.

## 3. Banco isolado e EXPLAIN ANALYZE

Ambiente: PostgreSQL 17 em WSL, 8 CPUs visíveis, aproximadamente 3,76 GB de memória, 50.000 profissionais, 50.000 usuários, 500.000 fotos e 50.000 vínculos de especialidade. O seed recusa qualquer host não local e qualquer banco diferente de `elite_scale`.

### Antes dos índices

| Profissionais | Cidade/página | Cidade/count | Texto | Perfil/slug | Fotos | Admin/group |
|---:|---:|---:|---:|---:|---:|---:|
| 1.000 | 0,583 ms | 0,461 ms | 0,935 ms | 0,031 ms | 0,104 ms | 0,426 ms |
| 5.000 | 3,163 ms | 2,288 ms | 4,247 ms | 0,047 ms | 0,079 ms | 2,277 ms |
| 10.000 | 4,944 ms | 4,297 ms | 7,389 ms | 0,047 ms | 0,066 ms | 3,421 ms |
| 50.000 | 22,440 ms | 20,634 ms | 38,172 ms | 0,083 ms | 0,084 ms | 18,403 ms |

Com 50 mil, a cidade fazia sequential scan de 50 mil linhas, descartava aproximadamente 40 mil e ordenava 10 mil. Também faltava índice em `ProfessionalSpecialty.professionalId`; na produção, essa relação mostrava 437 sequential scans contra 1 index scan.

### Depois dos índices comprovados, 50 mil

| Consulta | Antes | Depois |
|---|---:|---:|
| Cidade/página + ranking | 22,440 ms | 0,165 ms |
| Cidade/count | 20,634 ms | 14,712 ms |
| Busca textual | 38,172 ms | 0,991 ms |
| Perfil por slug | 0,083 ms | 0,036 ms |
| Fotos | 0,084 ms | 0,078 ms |
| Admin/group | 18,403 ms | 19,167 ms |

Foram aplicados em produção, pela migração `20261001190000_scale_launch_guards`:

- GIN `pg_trgm` para cidade, estado, nome e bio;
- índice composto de publicação/ranking;
- índice da FK `ProfessionalSpecialty.professionalId`;
- unicidade parcial do telefone verificado normalizado;
- unicidade parcial do documento normalizado.

A produção tinha 0 grupos duplicados antes da criação das constraints. A migração foi aplicada e `prisma migrate status` confirmou 37 migrações em dia.

O histórico antigo, porém, não inicializa um banco vazio: a primeira migração assume tabelas preexistentes. O teste isolado precisou de `prisma db push`. Isso é bloqueador de disaster recovery e de criação limpa de staging.

## 4. Connection pool

```text
CURRENT_POOL = Supabase transaction pooler :6543, pgbouncer=true, max_connections do servidor=60
SAFE_CONCURRENCY = UNKNOWN; não há connection_limit nem pool_timeout na URL efetiva de produção
RISK = explosão de funções Vercel cria múltiplos pools Prisma e pode esgotar as 60 conexões
FIX_REQUIRED = configurar connection_limit=1&pool_timeout=10 no DATABASE_URL da Vercel e validar em Preview
```

O `.env.example` foi corrigido. A variável remota não foi alterada. `DIRECT_URL` continua reservada a migrations, porta 5432. No teste local, Prisma atingiu 28 conexões; isso não é um número seguro para multiplicar por instâncias serverless.

## 5. Carga HTTP gradual

Mistura: home 10%, busca 30%, listagem 15%, perfil 20%, stories 10%, login 10%, cidade 5%. A execução foi local, com banco isolado e sem APIs pagas.

| Load | Concorrência | RPS bruto | DB conexões | P95 | P99 | Erro | Status |
|---:|---:|---:|---:|---:|---:|---:|---|
| 50 | 50 | 41,51 | 28 | 2.402 ms | 2.998 ms | 0% | YELLOW |
| 100 | 100 | 57,12 | 28 | 2.778 ms | 4.222 ms | 0% | YELLOW |
| 200 | 200 | 42,47 | 28 | 7.009 ms | 10.562 ms | 0% | RED |
| 500 | 500 | 112,37 bruto | 28 | 17.735 ms | 18.718 ms | 81,15% | RED |
| 1.000 | 1.000 | 107,98 bruto | 28 | 19.678 ms | 20.042 ms | 84,86% | RED |

Nos níveis 500/1.000, o RPS inclui falhas e não é throughput útil: houve somente 427 e 330 respostas bem-sucedidas, respectivamente. O processo chegou a aproximadamente 471,5 MiB de working set na rodada completa; uma rodada anterior isolada de 1.000 chegou a 532 MiB. Pico observado de CPU: 180,43% de um núcleo equivalente na rodada completa, e 252,83% em uma rodada de 1.000.

Payload/segundo medido nas rodadas indexadas: aproximadamente 5,94 Mbps (50), 9,88 Mbps (100) e 6,87 Mbps (200). A queda em 200 é saturação, não eficiência. `queries/s` é `UNKNOWN` por ausência de telemetria por query.

Esses números medem uma instância local, não o autoscaling horizontal da Vercel. Eles provam que o código por instância não cumpre a meta; não provam a capacidade agregada da Vercel.

## 6. Cadastro em massa

Teste DB-only, sem SMS, CAPTCHA, Supabase Auth, e-mail ou KYC:

| Concorrência | Sucesso | P95 | Throughput |
|---:|---:|---:|---:|
| 10 | 10/10 | 107,19 ms | 90,74/s |
| 25 | 25/25 | 60,94 ms | 385,02/s |
| 50 | 50/50 | 52,23 ms | 897,61/s |
| 100 | 100/100 | 102,47 ms | 867,87/s |

O fluxo antigo sob retry concorrente gerou 9, 24, 49 e 99 erros `P2002`. `upsert` isolado também não tornou o retorno idempotente. A correção usa advisory lock por telefone/e-mail, releitura dentro da transação e retorna o usuário existente. Em 100 retries concorrentes: 100 respostas de sucesso, 1 usuário persistido, lote em 539,65 ms.

Também foram adicionados lock e idempotência à confirmação de telefone e às aprovações administrativas, além das constraints de telefone/documento. Antes da constraint, dois usuários com o mesmo telefone/documento normalizado eram aceitos; depois, o segundo foi bloqueado com `P2002`.

Resultado: camada de banco aprovada para 100 concorrentes. Fluxo completo com OTP/KYC/e-mail continua `UNKNOWN`.

## 7. Upload de fotos

O teste criou payload, cópia equivalente a `arrayBuffer`/`Buffer` e SHA-256 em processos novos, sem storage ou moderação:

| Arquivo | 10 simultâneos | 25 simultâneos | 50 simultâneos |
|---|---:|---:|---:|
| 1 MB | +20,10 MB RSS | +50,28 MB | +100,49 MB |
| 5 MB | +100,15 MB | +250,27 MB | +500,66 MB |
| 10 MB | +200,13 MB | +499,48 MB | +998,99 MB |

São limites inferiores: não incluem framework, socket, multipart, cliente do storage, antivírus nem moderação. O fluxo atual passa o arquivo inteiro por Next.js (`formData` → `arrayBuffer` → `Buffer`) e processa quarentena/segurança na mesma request. Os limites aceitos chegam a 20 MB para imagem e 50 MB para vídeo/verificação.

Arquitetura necessária antes de vídeo em produção:

1. API cria `UploadAsset` em `PENDING` e emite URL curta, vinculada a usuário, MIME, tamanho e chave esperada.
2. Navegador envia diretamente para bucket privado de quarentena.
3. Callback/finalize valida tamanho real, MIME detectado, hash e ownership.
4. Job assíncrono executa AV, moderação, thumbnail/transcode e gates.
5. Somente o artefato aprovado é promovido; retry idempotente por asset/hash.

## 8. Vídeo: capacidade para 1.000 profissionais

Armazenamento decimal, sem replicação nem variantes:

| Vídeos/profissional | 25 MB | 50 MB | 100 MB | 250 MB |
|---:|---:|---:|---:|---:|
| 3 | 75 GB | 150 GB | 300 GB | 750 GB |
| 5 | 125 GB | 250 GB | 500 GB | 1,25 TB |
| 10 | 250 GB | 500 GB | 1 TB | 2,5 TB |

`MONTHLY_UPLOAD` não pode ser inferido da biblioteca total. Hipótese explícita de planejamento: substituição de 20% do acervo por mês. No caso-base de 5 vídeos × 100 MB, o acervo inicial é 500 GB e o upload recorrente é 100 GB/mês. Transcoding e thumbnails aumentam storage.

Hipótese de tráfego por visita: cinco imagens otimizadas de 300 KB (1,5 MB) e dois minutos de vídeo a 2 Mbps (30 MB).

| Visitantes/dia | Imagem/mês | Streaming/mês | Total/mês |
|---:|---:|---:|---:|
| 10.000 | 450 GB | 9 TB | 9,45 TB |
| 50.000 | 2,25 TB | 45 TB | 47,25 TB |
| 100.000 | 4,5 TB | 90 TB | 94,5 TB |

Esses são cenários, não previsão de tráfego. Storage e egress foram separados.

## 9. Bunny.net

O código já tem abstração de provider Supabase/Bunny, flag de ativação e dry-run de migração. Produção continua sem Bunny e sem credenciais.

Integração necessária:

- imagens: Storage Zone privada, direct upload controlado, Pull Zone/CDN, token authentication, hotlink protection, URLs assinadas curtas e variantes derivadas;
- vídeo: criar objeto via API do Bunny Stream, upload direto/TUS, webhook assinado, estados de encode, thumbnails, HLS adaptativo, token auth e domínio/embed restrito;
- aplicação: persistir provider, asset externo, status, hash, versão/variant e eventos idempotentes;
- segurança: nunca liberar original em quarentena; callback não pode, sozinho, tornar conteúdo publicável sem todos os gates.

Recomendação: Bunny para fotos **antes de publicar acervo grande**, após homologação. Bunny Stream **antes de habilitar upload de vídeo ao público**. Não é necessário ativar Bunny para cadastro textual de 1.000 profissionais.

Fontes: [Bunny Storage](https://bunny.net/pricing/storage/), [Bunny CDN](https://bunny.net/pricing/cdn/), [Bunny Stream](https://bunny.net/stream/).

## 10. Imagens

Situação atual:

- `next/image` está configurado para AVIF/WebP, `srcset`, tamanhos e lazy loading;
- há `sizes`/`quality` na maior parte das telas públicas;
- uploads mantêm o original; não existe pipeline persistido de variantes;
- imagens adultas usam `/api/media/:id`, autenticação e `private, no-store`;
- a rota baixa o objeto inteiro para memória e impede CDN compartilhado;
- o otimizador padrão do Next não encaminha headers de autenticação; a própria documentação recomenda `unoptimized` quando a origem exige autenticação. A entrega real de mídia aprovada precisa ser homologada, pois a produção não possui ativos publicáveis.

Pipeline proposto:

| Variante | Dimensão máxima | Formato/qualidade inicial | Uso |
|---|---:|---|---|
| ORIGINAL | original | privado, sem transformação | evidência/reprocessamento, nunca público |
| THUMBNAIL | 96 px | AVIF/WebP 60 | avatar/story/admin |
| CARD | 640 px | AVIF/WebP 70 | busca/listagem |
| PROFILE | 1.280 px | AVIF/WebP 72 | perfil |
| FULL | 1.920 px | AVIF/WebP 75 | lightbox |

Dimensões, orientação, remoção de metadata, decompression-bomb limits e tamanho final precisam ser validados no worker. Imagem de 8 MB não deve chegar ao card.

## 11. Cache

Classificação:

| Classe | Rotas/dados | Política |
|---|---|---|
| STATIC | home, login, assets de marca | build/CDN |
| SEMI_STATIC | cidades, política pública, configurações não sensíveis | cache curto + invalidação |
| DYNAMIC | busca, perfil, stories, avaliações após age gate | `private, no-store` enquanto depender de sessão 18+ |
| REAL_TIME/SENSITIVE | admin, KYC, OTP, status, pagamentos, mídia privada | `private, no-store` |

Foi corrigido um risco crítico: busca, perfil, stories e avaliações autenticadas usavam `public, s-maxage=60`, permitindo cache compartilhado entre sessões. Agora usam `private, no-store`. Cidades permanecem públicas. Configurações de cobrança ganharam cache de 60 segundos com tag e invalidação imediata pela Server Action administrativa; transações ignoram o cache e leem seu próprio snapshot.

Consequência: o cache seguro reduziu reutilização de HTML/JSON adulto. Para escalar mídia e descoberta será necessário token de borda/URL assinada que preserve age gate, sem reintroduzir cache público por usuário.

## 12. Rate limiting

Limites aplicados/validados no código:

- busca pública: 300/min/IP;
- perfil público: 300/min/IP;
- stories GET e reviews GET: 180/min/IP;
- media: 240/15 min por usuário+IP;
- upload: 40/15 min por usuário+IP;
- KYC/Didit/Persona: 3 sessões/hora/usuário;
- cadastro: 20/hora/IP;
- OTP, reports, contact e demais escritas já possuem limites específicos.

O limiter assíncrono usa Upstash quando configurado. Na ausência/erro do Redis, cai para memória por instância; em serverless isso não é distribuído e equivale a degradação fail-open entre instâncias. Regra Cloudflare ativa não foi comprovada. Antes do lançamento: confirmar Upstash remoto, budget/alerta e proteção de borda para login/register/OTP/search/media.

## 13. Queue/background jobs

Devem sair da request principal:

- upload/finalização, antivírus, moderação, geração de variantes e vídeo;
- transcoding, thumbnail e callbacks;
- e-mails, notificações e auditoria volumosa;
- limpeza/retention e retries de provedores.

Hoje o pipeline de upload chama segurança e promoção de forma síncrona. Há worker/cron para exclusão de dados, mas não há fila de mídia comprovada. Projeto recomendado: outbox no Postgres com `jobType`, `dedupeKey`, `attempt`, `runAfter`, lease/heartbeat e dead-letter; worker separado, idempotente e com backoff. Não foi contratado nem ativado serviço novo.

## 14. Admin

As telas principais de profissionais, clientes e auditoria são paginadas. `/api/admin/kyc` fazia leitura sem limite e foi corrigida para `limit` padrão 50, máximo 100. SQL de agrupamento administrativo ficou em 0,426/2,277/3,421 ms para 1k/5k/10k e 19,167 ms em 50k.

Alertas:

- KYC UI usa `take: 80`, mas não oferece próxima página;
- moderação de uploads usa `take: 100`, sem paginação;
- suporte/financeiro/reports são limitados, porém alguns usam apenas janela fixa;
- tabelas pequenas de configuração/governança têm leituras sem paginação, aceitáveis somente enquanto o domínio continuar pequeno;
- dataset sintético tinha todos os perfis ativos; P95 real de pendentes/reprovados precisa de seed balanceado.

## 15. Observabilidade

Sentry está instalado, mas nenhuma variável Sentry foi evidenciada no ambiente Vercel. Portanto o estado de produção é `UNKNOWN`, não “ativo”. Não há dashboard comprovado para RPS, P95/P99, conexões, slow queries, memória, CPU, falhas de upload/storage/OTP/KYC.

Foi endurecida a sanitização Sentry: remove usuário, cookie/auth headers, cookies, body, query string, extras e breadcrumbs de console. Ainda existem aproximadamente 145 chamadas `console` no código; precisam de revisão estruturada. Código OTP de desenvolvimento só pode permanecer com logging desabilitado em produção.

Alertas mínimos antes do lançamento:

- erro 5xx > 1%/5 min; P95 search/profile > 750 ms/10 min;
- conexões DB > 70% e > 85%; idle-in-transaction > 0 por 5 min;
- pool timeout, slow query > 500 ms;
- RSS/function timeout/413;
- taxa de falha e latência de storage, OTP e KYC;
- fila: depth, oldest age, attempts e dead-letter.

## 16. Failover e degradação

| Falha | Efeito atual | Degradação segura necessária |
|---|---|---|
| Vercel | origem inteira indisponível; não há segunda origem comprovada | status page/runbook; multi-region somente após validar plano; Cloudflare não substitui origem dinâmica |
| Supabase DB | busca, perfil, auth adaptada, admin e escrita falham; páginas estáticas podem abrir | circuit breaker, mensagens de indisponibilidade, retry apenas idempotente, restore ensaiado |
| Storage | metadata abre, mídia retorna indisponível; uploads falham na request | manter asset pendente, fila/retry e nunca liberar sem gates |
| Twilio | canal pode bloquear verificação; existem alternativas Firebase/WhatsApp no código, configuração real desconhecida | health/fallback explícito, cooldown e status pendente sem criar duplicata |
| KYC | sessão pode falhar; não há fila persistente geral | conta permanece pendente, retry idempotente posterior, sem aprovar por indisponibilidade |

O restore do backup foi ensaiado anteriormente, mas a cadeia histórica de migrations não recria banco vazio; o runbook deve usar backup lógico validado até a baseline ser corrigida.

## 17. Metas de performance

| Meta | Melhor medição comparável | Resultado |
|---|---:|---|
| Home P95 ≤ 500 ms | 551 ms a 50 | FAIL por 51 ms |
| Search P95 ≤ 750 ms | 2.502 ms a 50 | FAIL |
| City Search P95 ≤ 750 ms | 2.502 ms a 50 | FAIL |
| Profile P95 ≤ 750 ms | 2.285 ms a 50 | FAIL |
| LCP ≤ 2,5 s | `UNKNOWN` nesta auditoria | NÃO COMPROVADO |
| CLS ≤ 0,1 | `UNKNOWN` | NÃO COMPROVADO |
| INP ≤ 200 ms | `UNKNOWN` | NÃO COMPROVADO |

Os EXPLAINs sub-milisegundo mostram que busca/perfil não estão mais limitados pela consulta principal. O restante é CPU/SSR, serialização, relações, autenticação e falta de cache compartilhável seguro.

## 18. Capacity plan

| LOAD_LEVEL | USERS_CONCURRENT | RPS | DB_CONNECTIONS | P95 | ERROR_RATE | STATUS |
|---|---:|---:|---:|---:|---:|---|
| Entrada | 50 | 41,51 | 28 | 2,402 s | 0% | YELLOW |
| Intermediário | 100 | 57,12 | 28 | 2,778 s | 0% | YELLOW |
| Lançamento | 200 | 42,47 | 28 | 7,009 s | 0% | RED |
| Pico | 500 | 112,37 bruto | 28 | 17,735 s | 81,15% | RED |
| Stress | 1.000 | 107,98 bruto | 28 | 19,678 s | 84,86% | RED |

Não existe nível `GREEN` comprovado entre os níveis solicitados. O próximo teste deve incluir 10/20/30/40 concorrentes para encontrar o teto dentro das metas, e depois repetir em Vercel Preview com a URL de pool corrigida.

## 19. Planejamento para 1.000 profissionais

Hipótese-base solicitada: 10 fotos e 5 vídeos por profissional. Hipótese adicional declarada: foto original média de 5 MB e vídeo médio de 100 MB.

```text
TOTAL_IMAGES = 10.000
TOTAL_VIDEOS = 5.000
STORAGE_IMAGES = 50 GB de originais
STORAGE_VIDEOS = 500 GB antes de transcodes/thumbnails
TOTAL_BASE = 550 GB
MONTHLY_UPLOAD (20% de substituição) = 110 GB/mês
```

Com 10k/50k/100k visitantes por dia, o cenário de egress é 9,45/47,25/94,5 TB por mês conforme a hipótese descrita na seção de vídeo. Não é previsão.

## 20. Autoscaling

| Componente | Escala automática? | Limite/manual |
|---|---|---|
| Vercel | Sim, horizontal/Fluid quando habilitado e dentro do plano | plano, região, custo, duração e capacidade por instância; configuração real `UNKNOWN` |
| Supabase DB | Não para CPU/RAM/conexões da instância | upgrade de compute, pool e read replicas são manuais |
| Supabase Storage | serviço gerenciado cresce, sujeito a quota/custo | egress e storage faturáveis; limite real do plano `UNKNOWN` |
| Cloudflare | CDN/edge gerenciado | regras, plano, cache e rate limit precisam ser configurados/confirmados |
| Upstash | depende do plano; pay-as-you-go aceita volume | free tem 500k comandos/mês e 10k comandos/s; HA/SLA exige opção paga |
| Bunny futuro | CDN/Stream gerenciados | storage zones, budget, token auth e regiões precisam de ativação manual |

Não há evidência que justifique, hoje, um upgrade específico de compute do banco: as queries passaram com 50 mil. Há evidência para corrigir pool e medir em Preview antes de decidir plano.

## 21. Custos condicionais, somente fontes oficiais

Os planos reais são `UNKNOWN`; portanto não há “conta atual mensal” comprovada. A tabela abaixo usa hipóteses explícitas e preços públicos em USD, sem impostos/câmbio/suporte/replicação.

| Categoria | 1.000 profissionais + 10k visitas/dia | 5.000 profissionais + 50k visitas/dia |
|---|---:|---:|
| Hosting Vercel | `UNKNOWN`; depende do plano e CPU/memória reais | `UNKNOWN` |
| Banco compute | `UNKNOWN`; classe real não identificada | `UNKNOWN` |
| Supabase storage, se Pro e todo acervo lá | 450 GB acima de 100 GB × US$0,0213 = **US$9,59/mês** | 2.650 GB acima × US$0,0213 = **US$56,45/mês** |
| Supabase egress, se todo tráfego uncached lá | (9.450−250) GB × US$0,09 = **US$828/mês** | (47.250−250) GB × US$0,09 = **US$4.230/mês** |
| Bunny storage, 1 região, piso anunciado | 550 GB × US$0,01 = **US$5,50/mês** | 2.750 GB × US$0,01 = **US$27,50/mês** |
| Bunny CDN imagens, tráfego majoritariamente América do Sul | 450 GB × US$0,045 = **US$20,25/mês** | 2.250 GB × US$0,045 = **US$101,25/mês** |
| Bunny Stream CDN, piso “from” | 9.000 GB × US$0,005 = **US$45/mês** | 45.000 GB × US$0,005 = **US$225/mês** |
| KYC Didit, 1 Full KYC/profissional e 500 grátis | 500 × US$0,33 = **US$165** | 4.500 × US$0,33 = **US$1.485** |
| Twilio Verify, 1 sucesso + 1 segmento SMS internacional BR | **US$109,90** ilustrativos | **US$549,50** ilustrativos |
| Resend | Free comporta 3k/mês, mas só 100/dia; burst requer ao menos Pro **US$20/mês** | Pro US$20 cobre até 50k/mês |
| Persona | a partir de **US$250/mês**, contrato mínimo de 12 meses; custo por check `UNKNOWN` | `UNKNOWN`/contrato |
| Upstash | `UNKNOWN`; pay-as-you-go anunciado a US$0,20/100k comandos | `UNKNOWN` |

O total Bunny de mídia no piso anunciado seria US$70,75/mês no primeiro cenário e US$353,75/mês no segundo. É **piso de planejamento**, não cotação: Stream usa “from”, tráfego por região e transcodes/replicação podem mudar o valor.

Fontes: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase storage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size), [Bunny CDN](https://bunny.net/pricing/cdn/), [Bunny Storage](https://bunny.net/pricing/storage/), [Bunny Stream](https://bunny.net/stream/), [Twilio Verify](https://www.twilio.com/en-us/verify/pricing), [Twilio SMS Brasil](https://www.twilio.com/en-us/sms/pricing/br), [Didit](https://didit.me/pricing/), [Persona](https://withpersona.com/pricing), [Resend](https://resend.com/pricing), [Upstash](https://upstash.com/pricing/redis).

## 22. Gates de lançamento

### P0 — antes de segunda/antes de abrir tráfego

1. **CONCLUÍDO:** o deployment final confirmou `npm run build`; migrations devem permanecer em job controlado com `prisma migrate deploy`.
2. Alterar `DATABASE_URL` remoto para transaction pooler com `pgbouncer=true&connection_limit=1&pool_timeout=10`; validar Preview.
3. Confirmar plano/quota/spend cap de Vercel, Supabase, Upstash, Twilio, Resend e KYC no dashboard. Sem isso, `PLAN_UPGRADE_REQUIRED=UNKNOWN`.
4. Ativar observabilidade sem PII, pelo menos erros, P95/P99, conexões e alertas de provedores.
5. Executar carga segura em Vercel Preview a 10/20/30/40/50 e depois 100/200; não promover se search/profile continuarem acima de 750 ms.
6. Corrigir/baselinar a estratégia de bootstrap do banco e documentar restore; hoje migrations não criam banco vazio.
7. Homologar mídia autenticada de ponta a ponta. O caminho `/api/media` + `next/image` autenticado não está comprovado com ativo aprovado real.
8. Homologar o fluxo de busca corrigido em Preview: a persistência de `cidade/estado` no URL foi ajustada após uma falha reproduzida localmente.

### P1 — primeira semana

- implementar direct upload para quarentena e worker/outbox idempotente;
- paginar KYC e moderação de uploads no Admin;
- dashboard/alertas de queue, upload, storage, OTP e KYC;
- confirmar rate limits Cloudflare/Upstash e comportamento em outage;
- capturar query count/queries per second e slow queries;
- medir Web Vitals reais e corrigir LCP/INP/CLS;
- remover cache público do POST de tracking e revisar as chamadas `console`.

### P2 — primeiro mês

- homologar Bunny Storage/CDN e Bunny Stream antes de vídeo público;
- pipeline ORIGINAL/THUMBNAIL/CARD/PROFILE/FULL;
- teste balanceado de Admin com pendentes/reprovados;
- ensaio periódico de restore/failover e baseline limpa de migrations;
- otimização de CPU/SSR e reexecução até haver nível `GREEN`.

## 23. Ações que não foram executadas

Não houve stress em produção, contas reais em massa, SMS/e-mail/KYC/cobrança, consumo pago em massa, exclusão, DNS, troca de provider ou exposição de secret. A única escrita de infraestrutura foi a migração de índices/constraints previamente validada, em uma base pequena e sem duplicatas.

## 24. Alterações realizadas

- scripts guardados para auditoria DB, seed/benchmark isolado, carga HTTP, concorrência de registro e memória de upload;
- índices e constraints comprovados e aplicados;
- registro, telefone e aprovações com idempotência/locks;
- rate limit distribuído nas rotas críticas restantes;
- cache adulto alterado para privado/no-store;
- cache de configuração não sensível por 60 s com invalidação;
- limite na listagem KYC administrativa;
- sanitização Sentry reforçada;
- `.env.example` documenta pool serverless seguro;
- scripts npm `scale:*` adicionados.

## Relatório final — campos solicitados

```text
CURRENT_CAPACITY = 57,12 RPS sem erro a 100 concorrentes, mas P95 2,778 s e fora da meta; nenhuma carga solicitada atingiu GREEN
MAX_TESTED_CONCURRENCY = 1.000
MAX_STABLE_RPS = 57,12 RPS com 0% de erro; não é capacidade dentro do SLA
DATABASE_CONNECTION_HEADROOM = 49 aparentes no snapshot (60 máximo, 11 observadas); headroom utilizável real UNKNOWN
SEARCH_CAPACITY = 12,84 RPS de busca/cidade a C100, P95 2,638 s, FAIL
PROFILE_CAPACITY = 8,22 RPS a C100, P95 2,567 s, FAIL
REGISTRATION_CAPACITY = DB-only 100 concorrentes, 100/100, P95 102,47 ms; E2E UNKNOWN
UPLOAD_CAPACITY = 50 × 10 MB consumiram +998,99 MB RSS; fluxo atual NÃO SEGURO para pico/vídeo

1000_PROFESSIONALS_READY = SIM para volume de dados/queries; NÃO para lançamento completo sob pico
10000_DAILY_VISITORS_READY = NÃO COMPROVADO
50000_DAILY_VISITORS_READY = NÃO COMPROVADO
100000_DAILY_VISITORS_READY = NÃO COMPROVADO

DATABASE_SCALE_STATUS = YELLOW: consultas e índices aprovados até 50k; pool remoto e bootstrap são P0
VERCEL_SCALE_STATUS = RED/UNKNOWN: build remoto corrigido e deployment READY; plano desconhecido e metas não atingidas por instância
STORAGE_SCALE_STATUS = RED para acervo adulto: quota/plano desconhecidos, proxy em memória e sem variantes/CDN homologado
VIDEO_SCALE_STATUS = RED: não liberar upload/streaming antes de direct upload + worker + Stream/CDN
ADMIN_SCALE_STATUS = YELLOW: principais telas paginadas e SQL rápido; KYC/moderação ainda têm janelas sem navegação

BOTTLENECK_1 = CPU/SSR da instância Next; saturação antes do banco
BOTTLENECK_2 = upload/mídia inteiro em memória e processamento síncrono
BOTTLENECK_3 = pool Prisma de produção sem connection_limit/pool_timeout
BOTTLENECK_4 = falta de CDN/variantes/streaming autenticado homologado
BOTTLENECK_5 = observabilidade e quotas/planos externos UNKNOWN

PLAN_UPGRADE_REQUIRED = UNKNOWN; não há evidência suficiente para escolher plano, mas configuração P0 é obrigatória
PROVIDER_CHANGE_REQUIRED = NÃO para cadastro textual; SIM antes de vídeo em escala, recomendação Bunny Stream
CODE_CHANGES_REQUIRED = SIM

BUNNY_RECOMMENDATION = homologar Bunny Storage/CDN para imagens antes do acervo grande; não ativar sem credenciais/aprovação
BUNNY_STREAM_RECOMMENDATION = obrigatório antes de vídeo público em escala; upload direto, webhook, HLS, token auth e hotlink protection

LAUNCH_BLOCKERS = DATABASE_URL/pool, quotas/planos, observabilidade, teste Preview, bootstrap/restore e mídia autenticada
FIRST_WEEK_ACTIONS = direct upload/queue, paginação Admin, métricas, rate limit de borda, Web Vitals
FIRST_MONTH_ACTIONS = Bunny, variantes de imagem, Stream, failover e otimização até GREEN

ESTIMATED_CAPACITY_FOR_1000_PROFESSIONALS = 10.000 imagens + 5.000 vídeos; 550 GB base na hipótese 5 MB/100 MB; 110 GB/mês a 20% de renovação; 9,45 TB/mês no cenário de 10k visitantes/dia

TESTS = PASS, 110/110 no conjunto afetado final, incluindo segurança de mídia adulta, age gate, busca, cadastro e regressão visual
LINT = PASS, 0 erros e 8 warnings legados
TYPECHECK = PASS
BUILD = PASS, Next.js 16.2.8
PRISMA_VALIDATE = PASS
GIT_DIFF_CHECK = PASS; apenas avisos de normalização LF/CRLF
```

## Respostas diretas

1. **A Elite aguenta 1.000 profissionais cadastradas hoje?** O banco e as consultas, sim. A plataforma completa sob pico, não: carga, upload, pool e observabilidade ainda têm bloqueios.
2. **Quantos usuários simultâneos foram comprovadamente suportados?** 200 concluíram sem erro HTTP/rede, porém com P95 de 7,009 s e UX inaceitável. Dentro das metas, nenhum dos níveis solicitados; o teto está abaixo de 50 e ainda não foi medido.
3. **Em qual nível de concorrência a UX já ficou inaceitável?** Em 200 concorrentes, com P95 de 7,009 s. Os níveis 50 e 100 já estavam fora da meta de latência e foram classificados como `YELLOW`.
4. **Qual componente quebra/satura primeiro?** A instância Next/SSR por CPU e latência.
5. **O PostgreSQL foi o primeiro gargalo?** Não. As consultas críticas indexadas ficaram abaixo de 20 ms com 50 mil profissionais sintéticas.
6. **A aplicação Next/SSR foi o primeiro gargalo?** Sim. A saturação por instância apareceu antes de esgotamento do PostgreSQL.
7. **Precisamos aumentar plano/instância antes do lançamento?** `UNKNOWN`. Os planos não foram comprovados. O build remoto já foi corrigido; é obrigatório corrigir o pool e medir em Preview antes de decidir upgrade com evidência.
8. **O upload atual ainda duplica arquivo na memória?** Sim. O fluxo mantém cópias integrais em `formData`/`arrayBuffer`/`Buffer`; 50 uploads simulados de 10 MB elevaram o RSS em 998,99 MB.
9. **Precisamos mover vídeo para Bunny/Bunny Stream?** Sim, antes de liberar vídeo público em escala. Não é necessário para cadastro textual de 1.000 profissionais.
10. **O que é P0 antes do lançamento?** Dos oito itens da seção 22, o Build Command foi concluído. Permanecem pool, quotas/planos, observabilidade, carga segura em Preview, bootstrap/restore, mídia autenticada e homologação do fluxo de busca em Preview.
11. **O que pode ficar para a primeira semana?** Direct upload e worker/outbox, paginação Admin, métricas operacionais, rate limit de borda, telemetria de queries, Web Vitals e remoção do cache público do POST de tracking.
12. **O que pode ficar para o primeiro mês?** Bunny Storage/CDN e Bunny Stream antes de vídeo público, variantes de imagem, teste Admin balanceado, restore/failover periódico e otimização de CPU/SSR até atingir `GREEN`.
