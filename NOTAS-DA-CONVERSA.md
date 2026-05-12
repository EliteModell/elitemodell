# Notas da conversa

Este arquivo serve como memoria curta do trabalho no projeto, para nao perdermos o fio quando o historico do chat compactar ou sumir.

## Onde estamos

- Projeto: `elitemodell`
- Pasta: `c:\projeto\elitemodell`
- Ambiente: Windows / PowerShell

## Regras importantes

- O arquivo `AGENTS.md` avisa que esta versao do Next.js pode ter mudancas quebrando APIs, convencoes e estrutura de arquivos.
- Antes de escrever codigo relacionado ao Next.js, consultar a documentacao local em `node_modules/next/dist/docs/`.
- Nao reverter mudancas existentes sem pedido explicito.
- Manter as alteracoes pequenas e alinhadas com o padrao atual do projeto.

## Estado atual

- Criamos este arquivo para registrar contexto, decisoes e proximos passos.
- Reconstruimos o contexto pelos arquivos `ETAPA_1_RESUMO.md`, `VALIDACAO_CADASTRO_PREMIUM.md` e `DIAGNOSTICO_ESTRUTURA_PROJETO.md`.
- Etapa 1 foi marcada como concluida: middleware, age gate, LGPD, termos, seguranca, auditoria e APIs de moderacao.
- Proximo foco: Etapa 2, com paineis funcionais e modulos reais.
- Ajustamos a entrada do cadastro para separar `Cliente`, `Profissional anunciante` e `Anfitriao de imovel`.
- Para profissional anunciante, a categoria `Mulher`, `Homem` ou `Trans` aparece no cadastro inicial, e a tela reforca que documento, fotos reais e biometria sao obrigatorios para publicar.
- O projeto esta sendo preparado para a estrutura do cliente, nao para credenciais pessoais.
- Situacao atual: Supabase e usado para banco, storage e autenticacao.
- NextAuth continua como sessao interna da aplicacao para preservar `useSession` e `getServerSession` nos dashboards/APIs.
- Login/cadastro foram migrados de Firebase Auth para Supabase Auth.
- Firebase foi removido do fluxo, das libs locais e das dependencias.
- `.env.example` agora documenta Supabase Auth e redirect `/auth/callback`.
- Criado `SUPABASE_AUTH_SETUP_CLIENTE.md` com o checklist do painel Supabase do cliente.
- Projeto Supabase correto confirmado: `jgvmpbrsxegwkrgjncsv` (`https://jgvmpbrsxegwkrgjncsv.supabase.co`).
- `supabase/config.toml` foi criado/linkado e `supabase config push` aplicado com sucesso no projeto correto.
- `.env` local teve `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` atualizados para o projeto correto.
- `DATABASE_URL` e `DIRECT_URL` agora apontam para o projeto correto `jgvmpbrsxegwkrgjncsv`.
- Login Google no codigo esta migrado para Supabase Auth e o redirect `/auth/callback` foi configurado no Supabase, mas ainda falta ativar o provider Google no painel Supabase com Client ID/Secret do Google Cloud do cliente.
- Twilio esta sendo criada para liberar login/cadastro por celular/SMS no Supabase Phone Auth.
- A verificacao inicial da Twilio pode usar o numero pessoal do Bruno apenas para liberar a conta/painel; isso e temporario e deve ser trocado para dados oficiais do cliente antes de producao.
- A tela `localhost:3000` com `ERR_CONNECTION_REFUSED` indica apenas que o servidor local nao esta rodando; usar `npm run turbo`.
- Conexao Prisma com o banco novo testada com sucesso.
- `npx prisma db push` executado com sucesso no banco novo; schema Prisma sincronizado.
- `npm run build` passou apos configurar Auth/DB Supabase.

## Pendencias

- [ ] Rodar/validar build e dev server local.
- [ ] Validar Etapa 1 no navegador: age gate, cadastro, termos, privacidade e middleware.
- [ ] Testar no navegador o cadastro para os 3 tipos de conta.
- [ ] Configurar Supabase Auth do cliente: Email/senha, Google OAuth, Telefone/SMS se disponivel e redirect URLs.
- [ ] Rodar checklist de `SUPABASE_AUTH_SETUP_CLIENTE.md` no painel Supabase do cliente.
- [x] Atualizar `DATABASE_URL` e `DIRECT_URL` para o Postgres do projeto `jgvmpbrsxegwkrgjncsv`.
- [ ] Ativar Google OAuth no Supabase e configurar no Google Cloud o callback `https://jgvmpbrsxegwkrgjncsv.supabase.co/auth/v1/callback`.
- [ ] Configurar Twilio no Supabase Phone Auth com Account SID, Auth Token e Messaging Service SID.
- [ ] Antes de producao, trocar qualquer numero/conta temporaria usada na Twilio pelos dados oficiais do cliente.
- [x] Redefinir/confirmar senha do banco Supabase e rodar `scripts/update-supabase-db-env.ps1`.
- [ ] Registrar no cofre/Bitwarden do cliente a senha definitiva do banco Supabase e atualizar `DATABASE_URL`/`DIRECT_URL` sempre que a senha for alterada.
- [x] Rodar `npx prisma db push` no banco novo.
- [ ] Garantir que `.env`/Vercel usam Supabase, Firebase, pagamentos e dominios do cliente.
- [ ] Priorizar Etapa 2 por partes:
  - [ ] Busca real de imoveis.
  - [ ] Painel do anfitriao para CRUD de imoveis.
  - [ ] Painel admin para aprovar/reprovar imoveis e profissionais.
  - [ ] Painel profissional com pendencias do cadastro.
  - [ ] Sistema de planos/pagamentos.
  - [ ] Email transacional.
  - [ ] KYC/liveness real, webhook e moderacao automatica.

## Decisoes

- Usar este arquivo como ponto de referencia quando a conversa ficar longa ou o historico for compactado.
- Para desenvolvimento local, usar sempre `npm run turbo`; nao usar `npm run dev`, porque trava o computador do usuario.
