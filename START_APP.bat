@echo off
chcp 65001 >nul
echo ============================================================================
echo   LÖSCHSTOFF ACADEMY – Wissen. Trainieren. Einsatzbereit.
echo ============================================================================
echo.
echo Starte lokalen Server auf http://localhost:3000 ...
start "" "http://localhost:3000"
node server.js
pause
