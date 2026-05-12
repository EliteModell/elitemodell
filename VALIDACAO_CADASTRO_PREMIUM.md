# Validacao do cadastro premium adulto

## Referencia de categoria

Fatal Model trabalha publicamente com 3 categorias centrais de anuncio:

- Mulheres
- Homens
- Trans / Transexuais

No EliteModell, isso fica mapeado como:

- `MULHER`
- `HOMEM`
- `TRANS`

`Casais` deve ficar como publico atendido em "Atendo", nao como genero principal do anuncio.

## Fluxo ativo por etapa

1. Conta e idade
Status: ativo.
Campos: nome, email/senha ou Google/SMS, tipo de conta, categoria para anunciante, data de nascimento, aceite de termos e LGPD.
Falta premium: verificador de email/telefone duplicado antes do submit.

2. Dados do anuncio
Status: ativo.
Campos: nome artistico, biografia, cidade, UF, bairro e categoria.
Regra ativa: biografia minima de 80 caracteres, cidade, UF e categoria obrigatorias.

3. Aparencia
Status: ativo.
Campos: nascimento, altura, peso, cabelo, olhos, etnia, signo, tatuagem, silicone e depilacao.
Falta premium: validar maioridade novamente no backend do perfil.

4. Atendimento
Status: ativo.
Campos: tipo de atendimento, quem atende, idiomas, dias e horarios.
Regra ativa: exige tipo, publico atendido e dias disponiveis.

5. Servicos
Status: ativo.
Campos: servicos e especialidades.
Regra ativa: pelo menos um servico.

6. Valores
Status: ativo.
Campos: 30 min, 1h, 2h, pernoite, webcam e formas de pagamento.
Regra ativa: pelo menos um valor e uma forma de pagamento.

7. Contato
Status: ativo.
Campos: WhatsApp, telefone, Instagram e site.
Regra ativa: WhatsApp com DDD.

8. Fotos
Status: ativo.
Campos: foto principal e galeria.
Regra ativa: foto principal obrigatoria.
Falta premium: moderacao automatica de imagem antes de publicar.

9. Documentos
Status: ativo.
Campos: tipo, frente e verso.
Regra ativa: documento completo obrigatorio.
Falta premium: storage privado com URL assinada e trilha de auditoria no painel.

10. Biometria facial
Status: parcialmente ativo.
Hoje: cria sessao local manual (`LOCAL_MANUAL`) e permite fallback por selfie/video.
Falta premium: integrar provedor real de liveness/KYC, webhook de retorno, status automatico `APPROVED`, `REJECTED` ou `MANUAL_REVIEW`.

## Infraestrutura que ainda falta para ficar premium

- KYC real com liveness, webhook e painel de revisao.
- Validacao de maioridade no endpoint `/api/professionals`.
- Protecao privada forte para documentos e midia de verificacao.
- Moderacao automatica de imagens publicas.
- Salvamento de rascunho por etapa.
- Indicador de pendencias no dashboard do anunciante.
- Plano premium/impulsionamento conectado ao destaque do perfil.
- Auditoria para aprovar/reprovar documento, biometria e fotos.
