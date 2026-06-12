# Relatorio de Correcao da Busca, Roleta e Rodape

Data: 12/06/2026

## Resultado

- Deploy de producao concluido em https://www.elitemodell.com.br.
- Commit da implementacao: `74b7c1b`.
- Deployment Vercel: `dpl_2KsEdLQEuQinCne15aNNp2QK3mTf`.
- Estado confirmado pela Vercel: `READY`.

## Redes sociais

Causa identificada:

- o rodape montava os itens a partir de textos e exibia somente a primeira letra de cada rede.

Correcao:

- substituicao por SVGs proprios para Instagram, WhatsApp, TikTok, YouTube e Telegram;
- estilo preto e dourado, brilho discreto, hover, foco por teclado e reducao de movimento;
- grade responsiva com area de toque minima de 44 pixels no mobile;
- URLs preparadas para as variaveis publicas `NEXT_PUBLIC_*_URL`, sem inventar contas oficiais.

Validacao em producao:

- 5 de 5 icones encontrados;
- largura da pagina: 390 pixels;
- largura do viewport: 390 pixels;
- nenhum overflow horizontal.

## Roleta promocional

Causas identificadas:

1. `/api/vouchers/roulette` nao estava na lista de rotas publicas do `proxy` e devolvia HTTP 401 antes de executar as regras da campanha.
2. O modal consultava a configuracao somente ao montar. Quando o visitante aceitava cookies de campanha depois de abrir a busca, nao havia nova consulta.
3. O registro administrativo estava com `active = true`, mas sem `promotionAuthorizationReference`. A API corretamente impedia a campanha, criando divergencia entre o painel e o estado operacional.

Correcoes:

- familia `/api/vouchers/roulette` liberada no `proxy`;
- modal passou a reagir ao evento de consentimento sem recarregar a pagina;
- configuracao padrao e registro existente alinhados para inativo enquanto nao houver referencia de autorizacao;
- painel administrativo continua exigindo a referencia para ativacao.

As regras de limite, premiacao, estoque, distribuicao, auditoria, idempotencia e antifraude nao foram alteradas.

Estado atual:

- API publica: HTTP 200;
- sem consentimento: bloqueada com `consentRequired`;
- tentativa de giro sem consentimento: HTTP 403;
- campanha: inativa ate o cadastro de certificado ou processo promocional valido;
- politica operacional versionada: presente.

## Perfis de Itauna

Causa identificada:

- `sofia-teste` e `teste-profissional-elite` estavam ativos e localizados em Itauna, mas `Professional.escortCategory` e `User.category` estavam gravados como `HOMEM`;
- a pagina de busca abre na aba `Mulheres`, por isso os dois perfis eram excluidos pelo filtro;
- a tela principal de edicao nao permitia corrigir a categoria depois do cadastro.

Correcoes:

- categorias dos dois perfis e das respectivas contas alteradas para `MULHER`;
- categoria publica adicionada ao cadastro principal da profissional;
- atualizacao da categoria agora sincroniza `Professional` e `User` na mesma operacao.

Validacao em producao:

- Itauna, categoria `MULHER`: 2 perfis;
- Itauna, categoria `HOMEM`: 0 perfis;
- os dois cards aparecem na pagina de busca mobile.

## Banco e seguranca

Migrations aplicadas:

- `20260612140000_fix_itauna_test_profile_categories`;
- `20260612141000_align_roulette_authorization_state`.

Backup anterior:

- arquivo: `backups/20260612-145918-pre-busca-roleta-itauna.dump`;
- SHA-256: `8156FE2E7F7DFBE721D97C7C4ED16F9CDFE0BE4828D2EE95E47D5BFDDA65C575`.

## Validacoes

- TypeScript: aprovado;
- Prisma: aprovado;
- lint: 0 erros e 15 avisos preexistentes;
- build de producao: aprovado;
- testes Playwright: 245 de 245 aprovados;
- smoke tests de producao: 6 de 6 aprovados;
- `git diff --check`: aprovado.

## Pendencia objetiva

Para tornar a roleta jogavel, cadastrar no painel administrativo uma referencia promocional valida e entao ativar a campanha. Nenhuma referencia foi criada ou presumida nesta correcao.
