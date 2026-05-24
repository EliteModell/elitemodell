# RAIO-X DE PRÉ-PRODUÇÃO — ELITE MODEL
**Data:** 24/05/2026 | **Análise:** estática + build real | **Arquivos lidos:** 65+ | **Nenhum arquivo alterado**

---

## RESUMO EXECUTIVO

A plataforma Elite Model é um marketplace full-stack multi-role construído em Next.js 16.2.5, TypeScript, Prisma 5.22, Supabase, Asaas (pagamentos) e Persona (KYC). O código é sólido, a arquitetura é madura e os fluxos principais estão implementados.

**O build de produção passou com sucesso.** TypeScript zero erros. Schema Prisma válido. 60 rotas compiladas.

Porém, existem **bloqueadores reais** que impedem lançamento público seguro — nenhum deles é intransponível, mas todos precisam ser resolvidos antes de abrir para o público.

---

## RESULTADO DOS COMANDOS EXECUTADOS

```
✅ npx tsc --noEmit          → Exit 0 — ZERO erros TypeScript
✅ npx prisma validate        → Schema válido 🚀
✅ npm run build              → Exit 0 — Build passou em 34.6s — 60 rotas compiladas
❌ npm run lint               → Exit 1 — 3 ERROS, 8 warnings
```

### Saída do Build (resumo)
```
✔ Prisma Client v5.22.0 gerado
✔ Compilado em 34.6s
✔ TypeScript verificado em 33.7s
✔ 60 páginas estáticas geradas (3.5s)
✔ Build completo sem erros de código

⚠ AVISOS DO BUILD (não quebram, mas precisam de atenção):
  → middleware.ts está DEPRECATED — use proxy.ts (Next.js 16 breaking change)
  → Sentry: sentry.server.config.ts deve migrar para instrumentation.ts
  → Sentry: sentry.edge.config.ts deve migrar para instrumentation.ts
  → Sentry: sentry.client.config.ts deve virar instrumentation-client.ts
  → Sentry: sem arquivo global-error.js (erros React não reportados ao Sentry)
  → Sentry: sem arquivo instrumentation.ts (SDK não inicializado no servidor)
  → Sentry: disableLogger deprecated → use webpack.treeshake.removeDebugLogging
  → Sentry: automaticVercelMonitors deprecated → use webpack.automaticVercelMonitors
```

### Saída do ESLint
```
❌ src/app/buscar/page.tsx:207           — setState diretamente em useEffect (cascading renders)
❌ src/app/politica-conteudo/page.tsx:109 — caractere " não escapado (2x)
⚠  src/app/(auth)/admin/login/page.tsx   — 'router' declarado mas não usado
⚠  src/app/(dashboard)/admin/page.tsx    — 'totalUsers' declarado mas não usado
⚠  src/app/(dashboard)/dashboard/carteira/page.tsx — 'setAddAmount' não usado
⚠  src/app/(dashboard)/profissional/novo/page.tsx — 'FaceCapture' não usado
⚠  src/app/(dashboard)/profissional/novo/page.tsx — 'handleVerifMedia' não usado
⚠  src/app/api/wallet/route.ts           — '_req' não usado
⚠  src/components/payments/PixPaymentModal.tsx — <img> em vez de next/image
⚠  src/lib/account-routes.ts             — 'properties' não usado
```

---

## NOTA FINAL DE PRONTIDÃO

| Dimensão | Nota | Justificativa |
|---|---|---|
| Técnica geral | **76 / 100** | Build passa, TS zero erros, Prisma válido; middleware deprecated, Sentry mal configurado |
| Segurança | **58 / 100** | Auth sólida, CAPTCHA off, moderação stub, sem 2FA admin, legacy routes expostas |
| Pagamentos | **65 / 100** | PIX + cartão implementados, idempotência implementada; ambiente sandbox, cancelamento não confirmado |
| Fluxo de cadastro | **78 / 100** | Todos os fluxos presentes, validações robustas; painel anfitrião incompleto |
| Painel admin | **72 / 100** | Funcional e completo; bugs pontuais, sem 2FA, audit log faltando em 1 endpoint |
| Experiência mobile | **68 / 100** | Design mobile-first, BottomNav presente; erro setState na busca, sem testes em device real |
| **NOTA GERAL** | **🟡 69 / 100** | |

---

## INVENTÁRIO COMPLETO DE ROTAS (60 rotas compiladas)

### Rotas dinâmicas principais (server-rendered)
```
/admin, /admin/anfitrioes, /admin/auditoria, /admin/clientes, /admin/configuracoes
/admin/cupons, /admin/dashboard, /admin/denuncias, /admin/financeiro
/admin/funcionarios, /admin/imoveis, /admin/imoveis/[id], /admin/kyc
/admin/profissionais, /admin/reservas, /admin/suporte, /admin/usuarios
/anfitriao, /anfitriao/ganhos, /anfitriao/imoveis, /anfitriao/reservas
/dashboard, /dashboard/perfil, /dashboard/verificacao-idade
/imoveis/[id], /imoveis/[id]/reservar
/profissional, /profissional/agenda, /profissional/agendamentos
/profissional/fotos, /profissional/novo, /profissional/perfil, /profissional/planos
/profissionais/[slug]
/verificacao, /verificacao/acompanhante, /verificacao/anfitriao
/notifications, /painel/acompanhante, /painel/anfitriao, /painel/cliente
```

### ⚠️ Rotas legadas compiladas (potencialmente sem proteção de middleware)
```
/ad-api/v1/register          ← API legada, sem auth aparente
/app/consumer/login          ← Login legado
/app/consumer/register       ← Cadastro legado
/app/consumer/verify-phone   ← OTP legado
/cliente/dashboard           ← Dashboard legado (estático — sem req auth no middleware)
/modelo/dashboard            ← Dashboard legado (estático)
/modelo/login                ← Login legado
/cadastro-anfitriao          ← Cadastro legado
/cadastro-anfitriao/verificar-telefone
/cadastro-modelo             ← Cadastro legado
/cadastro-modelo/verificar-telefone
```

**Risco:** Essas rotas legadas estão compiladas e acessíveis. O `middleware.ts` protege `/dashboard`, `/admin`, `/profissional`, `/anfitriao`, mas **não protege** `/cliente/dashboard`, `/modelo/dashboard`, `/painel/*`. Rotas de `/painel/*` são server-rendered (ƒ) — se não tiverem `requireAuth()` interno, qualquer um acessa.

---

## BLOQUEADORES CRÍTICOS

| # | Bloqueador | Evidência | Risco Real |
|---|---|---|---|
| **B1** | `middleware.ts` DEPRECATED em Next.js 16 | Build avisa: *"The middleware file convention is deprecated. Please use proxy instead."* Existe `proxy.ts` na raiz mas está vazio/stub | Proteção de rotas pode parar de funcionar em updates futuros; comportamento atual pode diferir do esperado |
| **B2** | CAPTCHA desativado por padrão | `.env.example` linha 28: `CAPTCHA_PROVIDER="none"` · `captcha.ts` retorna `{ success: true }` em dev | Bots criam contas sem barreira, disparam SMS em massa via Twilio (custo + abuse) |
| **B3** | Moderação de conteúdo é stub | `moderation.ts`: `moderateImage()` e `scanFileForVirus()` retornam `{ safe: true }` hardcoded · `MODERATION_ENABLED=false` · `AV_ENABLED=false` | CSAM e malware passam direto no upload sem triagem automática — risco legal |
| **B4** | KYC configurado como LOCAL_MANUAL | `.env.example` linha 71: `KYC_PROVIDER="LOCAL_MANUAL"` | Sem verificação facial ativa; profissionais sem validação de identidade |
| **B5** | Asaas em sandbox por padrão | `.env.example` linha 60: `ASAAS_ENVIRONMENT="sandbox"` | Pagamentos não processam dinheiro real |
| **B6** | Rate limiting sem Redis | `rate-limit.ts`: sem `UPSTASH_REDIS_REST_URL/TOKEN` → fallback in-memory | Em múltiplas instâncias Vercel cada pod tem contador separado — brute force bypassa proteção |
| **B7** | Sentry não inicializado no servidor | Build avisa: *"Could not find a Next.js instrumentation file"* | Erros de servidor em produção não são capturados pelo Sentry — sem monitoramento real |
| **B8** | Build de produção nunca tinha sido rodado antes desta análise | `.next/` não tinha `BUILD_ID` antes desta sessão | Erros de deploy seriam descobertos na primeira publicação |
| **B9** | 3 erros ESLint que falham CI/CD | `setState em useEffect` (busca) + `unescaped entities` (política de conteúdo) | Pipeline de CI/CD padrão falha em `npm run lint` |

---

## PENDÊNCIAS IMPORTANTES (alto impacto, mas não bloqueam 100%)

| # | Pendência | Evidência | Impacto |
|---|---|---|---|
| **P1** | Rotas legadas sem proteção confirmada | `/cliente/dashboard`, `/modelo/dashboard`, `/painel/*` compiladas sem middleware claro | Usuário não autenticado pode acessar |
| **P2** | Sentry configuração incompleta (múltiplos arquivos legados) | 4 avisos de deprecação do Sentry no build | Erros em produção sem rastreamento adequado |
| **P3** | `proxy.ts` existe mas vazio/sem conteúdo equivalente ao `middleware.ts` | Arquivo `proxy.ts` na raiz do projeto | Proteção de rotas não migrada para novo padrão Next.js 16 |
| **P4** | Inconsistência legal: 30 dias vs 5 anos de retenção | `terms/page.tsx` e `privacy/page.tsx` prometem deleção em 30 dias; `users/me/delete/route.ts` mantém pagamentos por 5 anos | Contradição com LGPD Art. 18 |
| **P5** | Emails institucionais não verificados | `terms/page.tsx` cita `legal@elitemodell.com.br`; `privacy/page.tsx` cita `privacy@elitemodell.com.br` | Denúncias e solicitações LGPD sem resposta |
| **P6** | Draft de imóvel em localStorage | `anfitriao/imoveis/novo/page.tsx` salva rascunho em localStorage | Outro usuário do mesmo browser lê dados do formulário |
| **P7** | Sem `global-error.js` para erros React | Build avisa ausência do arquivo | Erros de rendering no frontend não capturados pelo Sentry |
| **P8** | `ad-api/v1/register` acessível publicamente | Compilado como estático sem auth | API legada potencialmente explorável |
| **P9** | `FaceCapture` e `handleVerifMedia` declarados mas não usados | ESLint warnings em `profissional/novo/page.tsx` | Indica feature de verificação facial via câmera incompleta ou abandonada |
| **P10** | Sem DPO (Data Protection Officer) definido | Política de privacidade não menciona encarregado de dados | Obrigação LGPD Art. 41 não cumprida formalmente |

---

## PENDÊNCIAS NÃO CRÍTICAS (podem ficar pós-lançamento beta)

- Sem compressão/resize automático de imagens antes do upload.
- Sem exportação financeira (CSV/PDF) no painel admin.
- Sem paginação além de 80 itens no financeiro admin.
- Sentry deprecations (disableLogger, automaticVercelMonitors) precisam de update de config.
- Push notifications não implementadas.
- Toggle manual online/offline para profissional não encontrado.
- 2FA para contas admin (recomendado, não obrigatório no momento).
- Confirmação dupla para rejeitar usuário no admin.
- Audit log faltando em `PATCH /api/admin/properties/[id]/status`.
- HSTS header (`Strict-Transport-Security`) não configurado no `next.config.ts`.

---

## ANÁLISE MÓDULO A MÓDULO

---

### 1. AMBIENTE E CONFIGURAÇÃO

**Status: 🟡 PARCIAL**

| Item | Status | Detalhe |
|---|---|---|
| TypeScript clean | ✅ | Exit 0 |
| Prisma schema válido | ✅ | Validado |
| ESLint | ❌ | 3 erros, 8 warnings |
| Build produção | ✅ | Passou em 34.6s (rodado nesta sessão) |
| `.env.example` atualizado | ✅ | 84 linhas, bem documentado |
| `NEXT_PUBLIC_` usadas corretamente | ✅ | Chaves sensíveis são server-only |
| Headers de segurança | ✅ | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| HSTS header | ❌ | `Strict-Transport-Security` ausente |
| `middleware.ts` deprecated | ❌ | Next.js 16 exige `proxy.ts` |
| Sentry inicializado | ❌ | Sem `instrumentation.ts` — SDK não inicializa no servidor |
| Sentry `global-error.js` | ❌ | Erros React não reportados |
| Vercel config | ✅ | `.vercel/` presente |
| Variáveis obrigatórias para produção | ⚠️ | Ver lista completa abaixo |

**Variáveis obrigatórias na Vercel antes do deploy:**
```
DATABASE_URL, DIRECT_URL
NEXTAUTH_URL=https://seudominio.com  ← NÃO localhost
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ASAAS_ENVIRONMENT=production
PERSONA_API_KEY, PERSONA_TEMPLATE_ID, PERSONA_WEBHOOK_SECRET, KYC_PROVIDER=PERSONA
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
CAPTCHA_PROVIDER=turnstile, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY
GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
OTP_DEV_LOG_CODE=false  ← CRÍTICO: nunca true em prod
MODERATION_ENABLED=true  ← quando integrar provedor
AV_ENABLED=true           ← quando integrar provedor
```

---

### 2. AUTENTICAÇÃO E LOGIN

**Status: ✅ BOM**

| Fluxo | Status | Detalhe |
|---|---|---|
| Login email/senha | ✅ | Supabase Auth credentials |
| Login por OTP (SMS) | ✅ | Twilio Verify + `phone-otp-token` provider |
| Login OTP WhatsApp | ✅ | Canal alternativo no Twilio |
| Recuperação de senha | ✅ | Via Supabase Auth (e-mail) |
| Logout | ✅ | `/saida` |
| Redirecionamento pós-login | ✅ | `postLoginPathFromUser()` por tipo de conta |
| Proteção de rotas | ✅ | `middleware.ts` + `requireAdmin()` em cada Server Component |
| Bloqueio de usuário banido | ✅ | `blocked === true` → JWT retorna null → sessão inválida |
| Rate limit em auth | ✅ | 20 tentativas / 15 min |
| OTP timing-safe comparison | ✅ | `crypto.timingSafeEqual()` implementado |
| Hash de OTP (nunca plain text) | ✅ | HMAC-SHA256 no banco |
| Expiração de OTP | ✅ | 5 minutos |
| Role ADMIN bloqueado a não-admins | ✅ | `middleware.ts` linha 51-54 |
| Bloqueio entre roles | ✅ | `requireCompanionPanel()`, `requireHostPanel()`, `requireAdmin()` |
| 2FA para admin | ❌ | Não implementado |
| `middleware.ts` deprecated | ⚠️ | Funciona agora mas precisa migrar para `proxy.ts` |

**Fluxo de roteamento pós-login (confirmado no código):**
```
professional.status === "ACTIVE"      → /profissional
!professional && isModelAccount        → /profissional/novo
hostStatus === "APROVADO"             → /anfitriao
hostStatus === "PENDENTE_APROVACAO"   → /verificacao/anfitriao
default                               → /dashboard
```

---

### 3. CADASTRO DE USUÁRIOS

**Status: 🟡 PARCIAL**

| Cadastro | Status | Detalhe |
|---|---|---|
| Cadastro cliente | ✅ | Completo com consentimentos LGPD/Termos |
| Cadastro profissional | ✅ | 78+ campos, validação Zod extensiva |
| Cadastro anfitrião | ✅ | Formulário completo |
| Fluxo incompleto/rascunho | ✅ | `status: DRAFT` no banco |
| Continuação de cadastro | ✅ | `/completar-cadastro` |
| Validação de idade (18+) | ✅ | `age-validation.ts` com UTC-safe |
| Consentimentos obrigatórios | ✅ | `lgpdConsent + termsConsent` bloqueiam login |
| Documentos obrigatórios (profissional) | ✅ | docFrenteUrl + docVersoUrl obrigatórios |
| Verificação facial obrigatória | ✅ | `verificationUrl` ou `kycSessionId` obrigatório |
| Proteção contra autopromote | ✅ | `isProtectedAccount` verificado no register |
| Profissional só ACTIVE após aprovação admin | ✅ | Status inicial: `PENDING_REVIEW` |
| Anfitrião só ativo após aprovação | ✅ | Requer revisão admin |
| Imóvel só exibido após aprovação | ✅ | `status: PENDING_REVIEW` → admin aprova |
| Draft imóvel em localStorage | ❌ | Risco de leitura por outro usuário do browser |
| CAPTCHA no cadastro | ❌ | `CAPTCHA_PROVIDER="none"` por padrão |

---

### 4. VERIFICAÇÃO FACIAL / KYC

**Status: 🟠 PENDENTE CONFIGURAÇÃO EXTERNA**

| Item | Status | Detalhe |
|---|---|---|
| Integração Persona | ✅ | `lib/persona.ts` completo, 218 linhas |
| Criação de Inquiry | ✅ | `POST /api/kyc/request` — two-phase seguro |
| Webhook com HMAC | ✅ | `verifyPersonaWebhook()` timing-safe |
| Idempotência de webhook | ✅ | `WebhookEvent` table com `@@unique([provider, eventId])` |
| Status KYC no banco | ✅ | 5 estados: NOT_STARTED → PENDING → APPROVED/REJECTED/KYC_MANUAL_PENDENTE |
| Admin revisa KYC manual | ✅ | `/admin/kyc` com approve/reject + audit log |
| Usuário reprovado não aparece | ✅ | Filtro por status na busca pública |
| Bloqueio de menores | ✅ | birthDate obrigatório + `isAgeOfMajority()` |
| KYC ativo em produção | ❌ | `KYC_PROVIDER="LOCAL_MANUAL"` por padrão — precisa mudar para `PERSONA` |
| PERSONA_API_KEY configurada | ❌ | Vazia no exemplo |
| PERSONA_TEMPLATE_ID configurado | ❌ | Vazio no exemplo |
| PERSONA_WEBHOOK_SECRET configurado | ❌ | Vazio no exemplo |

**Classificação: Pendente de configuração externa — código pronto, serviço não ativado.**

---

### 5. BUSCA PÚBLICA E LISTAGEM

**Status: 🟡 PARCIAL**

| Item | Status | Detalhe |
|---|---|---|
| Página `/buscar` | ✅ | Implementada, responsiva |
| Abas Mulheres / Trans / Homens | ✅ | `SUB_TO_CATEGORY` mapeado |
| Filtro por cidade | ✅ | Com normalização de diacríticos |
| Filtro por preço | ✅ | Quick filter "Até R$300" |
| Filtro online / avaliações / local / fotos | ✅ | 5 quick filters |
| Ordenação (7 opções) | ✅ | Relevância, distância, online, rating, preço asc/desc, recentes |
| Stories/shorts | ✅ | `StoryGroup` com vídeos |
| Estado sem resultados | ✅ | Tratado na UI |
| Paginação | ✅ | 12/página, máx 24 |
| Somente perfis ACTIVE | ✅ | API filtra `status: "ACTIVE"` |
| Endereço privado não vaza | ✅ | API retorna apenas cidade/bairro |
| Cache de API | ✅ | `s-maxage=30, stale-while-revalidate=120` |
| Aba imóveis | ✅ | `MainTab` inclui "imoveis" |
| Erro ESLint (setState em useEffect) | ❌ | `buscar/page.tsx:207` — pode causar render loop no mobile |

---

### 6. PERFIL PÚBLICO DA PROFISSIONAL

**Status: ✅ BOM**

| Item | Status | Detalhe |
|---|---|---|
| Página `/profissionais/[slug]` | ✅ | Client component com API fetch |
| Galeria fotos + vídeos | ✅ | `GaleriaFiltro` com tabs todas/fotos/videos |
| Preços completos | ✅ | Hora, 30min, 2h, pernoite, webcam |
| Serviços e atendimento | ✅ | `attendanceTypes`, `services`, `fetishes` |
| Avaliações | ✅ | Rating + comentários |
| Contato (WhatsApp/Instagram) | ✅ | Links no perfil |
| Perfil não ACTIVE retorna 404 | ✅ | Não vaza dado de perfis pendentes |
| `userId` nunca exposto | ✅ | `delete publicProfessional.userId` no endpoint |
| CPF/documentos nunca expostos | ✅ | Não incluídos no SELECT |
| Denúncia de perfil | ✅ | `/api/reports` com deduplicação |
| Cache inteligente | ✅ | `public` para ACTIVE, `no-store` para DRAFT |

---

### 7. PAINEL DA PROFISSIONAL

**Status: 🟡 PARCIAL**

| Item | Status | Detalhe |
|---|---|---|
| Dashboard | ✅ | Redireciona para `/profissional` |
| Edição de perfil | ✅ | Formulário completo com MoneyField |
| Upload de fotos | ✅ | Drag/reorder, marcação de capa |
| Stories/shorts | ✅ | `/dashboard/shots` para profissionais ACTIVE |
| Agenda / disponibilidade | ✅ | `/profissional/agenda` e `/profissional/agendamentos` |
| KYC / verificação | ✅ | Fluxo via `/verificacao` |
| Planos | ✅ | `/profissional/planos` |
| Exclusão de conta | ✅ | Com confirmação e anonimização LGPD |
| Toggle online/offline | ❌ | Não encontrado controle explícito |
| Notificações push | ❌ | Não implementado |
| Limite máximo de fotos | ❌ | Sem controle de quantidade |
| `FaceCapture` / `handleVerifMedia` | ⚠️ | Definidos mas nunca usados — feature incompleta? |

---

### 8. PAINEL DO ANFITRIÃO E IMÓVEIS

**Status: 🟠 PAINEL INCOMPLETO**

| Item | Status | Detalhe |
|---|---|---|
| Formulário de cadastro de imóvel | ✅ | Completo com fotos, localização, preço, regras |
| API `POST /api/properties` | ✅ | Completa com validação Zod |
| API `GET/PUT /api/properties/[id]` | ✅ | Completa |
| Status pendente/aprovado/reprovado | ✅ | `PropertyStatus` enum completo |
| Aprovação pelo admin | ✅ | `/admin/imoveis/[id]` com ações e audit log |
| Imóvel só visto por profissionais aprovados | ✅ | Validação `isApprovedProfessional()` |
| Imóvel não aparece sem aprovação | ✅ | Filtro `status: "ACTIVE"` |
| **Lista de imóveis no painel** | ❌ | `anfitriao/imoveis/page.tsx` é placeholder sem dados |
| Draft em localStorage (risco) | ❌ | `anfitriao/imoveis/novo/page.tsx` |

---

### 9. PAINEL DO CLIENTE

**Status: ✅ BOM**

| Item | Status | Detalhe |
|---|---|---|
| Dashboard com roteamento inteligente | ✅ | Redireciona por tipo de conta |
| Busca de acompanhantes | ✅ | Link para `/buscar` |
| Favoritos | ✅ | `/dashboard/favoritos` + API |
| Reservas | ✅ | `/dashboard/reservas` |
| Avaliações | ✅ | `/dashboard/avaliacoes` |
| Mensagens | ✅ | `/dashboard/mensagens` |
| Planos/assinatura | ✅ | `/dashboard/planos` |
| Carteira de créditos | ✅ | `/dashboard/carteira` |
| Verificação de idade | ✅ | `/dashboard/verificacao-idade` |
| Configurações + segurança | ✅ | `/dashboard/configuracoes` |
| Exclusão de conta | ✅ | `/dashboard/configuracoes/excluir-conta` |
| Navegação mobile | ✅ | `BottomNav` component |

---

### 10. PAINEL ADMINISTRATIVO

**Status: 🟡 BOM**

| Área | Status | Detalhe |
|---|---|---|
| Dashboard com métricas | ✅ | Usuários, profissionais, propriedades, KYC, receita |
| Gestão de profissionais | ✅ | Aprovar/reprovar/suspender/bloquear com audit log |
| Gestão de anfitriões | ✅ | Approve/reject/suspend em transação atômica |
| Gestão de imóveis | ✅ | Detalhes + fotos + ações com validação do anfitrião |
| Gestão de clientes | ✅ | `/admin/clientes` |
| KYC manual | ✅ | Revisar e aprovar/rejeitar com audit log |
| Denúncias | ✅ | `/admin/denuncias` |
| Financeiro | ✅ | Receita do mês, pendentes, falhos, lista de pagamentos |
| Cupons | ✅ | `/admin/cupons` |
| Funcionários/permissões | ✅ | 6 roles de admin com permissões granulares |
| Auditoria/logs | ✅ | `/admin/auditoria` com 12 tipos de ação |
| Configurações | ✅ | `/admin/configuracoes` |
| Rotas `/admin/*` protegidas | ✅ | Middleware + `requireAdmin()` em cada página |
| Audit log em `PATCH /api/admin/properties/[id]/status` | ❌ | Ação sem registro de auditoria |
| 2FA para contas admin | ❌ | Não implementado |
| Sem confirmação dupla para rejeição | ⚠️ | 1 clique nega usuário permanentemente |

---

### 11. PAGAMENTOS

**Status: 🟡 PARCIAL — código completo, ambiente sandbox**

#### PIX (Asaas)
| Item | Status | Detalhe |
|---|---|---|
| Geração de cobrança PIX | ✅ | `POST /api/payments/pix` |
| QR Code (imagem base64) | ✅ | `pixQrCodeBase64` retornado |
| Código copia e cola | ✅ | `pixCode` retornado |
| Expiração (próximo dia útil) | ✅ | `dueDate` configurado |
| Webhook confirma automaticamente | ✅ | `POST /api/payments/asaas/webhook` |
| Status PENDING → PAID | ✅ | Em `asaas-webhook-handler.ts` |
| Idempotência de webhook | ✅ | `WebhookEvent` table com `@@unique([provider, eventId])` |
| PIX vencido/cancelado tratado | ✅ | OVERDUE/DELETED mapeados |
| Plano premium liberado após pagamento | ✅ | `premiumUntil` e `credits` atualizados |
| **Ambiente sandbox** | ❌ | `ASAAS_ENVIRONMENT="sandbox"` por padrão |

#### Cartão de Crédito (Asaas)
| Item | Status | Detalhe |
|---|---|---|
| Pagamento com cartão | ✅ | `POST /api/payments/card` |
| Dados do cartão nunca persistidos | ✅ | PCI-DSS compliant |
| Tokenização pelo Asaas | ✅ | Asaas gerencia o token |
| Cartão recusado tratado | ✅ | Status FAILED mapeado |
| Aprovação imediata (sem esperar webhook) | ✅ | Se Asaas retornar CONFIRMED |
| **Ambiente sandbox** | ❌ | Mesmo problema do PIX |

#### Assinaturas
| Item | Status | Detalhe |
|---|---|---|
| Plano Elite Premium mensal | ✅ | R$49,90/mês, `premiumUntil` atualizado |
| Cancelamento de assinatura | ⚠️ | Endpoint não encontrado |
| Expiração automática | ⚠️ | `premiumUntil` é data fixa — sem cron de expiração |
| Bloqueio por inadimplência | ⚠️ | Não encontrada lógica automática |

**Classificação: Parcial — código pronto, ambiente sandbox, cancelamento não confirmado.**

---

### 12. NOTIFICAÇÕES

**Status: 🟡 PARCIAL**

| Canal | Status | Detalhe |
|---|---|---|
| SMS (OTP) | ✅ | Twilio Verify |
| WhatsApp (OTP) | ✅ | Twilio WhatsApp |
| E-mail transacional | ✅ | `/api/auth/send-email` presente |
| Confirmação de cadastro | ✅ | Via Supabase Auth |
| Recuperação de senha | ✅ | Via Supabase Auth |
| Push notification | ❌ | Não encontrado |
| Notificações internas no painel | ⚠️ | `/notifications` compilada como rota dinâmica mas não confirmado conteúdo |
| E-mail de aprovação/reprovação | ⚠️ | Audit log existe, e-mail ao usuário não confirmado |

---

### 13. UPLOADS, IMAGENS E VÍDEOS

**Status: 🟡 BOM (moderação pendente)**

| Item | Status | Detalhe |
|---|---|---|
| Validação de MIME type (whitelist) | ✅ | JPEG, PNG, WebP, PDF, MP4, WebM, MOV |
| Validação de assinatura binária (magic bytes) | ✅ | FF D8 FF (JPEG), PNG, WEBP, PDF, MP4, WebM |
| Path traversal bloqueado | ✅ | `normalizeFolder()` com regex `[a-zA-Z0-9_-]` |
| Rate limit de upload | ✅ | 40 uploads / 15 min / usuário+IP |
| Documentos privados | ✅ | Bucket `documentos` sem leitura direta |
| RLS no Supabase Storage | ✅ | `storage-setup.sql` configurado |
| Stories somente para profissionais ACTIVE | ✅ | Validação de status no endpoint |
| Rollback se moderação reprovar | ✅ | `supabase.storage.remove([path])` após moderação negativa |
| **Antivírus (STUB)** | ❌ | `scanFileForVirus()` retorna `{ safe: true }` hardcoded |
| **Moderação de imagem (STUB)** | ❌ | `moderateImage()` retorna `{ safe: true }` hardcoded |
| Compressão/resize | ❌ | Sem processamento de imagem |

---

### 14. SEGURANÇA

**Status: 🟠 PARCIAL**

| Item | Status | Detalhe |
|---|---|---|
| Proteção de rotas por role | ✅ | Middleware + Server Components |
| JWT enriquecido + validado | ✅ | Role, status, blocked verificados em cada request |
| Timing-safe OTP comparison | ✅ | `crypto.timingSafeEqual()` |
| Hash de OTP (HMAC-SHA256) | ✅ | Nunca armazena código em plain text |
| Supabase RLS (storage) | ✅ | Políticas por bucket |
| Validação server-side (Zod) | ✅ | Em todos os endpoints críticos |
| CSRF | ✅ | NextAuth built-in + Server Actions (SameSite) |
| Dados sensíveis no frontend | ✅ | Service role key e API keys são server-only |
| Logs com scrubbing de PII | ✅ | `logger.ts` redacta email, CPF, telefone, tokens |
| Proteção contra autopromote | ✅ | `isProtectedAccount` no register |
| Headers de segurança | ✅ | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| HSTS | ❌ | `Strict-Transport-Security` ausente |
| CAPTCHA | ❌ | `CAPTCHA_PROVIDER="none"` por padrão |
| Redis rate limiting | ❌ | Sem Upstash configurado = in-memory apenas |
| Moderação de conteúdo | ❌ | Stub — `{ safe: true }` hardcoded |
| Antivírus em upload | ❌ | Stub — `{ safe: true }` hardcoded |
| 2FA para admin | ❌ | Não implementado |
| Proteção de rotas legadas | ⚠️ | `/cliente/dashboard`, `/modelo/dashboard`, `/painel/*` sem middleware confirmado |

---

### 15. BANCO DE DADOS

**Status: ✅ BOM**

| Item | Status | Detalhe |
|---|---|---|
| Schema válido | ✅ | Prisma validate passa |
| Modelos completos (25+) | ✅ | User, Professional, Property, Booking, Payment, WebhookEvent, AuditLog... |
| `WebhookEvent` para idempotência | ✅ | `@@unique([provider, eventId])` — garante processamento único |
| Enums de status | ✅ | ProfessionalStatus, PropertyStatus, PaymentStatus, ClientStatus |
| Índices para busca | ✅ | `(status, featured, rating)`, `(status, city)`, `(phone, accountType, createdAt)` |
| Cascade deletes | ✅ | Integridade referencial garantida |
| `DIRECT_URL` para migrations | ✅ | Separado do `DATABASE_URL` com pgbouncer |
| Migrations recentes | ✅ | `20260522_pre_production_safety_fixes` + `20260524_professional_body_fields` |
| `mockProfiles.ts` em lib/ | ⚠️ | Arquivo de perfis mock — verificar se não é usado em produção |

---

### 16. RESPONSIVIDADE E MOBILE

**Status: 🟡 BOM (sem evidência de testes reais)**

| Item | Status | Detalhe |
|---|---|---|
| Viewport mobile configurado | ✅ | Playwright config: 390×844 (iPhone) |
| TailwindCSS mobile-first | ✅ | Breakpoints responsive |
| `BottomNav` mobile | ✅ | Componente específico para mobile |
| `MoneyField` com `inputMode="decimal"` | ✅ | Teclado numérico no mobile |
| Filtros horizontais com scroll | ✅ | `overflow-x: auto` nos quick filters |
| Máscaras de input | ✅ | Telefone BR, valores monetários |
| Modais | ✅ | `FiltersModal` responsivo |
| **Erro setState em useEffect (busca)** | ❌ | Pode causar render loop em mobile iOS |
| Testes em device físico | ❌ | Não documentados |

---

### 17. LEGAL, TERMOS E PRIVACIDADE

**Status: 🟡 BOM (com inconsistência a corrigir)**

| Item | Status | Detalhe |
|---|---|---|
| Termos de Uso | ✅ | PT/EN, atualizado maio 2026 |
| Política de Privacidade | ✅ | LGPD-compliant, PT/EN |
| Política de Conteúdo | ✅ | Inclui proibição de menores e CSAM |
| Consentimento de idade (18+) | ✅ | `birthDate` obrigatório + `isAgeOfMajority()` |
| Consentimentos LGPD salvos no banco | ✅ | `lgpdConsent`, `termsConsent`, `consentDate` |
| AgeGate para conteúdo | ✅ | Componente `AgeGate` presente |
| Exclusão de conta (LGPD Art. 18) | ✅ | Anonimização + confirmação de texto |
| Pagamentos retidos por 5 anos | ✅ | Obrigação fiscal — correto |
| DPO definido | ❌ | LGPD Art. 41 — não mencionado |
| **Inconsistência 30 dias vs 5 anos** | ❌ | Termos dizem 30 dias; código retém pagamentos por 5 anos |
| Emails institucionais funcionais | ❌ | `legal@`, `privacy@` — existência não verificada |
| Erro ESLint na página de política | ❌ | Caractere `"` não escapado em `politica-conteudo/page.tsx` |

---

### 18. TESTES

**Status: 🟡 PARCIAL**

| Tipo | Status | Detalhe |
|---|---|---|
| TypeScript | ✅ | Zero erros |
| Prisma validate | ✅ | Schema válido |
| ESLint | ❌ | 3 erros, 8 warnings |
| Build produção | ✅ | Passou nesta sessão |
| E2E Playwright | ⚠️ | Configurado com 4 suites; requer servidor rodando e credenciais de teste |
| Testes unitários | ❌ | Não encontrados |
| Testes em device físico | ❌ | Não documentados |

---

## CHECKLIST FINAL DE PRODUÇÃO

| Área | Status | Pronto? | Risco | Prioridade |
|---|---|---|---|---|
| Autenticação | 🟢 Implementado | ✅ Sim | Sem 2FA admin | Alta |
| Cadastro cliente | 🟢 Implementado | ✅ Sim | CAPTCHA off | Alta |
| Cadastro profissional | 🟡 Parcial | ⚠️ Parcial | KYC inativo, CAPTCHA off | Crítica |
| Cadastro anfitrião | 🟠 Parcial | ❌ Não | Painel sem lista de imóveis | Alta |
| Aprovação admin | 🟢 Implementado | ✅ Sim | Sem 2FA, sem confirm dupla | Alta |
| Busca pública | 🟡 Parcial | ⚠️ Parcial | Erro ESLint setState | Alta |
| Perfil público | 🟢 Implementado | ✅ Sim | Baixo | Média |
| Painel cliente | 🟢 Implementado | ✅ Sim | Baixo | Média |
| Painel profissional | 🟡 Parcial | ⚠️ Parcial | Sem toggle online, sem notificações push | Média |
| Painel anfitrião | 🔴 Incompleto | ❌ Não | Lista de imóveis é placeholder | Alta |
| Painel admin | 🟡 Bom | ⚠️ Parcial | Falta audit em 1 endpoint, sem 2FA | Alta |
| Pagamento PIX | 🟡 Parcial | ⚠️ Parcial | Sandbox, cancelamento não confirmado | Crítica |
| Pagamento Cartão | 🟡 Parcial | ⚠️ Parcial | Sandbox | Crítica |
| Webhooks | 🟢 Implementado | ✅ Sim | Idempotência implementada via WebhookEvent | Alta |
| Uploads | 🟡 Bom | ⚠️ Parcial | Moderação e AV são stubs | Alta |
| KYC / Persona | 🟠 Pendente | ❌ Não | LOCAL_MANUAL, credenciais vazias | Crítica |
| Notificações | 🟡 Parcial | ⚠️ Parcial | SMS OK, push/e-mail transacional parcial | Média |
| Segurança | 🟡 Parcial | ⚠️ Parcial | Sem CAPTCHA, sem Redis, sem moderação, sem HSTS | Alta |
| Mobile | 🟡 Parcial | ⚠️ Parcial | Erro ESLint busca, sem testes reais | Alta |
| Legal/LGPD | 🟡 Bom | ⚠️ Parcial | Inconsistência 30d/5a, sem DPO | Média |
| Deploy/Vercel | 🟡 Parcial | ⚠️ Parcial | Build passou; middleware deprecated; Sentry sem instrumentation.ts | Alta |
| Banco/Supabase | 🟢 Implementado | ✅ Sim | Migrations prontas, índices ok | Alta |
| Rotas legadas | 🟠 Risco | ❌ Não | `/cliente/dashboard`, `/modelo/dashboard` etc. acessíveis | Alta |

---

## RESPOSTAS DIRETAS

### Pode ir ao ar HOJE?
**Não.** Pagamentos estão em sandbox, KYC não está ativo, CAPTCHA não está configurado, moderação de conteúdo é stub e rotas legadas podem estar expostas sem autenticação.

### Pode ir ao ar em MODO BETA FECHADO?
**Sim, com exatamente estas ações:**

1. Rodar `supabase/storage-setup.sql` no banco Supabase (RLS dos buckets).
2. Configurar todas as variáveis de ambiente na Vercel (ver lista na seção 1).
3. Mudar `ASAAS_ENVIRONMENT=production` e testar PIX com valor mínimo real.
4. Mudar `KYC_PROVIDER=PERSONA` com template e API key reais do Persona.
5. Configurar `UPSTASH_REDIS_REST_URL/TOKEN` para rate limiting real.
6. Configurar `CAPTCHA_PROVIDER=turnstile` com chaves do Cloudflare.
7. Corrigir `middleware.ts` → `proxy.ts` (ou confirmar que o proxy.ts existente cobre todas as rotas).
8. Verificar e proteger rotas legadas (`/cliente/dashboard`, `/modelo/dashboard`, `/painel/*`).
9. Criar `instrumentation.ts` para Sentry (ou suprimir os warnings aceitos).
10. Criar emails institucionais (`legal@`, `privacy@`, `suporte@elitemodell.com.br`).

### O que impede o lançamento público?
1. **Moderação de conteúdo não existe** — qualquer imagem/vídeo passa sem triagem.
2. **KYC não está ativo** — profissionais sem verificação de identidade real.
3. **CAPTCHA desabilitado** — bots e cadastros massivos sem barreira.
4. **Pagamentos em sandbox** — dinheiro real não é processado.
5. **Lista de imóveis do anfitrião não funciona** — experiência incompleta para o anfitrião.
6. **Sentry sem instrumentation.ts** — erros em produção passam invisíveis.
7. **middleware.ts deprecated** — proteção de rotas não segue o padrão Next.js 16.

### Os 10 testes obrigatórios antes de publicar

1. **`npm run lint`** — deve passar sem erros (corrigir os 3 atuais antes de deploy).
2. **Cadastro completo de profissional** — do zero até aparecer na busca pública após aprovação admin.
3. **PIX real** — gerar QR Code, pagar com PIX real (R$1,00), confirmar status PAID no admin.
4. **Webhook PIX duplicado** — disparar o mesmo evento duas vezes e confirmar que não processa crédito duas vezes (WebhookEvent deve bloquear).
5. **KYC Persona** — passar pelo fluxo completo de verificação facial (sandbox do Persona), confirmar webhook aprovando profissional.
6. **Admin: aprovar e reprovar** — aprovar profissional e imóvel, confirmar que aparecem na busca; reprovar e confirmar que somem.
7. **Bloqueio de role** — acessar `/admin` como cliente e `/profissional` como anfitrião, confirmar redirecionamento correto.
8. **Rotas legadas** — acessar `/cliente/dashboard`, `/modelo/dashboard` e `/painel/acompanhante` sem autenticação, confirmar que redirecionam para login.
9. **Upload de documento** — fazer upload de doc e confirmar que a URL direta retorna 403 (bucket privado).
10. **Mobile real** — cadastro, busca e contato em iPhone físico e Android físico, sem erros de layout ou render loop.

---

## RECOMENDAÇÃO FINAL

**⚠️ PARCIALMENTE PRONTO — Beta fechado possível com 1 semana de trabalho; lançamento público requer 2 a 3 semanas adicionais**

A plataforma tem arquitetura sólida, código TypeScript limpo (zero erros), build de produção funcionando, webhook idempotência implementada, LGPD com exclusão de conta real e painel admin completo. É um trabalho de alta qualidade técnica.

O que falta são principalmente:
- **Configurações de serviços externos** (Redis, Asaas prod, Persona, CAPTCHA) → 1 a 2 dias
- **Migração de `middleware.ts` para `proxy.ts`** → algumas horas
- **Implementação real de moderação/AV** → 3 a 5 dias
- **Lista de imóveis do anfitrião** → 1 a 2 dias
- **Sentry com `instrumentation.ts`** → algumas horas
- **Proteção e/ou remoção de rotas legadas** → 1 dia
- **Correção dos 3 erros ESLint** → 1 hora

---

*Relatório gerado em 24/05/2026. Build real executado: npm run build → Exit 0. 60 rotas compiladas. Nenhum arquivo de código-fonte foi alterado.*
