@echo off
chcp 65001 >nul
echo Starte Feuerwehr Pruefungs- und Ausbildungs-Trainer...
start "" "http://localhost:3000"
node server.js
pause
