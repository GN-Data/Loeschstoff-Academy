@echo off
chcp 65001 >nul
cd /d "C:\Projekte\Löschstoff Academy"

echo ============================================================
echo   LÖSCHSTOFF ACADEMY - Merge & Push Diagnose
echo ============================================================
echo.

echo [1] Aktueller Status:
git status
echo.

echo [2] Fuege alle Dateien hinzu (inkl. Ordner docs/ falls vorhanden):
git add -A
git commit -m "feat(docs-and-config): update documents, pdfs and config"
echo.

echo [3] Aktueller Branch checkout & Merge:
git checkout dev
git merge feature/admin-role-and-invites -m "merge: feature/admin-role-and-invites in dev"
echo.

git checkout main
git merge dev -m "merge: dev in main"
echo.

echo [4] Push zu GitHub origin:
git push origin main dev
echo.

echo [5] Status nach Push:
git status
echo.
pause
