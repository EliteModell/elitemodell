# Preparacao de migracao de midia para Bunny

Status: **DRY RUN SOMENTE**. Bunny nao esta ativo em producao e a origem Supabase continua autoritativa.

Componentes separados:

- imagens e arquivos: Bunny Storage como candidato;
- entrega: Bunny CDN com token authentication e expiracao;
- videos: Bunny Stream como candidato para encoding e streaming adaptativo;
- aplicacao: `/api/media/<id>` aplica sessao 18+, autorizacao, rate limit e auditoria antes da entrega.

O comando abaixo gera um manifesto autenticado e criptografado, fora do repositorio. Ele lista objetos elegiveis, tamanho, hash esperado, origem/destino, duplicados, estimativa de transferencia, estado de resume e mapa de rollback. Ele nao grava no Bunny e nao apaga a origem.

```powershell
$env:ELITE_BACKUP_KEY = Get-Clipboard
npm run media:bunny-dry-run -- --output=C:\EliteModell-Backups\<backup>\bunny-migration-dry-run.json.embk --verify-source
Remove-Item Env:\ELITE_BACKUP_KEY
```

`--resume` reutiliza verificacoes de hash do manifesto existente. A futura migracao deve seguir `COPY -> VERIFY HASH -> REGISTER DESTINATION -> SHADOW TEST -> CUTOVER -> MONITOR`. Retirada da origem nao faz parte desta ferramenta.

Antes da ativacao sao obrigatorios: contrato/underwriting para a natureza do conteudo, Storage Zone privada, Pull Zone, token key, hostname, regras de hotlink/referrer, conta Stream e API key quando video for usado, webhook validado, regiao/residencia de dados e homologacao do player. `BUNNY_PRODUCTION_ENABLED` permanece `false`.
