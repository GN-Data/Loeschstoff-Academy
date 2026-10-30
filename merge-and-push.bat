@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

<<<<<<< HEAD
echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Merge & Push
echo ============================================================
echo.

echo [1/6] Fuege alle Aenderungen hinzu...
git add .

echo.
echo [2/6] Erstelle Commit mit den neuen Frageboegen & Konfigurationen...
git commit -m "feat(catalogs): update exam catalogs and admin invite workflow"

echo.
echo [3/6] Wechsel auf Branch 'dev' und merge...
git checkout dev
git merge feature/admin-role-and-invites -m "merge: feature/admin-role-and-invites in dev"

echo.
echo [4/6] Wechsel auf Branch 'main' und merge 'dev'...
git checkout main
git merge dev -m "merge: dev in main"

echo.
echo [5/6] Push 'main' und 'dev' zu GitHub origin...
git push origin main dev

echo.
echo [6/6] Fertig! Aktueller Branch-Status:
git status
echo.
echo ============================================================
echo   Erfolgreich gemerged und gepusht!
echo ============================================================
=======
echo ========================================================
echo   LÖSCHSTOFF ACADEMY - Merge & Push (dev ^& main)
echo ========================================================
echo.

echo 1. Änderungen committen...
git add .
git commit -m "feat: Admin-Rolle, Einladungssystem mit PIN, Dienstgrad entfernt"

echo.
echo 2. Zu dev wechseln und mergen...
git checkout dev
git merge feature/admin-role-and-invites

echo.
echo 3. Zu main wechseln und mergen...
git checkout main
git merge dev

echo.
echo 4. Zu GitHub pushen (main und dev)...
git push origin main dev

echo.
echo ========================================================
echo   ERFOLGREICH! Alle Branches sind aktuell auf GitHub.
echo ========================================================
echo.
>>>>>>> feature/admin-role-and-invites
pause
