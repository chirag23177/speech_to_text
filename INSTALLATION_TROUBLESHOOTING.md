# 🔧 Troubleshooting Installation Issues

## Problem
When running `npm start` or `npm run build-win`, you get errors like:
```
Error: Cannot find module 'C:\...\node_modules\electron\cli.js'
Error: Cannot find module 'C:\...\node_modules\electron-builder\cli.js'
```

## Root Cause
The Electron and electron-builder packages are not properly installed in your `node_modules` directory.

## Solutions (Try in Order)

### Solution 1: Force Clean Installation
```bash
# Delete node_modules and package-lock.json
rmdir /s /q node_modules
del package-lock.json

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install
```

### Solution 2: Install Core Dependencies Individually
```bash
# Install Electron specifically
npm install electron@28.1.0 --save

# Install Electron Builder
npm install electron-builder@24.9.1 --save-dev

# Install Google Cloud APIs
npm install @google-cloud/speech@6.0.0 @google-cloud/translate@8.5.1 --save

# Verify installation
npm ls electron
npm ls electron-builder
```

### Solution 3: Use Yarn Instead of npm
```bash
# Install Yarn if not already installed
npm install -g yarn

# Install dependencies with Yarn
yarn install

# Run the app
yarn start
```

### Solution 4: Manual Electron Installation
```bash
# Download and install Electron manually
npx electron@28.1.0 --version

# If that works, install locally
npm install electron@28.1.0 --save --force
```

### Solution 5: Use Pre-built Electron Binary
```bash
# Install without optional dependencies
npm install --no-optional

# Install Electron without building native modules
npm install electron@28.1.0 --save --ignore-scripts
```

### Solution 6: Alternative Runtime
If Electron continues to fail, you can run the web version:
```bash
# Start the web server instead
npm run web-start

# Then open http://localhost:3001 in your browser
```

## Verification Steps

After any solution, verify the installation:

1. **Check if electron is installed:**
   ```bash
   dir node_modules\electron
   ```

2. **Test electron directly:**
   ```bash
   .\node_modules\.bin\electron --version
   ```

3. **Try running the app:**
   ```bash
   npm start
   ```

## Common Issues and Fixes

### Issue: "EACCES: permission denied"
**Fix:** Run command prompt as Administrator

### Issue: "NETWORK timeout"
**Fix:** 
```bash
npm config set registry https://registry.npmjs.org/
npm config set timeout 60000
npm install
```

### Issue: "gyp ERR! stack Error: Python executable not found"
**Fix:** Install Windows Build Tools:
```bash
npm install --global windows-build-tools
```

### Issue: Firewall/Antivirus blocking
**Fix:** 
- Temporarily disable antivirus
- Add npm/node to firewall exceptions
- Use corporate/VPN network if behind proxy

## Working Desktop App Without Full Dependencies

If installations keep failing, you can use this minimal approach:

1. Copy `package-minimal.json` to `package.json`
2. Install only core dependencies:
   ```bash
   npm install electron@28.1.0 @google-cloud/speech @google-cloud/translate
   ```
3. Audio features will be limited but basic functionality will work

## Alternative: Portable Electron

Download pre-built Electron and run directly:

1. Download Electron from: https://github.com/electron/electron/releases
2. Extract to project folder
3. Run: `electron.exe .`

## Contact for Support

If none of these solutions work:
1. Check your Node.js version: `node --version` (should be 16+)
2. Check your npm version: `npm --version` (should be 8+)
3. Report the issue with full error logs

---

**Next Steps After Installation:**
Once Electron is installed, you can run:
- `npm start` - Start the desktop app
- `npm run dev` - Start in development mode with console
- `npm run build-win` - Build Windows installer
