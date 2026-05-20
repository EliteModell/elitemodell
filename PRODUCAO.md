# EliteModell — Guia de Produção

Referência operacional: scripts seguros, variáveis de ambiente, comandos corretos por ambiente e checklist de serviços externos.

---

## 1. Scripts de banco de dados

| Script | Comando | Quando usar |
|--------|---------|-------------|
| `db:generate` | `prisma generate` | Após alterar `schema.prisma` localmente |
| `db:validate` | `prisma validate` | CI — verificar schema sem tocar o banco |
| `db:push:dev` | `prisma db push` | **Só desenvolvimento local** — sincroniza schema sem migrations |
| `db:migrate:deploy` | `prisma migrate deploy` | **Staging/produção** — aplica migrations versionadas |
| `build` | `prisma generate && next build` | Build de produção — **não toca o banco** |

> **Regra de ouro:** `db push` **nunca** roda em CI ou produção.  
> O build de produção (`npm run build`) só executa `prisma generate` para gerar o client.

---

## 2. Variáveis de ambiente

### Obrigatórias em todos os ambientes

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Postgres com pgbouncer (pooled) — Prisma runtime |
| `DIRECT_URL` | Postgres direto (sem pooler) — migrations |
| `NEXTAUTH_SECRET` | Segredo JWT do NextAuth (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL base da aplicação (`https://elitemodell.com` em prod) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role — **somente server-side** |

### Rate limiting em produção (Upstash Redis)

| Variável | Descrição |
|----------|-----------|
| `UPSTASH_REDIS_REST_URL` | Endpoint REST do Redis Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token de autenticação |

Sem essas vars, o sistema usa fallback **in-memory** — funciona, mas perde estado entre reinicializações e réplicas do servidor.

Criar em: <https://console.upstash.com> → Redis → REST API

### CAPTCHA (quando ativar)

| Variável | Descrição |
|----------|-----------|
| `CAPTCHA_PROVIDER` | `none` (dev) · `turnstile` (recomendado) · `recaptcha` |
| `TURNSTILE_SECRET_KEY` | Secret do Cloudflare Turnstile |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key pública (frontend) |
| `RECAPTCHA_SECRET_KEY` | Secret do Google reCAPTCHA v3 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Site key pública (frontend) |

### Moderação / Antivírus (quando ativar)

| Variável | Valor |
|----------|-------|
| `MODERATION_ENABLED` | `true` para ativar checagem de imagens |
| `AV_ENABLED` | `true` para ativar varredura de vírus em uploads |

### Outros serviços

| Variável | Serviço |
|----------|---------|
| `PHONE_OTP_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` · `TWILIO_AUTH_TOKEN` · `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify |
| `OTP_DEV_LOG_CODE` | `false` em produção **obrigatoriamente** |
| `MERCADOPAGO_ACCESS_TOKEN` · `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Mercado Pago |
| `GOOGLE_MAPS_API_KEY` · `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Google Maps Platform |

---

## 3. Comandos por ambiente

### Desenvolvimento local

```bash
npm run dev              # servidor de desenvolvimento
npm run db:generate      # após alterar schema.prisma
npm run db:push:dev      # sincronizar schema com banco de dev (sem migration)
npm run test             # E2E (reutiliza servidor já em execução na 3000)
```

### Staging / Produção

```bash
npm run db:migrate:deploy   # aplica migrations (rodar antes do deploy)
npm run build               # build de produção (não toca o banco)
npm run start               # iniciar servidor de produção
```

### CI (GitHub Actions / Vercel)

```bash
npm run db:validate         # valida schema sem banco
npm run build               # build — usa prisma generate internamente
CI=true npm run test        # E2E — sobe dev server automaticamente, sem servidor pré-existente
```

---

## 4. Segurança do Storage (Supabase)

Todos os buckets têm RLS ativo. A política crítica adicionada na Fase 5:

```sql
-- Usuário só pode gerenciar arquivos em sua própria pasta
(storage.foldername(name))[1] = auth.uid()::text
```

Isso impede que um usuário autenticado sobrescreva arquivos de outro usuário.

| Bucket | Público | Política de acesso |
|--------|---------|-------------------|
| `profiles` | Sim | Leitura livre · Upload/delete restrito à pasta `{uid}/` |
| `properties` | Sim | Leitura livre · Upload/delete restrito à pasta `{uid}/` |
| `documentos` | **Não** | Sem leitura direta · Acesso via signed URL server-side |
| `stories` | Sim | Leitura livre · Upload/delete restrito à pasta `{uid}/` |

**Ação necessária:** rodar `supabase/storage-setup.sql` no SQL Editor do Supabase para aplicar as políticas atualizadas.

---

## 5. Rate Limiting

A função `enforceRateLimitAsync` em [src/lib/security.ts](src/lib/security.ts) delega para:

- **Redis (produção):** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` configurados → usa [src/lib/rate-limit.ts](src/lib/rate-limit.ts) com chamadas REST ao Upstash, sem SDK adicional.
- **In-memory (dev/fallback):** sem as vars Redis → funciona mas não é compartilhado entre réplicas.

Novos handlers devem usar a versão async:

```typescript
import { enforceRateLimitAsync, getClientIP } from "@/lib/security";

const ip = getClientIP(request);
const limited = await enforceRateLimitAsync(ip, 10, 60_000);
if (limited) return limited;
```

---

## 6. Logs

O módulo [src/lib/logger.ts](src/lib/logger.ts) scruba automaticamente antes de escrever:

- E-mails → `[email]`
- CPFs → `[cpf]`
- Telefones → `[phone]`
- Tokens Bearer → `Bearer [token]`
- Campos `password`, `senha`, `secret`, `key` em JSON → `[redacted]`

Usar `logger.info/warn/error/debug` em vez de `console.log` diretamente em código server-side.

---

## 7. Checklist — o que ainda depende de serviços externos

### Pendente de configuração

- [ ] **Upstash Redis** — criar instância em <https://console.upstash.com> e adicionar `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` na Vercel.
- [ ] **Cloudflare Turnstile** — criar widget em <https://dash.cloudflare.com> → Turnstile, adicionar site key e secret key, implementar widget no frontend de login/cadastro e definir `CAPTCHA_PROVIDER=turnstile`.
- [ ] **Supabase RLS** — rodar `supabase/storage-setup.sql` no SQL Editor para ativar políticas de pasta por `uid`.

### Pendente de integração (stubs prontos em `src/lib/`)

- [ ] **Moderação de imagens** — integrar provedor em [src/lib/moderation.ts](src/lib/moderation.ts) (`moderateImage`) e definir `MODERATION_ENABLED=true`.
- [ ] **Antivírus** — integrar VirusTotal ou ClamAV em [src/lib/moderation.ts](src/lib/moderation.ts) (`scanFileForVirus`) e definir `AV_ENABLED=true`.

### Configurações da Vercel

- [ ] Todas as variáveis listadas na seção 2 adicionadas em **Settings → Environment Variables**.
- [ ] `NEXTAUTH_URL` apontando para o domínio de produção.
- [ ] `OTP_DEV_LOG_CODE` explicitamente definida como `false`.

---

## 8. Playwright — rodar testes

```bash
# Local (servidor já deve estar rodando na 3000)
npm run test

# Apenas testes sem autenticação
npx playwright test --project=mock-session

# Apenas testes autenticados (requer TEST_USER_EMAIL e TEST_USER_PASSWORD no .env)
npx playwright test --project=authenticated

# Relatório HTML
npm run test:report

# CI (sobe dev server automaticamente via CI=true)
CI=true npm run test
```

---

*Fase 5 — Blindagem para produção. Gerado em 2026-05-19.*
