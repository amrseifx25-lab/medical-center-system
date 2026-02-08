@echo off
cd /d "%~dp0"
echo Starting Medical Center System...

:: Fix Path for Node.js
set PATH=%PATH%;C:\Program Files\nodejs

:: Start Backend
start "Medical Center Backend" cmd /k "cd backend && npm run dev"

:: Start Frontend
start "Medical Center Frontend" cmd /k "cd frontend && npm run dev"

echo System Started! Check the new windows.
timeout /t 5
