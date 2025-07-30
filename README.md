# 🎤 Real-Time Speech Translator Desktop

A powerful, professional-grade Electron desktop application that provides real-time speech-to-text transcription and translation using Google Cloud AI. Perfect for meetings, conversations, accessibility, and language learning.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)

## ✨ Key Features

### 🎯 **Core Functionality**
- **🎤 Real-Time Speech Recognition** - Live transcription with Google Cloud Speech-to-Text
- **🌍 Multi-Language Translation** - Instant translation to 100+ languages 
- **⚡ Socket.IO Streaming** - Low-latency audio processing with auto-restart capabilities
- **🔄 Smart Language Swapping** - Intelligent language pair switching
- **📊 Performance Monitoring** - Real-time API tracking and system metrics
- **💾 History Management** - Save, search, and export complete conversation history

### 🎨 **User Experience**
- **🖥️ Modern Desktop Interface** - Clean, responsive design with dark/light themes
- **⌨️ Keyboard Shortcuts** - Efficient workflow controls and global hotkeys
- **🔔 System Tray Integration** - Minimize to tray with quick access
- **📱 Cross-Platform Ready** - Built on Electron for future multi-platform support
- **🎛️ Audio Visualization** - Real-time audio level indicators
- **⚠️ Error Recovery** - Robust fallback mechanisms for reliable operation

### 🔧 **Technical Excellence**
- **🎵 High-Quality Audio** - 16kHz sampling with echo cancellation and noise suppression
- **🔄 Auto-Restart Streaming** - Handles long pauses without losing connection
- **💻 Performance Dashboard** - Live API response times and memory usage
- **📤 Export Functionality** - Multiple export formats for conversations
- **🛡️ Secure Design** - Context isolation and secure IPC communication

## 🔧 Setup Instructions

### Prerequisites
- **Node.js 20+** - [Download here](https://nodejs.org/)
- **Google Cloud Account** - [Create account](https://cloud.google.com/)
- **Windows 10/11** - Current supported platform

### 1. Clone Repository
```bash
git clone https://github.com/chirag23177/speech_to_text.git
cd speech_to_text
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Google Cloud Setup

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable required APIs:
   - Cloud Speech-to-Text API
   - Cloud Translation API

#### Create Service Account
1. Navigate to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Name: `speech-translator-app`
4. Grant roles:
   - **Cloud Speech Client**
   - **Cloud Translation API User**
5. Create and download JSON key file
6. Rename to `credentials.json` and place in project root

### 4. Configuration
Ensure `credentials.json` is in the project root:
```
speech_to_text/
├── credentials.json  ← Your Google Cloud key file
├── package.json
└── ...
```

### 5. Run Application

#### Through Terminal Manually
##### Start Socket.IO Server
```bash
# Terminal 1
node server.js
```

##### Start Desktop App
```bash
# Terminal 2
npm start
```

#### One Click Startup

 Double click on the `start.bat` file


## 📊 Performance Features

### Real-Time Monitoring
- **API Response Times** - Track Speech-to-Text and Translation latency
- **Memory Usage** - Monitor application resource consumption  
- **Connection Status** - Live Google Cloud API connectivity
- **Stream Health** - Audio processing and reconnection stats

### Optimization Features
- **Stream Auto-Restart** - Handles service interruptions seamlessly
- **Audio Buffer Management** - Efficient memory usage
- **Error Recovery** - Automatic reconnection and retry logic
- **Performance Metrics** - Historical data for troubleshooting

## 🌐 Supported Languages

### Speech Recognition (Input)
- English (US, UK, AU, IN)
- Spanish (ES, MX, AR)
- French (FR, CA)
- German, Italian, Portuguese
- Japanese, Korean, Chinese (Mandarin)
- Arabic, Hindi, Russian
- And many more languages

### Translation (Output)
- All Google Translate supported languages (100+)
- Real-time translation confidence scores

## 🛠️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Electron      │    │   Socket.IO      │    │  Google Cloud   │
│   Frontend      │◄──►│   Server         │◄──►│  APIs           │
│                 │    │                  │    │                 │
│ • UI/UX         │    │ • Audio Stream   │    │ • Speech-to-Text│
│ • Audio Capture │    │ • Real-time Comm │    │ • Translation   │
│ • User Controls │    │ • Error Handling │    │ • AI Processing │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Components

- **`main.js`** - Electron main process, window management, system tray
- **`app-google-cloud.js`** - Frontend application with Socket.IO client
- **`server.js`** - Socket.IO server with Google Cloud integration
- **`google-cloud-service.js`** - Google Cloud API wrapper service
- **`preload.js`** - Secure IPC bridge between main and renderer



## 🐛 Troubleshooting

### Common Issues

**🔧 App Crashes on Minimize**
- Fixed in v1.0.0 with robust tray handling
- Use emergency restore: `Ctrl+Alt+S`

**🔧 Stream Cancellation Errors**
- Auto-restart streaming handles long pauses
- Check console for reconnection messages

**🔧 Missing Tray Icon**
- Check Windows notification area
- Look for hidden icons (click "^" arrow)
- Enable in Windows Settings → Taskbar

**🔧 Audio Not Working**
- Grant microphone permissions
- Check system audio settings
- Restart application if needed

**🔧 Google Cloud Errors**
- Verify `credentials.json` is valid
- Check API quotas and billing
- Ensure APIs are enabled

### Debug Mode

```bash
npm run dev  # Starts with DevTools open
```

Console output shows:
- Google Cloud connection status
- Audio stream health
- Tray creation success
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Cloud AI** - Speech recognition and translation services
- **Socket.IO** - Real-time communication framework
- **Electron** - Cross-platform desktop application framework
- **Node.js Community** - Extensive package ecosystem

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/chirag23177/speech_to_text/issues)
- **Discussions:** [GitHub Discussions](https://github.com/chirag23177/speech_to_text/discussions)


---

Made by [Chirag Yadav](https://github.com/chirag23177)
