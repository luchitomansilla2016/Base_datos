@echo off
title Servidor Local y Tunel Publico REGPOL Huanuco 2.0
color 0A
echo ========================================================
echo   Iniciando Servidor Web y Tunel Cloudflare (REGPOL)
echo ========================================================
echo.
start /b powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 2 /nobreak >nul
"%~dp0cloudflared.exe" tunnel --url http://localhost:8080 --no-autoupdate
pause
