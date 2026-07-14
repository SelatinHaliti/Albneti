@echo off
title AlbNet - Rregullo Email Marketing
cd /d "%~dp0"
echo.
echo ============================================
echo   AlbNet - Konfiguro Email ne Render
echo ============================================
echo.
echo Render FREE bllokon Gmail SMTP (portet 465/587).
echo Per blast te gjithe perdoruesve duhet NJERA nga keto:
echo.
echo   A) BREVO (falas, rekomandohet) - brevo.com
echo      1. Regjistrohu / hyr
echo      2. Settings - API Keys - krijo celes
echo      3. Senders - verifiko selatinhaliti6@gmail.com (kliko linkun ne email)
echo      4. Security - Authorized IPs - CAKTIVIZO (per Render/cloud)
echo      5. Ngjit API key me poshte
echo.
echo   B) RESEND + domain - resend.com/domains
echo   C) Render Starter ($7/muaj) + Gmail SMTP
echo.
set /p BREVO_KEY="Brevo API Key (xkeysib-... ose Enter per te kaluar): "
if not "%BREVO_KEY%"=="" (
  echo BREVO_API_KEY=%BREVO_KEY%>> backend\.env
  echo BREVO_SENDER_EMAIL=selatinhaliti6@gmail.com>> backend\.env
  echo BREVO_SENDER_NAME=AlbNet>> backend\.env
  echo.
  echo Brevo u shtua ne backend\.env
)
echo.
echo Hapi tjeter: Render API Key
echo   https://dashboard.render.com/u/settings#api-keys
echo.
set /p RENDER_KEY="Ngjit Render API Key (rnd_...): "
if "%RENDER_KEY%"=="" (
  echo Gabim: API key bosh.
  pause
  exit /b 1
)
echo.
echo Duke vendosur variablat email ne Render...
node backend\scripts\push-render-env.js "%RENDER_KEY%"
if errorlevel 1 (
  echo.
  echo Deshtoi. Kontrollo mesazhin e gabimit siper.
  pause
  exit /b 1
)
echo.
echo U krye! Prit 2-3 minuta pastaj kontrollo:
echo   https://albneti-api.onrender.com/api/health
echo.
echo Duhet: blastReady true, blastVia Brevo ose Resend ose Gmail SMTP
echo.
echo Testo: Admin - Marketing - Dergo test email
echo.
pause
