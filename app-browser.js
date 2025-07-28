// Quick Fix for Desktop App - Browser-based Implementation
// This replaces complex native modules with browser-compatible versions

window.speechTranslatorApp = {
  isRecording: false,
  mediaRecorder: null,
  audioContext: null,
  recognition: null,
  offlineRecognition: null,
  useOfflineMode: false,
  networkRetryCount: 0,
  maxNetworkRetries: 3,
  
  // Initialize the app with browser APIs
  init() {
    console.log('Initializing Speech Translator with browser APIs...');
    this.setupUI();
    this.setupEventListeners();
    this.checkNetworkConnection();
    this.initializeOfflineRecognition();
  },
  
  // Initialize offline speech recognition
  initializeOfflineRecognition() {
    if (window.OfflineSpeechRecognition) {
      this.offlineRecognition = new window.OfflineSpeechRecognition();
      
      this.offlineRecognition.onResult = (event) => {
        console.log('Offline speech result:', event);
        if (event.results && event.results[0]) {
          const transcript = event.results[0].transcript;
          this.updateTranscript(`[Offline Mode] ${transcript}`);
          this.translateText(transcript);
        }
      };
      
      this.offlineRecognition.onError = (event) => {
        console.error('Offline speech error:', event);
        this.updateStatus('Offline speech error: ' + event.message);
      };
      
      this.offlineRecognition.onStart = () => {
        this.updateStatus('Recording (Offline Mode) - Audio detection active');
      };
      
      this.offlineRecognition.onEnd = () => {
        if (this.isRecording) {
          this.updateStatus('Recording stopped');
        }
      };
      
      console.log('Offline speech recognition initialized');
    } else {
      console.warn('Offline speech recognition not available');
    }
  },
  
  // Check network connection and set up accordingly
  async checkNetworkConnection() {
    try {
      // Test connection to Google's servers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'GET',
        cache: 'no-cache',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Network connection: Available');
      this.updateStatus('Ready to start recording');
    } catch (error) {
      console.warn('Network connection: Limited or offline', error);
      this.updateStatus('Limited connectivity - Speech recognition may have issues');
      const transcriptEl = document.getElementById('transcriptDisplay');
      const retryBtn = document.getElementById('retryConnectionButton');
      
      if (transcriptEl) {
        transcriptEl.innerHTML = '<div style="color: #FF9800;"><i class="fas fa-exclamation-triangle"></i> Network connection limited. Speech recognition may experience issues. Please check your internet connection.</div>';
      }
      
      if (retryBtn) {
        retryBtn.style.display = 'block';
      }
    }
    
    // Set up online/offline event listeners
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.updateStatus('Connection restored - Ready to record');
      const transcriptEl = document.getElementById('transcriptDisplay');
      if (transcriptEl) {
        transcriptEl.innerHTML = '<div style="color: #4CAF50;"><i class="fas fa-wifi"></i> Connection restored. Ready to start recording...</div>';
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.updateStatus('Connection lost - Limited functionality');
      const transcriptEl = document.getElementById('transcriptDisplay');
      if (transcriptEl) {
        transcriptEl.innerHTML = '<div style="color: #f44336;"><i class="fas fa-wifi-slash"></i> Connection lost. Speech recognition will not work offline.</div>';
      }
    });
  },
  
  // Set up UI event handlers
  setupUI() {
    // Get UI elements
    const recordBtn = document.getElementById('recordButton');
    const stopBtn = document.getElementById('stopButton');
    const retryBtn = document.getElementById('retryConnectionButton');
    const sourceSelect = document.getElementById('sourceLanguage');
    const targetSelect = document.getElementById('targetLanguage');
    
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.startRecording());
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retryConnection());
    }
    
    // Set up language options
    if (sourceSelect && targetSelect) {
      this.setupLanguageSelects(sourceSelect, targetSelect);
    } else {
      console.warn('Language selectors not found');
    }
    
    // Update initial status
    this.updateStatus('Desktop app ready - Click Start Recording to begin');
  },
  
  // Set up language selection dropdowns
  setupLanguageSelects(sourceSelect, targetSelect) {
    const languages = [
      { code: 'en-US', name: 'English (US)', translateCode: 'en' },
      { code: 'es-ES', name: 'Spanish', translateCode: 'es' },
      { code: 'fr-FR', name: 'French', translateCode: 'fr' },
      { code: 'de-DE', name: 'German', translateCode: 'de' },
      { code: 'it-IT', name: 'Italian', translateCode: 'it' },
      { code: 'pt-PT', name: 'Portuguese', translateCode: 'pt' },
      { code: 'ru-RU', name: 'Russian', translateCode: 'ru' },
      { code: 'ja-JP', name: 'Japanese', translateCode: 'ja' },
      { code: 'ko-KR', name: 'Korean', translateCode: 'ko' },
      { code: 'zh-CN', name: 'Chinese (Simplified)', translateCode: 'zh' },
      { code: 'hi-IN', name: 'Hindi', translateCode: 'hi' },
      { code: 'ar-SA', name: 'Arabic', translateCode: 'ar' }
    ];
    
    // Clear existing options
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    
    languages.forEach(lang => {
      const sourceOption = new Option(lang.name, lang.code);
      const targetOption = new Option(lang.name, lang.translateCode);
      sourceSelect.appendChild(sourceOption);
      targetSelect.appendChild(targetOption);
    });
    
    // Set defaults
    sourceSelect.value = 'en-US';
    targetSelect.value = 'es';
    
    this.updateStatus('Languages loaded - Ready to record');
  },
  
  // Toggle recording
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  },
  
  // Start recording with browser APIs
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      this.isRecording = true;
      this.updateRecordButton();
      
      // Try online speech recognition first
      if (!this.useOfflineMode && this.networkRetryCount < this.maxNetworkRetries) {
        this.updateStatus('Starting online speech recognition...');
        this.setupWebSpeechAPI();
      } else {
        // Fallback to offline mode
        this.updateStatus('Starting offline speech recognition...');
        this.startOfflineRecognition();
      }
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.updateStatus('Error: Microphone access denied');
      this.updateTranscript('Please allow microphone access to use speech recognition. Error: ' + error.message);
    }
  },
  
  // Start offline speech recognition
  startOfflineRecognition() {
    if (this.offlineRecognition && this.offlineRecognition.isSupported) {
      this.useOfflineMode = true;
      this.offlineRecognition.start();
      
      const transcriptEl = document.getElementById('transcriptDisplay');
      if (transcriptEl) {
        transcriptEl.innerHTML = `
          <div style="color: #FF9800; margin-bottom: 10px;">
            <i class="fas fa-microphone"></i> <strong>Offline Mode Active</strong>
          </div>
          <div style="color: #ffffff;">
            Speak clearly into your microphone. Audio is being processed locally without internet connection.
          </div>`;
      }
    } else {
      this.updateStatus('Speech recognition unavailable');
      this.updateTranscript('Speech recognition is not available. Please check your microphone and browser compatibility.');
    }
  },
  
  // Set up Web Speech API
  setupWebSpeechAPI() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.updateStatus('Speech recognition not supported in this browser');
      this.updateTranscript('Web Speech API not available. Please use Chrome/Edge browser.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Enhanced configuration for better reliability
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = document.getElementById('sourceLanguage')?.value || 'en-US';
    
    // Set service URI to reduce network errors (if available)
    if (this.recognition.serviceURI) {
      this.recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
    }
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.updateStatus('Listening... Speak now');
    };
    
    this.recognition.onresult = (event) => {
      interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          this.updateTranscript(finalTranscript);
          
          // Translate the final transcript
          if (transcript.trim()) {
            this.translateText(transcript.trim());
          }
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim results
      const displayText = finalTranscript + (interimTranscript ? `<span style="opacity: 0.7; font-style: italic;">${interimTranscript}</span>` : '');
      this.updateTranscript(displayText || 'Listening for speech...');
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error, event);
      this.networkRetryCount++;
      
      let errorMessage = 'Speech recognition error: ';
      let shouldRetryOffline = false;
      
      switch (event.error) {
        case 'network':
          errorMessage += 'Network connection issue. Switching to offline mode...';
          this.updateStatus('Network error - Switching to offline mode');
          shouldRetryOffline = true;
          break;
        case 'not-allowed':
          errorMessage += 'Microphone access denied. Please allow microphone access.';
          this.updateStatus('Microphone access denied');
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please speak louder or closer to the microphone.';
          this.updateStatus('No speech detected - Try speaking louder');
          // Auto-restart after no speech
          setTimeout(() => {
            if (this.isRecording && !this.useOfflineMode) {
              this.restartRecognition();
            }
          }, 2000);
          break;
        case 'aborted':
          errorMessage += 'Speech recognition was aborted.';
          this.updateStatus('Recognition stopped');
          break;
        case 'audio-capture':
          errorMessage += 'Audio capture failed. Check your microphone.';
          this.updateStatus('Audio capture failed');
          break;
        case 'service-not-allowed':
          errorMessage += 'Speech service not allowed. Switching to offline mode...';
          this.updateStatus('Service not allowed - Using offline mode');
          shouldRetryOffline = true;
          break;
        default:
          errorMessage += `Unknown error (${event.error}). Trying offline mode...`;
          this.updateStatus(`Error: ${event.error} - Switching to offline`);
          shouldRetryOffline = true;
      }
      
      // Switch to offline mode if network-related error and retries exceeded
      if (shouldRetryOffline && this.networkRetryCount >= this.maxNetworkRetries) {
        console.log('Max network retries reached, switching to offline mode');
        this.switchToOfflineMode();
      } else if (!shouldRetryOffline) {
        this.updateTranscript(errorMessage);
      }
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      if (this.isRecording) {
        // Auto-restart recognition if still recording
        setTimeout(() => {
          if (this.isRecording) {
            this.restartRecognition();
          }
        }, 100);
      } else {
        this.updateStatus('Recording stopped');
      }
    };
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.updateStatus('Failed to start speech recognition');
      this.updateTranscript('Could not start speech recognition. Error: ' + error.message);
    }
  },
  
  // Restart recognition with error handling
  restartRecognition() {
    if (!this.isRecording || !this.recognition) return;
    
    try {
      this.recognition.stop();
      setTimeout(() => {
        if (this.isRecording) {
          this.recognition.start();
        }
      }, 500);
    } catch (error) {
      console.error('Error restarting recognition:', error);
      this.updateStatus('Error restarting recognition');
    }
  },
  
  // Switch to offline mode when network fails
  switchToOfflineMode() {
    console.log('Switching to offline speech recognition mode');
    
    // Stop current recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    }
    
    // Start offline recognition
    this.startOfflineRecognition();
    
    // Update UI to show offline mode
    const transcriptEl = document.getElementById('transcriptDisplay');
    if (transcriptEl) {
      transcriptEl.innerHTML = `
        <div style="color: #FF9800; margin-bottom: 15px;">
          <i class="fas fa-wifi-slash"></i> <strong>Network issues detected - Switched to Offline Mode</strong>
        </div>
        <div style="color: #ffffff; margin-bottom: 10px;">
          Speech recognition is now running locally on your device.
        </div>
        <div style="color: #cccccc; font-size: 0.9em;">
          <i class="fas fa-info-circle"></i> Offline mode provides basic speech detection and mock transcription for testing purposes.
        </div>`;
    }
  },

  // Stop recording
  stopRecording() {
    this.isRecording = false;
    
    // Stop online recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping online recognition:', e);
      }
    }
    
    // Stop offline recognition
    if (this.offlineRecognition) {
      try {
        this.offlineRecognition.stop();
      } catch (e) {
        console.warn('Error stopping offline recognition:', e);
      }
    }
    
    // Reset offline mode
    this.useOfflineMode = false;
    this.networkRetryCount = 0;
    
    this.updateRecordButton();
    this.updateStatus('Recording stopped');
  },
  
  // Update transcript display
  updateTranscript(text) {
    const transcriptDiv = document.getElementById('transcriptDisplay');
    if (transcriptDiv) {
      transcriptDiv.innerHTML = text;
    }
  },
  
  // Translate text (mock implementation with network error handling)
  async translateText(text) {
    const targetLang = document.getElementById('targetLanguage')?.value || 'es';
    const translationDiv = document.getElementById('translationDisplay');
    
    if (!translationDiv) return;
    
    // Check if online
    if (!navigator.onLine) {
      translationDiv.innerHTML = `
        <div style="color: #FF9800;">
          <i class="fas fa-wifi-slash"></i> Translation unavailable offline<br>
          <small>Original: ${text}</small>
        </div>`;
      return;
    }
    
    try {
      // Show loading state
      translationDiv.innerHTML = `
        <div style="color: #2196F3;">
          <i class="fas fa-spinner fa-spin"></i> Translating...
        </div>`;
      
      // Simulate translation attempt (would use Google Translate API in production)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, show mock translation with language info
      const languageNames = {
        'es': 'Spanish',
        'fr': 'French', 
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'hi': 'Hindi',
        'ar': 'Arabic',
        'en': 'English'
      };
      
      const targetLanguageName = languageNames[targetLang] || targetLang;
      
      translationDiv.innerHTML = `
        <div style="color: #4CAF50; margin-bottom: 10px;">
          <i class="fas fa-globe"></i> Translation to ${targetLanguageName}:
        </div>
        <div style="font-size: 1.1em; font-weight: 500; color: #ffd700; margin-bottom: 10px;">
          [Google Translate API needed for actual translation]
        </div>
        <div style="color: #ffffff; opacity: 0.8;">
          <strong>Original (${document.getElementById('sourceLanguage')?.selectedOptions[0]?.text || 'English'}):</strong> ${text}
        </div>`;
      
    } catch (error) {
      console.error('Translation error:', error);
      translationDiv.innerHTML = `
        <div style="color: #f44336;">
          <i class="fas fa-exclamation-triangle"></i> Translation failed<br>
          <small>Network error or service unavailable</small><br>
          <small>Original: ${text}</small>
        </div>`;
    }
  },
  
  // Update record button appearance
  updateRecordButton() {
    const recordBtn = document.getElementById('recordButton');
    const stopBtn = document.getElementById('stopButton');
    
    if (recordBtn && stopBtn) {
      if (this.isRecording) {
        recordBtn.disabled = true;
        stopBtn.disabled = false;
      } else {
        recordBtn.disabled = false;
        stopBtn.disabled = true;
      }
    }
  },
  
  // Update status message
  updateStatus(message) {
    const statusDiv = document.getElementById('statusDisplay');
    if (statusDiv) {
      statusDiv.textContent = message;
      
      // Update status class based on recording state
      statusDiv.className = 'status-display';
      if (this.isRecording) {
        statusDiv.classList.add('recording');
      } else {
        statusDiv.classList.add('idle');
      }
    }
    
    // Also try the status message div we created
    const statusMsgDiv = document.getElementById('statusMessage');
    if (statusMsgDiv) {
      statusMsgDiv.textContent = message;
    }
    
    // Update mode indicator
    this.updateModeIndicator();
    
    console.log('Status:', message);
  },
  
  // Update mode indicator
  updateModeIndicator() {
    const modeDiv = document.getElementById('modeIndicator');
    if (modeDiv) {
      if (this.isRecording) {
        modeDiv.style.display = 'block';
        if (this.useOfflineMode) {
          modeDiv.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
          modeDiv.style.background = '#FF9800';
          modeDiv.style.color = 'white';
        } else {
          modeDiv.innerHTML = '<i class="fas fa-wifi"></i> Online Mode';
          modeDiv.style.background = '#4CAF50';
          modeDiv.style.color = 'white';
        }
      } else {
        modeDiv.style.display = 'none';
      }
    }
  },
  
  // Retry connection functionality
  async retryConnection() {
    const retryBtn = document.getElementById('retryConnectionButton');
    if (retryBtn) {
      retryBtn.style.display = 'none';
    }
    
    this.updateStatus('Retrying connection...');
    await this.checkNetworkConnection();
  },

  // Set up basic event listeners
  setupEventListeners() {
    // Language change handlers
    const sourceSelect = document.getElementById('sourceLanguage');
    const targetSelect = document.getElementById('targetLanguage');
    
    if (sourceSelect) {
      sourceSelect.addEventListener('change', () => {
        if (this.recognition) {
          this.recognition.lang = sourceSelect.value;
        }
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        this.toggleRecording();
      }
    });
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.speechTranslatorApp.init();
  });
} else {
  window.speechTranslatorApp.init();
}
