@echo off
title AlbNet - Rregullo Email Marketing
cd /d "%~dp0"
echo.
echo ============================================
echo   AlbNet - Email Proxy (Vercel + Brevo)
echo ============================================
echo.
echo Render thërret Vercel proxy, Vercel dërgon përmes Brevo HTTP.
echo Nuk nevojitet SMTP në Render.
echo.
echo Nese Brevo kthen gabim IP: kontrollo email-in e Brevo dhe
echo kliko "Authorize IP" OSE çaktivizo IP blocking:
echo   https://app.brevo.com/security/authorised_ips
echo.
set /p RENDER_KEY="Render API Key (rnd_...): "
if "%RENDER_KEY%"=="" (
  echo Gabim: API key bosh.
  pause
  exit /b 1
)
echo.
echo Duke vendosur variablat ne Render...
node backend\scripts\push-render-env.js "%RENDER_KEY%"
if errorlevel 1 (
  echo Deshtoi.
  pause
  exit /b 1
)
echo.
echo Prit 3 min (Render + Vercel deploy nga git push).
echo Kontrollo: https://albneti-api.onrender.com/api/health
echo Duhet: blastVia = "Vercel -^> Brevo"
echo.
echo Testo blast:
echo   node backend\scripts\trigger-production-active.js
echo.
pause
