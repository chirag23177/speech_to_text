@echo off
echo Installing Speech Translator Desktop Dependencies...
echo.

echo Checking Node.js version...
node --version
echo.

echo Checking npm version...
npm --version
echo.

echo Installing Electron...
npm install electron@28.1.0 --no-optional
if errorlevel 1 (
    echo Failed to install Electron
    pause
    exit /b 1
)

echo Installing Electron Builder...
npm install electron-builder@24.9.1 --save-dev --no-optional
if errorlevel 1 (
    echo Failed to install Electron Builder
    pause
    exit /b 1
)

echo Installing Google Cloud dependencies...
npm install @google-cloud/speech @google-cloud/translate --no-optional
if errorlevel 1 (
    echo Failed to install Google Cloud dependencies
    pause
    exit /b 1
)

echo Installing audio processing dependencies...
npm install node-record-lpcm16 speaker fluent-ffmpeg ffmpeg-static wav --no-optional
if errorlevel 1 (
    echo Failed to install audio dependencies
    pause
    exit /b 1
)

echo Installing development dependencies...
npm install nodemon --save-dev --no-optional
if errorlevel 1 (
    echo Failed to install dev dependencies
    pause
    exit /b 1
)

echo.
echo All dependencies installed successfully!
echo.
echo You can now run:
echo   npm start     - Start the desktop app
echo   npm run dev   - Start in development mode
echo   npm run build - Build the app for distribution
echo.
pause
