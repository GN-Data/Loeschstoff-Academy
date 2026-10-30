@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Wechsle auf Feature-Branch
echo ============================================================
echo.

git checkout feature/admin-role-and-invites
git status
echo.
pause
