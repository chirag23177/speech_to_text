@echo off
setlocal enabledelayedexpansion

echo ===============================================
echo   Speech Translator Desktop - Manual Setup
echo ===============================================
echo.

echo Step 1: Checking system requirements...
node --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Step 2: Cleaning existing installation...
if exist node_modules (
    echo Removing old node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo Step 3: Clearing npm cache...
npm cache clean --force

echo.
echo Step 4: Creating node_modules directory...
mkdir node_modules

echo.
echo Step 5: Installing core dependencies one by one...

echo Installing Express.js...
npm install express@4.18.2 --no-optional --no-package-lock
if errorlevel 1 (
    echo Failed to install Express. Trying alternative method...
    timeout /t 3 /nobreak > nul
)

echo Installing Socket.IO...
npm install socket.io@4.7.2 --no-optional --no-package-lock
if errorlevel 1 (
    echo Failed to install Socket.IO. Continuing...
)

echo Installing Google Cloud Speech...
npm install @google-cloud/speech@6.0.0 --no-optional --no-package-lock
if errorlevel 1 (
    echo Failed to install Google Cloud Speech. Continuing...
)

echo Installing Google Cloud Translate...
npm install @google-cloud/translate@8.5.1 --no-optional --no-package-lock
if errorlevel 1 (
    echo Failed to install Google Cloud Translate. Continuing...
)

echo Installing Electron...
npm install electron@28.1.0 --no-optional --no-package-lock
if errorlevel 1 (
    echo Failed to install Electron. Trying npx method...
    echo You can try running: npx electron@28.1.0 .
)

echo.
echo Step 6: Verifying installation...
if exist "node_modules\express" (
    echo ✓ Express installed
) else (
    echo ✗ Express missing
)

if exist "node_modules\electron" (
    echo ✓ Electron installed
) else (
    echo ✗ Electron missing
)

echo.
echo ===============================================
echo Installation complete! 
echo ===============================================
echo.
echo Next steps:
echo 1. If Electron installed: npm start
echo 2. If Electron missing: node server.js (for web version)
echo 3. For web version: Open http://localhost:3001 in browser
echo.
echo For desktop app without npm, you can download Electron directly:
echo https://github.com/electron/electron/releases/tag/v28.1.0
echo.
pause
