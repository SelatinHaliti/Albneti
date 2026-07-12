# Vendos Stripe test keys në Render (albneti-api)
# Kërkon: $env:RENDER_API_KEY nga https://dashboard.render.com/u/settings#api-keys
#
# Ekzekuto:
#   $env:RENDER_API_KEY = "rnd_..."
#   .\scripts\setup-render-stripe.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

if (-not (Test-Path $envFile)) {
  Write-Host "backend\.env nuk ekziston." -ForegroundColor Red
  exit 1
}

$stripeKey = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*STRIPE_SECRET_KEY\s*=\s*(.+)\s*$') {
    $stripeKey = $Matches[1].Trim()
  }
}

if (-not $stripeKey -or -not $stripeKey.StartsWith('sk_')) {
  Write-Host "STRIPE_SECRET_KEY mungon ose është i pavlefshëm në backend\.env" -ForegroundColor Red
  exit 1
}

if (-not $env:RENDER_API_KEY) {
  Write-Host "RENDER_API_KEY mungon. Vendos manualisht në Render -> albneti-api -> Environment:" -ForegroundColor Yellow
  Write-Host "STRIPE_SECRET_KEY=$stripeKey"
  Write-Host "FRONTEND_URL=https://albneti.vercel.app"
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
  @{ key = "STRIPE_SECRET_KEY"; value = $stripeKey }
  @{ key = "FRONTEND_URL"; value = "https://albneti.vercel.app" }
) | ConvertTo-Json

Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$serviceId/env-vars" -Headers $headers -Body $envBody | Out-Null

Write-Host "Stripe u vendos në Render! Shërbimi do të redeploy-ohet automatikisht." -ForegroundColor Green
