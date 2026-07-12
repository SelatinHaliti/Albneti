# Vendos SMTP + AI marketing në Render (albneti-api)
# Kërkon: $env:RENDER_API_KEY nga https://dashboard.render.com/u/settings#api-keys
#
# Ekzekuto:
#   $env:RENDER_API_KEY = "rnd_..."
#   .\scripts\setup-render-smtp.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

if (-not (Test-Path $envFile)) {
  Write-Host "backend\.env nuk ekziston." -ForegroundColor Red
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)\s*$') {
    $vars[$Matches[1]] = $Matches[2].Trim()
  }
}

$smtpUser = $vars['SMTP_USER']
$smtpPass = $vars['SMTP_PASS']
$smtpFrom = $vars['SMTP_FROM']
if (-not $smtpFrom -and $smtpUser) { $smtpFrom = "AlbNet <$smtpUser>" }

if (-not $smtpUser -or -not $smtpPass) {
  Write-Host "SMTP_USER / SMTP_PASS mungojnë në backend\.env" -ForegroundColor Red
  exit 1
}

if (-not $env:RENDER_API_KEY) {
  Write-Host "RENDER_API_KEY mungon. Vendos manualisht në Render -> albneti-api -> Environment:" -ForegroundColor Yellow
  Write-Host "SMTP_HOST=smtp.gmail.com"
  Write-Host "SMTP_PORT=587"
  Write-Host "SMTP_SECURE=false"
  Write-Host "SMTP_USER=$smtpUser"
  Write-Host "SMTP_PASS=(nga backend\.env)"
  Write-Host "SMTP_FROM=$smtpFrom"
  Write-Host "AI_MARKETING_USE_SMART_ONLY=true"
  exit 1
}

$headers = @{
  Authorization  = "Bearer $env:RENDER_API_KEY"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

Write-Host "Duke kërkuar shërbimin albneti-api..." -ForegroundColor Cyan
$services = Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=50" -Headers $headers
$service = $services | ForEach-Object { $_.service } | Where-Object { $_.name -eq "albneti-api" } | Select-Object -First 1

if (-not $service) {
  Write-Host "Shërbimi albneti-api nuk u gjet." -ForegroundColor Red
  exit 1
}

$serviceId = $service.id
Write-Host "Gjetur: $serviceId" -ForegroundColor Green

$envBody = @(
  @{ key = "SMTP_HOST"; value = "smtp.gmail.com" }
  @{ key = "SMTP_PORT"; value = "587" }
  @{ key = "SMTP_SECURE"; value = "false" }
  @{ key = "SMTP_USER"; value = $smtpUser }
  @{ key = "SMTP_PASS"; value = $smtpPass }
  @{ key = "SMTP_FROM"; value = $smtpFrom }
  @{ key = "AI_MARKETING_USE_SMART_ONLY"; value = "true" }
) | ConvertTo-Json

Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Headers $headers -Body $envBody | Out-Null

Write-Host "SMTP u vendos në Render! Shërbimi do të redeploy-ohet automatikisht." -ForegroundColor Green
