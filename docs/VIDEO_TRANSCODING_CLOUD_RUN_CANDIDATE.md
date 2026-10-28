# Compressão assíncrona de vídeos — candidato Cloud Run

Esta implementação permanece desligada por padrão. Ela não deve ser ativada até que o worker privado, a fila, o IAM, os segredos, o backup do banco e um teste real com vídeo sintético estejam confirmados.

## Fluxo

1. O navegador envia diretamente e de forma resumível ao bucket privado do Supabase.
2. A aplicação cria um `VideoProcessingJob` idempotente e vincula o item à galeria como `PROCESSING`.
3. Cloud Scheduler chama `/tasks/dispatch`; Cloud Tasks chama `/tasks/transcode` com OIDC.
4. O worker baixa o original privado, valida com `ffprobe` e transcodifica com FFmpeg para MP4 H.264/AAC, `yuv420p`, CRF 25 e limite de 1080p.
5. A saída otimizada volta ao bucket privado e a aplicação executa os controles existentes antes da publicação.
6. O original permanece privado por 24 horas. Sua remoção exige um job operacional separado que só apague fontes de jobs concluídos; falhas nunca apagam o original.

## Ativação necessária

- Aplicar a migration `20261028113000_video_transcoding_queue` após backup validado.
- Criar um serviço Cloud Run privado com 2 vCPU, 2 GiB, concorrência 1, timeout 900 s, min 0 e max 3.
- Criar uma fila Cloud Tasks na mesma região e um Scheduler autenticado para `/tasks/dispatch`.
- Conceder somente Storage via credencial Supabase, banco, invocação OIDC e enfileiramento necessários.
- Configurar no worker: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `VIDEO_WORKER_CALLBACK_SECRET`, dados da fila e URL do worker.
- Configurar na Vercel o mesmo `VIDEO_WORKER_CALLBACK_SECRET` e, somente após canário aprovado, `VIDEO_TRANSCODING_MODE=cloud-run`.

## Custo estimado

Cloud Run cobra CPU/memória durante processamento; Cloud Tasks, build/registry e tráfego também podem cobrar. Com vídeos de até 30 segundos, minScale 0 e poucos cadastros, a expectativa inicial é baixa (ordem de dezenas de reais/mês), mas não há valor garantido sem medir duração, resolução, volume e região. Nenhum recurso pago foi criado nesta preparação.

## Rollback

Remover `VIDEO_TRANSCODING_MODE` da Vercel impede novos jobs. Objetos originais e jobs permanecem recuperáveis. Não remover a tabela nem os objetos durante rollback.
