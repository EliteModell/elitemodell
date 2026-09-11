# Política de privacidade atual — cópia técnica

Fonte: versão pública mais recente lida do banco em 10/09/2026. Versão `1.0-operational-2026-06-11`, status pendente de ratificação jurídica, publicada/vigente desde 11/06/2026.

## Conteúdo operacional atual

A política identifica ELITE MODEL LTDA, CNPJ 66.807.135/0001-71, como operadora da Elite Modell. Abrange visitantes, clientes, profissionais, anfitriões, administradores, representantes, prestadores, denunciantes e terceiros relacionados.

Declara tratamento possível de nome, e-mail, telefone, nascimento, maioridade, documento, CPF/CNPJ, endereço, cidade, localização aproximada, fotos, vídeos, selfie, verificação facial, biometria, perfil, anúncios, mensagens, favoritos, avaliações, reservas, pagamentos, comprovantes, identificadores de transação, IP, user agent, logs, cookies, preferências, consentimentos, denúncias, evidências, moderação, suporte e comunicações.

Finalidades declaradas: cadastro, autenticação, maioridade, antifraude, identidade, publicação/moderação, anúncios/agendamentos, pagamentos, suporte, segurança, obrigação legal, exercício regular de direitos, proteção de usuários, auditoria e prevenção de exploração.

Bases legais citadas: execução de contrato, obrigação legal/regulatória, exercício regular de direitos, legítimo interesse sujeito a avaliação, proteção da vida/incolumidade, prevenção à fraude em identificação/autenticação, consentimento quando exigido e demais hipóteses da LGPD. Biometria, documentos e verificações faciais são tratados como sensíveis, com proteção reforçada e acesso restrito.

Controles declarados: acesso restrito, autenticação, auditoria, segregação de permissões, retenção limitada e revisão humana. Direitos do titular: confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação de compartilhamento, revisão e demais direitos, pelo canal `privacidade@elitemodell.com.br`.

A política não fecha prazos numéricos de retenção: remete a necessidade operacional, obrigações legais, antifraude, segurança, defesa, auditoria, contabilidade e finanças, afirmando que a tabela final precisa ser aprovada antes da publicação.

## Processadores e integrações observados

- Supabase/PostgreSQL: banco, autenticação e storage.
- Prisma: camada de acesso ao banco.
- Persona e Didit: integrações de identidade/KYC presentes; configuração local aponta Persona em sandbox.
- Asaas: Pix e cartão; webhooks, conciliação, cancelamento e reembolso.
- Resend: e-mail transacional quando configurado.
- Firebase: autenticação/telefone no cliente.
- Twilio Verify, WhatsApp Cloud e Zenvia: alternativas de OTP/comunicação quando configuradas.
- Google Maps: geocodificação/busca de endereço.
- Sentry e Vercel Analytics/Speed Insights: observabilidade/analytics quando configurados.
- Cloudflare Turnstile ou reCAPTCHA: CAPTCHA quando configurado.
- Upstash Redis: rate limiting quando configurado.
- ClamAV ou endpoint HTTP: antivírus/moderação quando configurado.

## Lacunas para decisão

- Tabela de retenção por categoria, finalidade, base legal e evento inicial/final.
- Papel de controlador/operador de cada fornecedor, suboperadores, transferência internacional e cláusulas contratuais.
- Gestão de cookies por categoria; o mecanismo atual guarda preferência em cookie local, mas a tabela `ConsentPreference` exige usuário autenticado.
- Procedimento verificável para acesso, correção, portabilidade, oposição, revogação e eliminação.
- Tratamento de biometria/KYC, prazo de retenção dos documentos e revisão de decisões automatizadas.
- Atualização da lista de funcionalidades e perfis descontinuados.

## Transcrição integral das disposições operacionais vigentes

A ELITE MODEL LTDA, CNPJ 66.807.135/0001-71, operadora da plataforma Elite Modell, poderá tratar dados pessoais de visitantes, clientes, profissionais, anfitriões, administradores, representantes, prestadores, denunciantes e terceiros relacionados às funcionalidades da plataforma.

Os dados tratados poderão incluir nome, e-mail, telefone, data de nascimento, declaração de maioridade, documento de identificação, CPF/CNPJ quando necessário, endereço, cidade, geolocalização ou localização aproximada, fotos, vídeos, selfie, verificação facial, biometria quando aplicável, informações de perfil, anúncios, mensagens, favoritos, avaliações, reservas, pagamentos, comprovantes, identificadores de transação, IP, user agent, logs, cookies, preferências, consentimentos, denúncias, evidências, histórico de moderação, solicitações de suporte e comunicações.

As finalidades do tratamento incluem cadastro, autenticação, controle de maioridade, prevenção a fraude, verificação de identidade, publicação e moderação de perfis, operação de anúncios e reservas, processamento de pagamentos, suporte, segurança, cumprimento de obrigação legal, exercício regular de direitos, proteção de usuários, auditoria, prevenção de exploração e atendimento a solicitações de titulares.

As bases legais aplicáveis a cada finalidade incluem execução de contrato, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse com avaliação apropriada, proteção da vida ou da incolumidade física, prevenção à fraude e segurança do titular em processos de identificação e autenticação, consentimento quando exigido e outras hipóteses previstas na LGPD. Dados sensíveis, especialmente biometria, documentos e verificações faciais, recebem proteção reforçada e acesso restrito.

Dados pessoais serão protegidos por medidas técnicas e administrativas proporcionais ao risco, incluindo controle de acesso, autenticação, registros de auditoria, restrição de documentos, revisão humana, segregação de permissões, retenção limitada e procedimentos de segurança. Nenhuma medida elimina todos os riscos, mas a empresa deverá adotar controles adequados ao volume e sensibilidade dos dados.

Os titulares poderão solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revisão de decisões e demais direitos previstos na LGPD pelo canal privacidade@elitemodell.com.br.

Os prazos de retenção deverão observar necessidade operacional, obrigações legais, prevenção a fraude, segurança, exercício regular de direitos, auditoria, contabilidade, obrigações financeiras, defesa em procedimentos e proteção de usuários. A tabela final de retenção deve ser aprovada antes da publicação.
