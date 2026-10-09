@echo off
title Subir Cambios a GitHub - REGPOL Huanuco
color 0A
cd /d "%~dp0"
echo ========================================================
echo   SUBIENDO MODIFICACIONES A GITHUB (luchitomansilla2016)
echo ========================================================
echo.
"%LOCALAPPDATA%\Programs\MinGit\cmd\git.exe" push origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo  EXITO: Todos los cambios han sido subidos a GitHub.
    echo ========================================================
) else (
    echo ========================================================
    echo  Si es la primera vez, se abrira una ventana en tu navegador
    echo  para autorizar tu cuenta de GitHub con un clic.
    echo ========================================================
)
echo.
pause
