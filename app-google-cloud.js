// Desktop App Implementation with Google Cloud APIs
// This replaces the browser-based implementation with proper Google Cloud services

// Desktop App Implementation with Socket.IO Real-time Streaming
// Based on the working web app implementation

window.speechTranslatorApp = {
  isRecording: false,
  mediaRecorder: null,
  audioContext: null,
  audioChunks: [],
  currentLanguagePair: {
    source: 'en-US',
    target: 'es'
  },
  
  // Socket.IO streaming properties (like web app)
  socket: null,
  streamingActive: false,
  isStreamingMode: true,
  backendUrl: 'http://localhost:3001',
  
  // Real-time streaming properties
  autoCommitTimer: null,
  autoCommitInterval: 5000, // 5 seconds
  
  // Performance tracking
  performanceStats: {
    apiCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalResponseTime: 0,
    cacheHits: 0,
    startTime: Date.now(),
    memoryUsage: 0,
    lastResponseTime: 0
  },
  
  // Current transcript for history saving
  currentTranscriptForHistory: null,
  lastCommitTime: 0,
  pendingInterimText: '',
  wordCompleteDelay: 1000,
  
  // Initialize the app with Socket.IO streaming
  async init() {
    console.log('Initializing Speech Translator with Socket.IO streaming...');
    this.setupUI();
    await this.loadLanguages();
    this.setupEventListeners();
    await this.testGoogleCloudConnection();
    this.initializeSocketIO(); // Initialize Socket.IO like web app
    this.updateHistoryDisplay(); // Initialize history display
    this.initializePerformanceTracking(); // Initialize performance tracking
    await this.checkAudioCapabilities(); // Check stereo mix and audio capabilities
  },
  
  // Initialize Socket.IO connection (from web app)
  initializeSocketIO() {
    try {
      console.log('Initializing Socket.IO connection...');
      
      // Load Socket.IO from CDN or local installation
      if (typeof io === 'undefined') {
        console.warn('Socket.IO not loaded, loading from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => {
          this.connectSocket();
        };
        document.head.appendChild(script);
      } else {
        this.connectSocket();
      }
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
      this.updateStatus('Socket.IO initialization failed - using fallback mode');
      this.isStreamingMode = false;
    }
  },
  
  // Connect to Socket.IO server (from web app)
  connectSocket() {
    try {
      this.socket = io(this.backendUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      this.setupSocketEvents();
      console.log('Socket.IO connection established');
    } catch (error) {
      console.error('Socket.IO connection failed:', error);
      this.isStreamingMode = false;
    }
  },
  
  // Set up Socket.IO event handlers (from web app)
  setupSocketEvents() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.updateStatus('Real-time streaming ready');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.updateStatus('Streaming disconnected');
    });
    
    this.socket.on('transcription-result', (data) => {
      console.log('Received transcription-result:', data);
      this.handleStreamingResult(data);
    });
    
    this.socket.on('voice-activity', (data) => {
      console.log('Received voice-activity:', data);
      this.handleVoiceActivity(data);
    });
    
    this.socket.on('streaming-error', (error) => {
      console.error('Streaming error:', error);
      this.updateStatus('Streaming error: ' + error.message);
    });
    
    this.socket.on('stream-started', () => {
      console.log('Stream started successfully');
      this.updateStatus('Streaming active');
    });
    
    this.socket.on('stream-ended', () => {
      console.log('Stream ended');
      this.updateStatus('Stream ended');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.updateStatus('Connection error - check if server is running');
      this.isStreamingMode = false;
    });
  },
  
  // Handle streaming results (from web app)
  handleStreamingResult(data) {
    if (!data || typeof data !== 'object') {
      console.warn('Invalid streaming result data:', data);
      return;
    }
    
    const { transcript, isFinal, confidence, languageCode } = data;
    
    if (!transcript) {
      console.log('Empty transcript received');
      return;
    }
    
    console.log('Streaming result:', { transcript, isFinal, confidence });
    
    try {
      if (isFinal) {
        // Handle final result
        this.handleFinalTranscript(transcript);
        this.pendingInterimText = ''; // Clear interim text
        this.resetAutoCommitTimer();
      } else {
        // Handle interim result
        this.handleInterimTranscript(transcript);
        this.pendingInterimText = transcript;
        this.setAutoCommitTimer();
      }
    } catch (error) {
      console.error('Error handling streaming result:', error);
    }
  },
  
  // Handle final transcript
  handleFinalTranscript(transcript) {
    if (!transcript || transcript.trim() === '') return;
    
    console.log('Final transcript:', transcript);
    this.displayTranscript(transcript, true);
    this.translateText(transcript);
    this.lastCommitTime = Date.now();
  },
  
  // Handle interim transcript
  handleInterimTranscript(transcript) {
    if (!transcript || transcript.trim() === '') return;
    
    console.log('Interim transcript:', transcript);
    this.displayTranscript(transcript, false);
  },
  
  // Handle voice activity detection (from web app)
  handleVoiceActivity(data) {
    const { event, timestamp } = data;
    const isActive = event === 'SPEECH_ACTIVITY_BEGIN';
    console.log('Voice activity:', isActive ? 'detected' : 'ended');
    
    // Update UI to show voice activity
    const statusElement = document.getElementById('status');
    if (statusElement) {
      if (isActive) {
        statusElement.classList.add('voice-active');
      } else {
        statusElement.classList.remove('voice-active');
      }
    }
  },
  
  // Auto-commit timer management (from web app)
  setAutoCommitTimer() {
    this.resetAutoCommitTimer();
    
    this.autoCommitTimer = setTimeout(() => {
      if (this.pendingInterimText && this.isRecording) {
        console.log('Auto-committing interim text:', this.pendingInterimText);
        this.handleFinalTranscript(this.pendingInterimText);
        this.pendingInterimText = '';
      }
    }, this.autoCommitInterval);
  },
  
  resetAutoCommitTimer() {
    if (this.autoCommitTimer) {
      clearTimeout(this.autoCommitTimer);
      this.autoCommitTimer = null;
    }
  },
  
  // Update the transcript display with streaming results
  updateStreamingTranscript() {
    const transcriptDiv = document.getElementById('transcriptDisplay');
    if (!transcriptDiv) return;
    
    let displayHTML = '';
    
    // Show final transcript
    if (this.finalTranscript.trim()) {
      displayHTML += `<div class="transcript-text final">${this.finalTranscript.trim()}</div>`;
    }
    
    // Show current interim transcript
    if (this.currentTranscript.trim()) {
      displayHTML += `<div class="transcript-text interim">${this.currentTranscript}</div>`;
    }
    
    // Show status if no transcript yet
    if (!displayHTML) {
      if (this.isRecording) {
        displayHTML = '<div class="transcript-placeholder">🎤 Listening... Speak clearly for 2-3 seconds</div>';
      } else {
        displayHTML = '<div class="transcript-placeholder">Click "Start Recording" to begin</div>';
      }
    }
    
    transcriptDiv.innerHTML = displayHTML;
    transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
  },
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
  
  // Update status display
  updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
    }
    console.log('Status:', message);
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
      this.updateStatus('Ready to record');
      
    } catch (error) {
      console.error('Error loading languages:', error);
      this.updateStatus('Error loading languages');
    }
  },
  
  // Start recording audio with quasi-streaming (frequent batch processing)
  async startRecording() {
    if (this.isRecording) return;
    
    try {
      console.log('Starting real-time streaming recording...');
      this.audioChunks = [];
      this.pendingInterimText = '';
      this.lastCommitTime = Date.now();
      
      // Get audio stream from user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Choose streaming mode based on Socket.IO availability
      if (this.isStreamingMode && this.socket && this.socket.connected) {
        console.log('Using Socket.IO real-time streaming mode');
        await this.startSocketIOStreaming(stream);
      } else {
        console.log('Socket.IO not available, using fallback mode');
        await this.startFallbackMode(stream);
      }
      
      this.isRecording = true;
      this.updateRecordButton();
      this.updateStatus('Recording...');
      this.updateModeIndicator();
      
      // Clear previous content
      const transcriptDiv = document.getElementById('transcriptDisplay');
      const translationDiv = document.getElementById('translationDisplay');
      if (transcriptDiv) transcriptDiv.innerHTML = 'Listening...';
      if (translationDiv) translationDiv.innerHTML = 'Translations will appear here...';
      
      // Set up audio visualization
      this.setupAudioVisualization(stream);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Failed to start recording';
      if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.message.includes('NotFoundError')) {
        errorMessage = 'No microphone found. Please check your audio devices.';
      } else {
        errorMessage = 'Failed to access microphone. Please check permissions and try again.';
      }
      
      this.updateStatus(`Error: ${errorMessage}`);
      this.updateTranscript(errorMessage + ' (Technical error: ' + error.message + ')');
    }
  },
  
  // Start Socket.IO streaming (from web app)
  async startSocketIOStreaming(stream) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket.IO not connected');
    }
    
    console.log('Starting Socket.IO streaming...');
    this.streamingActive = true;
    
    // Start streaming session
    console.log('Emitting start-stream with config:', {
      language: this.currentLanguagePair.source,
      sampleRate: 16000,
      encoding: 'WEBM_OPUS'
    });
    
    this.socket.emit('start-stream', {
      language: this.currentLanguagePair.source,
      sampleRate: 16000,
      encoding: 'WEBM_OPUS'
    });
    
    // Set up MediaRecorder for real-time streaming
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.streamingActive) {
        console.log('Streaming audio chunk, size:', event.data.size);
        
        // Convert blob to buffer and send via Socket.IO
        event.data.arrayBuffer().then(buffer => {
          if (this.socket && this.socket.connected) {
            console.log('Sending audio data via Socket.IO, buffer size:', buffer.byteLength);
            this.socket.emit('audio-data', buffer);
          } else {
            console.warn('Socket not connected, cannot send audio data');
          }
        }).catch(error => {
          console.error('Error converting audio data:', error);
        });
      } else if (event.data.size === 0) {
        console.warn('Received empty audio chunk');
      } else if (!this.streamingActive) {
        console.log('Streaming not active, ignoring audio chunk');
      }
    };
    
    this.mediaRecorder.onstop = () => {
      console.log('Socket.IO streaming stopped');
      this.stopSocketIOStreaming();
    };
    
    // Start with smaller chunks for real-time streaming
    this.mediaRecorder.start(250); // 250ms chunks for real-time feel
  },
  
  // Start fallback mode (simplified batch processing)
  async startFallbackMode(stream) {
    console.log('Starting fallback batch mode...');
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      if (this.audioChunks.length > 0) {
        this.processBatchAudio();
      }
    };
    
    this.mediaRecorder.start();
  },
  
  // Process accumulated audio chunks for better recognition
  async processAccumulatedChunks() {
    try {
      if (this.audioChunks.length === 0) return;
      
      console.log(`Processing ${this.audioChunks.length} accumulated chunks...`);
      
      // Show interim processing status
      this.currentTranscript = 'Processing speech...';
      this.updateStreamingTranscript();
      
      // Combine chunks into a larger blob for better recognition
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      
      // Convert blob to ArrayBuffer for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const audioArray = Array.from(uint8Array);
      
      console.log('Combined audio data prepared, size:', audioArray.length, 'bytes');
      
      // Send to Google Cloud Speech-to-Text with performance tracking
      const startTime = performance.now();
      try {
        const transcriptionResult = await window.electronAPI.transcribeAudio(
          audioArray, 
          this.currentLanguagePair.source
        );
        
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Speech-to-Text', responseTime, true);
        
        if (transcriptionResult.transcript && transcriptionResult.transcript.trim()) {
          console.log('Accumulated chunk transcription received:', transcriptionResult.transcript);
          
          // Add to final transcript (avoid duplicates)
          const newText = transcriptionResult.transcript.trim();
          if (!this.finalTranscript.includes(newText)) {
            this.finalTranscript += newText + ' ';
          }
          this.currentTranscript = ''; // Clear interim
        
        // Update display immediately
        this.updateStreamingTranscript();
        
        // Translate the new text
        await this.translateText(newText);
        
      } else {
        console.log('No speech detected in accumulated chunks');
        this.currentTranscript = ''; // Clear processing message
        this.updateStreamingTranscript();
      }
      
      } catch (error) {
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Speech-to-Text', responseTime, false);
        console.error('Transcription API error:', error);
        throw error;
      }
      
      // Clear processed chunks but keep the last one for continuity
      const lastChunk = this.audioChunks.pop(); // Keep last chunk
      this.audioChunks = lastChunk ? [lastChunk] : [];
      
    } catch (error) {
      console.error('Error processing accumulated chunks:', error);
      this.currentTranscript = 'Error processing speech';
      this.updateStreamingTranscript();
      
      // Clear chunks on error
      this.audioChunks = [];
    }
  },
  
  // Stop Socket.IO streaming
  stopSocketIOStreaming() {
    if (this.socket && this.socket.connected && this.streamingActive) {
      console.log('Stopping Socket.IO streaming...');
      this.socket.emit('stop-stream');
      this.streamingActive = false;
    }
  },
  
  // Stop recording
  async stopRecording() {
    if (!this.isRecording) return;
    
    console.log('Stopping recording...');
    this.isRecording = false;
    
    // Reset auto-commit timer
    this.resetAutoCommitTimer();
    
    // Handle different recording modes
    if (this.streamingActive) {
      this.stopSocketIOStreaming();
    }
    
    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all audio tracks
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // Process any pending interim text as final
    if (this.pendingInterimText && this.pendingInterimText.trim()) {
      console.log('Processing pending interim text as final:', this.pendingInterimText);
      this.handleFinalTranscript(this.pendingInterimText);
      this.pendingInterimText = '';
    }
    
    this.updateRecordButton();
    this.updateStatus('Recording stopped');
    this.updateModeIndicator();
  },
  
  // Display transcript (unified method for both interim and final)
  displayTranscript(transcript, isFinal = false) {
    const transcriptDiv = document.getElementById('transcriptDisplay');
    if (!transcriptDiv) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const transcriptClass = isFinal ? 'final' : 'interim';
    
    if (isFinal) {
      // Store transcript for history saving (will be saved with translation)
      const saveHistoryEnabled = localStorage.getItem('saveHistory') !== 'false';
      if (saveHistoryEnabled) {
        this.currentTranscriptForHistory = {
          text: transcript,
          timestamp: timestamp
        };
      }
      
      // Add to existing transcripts
      const finalDiv = document.createElement('div');
      finalDiv.className = `transcript-item ${transcriptClass}`;
      finalDiv.innerHTML = `
        <div class="transcript-text">${transcript}</div>
        <div class="transcript-meta">
          <span>${timestamp}</span>
          <span>Language: ${this.currentLanguagePair.source}</span>
        </div>
      `;
      transcriptDiv.appendChild(finalDiv);
      
      // Scroll to bottom
      transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    } else {
      // Update or create interim display
      let interimDiv = transcriptDiv.querySelector('.interim');
      if (!interimDiv) {
        interimDiv = document.createElement('div');
        interimDiv.className = `transcript-item ${transcriptClass}`;
        transcriptDiv.appendChild(interimDiv);
      }
      
      interimDiv.innerHTML = `
        <div class="transcript-text">${transcript}</div>
        <div class="transcript-meta">
          <span>Transcribed Text:</span>
        </div>
      `;
    }
  },
  
  // Save transcript to history
  saveToHistory(transcript, timestamp, translation = null) {
    try {
      let history = JSON.parse(localStorage.getItem('transcriptHistory') || '[]');
      
      const historyItem = {
        id: Date.now(),
        text: transcript,
        translation: translation,
        timestamp: timestamp,
        date: new Date().toLocaleDateString(),
        sourceLanguage: this.currentLanguagePair.source,
        targetLanguage: this.currentLanguagePair.target
      };
      
      history.unshift(historyItem); // Add to beginning
      
      // Limit history to 100 items
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      localStorage.setItem('transcriptHistory', JSON.stringify(history));
      this.updateHistoryDisplay();
      
      console.log('Saved to history:', historyItem);
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  },
  
  // Update history display
  updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    try {
      const history = JSON.parse(localStorage.getItem('transcriptHistory') || '[]');
      
      if (history.length === 0) {
        historyList.innerHTML = `
          <p style="font-size: 12px; color: var(--text-muted); text-align: center; margin: 20px 0;">
            No history items yet. Start recording to see your transcription history here.
          </p>`;
        return;
      }
      
      let historyHTML = '';
      history.slice(0, 10).forEach(item => { // Show only last 10 items
        const displayText = item.text.length > 80 ? item.text.substring(0, 80) + '...' : item.text;
        const displayTranslation = item.translation ? 
          (item.translation.length > 80 ? item.translation.substring(0, 80) + '...' : item.translation) : 
          'No translation';
        
        historyHTML += `
          <div class="history-item" style="
            background: var(--background-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-small);
            padding: 10px;
            margin-bottom: 8px;
            font-size: 12px;
          ">
            <div style="color: var(--text-primary); margin-bottom: 8px; line-height: 1.4;">
              <div style="font-weight: 500; margin-bottom: 4px;">📝 Original:</div>
              <div style="margin-bottom: 6px;">${displayText}</div>
              ${item.translation ? `
                <div style="font-weight: 500; margin-bottom: 4px; color: var(--accent-color);">🌐 Translation:</div>
                <div style="color: var(--text-secondary);">${displayTranslation}</div>
              ` : ''}
            </div>
            <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 8px;">
              ${item.date} ${item.timestamp} | ${item.sourceLanguage} → ${item.targetLanguage}
            </div>
            <div style="display: flex; gap: 6px;">
              <button onclick="speechTranslatorApp.copyHistoryItem('${item.text.replace(/'/g, "\\'")}')" 
                      class="copy-button" style="font-size: 10px; padding: 4px 8px;">
                <i class="fas fa-copy"></i> Copy Original
              </button>
              ${item.translation ? `
                <button onclick="speechTranslatorApp.copyHistoryItem('${item.translation.replace(/'/g, "\\'")}')" 
                        class="copy-button" style="font-size: 10px; padding: 4px 8px;">
                  <i class="fas fa-language"></i> Copy Translation
                </button>
              ` : ''}
            </div>
          </div>`;
      });
      
      historyList.innerHTML = historyHTML;
    } catch (error) {
      console.error('Error updating history display:', error);
    }
  },
  
  // Copy history item to clipboard
  copyHistoryItem(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  },
  
  // Clear history
  clearHistory() {
    localStorage.removeItem('transcriptHistory');
    this.updateHistoryDisplay();
    console.log('History cleared');
  },
  
  // Export history to file
  exportHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('transcriptHistory') || '[]');
      
      if (history.length === 0) {
        alert('No history to export.');
        return;
      }
      
      let exportContent = 'Transcription & Translation History Export\n';
      exportContent += '=' + '='.repeat(40) + '\n\n';
      
      history.forEach((item, index) => {
        exportContent += `${index + 1}. ${item.date} ${item.timestamp}\n`;
        exportContent += `Language: ${item.sourceLanguage} → ${item.targetLanguage}\n`;
        exportContent += `Original Text: ${item.text}\n`;
        if (item.translation) {
          exportContent += `Translation: ${item.translation}\n`;
        } else {
          exportContent += `Translation: [Not available]\n`;
        }
        exportContent += '-'.repeat(60) + '\n\n';
      });
      
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription_history_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      console.log('History exported successfully');
    } catch (error) {
      console.error('Error exporting history:', error);
      alert('Failed to export history.');
    }
  },
  
  // Performance tracking methods
  trackApiCall(type, responseTime, success = true) {
    this.performanceStats.apiCalls++;
    this.performanceStats.lastResponseTime = responseTime;
    this.performanceStats.totalResponseTime += responseTime;
    
    if (success) {
      this.performanceStats.successfulCalls++;
    } else {
      this.performanceStats.failedCalls++;
    }
    
    console.log(`API Call tracked: ${type}, ${responseTime}ms, Success: ${success}`);
    this.updatePerformanceDisplay();
  },
  
  // Update memory usage
  updateMemoryUsage() {
    if (performance.memory) {
      this.performanceStats.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    this.updatePerformanceDisplay();
  },
  
  // Track cache hit
  trackCacheHit() {
    this.performanceStats.cacheHits++;
    this.updatePerformanceDisplay();
  },
  
  // Update performance display
  updatePerformanceDisplay() {
    const cacheStats = document.getElementById('cacheStats');
    const apiStats = document.getElementById('apiStats');
    
    if (!cacheStats || !apiStats) return;
    
    const stats = this.performanceStats;
    const successRate = stats.apiCalls > 0 ? Math.round((stats.successfulCalls / stats.apiCalls) * 100) : 100;
    const avgResponseTime = stats.apiCalls > 0 ? Math.round(stats.totalResponseTime / stats.apiCalls) : 0;
    const uptime = Math.round((Date.now() - stats.startTime) / 1000);
    
    // Memory usage status
    let memoryStatus = 'Low';
    if (stats.memoryUsage > 100) memoryStatus = 'High';
    else if (stats.memoryUsage > 50) memoryStatus = 'Medium';
    
    // Cache efficiency
    const cacheEfficiency = stats.apiCalls > 0 ? Math.round((stats.cacheHits / stats.apiCalls) * 100) : 0;
    
    cacheStats.innerHTML = `
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">Cache Hits: ${stats.cacheHits}</p>
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">API Calls: ${stats.apiCalls}</p>
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">Memory: ${stats.memoryUsage}MB (${memoryStatus})</p>
    `;
    
    apiStats.innerHTML = `
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">Response Time: ${stats.lastResponseTime}ms (Avg: ${avgResponseTime}ms)</p>
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">Success Rate: ${successRate}%</p>
      <p style="font-size: 12px; color: var(--text-muted); margin: 5px 0;">Errors: ${stats.failedCalls} | Uptime: ${uptime}s</p>
    `;
  },
  
  // Initialize performance tracking
  initializePerformanceTracking() {
    // Update performance display initially
    this.updatePerformanceDisplay();
    
    // Update memory usage and performance display every 5 seconds
    setInterval(() => {
      this.updateMemoryUsage();
    }, 5000);
    
    // Reset performance stats start time
    this.performanceStats.startTime = Date.now();
    
    console.log('Performance tracking initialized');
  },
  
  // Fallback batch processing for when streaming fails
  async processBatchAudio() {
    try {
      if (this.audioChunks.length === 0) {
        this.updateStatus('No audio recorded');
        return;
      }
      
      console.log('Processing audio in batch mode (streaming fallback)...');
      this.updateStatus('Transcribing audio...');
      
      // Combine audio chunks into a single blob
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      
      // Convert blob to ArrayBuffer for processing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const audioArray = Array.from(uint8Array);
      
      console.log('Audio data prepared, size:', audioArray.length, 'bytes');
      
      // Send to Google Cloud Speech-to-Text with performance tracking
      const startTime = performance.now();
      try {
        const transcriptionResult = await window.electronAPI.transcribeAudio(
          audioArray, 
          this.currentLanguagePair.source
        );
        
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Speech-to-Text', responseTime, true);
        
        if (transcriptionResult && transcriptionResult.text) {
          console.log('Batch transcription result:', transcriptionResult.text);
          this.displayTranscript(transcriptionResult.text, true);
          await this.translateText(transcriptionResult.text);
          this.updateStatus('Transcription complete');
        } else {
          console.log('No transcription result from batch processing');
          this.updateStatus('No speech detected');
        }
        
      } catch (apiError) {
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Speech-to-Text', responseTime, false);
        console.error('Transcription API error:', apiError);
        this.updateStatus('Transcription failed');
      }
      
    } catch (error) {
      console.error('Error in batch processing:', error);
      this.updateStatus('Error: ' + error.message);
    }
  },
  
  // Translate text using Google Cloud Translate
  async translateText(text) {
    try {
      if (!text || text.trim() === '') {
        return;
      }
      
      // Check if auto-translate is enabled
      const autoTranslateEnabled = localStorage.getItem('autoTranslate') !== 'false';
      if (!autoTranslateEnabled) {
        console.log('Auto-translate disabled, skipping translation');
        
        // Save to history without translation if we have a pending transcript
        if (this.currentTranscriptForHistory) {
          this.saveToHistory(
            this.currentTranscriptForHistory.text,
            this.currentTranscriptForHistory.timestamp,
            null // No translation
          );
          this.currentTranscriptForHistory = null; // Clear after saving
        }
        
        const translationDiv = document.getElementById('translationDisplay');
        if (translationDiv) {
          translationDiv.innerHTML = `
            <div style="color: var(--text-muted); font-style: italic; text-align: center;">
              Auto-translate disabled. Enable in settings to see translations.
            </div>`;
        }
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
      
      const startTime = performance.now();
      try {
        const translationResult = await window.electronAPI.translateText(
          text,
          this.currentLanguagePair.target,
          sourceLanguageCode
        );
        
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Translation', responseTime, true);
        
        console.log('Translation received:', translationResult);
        
        // Save to history with both transcript and translation
        if (this.currentTranscriptForHistory) {
          this.saveToHistory(
            this.currentTranscriptForHistory.text,
            this.currentTranscriptForHistory.timestamp,
            translationResult.translatedText
          );
          this.currentTranscriptForHistory = null; // Clear after saving
        }
      
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
      
      } catch (apiError) {
        const responseTime = Math.round(performance.now() - startTime);
        this.trackApiCall('Translation', responseTime, false);
        console.error('Translation API error:', apiError);
        throw apiError;
      }
      
    } catch (error) {
      console.error('Translation error:', error);
      
      // Save to history without translation if we have a pending transcript and translation failed
      if (this.currentTranscriptForHistory) {
        this.saveToHistory(
          this.currentTranscriptForHistory.text,
          this.currentTranscriptForHistory.timestamp,
          null // No translation due to error
        );
        this.currentTranscriptForHistory = null; // Clear after saving
      }
      
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
      // Get current values
      const currentSource = sourceSelect.value;
      const currentTarget = targetSelect.value;
      
      // Get all available options
      const sourceOptions = Array.from(sourceSelect.options);
      const targetOptions = Array.from(targetSelect.options);
      
      // Find the corresponding language names
      const sourceLanguageName = sourceOptions.find(opt => opt.value === currentSource)?.textContent;
      const targetLanguageName = targetOptions.find(opt => opt.value === currentTarget)?.textContent;
      
      // Try to find matching languages in opposite selectors
      // For source: look for target language in source options
      let newSourceValue = null;
      let newTargetValue = null;
      
      // Simple approach: try to find by language name or partial matching
      // Check if current target exists in source options
      const targetInSource = sourceOptions.find(opt => 
        opt.value === currentTarget || 
        opt.value.startsWith(currentTarget) || 
        opt.textContent.toLowerCase().includes(targetLanguageName?.toLowerCase().split(' ')[0] || '')
      );
      
      // Check if current source exists in target options  
      const sourceInTarget = targetOptions.find(opt => 
        opt.value === this.speechToTranslationLangCode(currentSource) ||
        opt.textContent.toLowerCase().includes(sourceLanguageName?.toLowerCase().split(' ')[0] || '')
      );
      
      if (targetInSource && sourceInTarget) {
        newSourceValue = targetInSource.value;
        newTargetValue = sourceInTarget.value;
      } else {
        // Fallback: try basic language code conversion
        const sourceBasicCode = this.speechToTranslationLangCode(currentSource);
        const targetWithRegion = currentTarget + '-US'; // Add region for speech recognition
        
        const sourceHasTarget = sourceOptions.some(opt => 
          opt.value === targetWithRegion || opt.value === currentTarget
        );
        const targetHasSource = targetOptions.some(opt => 
          opt.value === sourceBasicCode
        );
        
        if (sourceHasTarget && targetHasSource) {
          newSourceValue = sourceOptions.find(opt => 
            opt.value === targetWithRegion || opt.value === currentTarget
          ).value;
          newTargetValue = sourceBasicCode;
        }
      }
      
      // Apply the swap if valid combinations found
      if (newSourceValue && newTargetValue) {
        this.currentLanguagePair.source = newSourceValue;
        this.currentLanguagePair.target = newTargetValue;
        sourceSelect.value = newSourceValue;
        targetSelect.value = newTargetValue;
        
        console.log('Languages swapped successfully:', {
          from: { source: currentSource, target: currentTarget },
          to: { source: newSourceValue, target: newTargetValue }
        });
        
        // Update status to show the swap
        this.updateStatus(`Languages swapped: ${sourceSelect.options[sourceSelect.selectedIndex].text} ↔ ${targetSelect.options[targetSelect.selectedIndex].text}`);
      } else {
        console.warn('Cannot swap languages - compatible language pair not found');
        this.updateStatus('Cannot swap - languages not compatible');
        
        // Show available options for debugging
        console.log('Available source languages:', sourceOptions.map(opt => ({code: opt.value, name: opt.textContent})));
        console.log('Available target languages:', targetOptions.map(opt => ({code: opt.value, name: opt.textContent})));
      }
    } else {
      console.error('Language selectors not found');
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
