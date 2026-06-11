# Plano de publicacao tecnica dos documentos juridicos

Data: 11 de junho de 2026
Empresa: ELITE MODEL LTDA
CNPJ: 66.807.135/0001-71
Marca: Elite Modell
Status: RASCUNHO PARA REVISAO JURIDICA - NAO PUBLICAR

## Aviso

Este plano prepara a plataforma para exibir e coletar aceite dos documentos nos pontos corretos, mas nao aprova juridicamente nenhuma minuta. Deploy, publicacao final, vigencia e aceite juridico final dependem de revisao da advogada e aprovacao empresarial.

## Status permitidos nesta etapa

| Status | Uso |
|---|---|
| DRAFT_INTERNAL | Documento interno sem publicacao externa |
| READY_FOR_LEGAL_REVIEW | Minuta pronta para revisao da advogada |
| LEGAL_REVIEW_REQUESTED | Revisao juridica solicitada |
| LEGAL_APPROVED | Nao usar sem comando expresso e evidencia da advogada |
| COMPANY_APPROVED | Nao usar sem aprovacao empresarial |
| PUBLISHED | Nao usar sem versao/hash/vigencia/aprovacoes |
| SUPERSEDED | Versao substituida |
| REVOKED | Versao revogada/despublicada |

Status atual recomendado: `READY_FOR_LEGAL_REVIEW` ou `LEGAL_REVIEW_REQUESTED`.

## Locais de exibicao preparados

| Local | Documentos/controles | Status tecnico |
|---|---|---|
| Rodape publico | Termos Gerais, Privacidade, Cookies, Regras da Comunidade, Conteudo, Moderacao/Denuncia, Confirmacao de Maioridade, Canal Privacidade, Canal Seguranca/Denuncias e Suporte | Preparado |
| Cadastro/login | Termos, Privacidade, Confirmacao de Maioridade e Aviso Resumido de Cadastro; checkboxes desmarcados; registro versionado de aceite | Preparado parcialmente |
| Cliente | Termos para Clientes, Privacidade, Maioridade, Pagamentos, Reservas, Reembolso, Denuncia e Suporte quando aplicavel | Preparado parcialmente |
| Profissional | Termos para Profissionais, KYC/Biometria, Aviso de Documentos, Aviso de Biometria, Conteudo, Moderacao e Declaracao de Autoria | Preparado parcialmente |
| Anfitriao | Termos para Anfitrioes, Pagamentos, Reembolso, taxa 10%, repasse 90%, no-show, reserva/check-in e aceite versionado | Preparado parcialmente |
| Checkout | Aviso de Checkout, Pagamentos, Reembolso, preco total, duracao/expiracao, ausencia de renovacao automatica e aceite antes do pagamento | Preparado |
| Upload de midia | Politica de Conteudo, Aviso de Publicacao, Declaracao de Autoria, alerta de proibicoes e checkbox obrigatorio antes de upload | Preparado nos fluxos principais |
| Admin > Juridico | Lista das 31 minutas, status, versao, hash, historico basico, pendencias, solicitacao de revisao, publicar/despublicar com bloqueios e auditoria | Preparado parcialmente |

## Bloqueios obrigatorios para publicar

- Documento interno nao pode ser publicado externamente.
- Documento sem versao nao pode ser publicado.
- Documento sem hash nao pode ser publicado.
- Documento sem data de vigencia nao pode ser publicado.
- Documento sem revisao da advogada nao pode ser publicado.
- Documento sem aprovacao empresarial nao pode ser publicado.
- Documento com pendencias nao pode ser publicado.
- Documento com status diferente de `COMPANY_APPROVED` nao pode ir para `PUBLISHED`.

## Registro de aceite

O sistema deve registrar, quando aplicavel:

- usuario;
- documento;
- versao;
- hash;
- data/hora;
- IP;
- user-agent;
- rota/tela;
- categoria do usuario;
- acao de aceite;
- idioma.

## Canais oficiais

| Finalidade | Canal |
|---|---|
| Suporte geral | suporte@elitemodell.com.br |
| Administracao | admin@elitemodell.com.br |
| Financeiro/pagamentos | financeiro@elitemodell.com.br |
| Privacidade/LGPD | privacidade@elitemodell.com.br |
| Seguranca/incidentes/denuncias sensiveis | seguranca@elitemodell.com.br |
| Juridico dedicado | [CRIAR/CONFIRMAR juridico@elitemodell.com.br] |

## Pendencias antes de deploy tecnico

- Validar se a empresa quer expor publicamente paginas marcadas como rascunho tecnico ou manter atras de feature flag.
- Confirmar com a advogada se a coleta de aceite em minuta `READY_FOR_LEGAL_REVIEW` pode ocorrer apenas como aceite operacional temporario.
- Confirmar canal juridico dedicado.
- Confirmar DPA/contratos/regioes dos fornecedores.
- Rodar bateria completa de testes em homologacao.

## Conclusao

A plataforma esta preparada para receber publicacao tecnica controlada, mas a publicacao juridica final segue bloqueada ate aprovacao da advogada e da empresa.
