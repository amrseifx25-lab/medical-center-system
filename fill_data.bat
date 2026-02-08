@echo off
cd /d "%~dp0"
echo Initializing Database (Creating Tables & Seeding Data)...
cd backend && "C:\Program Files\nodejs\node.exe" setup_full.js
echo.
if %errorlevel% neq 0 (
    echo ❌ Error occurred! Check the message above.
) else (
    echo ✅ Database Ready!
)
pause
