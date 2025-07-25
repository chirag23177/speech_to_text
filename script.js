// Real-Time Speech Translator - Main Application
// Part 1.1: Basic Project Structure and UI Setup

class SpeechTranslator {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
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
            sourceLang: document.getElementById('source-lang'),
            targetLang: document.getElementById('target-lang'),
            swapButton: document.getElementById('swap-languages'),
            speechInput: document.getElementById('speech-input'),
            translationOutput: document.getElementById('translation-output'),
            copyInputBtn: document.getElementById('copy-input'),
            copyOutputBtn: document.getElementById('copy-output'),
            loadingOverlay: document.getElementById('loading-overlay')
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
        });
    }

    // Initialize the application
    initializeApp() {
        this.updateStatus('Application initialized - Ready to translate');
        this.checkBrowserSupport();
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

    // Toggle recording state
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    // Start recording (placeholder for Part 2)
    startRecording() {
        console.log('Starting recording...');
        this.isRecording = true;
        this.updateUI('recording');
        this.updateStatus('Recording started - Speak now');
        
        // Placeholder: Actual speech recognition will be implemented in Part 3
        this.simulateRecording();
    }

    // Stop recording (placeholder for Part 2)
    stopRecording() {
        console.log('Stopping recording...');
        this.isRecording = false;
        this.updateUI('idle');
        this.updateStatus('Recording stopped');
    }

    // Simulate recording for testing (will be replaced in later parts)
    simulateRecording() {
        // This is just for testing the UI - will be replaced with real speech recognition
        setTimeout(() => {
            if (this.isRecording) {
                this.displayText('Hello, this is a test of the speech input display.', 'input');
                setTimeout(() => {
                    this.displayText('Hola, esta es una prueba de la pantalla de entrada de voz.', 'output');
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
    displayText(text, area) {
        const targetElement = area === 'input' ? this.elements.speechInput : this.elements.translationOutput;
        
        // Remove placeholder and add text content
        targetElement.innerHTML = `<div class="text-content">${text}</div>`;
        
        console.log(`Displayed text in ${area}:`, text);
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

    // Get current configuration
    getConfiguration() {
        return {
            languages: this.currentLanguages,
            isRecording: this.isRecording,
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
    statusElement.title = 'Keyboard shortcuts: Ctrl+Space (toggle recording), Ctrl+S (swap languages)';
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechTranslator;
}
