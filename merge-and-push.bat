@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
<<<<<<< HEAD
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
=======
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
>>>>>>> main
echo ============================================================
pause
