@echo off
echo.
echo ================================
echo Real-Time Speech Translator
echo ================================
echo.
echo Starting Socket.IO server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if credentials exist
if not exist "credentials.json" (
    echo.
    echo Warning: credentials.json not found
    echo Please add your Google Cloud credentials file
    echo See README.md for setup instructions
    echo.
    pause
)

REM Start the server
echo Starting server on http://localhost:3001
start "Speech Translator Server" cmd /k "node server.js"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start the desktop app
echo Starting desktop application...
npm start

echo.
echo Application closed.
pause
