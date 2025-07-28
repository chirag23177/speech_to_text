const recorder = require('node-record-lpcm16');
const { spawn, exec } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

/**
 * Audio Capture Module
 * Handles both microphone and system audio capture for real-time processing
 */
class AudioCapture extends EventEmitter {
  constructor() {
    super();
    this.isRecording = false;
    this.currentRecorder = null;
    this.audioMode = 'microphone'; // 'microphone' or 'system'
    this.sampleRate = 16000;
    this.channels = 1;
    this.threshold = 500; // Audio level threshold
    this.silenceTimeout = null;
    this.audioBuffer = [];
    this.maxBufferSize = 1600; // 100ms at 16kHz
  }

  /**
   * Get available audio devices
   */
  async getAudioDevices() {
    return new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        // Windows: Use ffmpeg to list audio devices
        exec('ffmpeg -list_devices true -f dshow -i dummy 2>&1', (error, stdout, stderr) => {
          const output = stderr || stdout;
          const devices = this.parseWindowsDevices(output);
          resolve(devices);
        });
      } else if (process.platform === 'darwin') {
        // macOS: Use ffmpeg to list audio devices
        exec('ffmpeg -f avfoundation -list_devices true -i "" 2>&1', (error, stdout, stderr) => {
          const output = stderr || stdout;
          const devices = this.parseMacDevices(output);
          resolve(devices);
        });
      } else {
        // Linux: Use ALSA/PulseAudio
        exec('arecord -l 2>/dev/null || pactl list short sources 2>/dev/null', (error, stdout) => {
          const devices = this.parseLinuxDevices(stdout || '');
          resolve(devices);
        });
      }
    });
  }

  /**
   * Parse Windows audio devices from ffmpeg output
   */
  parseWindowsDevices(output) {
    const devices = { microphones: [], systemAudio: [] };
    const lines = output.split('\n');
    let currentType = null;

    lines.forEach(line => {
      if (line.includes('DirectShow video devices')) {
        currentType = 'video';
      } else if (line.includes('DirectShow audio devices')) {
        currentType = 'audio';
      } else if (currentType === 'audio' && line.includes('"')) {
        const match = line.match(/"([^"]+)"/);
        if (match) {
          const deviceName = match[1];
          if (deviceName.toLowerCase().includes('stereo mix') || 
              deviceName.toLowerCase().includes('what u hear') ||
              deviceName.toLowerCase().includes('wave out mix')) {
            devices.systemAudio.push({
              name: deviceName,
              id: deviceName,
              type: 'system'
            });
          } else {
            devices.microphones.push({
              name: deviceName,
              id: deviceName,
              type: 'microphone'
            });
          }
        }
      }
    });

    return devices;
  }

  /**
   * Parse macOS audio devices from ffmpeg output
   */
  parseMacDevices(output) {
    const devices = { microphones: [], systemAudio: [] };
    const lines = output.split('\n');

    lines.forEach(line => {
      if (line.includes('[AVFoundation input device')) {
        const match = line.match(/\[(\d+)\] (.+)/);
        if (match) {
          const deviceId = match[1];
          const deviceName = match[2];
          
          if (deviceName.toLowerCase().includes('soundflower') ||
              deviceName.toLowerCase().includes('blackhole') ||
              deviceName.toLowerCase().includes('loopback')) {
            devices.systemAudio.push({
              name: deviceName,
              id: deviceId,
              type: 'system'
            });
          } else {
            devices.microphones.push({
              name: deviceName,
              id: deviceId,
              type: 'microphone'
            });
          }
        }
      }
    });

    return devices;
  }

  /**
   * Parse Linux audio devices
   */
  parseLinuxDevices(output) {
    const devices = { microphones: [], systemAudio: [] };
    const lines = output.split('\n');

    lines.forEach(line => {
      // PulseAudio sources
      if (line.includes('alsa_output') && line.includes('monitor')) {
        const parts = line.split('\t');
        if (parts.length > 1) {
          devices.systemAudio.push({
            name: 'System Audio Monitor',
            id: parts[0],
            type: 'system'
          });
        }
      } else if (line.includes('alsa_input')) {
        const parts = line.split('\t');
        if (parts.length > 1) {
          devices.microphones.push({
            name: parts[1] || 'Microphone',
            id: parts[0],
            type: 'microphone'
          });
        }
      }
    });

    return devices;
  }

  /**
   * Start recording from microphone
   */
  startMicrophoneRecording(deviceId = null) {
    console.log('Starting microphone recording...');
    
    const options = {
      sampleRate: this.sampleRate,
      channels: this.channels,
      threshold: this.threshold,
      thresholdStart: null,
      thresholdEnd: null,
      silence: '2.0',
      device: deviceId || null
    };

    this.currentRecorder = recorder.record(options);
    
    this.currentRecorder.stream()
      .on('data', (chunk) => {
        this.processAudioChunk(chunk);
      })
      .on('error', (error) => {
        console.error('Microphone recording error:', error);
        this.emit('error', error);
      });

    this.isRecording = true;
    this.audioMode = 'microphone';
    this.emit('started', { mode: 'microphone' });
  }

  /**
   * Start recording system audio using ffmpeg
   */
  startSystemAudioRecording(deviceId = null) {
    console.log('Starting system audio recording...');
    
    let ffmpegArgs = [];
    
    if (process.platform === 'win32') {
      // Windows: Use DirectShow or WASAPI
      const device = deviceId || 'audio="Stereo Mix (Realtek High Definition Audio)"';
      ffmpegArgs = [
        '-f', 'dshow',
        '-i', device,
        '-acodec', 'pcm_s16le',
        '-ar', this.sampleRate.toString(),
        '-ac', this.channels.toString(),
        '-f', 'wav',
        '-'
      ];
    } else if (process.platform === 'darwin') {
      // macOS: Use AVFoundation or system loopback
      const device = deviceId || ':0'; // Default audio device
      ffmpegArgs = [
        '-f', 'avfoundation',
        '-i', device,
        '-acodec', 'pcm_s16le',
        '-ar', this.sampleRate.toString(),
        '-ac', this.channels.toString(),
        '-f', 'wav',
        '-'
      ];
    } else {
      // Linux: Use PulseAudio monitor
      const device = deviceId || 'alsa_output.pci-0000_00_1b.0.analog-stereo.monitor';
      ffmpegArgs = [
        '-f', 'pulse',
        '-i', device,
        '-acodec', 'pcm_s16le',
        '-ar', this.sampleRate.toString(),
        '-ac', this.channels.toString(),
        '-f', 'wav',
        '-'
      ];
    }

    this.currentRecorder = spawn('ffmpeg', ffmpegArgs);
    
    this.currentRecorder.stdout.on('data', (chunk) => {
      // Skip WAV header (first 44 bytes)
      if (this.audioBuffer.length === 0 && chunk.length > 44) {
        chunk = chunk.slice(44);
      }
      this.processAudioChunk(chunk);
    });

    this.currentRecorder.stderr.on('data', (data) => {
      // FFmpeg outputs info to stderr, only log actual errors
      const message = data.toString();
      if (message.includes('Error') || message.includes('error')) {
        console.error('FFmpeg error:', message);
      }
    });

    this.currentRecorder.on('error', (error) => {
      console.error('System audio recording error:', error);
      this.emit('error', error);
    });

    this.currentRecorder.on('close', (code) => {
      console.log('FFmpeg process closed with code:', code);
      if (code !== 0 && this.isRecording) {
        this.emit('error', new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    this.isRecording = true;
    this.audioMode = 'system';
    this.emit('started', { mode: 'system' });
  }

  /**
   * Process audio chunk and emit for transcription
   */
  processAudioChunk(chunk) {
    if (!this.isRecording) return;

    // Add chunk to buffer
    this.audioBuffer.push(chunk);
    
    // Calculate total buffer size
    const totalSize = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    
    // If buffer is large enough, emit for processing
    if (totalSize >= this.maxBufferSize) {
      const audioData = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];
      
      // Calculate audio level for visualization
      const audioLevel = this.calculateAudioLevel(audioData);
      
      this.emit('audioData', {
        data: audioData,
        sampleRate: this.sampleRate,
        channels: this.channels,
        level: audioLevel
      });
    }

    // Reset silence timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    this.silenceTimeout = setTimeout(() => {
      this.emit('silence');
    }, 2000); // 2 seconds of silence
  }

  /**
   * Calculate audio level for visualization
   */
  calculateAudioLevel(buffer) {
    let sum = 0;
    let count = 0;
    
    // Treat buffer as 16-bit PCM
    for (let i = 0; i < buffer.length; i += 2) {
      if (i + 1 < buffer.length) {
        const sample = buffer.readInt16LE(i);
        sum += Math.abs(sample);
        count++;
      }
    }
    
    const average = count > 0 ? sum / count : 0;
    return Math.min(100, (average / 32768) * 100); // Normalize to 0-100
  }

  /**
   * Stop recording
   */
  stopRecording() {
    console.log('Stopping audio recording...');
    
    this.isRecording = false;
    
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    if (this.currentRecorder) {
      if (this.audioMode === 'microphone') {
        this.currentRecorder.stop();
      } else {
        this.currentRecorder.kill('SIGTERM');
      }
      this.currentRecorder = null;
    }
    
    // Emit any remaining audio data
    if (this.audioBuffer.length > 0) {
      const audioData = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];
      
      const audioLevel = this.calculateAudioLevel(audioData);
      
      this.emit('audioData', {
        data: audioData,
        sampleRate: this.sampleRate,
        channels: this.channels,
        level: audioLevel
      });
    }
    
    this.emit('stopped');
  }

  /**
   * Switch audio mode
   */
  switchMode(mode, deviceId = null) {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    setTimeout(() => {
      if (mode === 'microphone') {
        this.startMicrophoneRecording(deviceId);
      } else if (mode === 'system') {
        this.startSystemAudioRecording(deviceId);
      }
    }, 100);
  }

  /**
   * Get current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      mode: this.audioMode,
      sampleRate: this.sampleRate,
      channels: this.channels
    };
  }

  /**
   * Check if system audio capture is available
   */
  async isSystemAudioAvailable() {
    try {
      const devices = await this.getAudioDevices();
      return devices.systemAudio.length > 0;
    } catch (error) {
      console.error('Error checking system audio availability:', error);
      return false;
    }
  }
}

module.exports = AudioCapture;
