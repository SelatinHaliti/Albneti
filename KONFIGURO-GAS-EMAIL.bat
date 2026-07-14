@echo off
title AlbNet - Google Apps Script (automatik)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\setup-gas-email.ps1"
pause
