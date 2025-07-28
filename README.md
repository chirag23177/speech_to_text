# 🖥️ Real-Time Speech Translator Desktop

A powerful cross-platform desktop application that provides real-time speech-to-text transcription and translation with **system audio capture** capabilities. Perfect for online meetings, webinars, and any audio content on your computer.

![Project Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28%2B-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)

## 🎯 Key Features

### 🎙️ Advanced Audio Capture
- **Microphone Input**: Traditional microphone recording
- **System Audio Loopback**: Capture audio from Zoom, Meet, YouTube, etc.
- **Multiple Device Support**: Auto-detect and select from available audio devices
- **Real-time Audio Visualization**: Live audio level display and animated bars

### 🌍 Real-Time Translation
- **25+ Source Languages**: Support for major world languages via Google Speech-to-Text
- **70+ Target Languages**: Translate to any language supported by Google Translate
- **Instant Processing**: Live transcription and translation as you speak
- **High Accuracy**: Enterprise-grade Google Cloud APIs

### 🖥️ Desktop Experience
- **Cross-Platform**: Windows, macOS, and Linux support
- **System Tray Integration**: Minimize to tray with quick access
- **Global Shortcuts**: Control the app from anywhere
- **Offline UI**: Works without internet for the interface (APIs require connection)

### 📊 Advanced Features
- **Translation History**: Save, search, and export translation sessions
- **Performance Dashboard**: Monitor API usage, cache performance, and latency
- **Smart Caching**: Reduce API calls with intelligent translation caching
- **Multiple Themes**: Light and dark themes with automatic saving
- **Keyboard Shortcuts**: Full keyboard navigation and control

## 🛠️ Technology Stack

### Desktop Framework
- **Electron 28+**: Cross-platform desktop app framework
- **Node.js 16+**: JavaScript runtime for backend processing
- **HTML5/CSS3/JavaScript**: Modern web technologies for UI

### Audio Processing
- **node-record-lpcm16**: Microphone audio capture
- **FFmpeg**: System audio capture and processing
- **Web Audio API**: Real-time audio visualization
- **PCM/WAV**: High-quality audio format support

### Cloud Services
- **Google Cloud Speech-to-Text**: Advanced speech recognition
- **Google Cloud Translation API v2**: Professional translation service
- **Real-time Streaming**: Continuous audio processing

### Architecture
- **Main Process**: Electron main process for system integration
- **Renderer Process**: UI and application logic
- **Modular Design**: Separate modules for audio, transcription, and translation
- **IPC Communication**: Secure inter-process communication

## 📁 Project Structure

```
speech_to_text/
├── 📄 main.js                # Electron main process
├── 🎨 renderer.js             # UI logic and coordination
├── 🎙️ audioCapture.js         # Audio capture (mic + system)
├── 📝 transcriber.js          # Google Speech-to-Text integration
├── 🌍 translator.js           # Google Translate integration
├── 🖼️ index.html              # Desktop UI layout
├── 🎨 styles.css              # Desktop-optimized styling
├── 📦 package.json            # Dependencies and build config
├── 🔐 credentials.json        # Google Cloud service account
├── 📋 plan.md                 # Development roadmap
├── 📖 README.md               # This documentation
├── 🔧 .vscode/
│   └── tasks.json             # VS Code build tasks
├── 🖼️ assets/
│   ├── icon.png               # App icon (512x512)
│   ├── icon.ico               # Windows icon
│   └── icon.icns              # macOS icon
├── 🌐 Legacy Files (for reference):
│   ├── server.js              # Original web server
│   └── script.js              # Original web client
└── 📂 node_modules/           # Dependencies
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+**: [Download](https://nodejs.org/)
- **Google Cloud Account**: [Sign up](https://cloud.google.com/)
- **FFmpeg** (for system audio): [Download](https://ffmpeg.org/download.html)

### 1. Clone and Install
```bash
git clone https://github.com/chirag23177/speech_to_text.git
cd speech_to_text
npm install
```

### 2. Google Cloud Setup
1. Create a [Google Cloud Project](https://console.cloud.google.com/)
2. Enable APIs:
   - [Speech-to-Text API](https://console.cloud.google.com/apis/library/speech.googleapis.com)
   - [Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
3. Create Service Account with roles:
   - `Cloud Speech Client`
   - `Cloud Translation API User`
4. Download JSON key as `credentials.json` in project root

### 3. System Audio Setup (Optional)

#### Windows
- Enable "Stereo Mix" in Sound settings, or
- Install [VB-Cable](https://vb-audio.com/Cable/) for virtual audio routing

#### macOS
- Install [BlackHole](https://github.com/ExistentialAudio/BlackHole) or
- Use [SoundFlower](https://github.com/mattingalls/Soundflower)

#### Linux
- PulseAudio monitor devices are auto-detected
- Use `pavucontrol` to manage audio routing

### 4. Run the Application
```bash
# Development mode (with console)
npm run dev

# Production mode
npm start
```

## 🎮 How to Use

### Basic Operation
1. **Launch App**: Double-click or run `npm start`
2. **Select Audio**: Choose microphone or system audio mode
3. **Pick Languages**: Source (speech) and target (translation)
4. **Start Recording**: Click record button or press `Ctrl+Space`
5. **View Results**: See live transcription and translation

### System Audio Capture
1. **Switch Mode**: Click "Switch to System Audio"
2. **Select Device**: Choose your system's loopback device
3. **Start Meeting**: Open Zoom, Meet, YouTube, etc.
4. **Record**: Capture and translate any audio playing on your system

### Keyboard Shortcuts
- `Ctrl+Space`: Toggle recording
- `Ctrl+S`: Swap source/target languages
- `Ctrl+T`: Toggle light/dark theme
- `Ctrl+H`: Show/hide translation history
- `Ctrl+P`: Show/hide performance dashboard
- `Ctrl+Shift+Space`: Global recording toggle (even when app is minimized)
- `Ctrl+Shift+T`: Global show/hide app
- `Escape`: Stop recording

### Menu Features
- **File Menu**: New session, export history
- **Audio Menu**: Recording controls, device switching
- **View Menu**: Themes, panels, developer tools
- **Help Menu**: About dialog, update checks

## ⚙️ Configuration

### Audio Settings
```javascript
// Customize in audioCapture.js
const audioConfig = {
  sampleRate: 16000,    // 16kHz for Google Speech
  channels: 1,          // Mono audio
  threshold: 500,       // Audio level threshold
  silenceTimeout: 2000  // 2 seconds silence detection
};
```

### Translation Settings
```javascript
// Customize in translator.js
const translationConfig = {
  cacheMaxSize: 1000,   // Max cached translations
  rateLimitDelay: 100,  // 100ms between API calls
  confidence: 0.8       // Minimum confidence threshold
};
```

### Environment Variables
```bash
# Optional: Custom Google Cloud Project
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Optional: Custom port for legacy web mode
PORT=3001
```

## 📦 Building & Distribution

### Development Build
```bash
npm run dev
```

### Production Build
```bash
# All platforms
npm run build

# Platform-specific
npm run build-win    # Windows installer
npm run build-mac    # macOS DMG
npm run build-linux  # Linux AppImage
```

### Distribution Files
- **Windows**: `.exe` installer and portable app
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` portable executable

## 🔧 System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.13, Ubuntu 18.04
- **RAM**: 4GB (8GB recommended)
- **Storage**: 500MB for app + dependencies
- **Network**: Internet connection for translation APIs

### Recommended Setup
- **OS**: Windows 11, macOS 12+, Ubuntu 20.04+
- **RAM**: 8GB+ for optimal performance
- **Audio**: Dedicated sound card for better system audio capture
- **Network**: Stable broadband for real-time processing

## 🐛 Troubleshooting

### Audio Issues
**No microphone devices detected:**
- Check microphone permissions in OS settings
- Restart the application
- Try running as administrator (Windows)

**System audio not working:**
- Ensure virtual audio drivers are installed
- Check audio routing in system settings
- Verify FFmpeg is installed and accessible

**Poor audio quality:**
- Check microphone settings
- Reduce background noise
- Ensure stable internet connection

### Translation Issues
**"Failed to initialize Speech client":**
- Verify `credentials.json` file exists and is valid
- Check Google Cloud project and API enablement
- Ensure service account has correct permissions

**Slow translation:**
- Check internet connection speed
- Monitor API quota usage
- Clear translation cache if memory is low

**Inaccurate transcription:**
- Speak clearly and at moderate pace
- Check if source language is correct
- Reduce background noise

### Application Issues
**App won't start:**
- Check Node.js version (16+ required)
- Run `npm install` to ensure dependencies
- Check console for error messages

**Global shortcuts not working:**
- Restart application
- Check for conflicting shortcuts
- Run with elevated permissions if needed

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature-desktop-enhancement`
3. Follow the existing code architecture
4. Test on multiple platforms
5. Submit pull request

### Code Architecture
- **main.js**: Electron main process, window management, system integration
- **renderer.js**: UI coordination and event handling
- **audioCapture.js**: Cross-platform audio input handling
- **transcriber.js**: Google Speech-to-Text API integration
- **translator.js**: Google Translate API with caching

### Testing
```bash
# Run in development mode
npm run dev

# Test builds
npm run pack    # Package without installer
npm run dist    # Full distribution build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Cloud**: Speech-to-Text and Translation APIs
- **Electron**: Cross-platform desktop framework
- **FFmpeg**: Audio processing capabilities
- **Node.js Community**: Audio capture libraries
- **Contributors**: All developers who helped improve this project

## 📞 Support & Links

### Documentation
- [Electron Documentation](https://www.electronjs.org/docs)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Google Cloud Translation](https://cloud.google.com/translate/docs)

### Community
- [Issues](https://github.com/chirag23177/speech_to_text/issues): Bug reports and feature requests
- [Discussions](https://github.com/chirag23177/speech_to_text/discussions): Community support
- [Wiki](https://github.com/chirag23177/speech_to_text/wiki): Additional documentation

### System Audio Setup Guides
- [Windows Audio Loopback Setup](https://github.com/chirag23177/speech_to_text/wiki/Windows-Audio-Setup)
- [macOS Audio Routing Guide](https://github.com/chirag23177/speech_to_text/wiki/macOS-Audio-Setup)
- [Linux PulseAudio Configuration](https://github.com/chirag23177/speech_to_text/wiki/Linux-Audio-Setup)

---

**🌟 Transform your multilingual communication with real-time desktop translation!**

*Desktop Version - Last updated: July 28, 2025*

## 🎯 Features

### Core Features
- **Real-Time Speech Recognition**: Advanced speech-to-text using Google Cloud Speech-to-Text API
- **Instant Translation**: Translate between 70+ languages using Google Cloud Translation API
- **Live Audio Visualization**: Real-time audio level visualization with animated bars
- **Continuous Speech Processing**: Supports long-form speech with auto-commit functionality
- **Multi-Language Support**: Support for 25+ source languages and 70+ target languages

### Advanced Features
- **Translation History**: Save, export, and manage translation history
- **Performance Dashboard**: Monitor cache performance, API usage, and latency
- **Translation Caching**: Intelligent caching system for improved performance
- **Theme Support**: Light and dark theme with automatic preference saving
- **Keyboard Shortcuts**: Comprehensive keyboard shortcuts for power users
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Offline Fallback**: Manual text input when speech recognition is unavailable

### User Experience
- **Popular Language Shortcuts**: Quick access to common language pairs
- **Copy & Export**: Easy copy-to-clipboard and history export functionality
- **Visual Feedback**: Smooth animations and loading states
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: ARIA labels and keyboard navigation support

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with CSS Grid, Flexbox, and custom properties
- **JavaScript (ES6+)**: Modern JavaScript with async/await, classes, and modules
- **Socket.IO Client**: Real-time communication for streaming transcription
- **Web APIs**: MediaDevices, Web Audio, SpeechSynthesis APIs

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **Socket.IO**: Real-time bidirectional communication
- **Multer**: Handling multipart/form-data for file uploads
- **CORS**: Cross-Origin Resource Sharing middleware

### Cloud Services
- **Google Cloud Speech-to-Text API**: Advanced speech recognition
- **Google Cloud Translation API v2**: Professional-grade translation
- **Google Cloud IAM**: Secure authentication and authorization

### Development Tools
- **npm**: Package management
- **Nodemon**: Development server with auto-restart
- **VS Code**: Development environment with custom tasks

## 📁 Project Structure

```
speech_to_text/
├── 📄 index.html              # Main HTML file with app structure
├── 🎨 styles.css              # Complete CSS with themes and responsive design
├── ⚡ script.js               # Main JavaScript application logic
├── 🖥️ server.js               # Express.js backend server
├── 📦 package.json            # Node.js dependencies and scripts
├── 🔐 credentials.json        # Google Cloud service account credentials
├── 📋 plan.md                 # Project development plan and phases
├── 📖 README.md               # Project documentation (this file)
├── 🔧 .vscode/
│   └── tasks.json             # VS Code tasks configuration
├── 📁 assets/                 # Static assets (currently empty)
├── 🔒 .gitignore              # Git ignore rules
└── 📂 node_modules/           # Node.js dependencies (auto-generated)
```

## 🚀 Setup Instructions

### Prerequisites
- **Node.js 16+**: [Download from nodejs.org](https://nodejs.org/)
- **Google Cloud Account**: [Create account](https://cloud.google.com/)
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge

### 1. Clone the Repository
```bash
git clone https://github.com/chirag23177/speech_to_text.git
cd speech_to_text
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Google Cloud Setup

#### 3.1 Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

#### 3.2 Enable Required APIs

- [Speech-to-Text API](https://console.cloud.google.com/apis/library/speech.googleapis.com)
- [Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)

Or enable through the Console:

```bash
# Enable Speech-to-Text API
gcloud services enable speech.googleapis.com

# Enable Translation API
gcloud services enable translate.googleapis.com
```

#### 3.3 Create Service Account
1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Add these roles:
   - `Cloud Speech Client`
   - `Cloud Translation API User`
4. Create and download JSON key
5. Save as `credentials.json` in project root

### 4. Start the Application

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3001/health

## 🎮 Usage Guide

### Basic Usage
1. **Select Languages**: Choose source and target languages from dropdowns
2. **Start Recording**: Click the microphone button to start speaking
3. **Speak Clearly**: Speak in your selected source language
4. **View Results**: See real-time transcription and translation

### Advanced Features

#### Keyboard Shortcuts
- `Ctrl + Space`: Toggle recording
- `Ctrl + S`: Swap languages
- `Ctrl + T`: Toggle theme
- `Ctrl + H`: Open/close history
- `Ctrl + P`: Toggle performance dashboard
- `Ctrl + C + Shift`: Copy translation
- `Escape`: Stop recording or close panels

#### Performance Dashboard
- Monitor translation cache performance
- View API call statistics
- Track average latency
- Manage cache storage

#### Translation History
- Automatic saving of all translations
- Export history as JSON
- Search and filter capabilities
- Copy individual translations

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Set custom port
PORT=3001

# Optional: Set Node environment
NODE_ENV=production
```

### Browser Compatibility
- **Chrome/Chromium**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.3+)
- **Edge**: Full support

### HTTPS Requirements
- Speech recognition requires HTTPS in production
- Use localhost for development
- Deploy to HTTPS-enabled hosting for production

## 📊 API Endpoints

### Health Check
```http
GET /health
```

### Speech Transcription
```http
POST /transcribe
Content-Type: multipart/form-data

Parameters:
- audio: Audio file (WebM, WAV, etc.)
- language: Language code (e.g., "en-US")
```

### Text Translation
```http
POST /translate
Content-Type: application/json

Body:
{
  "text": "Hello world",
  "source": "en",
  "target": "es"
}
```

## 🎨 Customization

### Themes
The application supports custom themes through CSS custom properties:

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --background-overlay: rgba(255, 255, 255, 0.1);
  --text-primary: #ffffff;
  --accent-color: #ffd700;
}
```

### Languages
Add new languages by updating the language mappings in `script.js`:

```javascript
getLanguageMapping() {
  return {
    'new-lang': 'new',
    // ... existing mappings
  };
}
```

## 🔐 Security

### Best Practices
- Keep `credentials.json` secure and never commit to version control
- Use environment variables for sensitive configuration
- Enable CORS only for trusted domains in production
- Regularly rotate service account keys

### Data Privacy
- Audio data is processed by Google Cloud Speech-to-Text
- No audio or text data is stored on the server
- Translation history is stored locally in browser
- Review Google Cloud's data usage policies

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment

#### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "speech-translator"
```

#### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

#### Cloud Deployment
- **Google Cloud Run**: Serverless deployment
- **Heroku**: Easy deployment with buildpacks
- **AWS EC2**: Traditional server deployment
- **Vercel/Netlify**: Static frontend with API deployment

## 🐛 Troubleshooting

### Common Issues

#### "Microphone access denied"
- Grant microphone permissions in browser
- Ensure HTTPS connection (required for production)
- Check browser compatibility

#### "Backend unavailable"
- Verify server is running on port 3001
- Check Google Cloud credentials
- Ensure APIs are enabled

#### "Speech recognition not working"
- Check internet connection
- Verify Google Cloud Speech to Text API is enabled
- Try manual text input as fallback

#### "Translation fails"
- Verify Google Cloud Translation API is enabled
- Check service account permissions
- Monitor API quotas and billing

### Debug Mode
Enable detailed logging in browser console:

```javascript
// In browser console
window.speechTranslator.debugMode = true;
```

## 📈 Performance Optimization

### Caching Strategy
- Translation results cached locally
- LRU cache with configurable size limits
- Automatic cache cleanup for old entries

### API Optimization
- Request debouncing for real-time input
- Queue management for API calls
- Rate limiting compliance

### Bundle Optimization
- Minified CSS and JavaScript for production
- Optimized image assets
- CDN integration for external libraries

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Follow existing code style and conventions
4. Add tests for new features
5. Submit pull request with detailed description

### Code Style
- Use ES6+ modern JavaScript
- Follow semantic HTML structure
- Use CSS custom properties for theming
- Add JSDoc comments for functions
- Maintain responsive design principles

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Cloud**: Speech-to-Text and Translation APIs
- **Socket.IO**: Real-time communication
- **Font Awesome**: Icon library
- **Express.js**: Web framework
- **Node.js**: Runtime environment

## 📞 Support

### Documentation
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Google Cloud Translation](https://cloud.google.com/translate/docs)

### Issues and Questions
- Open an issue on GitHub for bug reports
- Use discussions for feature requests
- Check existing issues before creating new ones

---

**Made with ❤️ for breaking down language barriers through technology**

*Last updated: July 28, 2025*
