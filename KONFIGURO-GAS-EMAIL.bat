@echo off
title AlbNet - Google Apps Script Email
cd /d "%~dp0"
echo.
echo ============================================
echo   AlbNet - Lidh Google Apps Script Email
echo ============================================
echo.
echo 1. Hap projektin Apps Script (kopjo kodin nga):
echo    scripts\google-apps-script\AlbNetEmail.gs
echo.
echo 2. Script properties (Project Settings):
echo    ALBNET_SECRET = albnet_gas_email_2026_k8m2
echo    FROM_NAME = AlbNet
echo.
echo 3. Deploy ^> New deployment ^> Web app
echo    Execute as: Me
echo    Who has access: Anyone
echo.
echo 4. Ngjit URL /exec me poshte:
echo.
set /p GAS_URL="Web App URL (https://script.google.com/macros/s/.../exec): "
if "%GAS_URL%"=="" (
  echo Gabim: URL bosh.
  pause
  exit /b 1
)
echo.
set GAS_SECRET=albnet_gas_email_2026_k8m2
echo GOOGLE_APPS_SCRIPT_URL=%GAS_URL%>> backend\.env
echo GOOGLE_APPS_SCRIPT_SECRET=%GAS_SECRET%>> backend\.env
echo EMAIL_PRIMARY=gas>> backend\.env
echo.
echo Duke testuar...
node backend\scripts\test-google-apps-script.js
if errorlevel 1 (
  echo Test deshtoi. Kontrollo Deploy dhe Script properties.
  pause
  exit /b 1
)
echo.
set /p RENDER_KEY="Render API Key (rnd_...) per production: "
if not "%RENDER_KEY%"=="" (
  node backend\scripts\push-render-env.js "%RENDER_KEY%"
)
echo.
echo U krye! Marketing perdor Google Apps Script (Gmail).
pause
