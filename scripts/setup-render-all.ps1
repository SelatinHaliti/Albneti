# Set SMTP + Stripe + marketing + VAPID on Render (albneti-api)
# Does NOT delete existing vars (MONGODB_URI, JWT_SECRET, etc.)
#
# Get API key: https://dashboard.render.com/u/settings#api-keys
# Run:
#   $env:RENDER_API_KEY = "rnd_..."
#   .\scripts\setup-render-all.ps1
#
# Manual: import scripts/render-env-to-add.env in Render Environment tab

$ErrorActionPreference = "Stop"
$ServiceId = "srv-d672kvvpm1nc739uuhjg"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "backend\.env"

if (-not (Test-Path $envFile)) {
  Write-Host "backend\.env missing." -ForegroundColor Red
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$') {
    $vars[$Matches[1]] = $Matches[2].Trim()
  }
}

$toSet = [ordered]@{
  SMTP_HOST                   = "smtp.gmail.com"
  SMTP_PORT                   = "587"
  SMTP_SECURE                 = "false"
  SMTP_USER                   = $vars['SMTP_USER']
  SMTP_PASS                   = ($vars['SMTP_PASS'] -replace '\s+', '')
  SMTP_FROM                   = if ($vars['SMTP_FROM']) { $vars['SMTP_FROM'] } else { "AlbNet <$($vars['SMTP_USER'])>" }
  STRIPE_SECRET_KEY           = $vars['STRIPE_SECRET_KEY']
  FRONTEND_URL                = if ($vars['FRONTEND_URL']) { $vars['FRONTEND_URL'] } else { "https://albneti.vercel.app" }
  AI_MARKETING_USE_SMART_ONLY = "true"
  VAPID_PUBLIC_KEY            = $vars['VAPID_PUBLIC_KEY']
  VAPID_PRIVATE_KEY           = $vars['VAPID_PRIVATE_KEY']
  VAPID_SUBJECT               = if ($vars['VAPID_SUBJECT']) { $vars['VAPID_SUBJECT'] } else { "mailto:support@albneti.vercel.app" }
}

$exportLines = @("# Render import")
foreach ($entry in $toSet.GetEnumerator()) {
  if ($entry.Value) { $exportLines += "$($entry.Key)=$($entry.Value)" }
}
$exportPath = Join-Path $PSScriptRoot "render-env-to-add.env"
$exportLines | Set-Content -Path $exportPath -Encoding UTF8
Write-Host "Manual import file: $exportPath" -ForegroundColor Cyan

if (-not $env:RENDER_API_KEY) {
  Write-Host ""
  Write-Host "RENDER_API_KEY missing." -ForegroundColor Yellow
  Write-Host "Open Environment tab (NOT Settings):" -ForegroundColor Yellow
  Write-Host "https://dashboard.render.com/web/$ServiceId/env" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Steps:" -ForegroundColor Yellow
  Write-Host "  1. Open link above"
  Write-Host "  2. Click Add from .env"
  Write-Host "  3. Upload scripts/render-env-to-add.env"
  Write-Host "  4. Save then Manual Deploy -> Redeploy"
  exit 0
}

$headers = @{
  Authorization  = "Bearer $env:RENDER_API_KEY"
  Accept         = "application/json"
  "Content-Type" = "application/json"
}

Write-Host "Setting env vars on $ServiceId ..." -ForegroundColor Cyan
$ok = 0
foreach ($entry in $toSet.GetEnumerator()) {
  $key = $entry.Key
  $value = $entry.Value
  if (-not $value) {
    Write-Host "  SKIP $key" -ForegroundColor DarkYellow
    continue
  }
  $body = @{ value = $value } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Put `
      -Uri "https://api.render.com/v1/services/$ServiceId/env-vars/$key" `
      -Headers $headers -Body $body | Out-Null
    Write-Host "  OK   $key" -ForegroundColor Green
    $ok++
  } catch {
    Write-Host "  FAIL $key" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Set $ok vars. Starting redeploy..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Method Post `
    -Uri "https://api.render.com/v1/services/$ServiceId/deploys" `
    -Headers $headers -Body '{}' | Out-Null
  Write-Host "Redeploy started. Wait 2-3 minutes." -ForegroundColor Green
} catch {
  Write-Host "Trigger Manual Deploy in Render dashboard." -ForegroundColor Yellow
}

Write-Host "Check: https://albneti-api.onrender.com/api/health" -ForegroundColor Cyan
