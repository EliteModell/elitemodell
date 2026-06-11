# Checklist de implementacao dos termos na plataforma

Data: 11 de junho de 2026
Empresa: ELITE MODEL LTDA
CNPJ: 66.807.135/0001-71
Marca: Elite Modell
Status: RASCUNHO PARA REVISAO JURIDICA - NAO PUBLICAR

## Regras desta etapa

- Nao publicar como juridico final.
- Nao marcar como aprovado.
- Nao fazer deploy sem autorizacao.
- Nao aplicar migrations.
- Manter status `READY_FOR_LEGAL_REVIEW` ou `LEGAL_REVIEW_REQUESTED`.
- Bloquear `PUBLISHED` sem versao, hash, vigencia, revisao juridica e aprovacao empresarial.

## Rodape publico

| Item | Status |
|---|---|
| Termos de Uso Gerais | Preparado |
| Politica de Privacidade | Preparado |
| Politica de Cookies | Preparado |
| Regras da Comunidade | Preparado |
| Politica de Conteudo | Preparado |
| Politica de Moderacao e Denuncia | Preparado |
| Canal de Privacidade | Preparado |
| Canal de Seguranca/Denuncias | Preparado |
| Confirmacao de Maioridade | Preparado |

## Cadastro/Login

| Item | Status |
|---|---|
| Termos de Uso | Preparado |
| Politica de Privacidade | Preparado |
| Confirmacao de Maioridade | Preparado |
| Aviso resumido de cadastro | Preparado por rota tecnica |
| Checkboxes desmarcados por padrao | Preparado |
| Marketing opcional | Mantido opcional |
| Aceite versionado com IP/user-agent/data/rota/versao/hash | Preparado via `recordUserAcceptances`; grava somente versao `PUBLISHED` e vigente |

## Cliente

| Item | Status |
|---|---|
| Termos para Clientes | Rota tecnica preparada |
| Privacidade | Preparado |
| Maioridade | Preparado |
| Pagamentos/reservas/reembolso | Preparado no checkout de reserva |
| Denuncia/suporte | Canal preparado; fluxo depende de homologacao |

## Profissional

| Item | Status |
|---|---|
| Termos para Profissionais | Rota tecnica preparada |
| Identidade/biometria | Rota tecnica preparada |
| Aviso de documentos | Rota tecnica preparada |
| Aviso de biometria | Rota tecnica preparada |
| Aviso de publicacao de conteudo | Rota tecnica preparada |
| Declaracao de autoria/autorizacao | Obrigatoria nos uploads principais |
| Politica de Conteudo | Preparada |
| Politica de Moderacao e Denuncia | Preparada |

## Anfitriao

| Item | Status |
|---|---|
| Termos para Anfitrioes | Rota tecnica preparada |
| Politica de Pagamentos | Preparada |
| Politica de Reembolso | Preparada |
| Taxa 10% | Exibida como regra proposta |
| Repasse 90% | Exibido como regra proposta |
| No-show | Proposto; validar com advogada |
| Reserva/check-in | Preparado parcialmente |
| Aceite versionado | Preparado no backend de reserva |

## Checkout

| Item | Status |
|---|---|
| Aviso de Checkout | Link preparado |
| Pagamentos | Link preparado |
| Reembolso | Link preparado |
| Preco total | Exibido |
| Duracao/expiracao | Exibido conforme reserva |
| Ausencia de renovacao automatica | Exibida |
| Aceite antes do pagamento | Obrigatorio |
| Comprovante de aceite | Preparado via `CheckoutAcceptance` |

## Upload de midia

| Item | Status |
|---|---|
| Politica de Conteudo | Link/aceite preparado |
| Aviso de Publicacao | Rota tecnica preparada |
| Declaracao de Autoria | Obrigatoria na API para pastas publicas |
| Alerta contra menoridade/exploracao/coercao/trafico/terceiros | Exibido nos fluxos principais |
| Checkbox obrigatorio | Implementado nos fluxos principais |
| Bloqueio sem aceite | Implementado na API |

## Admin > Juridico

| Item | Status |
|---|---|
| Listar 31 minutas | Preparado |
| Status | Preparado |
| Versao | Preparado |
| Hash | Preparado |
| Historico basico | Preparado |
| Pendencias | Preparado |
| Botao publicar | Existe, mas bloqueado pelas regras |
| Botao despublicar | Existe para versoes publicadas |
| Aprovacao operacional | Nome exibido |
| Aprovacao empresarial | Nome exibido; fluxo formal ainda pendente |
| Campo de revisao da advogada | Preparado |
| Auditoria em mudanca de status | Preparado |
| Bloqueio sem versao/hash/vigencia/aprovacao | Preparado |

## Testes a cobrir/rodar

- Documentos aparecem nos lugares certos.
- Checkboxes comecam desmarcados.
- Aceite obrigatorio onde precisa.
- Marketing opcional.
- Aceite versionado salva versao/hash/IP/user-agent/data/rota.
- Minuta `READY_FOR_LEGAL_REVIEW` ou `LEGAL_REVIEW_REQUESTED` nao gera aceite juridico versionado.
- Documento rascunho nao aparece como aprovado.
- Documento sem aprovacao nao fica `PUBLISHED`.
- Conteudo adulto nao aparece antes de `adultVerified`.
- Upload exige declaracao de autoria.
- Checkout exige aviso e aceite.
- Admin registra auditoria ao mudar status.

## Conclusao

Checklist preparado para homologacao tecnica e revisao da advogada. Nao publicar como documento juridico final antes de aprovacao formal.
