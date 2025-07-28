// Test script to verify Google Cloud streaming configuration
const { SpeechClient } = require('@google-cloud/speech');
const path = require('path');

async function testStreamingConfig() {
  try {
    // Set up credentials
    const credentialsPath = path.join(__dirname, 'credentials.json');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    
    const speechClient = new SpeechClient();
    
    // Test simplified streaming config
    const streamConfig = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
      },
      interimResults: true,
    };
    
    console.log('Testing streaming config:', JSON.stringify(streamConfig, null, 2));
    
    // Try to create a stream
    const recognizeStream = speechClient.streamingRecognize(streamConfig);
    
    recognizeStream.on('error', (error) => {
      console.error('Streaming error:', error);
    });
    
    recognizeStream.on('data', (data) => {
      console.log('Streaming data received:', data);
    });
    
    console.log('Stream created successfully');
    
    // Close the stream after a short delay
    setTimeout(() => {
      recognizeStream.end();
      console.log('Stream ended - configuration is valid');
      process.exit(0);
    }, 1000);
    
  } catch (error) {
    console.error('Configuration test failed:', error);
    process.exit(1);
  }
}

testStreamingConfig();
