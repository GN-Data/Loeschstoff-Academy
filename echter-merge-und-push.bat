@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - ECHTER MERGE & PUSH
echo ============================================================
echo.

echo [1/6] Stash aktuelle uncommitted Dateien sicher zwischen...
git stash

echo.
echo [2/6] Wechsle zu dev und uebernehme feature/admin-role-and-invites...
git checkout dev
git merge feature/admin-role-and-invites -m "merge: admin-role-and-invites in dev"

echo.
echo [3/6] Wechsle zu main und merge dev...
git checkout main
git merge dev -m "merge: dev in main (Admin-Rolle, Einladungs-PIN, kein Dienstgrad)"

echo.
echo [4/6] Hole neue Dateien (Exporte, Platzhalter, Docs) zurueck...
git stash pop
git add -A
git commit -m "feat: separate exports, info modal, placeholders for admin & dev pins, docs"

echo.
echo [5/6] Synchronisiere dev mit main...
git checkout dev
git merge main -m "merge: main in dev"
git checkout main

echo.
echo [6/6] Pushe BEIDE Branches dev und main zu GitHub...
git push origin main dev

echo.
echo ============================================================
echo   ERFOLGREICH! Pruefe Status:
git status
echo ============================================================
pause
