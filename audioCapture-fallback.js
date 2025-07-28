const EventEmitter = require('events');

/**
 * Simplified Audio Capture Module
 * Fallback version for when native audio dependencies aren't available
 */
class AudioCapture extends EventEmitter {
  constructor() {
    super();
    this.isRecording = false;
    this.audioMode = 'microphone';
    this.sampleRate = 16000;
    this.channels = 1;
    this.threshold = 500;
    this.audioDevices = { microphones: [], systemAudio: [] };
  }

  /**
   * Get available audio devices
   */
  async getAudioDevices() {
    console.log('Getting audio devices (simplified version)...');
    
    // Return mock devices for now
    return {
      microphones: [
        { id: 'default', name: 'Default Microphone' },
        { id: 'browser', name: 'Browser Audio Input' }
      ],
      systemAudio: [
        { id: 'browser-system', name: 'Browser System Audio (Limited)' }
      ]
    };
  }

  /**
   * Start recording from microphone
   */
  async startMicrophoneRecording(deviceId = null) {
    console.log('Starting microphone recording (browser-based)...');
    
    try {
      // Use browser MediaDevices API instead of native recording
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: this.channels,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.isRecording = true;
      this.audioMode = 'microphone';
      
      // Set up audio processing
      this.setupBrowserAudioProcessing(stream);
      
      this.emit('recording-started', { mode: 'microphone', deviceId });
      
    } catch (error) {
      console.error('Error starting microphone recording:', error);
      this.emit('error', { type: 'microphone_access', error: error.message });
    }
  }

  /**
   * Set up browser-based audio processing
   */
  setupBrowserAudioProcessing(stream) {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    // Store references
    this.audioContext = audioContext;
    this.mediaStream = stream;
    this.processor = processor;
    
    processor.onaudioprocess = (event) => {
      if (!this.isRecording) return;
      
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Convert to 16-bit PCM
      const pcmData = this.convertToPCM16(inputData);
      
      // Emit audio data
      this.emit('audio-data', pcmData);
    };
    
    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  /**
   * Convert audio data to 16-bit PCM
   */
  convertToPCM16(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return Buffer.from(pcm16.buffer);
  }

  /**
   * Start system audio recording (limited browser implementation)
   */
  async startSystemAudioRecording(deviceId = null) {
    console.log('System audio recording not available in browser mode');
    this.emit('error', { 
      type: 'system_audio_unavailable', 
      error: 'System audio capture requires native desktop app with proper audio drivers' 
    });
  }

  /**
   * Stop recording
   */
  async stopRecording() {
    console.log('Stopping audio recording...');
    
    this.isRecording = false;
    
    // Clean up browser audio resources
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    this.emit('recording-stopped');
  }

  /**
   * Get current audio level (mock implementation)
   */
  getCurrentLevel() {
    return this.isRecording ? Math.random() * 100 : 0;
  }
}

module.exports = AudioCapture;
