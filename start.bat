@echo off
cls
echo.
echo ===============================================
echo    AI Trading Platform Launcher
echo ===============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Starting AI Trading Platform...
echo.

REM Start backend in new window
echo Starting Backend Server...
start "AI Trading Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in new window
echo Starting Frontend Server...
start "AI Trading Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo ===============================================
echo   AI Trading Platform Started Successfully!
echo ===============================================
echo.
echo Frontend:    http://localhost:3000
echo Backend:     http://localhost:5000
echo API Health:  http://localhost:5000/health
echo.
echo Both services are running in separate windows.
echo Close those windows to stop the services.
echo.
pause
