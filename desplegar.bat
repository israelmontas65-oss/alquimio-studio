@echo off
title Alquimio Studio — Despliegue Automatico
color 0B

echo.
echo  ╔════════════════════════════════════════════════╗
echo  ║     ALQUIMIO STUDIO — DESPLIEGUE AUTOMATICO    ║
echo  ║          Creado por Israel Montas v1.0          ║
echo  ╚════════════════════════════════════════════════╝
echo.

echo [1/3] Verificando autenticacion con Netlify...
npx netlify status >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo     Iniciando sesion en Netlify...
    npx netlify login
)

echo.
echo [2/3] Compilando la aplicacion web de produccion...
call npx expo export -p web
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo la compilacion. Revisa los errores arriba.
    pause
    exit /b 1
)

echo.
echo [3/3] Subiendo automaticamente a Netlify (alquimio-studio)...
call npx netlify deploy --dir=dist --prod --site=19b0e557-593f-4210-9c5b-15cfb447d5f6 --no-build
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo el despliegue. Revisa los errores arriba.
    pause
    exit /b 1
)

echo.
echo  ╔════════════════════════════════════════════════╗
echo  ║  Despliegue completado con exito!               ║
echo  ║  URL: https://alquimio-studio.netlify.app       ║
echo  ╚════════════════════════════════════════════════╝
echo.
pause
