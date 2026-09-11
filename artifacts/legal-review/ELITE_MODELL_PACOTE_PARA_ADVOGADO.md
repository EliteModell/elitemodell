# ELITE MODELL
## PACOTE DE REVISÃO JURÍDICA

Data de consolidação: 10/09/2026.

Finalidade: apresentar ao advogado, em linguagem não técnica, o funcionamento atual da plataforma, os documentos publicados, as evidências disponíveis e as decisões jurídicas pendentes. Este material consolida o inventário jurídico/técnico dos documentos `01` a `12` e as verificações pontuais, somente em modo leitura, solicitadas para Anfitrião, `CheckoutAcceptance` e histórico Git. Não constitui parecer jurídico e não publica nem substitui termos.

## 1. Resumo executivo

A Elite Modell é uma plataforma digital operada por ELITE MODEL LTDA, CNPJ 66.807.135/0001-71, voltada à descoberta de perfis de profissionais adultos. O sistema permite cadastro, perfis públicos, fotos, vídeos, stories, contato, agendamentos, avaliações, denúncias, verificação de identidade, planos, destaques e controles administrativos de moderação e privacidade.

Existem 25 documentos públicos na versão `1.0-operational-2026-06-11`, publicados como operacionais e ainda pendentes de ratificação jurídica, além de 6 documentos internos em minuta. O banco preserva versões e aceites anteriores. Os textos atuais não correspondem integralmente ao produto atual: ainda mencionam roleta, vouchers, imóveis, anfitriões, reservas imobiliárias, taxa de 10% e repasse de 90%.

Declarações obrigatórias sobre o produto atual:

> **ROLETA = DESCONTINUADA**
>
> **VOUCHERS PROMOCIONAIS ASSOCIADOS À ROLETA = DESCONTINUADOS**

Esses recursos não devem ser apresentados como funcionalidades atuais. Seus dados históricos foram preservados para auditoria, retenção, prova de aceite e eventual relação com transações; ainda não devem ser apagados.

O perfil Anfitrião não foi classificado automaticamente como obsoleto. A verificação do código mostrou que ele ainda existe no modelo de dados, autenticação e lógica de perfis, mas suas páginas e APIs principais, assim como as de imóveis, foram retiradas e seus caminhos estão bloqueados como descontinuados. É necessária decisão empresarial e jurídica sobre encerramento definitivo, manutenção histórica ou futura reativação.

A tabela específica `CheckoutAcceptance` contém zero registros. O código atual prevê sua criação em checkouts de planos profissionais, Premium, Pix, cartão e reservas, além do registro paralelo em `UserAcceptance`. A leitura do banco encontrou 10 pagamentos, todos anteriores à criação da estrutura jurídica de checkout, sendo 9 falhos e 1 pendente; não existem reservas nem intenções de compra Premium. Portanto, o zero é explicado, com os dados disponíveis, pela ausência de compra qualificável posterior à implantação da tabela, e não por falha de implementação já demonstrada. A trilha ainda precisa de teste controlado antes de uso comercial efetivo.

## 2. Como a plataforma funciona

O visitante passa por controle de maioridade e pode acessar a página inicial, busca, perfis e documentos públicos. Clientes criam conta para pesquisar e favoritar profissionais, acessar conteúdo autorizado, entrar em contato, agendar, avaliar, denunciar, adquirir Premium ou créditos e exercer direitos de privacidade. Profissionais criam e administram perfis, mídias, stories, agenda, valores, contatos, planos e recursos de destaque, sujeitos a verificação e aprovação.

O sistema utiliza autenticação, banco PostgreSQL/Supabase, armazenamento mediado de mídia, fornecedores de KYC, gateway Asaas para Pix e cartão e serviços auxiliares de comunicação, segurança e observabilidade. Há área administrativa para cadastro, KYC, conteúdo, denúncias, pagamentos, jurídico, privacidade, incidentes e auditoria.

A finalidade jurídica exata da operação — vitrine, marketplace, intermediadora ou outra — ainda precisa ser definida. Essa definição afeta responsabilidade por anúncios, conteúdo, contatos, encontros, pagamentos e eventuais relações entre usuários.

## 3. Empresa e operação

- Operadora declarada: ELITE MODEL LTDA.
- CNPJ declarado: 66.807.135/0001-71.
- Endereço nos termos vigentes: Rua João Machado, nº 834, Fundos, Centro, Pompéu/MG, CEP 35.640-000.
- Domínio identificado: `https://www.elitemodell.com.br`.
- Canais declarados: `suporte@elitemodell.com.br`, `admin@elitemodell.com.br`, `financeiro@elitemodell.com.br`, `privacidade@elitemodell.com.br` e `seguranca@elitemodell.com.br`.
- Canal jurídico atual: `admin@elitemodell.com.br`, de forma provisória.
- Abrangência observada: cidades e endereços brasileiros, sem bloqueio técnico completo por país.

O advogado deve confirmar razão social, endereço, representante, canais, área geográfica, enquadramento jurídico, obrigações fiscais e canal específico para comunicações jurídicas.

## 4. Tipos de usuários

**Visitante:** acessa superfícies públicas, sujeito ao age gate. Podem ser tratados IP, user agent, cookies, localização aproximada e métricas.

**Cliente:** mantém conta, pesquisa, favorita, contata, agenda, avalia, denuncia, compra recursos pagos e exerce direitos LGPD. Deve ser maior de 18 anos, fornecer dados verdadeiros e proteger as credenciais.

**Profissional:** publica e administra perfil e conteúdo, agenda, valores, contatos e recursos promocionais pagos. Deve comprovar maioridade e identidade, declarar autoria/autorização das mídias e cumprir regras de conteúdo e segurança.

**Anfitrião:** o perfil permanece no schema, autenticação e lógica de conta. Entretanto, páginas públicas, painel, cadastro, verificação e administração de anfitriões/imóveis foram retirados, e os caminhos correspondentes são tratados como descontinuados. Assim, não há fluxo operacional completo disponível ao usuário. A referência não deve ser eliminada do histórico sem decisão formal.

**Administrador e equipe:** existem papéis de administração geral, moderação, suporte e financeiro, com poderes sobre perfis, KYC, clientes, denúncias, finanças, documentos jurídicos, privacidade e incidentes. O modelo prevê MFA e auditoria; é necessário validar segregação de funções, acesso mínimo, sigilo e revisão periódica.

## 5. Cadastro e autenticação

O cadastro exige declarações relacionadas a Termos Gerais, Privacidade/LGPD e maioridade. O cadastro profissional acrescenta termos próprios, regras de conteúdo e confirmações adicionais. A autenticação distingue intenções e perfis disponíveis e registra dados necessários à segurança e à continuidade do cadastro.

A evidência esperada é um `UserAcceptance` com documento, versão, hash, data, usuário, categoria, fonte, rota, IP e user agent quando aplicáveis. Há 432 registros gerais de aceite. Persistem também flags legadas no cadastro; elas não devem substituir, sem validação, a prova versionada de qual texto foi aceito.

## 6. Verificação de identidade / KYC

Profissionais podem ser submetidos a telefone, documento, selfie, vídeo, biometria, verificação facial externa e revisão administrativa. A aprovação pode ser revista por fraude, inconsistência, denúncia, risco ou ordem legal. O código contém integrações com Persona e Didit; a configuração local observada indicava Persona em ambiente sandbox, sem comprovação de qual fornecedor está efetivamente ativo em produção.

O advogado deve validar as bases legais, transparência, necessidade, proporcionalidade, retenção, revisão humana, compartilhamento, transferência internacional e contratos com operadores, especialmente para biometria e documentos.

## 7. Maioridade e conteúdo

A plataforma é declarada exclusiva para maiores de 18 anos. Há age gate público, data de nascimento e declaração no cadastro, controles adicionais para clientes e KYC mais intenso para profissionais. O sistema proíbe qualquer envolvimento de criança ou adolescente, dúvida razoável sobre maioridade, exploração, coerção, tráfico, violência, imagem íntima não autorizada, deepfake enganoso, documento falso e conteúdo de terceiro sem autorização.

O advogado deve decidir se os controles atuais são suficientes para cada nível de risco, quando exigir KYC adicional e qual protocolo aplicar a suspeita de menoridade, exploração, coerção ou tráfico, inclusive preservação de evidências e eventual comunicação às autoridades.

## 8. Perfis, fotos, vídeos e stories

Profissionais podem publicar descrição, atributos, localização, fotos, vídeos e stories. Os uploads passam por quarentena, controles de segurança e moderação, e a publicação depende do estado do perfil e da mídia. A entrega pública de mídia é mediada pela aplicação.

O titular declara licitude, autoria, autorização e direitos sobre o material enviado, inclusive quando houver terceiros. O sistema mantém `ContentDeclaration` com 65 registros. Devem ser definidos licença de uso, prazo, retirada, tratamento após exclusão de conta, comprovação de autorização de terceiros e resposta a conteúdo não autorizado.

## 9. Comunicação entre usuários

Os documentos e o produto contemplam contato, mensagens, suporte e notificações. São proibidos assédio, ameaça, perseguição, exposição de dados, captura ou redistribuição indevida, fraude e tentativa de contornar moderação. Denúncias podem envolver mensagens e condutas fora da plataforma quando relacionadas ao uso do serviço.

É necessário delimitar o papel da Elite Modell nas comunicações, os limites de monitoramento, os fundamentos e prazos de retenção, o acesso administrativo, a preservação por denúncia e as responsabilidades por contatos e encontros presenciais.

## 10. Agendamentos

Clientes podem solicitar agendamentos com profissionais. Esses registros podem conter data, horário, valor informado, estado e informações necessárias ao contato. O inventário não demonstrou escrow nem repasse financeiro do atendimento presencial; deve-se esclarecer se a plataforma apenas aproxima as partes ou participa da contratação e do pagamento do serviço.

As antigas reservas de imóveis pertencem ao módulo de anfitriões/imóveis retirado. O banco preserva estruturas históricas, mas a leitura realizada encontrou zero reservas. Termos que descrevem reservas imobiliárias, check-in, no-show, disputa e repasse não refletem um fluxo atual disponível.

## 11. Pagamentos, taxas e repasses

O gateway implementado é o Asaas, com Pix e cartão de crédito. Pagamentos locais guardam provedor, status, valor, identificador externo, QR Code/Pix quando aplicável, datas, reembolso e conciliação. Webhooks possuem controles de idempotência. Operações administrativas podem registrar conciliação, cancelamento, reembolso e auditoria.

O modelo legado de reserva imobiliária calcula taxa e repasse ao anfitrião. Os textos atuais afirmam taxa de 10%, repasse de 90% e liberação após check-in em até 24 horas úteis. Como o módulo de imóveis foi retirado, esses números não devem ser apresentados como política atual sem decisão expressa.

Os planos observados parecem pagamentos únicos por duração, não assinaturas recorrentes. Devem ser confirmados cancelamento, arrependimento, reembolso, no-show, chargeback, duplicidade, falha do gateway, tributação, emissão fiscal, início e fim do benefício e atendimento financeiro.

## 12. Planos e recursos pagos

Para clientes, o inventário encontrou Premium de 24 horas, 30 dias e 90 dias, além de uma oferta mensal em upsell cuja coerência de preço precisa ser confirmada. Para profissionais, existem recursos de topo, pontos, telefone na listagem, planos Bronze, Prata, Ouro e Diamante e opção de ocultar idade, com períodos e preços definidos no produto.

Os termos de destaques esclarecem que maior visibilidade não garante resultado. Preço, prazo, elegibilidade, ativação, entrega, ausência de renovação automática, primeira compra e eventuais promoções precisam ser harmonizados entre interface, checkout, política de pagamento e termos.

Carteira e créditos ainda possuem superfícies e suporte financeiro no sistema e não foram classificados como descontinuados nesta revisão. Já vouchers vinculados à roleta foram descontinuados.

## 13. Dados pessoais coletados

Conforme o perfil e o uso, podem ser tratados: nome, e-mail, telefone, data de nascimento, cidade/UF, endereço, imagem, documento, CPF, selfie, biometria/KYC, atributos de perfil, localização, fotos, vídeos, stories, agenda, preços, mensagens, favoritos, avaliações, agendamentos, pagamentos, aceites, cookies, IP, user agent, sessão, dispositivo, métricas, denúncias, moderação, suporte e auditoria.

Fornecedores identificados incluem Supabase/PostgreSQL/Prisma, Persona, Didit, Asaas, Resend, Firebase, Twilio/WhatsApp/Zenvia, Google Maps, Sentry, Vercel, Turnstile, Upstash e ClamAV, conforme configuração e uso efetivo. A presença no código não prova ativação em produção.

## 14. LGPD e consentimentos

O sistema possui `LegalDocument`, versões imutáveis, `UserAcceptance`, `ConsentPreference`, `CheckoutAcceptance`, `ContentDeclaration`, `PrivacyRequest` e rotinas de exclusão. As contagens lidas foram: 32 documentos, 62 versões, 432 aceites gerais, 43 preferências de consentimento, 65 declarações de conteúdo, 3 solicitações de privacidade e 0 aceites específicos de checkout.

Ainda é necessário produzir e aprovar o mapa dado → finalidade → base legal → compartilhamento → transferência → retenção. Consentimento não deve ser usado como base genérica para todos os tratamentos. Revogação, legítimo interesse, obrigação legal, exercício regular de direitos, prevenção à fraude, proteção do titular e dados sensíveis precisam ser analisados separadamente.

A escolha de cookies é mantida no cookie `elite_cookie_consent`; deve-se confirmar se scripts opcionais respeitam a escolha e se é necessária evidência server-side adicional.

## 15. Exclusão e exportação de dados

O titular dispõe de área de privacidade, exportação e solicitação de exclusão. O sistema registra solicitações e possui worker para exclusão, anonimização ou desvinculação de dados. A execução deve preservar o que estiver sujeito a obrigação legal, prevenção à fraude, defesa de direitos, auditoria ou investigação, com transparência ao titular.

O advogado deve aprovar prazos e critérios para cadastro, documentos, biometria, mídias, mensagens, pagamentos, denúncias, logs, aceites e dados legados. Os registros históricos da roleta e dos vouchers não devem ser apagados antes dessa decisão.

## 16. Moderação, denúncias e suspensão

O sistema prevê denúncia de perfil, conteúdo, mensagem, fraude, exploração, coerção, imagem não autorizada, menoridade, tráfico e risco físico. Estados profissionais incluem rascunho, revisão pendente, ativo, pausado, suspenso e rejeitado. A plataforma pode limitar conta, ocultar ou remover conteúdo, exigir nova verificação, suspender ou encerrar acesso.

Precisam ser formalizados: critérios, retirada cautelar, níveis de prioridade, prazo, comunicação, recurso, reincidência, preservação de evidências, acesso administrativo e protocolo para autoridades. A responsabilidade por decisões automatizadas e revisão humana também deve ser delimitada.

## 17. Evidências de aceite

As provas esperadas por fluxo são:

- cadastro: versão/hash de Termos, Privacidade, aviso e maioridade em `UserAcceptance`;
- KYC: avisos de identidade, biometria e documentos, vinculados à sessão e ao usuário;
- upload: declaração de autoria/autorização, arquivo, versão e moderação em `ContentDeclaration`;
- checkout: produto, valor, duração, condições essenciais, termos, reembolso, versão/hash, usuário, data, IP e user agent em `CheckoutAcceptance` e/ou `UserAcceptance`;
- cookies: categorias escolhidas e revogação;
- privacidade: solicitação, autenticação, eventos, exportação e exclusão;
- moderação: denúncia, caso, eventos, evidências e auditoria.

### Investigação de `CheckoutAcceptance` — somente leitura

**Onde deveria ser criado.** O código atual cria ou vincula `CheckoutAcceptance` nos fluxos de reserva, checkout de plano profissional, checkout Premium autenticado, vinculação posterior de compra Premium, pagamento Pix e pagamento por cartão. Para Pix/cartão de reserva, o registro nasce na reserva e recebe o `paymentId` quando o pagamento é criado.

**A tabela é usada?** Sim. Além das gravações, ela é relacionada a usuário, pagamento e versões jurídicas; é consultada no vínculo de Premium, incluída em exportação jurídica e tratada pelo worker de exclusão/LGPD. Não é uma tabela órfã.

**Existe outro registro de aceite?** Sim. Os checkouts autenticados também chamam a gravação de `UserAcceptance` com tipo `CHECKOUT`. No Premium iniciado sem autenticação, a intenção de compra guarda versões, hashes, IP, user agent e data; ao vincular a compra a uma conta, o sistema cria o `CheckoutAcceptance`. Apesar disso, o banco contém zero `UserAcceptance` do tipo `CHECKOUT` e zero intenções Premium.

**Há falha de implementação comprovada?** Não com os dados atuais. A tabela foi introduzida em 09/06/2026. Os 10 pagamentos existentes datam de 26/05/2026 a 03/06/2026; todos precedem a implantação. Nove estão como falhos e um como pendente. Não há pagamento posterior, reserva ou intenção Premium que devesse ter gerado o aceite. O código atual contém as chamadas de gravação, mas não há transação real pós-implantação para demonstrar que a cadeia funciona em produção.

**Causa raiz do zero observado.** Ausência de compra qualificável posterior à implantação da estrutura, somada à inexistência de backfill dos pagamentos antigos. Não foi encontrada evidência de uma compra nova que tenha ignorado a tabela.

**Risco jurídico: MÉDIO.** Não há compra paga posterior sem aceite específico identificada, o que reduz o risco imediato. Porém, a prova de consentimento contratual no checkout ainda não foi validada ponta a ponta; os pagamentos antigos não possuem essa trilha específica; e uma falha futura afetaria a demonstração de preço, produto, duração, reembolso e texto aceito. Antes da liberação comercial, recomenda-se teste controlado em ambiente adequado, conferência simultânea de `Payment`, `CheckoutAcceptance`, `UserAcceptance`, versões/hashes e eventos do gateway, sem apagar nem preencher retroativamente evidências inexistentes.

## 18. Funcionalidades descontinuadas

Foram confirmadas como retiradas da superfície atual:

- roleta promocional;
- vouchers promocionais associados à roleta;
- páginas, componentes e APIs de interação/resgate da roleta;
- páginas públicas, cadastro, painel e administração de imóveis/anfitriões;
- APIs públicas de propriedades e telas de reservas imobiliárias.

O código ainda mantém modelos, migrations, dados históricos, anonimização/exclusão, partes de autenticação e algumas lógicas financeiras ou de conta. Presença residual não equivale a disponibilidade atual e não autoriza apagar o histórico.

## 19. Roleta/vouchers — histórico e descontinuação

> **ROLETA = DESCONTINUADA**
>
> **VOUCHERS PROMOCIONAIS ASSOCIADOS À ROLETA = DESCONTINUADOS**

A consulta histórica encontrou 1 configuração, 4 orçamentos, 9 prêmios, 80 estoques diários, 58 giros/participações, 4 vouchers/benefícios de clientes, 0 configurações de aceite por profissional e 1 documento jurídico promocional.

Não há componentes, páginas ou APIs atuais de consulta, giro, resgate ou desbloqueio. O uso em carteira, agendamentos e configurações profissionais foi retirado. A política antiga saiu do catálogo jurídico público; a rota genérica não a serve. O documento e os dados permanecem apenas como histórico.

Antes de qualquer exclusão, devem ser definidos fundamento e prazo de retenção, necessidade de preservar códigos/valores/aceites, anonimização, tratamento de benefícios que ainda aparentem disponibilidade e arquivamento formal da versão jurídica. Nenhuma migration destrutiva deve ser preparada antes dessa decisão.

## 20. Riscos jurídicos identificados

1. Os 25 documentos públicos estão operacionais, porém pendentes de ratificação jurídica.
2. Os termos atuais descrevem funcionalidades e regras financeiras que não correspondem integralmente ao produto atual.
3. O enquadramento da plataforma e a responsabilidade por conteúdo, contato e encontros não estão definitivamente estabelecidos.
4. Perfis adultos, localização, documentos, biometria e mídias elevam o impacto de fraude, vazamento e exposição indevida.
5. Persona e Didit coexistem; fornecedor e contratos de produção não foram confirmados.
6. Bases legais, transferências internacionais e prazos de retenção ainda precisam de aprovação.
7. A trilha específica de checkout não possui registros nem validação transacional posterior à implantação.
8. Preços e ofertas Premium apresentam listas que precisam ser harmonizadas.
9. Regras de cancelamento, arrependimento, reembolso, chargeback, recorrência e entrega do benefício precisam de confirmação.
10. Dados da promoção descontinuada não podem ser apagados sem política de retenção e análise de direitos adquiridos/evidências.
11. Age gate e autodeclaração podem ser insuficientes em situações de maior risco.
12. O canal jurídico é provisório e a configuração efetiva de produção de fornecedores não foi comprovada nesta revisão.

## 21. Divergências entre sistema atual e termos atuais

| Documento atual | Referência antiga | Estado atual do sistema | Ação recomendada ao advogado |
|---|---|---|---|
| Termos de Uso Gerais | anunciar imóvel; anunciantes/anfitriões; reservas | Páginas e APIs principais de imóveis/anfitriões foram retiradas. Estruturas de perfil e dados continuam preservadas. | Definir o destino do perfil Anfitrião e preparar nova redação coerente, sem apagar versões anteriores. |
| Termos para Clientes | imóveis, anfitriões e reservas imobiliárias | Fluxo público imobiliário não está disponível; zero reservas encontradas. | Retirar ou qualificar as referências na próxima versão aprovada. |
| Termos para Clientes | carteira e vouchers | Carteira/créditos ainda possuem superfícies; vouchers associados à roleta foram descontinuados. | Separar carteira/créditos atuais dos vouchers legados e retirar a promessa de voucher atual. |
| Termos para Anfitriões | cadastro, anúncio de imóvel, reserva, check-in, no-show e obrigações do anfitrião | Perfil/dados permanecem, mas o fluxo operacional e as telas foram retirados. | Não considerar o termo automaticamente inválido; decidir se será arquivado, suspenso ou refeito para eventual reativação. |
| Termos para Anfitriões e Política de Pagamentos | taxa de 10%, repasse de 90% e liberação em 24 horas úteis | Regras persistem em texto/modelo legado, sem módulo imobiliário atual disponível. | Não reafirmar como política atual; validar modelo comercial, tributação, prazo e responsabilidade antes de qualquer reativação. |
| Política de Privacidade | dados de anfitriões, propriedades e reservas | Dados históricos e estruturas permanecem; coleta operacional nova foi retirada com as telas. | Manter transparência sobre retenção histórica e distinguir tratamento atual de tratamento legado. |
| Política de Conteúdo e documentos correlatos | anúncios de imóveis e conteúdo de anfitriões | Publicação imobiliária não está disponível. | Ajustar o escopo da próxima versão, preservando cobertura de dados históricos e denúncias existentes. |
| Política de Prevenção a Fraudes | manipulação de voucher, anúncio inexistente e reserva simulada | Voucher da roleta e fluxo imobiliário foram descontinuados. | Manter apenas se necessário para investigação histórica; retirar como exemplo de funcionalidade corrente. |
| Política de Pagamentos e Política de Reembolso | reservas de anfitriões, repasse, disputa e no-show imobiliário | Fluxo atual de planos permanece; reserva imobiliária foi retirada. | Separar regras de planos atuais das regras históricas e validar cancelamento/reembolso dos produtos ativos. |
| Política da Roleta Promocional | roleta, giro, prêmios, vouchers, cupons e estoque | Recurso integralmente descontinuado; documento fora do catálogo público; dados preservados. | Arquivar formalmente, definir retenção e não republicar como política de produto atual. |
| Pacote operacional de 11/06/2026 | lista a Política da Roleta como documento público e descreve a promoção | O catálogo atual não contém essa política e a rota genérica não a publica. | Corrigir a próxima consolidação documental e preservar o pacote anterior como evidência histórica. |
| Política do Período Gratuito | promoção para profissionais | O inventário não confirmou descontinuação; existe como regra documental separada. | Confirmar com a empresa se a oferta ainda existe e, somente então, manter, atualizar ou arquivar. |

Não foi identificada outra funcionalidade seguramente inexistente, além dos módulos promocional da roleta/vouchers e operacional de imóveis/anfitriões. Carteira, créditos, planos, Premium, destaques, perfis, mídias, stories, avaliações e agendamentos profissionais não devem ser chamados de obsoletos com base neste inventário.

## 22. Questões que o advogado precisa decidir

1. Qual é a natureza jurídica exata da plataforma e quais atividades ela exclui?
2. Como delimitar responsabilidade por identidade, conteúdo, fraude, contato e encontro presencial?
3. Como descrever perfis e conteúdo adulto sem sugerir garantia, participação ou oferta ilícita?
4. Quais controles de maioridade/KYC são necessários em cada fluxo?
5. Qual protocolo aplicar a menoridade, exploração, coerção, tráfico, violência e autoridades?
6. Quais bases legais e prazos valem para biometria, documentos, mídia, localização, mensagens, pagamentos, denúncias, logs e aceites?
7. Quais fornecedores são operadores ou controladores e como tratar transferências internacionais?
8. Como comprovar consentimentos e aceites, tratar revogação e impedir sobrescrita de versões antigas?
9. Quais regras de cookies e analytics devem vigorar antes e depois da escolha?
10. Quais regras aplicar a cancelamento, arrependimento, reembolso, falha, chargeback e no-show?
11. Há recorrência? Quais preços, prazos, primeira compra e ofertas promocionais são efetivos?
12. O perfil Anfitrião e o negócio de imóveis estão definitivamente encerrados, suspensos ou planejados para reativação?
13. Como arquivar os termos de Anfitrião e a Política da Roleta e por quanto tempo reter os dados?
14. Como tratar os 4 vouchers históricos e qualquer benefício ainda marcado como disponível?
15. Qual processo de denúncia, retirada cautelar, suspensão, recurso e reincidência deve ser documentado?
16. Qual lei, jurisdição, foro, representante e canal jurídico devem constar?
17. Quais mudanças são materiais e exigirão novo aceite dos usuários existentes?

## 23. Documentos que precisam ser atualizados

### ALTERAÇÕES SUGERIDAS — AGUARDANDO APROVAÇÃO DO ADVOGADO

Nenhum texto novo foi publicado e nenhum documento vigente foi substituído. Recomenda-se ao advogado revisar, de forma coordenada:

- Termos de Uso Gerais, Termos para Clientes e Termos para Profissionais;
- decisão de arquivamento, suspensão ou atualização dos Termos para Anfitriões;
- Política de Privacidade, Cookies, KYC/Biometria, Retenção e Exclusão e Procedimento LGPD;
- Política de Conteúdo, Regras da Comunidade, Moderação/Denúncia, Maioridade e Antifraude;
- Política de Pagamentos, Cancelamento/Reembolso, Destaques e Período Gratuito;
- avisos de cadastro, KYC, documentos, upload e checkout;
- confirmação de maioridade e declaração de autoria/autorização;
- documentos internos de incidentes, acesso, segurança, administradores/moderadores, operadores e responsável operacional;
- arquivamento formal da Política da Roleta Promocional e tratamento dos vouchers históricos.

As revisões devem retirar a apresentação da roleta e dos vouchers como recursos atuais; resolver as referências a imóveis/anfitriões conforme decisão empresarial; alinhar preços, duração e ausência/presença de recorrência; esclarecer natureza da plataforma e responsabilidades; definir bases legais, fornecedores e retenção; e especificar evidências, notificação e reaceite. Não se propõem cláusulas jurídicas definitivas neste documento.

Uma nova versão dos termos será necessária para corrigir as divergências materiais. A necessidade e o alcance do reaceite dependem da avaliação do advogado, mas podem ser exigidos porque o sistema atual difere das funcionalidades e regras financeiras descritas nos textos vigentes.

## 24. Checklist para liberação jurídica

- [ ] Confirmar dados empresariais, representante, marca, domínio, canais e abrangência.
- [ ] Definir a natureza jurídica e os limites de atuação da plataforma.
- [ ] Confirmar quais perfis e funcionalidades estão ativos.
- [ ] Formalizar o estado de Anfitrião/imóveis sem apagar o histórico.
- [ ] Registrar que roleta e vouchers associados estão descontinuados.
- [ ] Aprovar retenção, anonimização e arquivamento dos dados promocionais históricos.
- [ ] Revisar em conjunto Termos Gerais, Cliente, Profissional e eventual documento de Anfitrião.
- [ ] Revisar Privacidade, Cookies, LGPD, KYC/Biometria, Retenção e Direitos do Titular.
- [ ] Aprovar regras 18+, conteúdo, autoria, denúncias, moderação, suspensão e recurso.
- [ ] Confirmar gateway, produtos, preços, duração, recorrência, impostos e suporte financeiro.
- [ ] Aprovar cancelamento, arrependimento, reembolso, chargeback e entrega do benefício.
- [ ] Testar ponta a ponta a evidência de checkout antes da liberação comercial.
- [ ] Definir se e como tratar pagamentos anteriores à estrutura de aceite, sem criar prova retroativa falsa.
- [ ] Validar contratos, papéis LGPD e transferências dos fornecedores.
- [ ] Aprovar tabela de retenção por categoria de dado.
- [ ] Aprovar versão, hash, vigência, publicação, comunicação e prova de cada documento.
- [ ] Definir quais mudanças materiais exigem reaceite e quais usuários serão alcançados.
- [ ] Preservar versões e aceites anteriores.
- [ ] Confirmar foro, jurisdição e canal jurídico.
- [ ] Registrar aprovação formal da empresa e do advogado antes de publicar.

### Situação de preparação

O material está consolidado para envio e decisão jurídica. A plataforma, o banco, os termos vigentes e o histórico Git não foram alterados nesta etapa. A liberação jurídica do produto permanece condicionada às decisões e aprovações acima.
