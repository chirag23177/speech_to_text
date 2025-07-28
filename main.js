const { app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const GoogleCloudSpeechService = require('./google-cloud-service');

// Enable live reload for development
const isDev = process.argv.includes('--dev');

let mainWindow;
let tray;
let googleCloudService;

/**
 * Create the main application window
 */
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false
    },
    show: false,
    titleBarStyle: 'default',
    frame: true
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window minimize to tray
  mainWindow.on('minimize', (event) => {
    if (process.platform === 'darwin') {
      // On macOS, minimize normally
      return;
    }
    
    event.preventDefault();
    mainWindow.hide();
    
    if (!tray) {
      createTray();
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

/**
 * Create system tray
 */
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  // Check if icon exists, if not use a default
  if (!fs.existsSync(iconPath)) {
    console.log('Tray icon not found, creating placeholder');
  }
  
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        if (process.platform === 'darwin') {
          app.dock.show();
        }
      }
    },
    {
      label: 'Start Recording',
      click: () => {
        mainWindow.webContents.send('toggle-recording');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Real-Time Speech Translator');
  tray.setContextMenu(contextMenu);
  
  // Double click to show window
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-session');
          }
        },
        {
          label: 'Export History',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-history');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Audio',
      submenu: [
        {
          label: 'Toggle Recording',
          accelerator: 'CmdOrCtrl+Space',
          click: () => {
            mainWindow.webContents.send('toggle-recording');
          }
        },
        {
          label: 'Switch to Microphone',
          click: () => {
            mainWindow.webContents.send('switch-to-mic');
          }
        },
        {
          label: 'Switch to System Audio',
          click: () => {
            mainWindow.webContents.send('switch-to-system');
          }
        }
      ]
    },
    {
      label: 'Languages',
      submenu: [
        {
          label: 'Swap Languages',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('swap-languages');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('toggle-theme');
          }
        },
        {
          label: 'Toggle History',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('toggle-history');
          }
        },
        {
          label: 'Toggle Performance',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow.webContents.send('toggle-performance');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.minimize();
          }
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.close();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            // Implement update check logic
            console.log('Checking for updates...');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + app.getName(),
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    });

    // Window menu
    template[4].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Register global shortcuts
 */
function registerGlobalShortcuts() {
  // Global shortcut to toggle recording
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-recording');
    }
  });

  // Global shortcut to show/hide app
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// App event listeners
app.whenReady().then(async () => {
  createWindow();
  createMenu();
  registerGlobalShortcuts();
  
  // Initialize Google Cloud services
  try {
    googleCloudService = new GoogleCloudSpeechService();
    const connectionTest = await googleCloudService.testConnection();
    console.log('Google Cloud services initialized:', connectionTest ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Failed to initialize Google Cloud services:', error);
  }

  // Handle app activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before quit
app.on('before-quit', () => {
  app.isQuiting = true;
  
  // Clean up Google Cloud streaming sessions
  if (googleCloudService) {
    console.log('Cleaning up Google Cloud streaming sessions...');
    googleCloudService.stopAllStreams();
  }
});

// Unregister shortcuts when app will quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
  });
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('show-message-box', (event, options) => {
  const { dialog } = require('electron');
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('show-save-dialog', (event, options) => {
  const { dialog } = require('electron');
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', (event, options) => {
  const { dialog } = require('electron');
  return dialog.showOpenDialog(mainWindow, options);
});

// Google Cloud Speech-to-Text and Translate handlers
ipcMain.handle('transcribe-audio', async (event, audioData, languageCode) => {
  if (!googleCloudService) {
    throw new Error('Google Cloud service not initialized');
  }
  
  try {
    // Convert array or ArrayBuffer to Buffer
    let audioBuffer;
    if (Array.isArray(audioData)) {
      audioBuffer = Buffer.from(audioData);
    } else if (audioData instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(audioData);
    } else if (Buffer.isBuffer(audioData)) {
      audioBuffer = audioData;
    } else {
      throw new Error('Unsupported audio data format');
    }
    
    console.log('Processing audio buffer, size:', audioBuffer.length, 'bytes');
    return await googleCloudService.transcribeAudio(audioBuffer, languageCode);
  } catch (error) {
    console.error('Error in transcribe-audio handler:', error);
    throw error;
  }
});

// Streaming speech recognition handlers
ipcMain.handle('start-streaming-recognition', async (event, sessionId, languageCode) => {
  if (!googleCloudService) {
    throw new Error('Google Cloud service not initialized');
  }
  
  try {
    console.log(`Starting streaming recognition for session: ${sessionId}`);
    
    const success = googleCloudService.startStreamingRecognition(
      sessionId,
      languageCode,
      // onTranscript callback
      (result) => {
        // Send transcript result back to renderer
        event.sender.send('streaming-transcript', {
          sessionId,
          ...result
        });
      },
      // onError callback
      (error) => {
        console.error(`Streaming error for session ${sessionId}:`, error);
        event.sender.send('streaming-transcript', {
          sessionId,
          error: error.message
        });
      }
    );
    
    return { success, sessionId };
  } catch (error) {
    console.error('Error starting streaming recognition:', error);
    throw error;
  }
});

ipcMain.handle('send-audio-chunk', async (event, sessionId, audioData) => {
  if (!googleCloudService) {
    throw new Error('Google Cloud service not initialized');
  }
  
  try {
    // Convert array or ArrayBuffer to Buffer
    let audioBuffer;
    if (Array.isArray(audioData)) {
      audioBuffer = Buffer.from(audioData);
    } else if (audioData instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(audioData);
    } else if (Buffer.isBuffer(audioData)) {
      audioBuffer = audioData;
    } else {
      throw new Error('Unsupported audio data format');
    }
    
    const success = googleCloudService.sendAudioChunk(sessionId, audioBuffer);
    return { success };
  } catch (error) {
    console.error('Error sending audio chunk:', error);
    throw error;
  }
});

ipcMain.handle('stop-streaming-recognition', async (event, sessionId) => {
  if (!googleCloudService) {
    throw new Error('Google Cloud service not initialized');
  }
  
  try {
    const success = googleCloudService.stopStreamingRecognition(sessionId);
    return { success };
  } catch (error) {
    console.error('Error stopping streaming recognition:', error);
    throw error;
  }
});

ipcMain.handle('translate-text', async (event, text, targetLanguage, sourceLanguage) => {
  if (!googleCloudService) {
    throw new Error('Google Cloud service not initialized');
  }
  return await googleCloudService.translateText(text, targetLanguage, sourceLanguage);
});

ipcMain.handle('get-speech-languages', async () => {
  if (!googleCloudService) {
    return [];
  }
  return await googleCloudService.getSpeechLanguages();
});

ipcMain.handle('get-translation-languages', async () => {
  if (!googleCloudService) {
    return [];
  }
  return await googleCloudService.getTranslationLanguages();
});

ipcMain.handle('test-google-cloud-connection', async () => {
  if (!googleCloudService) {
    return false;
  }
  return await googleCloudService.testConnection();
});

// Handle app updates and notifications
ipcMain.on('update-tray-tooltip', (event, text) => {
  if (tray) {
    tray.setToolTip(text);
  }
});

ipcMain.on('show-notification', (event, options) => {
  const { Notification } = require('electron');
  
  if (Notification.isSupported()) {
    const notification = new Notification(options);
    notification.show();
  }
});

// Log unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
