@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Merge & Push zu GitHub
echo ============================================================
echo.

echo [1/6] Suche nach allen Aenderungen, docs/ und Konfigurationen...
git add -A

echo.
echo [2/6] Erstelle Commit...
git commit -m "feat: separate exports, info modal, placeholders for pins and docs"

echo.
echo [3/6] Wechsle zu Branch 'dev' und merge...
git checkout dev
git merge main -m "merge: main in dev"
git merge feature/admin-role-and-invites -m "merge: feature/admin-role-and-invites in dev"

echo.
echo [4/6] Wechsle zu Branch 'main' und merge 'dev'...
git checkout main
git merge dev -m "merge: dev in main"

echo.
echo [5/6] Push 'main' und 'dev' zu GitHub origin...
git push origin main dev

echo.
echo [6/6] Branch-Status auf GitHub:
git status
echo.
echo ============================================================
echo   Erfolgreich abgeschlossen!
echo ============================================================
pause
