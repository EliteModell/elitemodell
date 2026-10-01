# Rotina automatica de backup

Status: **PREPARADA, NAO ATIVADA**.

O backup manual validado usa `C:\EliteModell-Backups\tools\Backup-Production.ps1`. O wrapper `scripts/invoke-production-backup.ps1` valida que o destino esta fora do repositorio e executa o mesmo fluxo: dump oficial do PostgreSQL, inventario de Auth/configuracao, copia integral do Storage, manifesto, SHA-256 e criptografia autenticada `EMBK0001`.

Exemplo para o Agendador de Tarefas do Windows, depois de contratar/configurar um destino independente:

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File C:\projeto\elitemodell\scripts\invoke-production-backup.ps1 -BackupRoot X:\EliteModell-Backups
```

Requisitos antes de ativar:

1. `X:` deve ser um volume ou agente de copia independente do Supabase e do disco local.
2. A tarefa deve rodar sob a conta Windows autorizada a usar a copia DPAPI da chave.
3. A chave bruta de recuperacao deve ser custodiada em cofre externo; nunca em argumentos, logs, Git ou CI.
4. Alertar quando o processo retornar codigo diferente de zero ou quando o resumo nao indicar verificacao de hashes.
5. Executar restore drill isolado pelo menos trimestralmente usando `C:\EliteModell-Backups\tools\Test-Restore.ps1`.
6. Definir formalmente RPO, RTO, periodicidade e retencao antes de ativar o agendamento.

Nenhum agendamento foi criado nesta tarefa, pois o destino externo, o cofre e os prazos ainda exigem decisao operacional.
