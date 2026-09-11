# Maioridade, conteúdo, moderação e segurança

## Maioridade

- Regra declarada: plataforma exclusiva para pessoas com 18 anos ou mais.
- Cadastro exige data de nascimento e confirmação explícita de maioridade; funções de validação rejeitam idade inferior a 18.
- O token de sessão recebe `adultVerified`; o `proxy` bloqueia caminhos sensíveis e redireciona para verificação de idade.
- Cliente pode ter status `UNVERIFIED`, `PENDING_REVIEW`, `VERIFIED` ou `REJECTED`.
- Profissional passa por telefone, documentos/KYC, possível biometria e aprovação administrativa antes da publicação.
- Há age gate público e páginas de verificação; deve-se validar se o cookie/estado do visitante é prova suficiente e por quanto tempo permanece válido.

## Conteúdo e perfis

- Profissional cria perfil com descrição, valores, especialidades, agenda, fotos, vídeo de apresentação, publicações e stories.
- Uploads entram em quarentena, são vinculados ao proprietário e podem passar por antivírus/moderação automática ou manual antes de publicação.
- Envio de perfil, vídeo e stories exige declaração de autoria/autorização.
- Conteúdo público é servido por rota mediada; URLs diretas de storage não devem ser expostas.
- Estados profissionais: rascunho, revisão pendente, ativo, pausado, suspenso e rejeitado.
- Moderação prevê denúncias, casos, eventos e artefatos de evidência; admin pode aprovar/rejeitar documentos e conteúdo.
- Motivos de denúncia incluem conteúdo ilegal/inadequado, perfil falso, assédio, golpe, documentos falsos e outros.

## Conteúdo proibido observado nos textos atuais

Menores, exploração, coerção, tráfico, violência, ameaça, fraude, imagem íntima sem autorização, falsidade documental, deepfake enganoso, assédio, perseguição, exposição de dados e violação de direitos de imagem/propriedade intelectual.

## Questões para o advogado

- Definir critérios objetivos de suspensão, retirada cautelar, recurso, prazo de análise e notificação.
- Validar política de conteúdo adulto e limites da atividade anunciada.
- Definir procedimento de suspeita de menoridade/exploração e preservação/entrega de evidências.
- Validar suficiência do age gate para visitante e os níveis de verificação por risco.
- Definir licença de uso de conteúdo, direitos de imagem, prazo de exibição e consequências da revogação.
- Definir política para denúncia falsa, reincidência e comunicação às autoridades.

