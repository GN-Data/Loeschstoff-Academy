@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Merge & Push dev und main
echo ============================================================
echo.

echo [1/5] Speichere alle lokalen Aenderungen und neuen Dateien...
git add -A
git commit -m "feat: update documents, settings, high-contrast buttons, neutral placeholders"

echo.
echo [2/5] Wechsle zu dev und uebernehme aktuellen Stand...
git checkout dev
git merge main -m "merge: main into dev"

echo.
echo [3/5] Wechsle zu main und stelle Gleichstand sicher...
git checkout main
git merge dev -m "merge: dev into main"

echo.
echo [4/5] Pushe BEIDE Branches dev und main zu GitHub...
git push origin main dev

echo.
echo [5/5] Pruefe aktuellen Git-Status:
git status

echo.
echo ============================================================
echo   ERFOLGREICH ABGESCHLOSSEN!
echo ============================================================
pause
