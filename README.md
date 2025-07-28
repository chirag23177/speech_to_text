# 🌍 Real-Time Speech Translator

A powerful web-based application that provides real-time speech-to-text transcription and translation using Google Cloud APIs. Speak in one language and see the translated text instantly in another language.

![Project Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)

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
