param(
    [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$BackupRoot = 'C:\EliteModell-Backups',
    [string]$BackupTool = 'C:\EliteModell-Backups\tools\Backup-Production.ps1'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repository = (Resolve-Path -LiteralPath $RepositoryRoot).Path.TrimEnd('\')
$tool = (Resolve-Path -LiteralPath $BackupTool).Path
$backup = [System.IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
if ($backup.Equals($repository, [System.StringComparison]::OrdinalIgnoreCase) -or
    $backup.StartsWith($repository + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'BackupRoot deve ficar fora do repositorio.'
}
if (-not [System.IO.Path]::IsPathRooted($backup)) {
    throw 'BackupRoot deve ser um caminho absoluto.'
}

& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $tool `
    -RepositoryRoot $repository `
    -BackupRoot $backup
if ($LASTEXITCODE -ne 0) {
    throw "Backup de producao falhou com exit code $LASTEXITCODE."
}
