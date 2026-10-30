@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

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
pause
