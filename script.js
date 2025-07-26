// Real-Time Speech Translator - Main Application
// Part 1.2 + Part 2.1: Enhanced UI with Microphone Permission & Access

class SpeechTranslator {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.animationFrame = null;
        this.permissionStatus = 'unknown'; // 'granted', 'denied', 'prompt', 'unknown'
        
        // Part 3.1: Speech Recognition Properties
        this.interimTranscript = '';
        this.finalTranscript = '';
        this.recognitionActive = false;
        this.recognitionSupported = false;
        
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

        // Part 2.2: Clean up audio stream on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanupAudioStream();
        });

        // Part 2.2: Clean up audio stream when page becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
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
        this.showSpeechPlaceholder(); // Part 3.1: Show initial placeholder
        console.log('Speech Translator initialized successfully');
    }

    // Check browser support for required APIs
    checkBrowserSupport() {
        const support = {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            fetch: 'fetch' in window
        };

        // Check if we're in a secure context for speech recognition
        const secureContext = this.checkSecureContext();

        console.log('Browser support check:', {
            ...support,
            secureContext: secureContext.isSecure,
            protocol: secureContext.protocol,
            hostname: secureContext.hostname
        });

        if (!support.speechRecognition) {
            this.showError('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
            return false;
        }

        if (!support.mediaDevices) {
            this.showError('Microphone access is not supported in your browser.');
            return false;
        }

        // Part 3.1: Initialize speech recognition with security check
        this.recognitionSupported = support.speechRecognition && secureContext.isSecure;
        
        if (support.speechRecognition && !secureContext.isSecure) {
            this.handleInsecureContext(secureContext);
        } else if (this.recognitionSupported) {
            this.initializeSpeechRecognition();
        }

        // Update status based on what's available
        if (this.recognitionSupported) {
            this.updateStatus('All features ready - HTTPS secure connection');
        } else if (!secureContext.isSecure) {
            this.updateStatus('Audio recording ready - Speech recognition requires HTTPS');
        } else {
            this.updateStatus('Audio recording ready');
        }
        
        return true;
    }

    // Check if we're in a secure context for speech recognition
    checkSecureContext() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        const isHTTPS = protocol === 'https:';
        const isFileProtocol = protocol === 'file:';
        
        // Speech recognition works in:
        // 1. HTTPS contexts
        // 2. Localhost (even with HTTP)
        // 3. NOT in file:// protocol
        const isSecure = (isHTTPS || isLocalhost) && !isFileProtocol;
        
        return {
            isSecure,
            protocol,
            hostname,
            isLocalhost,
            isHTTPS,
            isFileProtocol
        };
    }

    // Handle insecure context gracefully
    handleInsecureContext(secureContext) {
        const { protocol, hostname, isFileProtocol } = secureContext;
        
        console.warn('🔒 Speech recognition disabled - insecure context detected');
        console.info('Context details:', {
            protocol,
            hostname,
            isFileProtocol,
            currentURL: window.location.href
        });

        // Show user-friendly message
        if (isFileProtocol) {
            this.showHTTPSRequirementMessage('file');
        } else {
            this.showHTTPSRequirementMessage('http');
        }

        // Set flag to prevent speech recognition initialization
        this.recognitionSupported = false;
    }

    // Show HTTPS requirement message to user
    showHTTPSRequirementMessage(contextType) {
        const messageConfig = {
            file: {
                title: '🔒 Speech Recognition Requires a Server',
                message: 'Speech recognition only works over HTTPS or localhost with a server.',
                suggestions: [
                    'Use VS Code Live Server extension',
                    'Run: python -m http.server 8000',
                    'Run: npx http-server',
                    'Deploy to GitHub Pages (HTTPS)',
                    'Use localhost with a development server'
                ]
            },
            http: {
                title: '🔒 Speech Recognition Requires HTTPS',
                message: 'Speech recognition only works over secure HTTPS connections.',
                suggestions: [
                    'Deploy to GitHub Pages (automatic HTTPS)',
                    'Use a local development server with HTTPS',
                    'Run on localhost with a server',
                    'Use ngrok for HTTPS tunneling'
                ]
            }
        };

        const config = messageConfig[contextType];
        
        // Log detailed information
        console.group('🔒 Speech Recognition Security Requirements');
        console.warn(config.title);
        console.info(config.message);
        console.info('💡 Solutions:');
        config.suggestions.forEach((suggestion, index) => {
            console.info(`   ${index + 1}. ${suggestion}`);
        });
        console.info('ℹ️  Audio recording and visualization will still work normally.');
        console.groupEnd();

        // Update UI to show the limitation
        this.showSecurityNotification(config);
    }

    // Show security notification in the UI
    showSecurityNotification(config) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('security-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'security-notification';
            notification.className = 'security-notification';
            
            // Insert after header
            const header = document.querySelector('.header');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(notification, header.nextSibling);
            } else {
                document.body.appendChild(notification);
            }
        }

        // Set notification content
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <i class="fas fa-lock"></i>
                    <strong>Speech Recognition Disabled</strong>
                    <button class="notification-close" onclick="this.parentElement.parentElement.parentElement.style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-body">
                    <p>${config.message}</p>
                    <div class="notification-suggestions">
                        <strong>Quick Solutions:</strong>
                        <ul>
                            ${config.suggestions.slice(0, 3).map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                    <small class="notification-note">
                        <i class="fas fa-info-circle"></i>
                        Audio recording and visualization continue to work normally.
                    </small>
                </div>
            </div>
        `;

        // Show notification
        notification.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (notification && notification.style.display !== 'none') {
                notification.style.opacity = '0.7';
            }
        }, 10000);
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
            console.log('🎤 Requesting microphone access...');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            this.mediaStream = stream;
            this.permissionStatus = 'granted';
            
            // Debug: Log stream details
            console.log('✅ Microphone access granted');
            console.log('📊 MediaStream details:', {
                id: stream.id,
                active: stream.active,
                tracks: stream.getTracks().length
            });
            
            // Debug: Log audio track details
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                console.log('🔊 Audio track details:', {
                    label: audioTracks[0].label,
                    enabled: audioTracks[0].enabled,
                    muted: audioTracks[0].muted,
                    readyState: audioTracks[0].readyState
                });
            } else {
                console.warn('⚠️ No audio tracks found in stream');
            }
            
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

    // Part 2.2: Enhanced Audio Stream Management
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    // Enhanced start recording with audio analysis
    async startRecording() {
        if (this.isRecording) return;
        
        try {
            // Request microphone access if we don't have it
            if (!this.mediaStream || !this.mediaStream.active) {
                const accessGranted = await this.requestMicrophoneAccess();
                if (!accessGranted) {
                    return;
                }
            }
            
            // CRITICAL: Set recording state FIRST before starting audio analysis
            this.isRecording = true;
            
            // Start audio analysis for visualization
            await this.startAudioAnalysis();
            
            // Part 3.1: Start speech recognition
            if (this.recognitionSupported) {
                this.startSpeechRecognition();
            }
            
            // Update UI state
            this.updateUI('recording');
            if (this.recognitionSupported) {
                this.updateStatus('🎤 Recording with speech recognition... Speak now!');
            } else {
                this.updateStatus('🎤 Recording audio (speech recognition disabled)... Speak now!');
            }
            this.updateStatusDot('recording');
            this.showRecordingFeedback();
            
            // Add pulsing animation to mic button
            this.elements.micButton.classList.add('recording');
            
            console.log('Recording started successfully');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.handleMicrophoneError(error);
        }
    }
    
    // Enhanced stop recording with proper cleanup
    stopRecording() {
        if (!this.isRecording) return;
        
        try {
            // Part 3.1: Stop speech recognition first
            if (this.recognitionSupported) {
                this.stopSpeechRecognition();
            }
            
            // Stop audio analysis
            this.stopAudioAnalysis();
            
            // Update UI state
            this.isRecording = false;
            this.updateUI('processing');
            this.updateStatus('Processing speech...');
            this.updateStatusDot('processing');
            this.hideRecordingFeedback();
            
            // Remove pulsing animation
            this.elements.micButton.classList.remove('recording');
            
            console.log('Recording stopped successfully');
            
            // Part 3.1: Finalize speech results
            if (this.finalTranscript) {
                this.displayFinalSpeechResult();
            }
            
            // Simulate processing time (will be used for translation in Part 4)
            setTimeout(() => {
                this.updateUI('idle');
                this.updateStatus('Ready to translate');
                this.updateStatusDot('idle');
            }, 1500);
            
        } catch (error) {
            console.error('Error stopping recording:', error);
        }
    }
    
    // Part 2.2: Start audio analysis for visualization
    async startAudioAnalysis() {
        if (!this.mediaStream) {
            console.error('❌ Cannot start audio analysis: No media stream available');
            return;
        }
        
        try {
            // Create audio context and analyser
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Connect audio stream to analyser
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);
            
            // Start audio level visualization
            this.visualizeAudioLevel();
            
            console.log('✅ Audio analysis started successfully');
            
        } catch (error) {
            console.error('❌ Error setting up audio analysis:', error);
        }
    }
    
    // Part 2.2: Stop audio analysis
    stopAudioAnalysis() {
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        
        // Reset visualizer
        this.resetAudioVisualizer();
        
        console.log('Audio analysis stopped');
    }
    
    // Part 2.2: Real-time audio level visualization
    visualizeAudioLevel() {
        if (!this.analyser) {
            console.error('❌ Cannot visualize audio: No analyser available');
            return;
        }
        
        if (!this.isRecording) {
            console.error('❌ Cannot visualize audio: Not recording');
            return;
        }
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let frameCount = 0;
        const logInterval = 300; // Log every 300 frames (roughly every 5 seconds at 60fps)
        
        // Store reference to this for closure
        const self = this;
        
        const animate = () => {
            // Check if we should continue
            if (!self.isRecording) {
                self.animationFrame = null;
                return;
            }
            
            // Set animation frame ID to track active state
            self.animationFrame = requestAnimationFrame(animate);
            
            // Get audio data from analyser
            self.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            let sum = 0;
            let maxValue = 0;
            let nonZeroCount = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
                maxValue = Math.max(maxValue, dataArray[i]);
                if (dataArray[i] > 0) nonZeroCount++;
            }
            
            const average = sum / bufferLength;
            const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
            
            // Minimal logging for critical issues only
            frameCount++;
            if (frameCount % logInterval === 0) {
                if (sum === 0) {
                    console.warn('⚠️ No audio data detected - check microphone');
                }
            }
            
            // Update visualizer bars
            self.updateAudioVisualizer(normalizedLevel);
            
            // Update mic button intensity
            self.updateMicButtonIntensity(normalizedLevel);
        };
        
        // Start the animation loop
        animate();
    }
    
    // Part 2.2: Update audio visualizer bars
    updateAudioVisualizer(level) {
        const visualizerBars = document.querySelectorAll('.visualizer-bar');
        if (visualizerBars.length === 0) {
            console.warn('⚠️ No visualizer bars found in DOM');
            return;
        }
        
        const activeBarCount = Math.floor(level * visualizerBars.length);
        
        visualizerBars.forEach((bar, index) => {
            if (index < activeBarCount) {
                bar.classList.add('active');
                bar.style.opacity = Math.max(0.4, level);
                bar.style.transform = `scaleY(${0.3 + level * 0.7})`;
            } else {
                bar.classList.remove('active');
                bar.style.opacity = '0.2';
                bar.style.transform = 'scaleY(0.3)';
            }
        });
    }
    
    // Part 2.2: Update mic button intensity based on audio level
    updateMicButtonIntensity(level) {
        if (this.elements.micButton && this.isRecording) {
            // Adjust button opacity and scale based on audio level
            const intensity = 0.8 + (level * 0.2); // Range from 0.8 to 1.0
            const scale = 1 + (level * 0.05); // Slight scale effect
            
            this.elements.micButton.style.opacity = intensity;
            this.elements.micButton.style.transform = `scale(${scale})`;
        }
    }
    
    // Part 2.2: Reset audio visualizer to default state
    resetAudioVisualizer() {
        const visualizerBars = document.querySelectorAll('.visualizer-bar');
        visualizerBars.forEach(bar => {
            bar.classList.remove('active');
            bar.style.opacity = '0.2';
            bar.style.transform = 'scaleY(0.3)';
        });
        
        // Reset mic button
        if (this.elements.micButton) {
            this.elements.micButton.style.opacity = '';
            this.elements.micButton.style.transform = '';
        }
    }
    
    // Part 2.2: Show recording feedback UI
    showRecordingFeedback() {
        // Show confidence indicator as recording indicator
        if (this.elements.confidence) {
            this.elements.confidence.style.display = 'block';
            this.elements.confidence.textContent = '🔴 REC';
            this.elements.confidence.style.color = '#ff4444';
            this.elements.confidence.style.fontWeight = 'bold';
        }
        
        // Show audio visualizer
        this.showAudioVisualizer();
    }
    
    // Part 2.2: Hide recording feedback UI
    hideRecordingFeedback() {
        // Hide recording indicator
        if (this.elements.confidence) {
            this.elements.confidence.style.display = 'none';
            this.elements.confidence.style.color = '';
            this.elements.confidence.style.fontWeight = '';
        }
        
        // Hide audio visualizer
        this.hideAudioVisualizer();
    }
    
    // Part 2.2: Clean up audio stream and resources
    cleanupAudioStream() {
        console.log('Cleaning up audio stream...');
        
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }
        
        // Stop audio analysis
        this.stopAudioAnalysis();
        
        // Stop all tracks in the media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped audio track:', track.kind);
            });
            this.mediaStream = null;
        }
        
        // Reset UI state
        this.updateUI('idle');
        this.updateStatus('Ready to translate');
        this.updateStatusDot('idle');
        this.hideRecordingFeedback();
        
        console.log('Audio stream cleanup completed');
    }

    // ========================================
    // PART 3.1: SPEECH RECOGNITION METHODS
    // ========================================

    // Part 3.1: Initialize Speech Recognition API
    initializeSpeechRecognition() {
        try {
            // Use vendor-prefixed version for better browser support
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition settings
            this.configureSpeechRecognition();
            
            // Set up event handlers
            this.setupSpeechRecognitionEvents();
            
            console.log('✅ Speech recognition initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize speech recognition:', error);
            this.recognitionSupported = false;
        }
    }

    // Part 3.1: Configure speech recognition settings
    configureSpeechRecognition() {
        if (!this.recognition) return;

        try {
            // Basic configuration
            this.recognition.continuous = true;           // Keep listening continuously
            this.recognition.interimResults = true;      // Get interim results as user speaks
            this.recognition.maxAlternatives = 1;        // Only need the best result
            
            // Validate and set language
            const language = this.validateLanguageCode(this.currentLanguages.source);
            this.recognition.lang = language;

            console.log('✅ Speech recognition configured:', {
                requestedLanguage: this.currentLanguages.source,
                actualLanguage: language,
                continuous: this.recognition.continuous,
                interimResults: this.recognition.interimResults,
                maxAlternatives: this.recognition.maxAlternatives
            });
        } catch (error) {
            console.error('❌ Error configuring speech recognition:', error);
        }
    }

    // Validate language code for speech recognition
    validateLanguageCode(langCode) {
        // Common language codes that work well with speech recognition
        const supportedLanguages = {
            'en-US': 'en-US',
            'es-ES': 'es-ES', 
            'fr-FR': 'fr-FR',
            'de-DE': 'de-DE',
            'it-IT': 'it-IT',
            'pt-PT': 'pt-PT',
            'zh-CN': 'zh-CN',
            'ja-JP': 'ja-JP',
            'ko-KR': 'ko-KR',
            'ar-SA': 'ar-SA'
        };

        const validatedLang = supportedLanguages[langCode];
        if (!validatedLang) {
            console.warn(`⚠️ Language ${langCode} not in supported list, falling back to en-US`);
            return 'en-US';
        }

        return validatedLang;
    }

    // Part 3.1: Set up speech recognition event handlers
    setupSpeechRecognitionEvents() {
        if (!this.recognition) return;

        // Handle successful results
        this.recognition.onresult = (event) => {
            console.log('🎯 Speech recognition result event fired:', {
                resultIndex: event.resultIndex,
                resultsLength: event.results.length,
                timestamp: new Date().toISOString()
            });
            this.handleSpeechResults(event);
        };

        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('🚨 Speech recognition error event:', {
                error: event.error,
                message: event.message,
                timestamp: new Date().toISOString()
            });
            this.handleSpeechError(event);
        };

        // Handle recognition start
        this.recognition.onstart = () => {
            this.recognitionActive = true;
            console.log('🎤 Speech recognition started at', new Date().toISOString());
        };

        // Handle recognition end
        this.recognition.onend = () => {
            this.recognitionActive = false;
            console.log('🛑 Speech recognition ended at', new Date().toISOString());
            
            // Restart if we're still recording
            if (this.isRecording && this.recognitionSupported) {
                console.log('🔄 Restarting speech recognition...');
                setTimeout(() => {
                    this.startSpeechRecognition();
                }, 100);
            }
        };

        // Handle audio start
        this.recognition.onaudiostart = () => {
            console.log('🔊 Speech recognition audio started');
        };

        // Handle audio end
        this.recognition.onaudioend = () => {
            console.log('🔇 Speech recognition audio ended');
        };

        // Handle speech start
        this.recognition.onspeechstart = () => {
            console.log('🗣️ Speech detection started - user is speaking');
            this.updateStatus('🗣️ Speech detected - keep talking...');
        };

        // Handle speech end
        this.recognition.onspeechend = () => {
            console.log('🤐 Speech detection ended - user stopped speaking');
        };

        // Handle no match
        this.recognition.onnomatch = (event) => {
            console.warn('🤷 No speech recognition match found');
        };

        // Handle sound start
        this.recognition.onsoundstart = () => {
            console.log('🔉 Sound detection started');
        };

        // Handle sound end  
        this.recognition.onsoundend = () => {
            console.log('🔇 Sound detection ended');
        };
    }

    // Part 3.1: Start speech recognition
    startSpeechRecognition() {
        if (!this.recognition || !this.recognitionSupported) {
            console.warn('⚠️ Speech recognition not available');
            return;
        }

        if (this.recognitionActive) {
            console.log('ℹ️ Speech recognition already active');
            return;
        }

        try {
            // Update language in case it changed
            this.recognition.lang = this.currentLanguages.source;
            
            // Clear previous transcripts
            this.interimTranscript = '';
            this.finalTranscript = '';
            
            // Start recognition
            this.recognition.start();
            console.log('🚀 Starting speech recognition with language:', this.currentLanguages.source);
            
        } catch (error) {
            console.error('❌ Error starting speech recognition:', error);
            this.handleSpeechError({ error: error.name || 'unknown', message: error.message });
        }
    }

    // Part 3.1: Stop speech recognition
    stopSpeechRecognition() {
        if (!this.recognition) return;

        try {
            this.recognition.stop();
            this.recognitionActive = false;
            console.log('🛑 Speech recognition stopped');
            
        } catch (error) {
            console.error('❌ Error stopping speech recognition:', error);
        }
    }

    // Part 3.1: Handle speech recognition results
    handleSpeechResults(event) {
        let interimTranscript = '';
        let finalTranscript = this.finalTranscript;

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
                finalTranscript += transcript;
                console.log('✅ Final speech result:', transcript);
            } else {
                interimTranscript += transcript;
            }
        }

        // Update stored transcripts
        this.interimTranscript = interimTranscript;
        this.finalTranscript = finalTranscript;

        // Display combined results
        this.displaySpeechResults();
    }

    // Part 3.1: Display speech recognition results
    displaySpeechResults() {
        const combinedText = this.finalTranscript + this.interimTranscript;
        const speechInput = this.elements.speechInput;
        
        if (combinedText.trim()) {
            // Create HTML with final and interim text styled differently
            const finalHtml = this.finalTranscript ? 
                `<span class="final-text">${this.finalTranscript}</span>` : '';
            const interimHtml = this.interimTranscript ? 
                `<span class="interim-text">${this.interimTranscript}</span>` : '';
            
            const fullHtml = finalHtml + interimHtml;
            
            // Update the speech input area
            speechInput.innerHTML = fullHtml;
            speechInput.classList.add('has-content');
            
            // Update status
            if (this.interimTranscript) {
                this.updateStatus('🎤 Listening... Speak clearly');
            }
        } else {
            // Show placeholder if no text
            this.showSpeechPlaceholder();
        }
    }

    // Display final speech recognition result
    displayFinalSpeechResult() {
        if (!this.finalTranscript) return;
        
        console.log('Displaying final speech result:', this.finalTranscript);
        
        const speechInput = this.elements.speechInput;
        
        // Display final result without interim text
        speechInput.innerHTML = `<span class="final-text">${this.finalTranscript}</span>`;
        speechInput.classList.add('has-content');
        
        // Update status
        this.updateStatus(`Transcription complete (${this.finalTranscript.length} characters)`);
    }

    // Show speech input placeholder
    showSpeechPlaceholder() {
        const speechInput = this.elements.speechInput;
        speechInput.classList.remove('has-content');
        
        if (this.recognitionSupported) {
            speechInput.innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-microphone-alt"></i>
                    <p>Your speech will appear here...</p>
                    <small>Supports: English, Spanish, French, German, and more</small>
                </div>
            `;
        } else {
            speechInput.innerHTML = `
                <div class="placeholder-text">
                    <i class="fas fa-microphone-alt"></i>
                    <p>Audio recording ready (speech recognition disabled)...</p>
                    <small>Speech recognition requires HTTPS - audio visualization works normally</small>
                </div>
            `;
        }
    }

    // Part 3.1: Handle speech recognition errors
    handleSpeechError(event) {
        const errorType = event.error || 'unknown';
        const errorMessage = event.message || 'Speech recognition error';
        
        console.error('❌ Speech recognition error:', errorType, errorMessage);

        switch (errorType) {
            case 'no-speech':
                // User didn't speak - this is normal, just continue
                console.log('ℹ️ No speech detected - continuing to listen');
                break;
                
            case 'audio-capture':
                this.updateStatus('❌ Microphone error - check your microphone');
                break;
                
            case 'not-allowed':
                this.updateStatus('❌ Microphone permission denied');
                break;
                
            case 'network':
                // Enhanced network error handling for HTTPS environments
                console.error('🌐 Network error in speech recognition');
                const secureContext = this.checkSecureContext();
                
                // Log detailed context for debugging
                console.log('� Network error debug info:', {
                    isSecure: secureContext.isSecure,
                    protocol: secureContext.protocol,
                    hostname: secureContext.hostname,
                    userAgent: navigator.userAgent,
                    language: this.recognition?.lang,
                    onlineStatus: navigator.onLine
                });
                
                if (!secureContext.isSecure) {
                    this.updateStatus('🔒 Speech recognition requires HTTPS - audio recording still works');
                    this.handleInsecureContext(secureContext);
                } else {
                    // HTTPS environment but still getting network error
                    console.warn('🚨 Network error in secure context - possible causes:');
                    console.warn('   • Google Speech API quota exceeded or unavailable');
                    console.warn('   • Language not supported by browser/service');
                    console.warn('   • Temporary service outage');
                    console.warn('   • Firewall/network restrictions');
                    
                    this.updateStatus('❌ Speech service temporarily unavailable - audio recording still works');
                    
                    // Try to restart recognition after a delay
                    setTimeout(() => {
                        if (this.isRecording && this.recognitionSupported) {
                            console.log('🔄 Attempting to restart speech recognition...');
                            this.startSpeechRecognition();
                        }
                    }, 3000);
                }
                
                // Don't disable recognition immediately in HTTPS - allow retry
                if (!secureContext.isSecure) {
                    this.recognitionSupported = false;
                }
                break;
                
            case 'language-not-supported':
                this.updateStatus('❌ Language not supported for speech recognition');
                break;
                
            case 'service-not-allowed':
                this.updateStatus('❌ Speech recognition service not available');
                break;
                
            default:
                this.updateStatus(`❌ Speech recognition error: ${errorType}`);
                break;
        }
    }

    // Part 2.2: Debug method for manual console testing
    debugAudioStream() {
        console.log('🔍 AUDIO STREAM DEBUG REPORT');
        console.log('================================');
        
        // Check media stream
        if (this.mediaStream) {
            console.log('✅ MediaStream Status:', {
                id: this.mediaStream.id,
                active: this.mediaStream.active,
                tracks: this.mediaStream.getTracks().length
            });
            
            const audioTracks = this.mediaStream.getAudioTracks();
            audioTracks.forEach((track, index) => {
                console.log(`🎵 Audio Track ${index}:`, {
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState,
                    kind: track.kind
                });
            });
        } else {
            console.log('❌ MediaStream: Not available');
        }
        
        // Check audio context
        if (this.audioContext) {
            console.log('✅ AudioContext Status:', {
                state: this.audioContext.state,
                sampleRate: this.audioContext.sampleRate,
                currentTime: this.audioContext.currentTime
            });
        } else {
            console.log('❌ AudioContext: Not available');
        }
        
        // Check analyser
        if (this.analyser) {
            console.log('✅ AnalyserNode Status:', {
                fftSize: this.analyser.fftSize,
                frequencyBinCount: this.analyser.frequencyBinCount,
                smoothingTimeConstant: this.analyser.smoothingTimeConstant
            });
            
            // Test audio data
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);
            
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const max = Math.max(...dataArray);
            
            console.log('📊 Current Audio Data:', {
                bufferLength,
                sum,
                average: sum / bufferLength,
                max,
                firstTenValues: Array.from(dataArray.slice(0, 10))
            });
            
            if (sum === 0) {
                console.warn('⚠️ ISSUE: No audio data detected - all values are zero');
                console.log('💡 Possible causes:');
                console.log('   - Microphone is muted or not working');
                console.log('   - MediaStream not properly connected to AudioContext');
                console.log('   - Audio track is disabled or muted');
            }
        } else {
            console.log('❌ AnalyserNode: Not available');
        }
        
        // Check DOM elements
        const visualizerBars = document.querySelectorAll('.visualizer-bar');
        console.log('🎛️ Visualizer Bars:', {
            found: visualizerBars.length,
            expected: 7
        });
        
        // Check recording state
        console.log('🎤 Recording State:', {
            isRecording: this.isRecording,
            animationFrameActive: this.animationFrame !== null,
            animationFrameId: this.animationFrame
        });
        
        console.log('================================');
        
        return {
            hasStream: !!this.mediaStream,
            hasAudioContext: !!this.audioContext,
            hasAnalyser: !!this.analyser,
            isRecording: this.isRecording,
            visualizerBars: visualizerBars.length
        };
    }

    // Debug speech recognition status
    debugSpeechRecognition() {
        console.log('🔍 SPEECH RECOGNITION DEBUG REPORT');
        console.log('=====================================');
        
        console.log('🌐 Environment:', {
            url: window.location.href,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            isHTTPS: window.location.protocol === 'https:',
            userAgent: navigator.userAgent.substring(0, 100),
            online: navigator.onLine
        });
        
        console.log('🎤 Speech Recognition Support:', {
            SpeechRecognition: 'SpeechRecognition' in window,
            webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
            recognitionSupported: this.recognitionSupported,
            recognitionActive: this.recognitionActive,
            recognitionObject: !!this.recognition
        });
        
        if (this.recognition) {
            console.log('⚙️ Recognition Configuration:', {
                lang: this.recognition.lang,
                continuous: this.recognition.continuous,
                interimResults: this.recognition.interimResults,
                maxAlternatives: this.recognition.maxAlternatives
            });
        }
        
        console.log('🎯 Current State:', {
            isRecording: this.isRecording,
            currentLanguages: this.currentLanguages,
            finalTranscript: this.finalTranscript,
            interimTranscript: this.interimTranscript
        });
        
        console.log('=====================================');
        
        return {
            supported: this.recognitionSupported,
            active: this.recognitionActive,
            configured: !!this.recognition,
            isHTTPS: window.location.protocol === 'https:'
        };
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
        // Part 3.1: Clear speech recognition transcripts
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        // Reset input area
        this.showSpeechPlaceholder();
        
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
    
    // Make debug methods easily accessible
    window.debugAudio = () => window.speechTranslator.debugAudioStream();
    window.debugSpeech = () => window.speechTranslator.debugSpeechRecognition();
    
    // Add keyboard shortcut hints to the UI
    const statusElement = document.getElementById('status-text');
    statusElement.title = 'Keyboard shortcuts: Ctrl+Space (toggle recording), Ctrl+S (swap languages), Ctrl+T (toggle theme)';
    
    console.log('💡 Debug commands available:');
    console.log('   - debugAudio() - Check audio stream status');
    console.log('   - debugSpeech() - Check speech recognition status');
    console.log('   - speechTranslator - Access main translator object');
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechTranslator;
}
