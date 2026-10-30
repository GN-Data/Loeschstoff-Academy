@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Git Synchronisation (dev & main)
echo ============================================================
echo.

echo [1/4] Erfasse alle Aenderungen...
git add -A

echo [2/4] Speichere aktuellen Stand auf dev...
git commit -m "feat: update documents, settings, storage migration and UI"

echo [3/4] Uebernehme dev in main...
git checkout main
git merge dev --no-edit
git checkout dev

echo [4/4] Pushe dev und main zu GitHub...
git push origin dev main

echo.
echo ============================================================
echo   Erfolgreich synchronisiert! Aktiver Branch bleibt: dev
echo ============================================================
pause
