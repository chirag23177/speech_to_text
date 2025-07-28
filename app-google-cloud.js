// Desktop App Implementation with Google Cloud APIs
// This replaces the browser-based implementation with proper Google Cloud services

window.speechTranslatorApp = {
  isRecording: false,
  mediaRecorder: null,
  audioContext: null,
  audioChunks: [],
  currentLanguagePair: {
    source: 'en-US',
    target: 'es'
  },
  
  // Initialize the app with Google Cloud APIs
  async init() {
    console.log('Initializing Speech Translator with Google Cloud APIs...');
    this.setupUI();
    await this.loadLanguages();
    this.setupEventListeners();
    await this.testGoogleCloudConnection();
  },
  
  // Test Google Cloud connection
  async testGoogleCloudConnection() {
    try {
      const isConnected = await window.electronAPI.testGoogleCloudConnection();
      if (isConnected) {
        this.updateStatus('Google Cloud APIs connected - Ready to record');
        console.log('Google Cloud APIs successfully connected');
      } else {
        this.updateStatus('Google Cloud API connection failed');
        console.error('Google Cloud API connection test failed');
      }
    } catch (error) {
      console.error('Error testing Google Cloud connection:', error);
      this.updateStatus('Error connecting to Google Cloud APIs');
    }
  },
  
  // Set up UI event handlers
  setupUI() {
    const recordBtn = document.getElementById('recordButton');
    const stopBtn = document.getElementById('stopButton');
    const sourceSelect = document.getElementById('sourceLanguage');
    const targetSelect = document.getElementById('targetLanguage');
    const swapBtn = document.getElementById('swapLanguages');
    
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.startRecording());
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    if (swapBtn) {
      swapBtn.addEventListener('click', () => this.swapLanguages());
    }
    
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (e) => {
        this.currentLanguagePair.source = e.target.value;
        console.log('Source language changed to:', e.target.value);
      });
    }
    
    if (targetSelect) {
      targetSelect.addEventListener('change', (e) => {
        this.currentLanguagePair.target = e.target.value;
        console.log('Target language changed to:', e.target.value);
      });
    }
  },
  
  // Load available languages from Google Cloud
  async loadLanguages() {
    try {
      console.log('Loading languages from Google Cloud...');
      
      // Load speech recognition languages
      const speechLanguages = await window.electronAPI.getSpeechLanguages();
      const sourceSelect = document.getElementById('sourceLanguage');
      
      if (sourceSelect && speechLanguages.length > 0) {
        sourceSelect.innerHTML = '';
        speechLanguages.forEach(lang => {
          const option = document.createElement('option');
          option.value = lang.code;
          option.textContent = lang.name;
          sourceSelect.appendChild(option);
        });
        sourceSelect.value = 'en-US'; // Default to English US
        this.currentLanguagePair.source = 'en-US';
      }
      
      // Load translation languages
      const translationLanguages = await window.electronAPI.getTranslationLanguages();
      const targetSelect = document.getElementById('targetLanguage');
      
      if (targetSelect && translationLanguages.length > 0) {
        targetSelect.innerHTML = '';
        translationLanguages.forEach(lang => {
          const option = document.createElement('option');
          option.value = lang.code;
          option.textContent = lang.name;
          targetSelect.appendChild(option);
        });
        targetSelect.value = 'es'; // Default to Spanish
        this.currentLanguagePair.target = 'es';
      }
      
      console.log('Languages loaded successfully');
      this.updateStatus('Languages loaded - Ready to record');
      
    } catch (error) {
      console.error('Error loading languages:', error);
      this.updateStatus('Error loading languages');
    }
  },
  
  // Start recording audio
  async startRecording() {
    if (this.isRecording) return;
    
    try {
      console.log('Starting recording...');
      this.audioChunks = [];
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Set up MediaRecorder for capturing audio
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Capture data every 1 second
      this.isRecording = true;
      this.updateRecordButton();
      this.updateStatus('Recording with Google Cloud Speech-to-Text...');
      this.updateModeIndicator();
      
      // Clear previous content
      this.updateTranscript('Recording started. Speak clearly into your microphone...');
      const translationDiv = document.getElementById('translationDisplay');
      if (translationDiv) {
        translationDiv.innerHTML = 'Translation will appear here after speech is processed...';
      }
      
      // Set up audio visualization
      this.setupAudioVisualization(stream);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatus('Error: Failed to start recording');
      this.updateTranscript('Failed to start recording: ' + error.message);
    }
  },
  
  // Stop recording and process audio
  stopRecording() {
    if (!this.isRecording) return;
    
    console.log('Stopping recording...');
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all audio tracks
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    this.updateRecordButton();
    this.updateStatus('Processing recorded audio...');
    this.updateModeIndicator();
  },
  
  // Process the recorded audio with Google Cloud Speech-to-Text
  async processRecordedAudio() {
    try {
      if (this.audioChunks.length === 0) {
        this.updateStatus('No audio recorded');
        return;
      }
      
      console.log('Processing audio with Google Cloud Speech-to-Text...');
      this.updateStatus('Transcribing audio with Google Cloud...');
      
      // Combine audio chunks into a single blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      
      // Convert blob to ArrayBuffer for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Convert ArrayBuffer to Uint8Array for transmission
      const uint8Array = new Uint8Array(arrayBuffer);
      const audioArray = Array.from(uint8Array);
      
      console.log('Audio data prepared, size:', audioArray.length, 'bytes');
      
      // Send to Google Cloud Speech-to-Text
      const transcriptionResult = await window.electronAPI.transcribeAudio(
        audioArray, 
        this.currentLanguagePair.source
      );
      
      if (transcriptionResult.transcript && transcriptionResult.transcript.trim()) {
        console.log('Transcription received:', transcriptionResult);
        
        // Update transcript display
        this.updateTranscript(
          `<div class="transcript-text final">
            ${transcriptionResult.transcript}
          </div>
          <div class="transcript-meta">
            <span>Language: ${this.currentLanguagePair.source}</span>
            <span>Confidence: ${(transcriptionResult.confidence * 100).toFixed(1)}%</span>
            <span>Google Cloud Speech-to-Text</span>
          </div>`
        );
        
        // Translate the text
        await this.translateText(transcriptionResult.transcript);
        
        this.updateStatus('Transcription and translation complete');
        
      } else {
        console.log('No speech detected in audio');
        this.updateTranscript('No speech detected. Please try speaking louder or closer to the microphone.');
        this.updateStatus('No speech detected');
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      this.updateStatus('Error processing audio');
      this.updateTranscript(`Error processing audio: ${error.message}`);
    }
  },
  
  // Translate text using Google Cloud Translate
  async translateText(text) {
    try {
      if (!text || text.trim() === '') {
        return;
      }
      
      console.log('Translating text with Google Cloud Translate...');
      
      const translationDiv = document.getElementById('translationDisplay');
      if (translationDiv) {
        translationDiv.innerHTML = `
          <div style="color: #2196F3;">
            <i class="fas fa-spinner fa-spin"></i> Translating with Google Cloud...
          </div>`;
      }
      
      // Convert speech language code to translation language code
      const sourceLanguageCode = this.speechToTranslationLangCode(this.currentLanguagePair.source);
      
      const translationResult = await window.electronAPI.translateText(
        text,
        this.currentLanguagePair.target,
        sourceLanguageCode
      );
      
      console.log('Translation received:', translationResult);
      
      // Update translation display
      if (translationDiv) {
        translationDiv.innerHTML = `
          <div class="translation-content">
            <div class="translation-text">
              ${translationResult.translatedText}
            </div>
            <div class="translation-meta">
              <span>From: ${translationResult.sourceLanguage}</span>
              <span>To: ${translationResult.targetLanguage}</span>
              <span>Confidence: ${(translationResult.confidence * 100).toFixed(1)}%</span>
              <button class="copy-button" onclick="navigator.clipboard.writeText('${translationResult.translatedText}')">
                <i class="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>`;
      }
      
    } catch (error) {
      console.error('Translation error:', error);
      const translationDiv = document.getElementById('translationDisplay');
      if (translationDiv) {
        translationDiv.innerHTML = `
          <div style="color: #f44336;">
            <i class="fas fa-exclamation-triangle"></i> Translation failed: ${error.message}
          </div>`;
      }
    }
  },
  
  // Set up audio visualization
  setupAudioVisualization(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVisualization = () => {
        if (!this.isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Update audio level bar
        const audioLevel = document.getElementById('audioLevel');
        if (audioLevel) {
          const width = (average / 255) * 100;
          audioLevel.style.width = width + '%';
        }
        
        // Update audio bars
        const bars = document.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
          const value = dataArray[index * 4] || 0;
          const height = (value / 255) * 50;
          bar.style.height = Math.max(height, 5) + 'px';
        });
        
        requestAnimationFrame(updateVisualization);
      };
      
      updateVisualization();
      
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  },
  
  // Convert speech language code to translation language code
  speechToTranslationLangCode(speechCode) {
    return speechCode.split('-')[0];
  },
  
  // Swap source and target languages
  swapLanguages() {
    const sourceSelect = document.getElementById('sourceLanguage');
    const targetSelect = document.getElementById('targetLanguage');
    
    if (sourceSelect && targetSelect) {
      const tempSource = this.currentLanguagePair.source;
      const tempTarget = this.currentLanguagePair.target;
      
      // Convert target language to source language format if needed
      const newSource = tempTarget.includes('-') ? tempTarget : tempTarget + '-US';
      const newTarget = this.speechToTranslationLangCode(tempSource);
      
      // Update selections if the languages exist in the dropdowns
      const sourceOptions = Array.from(sourceSelect.options).map(opt => opt.value);
      const targetOptions = Array.from(targetSelect.options).map(opt => opt.value);
      
      if (sourceOptions.includes(newSource) && targetOptions.includes(newTarget)) {
        this.currentLanguagePair.source = newSource;
        this.currentLanguagePair.target = newTarget;
        sourceSelect.value = newSource;
        targetSelect.value = newTarget;
        console.log('Languages swapped:', this.currentLanguagePair);
      } else {
        console.warn('Cannot swap languages - not all combinations available');
      }
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
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Recording...';
      } else {
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        recordBtn.innerHTML = '<i class="fas fa-play"></i> Start Recording';
      }
    }
  },
  
  // Update transcript display
  updateTranscript(html) {
    const transcriptDiv = document.getElementById('transcriptDisplay');
    if (transcriptDiv) {
      transcriptDiv.innerHTML = html;
    }
  },
  
  // Update status display
  updateStatus(message) {
    const statusDiv = document.getElementById('statusDisplay');
    if (statusDiv) {
      statusDiv.textContent = message;
      
      statusDiv.className = 'status-display';
      if (this.isRecording) {
        statusDiv.classList.add('recording');
      } else {
        statusDiv.classList.add('idle');
      }
    }
    
    this.updateModeIndicator();
    console.log('Status:', message);
  },
  
  // Update mode indicator
  updateModeIndicator() {
    const modeDiv = document.getElementById('modeIndicator');
    if (modeDiv) {
      if (this.isRecording) {
        modeDiv.style.display = 'block';
        modeDiv.innerHTML = '<i class="fas fa-cloud"></i> Google Cloud Mode';
        modeDiv.style.background = '#4CAF50';
        modeDiv.style.color = 'white';
      } else {
        modeDiv.style.display = 'none';
      }
    }
  },
  
  // Set up keyboard shortcuts and other event listeners
  setupEventListeners() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Space to start/stop recording
      if (event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      }
      
      // Ctrl+S to swap languages
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        this.swapLanguages();
      }
      
      // Esc to stop recording
      if (event.key === 'Escape' && this.isRecording) {
        this.stopRecording();
      }
    });
    
    console.log('Event listeners set up');
  }
};

// Electron API bridge (should be available via preload script)
if (!window.electronAPI) {
  console.error('Electron API not available - app may not function correctly');
  window.electronAPI = {
    transcribeAudio: () => Promise.reject(new Error('Electron API not available')),
    translateText: () => Promise.reject(new Error('Electron API not available')),
    getSpeechLanguages: () => Promise.resolve([{code: 'en-US', name: 'English (US)'}]),
    getTranslationLanguages: () => Promise.resolve([{code: 'es', name: 'Spanish'}]),
    testGoogleCloudConnection: () => Promise.resolve(false)
  };
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.speechTranslatorApp.init();
});
