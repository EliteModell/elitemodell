# Historico do Projeto EliteModell

Este arquivo e a fonte de continuidade do projeto. Antes de iniciar qualquer nova fase, ler este historico.

## 2026-05-15 11:07:35 -03:00

**Fase atual:** FASE 1 - seguranca critica, dados sensiveis, pagamentos, rotas quebradas e encoding critico.

**Situacao analisada:**
- O build de producao passava antes das correcoes.
- O lint falhava com muitos erros preexistentes de `any`, regras React 19 e warnings de imagem.
- Havia endpoint publico retornando dados sensiveis de profissional.
- O PIX confiava em `amount` e `payerEmail` vindos do cliente.
- Rotas exibidas no menu e em fluxos de reserva apontavam para paginas inexistentes.
- Havia textos com encoding quebrado em varias areas do app.

**O que foi corrigido:**
- Endpoint publico de profissional passou a usar `select` explicito e nao retorna email do usuario, documentos, KYC, paths privados ou campos internos.
- Perfil profissional em status diferente de `ACTIVE` so fica visivel para o proprio dono ou ADMIN.
- Endpoint publico de imovel por ID agora oculta imoveis nao ativos de usuarios publicos.
- Middleware passou a deixar `/api/professionals` e `/api/properties` publicos apenas para `GET`; mutacoes seguem exigindo token.
- PIX passou a recalcular valor pelo `booking.totalPrice` no servidor.
- PIX passou a validar se a reserva existe, pertence ao usuario autenticado ou ADMIN, nao esta paga e nao esta cancelada/rejeitada.
- Tela de reserva deixou de enviar `amount` e `payerEmail` ao endpoint de PIX.
- Criacao de reserva passou a validar datas invalidas, check-in no passado, reserva do proprio imovel e quantidade de hospedes acima do permitido.
- Cupom passou a validar expiracao, limite de uso e valor minimo antes de aplicar desconto.
- Rotas quebradas ganharam paginas minimas para evitar 404 em fluxos ja expostos pela UI.
- Correcoes novas foram escritas em ASCII nos arquivos adicionados para evitar ampliar o problema de encoding.

**Arquivos alterados:**
- `middleware.ts`
- `src/app/api/professionals/[slug]/route.ts`
- `src/app/api/properties/[id]/route.ts`
- `src/app/api/payments/pix/route.ts`
- `src/app/api/bookings/route.ts`
- `src/app/imoveis/[id]/reservar/page.tsx`
- `src/app/(dashboard)/dashboard/reservas/page.tsx`
- `src/app/(dashboard)/dashboard/favoritos/page.tsx`
- `src/app/(dashboard)/dashboard/perfil/page.tsx`
- `src/app/(dashboard)/anfitriao/imoveis/page.tsx`
- `src/app/(dashboard)/anfitriao/reservas/page.tsx`
- `src/app/(dashboard)/anfitriao/ganhos/page.tsx`
- `src/app/(dashboard)/admin/usuarios/page.tsx`
- `src/app/(dashboard)/admin/imoveis/page.tsx`
- `src/app/(dashboard)/admin/reservas/page.tsx`
- `src/app/(dashboard)/admin/cupons/page.tsx`
- `src/app/esqueci-senha/page.tsx`
- `docs/HISTORICO_DO_PROJETO.md`

**Bugs encontrados:**
- Vazamento de dados sensiveis no endpoint publico de profissional.
- PIX aceitava valor e email enviados pelo cliente.
- Imoveis nao ativos podiam ser consultados por ID se a URL fosse conhecida.
- Middleware tratava APIs publicas por prefixo sem diferenciar metodo.
- Reserva nao validava algumas regras essenciais no servidor.
- Links de dashboard, anfitriao, admin e recuperacao de senha levavam a 404.
- Encoding quebrado ainda aparece em arquivos antigos.

**Bugs resolvidos nesta fase:**
- Vazamento publico de documento/KYC/email em profissional.
- Pagamento PIX baseado em dados financeiros enviados pelo cliente.
- Acesso publico a imovel nao ativo por ID.
- POST/rotas mutaveis de professionals/properties passando pelo middleware como publicas.
- Reserva do proprio imovel, datas passadas e excesso de hospedes.
- 404 nas principais rotas ja anunciadas por menus e fluxos.

**Testes executados:**
- `npm run build`: passou.
- `npm run lint`: falhou com 100 problemas restantes, majoritariamente preexistentes. Antes desta fase havia 105 problemas; os novos arquivos nao adicionaram falhas de lint.

**Pendencias:**
- Corrigir lint global: `any`, regras React 19, imports/variaveis nao usados e uso de `<img>`.
- Fazer limpeza ampla de encoding nos arquivos antigos.
- Criar APIs reais para listagem privada de imoveis do anfitriao, administracao de usuarios/imoveis/reservas/cupons e favoritos.
- Validar assinatura/autenticidade do webhook Mercado Pago conforme configuracao final do provedor.
- Mover dashboards que ainda usam mock para dados reais.
- Melhorar transacao de reserva para evitar corrida entre verificacao de conflito e criacao.

**Proxima etapa recomendada:**
- Ainda dentro da FASE 1, finalizar a limpeza critica de encoding e substituir mocks administrativos/operacionais por dados reais ou estados explicitamente bloqueados, sem entrar em design ou novas funcionalidades opcionais.

## 2026-05-15 16:21:32 -03:00

**Fase atual:** FASE 1 - continuacao: remover mocks operacionais e preparar teste real com profissionais.

**Situacao analisada:**
- Usuario confirmou que os mocks eram apenas para demonstracao ao cliente e autorizou remover.
- Painel admin principal, painel do anfitriao, painel profissional, admin/imoveis, admin/cupons e admin/profissionais ainda exibiam dados falsos ou placeholders.
- Objetivo imediato passou a ser testar com profissionais reais cadastrados no banco.

**O que foi corrigido:**
- `admin/page.tsx` deixou de usar estatisticas fake e agora consulta Prisma para usuarios, imoveis, profissionais, reservas, receita paga e pendencias.
- `anfitriao/page.tsx` deixou de usar `mockStats` e `mockBookings`; agora lista imoveis/reservas reais do anfitriao autenticado.
- `profissional/page.tsx` deixou de usar estatisticas/agendamentos falsos; agora consulta o perfil profissional real do usuario e redireciona para `/profissional/novo` se nao existir.
- `admin/imoveis/page.tsx` deixou de ser placeholder e agora lista imoveis reais para auditoria.
- `admin/cupons/page.tsx` deixou de ser placeholder e agora lista cupons reais do banco.
- `admin/profissionais/page.tsx` foi trocada por listagem real de profissionais com acoes server-side simples para aprovar/rejeitar.
- Encoding dos arquivos reescritos foi mantido em ASCII para nao perpetuar caracteres quebrados.

**Arquivos alterados nesta rodada:**
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/profissionais/page.tsx`
- `src/app/(dashboard)/admin/imoveis/page.tsx`
- `src/app/(dashboard)/admin/cupons/page.tsx`
- `src/app/(dashboard)/anfitriao/page.tsx`
- `src/app/(dashboard)/profissional/page.tsx`
- `docs/HISTORICO_DO_PROJETO.md`

**Bugs encontrados:**
- Paineis exibiam numeros e registros mockados como se fossem dados reais.
- Admin de profissionais usava IDs mockados e nao servia para testar perfis cadastrados de verdade.
- Placeholders em admin/imoveis e admin/cupons impediam auditoria real.

**Bugs resolvidos nesta rodada:**
- Dados falsos removidos dos principais paineis operacionais.
- Admin/profissionais agora usa profissionais reais do banco.
- Aprovacao/rejeicao basica de profissionais reais disponivel via server actions.
- Admin/imoveis e admin/cupons agora refletem o banco.

**Testes executados:**
- `npm run build`: passou.
- `npm run lint`: falhou com 91 problemas restantes. Antes da rodada havia 100. As paginas reescritas nao aparecem mais como fonte de lint; os erros restantes estao concentrados em cadastro/login, formularios de imovel/profissional, algumas APIs com `any`, componentes e uso de `<img>`.

**Pendencias:**
- Testar manualmente cadastro de profissional real: cadastro -> `/profissional/novo` -> envio de dados -> admin/profissionais -> aprovar -> perfil publico.
- Admin/profissionais ainda nao exibe documentos assinados; apenas status e acao basica.
- Fluxos de edicao de agenda/fotos/perfil profissional ainda precisam ser conectados completamente a dados reais.
- Limpeza global de encoding continua pendente nos arquivos antigos.
- Lint global ainda precisa ser tratado.

**Proxima etapa recomendada:**
- Continuar FASE 1 testando e corrigindo o fluxo real de profissionais: cadastro, criacao de perfil, upload/documentos, aprovacao admin e visibilidade publica.

## 2026-05-15 16:59:37 -03:00

**Fase atual:** FASE 1 - configuracao Supabase Auth para producao em `elitemodell.com.br`.

**Situacao analisada:**
- O app ja usava Supabase Auth como provedor real e NextAuth como sessao da aplicacao.
- `src/lib/supabase-auth.ts` misturava cliente browser e cliente admin/service role no mesmo modulo.
- Callback OAuth sempre terminava em `/dashboard`, mesmo quando o cadastro pendente era de profissional ou anfitriao.
- Logout removia apenas a sessao NextAuth, deixando a sessao Supabase local potencialmente ativa.
- Checklist de configuracao Supabase ainda tinha placeholder de dominio do cliente.
- Next.js 16 marca `middleware.ts` como convencao depreciada e recomenda `proxy.ts`.

**O que foi corrigido:**
- Separado Supabase browser client em `src/lib/supabase-client.ts`.
- Separado Supabase service-role server client em `src/lib/supabase-server.ts`.
- Imports de login, cadastro, callback, NextAuth e registro foram atualizados para os novos modulos.
- Callback `/auth/callback` agora preserva destino de cadastro:
  - profissional anunciante -> `/profissional/novo`
  - anfitriao de imovel -> `/anfitriao`
  - cliente -> `/dashboard`
- Callback de login social sem cadastro pendente consulta `/api/users/me` para decidir o destino.
- Logout no navbar e sidebar agora encerra Supabase Auth e NextAuth.
- `middleware.ts` foi migrado para `proxy.ts` com export `proxy`, mantendo as mesmas regras de protecao.
- `SUPABASE_AUTH_SETUP_CLIENTE.md` foi atualizado para `https://elitemodell.com.br` e `https://www.elitemodell.com.br`.

**Arquivos alterados nesta rodada:**
- `proxy.ts`
- `SUPABASE_AUTH_SETUP_CLIENTE.md`
- `src/lib/supabase-client.ts`
- `src/lib/supabase-server.ts`
- `src/lib/supabase-auth.ts` removido
- `src/lib/auth.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/cadastro/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/components/DashSidebar.tsx`
- `src/components/Navbar.tsx`
- `docs/HISTORICO_DO_PROJETO.md`

**Testes executados:**
- `npm run build`: passou.
- `npm run lint`: falhou com 91 problemas restantes, mesma contagem da rodada anterior. Os problemas seguem concentrados em `any`, regras React 19 e uso de `<img>`.

**Pendencias:**
- Configurar no painel Supabase:
  - Site URL `https://elitemodell.com.br`
  - Redirect URLs `https://elitemodell.com.br/auth/callback` e `https://www.elitemodell.com.br/auth/callback`
  - Email provider e Confirm email conforme ambiente de producao
  - Google OAuth com callback Supabase do projeto
  - Phone/SMS somente se houver provedor SMS configurado
- Configurar variaveis de producao: `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`.
- Testar manualmente em producao/staging: email/senha, confirmacao de email, Google OAuth, SMS se habilitado, logout e redirecionamentos por tipo de conta.

**Proxima etapa recomendada:**
- Depois de configurar o painel Supabase e variaveis de producao, testar o fluxo real completo: cadastro profissional -> callback -> `/profissional/novo` -> envio do perfil -> aprovacao admin -> perfil publico.
