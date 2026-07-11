# Vendos VAPID keys në Render (albneti-api)
# Kërkon: $env:RENDER_API_KEY nga https://dashboard.render.com/u/settings#api-keys
#
# Ekzekuto nga rrënja e projektit:
#   $env:RENDER_API_KEY = "rnd_..."
#   .\scripts\setup-render-vapid.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

if (-not (Test-Path $envFile)) {
  Write-Host "backend\.env nuk ekziston. Ekzekuto fillimisht: node backend/scripts/generate-vapid.js" -ForegroundColor Red
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+)\s*$') {
    $vars[$Matches[1]] = $Matches[2].Trim()
  }
}

$publicKey = $vars['VAPID_PUBLIC_KEY']
$privateKey = $vars['VAPID_PRIVATE_KEY']
$subject = $vars['VAPID_SUBJECT']
if (-not $subject) { $subject = 'mailto:support@albneti.vercel.app' }

if (-not $publicKey -or -not $privateKey) {
  Write-Host "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY mungojnë në backend\.env" -ForegroundColor Red
  exit 1
}

if (-not $env:RENDER_API_KEY) {
  Write-Host "RENDER_API_KEY mungon." -ForegroundColor Yellow
  Write-Host "Vendos manualisht në Render -> albneti-api -> Environment:"
  Write-Host "VAPID_PUBLIC_KEY=$publicKey"
  Write-Host "VAPID_PRIVATE_KEY=(nga backend\.env)"
  Write-Host "VAPID_SUBJECT=$subject"
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
  Write-Host "Shërbimi albneti-api nuk u gjet në Render." -ForegroundColor Red
  exit 1
}

$serviceId = $service.id
Write-Host "Gjetur: $serviceId" -ForegroundColor Green

$envBody = @(
  @{ key = "VAPID_PUBLIC_KEY"; value = $publicKey }
  @{ key = "VAPID_PRIVATE_KEY"; value = $privateKey }
  @{ key = "VAPID_SUBJECT"; value = $subject }
) | ConvertTo-Json

Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Headers $headers -Body $envBody | Out-Null

Write-Host "VAPID u vendos në Render! Shërbimi do të redeploy-ohet automatikisht." -ForegroundColor Green
