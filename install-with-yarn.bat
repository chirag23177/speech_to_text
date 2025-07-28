@echo off
echo Installing Yarn package manager as alternative to npm...
npm install -g yarn

echo.
echo Installing dependencies with Yarn...
yarn install

echo.
echo Testing installation...
yarn electron --version

echo.
echo If successful, you can now use:
echo   yarn start     - Start the desktop app
echo   yarn run dev   - Start in development mode
echo   yarn run build - Build the app
echo.
pause
