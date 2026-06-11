# Relatorio interno - raio X juridico, funcional e tecnico

**Plataforma:** Elite Modell
**Data do levantamento:** 9 de junho de 2026
**Status:** relatorio pre-implementacao, uso interno, nao publicar
**Escopo:** codigo, schema Prisma, migrations, telas, APIs, integracoes e fluxos existentes no workspace.

> AVISO OBRIGATORIO: as futuras minutas devem ser encaminhadas a advogado brasileiro com experiencia em direito digital, protecao de dados, direito do consumidor e plataformas de conteudo adulto antes da publicacao. Este relatorio nao constitui aprovacao juridica. Nenhum documento deve ser publicado em producao sem revisao e aprovacao formal dos responsaveis pela empresa.

## 1. Resumo executivo

A plataforma possui tres grupos comerciais principais: clientes, profissionais e anfitrioes/anunciantes de imoveis, alem de administradores e moderadores. O produto atua como plataforma de divulgacao, contato e interacao digital, mas seu papel nao se limita a um classificado neutro em todos os fluxos: em reservas de imoveis o codigo calcula taxa de servico de 10% e repasse de 90% ao anfitriao. Para profissionais, o contato e o agendamento sao registrados, mas nao foi encontrada comissao sobre o servico da profissional.

O sistema trata dados de alto risco: documentos, data de nascimento, selfie, verificacao facial por Persona, videos, conteudo adulto, dados bancarios, endereco exato, geolocalizacao, IP, user agent, denuncias e dados de pagamento. A governanca atual e insuficiente para esse nivel de risco. Nao existe inventario de retencao executavel, historico imutavel de aceites, area completa de direitos LGPD, exportacao de dados, fluxo completo de retirada emergencial ou moderacao automatizada efetiva.

Existem somente tres documentos publicos: Termos de Uso, Politica de Privacidade e Politica de Conteudo. Eles sao genericos e contem afirmacoes nao comprovadas pelo sistema, incluindo criptografia de ponta a ponta e prazos fixos de exclusao. O rodape principal exibe itens legais, mas os links apontam para `#`.

A cobranca profissional encontrada e de produtos opcionais de destaque. O plano Diamante possui opcao configurada em R$ 339,90 e texto equivalente a R$ 11,33/dia. Nao ha assinatura ou renovacao automatica implementada. O checkout Pix, contudo, nao apresenta nem registra todas as informacoes e aceites exigidos pelo pedido.

Ha uma divergencia operacional importante:

- migrations do acesso gratuito profissional ja foram aplicadas ao banco conectado;
- o workspace contem alteracoes ainda nao commitadas para trial configuravel, acesso legado e expiracao;
- essas alteracoes nao estavam confirmadas como publicadas em producao no momento deste levantamento.

Portanto, documentos juridicos nao podem descrever o trial como plenamente vigente em producao ate haver deploy e validacao ponta a ponta.

## 2. Funcionamento atual encontrado

### 2.1 Categorias de usuarios

| Categoria | Identificacao tecnica | Funcoes principais |
|---|---|---|
| Cliente | `User`, conta cliente | busca, favoritos, verificacao etaria, agendamentos, reservas, mensagens de reserva, vouchers e pagamentos |
| Profissional | `User` + `Professional` | perfil publico, fotos, video, agenda, contatos, stories, verificacao, planos e destaques |
| Anfitriao/anunciante | `User` + `HostProfile` | cadastro de imoveis, dados bancarios, reservas, mensagens e repasses |
| Administrador | `User.role=ADMIN` ou e-mail mestre | aprovacao, KYC, financeiro, denuncias, configuracoes, auditoria e operacao |
| Moderadores/suporte/financeiro | papel logico resolvido em `admin-access.ts` | permissoes por modulo; nao existe tabela propria de vinculo de papel administrativo |
| Visitante | sem conta | paginas publicas, idade, busca, perfis, imoveis e roleta |

### 2.2 Superficies publicas

- Home, login e cadastros.
- Cadastro de cliente, profissional e anfitriao.
- Callback OAuth e verificacao por telefone.
- Busca e listagem de profissionais.
- Perfil publico de profissional, incluindo contato e eventos de visualizacao.
- Busca, listagem e detalhe de imoveis.
- Roleta e vouchers para visitantes.
- Termos de Uso, Politica de Privacidade e Politica de Conteudo.
- Age gate 18+ salvo em `sessionStorage` e `localStorage`.

### 2.3 Superficies privadas

- Painel do cliente: perfil, verificacao, profissionais, favoritos, agendamentos, reservas, mensagens, carteira, planos, suporte e configuracoes.
- Painel profissional: criacao/edicao de perfil, publicacao, fotos, video, stories, agenda, metricas, listagem, configuracoes, trial e planos.
- Painel do anfitriao: perfil, imoveis, reservas, mensagens e dados operacionais.
- Painel administrativo: profissionais, KYC, clientes, anfitrioes, imoveis, denuncias, financeiro, vouchers, configuracoes, equipe e auditoria.

### 2.4 Fluxos principais

**Cadastro e login**

- OAuth/Supabase, Google OAuth e fluxo de telefone.
- Firebase Phone Auth com reCAPTCHA e alternativa OTP/Twilio no backend.
- Intencao de papel e cadastro pendente sao mantidos por 15 minutos em cookie e storage do navegador.
- O cadastro por telefone combina Termos e Privacidade em um unico checkbox e grava ambos como verdadeiros.
- Para profissional/anfitriao ha confirmacoes separadas de maioridade e titularidade do perfil.
- O checkbox "Aceito receber informacoes sobre meu cadastro" inicia pre-marcado. O texto nao define se e comunicacao operacional ou marketing e o valor nao integra um modelo de consentimento.

**Verificacao e aprovacao**

- Persona cria inquiry e processa documento, selfie/face match e checks.
- IDs, status, resultados e motivos sao armazenados localmente.
- Documentos enviados diretamente sao armazenados no bucket privado `documentos`.
- Administradores geram URL assinada de 60 segundos para visualizar qualquer caminho valido do bucket.
- Nao ha MFA obrigatorio para administradores.

**Publicacao profissional**

- Perfil depende de status e verificacao.
- Fotos, avatar, video de apresentacao e stories podem ser armazenados em buckets publicos.
- Nao existe aceite individual persistido antes de cada upload sobre autoria, maioridade das pessoas retratadas e ausencia de coercao.
- A moderacao de imagem e antivirus sao stubs: mesmo configurados, o codigo termina em `{ safe: true }`.

**Contato e negociacao**

- Cliente pode abrir contato/WhatsApp e registrar agendamento com profissional.
- Nao foi encontrada cobranca de comissao sobre o servico da profissional.
- Reservas de imovel possuem chat interno entre cliente e anfitriao.
- Reservas calculam taxa de servico de 10% e repasse de 90%, caracterizando participacao financeira da plataforma nesse fluxo.

**Suspensao e bloqueio**

- Usuario possui campos de bloqueio.
- Profissional possui estados de rascunho, pendente, ativo, pausado/rejeitado e regras de visibilidade.
- Denuncias podem mudar apenas de status no painel. Nao ha workflow integrado para retirada, preservacao de evidencia, SLA, prioridade maxima, recurso ou comunicacao.

**Exclusao**

- A conta so pode ser excluida sem pagamentos pendentes.
- O fluxo anonimiza parte de `User`, bloqueia a conta e remove sessoes, codigos de telefone, notificacoes e favoritos.
- Nao remove `Account` OAuth/tokens, perfil profissional, fotos, videos, stories, KYC, documentos no Storage, anfitriao, dados bancarios, imoveis, mensagens, reservas, agendamentos, reviews, denuncias ou eventos.
- Nao existe orquestracao de exclusao no Supabase Storage nem comprovante para o titular.

**Correcao e exportacao**

- Ha edicao parcial da conta e edicao dos perfis.
- Nao existe endpoint ou tela para exportacao integral.
- Nao existe consulta estruturada das finalidades, operadores ou historico de aceites.

## 3. Dados tratados

### 3.1 Matriz resumida

As bases abaixo sao sugestoes tecnicas para revisao juridica, nao conclusoes juridicas.

| Familia de dados | Titular | Finalidade atual | Coleta/origem | Armazenamento e acesso | Publico | Base sugerida | Retencao atual | Exclusao/exportacao |
|---|---|---|---|---|---|---|---|---|
| Nome, e-mail, telefone, cidade, estado | todos | conta, autenticacao, suporte e contato | cadastro/OAuth/telefone | PostgreSQL; usuario e admins | parcialmente | execucao de contrato; obrigacao aplicavel | sem politica executavel | anonimiza parte; sem exportacao |
| Data de nascimento e declaracao 18+ | todos/profissional | maioridade e acesso | cadastro/KYC | PostgreSQL; admins | idade pode aparecer no perfil | execucao de contrato, protecao e prevencao a fraude; revisar dado sensivel por contexto | sem prazo implementado | data de usuario e anonimizada; data profissional pode permanecer |
| CPF/CNPJ/documento textual | usuarios pagantes/profissionais | KYC e faturamento Asaas | conta, checkout, KYC | PostgreSQL e Asaas; admins | nao | contrato, obrigacao legal/regulatoria e fraude, conforme finalidade | indefinida | parcialmente anonimizado |
| Imagem de documento | profissional/anfitriao | identidade e maioridade | upload/KYC | Supabase privado e Persona; admins autorizados | nao | prevencao a fraude e seguranca; avaliacao juridica especifica | indefinida | nao removida pelo fluxo atual |
| Selfie, face match e biometria | profissional/anfitriao | identidade, maioridade e fraude | Persona | Persona e resultados no PostgreSQL | nao | dado sensivel; revisar bases dos arts. 11 e 14 quando aplicavel | depende do fornecedor e nao esta documentado | sem automacao local |
| Fotos, avatar, videos e stories | profissional | divulgacao do perfil | upload | Supabase publico; qualquer visitante | sim | execucao de contrato/licenca limitada; consentimento apenas quando juridicamente necessario e revogavel | perfil: indefinida; story: visibilidade 24h, arquivo pode permanecer | sem exclusao global de Storage |
| Perfil adulto, preferencias, caracteristicas fisicas, servicos e fetiches | profissional | busca e apresentacao | onboarding/edicao | PostgreSQL; publico e admins | sim, conforme campo | execucao de contrato; alta sensibilidade contextual e transparencia reforcada | indefinida | edicao parcial; exclusao incompleta |
| Endereco, bairro, CEP, latitude/longitude | anfitriao/imovel | publicacao e reserva | cadastro/geocodificacao | PostgreSQL; admins; parte publica | parcial | execucao de contrato e seguranca | indefinida | sem fluxo completo |
| Banco, agencia, conta e Pix | anfitriao | repasse | painel | PostgreSQL; admins | nao | execucao de contrato e obrigacoes financeiras | indefinida | nao removido |
| Pagamento, Pix, QR, IDs Asaas, URLs, valor e status | pagador | cobranca e conciliacao | checkout/webhook | PostgreSQL, Asaas e logs | nao | contrato, obrigacao legal e exercicio de direitos | indefinida; texto promete 5 anos sem job | preservado sem politica granular |
| IP, user agent, visitor ID | visitante/usuario/admin | seguranca, limite, vouchers e auditoria | headers/cookie | PostgreSQL e logs | nao | legitimo interesse sujeito a LIA; fraude/seguranca | cookie 180 dias; banco indefinido | sem interface de exclusao/exportacao |
| Eventos de perfil | visitante | metricas | endpoint publico | PostgreSQL, incluindo user agent | nao | legitimo interesse sujeito a LIA | indefinida | sem exclusao/exportacao |
| Mensagens, reservas, agendamentos e notas | clientes, profissionais, anfitrioes | executar interacoes | paineis | PostgreSQL; partes e admins conforme tela | nao | execucao de contrato e exercicio de direitos | indefinida | permanecem apos exclusao parcial |
| Denuncias, evidencias, revisoes e disputas | denunciantes e alvos | seguranca e moderacao | API/painel | PostgreSQL; admins | nao | legitimo interesse, exercicio de direitos e obrigacao legal quando aplicavel | indefinida | cascade se autor for removido; sem preservacao legal formal |
| Logs de auditoria | admins e alvos | responsabilizacao | acoes administrativas | PostgreSQL | nao | legitimo interesse, seguranca e exercicio de direitos | indefinida | apaga em cascade com admin |
| OAuth access/refresh/id tokens | usuario | autenticacao | provedores OAuth | tabela `Account` | nao | execucao de contrato e seguranca | enquanto conta/ligacao existir | nao removido pela exclusao atual |

### 3.2 Necessidade, obrigatoriedade e visibilidade

- Obrigatorios variam por fluxo, mas telefone, aceites, idade e titularidade sao exigidos no cadastro por telefone de anunciantes.
- CPF/CNPJ e exigido no checkout Pix profissional.
- Documentacao e verificacao sao exigidas para aprovacao.
- Campos de perfil, localizacao, atributos e conteudo podem ser publicos.
- Documento, selfie, banco, endereco exato, IP, logs e pagamento devem permanecer privados.
- Admins com permissoes amplas conseguem acessar dados de cadastro, KYC, financeiro e denuncias.
- A rota de documento exige `role=ADMIN`, mas nao usa a permissao granular `kyc:review` e aceita qualquer path nao traversal do bucket.

### 3.3 Operadores e terceiros encontrados

| Fornecedor/tecnologia | Uso encontrado | Dados possiveis | Estado |
|---|---|---|---|
| Supabase | Auth, PostgreSQL e Storage | conta, tokens, perfis, documentos e midia | ativo no codigo |
| Persona | KYC, documento, selfie e face match | identidade, documento, biometria e checks | ativo quando configurado |
| Asaas | Pix e cartao | identificacao fiscal, contato e pagamento | ativo quando configurado |
| Google OAuth | login | identidade basica e tokens | ativo quando configurado |
| Google Maps | mapas/geocodificacao | endereco/localizacao | configuravel |
| BigDataCloud | geocodificacao alternativa | endereco/localizacao ou consulta de rede | implementado |
| Firebase | Phone Auth e reCAPTCHA | telefone, dispositivo e verificacao | implementado |
| Twilio | OTP SMS/WhatsApp alternativo | telefone, codigo e metadados | implementado quando configurado |
| Resend | e-mail transacional | e-mail, template e metadados | implementado |
| Sentry | monitoramento de erros | erro, rota, dispositivo e contexto configurado | pacotes/configs presentes |
| Vercel | hospedagem e logs | requisicoes, IP e diagnosticos | implantacao indicada pelo projeto |
| Hetzner | documentacao de infraestrutura no repositorio | nao foi comprovado como runtime atual pelo codigo | confirmar com socios |

O `measurementId` do Firebase existe na configuracao, mas nao foi encontrado uso de Firebase Analytics. Nao deve ser listado como analytics ativo sem validacao no ambiente.

## 4. Avaliacao de legitimo interesse resumida

Finalidades candidatas: prevencao a fraude, seguranca, rate limiting, auditoria, metricas basicas e controle de abuso.

1. **Finalidade:** ha interesse real em impedir fraude, perfis falsos, abuso de vouchers e acesso indevido.
2. **Necessidade:** IP, user agent e identificador podem ser adequados, mas a plataforma deve minimizar granularidade, prazo e acesso. User agent em todo evento de perfil pode ser excessivo para metrica simples.
3. **Balanceamento:** usuarios de plataforma adulta possuem expectativa elevada de privacidade. O risco de discriminacao, exposicao e dano e significativo.
4. **Salvaguardas necessarias:** prazo definido, pseudonimizacao, restricao de acesso, transparencia, oposicao quando cabivel, nao reutilizacao para publicidade e revisao humana.

Conclusao preliminar: legitimo interesse pode ser defensavel para seguranca e fraude, mas nao deve cobrir genericamente marketing, biometria, publicacao de conteudo ou rastreamento extensivo. Elaborar LIA formal por finalidade.

Referencia oficial: Guia Orientativo da ANPD sobre Legitimo Interesse, publicado em 2024, e arts. 7, IX, e 10 da LGPD.

## 5. Minuta de escopo para RIPD

O tratamento de documento, biometria, conteudo adulto, localizacao e sinais de fraude exige Relatorio de Impacto antes da expansao.

O RIPD deve conter:

- agentes de tratamento e encarregado/canal;
- fluxograma entre Elite Modell, Supabase, Persona e administradores;
- categorias, volumes e titulares;
- paises e regioes de processamento;
- finalidade e base legal por operacao;
- necessidade e proporcionalidade;
- retencao no fornecedor e no banco local;
- risco de falso positivo, discriminacao, vazamento, acesso interno e reutilizacao;
- mecanismo de contestacao e revisao humana;
- controles de acesso, MFA, logs, criptografia e segregacao;
- resposta a incidente e retirada emergencial;
- procedimento para menor, coercao, trafico de pessoas e conteudo nao autorizado;
- risco residual e aprovacao formal.

## 6. Documentos existentes

### 6.1 Termos de Uso (`/terms`)

- Ultima data exibida: 11 de maio de 2026.
- Texto geral em portugues e ingles.
- Nao identifica razao social, CNPJ e endereco.
- Nao descreve os tres grupos de usuario, KYC/Persona, reservas, taxa de servico, trial, acesso legado, destaques, Asaas ou regras de moderacao.
- Usa limitacoes genericas de responsabilidade e foro de Sao Paulo que precisam de revisao consumerista.
- Afirma retencao financeira por cinco anos sem mecanismo correspondente.

### 6.2 Politica de Privacidade (`/privacy`)

- Ultima data exibida: 11 de maio de 2026.
- Afirma "criptografia de ponta a ponta", que nao foi demonstrada.
- Promete exclusao em 7/30/90 dias e retencao financeira em cinco anos sem jobs ou politica tecnica.
- Nao lista adequadamente Persona, Asaas, Supabase, Firebase, Twilio, Resend, Sentry, Vercel e geocodificacao.
- Nao descreve biometria, dados adultos, vouchers, IP/user agent, eventos de perfil ou transferencias internacionais.
- Nao oferece mecanismo de direitos nem inventario real de cookies.

### 6.3 Politica de Conteudo (`/politica-conteudo`)

- Afirma moderacao e retirada mais robustas que o codigo.
- Afirma botao de denuncia em qualquer perfil, nao comprovado nas telas publicas.
- Afirma verificacao previa ampla, embora os controles variem.
- Precisa separar publicacao, conteudo proibido, denuncia, emergencia, recurso e autoridades.

## 7. Documentos ausentes

Estao ausentes os 27 documentos e avisos adicionais solicitados, incluindo termos por categoria, cookies, KYC/biometria, regras da comunidade, moderacao, maioridade/exploracao, fraude, pagamentos, destaques, reembolso, trial, retencao, direitos LGPD, incidente, controles internos, DPA e avisos contextuais.

Nenhuma minuta deve ser criada para publicacao ate o preenchimento dos dados empresariais e decisoes juridicas.

## 8. Aceites, telas e checkboxes

### 8.1 Problemas encontrados

- `User` possui apenas booleans `termsConsent`, `lgpdConsent`, uma data e `termsVersion`.
- Nao ha tabela imutavel de aceite, hash, documento, idioma, tela, sessao, IP, user agent e revogacao.
- O cadastro por telefone usa um checkbox combinado e grava Termos e Privacidade simultaneamente.
- O aceite de KYC mistura ciencia/consentimento de identidade, maioridade, Termos e Privacidade.
- O age gate local diz que continuar representa concordancia, sem registro no servidor.
- Nao existe aceite antes de upload publico.
- Nao existe aceite no checkout de destaques.
- O checkbox "Aceito receber informacoes sobre meu cadastro" vem marcado por padrao e nao possui finalidade/registro claro.
- Nao existe consentimento opcional de marketing separado e revogavel.

### 8.2 Telas sem aceite suficiente

- Upload de foto, video, story e conteudo de imovel.
- Checkout profissional e checkouts legados.
- Contato/WhatsApp e registro de agendamento, quanto a compartilhamento de contato.
- Roleta para visitante, quanto a cookie de 180 dias.
- Mudancas relevantes de termos e reaceite.

## 9. Cookies e tecnologias semelhantes

| Tecnologia | Classe preliminar | Duracao/uso |
|---|---|---|
| NextAuth session cookie | necessario | sessao, expiracao do provedor |
| Supabase/Firebase/reCAPTCHA | necessario para autenticacao escolhida | conforme fornecedores |
| `elitemodell_login_role_intent` | preferencia/necessario ao fluxo | 15 minutos |
| `elitemodell_pending_registration` | necessario ao cadastro | 15 minutos |
| cookie de visitante da roleta | outros/campanha e antifraude | 180 dias, HttpOnly, SameSite Lax |
| age gate em local/session storage | necessario/regulatorio e preferencia | persistente ou sessao |
| cidade e rascunhos em local storage | preferencia/funcional | sem expiracao automatica |
| eventos de perfil com user agent | analytics proprio | retencao indefinida |
| Sentry | monitoramento/analytics tecnico | conforme configuracao externa |

Nao existe banner, central de preferencias ou link permanente de configuracao. O cookie da roleta e gravado na primeira consulta, sem escolha. Classificacao final e bloqueio previo dependem de revisao juridica e configuracao real dos fornecedores.

## 10. Cobrancas e checkout

### 10.1 Produtos profissionais

- Topo por uma hora: R$ 24,99.
- Pontos e pacotes de visibilidade com valores variaveis.
- Telefone na listagem: opcoes de R$ 9,99 a R$ 59,70.
- Bronze: opcoes de R$ 19,99 a R$ 79,90.
- Prata: opcoes de R$ 29,99 a R$ 109,80.
- Ouro: opcoes de R$ 39,99 a R$ 209,70.
- Diamante: opcoes de R$ 69,99 a R$ 339,90; a opcao de R$ 339,90 e apresentada como R$ 11,33/dia.
- Idade oculta: opcoes de R$ 19,99 a R$ 59,70.

Nao foi localizada taxa obrigatoria unica de aproximadamente R$ 11. O valor encontrado e uma apresentacao diaria do total de R$ 339,90 do Diamante. Os produtos sao tecnicamente opcionais, embora regras antigas de acesso possam ter induzido compra.

### 10.2 Pix e webhook

- Checkout cria `Payment` pendente e cliente/cobranca no Asaas.
- QR Code e copia e cola retornam ao frontend.
- Webhook valida token, consulta o pagamento no Asaas quando configurado e usa `WebhookEvent` para idempotencia.
- Ao confirmar, `applyPaidPaymentEffects` ativa o produto.
- Nao ha assinatura recorrente ou renovacao automatica.

### 10.3 Lacunas

- Falta inicio, fim estimado, preco diario com igual destaque, ausencia de garantia, ausencia de renovacao, reembolso e suporte.
- Falta aceite expresso e registro probatorio.
- A tela diz "cancelamento facil", mas nao existe cancelamento/estorno no Asaas.
- O admin "Cancelar" apenas muda pagamento local nao pago para `FAILED`.
- Nao ha fluxo de devolucao, pagamento duplicado ou conciliacao manual formal.
- Webhook duplicado e tratado; cobrancas duplicadas iniciadas pelo usuario ainda podem existir.
- `WebhookEvent.payload` guarda o payload integral por prazo indefinido.

## 11. Trial, gratuidade e acesso legado

O workspace implementa:

- prazo padrao de 30 dias, configuravel no admin;
- inicio apos primeira aprovacao;
- publicacao e uso normal durante o prazo;
- destaques opcionais;
- sem cobranca automatica;
- aviso de dias restantes;
- expiracao com retirada da busca/redirecionamento para planos;
- contas existentes marcadas como acesso legado.

As migrations relacionadas foram aplicadas ao banco conectado e 12 contas profissionais existentes foram marcadas como legadas no trabalho anterior. O codigo correspondente continua sem commit neste levantamento. Antes de documentar essa regra como vigente, publicar e testar a mesma revisao de codigo que corresponde ao schema do banco.

## 12. Moderacao, denuncia e retirada

- API de denuncia exige login, limita cinco por hora e evita duplicata pendente.
- Motivos incluem conteudo ilegal, perfil falso, assedio, golpe, inadequado e documento falso.
- Painel altera status para analisar, resolver ou arquivar.
- Campos `reviewedBy`, `reviewNotes` e `resolution` existem, mas o painel nao os preenche adequadamente.
- Nao ha prioridade automatica para menor, coercao, exploracao ou risco fisico.
- Nao ha retirada vinculada ao report, preservacao segregada, recurso, notificacao ao alvo ou SLA.
- Evidencias sao URLs fornecidas pelo usuario, sem ingestao segura ou congelamento.
- A moderacao automatizada e antivirus nao estao realmente implementados.

## 13. Seguranca da informacao

### Controles positivos

- autenticacao via NextAuth/Supabase/Firebase;
- RBAC logico para areas administrativas;
- buckets privados para documentos;
- URLs assinadas de 60 segundos;
- validacao de tipo, assinatura binaria e tamanho de upload;
- rate limiting em rotas sensiveis;
- webhook com token e idempotencia;
- headers de seguranca e HTTPS/HSTS na configuracao;
- segredos por variaveis de ambiente;
- auditoria para algumas acoes administrativas.

### Lacunas

- e-mail mestre de emergencia hardcoded concede admin;
- nao ha MFA obrigatorio para admin;
- rota de documento ignora permissao granular;
- moderacao/antivirus sao bypass;
- nao foi encontrada remocao de EXIF/metadados;
- buckets de midia sao publicos e URLs permanentes;
- exclusao nao remove arquivos;
- tokens OAuth permanecem apos exclusao;
- logs de auditoria somem em cascade se o admin for excluido;
- IP e user agent nao sao registrados consistentemente nas acoes;
- nao ha evidencias versionadas de backup/restauracao ou teste de recuperacao no codigo;
- nao ha politica de sessoes/dispositivos e revogacao seletiva;
- CSP permite `unsafe-inline` e `unsafe-eval`;
- alguns logs de integracao podem incluir respostas de fornecedor;
- recuperacao de senha informa que ainda precisa ser conectada;
- nao ha plano operacional de incidente no repositorio.

Para incidentes com risco ou dano relevante, a regra operacional deve considerar a Resolucao CD/ANPD 15/2024 e o prazo regulatorio aplicavel de comunicacao. O plano final deve ser validado juridicamente.

## 14. Divergencias entre codigo, banco e textos

| Divergencia | Impacto |
|---|---|
| Politica promete criptografia ponta a ponta | afirmacao tecnica nao comprovada |
| Politica promete exclusao em prazos fixos | fluxo atual deixa grande volume de dados e arquivos |
| Termos prometem cinco anos para transacoes | nao ha rotina de retencao/expurgo |
| Politica diz haver report em qualquer perfil | interface publica nao comprova cobertura |
| Politica descreve moderacao efetiva | provider e antivirus sao TODO/bypass |
| Checkout diz cancelamento facil | nao ha estorno/cancelamento Asaas |
| KYC diz registrar data, hora e versao | registro e agregado e insuficiente |
| Rodape mostra links legais | apontam para `#` |
| Trial esta no banco/workspace | deploy nao confirmado |
| RBAC administrativo existe | e-mail hardcoded contorna a origem normal do papel |
| Stories expiram visualmente em 24h | nao foi encontrada remocao do arquivo no Storage |

## 15. Classificacao de riscos

### Criticos

1. Exclusao LGPD incompleta e divergente da politica publicada.
2. Tratamento de biometria/documentos sem governanca de retencao, RIPD e transparencia suficiente.
3. Moderacao e antivirus declarados, mas tecnicamente em bypass.
4. Administrador mestre por e-mail hardcoded e ausencia de MFA.
5. Documentos juridicos publicos descrevem controles e prazos inexistentes.
6. Midia adulta publica sem declaracoes probatorias por upload e sem retirada emergencial completa.

### Altos

1. Aceites sobrescritiveis e sem historico imutavel.
2. Checkout sem aceite, versao, IP, sessao, inicio/fim e regras de reembolso.
3. Conta excluida mantem tokens OAuth, KYC, perfil e arquivos.
4. Auditoria apagavel em cascade e cobertura parcial.
5. Cookie de campanha por 180 dias e eventos com user agent sem central de preferencias.
6. Denuncias sem prioridade de risco, preservacao, retirada e recurso.
7. Painel financeiro pode ativar manualmente pagamento sem trilha de auditoria aparente.
8. Papel da plataforma em reservas e taxa de 10% nao aparece nos textos.

### Medios

1. Rodape e redes sociais usam links `#`.
2. Checkbox de comunicacao pre-marcado e finalidade ambigua.
3. Sem exportacao de dados.
4. Sem revogacao de marketing/consentimentos opcionais.
5. Sem prazo tecnico por categoria.
6. Logs e payloads de webhook sem minimizacao/expurgo.
7. Recuperacao de senha incompleta.
8. Google/Firebase/Sentry e transferencias nao transparentes.

### Baixos

1. Nomenclatura inconsistente entre Elite Model e Elite Modell.
2. Links quebrados como `/termos` em vez de `/terms`.
3. Texto de pagamento usa linguagem de cancelamento incompativel com produto pre-pago.
4. Campos de schema existem mas nao sao usados em resolucao de denuncia.

## 16. Recomendacoes por ordem

1. Congelar publicacao de novos textos juridicos e corrigir afirmacoes factualmente falsas mais urgentes.
2. Confirmar empresa, CNPJ, endereco, canais, encarregado, operadores, paises e contratos.
3. Publicar/validar o trial na mesma versao de codigo e banco.
4. Criar `LegalDocumentVersion`, `UserAcceptance`, `PrivacyRequest`, `ConsentPreference`, `ContentDeclaration`, `ModerationCase` e `DataDeletionJob`.
5. Implementar exclusao por fila com Storage, fornecedores, bloqueio legal e comprovante.
6. Implementar exportacao e area "Privacidade e meus dados".
7. Separar declaracoes, Termos, ciencia da Privacidade, KYC e marketing.
8. Ajustar checkout e registrar evidencia completa.
9. Implementar moderacao/antivirus reais ou bloquear upload publico em producao.
10. Remover admin hardcoded, exigir papel persistido e MFA.
11. Criar matriz de retencao executavel e jobs de expurgo.
12. Criar workflow de denuncia com prioridade, retirada, evidencia, revisao e recurso.
13. Elaborar LIA, RIPD, plano de incidente e contratos com operadores.
14. So entao redigir, revisar e publicar documentos versionados.

## 17. Arquivos previstos para alteracao

Lista inicial, sujeita a refinamento apos aprovacao:

- `prisma/schema.prisma` e novas migrations.
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/politica-conteudo/page.tsx`.
- novas paginas em `src/app/legal/*`.
- `src/components/Footer.tsx` e componentes de cookies.
- cadastros em `src/app/(auth)` e `src/components/auth`.
- KYC em `src/app/(dashboard)/verificacao`, `src/app/api/kyc` e `src/lib/persona*`.
- uploads em `src/app/api/upload/route.ts` e paineis de publicacao.
- checkout em `src/app/(dashboard)/profissional/planos/page.tsx` e APIs de pagamento.
- conta/privacidade em `src/app/(dashboard)/dashboard/configuracoes` e APIs de usuario.
- denuncias no perfil publico, `src/app/api/reports` e painel admin.
- autenticacao/admin em `src/lib/admin-access.ts`, middleware/proxy e painel de equipe.
- auditoria, retencao, exportacao e exclusao em novos modulos server-only.
- e-mails transacionais e templates de reaceite, incidente e solicitacoes.

## 18. Tabelas e migrations necessarias

### Tabelas sugeridas

- `LegalDocument`
- `LegalDocumentVersion`
- `UserAcceptance`
- `ConsentPreference`
- `PrivacyRequest`
- `PrivacyRequestEvent`
- `ContentDeclaration`
- `CheckoutAcceptance`
- `ModerationCase`
- `ModerationCaseEvent`
- `EvidenceArtifact`
- `DataRetentionRule`
- `DataDeletionJob`
- `SecurityIncident`
- `AdminRoleAssignment`
- `AdminMfaEnrollment` ou integracao com IdP

### Ajustes sugeridos

- impedir cascade destrutivo de `AuditLog`;
- vincular `Report` ao revisor e resolucao;
- adicionar metadados probatorios ao pagamento/checkout;
- adicionar datas de remocao e bloqueio legal;
- adicionar versao/configuracao efetiva do trial;
- adicionar indices por titular, documento, status e expiracao;
- limitar payload bruto de webhook e definir expurgo;
- modelar marketing separado de comunicacao operacional.

## 19. Novas rotas/APIs previstas

- `GET /api/legal/documents/current`
- `POST /api/legal/acceptances`
- `GET /api/me/acceptances`
- `GET/PATCH /api/me/privacy/preferences`
- `POST /api/me/privacy/export`
- `POST /api/me/privacy/delete`
- `GET /api/me/privacy/requests/:id`
- `POST /api/content/declarations`
- `POST /api/reports/emergency`
- `PATCH /api/admin/moderation/cases/:id`
- `POST /api/admin/moderation/cases/:id/preserve`
- `POST /api/admin/moderation/cases/:id/remove`
- `POST /api/admin/moderation/cases/:id/reverify`
- `POST /api/payments/:id/refund`
- `POST /api/payments/reconcile`
- `GET/PATCH /api/admin/legal/settings`
- `GET/PATCH /api/admin/retention`
- endpoints de MFA e revogacao de sessao conforme provedor escolhido.

## 20. Plano de testes

### Funcionais e juridicos

- cadastro dos tres perfis com checkboxes inicialmente desmarcados;
- bloqueio de menor e divergencia documental;
- links e versoes corretas;
- aceite imutavel, nova versao e reaceite;
- marketing recusado sem bloquear conta;
- KYC sem aviso/aceite bloqueado;
- upload sem declaracoes bloqueado;
- exportacao, correcao e exclusao;
- cookie rejeitado e configuracao persistente;
- denuncia comum e emergencia;
- retirada, preservacao, recurso e auditoria;
- trial de 30/60/90/personalizado, legado e expirado;
- compra durante trial e inicio informado;
- Pix pendente, pago, falho, duplicado e webhook duplicado;
- valor diario e total do Diamante;
- cancelamento, reembolso e ausencia de recorrencia.

### Seguranca

- cliente nao acessa documentos;
- profissional nao acessa outra profissional;
- admin sem `kyc:review` nao acessa documento/biometria;
- URL assinada expira e path pertence ao caso;
- arquivo excluido nao permanece no bucket/CDN;
- logs nao contem documento, token, selfie, QR completo ou payload sensivel;
- MFA administrativo;
- revogacao de sessao;
- rate limit distribuido;
- upload poliglota, MIME falso, malware e conteudo proibido;
- testes de autorizacao em todas as APIs;
- restauracao de backup;
- auditoria de alteracoes administrativas.

### Regressao

- busca, perfil, contato, agendamento, reserva, mensagem, voucher e pagamentos;
- visibilidade de profissional durante trial e legado;
- indexacao/SEO apos retirada;
- mobile/desktop e acessibilidade dos avisos.

## 21. Campos pendentes dos socios

Todos os itens abaixo impedem publicacao das minutas:

- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Razao social.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Nome fantasia oficial.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` CNPJ.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Endereco.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` E-mail de suporte.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` E-mail/canal de privacidade.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Telefone.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Encarregado ou responsavel.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Lista contratual dos operadores.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Paises/regioes de processamento e suboperadores.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Prazos aprovados de retencao.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Regras finais de cancelamento/reembolso.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` SLA de suporte e privacidade.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Procedimento humano de moderacao 24/7 ou horario.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Valores e periodos comerciais aprovados.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Data de vigencia de cada documento.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Confirmacao do uso atual de Hetzner.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Retencao contratual da Persona.
- `[INFORMACAO PENDENTE - PREENCHER ANTES DA PUBLICACAO]` Politica de reserva, taxa de 10%, repasse e disputas.

## 22. Fontes juridicas oficiais para revisao

- Lei Geral de Protecao de Dados Pessoais, Lei 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Marco Civil da Internet, Lei 12.965/2014: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- Portal de legislacao e guias da ANPD: https://www.gov.br/anpd/pt-br
- Regulamento de comunicacao de incidente de seguranca, Resolucao CD/ANPD 15/2024: https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-15-de-24-de-abril-de-2024-556243024
- Regulamento para agentes de pequeno porte e criterios de alto risco, Resolucao CD/ANPD 2/2022: https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-2-de-27-de-janeiro-de-2022-376562019

## 23. Decisao de implementacao

Conforme a Etapa 14 solicitada, este relatorio foi produzido antes da implementacao juridica. Nenhuma pagina legal, checkbox, cookie, checkout, fluxo de denuncia ou texto publico foi alterado nesta etapa.

Proxima decisao necessaria: aprovacao interna do diagnostico, preenchimento dos campos empresariais e definicao das regras de retencao, moderacao e reembolso. Depois disso, a implementacao deve ocorrer em etapas pequenas, versionadas, testadas e submetidas a revisao juridica antes do deploy.

## IMPLEMENTACAO REALIZADA

Atualizacao de 9 de junho de 2026. Esta secao nao apaga nem substitui o diagnostico anterior.

### Etapas concluidas tecnicamente

- Removido o administrador mestre hardcoded do runtime.
- Criados papeis administrativos persistentes e permissoes granulares.
- Backfill seguro do administrador existente para `ADMIN_MASTER`.
- MFA TOTP obrigatorio para o painel administrativo, com segredo criptografado e sessao curta.
- Auditoria preservada quando o administrador e removido.
- Rota de documentos protegida por `kyc:review`, MFA, vinculo ao caso e auditoria.
- Upload publico bloqueado em producao enquanto nao existir provedor real de malware e moderacao.
- Removidas afirmacoes publicas de criptografia ponta a ponta, prazos fixos e cancelamento facil.
- Criadas tabelas juridicas, de privacidade, moderacao, retencao, exclusao e incidentes.
- Aceites e versoes publicadas protegidos contra alteracao retroativa por trigger.
- Criados 31 documentos como rascunho versionado, incluindo a minuta interna do ato de indicacao, com hash e publicacao bloqueada.
- Criada central `Admin > Juridico e Privacidade`.
- Criada barreira etaria no proxy para perfis, busca, imoveis e APIs sensiveis.
- Perfis e imoveis removidos do sitemap e bloqueados em robots.
- Stories publicos exigem sessao com maioridade verificada.
- Cadastro por telefone separa Termos e Privacidade; marketing inicia desmarcado.
- Criados exportacao estruturada, central de privacidade e solicitacao assincrona de exclusao.
- Checkout profissional registra confirmacoes, total, diaria, inicio, fim, IP, user agent e sessao em hash.
- Criado canal de denuncia sem login, protocolo e prioridade emergencial.
- Criado banner de cookies e bloqueio da roleta sem consentimento.
- Mantida a implementacao anterior de trial configuravel e acesso legado para 12 contas.

### Migrations aplicadas

- `20260609130000_professional_free_access`
- `20260609133000_professional_access_fail_safe`
- `20260609150000_admin_security_foundation`
- `20260609160000_legal_privacy_foundation`

O comando `prisma migrate status` confirmou 17 migrations aplicadas e schema atualizado.

### Tabelas criadas

`AdminRoleAssignment`, `AdminMfaEnrollment`, `AdminMfaSession`, `LegalDocument`,
`LegalDocumentVersion`, `UserAcceptance`, `ConsentPreference`, `PrivacyRequest`,
`PrivacyRequestEvent`, `ContentDeclaration`, `CheckoutAcceptance`, `ModerationCase`,
`ModerationCaseEvent`, `EvidenceArtifact`, `DataRetentionRule`, `DataDeletionJob` e
`SecurityIncident`.

### Paginas e APIs criadas

- `/admin/mfa`
- `/admin/juridico`
- `/dashboard/privacidade`
- `/verificacao-idade`
- `GET /api/users/me/export`
- `POST /api/users/me/delete` agora cria solicitacao assincrona
- `POST /api/moderation/report`

### Riscos criticos resolvidos

- e-mail administrativo hardcoded;
- auditoria apagada em cascade;
- acesso generico a documento privado;
- simulacao de moderacao/antivirus em producao;
- afirmacoes publicas tecnicamente falsas identificadas;
- entrega de stories e rotas sensiveis sem verificacao de idade pelo servidor.

### Riscos altos resolvidos ou reduzidos

- estrutura imutavel de versoes e aceites: implementada;
- checkout probatorio: implementado para planos profissionais, sem reembolso real;
- cookie da roleta antes da escolha: bloqueado;
- denuncia emergencial anonima: implementada;
- exportacao: implementada;
- exclusao: recebimento e fila implementados, processamento completo pendente.

### Riscos restantes

- buckets antigos ainda possuem URLs publicas permanentes;
- fornecedor real de malware/moderacao ainda nao implementado;
- `DataDeletionJob` ainda nao possui worker completo de Storage e fornecedores;
- reembolso/cancelamento real no Asaas ainda nao implementado;
- preservacao de evidencia ainda nao possui upload privado pela interface;
- fluxo completo de recurso e notificacoes de moderacao esta pendente;
- transparencia e aceites de reservas com taxa de 10% estao pendentes;
- banner ainda nao controla inicializacao do Sentry/Firebase por categoria;
- verificacao especializada de visitante sem conta depende de fornecedor;
- drafts juridicos sao estruturas iniciais, nao minutas aprovadas;
- MFA nao possui recovery codes operacionais;
- recuperacao de senha, dispositivos e revogacao seletiva geral estao pendentes.

### Testes e resultados

- `prisma validate`: aprovado.
- `prisma migrate deploy`: aprovado.
- `prisma migrate status`: banco atualizado.
- `tsc --noEmit`: aprovado antes da ultima rodada; deve ser repetido no pipeline final.
- ESLint dos modulos de seguranca: aprovado.
- ESLint global: encontrou erro preexistente em `dashboard/acompanhantes` e warnings antigos.
- Build de producao: nao concluiu em limites de 4 e 6 minutos; nao considerar aprovado.
- E2E, autorizacao, mobile, acessibilidade, malware e Lei 15.211/2025: pendentes.

### Matriz de adequacao legal resumida

| Tema | Norma | Situacao anterior | Alteracao | Evidencia | Status | Pendencia juridica |
|---|---|---|---|---|---|---|
| Governanca de dados | LGPD | sem historico imutavel | versoes, aceites e preferencias | schema/migration 160000 | implementado tecnicamente | bases e textos |
| Direitos do titular | LGPD arts. 18 e 19 | sem exportacao/fila | exportacao e protocolo | APIs `/export` e `/delete` | parcialmente implementado | escopo de preservacao |
| Seguranca | LGPD arts. 46-49 | admin hardcoded/sem MFA | RBAC persistente e TOTP | migration 150000 | implementado tecnicamente | politica interna |
| Incidentes | LGPD e Res. 15/2024 | sem modulo | tabela `SecurityIncident` | schema | parcialmente implementado | procedimento e prazos |
| Encarregado | Res. 18/2024 | dados ausentes | campos ambientais obrigatorios | `legalPendingFields` | pendente dos socios | nomeacao e divulgacao |
| Consumidor | CDC/Dec. 7.962/2013 | checkout incompleto | total, duracao e confirmacoes | `CheckoutAcceptance` | parcialmente implementado | cancelamento/reembolso |
| Logs | Marco Civil | retencao indefinida | regras `PENDING` | `DataRetentionRule` | parcialmente implementado | prazos |
| Protecao de menores | ECA/Lei 15.211/2025 | age gate local | bloqueio no servidor e SEO | proxy/robots/sitemap | parcialmente implementado | fornecedor e regulamentacao |
| Denuncia | ECA/Lei 15.211/2025 | login e motivos limitados | canal anonimo emergencial | `/api/moderation/report` | parcialmente implementado | autoridades/SLA |

### Matriz de adequacao a Lei 15.211/2025

| Requisito | Antes | Mudanca | Arquivo/evidencia | Status | Pendencia |
|---|---|---|---|---|---|
| Nao depender de autodeclaracao | localStorage/modal | token adulto no servidor | `proxy.ts`, `auth.ts` | parcialmente implementado | fornecedor para visitante |
| Nao entregar midia antes da verificacao | APIs publicas | stories e rotas bloqueadas | API stories/proxy | parcialmente implementado | URLs antigas de bucket |
| Evitar indexacao | perfis no sitemap | removidos e `disallow` | sitemap/robots | implementado | remocao em buscadores |
| Profissional verificada | status variavel | token exige KYC aprovado | `auth.ts` | implementado | testes E2E |
| Denuncia de menor | motivo generico | emergencia e protocolo | ModerationCase | implementado | workflow completo |
| Preservacao restrita | URL externa | modelo EvidenceArtifact | schema | parcialmente implementado | upload seguro |

### Instrucoes aos socios

Preencher as variaveis `LEGAL_*`, contratar/confirmar fornecedores de verificacao etaria,
malware e moderacao, definir retencao, reembolso, SLA e canais. Nao publicar os drafts.

### Instrucoes ao advogado

Revisar bases legais, papel da plataforma nas reservas, biometria, Lei 15.211/2025 e
Decreto 12.880/2026, comercio eletronico, reembolso, retencao, comunicacao de incidentes
e procedimento de autoridades. Registrar nome, data, nota e referencia no admin.

### Deploy e rollback

Nao houve deploy. Antes dele: repetir TypeScript, ESLint, build, E2E, backup e teste de
restauracao. As migrations sao aditivas; rollback de banco deve preservar aceites,
auditoria, protocolos e documentos. Consulte `PLANO_ROLLBACK_IMPLEMENTACAO_JURIDICA.md`.
