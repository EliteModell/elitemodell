# ELITEMODELL — BRIEF FACTUAL DO PRODUTO

Data do raio-x: 2026-06-23.
Base usada: código, schema Prisma, configs versionadas, README/docs do repositório e auditoria read-only agregada do banco via `scripts/audit-production-public-state.mjs`. Não foram usados dados pessoais nem valores secretos de `.env`.

## 1. O QUE É

A Elite Modell é uma plataforma adulta/premium que conecta clientes, acompanhantes/profissionais e anfitriões de locais reservados. O usuário cliente busca perfis e quartos, a profissional cria e gerencia seu anúncio, e o anfitrião cadastra imóveis/locais para uso reservado.

## 2. MODELO DE RECEITA

### Cliente Premium

Fonte: `src/lib/client-plans.ts`, `src/app/api/payments/pix/route.ts`, `src/app/api/payments/card/route.ts`, `src/app/api/premium/checkout/pix/route.ts`.

| Plano | Preço real | Duração | O que libera |
|---|---:|---:|---|
| 24 horas | R$ 4,99 | 24 horas | Acesso Premium do cliente |
| 30 dias | R$ 39,90 | 30 dias | Acesso Premium do cliente |
| 30 dias — primeira compra | R$ 10,99 | 30 dias | Preço promocional de primeira compra |
| 90 dias | R$ 79,90 | 90 dias | Acesso Premium do cliente |
| Elite Premium mensal / Mensal | R$ 49,90 | 1 mês | Acesso completo/Premium; pagamento único |

Observação: o código informa pagamento único e ausência de renovação automática nos checkouts.

### Planos e impulsionamento para profissionais

Fonte: `src/lib/professional-plans.ts`.

| Plano | Preços reais | Benefícios no código |
|---|---:|---|
| 1 hora no topo | 1 hora: R$ 24,99 | Premium, destaque, boost, telefone visível |
| Pontos | 10 pontos: 3 dias R$ 0,90; 7 dias R$ 1,50; 30 dias R$ 9,99. Quantidade ajustável de 10 a 15.000 pontos, com preço proporcional. | Premium, boost |
| Telefone na listagem | 3 dias R$ 9,99; 7 dias R$ 19,99; 30 dias R$ 59,99; mensal/30 dias R$ 59,70 | Premium, telefone visível |
| Bronze | 3 dias R$ 19,99; 7 dias R$ 39,99; 30 dias R$ 79,99; mensal/30 dias R$ 79,90 | Premium, destaque |
| Prata | 3 dias R$ 29,99; 7 dias R$ 59,99; 30 dias R$ 109,99; mensal/30 dias R$ 109,80 | Premium, destaque |
| Ouro | 3 dias R$ 39,99; 7 dias R$ 79,99; 30 dias R$ 209,99; mensal/30 dias R$ 209,70 | Premium, destaque, telefone visível |
| Diamante | 3 dias R$ 69,99; 7 dias R$ 109,99; 30 dias R$ 339,99; mensal/30 dias R$ 339,90 | Premium, destaque, telefone visível |
| Idade oculta | 3 dias R$ 19,99; 7 dias R$ 29,99; 30 dias R$ 59,99; mensal/30 dias R$ 59,70 | Premium, ocultar idade |

Há teste grátis/configurável para novas profissionais: `professionalFreeTrialDays` padrão de 30 dias.

### Reservas de imóveis/locais

Fonte: `src/lib/money.ts`, `src/app/api/bookings/route.ts`, `prisma/schema.prisma`.

- Taxa padrão da plataforma: 10% da reserva (`bookingServiceFeeBps = 1000`).
- Repasse líquido ao anfitrião: 90% por padrão.
- O repasse live/automático não está implementado/homologado; o código mantém `payoutBlocked` e exige aprovações/homologações antes de ativar repasse real.

### Comissão, conteúdo e extras

- Comissão sobre atendimento da acompanhante: NÃO DEFINIDO; não foi encontrada cobrança/comissão sobre o serviço da profissional.
- Venda avulsa de conteúdo: NÃO DEFINIDO; existe conteúdo Premium protegido por assinatura, mas não venda individual de mídia.
- Impulsionamento: implementado nos planos profissionais via `boostActive`, `boostUntil`, `planPriority`, `featured` e planos pagos.
- Vouchers/roleta promocional: implementado com vouchers de R$ 5, R$ 10, R$ 20, R$ 50 e R$ 100.

## 3. FUNCIONALIDADES

### Implementado no código

- Cadastro/login multi-perfil: cliente, acompanhante/profissional e anfitrião.
- Cadastro de acompanhante com telefone, perfil, aparência, atendimento, serviços, preços, contato, fotos, documentos e KYC.
- Busca/listagem de acompanhantes, filtros por cidade, categoria, preço, online, avaliações e ordenação por destaque/plano.
- Perfil público de profissional com galeria, stories, vídeo, preço, contato e conteúdo Premium.
- Gate Premium para contato/conteúdo restrito.
- Favoritos, agendamentos, avaliações, contestação de avaliação e mensagens vinculadas a reservas/agendamentos.
- Stories de profissionais com expiração de 24h.
- Upload privado, quarentena, moderação manual/automática configurável e painel de uploads.
- Cadastro de imóveis/locais por anfitrião, busca/listagem/detalhe de imóveis, reserva e pagamento.
- Pagamentos via Asaas: Pix, cartão, webhook, polling de status, reembolso/cancelamento no backend e aplicação de benefícios.
- Painéis: cliente, profissional, anfitrião e admin.
- Admin para profissionais, KYC, clientes, anfitriões, imóveis, denúncias, financeiro, reservas, vouchers, documentos jurídicos, auditoria e configurações.
- Documentos legais versionados, aceite de termos, política de privacidade, checkout e KYC.
- Roleta de vouchers com orçamento, estoque, limites e antifraude.
- Sentry opcional, rate limit com Upstash opcional, CAPTCHA opcional e Google Maps opcional.
- Twilio Verify para telefone no código atual.

### Planejado, parcial ou bloqueado

- Repasse automático/live ao anfitrião: não implementado/homologado; há conciliação/bloqueios administrativos.
- Recorrência/assinatura automática: NÃO DEFINIDO; checkouts indicam pagamento único sem renovação automática.
- Venda avulsa de conteúdo adulto: NÃO DEFINIDO.
- “Shots” no painel do cliente: tela existe, mas mostra “Em breve”.
- WhatsApp OTP/Twilio WhatsApp: NÃO DEFINIDO/indisponível no fluxo atual; SMS está no código.
- KYC automático depende de variáveis/fornecedor; há fallback manual por upload/revisão.
- DNS autoritativo/Cloudflare ativo: NÃO DEFINIDO no código; documentos citam Cloudflare como pendência/fornecedor a confirmar.

## 4. STACK

- Frontend: Next.js 16.2.8, React 19.2.4, TypeScript 5, Tailwind 4/PostCSS, CSS inline/modules.
- Backend/API: Next.js App Router API routes, NextAuth 4, Prisma 5.22.
- Banco: PostgreSQL via Prisma; configs indicam Supabase Postgres (`DATABASE_URL`, `DIRECT_URL`).
- Auth/storage: Supabase Auth + Supabase Storage; NextAuth usa provider de credenciais com token Supabase.
- Pagamentos: Asaas.
- KYC: Didit, Persona e revisão manual existem no código.
- Hospedagem/deploy: Vercel confirmado por `vercel.json`, `.vercel/project.json` e docs de deploy.
- Domínio confirmado no repo: `https://www.elitemodell.com.br` em sitemap, robots, Supabase config e docs.
- DNS/CDN: NÃO DEFINIDO no código. Docs citam Cloudflare, mas como fornecedor/pendência a confirmar.
- Observabilidade: Sentry opcional via `@sentry/nextjs`.
- Rate limit produção: Upstash Redis opcional; fallback in-memory em desenvolvimento.
- Email transacional: Resend previsto por `RESEND_API_KEY`; status real NÃO DEFINIDO.

## 5. PAGAMENTO + KYC

### Pagamento

- Gateway real no código: Asaas.
- Métodos implementados: Pix e cartão de crédito.
- Rotas principais: `/api/payments/pix`, `/api/payments/card`, `/api/payments/asaas/webhook`, `/api/professional/plans/checkout`, `/api/premium/checkout/pix`.
- Webhook Asaas: implementado com token e idempotência.
- Stripe: NÃO DEFINIDO como integração real; só há campo `stripePaymentId` no schema, usado também para guardar ID do Asaas em alguns fluxos.
- Produção Asaas: código exige `ASAAS_API_KEY` e `ASAAS_ENVIRONMENT=production` em produção; configuração real do painel Asaas NÃO DEFINIDA no repo.

### KYC

- Didit: integrado no código para profissionais (`/api/didit/session`, `/api/didit/webhook`) e usado como primeira opção se `DIDIT_API_KEY` e `DIDIT_WORKFLOW_ID` existirem. Essas variáveis não aparecem na `.env.example`; configuração real NÃO DEFINIDA no repo.
- Persona: integrado no código para profissionais e clientes (`/api/kyc/sessions`, `/api/kyc/request`, `/api/webhooks/persona`, `/api/kyc/webhook`), com webhook e avaliação de documento/selfie/maioridade.
- Manual: implementado por upload de documento/selfie/vídeo e revisão administrativa.
- Produção Persona: exige `KYC_PROVIDER=PERSONA`, `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`/`PERSONA_INQUIRY_TEMPLATE_ID` e `PERSONA_WEBHOOK_SECRET`; configuração real NÃO DEFINIDA no repo.

## 6. PÚBLICO E POSICIONAMENTO

- Público: clientes adultos, acompanhantes/profissionais adultas/os, anfitriões/anunciantes de locais reservados e equipe/admin/moderação.
- Posicionamento no código: plataforma premium adulta do Brasil, com discrição, segurança, perfis verificados e experiência premium.
- Tom da marca: luxo/discrição/segurança; visual preto/dourado, linguagem de “premium”, “discrição”, “verificação” e “ambiente seguro”.
- Diferencial real no código: une busca de acompanhantes, verificação/KYC, planos de destaque, conteúdo Premium, stories e reserva de locais discretos com governança/admin/moderação.
- Concorrência/comparativo explícito: NÃO DEFINIDO.

## 7. NÚMEROS REAIS

Fonte: execução read-only de `scripts/audit-production-public-state.mjs` em 2026-06-23.

- Usuários: 52.
- Profissionais: 21.
- Imóveis/locais: 1.
- Reservas: 0.
- Pagamentos registrados: 10.
- Documentos legais: 32.
- Versões de documentos legais: 62.
- Migrations aplicadas: 30.
- Status legais: 30 `DRAFT`, 6 `DRAFT_INTERNAL`, 26 `OPERATIONAL_PUBLISHED_PENDING_LEGAL_RATIFICATION`.

Outras métricas:

- Faturamento pago agregado: NÃO DEFINIDO no arquivo de auditoria versionado.
- Tráfego/visitas: NÃO DEFINIDO.
- Conversão: NÃO DEFINIDO.
- Tração operacional: há cadastros e pagamentos registrados, mas reservas ainda estão em 0.
