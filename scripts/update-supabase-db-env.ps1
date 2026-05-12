param(
  [string]$ProjectRef = "jgvmpbrsxegwkrgjncsv"
)

$secure = Read-Host "Digite a senha do banco Supabase" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)

if ([string]::IsNullOrWhiteSpace($plain)) {
  Write-Error "Senha vazia. Nada foi alterado."
  exit 1
}

$databaseUrl = "postgresql://postgres.${ProjectRef}:$plain@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
$directUrl = "postgresql://postgres.${ProjectRef}:$plain@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

$envPath = Resolve-Path ".env"
$lines = [System.IO.File]::ReadAllLines($envPath)
$updates = @{
  "DATABASE_URL" = $databaseUrl
  "DIRECT_URL" = $directUrl
}

$out = New-Object System.Collections.Generic.List[string]
$seen = @{}

foreach ($line in $lines) {
  if ($line.Trim() -match "^([A-Za-z_][A-Za-z0-9_]*)\s*=") {
    $name = $Matches[1]
    if ($updates.ContainsKey($name)) {
      $seen[$name] = $true
      $out.Add($name + "=""" + $updates[$name] + """")
      continue
    }
  }
  $out.Add($line)
}

foreach ($name in $updates.Keys) {
  if (-not $seen.ContainsKey($name)) {
    $out.Add($name + "=""" + $updates[$name] + """")
  }
}

[System.IO.File]::WriteAllLines($envPath, $out, [System.Text.UTF8Encoding]::new($false))
Write-Host "DATABASE_URL e DIRECT_URL atualizados para o projeto $ProjectRef."
