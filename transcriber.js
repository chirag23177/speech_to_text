const speech = require('@google-cloud/speech');
const EventEmitter = require('events');
const path = require('path');

/**
 * Transcriber Module
 * Handles Google Cloud Speech-to-Text API integration
 */
class Transcriber extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.recognizeStream = null;
    this.isTranscribing = false;
    this.currentLanguage = 'en-US';
    this.restartCounter = 0;
    this.maxRestartAttempts = 5;
    this.streamingLimit = 290000; // 290 seconds (Google's limit is 305s)
    this.streamingTimeout = null;
    this.lastTranscriptTime = Date.now();
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    this.initializeClient();
  }

  /**
   * Initialize Google Speech client
   */
  initializeClient() {
    try {
      // Try to initialize with credentials.json
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      
      this.client = new speech.SpeechClient({
        keyFilename: credentialsPath,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      
      console.log('Speech client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Speech client:', error);
      this.emit('error', {
        type: 'initialization',
        message: 'Failed to initialize Google Speech client. Please check your credentials.json file.',
        error
      });
    }
  }

  /**
   * Start streaming recognition
   */
  startTranscription(language = 'en-US') {
    if (this.isTranscribing) {
      console.log('Transcription already in progress');
      return;
    }

    this.currentLanguage = language;
    this.isTranscribing = true;
    this.restartCounter = 0;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    console.log(`Starting transcription in ${language}`);
    this.createRecognizeStream();
  }

  /**
   * Create streaming recognition stream
   */
  createRecognizeStream() {
    if (!this.client) {
      this.emit('error', {
        type: 'client',
        message: 'Speech client not initialized'
      });
      return;
    }

    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: this.currentLanguage,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        enableWordConfidence: true,
        maxAlternatives: 1,
        profanityFilter: false,
        useEnhanced: true,
        model: 'latest_long', // Best for longer audio
        speechContexts: [
          {
            phrases: [
              'hello', 'thank you', 'please', 'meeting', 'presentation',
              'question', 'answer', 'discussion', 'project', 'team'
            ],
            boost: 10.0
          }
        ]
      },
      interimResults: true,
      enableVoiceActivityEvents: true,
      singleUtterance: false
    };

    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on('error', (error) => {
        console.error('Streaming recognition error:', error);
        
        if (error.code === 11 || error.code === 'DEADLINE_EXCEEDED') {
          console.log('Stream timeout reached, restarting...');
          this.restartStream();
        } else {
          this.emit('error', {
            type: 'streaming',
            message: 'Streaming recognition error',
            error
          });
        }
      })
      .on('data', (response) => {
        this.handleStreamingResponse(response);
      })
      .on('end', () => {
        console.log('Recognition stream ended');
        if (this.isTranscribing) {
          this.restartStream();
        }
      });

    // Set up automatic stream restart before timeout
    this.streamingTimeout = setTimeout(() => {
      console.log('Proactively restarting stream before timeout');
      this.restartStream();
    }, this.streamingLimit);

    this.emit('started', { language: this.currentLanguage });
  }

  /**
   * Handle streaming recognition responses
   */
  handleStreamingResponse(response) {
    if (!response.results || response.results.length === 0) {
      return;
    }

    const result = response.results[0];
    
    if (!result.alternatives || result.alternatives.length === 0) {
      return;
    }

    const transcript = result.alternatives[0].transcript;
    const confidence = result.alternatives[0].confidence || 0;
    
    this.lastTranscriptTime = Date.now();

    if (result.isFinal) {
      console.log('Final transcript:', transcript);
      this.finalTranscript += transcript + ' ';
      this.interimTranscript = '';
      
      this.emit('transcript', {
        text: transcript,
        isFinal: true,
        confidence,
        fullTranscript: this.finalTranscript.trim(),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('Interim transcript:', transcript);
      this.interimTranscript = transcript;
      
      this.emit('transcript', {
        text: transcript,
        isFinal: false,
        confidence,
        fullTranscript: (this.finalTranscript + transcript).trim(),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Restart the recognition stream
   */
  restartStream() {
    if (this.restartCounter >= this.maxRestartAttempts) {
      console.error('Max restart attempts reached');
      this.stopTranscription();
      this.emit('error', {
        type: 'max_restarts',
        message: 'Maximum restart attempts reached. Please try again.'
      });
      return;
    }

    this.restartCounter++;
    console.log(`Restarting stream (attempt ${this.restartCounter}/${this.maxRestartAttempts})`);

    // Clean up current stream
    if (this.recognizeStream) {
      this.recognizeStream.removeAllListeners();
      this.recognizeStream.destroy();
      this.recognizeStream = null;
    }

    if (this.streamingTimeout) {
      clearTimeout(this.streamingTimeout);
      this.streamingTimeout = null;
    }

    // Small delay before restarting
    setTimeout(() => {
      if (this.isTranscribing) {
        this.createRecognizeStream();
      }
    }, 500);
  }

  /**
   * Process audio data
   */
  processAudio(audioBuffer) {
    if (!this.recognizeStream || !this.isTranscribing) {
      return;
    }

    try {
      if (this.recognizeStream.writable) {
        this.recognizeStream.write(audioBuffer);
      }
    } catch (error) {
      console.error('Error writing to recognition stream:', error);
      this.restartStream();
    }
  }

  /**
   * Stop transcription
   */
  stopTranscription() {
    console.log('Stopping transcription...');
    
    this.isTranscribing = false;
    
    if (this.streamingTimeout) {
      clearTimeout(this.streamingTimeout);
      this.streamingTimeout = null;
    }
    
    if (this.recognizeStream) {
      this.recognizeStream.removeAllListeners();
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
    
    this.emit('stopped', {
      finalTranscript: this.finalTranscript.trim()
    });
  }

  /**
   * Change transcription language
   */
  changeLanguage(languageCode) {
    console.log(`Changing language from ${this.currentLanguage} to ${languageCode}`);
    
    const wasTranscribing = this.isTranscribing;
    
    if (wasTranscribing) {
      this.stopTranscription();
    }
    
    this.currentLanguage = languageCode;
    
    if (wasTranscribing) {
      setTimeout(() => {
        this.startTranscription(languageCode);
      }, 500);
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return {
      'af-ZA': 'Afrikaans (South Africa)',
      'am-ET': 'Amharic (Ethiopia)',
      'hy-AM': 'Armenian (Armenia)',
      'az-AZ': 'Azerbaijani (Azerbaijan)',
      'id-ID': 'Indonesian (Indonesia)',
      'ms-MY': 'Malay (Malaysia)',
      'bn-BD': 'Bengali (Bangladesh)',
      'bn-IN': 'Bengali (India)',
      'ca-ES': 'Catalan (Spain)',
      'cs-CZ': 'Czech (Czech Republic)',
      'da-DK': 'Danish (Denmark)',
      'de-DE': 'German (Germany)',
      'en-AU': 'English (Australia)',
      'en-CA': 'English (Canada)',
      'en-GH': 'English (Ghana)',
      'en-GB': 'English (United Kingdom)',
      'en-IN': 'English (India)',
      'en-IE': 'English (Ireland)',
      'en-KE': 'English (Kenya)',
      'en-NZ': 'English (New Zealand)',
      'en-NG': 'English (Nigeria)',
      'en-PH': 'English (Philippines)',
      'en-SG': 'English (Singapore)',
      'en-ZA': 'English (South Africa)',
      'en-TZ': 'English (Tanzania)',
      'en-US': 'English (United States)',
      'es-AR': 'Spanish (Argentina)',
      'es-BO': 'Spanish (Bolivia)',
      'es-CL': 'Spanish (Chile)',
      'es-CO': 'Spanish (Colombia)',
      'es-CR': 'Spanish (Costa Rica)',
      'es-EC': 'Spanish (Ecuador)',
      'es-SV': 'Spanish (El Salvador)',
      'es-ES': 'Spanish (Spain)',
      'es-US': 'Spanish (United States)',
      'es-GT': 'Spanish (Guatemala)',
      'es-HN': 'Spanish (Honduras)',
      'es-MX': 'Spanish (Mexico)',
      'es-NI': 'Spanish (Nicaragua)',
      'es-PA': 'Spanish (Panama)',
      'es-PY': 'Spanish (Paraguay)',
      'es-PE': 'Spanish (Peru)',
      'es-PR': 'Spanish (Puerto Rico)',
      'es-DO': 'Spanish (Dominican Republic)',
      'es-UY': 'Spanish (Uruguay)',
      'es-VE': 'Spanish (Venezuela)',
      'eu-ES': 'Basque (Spain)',
      'fil-PH': 'Filipino (Philippines)',
      'fr-CA': 'French (Canada)',
      'fr-FR': 'French (France)',
      'gl-ES': 'Galician (Spain)',
      'ka-GE': 'Georgian (Georgia)',
      'gu-IN': 'Gujarati (India)',
      'hr-HR': 'Croatian (Croatia)',
      'zu-ZA': 'Zulu (South Africa)',
      'is-IS': 'Icelandic (Iceland)',
      'it-IT': 'Italian (Italy)',
      'jv-ID': 'Javanese (Indonesia)',
      'kn-IN': 'Kannada (India)',
      'km-KH': 'Khmer (Cambodia)',
      'lo-LA': 'Lao (Laos)',
      'lv-LV': 'Latvian (Latvia)',
      'lt-LT': 'Lithuanian (Lithuania)',
      'hu-HU': 'Hungarian (Hungary)',
      'ml-IN': 'Malayalam (India)',
      'mr-IN': 'Marathi (India)',
      'nl-NL': 'Dutch (Netherlands)',
      'ne-NP': 'Nepali (Nepal)',
      'nb-NO': 'Norwegian Bokmål (Norway)',
      'pl-PL': 'Polish (Poland)',
      'pt-BR': 'Portuguese (Brazil)',
      'pt-PT': 'Portuguese (Portugal)',
      'ro-RO': 'Romanian (Romania)',
      'si-LK': 'Sinhala (Sri Lanka)',
      'sk-SK': 'Slovak (Slovakia)',
      'sl-SI': 'Slovenian (Slovenia)',
      'su-ID': 'Sundanese (Indonesia)',
      'sw-TZ': 'Swahili (Tanzania)',
      'sw-KE': 'Swahili (Kenya)',
      'fi-FI': 'Finnish (Finland)',
      'sv-SE': 'Swedish (Sweden)',
      'ta-IN': 'Tamil (India)',
      'ta-SG': 'Tamil (Singapore)',
      'ta-LK': 'Tamil (Sri Lanka)',
      'ta-MY': 'Tamil (Malaysia)',
      'te-IN': 'Telugu (India)',
      'vi-VN': 'Vietnamese (Vietnam)',
      'tr-TR': 'Turkish (Turkey)',
      'ur-PK': 'Urdu (Pakistan)',
      'ur-IN': 'Urdu (India)',
      'el-GR': 'Greek (Greece)',
      'bg-BG': 'Bulgarian (Bulgaria)',
      'ru-RU': 'Russian (Russia)',
      'sr-RS': 'Serbian (Serbia)',
      'uk-UA': 'Ukrainian (Ukraine)',
      'he-IL': 'Hebrew (Israel)',
      'ar-IL': 'Arabic (Israel)',
      'ar-JO': 'Arabic (Jordan)',
      'ar-AE': 'Arabic (United Arab Emirates)',
      'ar-BH': 'Arabic (Bahrain)',
      'ar-DZ': 'Arabic (Algeria)',
      'ar-SA': 'Arabic (Saudi Arabia)',
      'ar-IQ': 'Arabic (Iraq)',
      'ar-KW': 'Arabic (Kuwait)',
      'ar-MA': 'Arabic (Morocco)',
      'ar-TN': 'Arabic (Tunisia)',
      'ar-OM': 'Arabic (Oman)',
      'ar-PS': 'Arabic (State of Palestine)',
      'ar-QA': 'Arabic (Qatar)',
      'ar-LB': 'Arabic (Lebanon)',
      'ar-EG': 'Arabic (Egypt)',
      'fa-IR': 'Persian (Iran)',
      'hi-IN': 'Hindi (India)',
      'th-TH': 'Thai (Thailand)',
      'ko-KR': 'Korean (South Korea)',
      'zh-TW': 'Chinese, Mandarin (Traditional, Taiwan)',
      'yue-Hant-HK': 'Chinese, Cantonese (Traditional, Hong Kong)',
      'ja-JP': 'Japanese (Japan)',
      'zh-HK': 'Chinese, Mandarin (Simplified, Hong Kong)',
      'zh': 'Chinese, Mandarin (Simplified, China)'
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isTranscribing: this.isTranscribing,
      language: this.currentLanguage,
      restartCounter: this.restartCounter,
      finalTranscript: this.finalTranscript,
      interimTranscript: this.interimTranscript
    };
  }

  /**
   * Clear transcript
   */
  clearTranscript() {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.emit('cleared');
  }
}

module.exports = Transcriber;
