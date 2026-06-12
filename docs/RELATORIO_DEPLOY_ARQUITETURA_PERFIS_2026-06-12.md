# Relatorio de Deploy da Arquitetura de Perfis

Data: 12/06/2026

## Resultado

- Deploy de producao concluido.
- Dominio principal: https://www.elitemodell.com.br
- Deployment Vercel: `dpl_8AgYB9mGYN8hFDyw1beRyuj6zFPu`
- URL imutavel: https://elitemodell-3wjd10mbk-elite-modell-s-projects.vercel.app
- Estado confirmado pela Vercel: `READY`
- Branch: `homolog/deploy-tecnico-controlado-2026-06-11`
- Commit da implementacao: `52c206a` (`Unifica arquitetura publica de perfis`)

## Banco de dados

A migration aditiva `20260612120000_unified_public_professional_profile` foi aplicada com `npx prisma migrate deploy`.

Validacao posterior:

- 27 migrations registradas e banco atualizado;
- 12 perfis profissionais preservados;
- 2 perfis profissionais ativos preservados;
- 8 novas colunas confirmadas;
- 0 prioridades invalidas;
- nenhum aceite ou dado existente foi removido.

Backups anteriores a migration:

- `backups/2026-06-12-100729-pre-perfis-fonte-unica-producao.dump`
  - SHA-256: `64C492B94A936F190BEBCC6F52B1B15AF154BD37E2677995B06B9B7B17940B58`
- `backups/2026-06-12-100729-pre-perfis-fonte-unica-producao-schema.sql`
  - SHA-256: `458EA94C3AD01B8CA77888904FA3C1AAB6F5BE744F451C48DAA3E0E74B68C3AF`
- `backups/2026-06-12-100729-pre-perfis-fonte-unica-producao.dump.contents.txt`
  - SHA-256: `0979A342D87E5115265879C71C7635BCD761CD19EF0EC6E58D27F343C97C3DFE`

## Validacoes antes do deploy

- `npx tsc --noEmit`: aprovado;
- `npx prisma validate`: aprovado;
- `npm run lint`: aprovado, 0 erros e 15 avisos preexistentes;
- `npm run build`: aprovado com Next.js 16.2.8;
- `npm run test`: 242 testes aprovados;
- `git diff --check`: aprovado.

## Verificacao de producao

Smoke tests executados contra `https://www.elitemodell.com.br`: 11 de 11 aprovados.

- Home publica: HTTP 200;
- busca anonima: HTTP 200;
- indice de profissionais: HTTP 200;
- rota de cidade para descoberta: HTTP 200 com encaminhamento para os filtros;
- API publica de profissionais: HTTP 200, 2 perfis e sem URL direta de storage ou data de nascimento;
- API publica de stories: HTTP 200;
- midia inexistente: HTTP 404;
- favoritos sem login: HTTP 401;
- presenca profissional sem login: HTTP 401;
- API sensivel de imoveis sem verificacao: HTTP 403;
- `robots.txt`: HTTP 200 com bloqueio de indexacao.

## Observacoes

- A confirmacao de maioridade continua sendo exibida ao visitante antes da navegacao visual.
- A navegacao publica nao exige cadastro depois da confirmacao de maioridade.
- Acoes de conta e APIs sensiveis continuam exigindo autenticacao e autorizacao.
- O arquivo local `scripts/configure-vercel-homolog-preview.mjs` nao fez parte deste deploy.
