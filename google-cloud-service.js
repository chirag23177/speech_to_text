// Google Cloud Speech-to-Text and Translate API Implementation
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs');
const path = require('path');

class GoogleCloudSpeechService {
  constructor() {
    try {
      // Set up credentials
      const credentialsPath = path.join(__dirname, 'credentials.json');
      
      // Check if credentials file exists
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found at: ${credentialsPath}`);
      }
      
      // Set environment variable for Google Cloud authentication
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      
      // Initialize clients
      this.speechClient = new speech.SpeechClient();
      this.translateClient = new Translate();
      
      // Audio configuration
      this.audioConfig = {
        encoding: 'WEBM_OPUS', // For browser audio
        sampleRateHertz: 48000, // WebM typically uses 48kHz
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long', // Best for longer audio
      };
      
      // Streaming configuration (using FLAC which supports streaming better)
      this.streamConfig = {
        config: {
          encoding: 'FLAC', // FLAC is better supported for streaming than WEBM_OPUS
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        interimResults: true, // Get partial results while speaking
      };
      
      // Track active streams
      this.activeStreams = new Map();
      
      console.log('Google Cloud Speech and Translate services initialized successfully');
      console.log('Using credentials from:', credentialsPath);
      
    } catch (error) {
      console.error('Failed to initialize Google Cloud services:', error);
      throw error;
    }
  }
  
  // Configure speech recognition settings
  configureSpeech(languageCode = 'en-US', sampleRate = 48000) {
    this.audioConfig.languageCode = languageCode;
    this.audioConfig.sampleRateHertz = sampleRate;
    this.streamConfig.config.languageCode = languageCode;
    this.streamConfig.config.sampleRateHertz = sampleRate;
    console.log('Speech config updated:', { languageCode, sampleRate });
  }
  
  // Start streaming speech recognition
  startStreamingRecognition(sessionId, languageCode = 'en-US', onTranscript, onError) {
    try {
      console.log(`Starting streaming recognition for session: ${sessionId}`);
      
      // Update config for this session
      const streamConfig = {
        ...this.streamConfig,
        config: {
          ...this.streamConfig.config,
          languageCode: languageCode
        }
      };
      
      console.log('Streaming config:', JSON.stringify(streamConfig, null, 2));
      
      // Create streaming recognition request
      const recognizeStream = this.speechClient
        .streamingRecognize(streamConfig)
        .on('error', (error) => {
          console.error('Streaming recognition error:', error);
          this.stopStreamingRecognition(sessionId);
          if (onError) onError(error);
        })
        .on('data', (data) => {
          console.log('Streaming data received:', data);
          
          if (data.results && data.results[0] && data.results[0].alternatives[0]) {
            const result = data.results[0];
            const transcript = result.alternatives[0].transcript;
            const confidence = result.alternatives[0].confidence || 0;
            const isFinal = result.isFinal;
            
            console.log(`Streaming result [${sessionId}]:`, {
              transcript,
              confidence,
              isFinal
            });
            
            if (onTranscript) {
              onTranscript({
                transcript,
                confidence,
                isFinal,
                languageCode
              });
            }
          }
        });
      
      // Store the stream for this session
      this.activeStreams.set(sessionId, {
        stream: recognizeStream,
        configSent: false
      });
      
      console.log(`Streaming recognition started for session: ${sessionId}`);
      return true;
      
    } catch (error) {
      console.error('Error starting streaming recognition:', error);
      if (onError) onError(error);
      return false;
    }
  }
  
  // Send audio chunk to streaming recognition
  sendAudioChunk(sessionId, audioBuffer) {
    try {
      const streamData = this.activeStreams.get(sessionId);
      if (!streamData) {
        console.warn(`No active stream found for session: ${sessionId}`);
        return false;
      }
      
      const { stream } = streamData;
      
      // Ensure we have a proper Buffer
      if (!Buffer.isBuffer(audioBuffer)) {
        audioBuffer = Buffer.from(audioBuffer);
      }
      
      // Send ONLY audio data (not config) after the stream is created
      // The config was already sent when the stream was created
      stream.write({
        audioContent: audioBuffer
      });
      
      console.log(`Sent audio chunk for session ${sessionId}, size: ${audioBuffer.length} bytes`);
      return true;
      
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      return false;
    }
  }
  
  // Stop streaming recognition
  stopStreamingRecognition(sessionId) {
    try {
      const streamData = this.activeStreams.get(sessionId);
      if (streamData) {
        console.log(`Stopping streaming recognition for session: ${sessionId}`);
        const { stream } = streamData;
        stream.end();
        this.activeStreams.delete(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error stopping streaming recognition:', error);
      return false;
    }
  }
  
  // Stop all active streams
  stopAllStreams() {
    console.log('Stopping all active streaming sessions...');
    for (const [sessionId, streamData] of this.activeStreams) {
      try {
        const { stream } = streamData;
        stream.end();
        console.log(`Stopped stream for session: ${sessionId}`);
      } catch (error) {
        console.error(`Error stopping stream ${sessionId}:`, error);
      }
    }
    this.activeStreams.clear();
  }
  
  // Transcribe audio buffer using Google Cloud Speech-to-Text
  async transcribeAudio(audioBuffer, languageCode = 'en-US') {
    try {
      // Ensure we have a proper Buffer
      if (!Buffer.isBuffer(audioBuffer)) {
        console.log('Converting audio data to Buffer...');
        audioBuffer = Buffer.from(audioBuffer);
      }
      
      console.log(`Transcribing audio: ${audioBuffer.length} bytes, language: ${languageCode}`);
      
      const request = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: {
          ...this.audioConfig,
          languageCode: languageCode,
          // Update encoding for WebM/Opus audio
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000, // WebM typically uses 48kHz
        },
      };
      
      console.log('Sending audio to Google Cloud Speech-to-Text...');
      const [response] = await this.speechClient.recognize(request);
      
      if (response.results && response.results.length > 0) {
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join(' ');
        
        const confidence = response.results[0].alternatives[0].confidence || 0;
        
        console.log('Transcription received:', { transcription, confidence });
        
        return {
          transcript: transcription,
          confidence: confidence,
          languageCode: languageCode,
          wordTimeOffsets: response.results[0].alternatives[0].words || []
        };
      } else {
        console.log('No transcription results received');
        return {
          transcript: '',
          confidence: 0,
          languageCode: languageCode,
          wordTimeOffsets: []
        };
      }
    } catch (error) {
      console.error('Speech-to-Text error:', error);
      throw new Error(`Speech transcription failed: ${error.message}`);
    }
  }
  
  // Translate text using Google Cloud Translate
  async translateText(text, targetLanguage = 'es', sourceLanguage = 'en') {
    try {
      if (!text || text.trim() === '') {
        return {
          originalText: text,
          translatedText: '',
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          confidence: 0
        };
      }
      
      console.log('Translating text:', { text, sourceLanguage, targetLanguage });
      
      const [translation] = await this.translateClient.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
      });
      
      // Detect source language if not specified
      const [detection] = await this.translateClient.detect(text);
      const detectedLanguage = detection.language;
      
      console.log('Translation received:', { 
        original: text, 
        translated: translation,
        detectedLanguage 
      });
      
      return {
        originalText: text,
        translatedText: translation,
        sourceLanguage: detectedLanguage,
        targetLanguage: targetLanguage,
        confidence: detection.confidence || 0.9
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
  
  // Get supported languages for speech recognition
  async getSpeechLanguages() {
    try {
      // Common languages supported by Google Cloud Speech-to-Text
      return [
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'es-ES', name: 'Spanish (Spain)' },
        { code: 'es-MX', name: 'Spanish (Mexico)' },
        { code: 'fr-FR', name: 'French (France)' },
        { code: 'de-DE', name: 'German (Germany)' },
        { code: 'it-IT', name: 'Italian (Italy)' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        { code: 'ru-RU', name: 'Russian (Russia)' },
        { code: 'ja-JP', name: 'Japanese (Japan)' },
        { code: 'ko-KR', name: 'Korean (South Korea)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'hi-IN', name: 'Hindi (India)' },
        { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' }
      ];
    } catch (error) {
      console.error('Error getting speech languages:', error);
      return [];
    }
  }
  
  // Get supported languages for translation
  async getTranslationLanguages() {
    try {
      const [languages] = await this.translateClient.getLanguages();
      return languages.map(lang => ({
        code: lang.code,
        name: lang.name
      }));
    } catch (error) {
      console.error('Error getting translation languages:', error);
      // Return common languages as fallback
      return [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ar', name: 'Arabic' }
      ];
    }
  }
  
  // Test API connection
  async testConnection() {
    try {
      // Test translation with a simple phrase
      const testResult = await this.translateText('Hello world', 'es', 'en');
      console.log('API connection test successful:', testResult);
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
  
  // Convert language code from speech format to translation format
  speechToTranslationLangCode(speechCode) {
    // Convert speech language codes (e.g., 'en-US') to translation codes (e.g., 'en')
    return speechCode.split('-')[0];
  }
}

module.exports = GoogleCloudSpeechService;
