# Google Cloud Speech-to-Text Backend Setup Instructions

## 🔧 Prerequisites

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Google Cloud Account** with Speech-to-Text API enabled
3. **Google Cloud Service Account** with credentials.json file

## 📦 Installation Steps

### 1. Install Dependencies

```bash
# Navigate to your project directory
cd speech_to_text

# Install Node.js dependencies
npm install

# Or if you don't have package.json yet:
npm install express multer cors @google-cloud/speech
npm install --save-dev nodemon
```

### 2. Google Cloud Setup

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Speech-to-Text API:**
   - Go to APIs & Services > Library
   - Search for "Speech-to-Text API"
   - Click Enable

3. **Create Service Account:**
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Give it a name (e.g., "speech-to-text-service")
   - Grant "Speech-to-Text User" role
   - Click "Create Key" > JSON format
   - Download the `credentials.json` file

4. **Add Credentials:**
   - Place the downloaded `credentials.json` file in your project root directory
   - Make sure it's in `.gitignore` to avoid committing secrets

### 3. Start the Backend Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Or production mode
npm start
```

The server will start on `http://localhost:3001`

### 4. Verify Setup

#### Health Check
```bash
# Check if server is running
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "speechClientReady": true,
  "timestamp": "2025-01-27T..."
}
```

#### Test Transcription
```bash
# Test with a sample audio file (if you have one)
curl -X POST http://localhost:3001/transcribe \
  -F "audio=@sample.webm" \
  -F "language=en-US"
```

## 🚀 Frontend Integration

### 1. Open the Web App

1. **Serve the frontend files:**
   ```bash
   # If you have Python installed:
   python -m http.server 8000
   
   # Or if you have Node.js http-server:
   npx http-server -p 8000
   
   # Or just open index.html in browser (may have CORS issues)
   ```

2. **Open in browser:**
   - Go to `http://localhost:8000`
   - The app will automatically connect to the backend at `localhost:3001`

### 2. Test the Integration

1. **Check Status:**
   - Should show "Google Cloud Speech-to-Text ready" in status
   - If backend is down: "Backend unavailable - Using manual input mode"

2. **Test Recording:**
   - Click the microphone button
   - Speak clearly and continuously
   - See real-time transcription appearing as you speak
   - Interim text appears in italic, final text becomes bold
   - Real-time streaming provides immediate feedback

## 🔧 Configuration Options

### Backend Configuration (server.js)

```javascript
// Change backend port
const PORT = process.env.PORT || 3001;

// Change credentials file location
const credentialsPath = path.join(__dirname, 'credentials.json');

// Adjust audio file size limit
limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
}

// Control debug logging levels
// Reduce audio chunk logging for cleaner console output
```

### Frontend Configuration (script.js)

```javascript
// Change backend URL
this.backendUrl = 'http://localhost:3001';

// Real-time streaming settings
this.isStreamingMode = true; // Enable real-time streaming
this.recordingChunkSize = 250; // 250ms chunks for low latency

// Audio visualization settings
this.silenceThreshold = 0.01; // Lower = more sensitive
```

## 🐛 Troubleshooting

### Backend Issues

1. **"speechClientReady": false**
   - Check if `credentials.json` exists and is valid
   - Verify Google Cloud project has Speech-to-Text API enabled
   - Check service account permissions

2. **Port already in use:**
   - Change PORT in server.js or kill existing process
   - `lsof -ti:3001 | xargs kill` (Mac/Linux)

3. **CORS errors:**
   - Make sure frontend and backend are on different ports
   - Check if CORS is properly configured in server.js

### Frontend Issues

1. **"Backend unavailable"**
   - Ensure backend server is running on localhost:3001
   - Check browser console for network errors
   - Verify firewall isn't blocking connections

2. **No microphone access:**
   - Check browser permissions
   - Ensure HTTPS or localhost context
   - Test in incognito mode

3. **MediaRecorder not supported:**
   - Use Chrome, Firefox, or Safari
   - Check if browser is up to date

## 📈 Performance Tips

1. **Audio Quality:**
   - Use a good microphone
   - Minimize background noise
   - Speak clearly and at moderate pace

2. **Network Optimization:**
   - Keep backend server close to frontend
   - Consider implementing audio compression
   - Add caching for repeated phrases

3. **Google Cloud Optimization:**
   - Use appropriate language models
   - Enable enhanced models for better accuracy
   - Monitor API quotas and billing

## 🔒 Security Notes

- **Never commit `credentials.json` to version control**
- **Use environment variables for production deployment**
- **Implement rate limiting for production use**
- **Consider using Google Cloud IAM for fine-grained permissions**

## 🚢 Production Deployment

For production deployment:

1. **Environment Variables:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
   export NODE_ENV="production"
   export PORT="3001"
   ```

2. **Process Manager:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "speech-backend"
   ```

3. **Reverse Proxy (Nginx):**
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3001/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

That's it! Your Google Cloud Speech-to-Text backend is now ready to use. 🎉
