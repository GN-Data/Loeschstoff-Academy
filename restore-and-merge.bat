@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Git Zustand wiederherstellen & Mergen
echo ============================================================
echo.

echo [1/5] Aktuellen Stand pruefen...
git status
echo.

echo [2/5] Wechsle zu dev (wo alle Features bereits gemerged sind)...
git checkout dev
echo.

echo [3/5] Wechsle zu main und merge dev...
git checkout main
git merge dev -m "merge: dev in main (Admin-Rolle, Einladungssystem, kein Dienstgrad)"
echo.

echo [4/5] Pushe main und dev zu GitHub...
git push origin main dev
echo.

echo [5/5] Fertig! Aktueller Status:
git status
echo.
pause
