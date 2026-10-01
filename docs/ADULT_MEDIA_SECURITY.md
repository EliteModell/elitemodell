# Segurança de mídia adulta

Mídia nova entra sempre em bucket privado de quarentena. A publicação só ocorre quando todos os gates aplicáveis passam: upload completo, antivírus, moderação, identidade/maioridade, consentimento, revisão administrativa quando exigida e ausência de takedown.

Estados `PENDING`, `UNKNOWN`, `ERROR`, `FAILED` e `REJECTED` nunca autorizam publicação. Timeout ou indisponibilidade de fornecedor mantêm o ativo em `QUARANTINED`.

O modelo `MediaDepictedPerson` registra referências mínimas de idade e consentimento para cada pessoa retratada, sem exigir uma cópia adicional do documento. Conteúdo com mais de uma pessoa permanece bloqueado até existir verificação individual.

O acesso externo usa `/api/media/<id>`. Imagens são entregues somente após autorização e sem cache compartilhado. Vídeos aprovados recebem redirect curto para URL assinada, evitando atravessar integralmente o servidor Next.js. Conteúdo futuro no Bunny exige token authentication, allowed referrers e `BUNNY_PRODUCTION_ENABLED=true` após aprovação formal.

## Video explicito

O arquivo entra em quarentena privada sem preview publico. Antimalware, moderacao, referencias de maioridade/identidade, consentimento e revisao humana devem passar antes de qualquer entrega. O endpoint controlado autoriza o espectador, aplica rate limit e registra a entrega; o conteudo de video segue por redirect temporario do provider, nao por streaming integral pelo processo Next.js.

Bunny Stream esta somente preparado como candidato. A ativacao exige biblioteca real com token authentication, bloqueio de hotlink/no-referrer, allowed referrers, webhook autenticado, politica de thumbnails privados, encoding adaptativo e validacao contratual para conteudo adulto legal. Falta de qualquer configuracao mantem a entrega bloqueada.

## Takedown e evidencia

Denuncias emergenciais de possivel menor, exploracao, coercao, imagem nao autorizada, conteudo intimo nao consensual e deepfake/impersonation aplicam retirada cautelar. O registro e ocultado/restrito sem destruicao automatica da evidencia; a acao gera evento de moderacao e audit log.
