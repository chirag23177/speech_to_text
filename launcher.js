const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Speech Translator Desktop - Alternative Launcher');
console.log('================================================');

// Check if Electron is available
const electronPaths = [
    path.join(__dirname, 'node_modules', '.bin', 'electron.exe'),
    path.join(__dirname, 'node_modules', '.bin', 'electron'),
    path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe'),
    'npx electron'
];

let electronFound = false;
let electronPath = null;

// Check local installations
for (const ePath of electronPaths.slice(0, -1)) {
    if (fs.existsSync(ePath)) {
        electronFound = true;
        electronPath = ePath;
        console.log(`✓ Found Electron at: ${ePath}`);
        break;
    }
}

if (electronFound) {
    console.log('Starting Electron app...');
    const electronProcess = spawn(electronPath, ['.'], {
        stdio: 'inherit',
        cwd: __dirname
    });

    electronProcess.on('error', (error) => {
        console.error('Error starting Electron:', error.message);
        fallbackToWeb();
    });

    electronProcess.on('close', (code) => {
        console.log(`Electron process exited with code ${code}`);
    });
} else {
    console.log('❌ Electron not found locally. Trying npx...');
    
    const npxProcess = spawn('npx', ['electron@28.1.0', '.'], {
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });

    npxProcess.on('error', (error) => {
        console.error('Error with npx electron:', error.message);
        fallbackToWeb();
    });

    npxProcess.on('close', (code) => {
        if (code !== 0) {
            console.log('npx electron failed, falling back to web version...');
            fallbackToWeb();
        }
    });
}

function fallbackToWeb() {
    console.log('\n🌐 Starting web version instead...');
    console.log('================================================');
    
    try {
        const express = require('express');
        const app = express();
        const PORT = 3001;

        // Serve static files
        app.use(express.static(__dirname));

        // Basic route
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        app.listen(PORT, () => {
            console.log(`✓ Web server running at http://localhost:${PORT}`);
            console.log('🎉 Open this URL in your browser to use the app!');
            
            // Try to open browser automatically
            const { exec } = require('child_process');
            exec(`start http://localhost:${PORT}`, (error) => {
                if (error) {
                    console.log('Please manually open http://localhost:3001 in your browser');
                }
            });
        });

    } catch (error) {
        console.error('Error starting web server:', error.message);
        console.log('\n📋 Manual steps:');
        console.log('1. Install dependencies: npm install express');
        console.log('2. Start web server: node server.js');
        console.log('3. Open http://localhost:3001 in browser');
    }
}
