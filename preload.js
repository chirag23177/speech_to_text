// Preload script to expose Electron APIs to the renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose Google Cloud APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Google Cloud Speech-to-Text (Batch)
  transcribeAudio: async (audioBuffer, languageCode) => {
    // Convert ArrayBuffer to Buffer in the main process
    return ipcRenderer.invoke('transcribe-audio', audioBuffer, languageCode);
  },
  
  // Google Cloud Speech-to-Text (Streaming)
  startStreamingRecognition: (sessionId, languageCode) => {
    return ipcRenderer.invoke('start-streaming-recognition', sessionId, languageCode);
  },
  
  sendAudioChunk: (sessionId, audioBuffer) => {
    return ipcRenderer.invoke('send-audio-chunk', sessionId, audioBuffer);
  },
  
  stopStreamingRecognition: (sessionId) => {
    return ipcRenderer.invoke('stop-streaming-recognition', sessionId);
  },
  
  // Listen for streaming transcription results
  onStreamingTranscript: (callback) => {
    ipcRenderer.on('streaming-transcript', callback);
  },
  
  removeStreamingTranscriptListener: (callback) => {
    ipcRenderer.removeListener('streaming-transcript', callback);
  },
  
  // Google Cloud Translate
  translateText: (text, targetLanguage, sourceLanguage) => {
    return ipcRenderer.invoke('translate-text', text, targetLanguage, sourceLanguage);
  },
  
  // Get available languages for speech recognition
  getSpeechLanguages: () => {
    return ipcRenderer.invoke('get-speech-languages');
  },
  
  // Get available languages for translation
  getTranslationLanguages: () => {
    return ipcRenderer.invoke('get-translation-languages');
  },
  
  // Test Google Cloud connection
  testGoogleCloudConnection: () => {
    return ipcRenderer.invoke('test-google-cloud-connection');
  },
  
  // Utility functions
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
  },
  
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path');
  },
  
  showMessageBox: (options) => {
    return ipcRenderer.invoke('show-message-box', options);
  },
  
  showSaveDialog: (options) => {
    return ipcRenderer.invoke('show-save-dialog', options);
  },
  
  showOpenDialog: (options) => {
    return ipcRenderer.invoke('show-open-dialog', options);
  },
  
  // Send events to main process
  updateTrayTooltip: (text) => {
    ipcRenderer.send('update-tray-tooltip', text);
  },
  
  updateTrayTitle: (title) => {
    ipcRenderer.send('update-tray-title', title);
  }
});

// Expose Buffer utility for audio processing
contextBridge.exposeInMainWorld('NodeBuffer', {
  from: (data, encoding) => {
    return Array.from(Buffer.from(data, encoding));
  },
  fromArrayBuffer: (arrayBuffer) => {
    return Array.from(Buffer.from(arrayBuffer));
  }
});

console.log('Preload script loaded - Electron APIs exposed to renderer');
