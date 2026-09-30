# Auditoria do fluxo de cadastro profissional e revisão administrativa

Data da auditoria: 29/09/2026.

## Inventário solicitado

`CURRENT_REGISTRATION_STEPS =` Telefone e consentimentos; código OTP; criação/autenticação da conta; Dados; Aparência; Atendimento; Serviços; Valores; Contato; Fotos; Verificação Didit; resumo e envio.

`CURRENT_REQUIRED_FIELDS =` telefone brasileiro validado no ingresso; consentimentos obrigatórios; e-mail confirmado; nome de exibição; bio com no mínimo 80 caracteres; cidade; UF; categoria; data de nascimento válida e maioridade; ao menos um tipo de atendimento; público atendido; um dia disponível; um serviço; um valor; uma forma de pagamento; WhatsApp válido; foto principal aprovada pelo pipeline de mídia; sessão Didit aprovada.

`CURRENT_PHOTO_FLOW =` uma foto principal obrigatória e até 20 fotos adicionais; JPG, PNG, WebP, HEIC ou HEIF; limite de 20 MB; upload em `profiles/main` e `profiles/gallery`; quarentena, varredura e moderação pelo pipeline existente; somente URLs controladas e aprovadas podem ser submetidas; a foto principal vira `cover` em `ProfessionalPhoto`.

`CURRENT_DIDIT_FLOW =` a etapa Verificação cria ou reutiliza uma sessão Didit vinculada ao ID do usuário por `vendor_data`; o retorno é consultado a cada 15 segundos e ao recuperar foco; o envio final consulta novamente a decisão diretamente na Didit, valida sessão, titularidade, ambiente live em produção, maioridade documental e decisão aprovada; o Admin repete essa conferência antes da aprovação. Documento, selfie e Face Match pertencem ao workflow da Didit e não são duplicados localmente.

`PHONE_VERIFICATION_EXISTS = YES`

`PHONE_VERIFICATION_PROVIDER = Twilio Verify no fluxo principal; compatibilidade existente com Firebase Phone Auth e provedores legados registrados em PhoneVerificationCode.`

`PHONE_VERIFICATION_REQUIRED = YES para quem entra pelo cadastro profissional atual.`

`WHERE_IN_FLOW = antes da criação/conclusão da conta e antes das nove etapas do perfil, nas rotas /cadastro-modelo e /cadastro/acompanhante.`

`CURRENT_FINAL_SUBMIT_FLOW =` o botão Enviar cadastro para análise valida novamente as nove etapas no cliente; o servidor valida schema, e-mail, mídia aprovada e decisão Didit; grava `PENDING_REVIEW` e o recibo na mesma transação; chamadas repetidas para um perfil pendente retornam o mesmo registro; a tela confirma 100% concluído e status Em análise.

`CURRENT_EMAIL_AFTER_SUBMIT =` Resend pelo módulo central de e-mail, com `ProfessionalSubmissionReceipt`, claim contra concorrência, tentativas, estado SENT/FAILED e chave de idempotência por tentativa.

`CURRENT_ADMIN_REVIEW_CAPABILITIES =` dados pessoais, contato, localização, área de atuação, perfil, galeria completa ampliável, serviços, especialidades, valores, disponibilidade, KYC, evidências privadas por URL temporária, decisão Didit detalhada, pendências, histórico, aprovar, solicitar correção, reprovar, suspender, bloquear, reativar, revisar vídeo e desativar boost.

`MISSING_ADMIN_DATA =` imagens hospedadas exclusivamente pela Didit e um campo Face Match separado, pois o endpoint de decisão atualmente usado não devolve essas URLs nem um resultado individual de Face Match. A interface informa essa limitação e não inventa evidências.

`STATUS_INCONSISTENCIES =` corrigido: `CORRECTION_REQUIRED` agora é distinto de `REJECTED`; solicitar correção preserva os estados KYC/documental; o reenvio volta para `PENDING_REVIEW` e gera auditoria e novo recibo. A falsa pendência cadastro ainda não enviado em perfis ativos foi removida. Quatro perfis ativos legados continuam sem `ProfessionalSubmissionReceipt`; o histórico não foi fabricado.

## Segurança e privacidade

- Evidências privadas permanecem protegidas pela permissão `kyc:review`.
- Arquivos locais são abertos por URL assinada de 60 segundos ou proxy autenticado sem cache.
- Toda abertura de evidência KYC gera `AuditLog` com administrador, IP e user-agent.
- A decisão Didit é consultada sob demanda, validada contra o usuário e reduzida aos campos necessários.
- Não foi criada comparação biométrica própria e nenhuma imagem Didit foi duplicada.

## Campos que continuam ausentes do schema

- CEP no perfil profissional.
- Endereços residencial e de atuação separados semanticamente.
- Raio de atendimento.
- Data canônica de conclusão anterior ao envio para cadastros legados.
- Campo separado de Face Match no contrato local da decisão Didit.

Nenhuma migração destrutiva foi executada. A única evolução de banco foi a adição do valor `CORRECTION_REQUIRED` ao enum de status profissional.
