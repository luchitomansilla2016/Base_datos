@echo off
title Subir Cambios a GitHub - REGPOL Huanuco
color 0A
cd /d "%~dp0"
echo ========================================================
echo   SUBIENDO MODIFICACIONES A GITHUB (luchitomansilla2016)
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0sincronizar_github.ps1"
echo.
pause
