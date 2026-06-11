# Resultado dos testes E2E juridico e seguranca

Data: 10 de junho de 2026
Ambiente: build local de producao, Next 16.2.8
Resultado: 227 aprovados, 0 falhas finais

## Projetos

| Projeto | Testes | Resultado |
| --- | ---: | --- |
| money-rounding | 5 | aprovado |
| booking-policy | 2 | aprovado |
| provider-adapters | 5 | aprovado |
| professional-validation | 4 | aprovado |
| legal-security | 7 | aprovado |
| critical-flows | 45 | aprovado |
| professional-flow | 22 | aprovado |
| mock-session | 73 | aprovado |
| authenticated | 64 | aprovado |

## Evidencias cobertas

- cadastro, login, sessao real assinada e rotas diretas;
- barreira etaria e layout mobile sem overflow;
- APIs privadas, admin, upload, pagamento, reserva, exportacao e exclusao;
- paginas e navegacao de cliente e profissional;
- centavos, taxa 10% e liquido 90%;
- percentual de taxa configuravel;
- repasse live bloqueado enquanto qualquer aprovacao obrigatoria estiver ausente;
- comportamento fail-closed sem antivirus/moderacao;
- contrato HTTP de antivirus e metodos de cancelamento/reembolso Asaas;
- schema de perfil para bio, foto e KYC;
- 401/403 para visitante e identidade sem permissao;
- proxy do Next carregado no build e redirecionamento administrativo.

## Ocorrencias corrigidas durante os testes

- O `proxy.ts` na raiz era ignorado porque o projeto usa `src/app`; movido para
  `src/proxy.ts`.
- Testes inicialmente usavam build antigo; `.next` foi limpo antes da repeticao.
- `server-only` foi declarado como dependencia e a logica pura de moderacao foi
  separada para teste.
- Fixtures profissionais foram ajustados para respeitar a identidade persistida e o
  schema foi extraido para teste independente.

## Limitacoes de homologacao

Nao foram realizadas transacoes live ou mutacoes de dados produtivos. Faltam cenarios
com identidades dedicadas de moderador, financeiro, admin com/sem MFA e fornecedores
live. Esses testes devem usar banco, storage, Asaas e KYC exclusivos de homologacao.

A execucao completa de 227 testes foi aprovada em 3,8 minutos pelo executor controlado
do projeto. Nenhuma transacao live ou migration em banco compartilhado foi executada.
