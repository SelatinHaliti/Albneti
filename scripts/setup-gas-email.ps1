# Deploy AlbNet Email në Google Apps Script + vendos në Render
# Kërkon: clasp login (1 herë) → https://script.google.com/home/usersettings

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$gasDir = Join-Path $root 'scripts\google-apps-script'
$envFile = Join-Path $root 'backend\.env'
$secret = 'albnet_gas_email_2026_k8m2'

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '  AlbNet - Google Apps Script Email Deploy' -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path (Join-Path $env:USERPROFILE '.clasprc.json'))) {
  Write-Host 'Hapi 1: Login në Google (hapet browser)...' -ForegroundColor Yellow
  Write-Host '  Aktivizo te: https://script.google.com/home/usersettings → Apps Script API ON'
  Write-Host ''
  Set-Location $gasDir
  npx --yes @google/clasp login
}

Set-Location $gasDir
Write-Host 'Duke ngarkuar kodin në Apps Script...' -ForegroundColor Green
npx --yes @google/clasp push --force

Write-Host 'Duke krijuar Web App deployment...' -ForegroundColor Green
$deployOut = npx --yes @google/clasp deploy --description 'AlbNet Email' 2>&1 | Out-String
Write-Host $deployOut

$gasUrl = ''
if ($deployOut -match 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec') {
  $gasUrl = $Matches[0]
}

if (-not $gasUrl) {
  Write-Host ''
  Write-Host 'Marr URL nga deployments...' -ForegroundColor Yellow
  $listOut = npx --yes @google/clasp deployments 2>&1 | Out-String
  Write-Host $listOut
  if ($listOut -match 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec') {
    $gasUrl = $Matches[0]
  }
}

if (-not $gasUrl) {
  Write-Host ''
  Write-Host 'Nuk u gjet URL automatikisht.' -ForegroundColor Red
  Write-Host 'Hap projektin → Deploy → Manage deployments → kopjo Web app URL /exec'
  $gasUrl = Read-Host 'Ngjit URL /exec ketu'
}

if (-not $gasUrl) { exit 1 }

# Përditëso backend/.env
$lines = @()
if (Test-Path $envFile) {
  $lines = Get-Content $envFile | Where-Object {
    $_ -notmatch '^(GOOGLE_APPS_SCRIPT_URL|GOOGLE_APPS_SCRIPT_SECRET|EMAIL_PRIMARY)='
  }
}
$lines += "GOOGLE_APPS_SCRIPT_URL=$gasUrl"
$lines += "GOOGLE_APPS_SCRIPT_SECRET=$secret"
$lines += 'EMAIL_PRIMARY=gas'
Set-Content -Path $envFile -Value ($lines -join "`r`n") -Encoding UTF8

Write-Host ''
Write-Host "URL: $gasUrl" -ForegroundColor Green
Write-Host 'Duke testuar...' -ForegroundColor Green
Set-Location (Join-Path $root 'backend')
node scripts/test-google-apps-script.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$renderKey = $env:RENDER_API_KEY
if (-not $renderKey) {
  $renderKey = Read-Host 'Render API Key (rnd_...) ose Enter per te kaluar'
}
if ($renderKey) {
  node scripts/push-render-env.js $renderKey
}

Write-Host ''
Write-Host 'U krye! blastVia: Google Apps Script (Gmail)' -ForegroundColor Green
Write-Host 'Test blast: node backend/scripts/trigger-production-active.js'
