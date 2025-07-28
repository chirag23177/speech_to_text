const { ipcRenderer } = require('electron');

// Try to load modules with fallbacks for missing dependencies
let AudioCapture, Transcriber, Translator;

try {
  AudioCapture = require('./audioCapture');
} catch (error) {
  console.warn('Native AudioCapture failed, using fallback:', error.message);
  try {
    AudioCapture = require('./audioCapture-fallback');
  } catch (fallbackError) {
    console.error('Fallback AudioCapture also failed:', fallbackError.message);
    // Create minimal mock
    AudioCapture = class { constructor() { this.emit = () => {}; } };
  }
}

try {
  Transcriber = require('./transcriber');
} catch (error) {
  console.warn('Transcriber module failed:', error.message);
  // Create minimal mock
  Transcriber = class { 
    constructor() {} 
    async startTranscription() { console.log('Transcription unavailable'); }
  };
}

try {
  Translator = require('./translator');
} catch (error) {
  console.warn('Translator module failed:', error.message);
  // Create minimal mock
  Translator = class { 
    constructor() {} 
    async translateText() { return 'Translation unavailable'; }
  };
}

/**
 * Renderer Process - Main Application Logic
 * Coordinates audio capture, transcription, and translation
 */
class SpeechTranslatorApp {
  constructor() {
    this.audioCapture = new AudioCapture();
    this.transcriber = new Transcriber();
    this.translator = new Translator();
    
    this.isRecording = false;
    this.currentTranscript = '';
    this.translationHistory = [];
    this.audioDevices = { microphones: [], systemAudio: [] };
    this.selectedAudioDevice = null;
    this.audioMode = 'microphone'; // 'microphone' or 'system'
    
    // UI elements
    this.elements = {};
    
    // Settings
    this.settings = {
      theme: 'dark',
      autoTranslate: true,
      saveHistory: true,
      audioVisualization: true
    };
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  async initializeApp() {
    console.log('Initializing Speech Translator Desktop App...');
    
    await this.initializeUI();
    this.setupEventListeners();
    this.loadSettings();
    await this.loadAudioDevices();
    this.setupModuleEventListeners();
    
    console.log('Application initialized successfully');
  }

  /**
   * Initialize UI elements
   */
  async initializeUI() {
    // Cache DOM elements
    this.elements = {
      // Recording controls
      recordButton: document.getElementById('recordButton'),
      stopButton: document.getElementById('stopButton'),
      audioModeToggle: document.getElementById('audioModeToggle'),
      deviceSelector: document.getElementById('deviceSelector'),
      
      // Language controls
      sourceLanguageSelect: document.getElementById('sourceLanguage'),
      targetLanguageSelect: document.getElementById('targetLanguage'),
      swapLanguagesButton: document.getElementById('swapLanguages'),
      
      // Display areas
      transcriptDisplay: document.getElementById('transcriptDisplay'),
      translationDisplay: document.getElementById('translationDisplay'),
      statusDisplay: document.getElementById('statusDisplay'),
      
      // Audio visualization
      audioVisualizer: document.getElementById('audioVisualizer'),
      audioLevel: document.getElementById('audioLevel'),
      
      // History panel
      historyPanel: document.getElementById('historyPanel'),
      historyList: document.getElementById('historyList'),
      historyToggle: document.getElementById('historyToggle'),
      exportHistoryButton: document.getElementById('exportHistory'),
      clearHistoryButton: document.getElementById('clearHistory'),
      
      // Performance panel
      performancePanel: document.getElementById('performancePanel'),
      performanceToggle: document.getElementById('performanceToggle'),
      cacheStats: document.getElementById('cacheStats'),
      apiStats: document.getElementById('apiStats'),
      
      // Settings
      themeToggle: document.getElementById('themeToggle'),
      settingsPanel: document.getElementById('settingsPanel'),
      settingsToggle: document.getElementById('settingsToggle')
    };
    
    // Populate language selectors
    await this.populateLanguageSelectors();
    
    // Update UI state
    this.updateUIState();
  }

  /**
   * Setup event listeners for UI elements
   */
  setupEventListeners() {
    // Recording controls
    this.elements.recordButton?.addEventListener('click', () => this.toggleRecording());
    this.elements.stopButton?.addEventListener('click', () => this.stopRecording());
    this.elements.audioModeToggle?.addEventListener('click', () => this.toggleAudioMode());
    this.elements.deviceSelector?.addEventListener('change', (e) => this.selectAudioDevice(e.target.value));
    
    // Language controls
    this.elements.sourceLanguageSelect?.addEventListener('change', (e) => this.changeSourceLanguage(e.target.value));
    this.elements.targetLanguageSelect?.addEventListener('change', (e) => this.changeTargetLanguage(e.target.value));
    this.elements.swapLanguagesButton?.addEventListener('click', () => this.swapLanguages());
    
    // Panel toggles
    this.elements.historyToggle?.addEventListener('click', () => this.toggleHistoryPanel());
    this.elements.performanceToggle?.addEventListener('click', () => this.togglePerformancePanel());
    this.elements.settingsToggle?.addEventListener('click', () => this.toggleSettingsPanel());
    
    // History controls
    this.elements.exportHistoryButton?.addEventListener('click', () => this.exportHistory());
    this.elements.clearHistoryButton?.addEventListener('click', () => this.clearHistory());
    
    // Theme toggle
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // IPC listeners for main process communication
    this.setupIPCListeners();
  }

  /**
   * Setup IPC listeners for main process commands
   */
  setupIPCListeners() {
    ipcRenderer.on('toggle-recording', () => this.toggleRecording());
    ipcRenderer.on('switch-to-mic', () => this.switchToMicrophone());
    ipcRenderer.on('switch-to-system', () => this.switchToSystemAudio());
    ipcRenderer.on('swap-languages', () => this.swapLanguages());
    ipcRenderer.on('toggle-theme', () => this.toggleTheme());
    ipcRenderer.on('toggle-history', () => this.toggleHistoryPanel());
    ipcRenderer.on('toggle-performance', () => this.togglePerformancePanel());
    ipcRenderer.on('export-history', () => this.exportHistory());
    ipcRenderer.on('new-session', () => this.newSession());
    ipcRenderer.on('show-about', () => this.showAboutDialog());
  }

  /**
   * Setup event listeners for audio/transcription/translation modules
   */
  setupModuleEventListeners() {
    // Audio capture events
    this.audioCapture.on('started', (data) => {
      console.log('Audio capture started:', data);
      this.updateStatus('Recording...', 'recording');
    });
    
    this.audioCapture.on('stopped', () => {
      console.log('Audio capture stopped');
      this.updateStatus('Stopped', 'stopped');
    });
    
    this.audioCapture.on('audioData', (data) => {
      this.updateAudioVisualization(data.level);
      this.transcriber.processAudio(data.data);
    });
    
    this.audioCapture.on('error', (error) => {
      console.error('Audio capture error:', error);
      this.showError('Audio Capture Error', error.message || 'Failed to capture audio');
    });
    
    // Transcription events
    this.transcriber.on('started', (data) => {
      console.log('Transcription started:', data);
    });
    
    this.transcriber.on('transcript', async (data) => {
      this.displayTranscript(data);
      
      if (data.isFinal && this.settings.autoTranslate) {
        await this.translateText(data.text);
      }
    });
    
    this.transcriber.on('error', (error) => {
      console.error('Transcription error:', error);
      this.showError('Transcription Error', error.message || 'Failed to transcribe audio');
    });
    
    // Translation events
    this.translator.on('translated', (data) => {
      this.displayTranslation(data);
      
      if (this.settings.saveHistory) {
        this.addToHistory(data);
      }
    });
    
    this.translator.on('error', (error) => {
      console.error('Translation error:', error);
      this.showError('Translation Error', error.message || 'Failed to translate text');
    });
  }

  /**
   * Load audio devices
   */
  async loadAudioDevices() {
    try {
      this.audioDevices = await this.audioCapture.getAudioDevices();
      this.updateDeviceSelector();
      console.log('Audio devices loaded:', this.audioDevices);
    } catch (error) {
      console.error('Error loading audio devices:', error);
      this.showError('Device Error', 'Failed to load audio devices');
    }
  }

  /**
   * Update device selector dropdown
   */
  updateDeviceSelector() {
    if (!this.elements.deviceSelector) return;
    
    this.elements.deviceSelector.innerHTML = '';
    
    const currentDevices = this.audioMode === 'microphone' 
      ? this.audioDevices.microphones 
      : this.audioDevices.systemAudio;
    
    if (currentDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = `No ${this.audioMode} devices found`;
      option.disabled = true;
      this.elements.deviceSelector.appendChild(option);
      return;
    }
    
    currentDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name;
      this.elements.deviceSelector.appendChild(option);
    });
  }

  /**
   * Populate language selector dropdowns
   */
  async populateLanguageSelectors() {
    try {
      const speechLanguages = this.transcriber.getSupportedLanguages();
      const translationLanguages = await this.translator.getSupportedLanguages();
      
      // Populate source language (speech recognition languages)
      if (this.elements.sourceLanguageSelect) {
        Object.entries(speechLanguages).forEach(([code, name]) => {
          const option = document.createElement('option');
          option.value = code;
          option.textContent = name;
          this.elements.sourceLanguageSelect.appendChild(option);
        });
        this.elements.sourceLanguageSelect.value = 'en-US';
      }
      
      // Populate target language (translation languages)
      if (this.elements.targetLanguageSelect) {
        Object.entries(translationLanguages).forEach(([code, name]) => {
          const option = document.createElement('option');
          option.value = code;
          option.textContent = name;
          this.elements.targetLanguageSelect.appendChild(option);
        });
        this.elements.targetLanguageSelect.value = 'es';
      }
    } catch (error) {
      console.error('Error populating language selectors:', error);
    }
  }

  /**
   * Toggle recording
   */
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * Start recording
   */
  async startRecording() {
    try {
      console.log('Starting recording...');
      
      // Start transcription first
      const sourceLanguage = this.elements.sourceLanguageSelect?.value || 'en-US';
      this.transcriber.startTranscription(sourceLanguage);
      
      // Start audio capture
      if (this.audioMode === 'microphone') {
        this.audioCapture.startMicrophoneRecording(this.selectedAudioDevice);
      } else {
        this.audioCapture.startSystemAudioRecording(this.selectedAudioDevice);
      }
      
      this.isRecording = true;
      this.updateUIState();
      
      // Send notification to main process
      ipcRenderer.send('update-tray-tooltip', 'Recording - Speech Translator');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.showError('Recording Error', 'Failed to start recording');
    }
  }

  /**
   * Stop recording
   */
  stopRecording() {
    console.log('Stopping recording...');
    
    this.audioCapture.stopRecording();
    this.transcriber.stopTranscription();
    
    this.isRecording = false;
    this.updateUIState();
    
    // Send notification to main process
    ipcRenderer.send('update-tray-tooltip', 'Stopped - Speech Translator');
  }

  /**
   * Toggle audio mode between microphone and system audio
   */
  toggleAudioMode() {
    const wasRecording = this.isRecording;
    
    if (wasRecording) {
      this.stopRecording();
    }
    
    this.audioMode = this.audioMode === 'microphone' ? 'system' : 'microphone';
    this.selectedAudioDevice = null;
    
    this.updateDeviceSelector();
    this.updateUIState();
    
    console.log(`Switched to ${this.audioMode} mode`);
    
    if (wasRecording) {
      setTimeout(() => this.startRecording(), 500);
    }
  }

  /**
   * Switch to microphone mode
   */
  switchToMicrophone() {
    if (this.audioMode === 'microphone') return;
    
    this.audioMode = 'microphone';
    this.updateDeviceSelector();
    this.updateUIState();
  }

  /**
   * Switch to system audio mode
   */
  switchToSystemAudio() {
    if (this.audioMode === 'system') return;
    
    this.audioMode = 'system';
    this.updateDeviceSelector();
    this.updateUIState();
  }

  /**
   * Select audio device
   */
  selectAudioDevice(deviceId) {
    this.selectedAudioDevice = deviceId;
    console.log(`Selected audio device: ${deviceId}`);
    
    // If recording, restart with new device
    if (this.isRecording) {
      this.stopRecording();
      setTimeout(() => this.startRecording(), 500);
    }
  }

  /**
   * Change source language
   */
  changeSourceLanguage(languageCode) {
    console.log(`Changing source language to: ${languageCode}`);
    this.transcriber.changeLanguage(languageCode);
    
    // Update translation source language mapping
    const mapping = this.translator.getSpeechToTranslationMapping();
    const translationCode = mapping[languageCode] || languageCode.split('-')[0];
    this.translator.setLanguages(translationCode, this.translator.targetLanguage);
  }

  /**
   * Change target language
   */
  changeTargetLanguage(languageCode) {
    console.log(`Changing target language to: ${languageCode}`);
    this.translator.setLanguages(this.translator.sourceLanguage, languageCode);
  }

  /**
   * Swap source and target languages
   */
  swapLanguages() {
    const sourceSelect = this.elements.sourceLanguageSelect;
    const targetSelect = this.elements.targetLanguageSelect;
    
    if (sourceSelect && targetSelect) {
      const oldSource = sourceSelect.value;
      const oldTarget = targetSelect.value;
      
      // Find corresponding speech language for current target
      const mapping = this.translator.getSpeechToTranslationMapping();
      const speechCode = Object.keys(mapping).find(key => mapping[key] === oldTarget) || oldTarget;
      
      if (speechCode && Array.from(sourceSelect.options).some(option => option.value === speechCode)) {
        sourceSelect.value = speechCode;
        targetSelect.value = this.translator.getSpeechToTranslationMapping()[oldSource] || oldSource.split('-')[0];
        
        this.changeSourceLanguage(speechCode);
        this.changeTargetLanguage(this.translator.getSpeechToTranslationMapping()[oldSource] || oldSource.split('-')[0]);
      }
    }
    
    this.translator.swapLanguages();
  }

  /**
   * Display transcript
   */
  displayTranscript(data) {
    if (!this.elements.transcriptDisplay) return;
    
    this.currentTranscript = data.fullTranscript;
    
    this.elements.transcriptDisplay.innerHTML = `
      <div class="transcript-content">
        <div class="transcript-text ${data.isFinal ? 'final' : 'interim'}">${data.text}</div>
        <div class="transcript-meta">
          <span class="confidence">Confidence: ${Math.round((data.confidence || 0) * 100)}%</span>
          <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    `;
  }

  /**
   * Translate text
   */
  async translateText(text) {
    try {
      await this.translator.queueTranslation(text);
    } catch (error) {
      console.error('Translation error:', error);
    }
  }

  /**
   * Display translation
   */
  displayTranslation(data) {
    if (!this.elements.translationDisplay) return;
    
    this.elements.translationDisplay.innerHTML = `
      <div class="translation-content">
        <div class="translation-text">${data.translatedText}</div>
        <div class="translation-meta">
          <span class="languages">${data.sourceLanguage} → ${data.targetLanguage}</span>
          <span class="confidence">Confidence: ${Math.round((data.confidence || 0) * 100)}%</span>
          <span class="cache-status">${data.fromCache ? 'Cached' : 'Live'}</span>
          <button class="copy-button" onclick="navigator.clipboard.writeText('${data.translatedText}')">Copy</button>
        </div>
      </div>
    `;
  }

  /**
   * Update audio visualization
   */
  updateAudioVisualization(level) {
    if (!this.settings.audioVisualization) return;
    
    if (this.elements.audioLevel) {
      this.elements.audioLevel.style.width = `${level}%`;
    }
    
    if (this.elements.audioVisualizer) {
      const bars = this.elements.audioVisualizer.querySelectorAll('.bar');
      bars.forEach((bar, index) => {
        const height = Math.max(5, level - (index * 10));
        bar.style.height = `${Math.max(0, height)}%`;
      });
    }
  }

  /**
   * Update status display
   */
  updateStatus(message, status = 'idle') {
    if (!this.elements.statusDisplay) return;
    
    this.elements.statusDisplay.textContent = message;
    this.elements.statusDisplay.className = `status-display ${status}`;
  }

  /**
   * Update UI state based on current recording status
   */
  updateUIState() {
    // Recording button
    if (this.elements.recordButton) {
      this.elements.recordButton.textContent = this.isRecording ? 'Recording...' : 'Start Recording';
      this.elements.recordButton.disabled = this.isRecording;
    }
    
    // Stop button
    if (this.elements.stopButton) {
      this.elements.stopButton.disabled = !this.isRecording;
    }
    
    // Audio mode toggle
    if (this.elements.audioModeToggle) {
      this.elements.audioModeToggle.textContent = this.audioMode === 'microphone' ? 'Switch to System Audio' : 'Switch to Microphone';
    }
    
    // Device selector
    if (this.elements.deviceSelector) {
      this.elements.deviceSelector.disabled = this.isRecording;
    }
  }

  /**
   * Add translation to history
   */
  addToHistory(data) {
    this.translationHistory.unshift({
      id: Date.now(),
      ...data
    });
    
    // Limit history size
    if (this.translationHistory.length > 1000) {
      this.translationHistory = this.translationHistory.slice(0, 1000);
    }
    
    this.updateHistoryDisplay();
  }

  /**
   * Update history display
   */
  updateHistoryDisplay() {
    if (!this.elements.historyList) return;
    
    this.elements.historyList.innerHTML = '';
    
    this.translationHistory.slice(0, 50).forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div class="history-content">
          <div class="original-text">${item.originalText}</div>
          <div class="translated-text">${item.translatedText}</div>
          <div class="history-meta">
            <span class="languages">${item.sourceLanguage} → ${item.targetLanguage}</span>
            <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>
            <button class="copy-button" onclick="navigator.clipboard.writeText('${item.translatedText}')">Copy</button>
          </div>
        </div>
      `;
      this.elements.historyList.appendChild(historyItem);
    });
  }

  /**
   * Toggle history panel
   */
  toggleHistoryPanel() {
    if (!this.elements.historyPanel) return;
    
    this.elements.historyPanel.classList.toggle('hidden');
    
    if (!this.elements.historyPanel.classList.contains('hidden')) {
      this.updateHistoryDisplay();
    }
  }

  /**
   * Toggle performance panel
   */
  togglePerformancePanel() {
    if (!this.elements.performancePanel) return;
    
    this.elements.performancePanel.classList.toggle('hidden');
    
    if (!this.elements.performancePanel.classList.contains('hidden')) {
      this.updatePerformanceDisplay();
    }
  }

  /**
   * Toggle settings panel
   */
  toggleSettingsPanel() {
    if (!this.elements.settingsPanel) return;
    
    this.elements.settingsPanel.classList.toggle('hidden');
  }

  /**
   * Update performance display
   */
  updatePerformanceDisplay() {
    const cacheStats = this.translator.getCacheStats();
    const audioStatus = this.audioCapture.getStatus();
    const transcriptionStatus = this.transcriber.getStatus();
    const translationStatus = this.translator.getStatus();
    
    if (this.elements.cacheStats) {
      this.elements.cacheStats.innerHTML = `
        <h4>Cache Performance</h4>
        <p>Cache Size: ${cacheStats.size}/${cacheStats.maxSize}</p>
        <p>Hit Rate: ${Math.round(cacheStats.hitRate * 100)}%</p>
      `;
    }
    
    if (this.elements.apiStats) {
      this.elements.apiStats.innerHTML = `
        <h4>System Status</h4>
        <p>Audio: ${audioStatus.isRecording ? 'Recording' : 'Stopped'} (${audioStatus.mode})</p>
        <p>Transcription: ${transcriptionStatus.isTranscribing ? 'Active' : 'Inactive'}</p>
        <p>Translation Queue: ${translationStatus.queueLength} pending</p>
        <p>Restarts: ${transcriptionStatus.restartCounter}</p>
      `;
    }
  }

  /**
   * Export history
   */
  async exportHistory() {
    try {
      const history = this.translator.exportHistory();
      const data = JSON.stringify(history, null, 2);
      
      const result = await ipcRenderer.invoke('show-save-dialog', {
        title: 'Export Translation History',
        defaultPath: `translation-history-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        const fs = require('fs');
        fs.writeFileSync(result.filePath, data);
        
        ipcRenderer.send('show-notification', {
          title: 'Export Complete',
          body: 'Translation history exported successfully'
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showError('Export Error', 'Failed to export history');
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.translationHistory = [];
    this.translator.clearCache();
    this.updateHistoryDisplay();
  }

  /**
   * New session
   */
  newSession() {
    this.stopRecording();
    this.transcriber.clearTranscript();
    this.currentTranscript = '';
    
    if (this.elements.transcriptDisplay) {
      this.elements.transcriptDisplay.innerHTML = '';
    }
    
    if (this.elements.translationDisplay) {
      this.elements.translationDisplay.innerHTML = '';
    }
    
    this.updateStatus('Ready for new session', 'idle');
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
    document.body.className = this.settings.theme + '-theme';
    this.saveSettings();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case ' ':
          event.preventDefault();
          this.toggleRecording();
          break;
        case 's':
          event.preventDefault();
          this.swapLanguages();
          break;
        case 't':
          event.preventDefault();
          this.toggleTheme();
          break;
        case 'h':
          event.preventDefault();
          this.toggleHistoryPanel();
          break;
        case 'p':
          event.preventDefault();
          this.togglePerformancePanel();
          break;
      }
    }
    
    if (event.key === 'Escape') {
      if (this.isRecording) {
        this.stopRecording();
      }
    }
  }

  /**
   * Show error dialog
   */
  async showError(title, message) {
    await ipcRenderer.invoke('show-message-box', {
      type: 'error',
      title: title,
      message: message,
      buttons: ['OK']
    });
  }

  /**
   * Show about dialog
   */
  async showAboutDialog() {
    const version = await ipcRenderer.invoke('get-app-version');
    
    await ipcRenderer.invoke('show-message-box', {
      type: 'info',
      title: 'About Real-Time Speech Translator',
      message: `Real-Time Speech Translator v${version}

A desktop application for real-time speech transcription and translation using Google Cloud APIs.

Features:
• Real-time speech recognition
• Instant translation between 70+ languages
• System audio capture for online meetings
• Translation history and caching
• Cross-platform support

© 2025 chirag23177`,
      buttons: ['OK']
    });
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('speechTranslatorSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    // Apply theme
    document.body.className = this.settings.theme + '-theme';
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('speechTranslatorSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.speechTranslatorApp = new SpeechTranslatorApp();
});

// Export for potential external access
module.exports = SpeechTranslatorApp;
