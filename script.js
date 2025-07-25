// Real-Time Speech Translator - Main Application
// Part 1.2 + Part 2.1: Enhanced UI with Microphone Permission & Access

class SpeechTranslator {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.mediaStream = null;
        this.permissionStatus = 'unknown'; // 'granted', 'denied', 'prompt', 'unknown'
        this.currentLanguages = {
            source: 'en-US',
            target: 'es'
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeApp();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            micButton: document.getElementById('mic-button'),
            statusText: document.getElementById('status-text'),
            statusDot: document.getElementById('status-dot'),
            sourceLang: document.getElementById('source-lang'),
            targetLang: document.getElementById('target-lang'),
            swapButton: document.getElementById('swap-languages'),
            speechInput: document.getElementById('speech-input'),
            translationOutput: document.getElementById('translation-output'),
            copyInputBtn: document.getElementById('copy-input'),
            copyOutputBtn: document.getElementById('copy-output'),
            speakOutputBtn: document.getElementById('speak-output'),
            loadingOverlay: document.getElementById('loading-overlay'),
            themeToggle: document.getElementById('theme-toggle'),
            clearAllBtn: document.getElementById('clear-all'),
            settingsBtn: document.getElementById('settings-btn'),
            audioVisualizer: document.getElementById('audio-visualizer'),
            confidenceIndicator: document.getElementById('confidence-indicator'),
            confidenceText: document.querySelector('.confidence-text')
        };
    }

    // Setup event listeners
    setupEventListeners() {
        // Microphone button
        this.elements.micButton.addEventListener('click', () => {
            this.toggleRecording();
        });

        // Language selection
        this.elements.sourceLang.addEventListener('change', (e) => {
            this.currentLanguages.source = e.target.value;
            this.updateStatus(`Source language changed to ${e.target.selectedOptions[0].text}`);
        });

        this.elements.targetLang.addEventListener('change', (e) => {
            this.currentLanguages.target = e.target.value;
            this.updateStatus(`Target language changed to ${e.target.selectedOptions[0].text}`);
        });

        // Language swap
        this.elements.swapButton.addEventListener('click', () => {
            this.swapLanguages();
        });

        // Copy buttons
        this.elements.copyInputBtn.addEventListener('click', () => {
            this.copyToClipboard('input');
        });

        this.elements.copyOutputBtn.addEventListener('click', () => {
            this.copyToClipboard('output');
        });

        // Speak output button
        this.elements.speakOutputBtn.addEventListener('click', () => {
            this.speakText('output');
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Clear all button
        this.elements.clearAllBtn.addEventListener('click', () => {
            this.clearAllText();
        });

        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => {
            this.showSettings();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey) {
                e.preventDefault();
                this.toggleRecording();
            }
            if (e.code === 'KeyS' && e.ctrlKey) {
                e.preventDefault();
                this.swapLanguages();
            }
            if (e.code === 'KeyT' && e.ctrlKey) {
                e.preventDefault();
                this.toggleTheme();
            }
            if (e.code === 'Escape') {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }
        });

        // Load saved theme preference
        this.loadThemePreference();
    }

    // Initialize the application
    initializeApp() {
        this.updateStatus('Application initialized - Ready to translate');
        this.checkBrowserSupport();
        this.checkMicrophonePermission();
        console.log('Speech Translator initialized successfully');
    }

    // Check browser support for required APIs
    checkBrowserSupport() {
        const support = {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            fetch: 'fetch' in window
        };

        console.log('Browser support check:', support);

        if (!support.speechRecognition) {
            this.showError('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
            return false;
        }

        if (!support.mediaDevices) {
            this.showError('Microphone access is not supported in your browser.');
            return false;
        }

        this.updateStatus('All required features are supported');
        return true;
    }

    // Part 2.1: Check microphone permission status
    async checkMicrophonePermission() {
        try {
            if ('permissions' in navigator) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                this.permissionStatus = permission.state;
                console.log('Microphone permission status:', permission.state);
                
                // Listen for permission changes
                permission.addEventListener('change', () => {
                    this.permissionStatus = permission.state;
                    this.updatePermissionUI();
                });
                
                this.updatePermissionUI();
            } else {
                // Fallback for browsers without Permissions API
                this.updateStatus('Ready to translate - Click microphone to start');
            }
        } catch (error) {
            console.warn('Could not check microphone permission:', error);
            this.updateStatus('Ready to translate - Click microphone to start');
        }
    }

    // Part 2.1: Update UI based on permission status
    updatePermissionUI() {
        switch (this.permissionStatus) {
            case 'granted':
                this.updateStatus('Microphone access granted - Ready to translate');
                this.elements.micButton.disabled = false;
                break;
            case 'denied':
                this.updateStatus('Microphone access denied - Please enable in browser settings');
                this.elements.micButton.disabled = true;
                break;
            case 'prompt':
                this.updateStatus('Click microphone to grant access');
                this.elements.micButton.disabled = false;
                break;
            default:
                this.updateStatus('Ready to translate - Click microphone to start');
                this.elements.micButton.disabled = false;
                break;
        }
    }

    // Part 2.1: Request microphone access
    async requestMicrophoneAccess() {
        try {
            this.updateStatus('Requesting microphone access...');
            console.log('Requesting microphone access...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            this.mediaStream = stream;
            this.permissionStatus = 'granted';
            console.log('Microphone access granted');
            
            this.updateStatus('Microphone access granted - Ready to translate');
            this.updatePermissionUI();
            
            return true;
            
        } catch (error) {
            console.error('Microphone access error:', error);
            this.handleMicrophoneError(error);
            return false;
        }
    }

    // Part 2.1: Handle microphone errors
    handleMicrophoneError(error) {
        switch (error.name) {
            case 'NotAllowedError':
                this.permissionStatus = 'denied';
                this.updateStatus('Microphone access denied - Please allow microphone access');
                break;
            case 'NotFoundError':
                this.updateStatus('No microphone found - Please connect a microphone');
                break;
            case 'NotReadableError':
                this.updateStatus('Microphone is busy - Close other apps using microphone');
                break;
            default:
                this.updateStatus('Microphone error - Please try again');
                break;
        }
        this.updatePermissionUI();
    }

    // Toggle recording state
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    // Start recording (enhanced with microphone access)
    async startRecording() {
        console.log('Starting recording...');
        
        // Part 2.1: Check for microphone access
        if (!this.mediaStream || !this.mediaStream.active) {
            const accessGranted = await this.requestMicrophoneAccess();
            if (!accessGranted) {
                return;
            }
        }
        
        this.isRecording = true;
        this.updateUI('recording');
        this.updateStatus('Recording started - Speak now');
        this.updateStatusDot('recording');
        this.showAudioVisualizer();
        
        console.log('Recording started with microphone access');
        
        // Placeholder: Actual speech recognition will be implemented in Part 3
        this.simulateRecording();
    }

    // Stop recording (enhanced with proper cleanup)
    stopRecording() {
        console.log('Stopping recording...');
        this.isRecording = false;
        this.updateUI('processing');
        this.updateStatus('Processing speech...');
        this.updateStatusDot('processing');
        this.hideAudioVisualizer();
        
        // Simulate processing time
        setTimeout(() => {
            this.updateUI('idle');
            this.updateStatus('Ready to translate');
            this.updateStatusDot('idle');
        }, 1500);
    }

    // Simulate recording for testing (will be replaced in later parts)
    simulateRecording() {
        // This is just for testing the UI - will be replaced with real speech recognition
        setTimeout(() => {
            if (this.isRecording) {
                this.displayText('Hello, this is a test of the enhanced speech input display with confidence scoring.', 'input', 0.87);
                setTimeout(() => {
                    this.displayText('Hola, esta es una prueba de la pantalla de entrada de voz mejorada con puntuación de confianza.', 'output');
                }, 1000);
            }
        }, 2000);
    }

    // Update UI based on state
    updateUI(state) {
        const micButton = this.elements.micButton;
        const micIcon = micButton.querySelector('i');
        const micText = micButton.querySelector('.mic-text');

        switch (state) {
            case 'recording':
                micButton.classList.add('recording');
                micIcon.className = 'fas fa-stop';
                micText.textContent = 'Click to Stop';
                break;
            case 'processing':
                micButton.classList.remove('recording');
                micIcon.className = 'fas fa-spinner fa-spin';
                micText.textContent = 'Processing...';
                break;
            case 'idle':
            default:
                micButton.classList.remove('recording');
                micIcon.className = 'fas fa-microphone';
                micText.textContent = 'Click to Speak';
                break;
        }
    }

    // Display text in input or output areas
    displayText(text, area, confidence = null) {
        const targetElement = area === 'input' ? this.elements.speechInput : this.elements.translationOutput;
        
        // Remove placeholder and add text content
        targetElement.innerHTML = `<div class="text-content">${text}</div>`;
        
        // Update confidence indicator for input
        if (area === 'input' && confidence !== null) {
            this.updateConfidenceIndicator(confidence);
        }
        
        console.log(`Displayed text in ${area}:`, text);
    }

    // Update confidence indicator
    updateConfidenceIndicator(confidence) {
        if (this.elements.confidenceText) {
            const percentage = Math.round(confidence * 100);
            this.elements.confidenceText.textContent = `${percentage}%`;
            
            // Update confidence color based on level
            const indicator = this.elements.confidenceIndicator;
            indicator.classList.remove('low', 'medium', 'high');
            
            if (confidence < 0.6) {
                indicator.classList.add('low');
            } else if (confidence < 0.8) {
                indicator.classList.add('medium');
            } else {
                indicator.classList.add('high');
            }
        }
    }

    // Update status dot
    updateStatusDot(state) {
        const statusDot = this.elements.statusDot;
        if (statusDot) {
            statusDot.classList.remove('recording', 'processing');
            if (state !== 'idle') {
                statusDot.classList.add(state);
            }
        }
    }

    // Show/hide audio visualizer
    showAudioVisualizer() {
        if (this.elements.audioVisualizer) {
            this.elements.audioVisualizer.classList.add('active');
        }
    }

    hideAudioVisualizer() {
        if (this.elements.audioVisualizer) {
            this.elements.audioVisualizer.classList.remove('active');
        }
    }

    // Update status message
    updateStatus(message) {
        this.elements.statusText.textContent = message;
        console.log('Status:', message);
    }

    // Show error message
    showError(message) {
        this.updateStatus(`Error: ${message}`);
        console.error(message);
        
        // You could also show a modal or toast notification here
        alert(`Error: ${message}`);
    }

    // Swap source and target languages
    swapLanguages() {
        const sourceLang = this.elements.sourceLang.value;
        const targetLang = this.elements.targetLang.value;
        
        // Language mapping between speech recognition codes and translation codes
        const langMapping = {
            'en-US': 'en',
            'es-ES': 'es',
            'fr-FR': 'fr',
            'de-DE': 'de',
            'it-IT': 'it',
            'pt-PT': 'pt',
            'zh-CN': 'zh',
            'ja-JP': 'ja',
            'ko-KR': 'ko',
            'ar-SA': 'ar'
        };

        const reverseLangMapping = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
            'zh': 'zh-CN',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'ar': 'ar-SA'
        };

        // Swap the values
        this.elements.sourceLang.value = reverseLangMapping[targetLang] || 'en-US';
        this.elements.targetLang.value = langMapping[sourceLang] || 'es';

        // Update current languages
        this.currentLanguages.source = this.elements.sourceLang.value;
        this.currentLanguages.target = this.elements.targetLang.value;

        this.updateStatus('Languages swapped');
    }

    // Copy text to clipboard
    async copyToClipboard(area) {
        const targetElement = area === 'input' ? this.elements.speechInput : this.elements.translationOutput;
        const textContent = targetElement.querySelector('.text-content');
        
        if (!textContent) {
            this.updateStatus('No text to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(textContent.textContent);
            this.updateStatus(`${area === 'input' ? 'Input' : 'Translation'} copied to clipboard`);
            
            // Visual feedback
            const button = area === 'input' ? this.elements.copyInputBtn : this.elements.copyOutputBtn;
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = originalIcon;
            }, 1000);
            
        } catch (err) {
            console.error('Failed to copy text:', err);
            this.updateStatus('Failed to copy text');
        }
    }

    // Show/hide loading overlay
    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('preferred-theme', newTheme);
        
        // Update theme toggle icon
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        this.updateStatus(`Switched to ${newTheme} theme`);
    }

    loadThemePreference() {
        const savedTheme = localStorage.getItem('preferred-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme toggle icon
        const icon = this.elements.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Text-to-speech functionality
    async speakText(area) {
        const targetElement = area === 'input' ? this.elements.speechInput : this.elements.translationOutput;
        const textContent = targetElement.querySelector('.text-content');
        
        if (!textContent) {
            this.updateStatus('No text to speak');
            return;
        }

        if ('speechSynthesis' in window) {
            // Stop any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(textContent.textContent);
            
            // Set language based on area
            if (area === 'output') {
                utterance.lang = this.getLanguageCode(this.currentLanguages.target);
            } else {
                utterance.lang = this.currentLanguages.source;
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            // Visual feedback
            const button = this.elements.speakOutputBtn;
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-stop"></i>';
            
            utterance.onend = () => {
                button.innerHTML = originalIcon;
                this.updateStatus('Finished speaking');
            };
            
            utterance.onerror = () => {
                button.innerHTML = originalIcon;
                this.updateStatus('Speech synthesis failed');
            };
            
            speechSynthesis.speak(utterance);
            this.updateStatus('Speaking...');
        } else {
            this.updateStatus('Text-to-speech not supported in your browser');
        }
    }

    // Get language code for speech synthesis
    getLanguageCode(langCode) {
        const langMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'pt': 'pt-PT',
            'zh': 'zh-CN',
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'ar': 'ar-SA'
        };
        return langMap[langCode] || 'en-US';
    }

    // Clear all text
    clearAllText() {
        // Reset input area
        this.elements.speechInput.innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-microphone-alt"></i>
                <p>Your speech will appear here...</p>
                <small>Supports: English, Spanish, French, German, and more</small>
            </div>
        `;
        
        // Reset output area
        this.elements.translationOutput.innerHTML = `
            <div class="placeholder-text">
                <i class="fas fa-globe"></i>
                <p>Translation will appear here...</p>
                <small>Instant translation to your selected language</small>
            </div>
        `;
        
        // Reset confidence indicator
        if (this.elements.confidenceText) {
            this.elements.confidenceText.textContent = '--';
        }
        
        this.updateStatus('All text cleared');
    }

    // Show settings (enhanced with microphone info)
    showSettings() {
        const permissionInfo = `Microphone permission: ${this.permissionStatus}`;
        const streamInfo = this.mediaStream ? 'Microphone stream: Active' : 'Microphone stream: Inactive';
        
        const settingsInfo = [
            'Speech Translator Settings',
            '',
            '🎤 Microphone Status:',
            `• ${permissionInfo}`,
            `• ${streamInfo}`,
            '',
            '⌨️ Keyboard Shortcuts:',
            '• Ctrl+Space: Toggle recording',
            '• Ctrl+S: Swap languages', 
            '• Ctrl+T: Toggle theme',
            '• Esc: Stop recording'
        ].join('\n');
        
        console.log('Settings info:', settingsInfo);
        alert(settingsInfo);
        
        this.updateStatus('Settings displayed');
    }

    // Get current configuration
    getConfiguration() {
        return {
            languages: this.currentLanguages,
            isRecording: this.isRecording,
            permissionStatus: this.permissionStatus,
            hasMediaStream: !!this.mediaStream,
            browserSupport: this.checkBrowserSupport()
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Speech Translator...');
    window.speechTranslator = new SpeechTranslator();
    
    // Add keyboard shortcut hints to the UI
    const statusElement = document.getElementById('status-text');
    statusElement.title = 'Keyboard shortcuts: Ctrl+Space (toggle recording), Ctrl+S (swap languages), Ctrl+T (toggle theme)';
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechTranslator;
}
