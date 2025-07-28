# Desktop Setup Quick Guide

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Audio Dependencies (if needed)
```bash
npm install electron electron-builder node-record-lpcm16 speaker fluent-ffmpeg ffmpeg-static wav --save-dev
```

### 3. Setup Google Cloud Credentials
- Ensure `credentials.json` is in the project root
- Verify Google Cloud APIs are enabled

### 4. Run the Desktop App
```bash
# Development mode (with console)
npm run dev

# Production mode
npm start
```

## 🎯 Key Features

### Audio Input Modes
1. **Microphone**: Traditional microphone input
2. **System Audio**: Capture audio from applications (Zoom, Meet, YouTube, etc.)

### System Audio Setup

#### Windows
- Enable "Stereo Mix" in Sound settings
- Or install VB-Cable for virtual audio routing

#### macOS
- Install BlackHole or SoundFlower for audio loopback

#### Linux
- PulseAudio monitor devices auto-detected

### Keyboard Shortcuts
- `Ctrl+Space`: Toggle recording
- `Ctrl+S`: Swap languages
- `Ctrl+T`: Toggle theme
- `Ctrl+H`: Show/hide history
- `Ctrl+P`: Show/hide performance
- `Ctrl+Shift+Space`: Global recording toggle
- `Escape`: Stop recording

## 🔧 Troubleshooting

### Electron Not Found
```bash
npm install electron --save-dev
```

### Audio Issues
- Check microphone permissions
- Verify audio device selection
- Install system audio loopback drivers if needed

### Google Cloud Issues
- Verify credentials.json file
- Check API enablement
- Ensure proper service account permissions

## 📦 Building for Distribution

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

---

**Ready to translate audio from online meetings in real-time!**
