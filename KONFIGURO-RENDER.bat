@echo off
title AlbNet - Konfiguro Render
cd /d "%~dp0"
echo.
echo ============================================
echo   AlbNet - Vendos SMTP, Stripe, VAPID ne Render
echo ============================================
echo.
echo Hapi 1: Hap ne browser:
echo   https://dashboard.render.com/u/settings#api-keys
echo.
echo Hapi 2: Kliko "Create API Key" ^> kopjo rnd_...
echo.
set /p RENDER_KEY="Ngjit API Key ketu (rnd_...): "
if "%RENDER_KEY%"=="" (
  echo Gabim: API key bosh.
  pause
  exit /b 1
)
echo.
echo Duke vendosur variablat ne Render...
set RENDER_API_KEY=%RENDER_KEY%
node backend\scripts\push-render-env.js "%RENDER_KEY%"
if errorlevel 1 (
  echo.
  echo Dështoi. Kontrollo mesazhin e gabimit sipër.
  pause
  exit /b 1
)
echo.
echo U krye! Prit 2-3 minuta pastaj kontrollo:
echo https://albneti-api.onrender.com/api/health
echo.
pause
