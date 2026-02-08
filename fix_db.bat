@echo off
cd /d "%~dp0"
echo Checking Database Connection...
cd backend && node auto_fix_db.js
echo.
pause
