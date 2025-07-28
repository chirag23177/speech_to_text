const { Translate } = require('@google-cloud/translate').v2;
const EventEmitter = require('events');
const path = require('path');

/**
 * Translator Module
 * Handles Google Cloud Translation API integration
 */
class Translator extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.sourceLanguage = 'en';
    this.targetLanguage = 'es';
    this.translationCache = new Map();
    this.cacheMaxSize = 1000;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitDelay = 100; // 100ms between requests
    
    this.initializeClient();
  }

  /**
   * Initialize Google Translate client
   */
  initializeClient() {
    try {
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      
      this.client = new Translate({
        keyFilename: credentialsPath,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      
      console.log('Translation client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Translation client:', error);
      this.emit('error', {
        type: 'initialization',
        message: 'Failed to initialize Google Translation client. Please check your credentials.json file.',
        error
      });
    }
  }

  /**
   * Translate text
   */
  async translateText(text, sourceLanguage = null, targetLanguage = null) {
    if (!text || text.trim() === '') {
      return '';
    }

    const source = sourceLanguage || this.sourceLanguage;
    const target = targetLanguage || this.targetLanguage;
    
    // Skip translation if source and target are the same
    if (source === target) {
      return text;
    }

    // Check cache first
    const cacheKey = `${source}:${target}:${text}`;
    if (this.translationCache.has(cacheKey)) {
      const cached = this.translationCache.get(cacheKey);
      this.emit('translated', {
        originalText: text,
        translatedText: cached.translation,
        sourceLanguage: source,
        targetLanguage: target,
        confidence: cached.confidence,
        fromCache: true,
        timestamp: new Date().toISOString()
      });
      return cached.translation;
    }

    try {
      console.log(`Translating: "${text}" from ${source} to ${target}`);
      
      const [translation, metadata] = await this.client.translate(text, {
        from: source,
        to: target,
        format: 'text'
      });

      const translatedText = Array.isArray(translation) ? translation[0] : translation;
      
      // Cache the result
      this.cacheTranslation(cacheKey, {
        translation: translatedText,
        confidence: metadata?.confidence || 0.9,
        source,
        target
      });

      this.emit('translated', {
        originalText: text,
        translatedText: translatedText,
        sourceLanguage: source,
        targetLanguage: target,
        confidence: metadata?.confidence || 0.9,
        fromCache: false,
        timestamp: new Date().toISOString()
      });

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      
      this.emit('error', {
        type: 'translation',
        message: 'Failed to translate text',
        originalText: text,
        sourceLanguage: source,
        targetLanguage: target,
        error
      });
      
      // Return original text as fallback
      return text;
    }
  }

  /**
   * Queue translation request for rate limiting
   */
  queueTranslation(text, sourceLanguage = null, targetLanguage = null) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        text,
        sourceLanguage,
        targetLanguage,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  /**
   * Process translation queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const result = await this.translateText(
          request.text,
          request.sourceLanguage,
          request.targetLanguage
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Rate limiting delay
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Cache translation result
   */
  cacheTranslation(key, value) {
    // Remove oldest entries if cache is full
    if (this.translationCache.size >= this.cacheMaxSize) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }
    
    this.translationCache.set(key, {
      ...value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.translationCache.size,
      maxSize: this.cacheMaxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate
   */
  calculateHitRate() {
    // This would need to be tracked over time
    // For now, return a placeholder
    return 0.75; // 75% hit rate estimate
  }

  /**
   * Set source and target languages
   */
  setLanguages(sourceLanguage, targetLanguage) {
    console.log(`Setting languages: ${sourceLanguage} -> ${targetLanguage}`);
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    
    this.emit('languagesChanged', {
      source: sourceLanguage,
      target: targetLanguage
    });
  }

  /**
   * Swap source and target languages
   */
  swapLanguages() {
    const oldSource = this.sourceLanguage;
    const oldTarget = this.targetLanguage;
    
    this.sourceLanguage = oldTarget;
    this.targetLanguage = oldSource;
    
    console.log(`Languages swapped: ${oldSource} -> ${oldTarget} became ${this.sourceLanguage} -> ${this.targetLanguage}`);
    
    this.emit('languagesSwapped', {
      source: this.sourceLanguage,
      target: this.targetLanguage
    });
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const [languages] = await this.client.getLanguages();
      
      const languageMap = {};
      languages.forEach(lang => {
        languageMap[lang.code] = lang.name;
      });
      
      return languageMap;
    } catch (error) {
      console.error('Error getting supported languages:', error);
      
      // Return common languages as fallback
      return this.getCommonLanguages();
    }
  }

  /**
   * Get common languages as fallback
   */
  getCommonLanguages() {
    return {
      'af': 'Afrikaans',
      'sq': 'Albanian',
      'am': 'Amharic',
      'ar': 'Arabic',
      'hy': 'Armenian',
      'az': 'Azerbaijani',
      'eu': 'Basque',
      'be': 'Belarusian',
      'bn': 'Bengali',
      'bs': 'Bosnian',
      'bg': 'Bulgarian',
      'ca': 'Catalan',
      'ceb': 'Cebuano',
      'zh-cn': 'Chinese (Simplified)',
      'zh-tw': 'Chinese (Traditional)',
      'co': 'Corsican',
      'hr': 'Croatian',
      'cs': 'Czech',
      'da': 'Danish',
      'nl': 'Dutch',
      'en': 'English',
      'eo': 'Esperanto',
      'et': 'Estonian',
      'tl': 'Filipino',
      'fi': 'Finnish',
      'fr': 'French',
      'fy': 'Frisian',
      'gl': 'Galician',
      'ka': 'Georgian',
      'de': 'German',
      'el': 'Greek',
      'gu': 'Gujarati',
      'ht': 'Haitian Creole',
      'ha': 'Hausa',
      'haw': 'Hawaiian',
      'iw': 'Hebrew',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'hmn': 'Hmong',
      'hu': 'Hungarian',
      'is': 'Icelandic',
      'ig': 'Igbo',
      'id': 'Indonesian',
      'ga': 'Irish',
      'it': 'Italian',
      'ja': 'Japanese',
      'jw': 'Javanese',
      'kn': 'Kannada',
      'kk': 'Kazakh',
      'km': 'Khmer',
      'ko': 'Korean',
      'ku': 'Kurdish (Kurmanji)',
      'ky': 'Kyrgyz',
      'lo': 'Lao',
      'la': 'Latin',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'lb': 'Luxembourgish',
      'mk': 'Macedonian',
      'mg': 'Malagasy',
      'ms': 'Malay',
      'ml': 'Malayalam',
      'mt': 'Maltese',
      'mi': 'Maori',
      'mr': 'Marathi',
      'mn': 'Mongolian',
      'my': 'Myanmar (Burmese)',
      'ne': 'Nepali',
      'no': 'Norwegian',
      'or': 'Odia',
      'ps': 'Pashto',
      'fa': 'Persian',
      'pl': 'Polish',
      'pt': 'Portuguese',
      'pa': 'Punjabi',
      'ro': 'Romanian',
      'ru': 'Russian',
      'sm': 'Samoan',
      'gd': 'Scots Gaelic',
      'sr': 'Serbian',
      'st': 'Sesotho',
      'sn': 'Shona',
      'sd': 'Sindhi',
      'si': 'Sinhala',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'so': 'Somali',
      'es': 'Spanish',
      'su': 'Sundanese',
      'sw': 'Swahili',
      'sv': 'Swedish',
      'tg': 'Tajik',
      'ta': 'Tamil',
      'tt': 'Tatar',
      'te': 'Telugu',
      'th': 'Thai',
      'tr': 'Turkish',
      'tk': 'Turkmen',
      'uk': 'Ukrainian',
      'ur': 'Urdu',
      'ug': 'Uyghur',
      'uz': 'Uzbek',
      'vi': 'Vietnamese',
      'cy': 'Welsh',
      'xh': 'Xhosa',
      'yi': 'Yiddish',
      'yo': 'Yoruba',
      'zu': 'Zulu'
    };
  }

  /**
   * Get language mapping for speech-to-text to translation
   */
  getSpeechToTranslationMapping() {
    return {
      'en-US': 'en',
      'en-GB': 'en',
      'en-AU': 'en',
      'en-CA': 'en',
      'en-IN': 'en',
      'es-ES': 'es',
      'es-MX': 'es',
      'es-US': 'es',
      'fr-FR': 'fr',
      'fr-CA': 'fr',
      'de-DE': 'de',
      'it-IT': 'it',
      'pt-BR': 'pt',
      'pt-PT': 'pt',
      'ru-RU': 'ru',
      'ja-JP': 'ja',
      'ko-KR': 'ko',
      'zh': 'zh-cn',
      'zh-TW': 'zh-tw',
      'ar-SA': 'ar',
      'hi-IN': 'hi',
      'nl-NL': 'nl',
      'sv-SE': 'sv',
      'da-DK': 'da',
      'no-NO': 'no',
      'fi-FI': 'fi',
      'pl-PL': 'pl',
      'tr-TR': 'tr',
      'he-IL': 'he',
      'th-TH': 'th',
      'vi-VN': 'vi',
      'uk-UA': 'uk',
      'cs-CZ': 'cs',
      'sk-SK': 'sk',
      'hu-HU': 'hu',
      'ro-RO': 'ro',
      'bg-BG': 'bg',
      'hr-HR': 'hr',
      'sl-SI': 'sl',
      'et-EE': 'et',
      'lv-LV': 'lv',
      'lt-LT': 'lt'
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      cacheSize: this.translationCache.size,
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  /**
   * Export translation history
   */
  exportHistory() {
    const history = [];
    
    for (const [key, value] of this.translationCache.entries()) {
      const [source, target, text] = key.split(':');
      history.push({
        originalText: text,
        translatedText: value.translation,
        sourceLanguage: source,
        targetLanguage: target,
        confidence: value.confidence,
        timestamp: new Date(value.timestamp).toISOString()
      });
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = Translator;
