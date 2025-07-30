# Real-Time Speech Translator Desktop App

A powerful Electron-based desktop application that provides real-time speech-to-text transcription and translation using Google Cloud APIs. Perfect for online meetings, live conversations, and accessibility needs.

## 🚀 Features

### Core Functionality
- **Real-Time Speech Recognition** - Live transcription as you speak
- **Multi-Language Translation** - Instant translation to 100+ languages
- **Socket.IO Streaming** - Low-latency real-time audio processing with fallback support
- **Interim Results** - See words appear as you speak them
- **Auto-Commit** - Automatically finalizes transcripts after speech pauses
- **Voice Activity Detection** - Visual feedback when speech is detected

### Enhanced Features 
- **Performance Monitoring** - Real-time API response tracking and memory usage
- **History Management** - Save and export transcripts with translations
- **Smart Language Swapping** - Intelligent language pair switching
- **Dual-Text History** - Store both original transcription and translation
- **Export Functionality** - Export complete conversation history to text files
- **Error Recovery** - Robust fallback mechanisms for reliable operation

### Audio Processing
- **High-Quality Audio** - 16kHz sample rate with noise suppression
- **Echo Cancellation** - Optimized for clear voice capture
- **Audio Visualization** - Real-time audio level indicators
- **Format Support** - FLAC encoding for optimal quality
- **Simplified Audio Handling** - Reliable microphone input capture

### User Interface
- **Modern Desktop UI** - Clean, professional interface with responsive design
- **Dark/Light Themes** - Customizable appearance
- **Language Swapping** - Quick source/target language switching with smart matching
- **Keyboard Shortcuts** - Efficient workflow controls
- **Copy/Export** - Easy sharing of transcripts and translations
- **Performance Dashboard** - Live statistics and system monitoring

## 🛠️ Technology Stack

### Frontend
- **Electron 28+** - Cross-platform desktop framework
- **HTML5/CSS3** - Modern web technologies
- **JavaScript ES6+** - Native browser APIs
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js 20+** - Server runtime
- **Express.js** - Web server framework
- **Socket.IO Server** - WebSocket communication
- **Google Cloud APIs** - AI-powered services

### APIs & Services
- **Google Cloud Speech-to-Text** - Advanced speech recognition
- **Google Cloud Translate** - Professional translation service
- **WebRTC** - Browser audio capture
- **MediaRecorder API** - Audio streaming

## 📁 Project Structure

```
speech_to_text/
├── main.js                    # Electron main process
├── preload.js                # Secure IPC bridge
├── index.html                # Desktop app UI
├── app-google-cloud.js       # Frontend application logic
├── styles.css                # Application styling
├── server.js                 # Socket.IO streaming server
├── google-cloud-service.js   # Google Cloud API integration
├── credentials.json          # Google Cloud service account key
├── package.json              # Dependencies and scripts
├── start.bat                 # Windows startup script
├── plan.md                   # Development roadmap
├── README.md                 # This file
├── LICENSE                   # MIT License
└── .vscode/
    └── tasks.json            # VS Code development tasks
```

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

#### Start Socket.IO Server
```bash
# Terminal 1
node server.js
```

#### Start Desktop App
```bash
# Terminal 2
npm start
```

## 🎮 Usage Guide

### Basic Operation
1. **Launch App** - Run `npm start`
2. **Select Languages** - Choose source (speech) and target (translation) languages
3. **Start Recording** - Click record button or press `Ctrl+Space`
4. **Speak Clearly** - Talk normally into your microphone
5. **View Results** - See live transcription and translation
6. **Stop Recording** - Click stop or press `Escape`

### Keyboard Shortcuts
- `Ctrl+Space` - Start/Stop recording
- `Ctrl+S` - Swap source/target languages
- `Escape` - Stop recording

### Performance Features
- **Live Statistics** - Real-time API call monitoring and response times
- **Memory Tracking** - Monitor application memory usage
- **Success Rate Monitoring** - Track API call success/failure rates
- **Error Handling** - Comprehensive error recovery with user feedback

### History & Export
- **Complete History** - Save both transcriptions and translations
- **Export Options** - Export conversation history to text files
- **Copy Functions** - Quick copy of original text or translations
- **Persistent Storage** - Local storage of conversation history

### Tips for Best Results
- **Speak Clearly** - Enunciate words properly
- **Minimize Background Noise** - Use headphones if possible
- **Good Microphone** - Quality audio input improves accuracy
- **Stable Internet** - Required for Google Cloud APIs
- **Language Selection** - Choose correct source language for optimal results

## 🔧 Development

### Project Scripts
```bash
npm start          # Launch Electron app
npm run dev        # Development mode with hot reload
npm run build      # Build production package
npm run server     # Start Socket.IO server only
npm test          # Run test suite
```

### Key Components

#### Electron Main Process (`main.js`)
- Window management
- IPC communication
- Google Cloud API calls
- Security context isolation

#### Frontend App (`app-google-cloud.js`)
- Socket.IO client connection with fallback support
- Audio capture and streaming
- UI interaction handling
- Real-time result processing
- Performance monitoring and statistics
- History management with dual-text storage
- Smart language swapping with fallback logic
- Error recovery and user feedback

#### Streaming Server (`server.js`)
- Socket.IO WebSocket server
- Google Cloud streaming integration
- Audio data processing
- Voice activity detection

#### Google Cloud Service (`google-cloud-service.js`)
- Speech-to-Text API wrapper
- Translation API integration
- Error handling and retries
- Credential management

## 🐛 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Google Cloud authentication errors
- Verify `credentials.json` is in project root
- Check service account permissions
- Ensure APIs are enabled in Google Cloud Console

#### Socket.IO connection failed
- Check if server is running on port 3001
- Verify no firewall blocking localhost connections
- Restart both server and desktop app

#### No audio input detected
- Check microphone permissions in OS settings
- Verify microphone is working in other applications
- Try different audio input device

#### Poor transcription accuracy
- Ensure correct source language is selected
- Improve audio quality (use headphones, reduce background noise)
- Speak more clearly and at moderate pace

### Debug Mode
Enable verbose logging:
```bash
DEBUG=speech-translator:* npm start
```

## 📈 Performance

### Optimizations Implemented
- **250ms Audio Chunks** - Optimal balance of latency and quality
- **Efficient Buffering** - Minimizes memory usage
- **Connection Pooling** - Reuses Google Cloud connections
- **Error Recovery** - Automatic retry mechanisms with fallback support
- **Resource Cleanup** - Proper disposal of audio streams
- **Performance Tracking** - Real-time monitoring of API calls and system resources
- **Intelligent Caching** - Smart caching of translation results
- **Memory Management** - Optimized memory usage with periodic cleanup

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: Dual-core 2.0GHz or better
- **Internet**: Stable broadband connection
- **Storage**: 500MB free space

## 📋 Changelog

### v1.2 (Current) - Enhanced Edition
- ✅ **Performance Monitoring** - Real-time API call tracking and statistics
- ✅ **Dual-Text History** - Save both transcriptions and translations
- ✅ **Smart Language Swapping** - Intelligent language pair matching with fallbacks
- ✅ **Export Functionality** - Export complete conversation history to text files
- ✅ **Enhanced Copy Features** - Quick copy buttons for original and translated text
- ✅ **Simplified Audio Handling** - More reliable microphone input capture
- ✅ **Memory Usage Tracking** - Live memory monitoring and optimization
- ✅ **Improved Error Handling** - Comprehensive error recovery and user feedback

### v1.1 - Performance Edition  
- ✅ **Live Statistics Dashboard** - Real-time performance monitoring
- ✅ **API Response Tracking** - Monitor response times and success rates
- ✅ **Memory Usage Indicators** - Track application memory consumption
- ✅ **Enhanced Error Recovery** - Better handling of API failures

### v1.0 - Initial Release
- ✅ **Real-Time Speech Recognition** - Google Cloud Speech-to-Text integration
- ✅ **Live Translation** - Multi-language translation support
- ✅ **Socket.IO Streaming** - Low-latency audio processing
- ✅ **Modern Desktop UI** - Professional Electron-based interface

## 🔒 Security & Privacy

### Data Handling
- **No Local Storage** - Audio data is processed in real-time only
- **Secure Transmission** - All data encrypted in transit
- **Google Cloud Privacy** - Follows Google's data protection policies
- **No Audio Recording** - Audio is streamed, not saved locally

### Credentials Security
- Keep `credentials.json` secure and private
- Never commit credentials to version control
- Rotate service account keys regularly
- Use least-privilege access principles

## 🚧 Recent Improvements (v1.2)

### Performance Monitoring
- **Real-time Statistics** - Live API call tracking, response times, and success rates
- **Memory Usage Tracking** - Monitor application memory consumption
- **Performance Dashboard** - Visual indicators for system health
- **Error Tracking** - Comprehensive error logging and recovery

### Enhanced History System
- **Dual-Text Storage** - Save both original transcription and translation
- **Export Functionality** - Export complete conversation history to text files
- **Copy Options** - Quick copy buttons for both original and translated text
- **Persistent Storage** - Local storage with history limit management (100 items)

### Smart Language Features
- **Intelligent Language Swapping** - Automatic language pair matching with fallbacks
- **Cross-Language Compatibility** - Smart matching between speech and translation languages
- **Language Code Conversion** - Automatic conversion between different language code formats

### Simplified Audio Handling
- **Reliable Microphone Input** - Simplified audio capture for better stability
- **Enhanced Error Handling** - Specific error messages for different audio issues
- **Improved Permissions** - Better handling of microphone access permissions

## 🚧 Known Limitations

- **Windows Optimized** - Currently optimized for Windows platform
- **Internet Required** - Requires active internet for Google Cloud APIs  
- **Microphone Input Only** - Currently supports microphone input (system audio capture removed for stability)
- **Single User** - Designed for individual use, not multi-user sessions

## 🛣️ Roadmap

See `plan.md` for detailed development roadmap and future features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- **GitHub Issues** - [Create an issue](https://github.com/chirag23177/speech_to_text/issues)
- **Documentation** - Check this README and `plan.md`
- **Google Cloud Docs** - [Speech-to-Text](https://cloud.google.com/speech-to-text/docs) | [Translate](https://cloud.google.com/translate/docs)

---

Made by [Chirag](https://github.com/chirag23177)
