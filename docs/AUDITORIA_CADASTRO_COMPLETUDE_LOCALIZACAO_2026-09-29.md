# Auditoria do cadastro profissional, completude e localização

Data: 29/09/2026  
Produção: https://www.elitemodell.com.br

## Diagnóstico anterior à migration

`ROOT_CAUSE_STEP_BYPASS =` o wizard validava o botão no navegador, gravava o avanço no `localStorage` e não persistia cada etapa no servidor. Era possível retomar um número de etapa local ou retornar da Didit em uma etapa posterior sem uma confirmação do backend para todas as etapas anteriores.

`ROOT_CAUSE_COMPLETENESS =` existiam regras diferentes no formulário, no endpoint final e no Admin. KYC, completude do perfil e moderação eram exibidos em conjunto, embora fossem estados independentes. O Admin podia calcular uma pendência que o envio não calculava da mesma forma.

## Mapa auditado

`REGISTRATION_STEPS =` 1 Dados pessoais; 2 Aparência; 3 Atendimento; 4 Serviços; 5 Valores; 6 Contato; 7 Fotos; 8 Identidade/Didit; 9 Revisão e envio.

`REQUIRED_FIELDS_BY_STEP =`

1. nome profissional, biografia mínima, categoria, cidade e UF de atendimento;
2. data de nascimento válida e maioridade;
3. tipo de atendimento, público atendido e dias disponíveis;
4. ao menos um serviço/especialidade;
5. ao menos um valor e uma forma de pagamento;
6. WhatsApp válido com DDD;
7. foto principal controlada pela plataforma;
8. sessão Didit com decisão aprovada;
9. nova validação integral, e-mail confirmado e envio explícito.

`OPTIONAL_FIELDS_BY_STEP =` bairro/placeId; altura, peso e características físicas; idiomas e horários; fetiches; valores adicionais; telefone, Instagram e site; fotos adicionais; nenhum dado de KYC é inventado.

`CURRENT_STEP_VALIDATION =` React fornece retorno imediato e a rota `PATCH /api/professionals/draft` repete a regra central, salva a etapa e somente depois autoriza o avanço.

`SERVER_SIDE_VALIDATION =` cada etapa usa `professionalCompletion`; o endpoint final repete a validação integral e consulta a decisão Didit autoritativa.

`CAN_SKIP_REQUIRED_STEP = false`

`CAN_ADVANCE_WITH_REQUIRED_FIELDS_MISSING = false`

`CAN_SUBMIT_INCOMPLETE_PROFILE = false`

`PROFILE_COMPLETENESS_SOURCE = src/lib/professional-completeness.ts`

`ADMIN_MISSING_FIELDS_SOURCE = src/lib/professional-completeness.ts`

`KYC_REQUIRED_BEFORE_SUBMIT = true`

`PHONE_VERIFICATION_EXISTS = true` na criação/autenticação da conta; o cadastro profissional também valida o WhatsApp informado.

`EMAIL_VERIFICATION_EXISTS = true` e é requisito separado no envio final.

`FINAL_SUBMIT_EXISTS = POST /api/professionals`

`SUBMITTED_AT_EXISTS = registrationSubmittedAt`, preenchido no envio e reenvio real.

`CURRENT_LOCATION_MODEL =` localização da conta/identidade permanece separada da área pública de atendimento e da localização temporária.

`CURRENT_CITY_MODEL = currentServiceCity/currentServiceState`, com fallback legado para `city/state`.

`CURRENT_NEIGHBORHOOD_MODEL = currentServiceNeighborhood/additionalServiceNeighborhoods`, com fallback legado para `bairro`.

`CURRENT_EMAIL_NOTIFICATIONS =` Resend existente, notificação interna e auditoria `EMAIL_SENT`/`EMAIL_FAILED`; `EMAIL_DELIVERED` depende de webhook de entrega do provedor e não é inferido.

## Implementação

`REGISTRATION_FLOW_FIXED =` o botão Continuar aguarda validação e persistência da etapa. A retomada abre a primeira etapa incompleta calculada no servidor. A correção administrativa mostra os campos selecionados e atalhos para suas etapas.

`FINAL_SERVER_VALIDATION =` validação integral centralizada, mídia aprovada, e-mail confirmado e decisão Didit real. O envio é idempotente para `PENDING_REVIEW`.

`EMAIL_NOTIFICATIONS =` envio, KYC que requer ação, correção, aprovação, reprovação, lembrete e alteração de cidade usam o provedor existente. E-mail ausente/inválido gera `EMAIL_FAILED`.

`LOCATION_SYSTEM =` painel próprio para cidade/UF/bairro atual, bairros adicionais, locais de atendimento, GPS sob ação explícita e histórico. Endereço residencial e coordenadas não entram nas respostas públicas.

`TEMPORARY_TRAVEL_MODE =` cidade temporária com início/fim, ativação no período, restauração automática da localização anterior e histórico.

`CITY_CHANGE_SECURITY =` conta autenticada, estado de KYC, frequência de mudanças e alteração interestadual geram `LOCATION_REVIEW_REQUIRED`; o Admin aprova ou rejeita. Não há biometria caseira.

`ADMIN_REVIEW =` completude percentual e pendências centrais, mídia/KYC, histórico administrativo, histórico de localização, comunicação, lembrete com limite de 24 horas e campos obrigatórios para solicitar correção.

`LEGACY_COMPATIBILITY =` registros existentes permanecem com `completionRulesVersion = 1`; dados atuais usam versão 2. Perfis `ACTIVE` antigos não são desativados por colunas novas vazias. Datas históricas ausentes aparecem como não registradas.

`MIGRATIONS =` migration aditiva `20260929170000_professional_completion_and_location`; nenhum `DROP`, renomeação destrutiva ou preenchimento fictício.

## Validação

`TEST_RESULTS =` 51 testes profissionais aprovados, incluindo 19 cenários novos de completude/localização. TypeScript sem erros. ESLint sem erros e com 8 avisos preexistentes fora do escopo principal.

`BUILD_RESULT =` build Next.js 16 de produção aprovado.

## Privacidade e limites

- O cliente vê cidade, UF, bairro/região e formas de atendimento permitidas.
- O cliente não recebe endereço residencial, latitude ou longitude.
- GPS é pontual e depende de consentimento pelo botão; não existe rastreamento contínuo.
- Documentos/selfie permanecem nas rotas administrativas protegidas e na infraestrutura de mídia controlada.
- O status de entrega real do e-mail só pode ser chamado `EMAIL_DELIVERED` quando um webhook do Resend o confirmar.
