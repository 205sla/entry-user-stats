@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
    echo [Ent2] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [Ent2] npm install failed.
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   Ent2 dev server
echo   http://localhost:3000
echo   Ctrl+C to stop
echo ============================================
echo.

call npm run dev
endlocal
