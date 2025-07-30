const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001;

// Configure multer for handling file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Initialize Google Cloud Speech client
let speechClient;
let translateClient;

try {
    // Check if credentials.json exists
    const credentialsPath = path.join(__dirname, 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        speechClient = new speech.SpeechClient({
            keyFilename: credentialsPath
        });
        translateClient = new Translate({
            keyFilename: credentialsPath
        });
        console.log('✅ Google Cloud Speech and Translation clients initialized with credentials.json');
    } else {
        console.warn('⚠️ credentials.json not found. Please add your Google Cloud credentials file.');
        console.warn('📖 Instructions: https://cloud.google.com/speech-to-text/docs/before-you-begin');
    }
} catch (error) {
    console.error('❌ Failed to initialize Google Cloud clients:', error.message);
}

// Real-time streaming transcription with Socket.IO
io.on('connection', (socket) => {
    console.log('🔌 Client connected for streaming:', socket.id);
    
    let recognizeStream = null;
    let isStreamActive = false;
    let streamConfig = null;
    let lastAudioTime = Date.now();
    let silenceTimeout = null;
    
    // Auto-restart stream after silence timeout (handle Google Cloud cancellation)
    function startSilenceTimer() {
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
            if (isStreamActive && recognizeStream) {
                console.log('⏰ Restarting stream due to prolonged silence...');
                restartStream();
            }
        }, 30000); // 30 seconds silence timeout
    }
    
    // Restart stream function
    function restartStream() {
        if (recognizeStream && isStreamActive) {
            recognizeStream.end();
        }
        if (streamConfig) {
            setTimeout(() => {
                if (isStreamActive) {
                    createNewStream(streamConfig);
                }
            }, 100); // Small delay before restarting
        }
    }
    
    // Create new streaming recognition
    function createNewStream(config) {
        try {
            const request = {
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: config.sampleRate || 16000,
                    languageCode: config.language || 'en-US',
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: false,
                    model: 'latest_short', // Better for real-time with pauses
                    useEnhanced: true,
                    maxAlternatives: 1,
                    audioChannelCount: 1,
                    enableSeparateRecognitionPerChannel: false,
                    // Add speech contexts for better recognition
                    speechContexts: [{
                        phrases: ["hello", "yes", "no", "thank you", "please"]
                    }]
                },
                interimResults: true,
                enableVoiceActivityEvents: true,
                // Reduced timeouts to handle silence better
                voiceActivityTimeout: {
                    speechStartTimeout: {
                        seconds: 3,
                        nanos: 0
                    },
                    speechEndTimeout: {
                        seconds: 1,
                        nanos: 0
                    }
                }
            };
            
            recognizeStream = speechClient
                .streamingRecognize(request)
                .on('error', (error) => {
                    console.error('❌ Streaming recognition error:', error);
                    
                    let errorMessage = 'Streaming transcription failed';
                    let shouldRestart = false;
                    
                    if (error.code === 1) { // CANCELLED
                        errorMessage = 'Stream cancelled due to silence - auto-restarting...';
                        shouldRestart = true;
                    } else if (error.code === 3) { // INVALID_ARGUMENT
                        errorMessage = 'Invalid audio format - check encoding settings';
                    } else if (error.code === 11) { // OUT_OF_RANGE
                        errorMessage = 'Audio processing timeout - restarting stream...';
                        shouldRestart = true;
                    } else if (error.code === 4) { // DEADLINE_EXCEEDED
                        errorMessage = 'Stream timeout - restarting...';
                        shouldRestart = true;
                    }
                    
                    if (shouldRestart && isStreamActive) {
                        console.log('🔄 Auto-restarting stream...');
                        setTimeout(() => restartStream(), 500);
                    } else {
                        socket.emit('streaming-error', {
                            message: errorMessage,
                            code: error.code,
                            details: error.details
                        });
                        isStreamActive = false;
                    }
                })
                .on('data', (response) => {
                    // Reset silence timer on any response
                    startSilenceTimer();
                    
                    // Handle streaming results
                    if (response.results && response.results.length > 0) {
                        const result = response.results[0];
                        const transcript = result.alternatives[0].transcript;
                        const confidence = result.alternatives[0].confidence || 0;
                        const isFinal = result.isFinal;
                        
                        // Log final results only
                        if (isFinal) {
                            console.log(`✅ Final transcription:`, transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''));
                        }
                        
                        // Emit real-time result to frontend
                        socket.emit('transcription-result', {
                            transcript: transcript,
                            confidence: confidence,
                            isFinal: isFinal,
                            timestamp: Date.now(),
                            languageCode: config.language || 'en-US'
                        });
                    }
                    
                    // Handle voice activity events
                    if (response.speechEventType) {
                        console.log(`🎙️ Voice activity: ${response.speechEventType}`);
                        socket.emit('voice-activity', {
                            event: response.speechEventType,
                            timestamp: Date.now()
                        });
                    }
                })
                .on('end', () => {
                    console.log('🔚 Streaming recognition ended');
                    if (isStreamActive) {
                        // If stream ended but should still be active, restart it
                        console.log('🔄 Stream ended unexpectedly, restarting...');
                        setTimeout(() => restartStream(), 500);
                    } else {
                        socket.emit('stream-ended');
                    }
                });
                
            console.log('✅ New streaming recognition created');
            startSilenceTimer();
            
        } catch (streamError) {
            console.error('❌ Failed to create streaming recognition:', streamError);
            socket.emit('streaming-error', {
                message: `Failed to initialize stream: ${streamError.message}`,
                code: streamError.code
            });
        }
    }
    
    // Start streaming transcription
    socket.on('start-stream', (config) => {
        try {
            if (!speechClient) {
                socket.emit('streaming-error', {
                    message: 'Speech recognition service not available'
                });
                return;
            }
            
            // Clean up existing stream
            if (isStreamActive && recognizeStream) {
                recognizeStream.end();
                clearTimeout(silenceTimeout);
            }
            
            console.log(`🎤 Starting streaming recognition:`, {
                language: config.language || 'en-US',
                sampleRate: config.sampleRate || 16000,
                socketId: socket.id
            });
            
            // Store config for restarts
            streamConfig = config;
            isStreamActive = true;
            lastAudioTime = Date.now();
            
            // Create initial stream
            createNewStream(config);
            socket.emit('stream-started');
            
        } catch (error) {
            console.error('❌ Failed to start streaming recognition:', error);
            socket.emit('streaming-error', {
                message: `Failed to start streaming: ${error.message}`
            });
        }
    });
    
    // Receive audio data from client
    socket.on('audio-data', (audioChunk) => {
        if (recognizeStream && isStreamActive) {
            try {
                // Update last audio time
                lastAudioTime = Date.now();
                
                // Handle different audio data formats
                let audioBuffer;
                
                if (Buffer.isBuffer(audioChunk)) {
                    audioBuffer = audioChunk;
                } else if (typeof audioChunk === 'string') {
                    audioBuffer = Buffer.from(audioChunk, 'base64');
                } else if (audioChunk instanceof ArrayBuffer) {
                    audioBuffer = Buffer.from(audioChunk);
                } else {
                    audioBuffer = Buffer.from(audioChunk);
                }
                
                // Only write if we have valid data
                if (audioBuffer && audioBuffer.length > 0) {
                    recognizeStream.write(audioBuffer);
                    
                    // Reset silence timer on audio data
                    startSilenceTimer();
                    
                    // Reduced logging - only log occasionally
                    if (Math.random() < 0.05) { // Log ~5% of chunks
                        console.log(`📊 Audio streaming: ${audioBuffer.length} bytes`);
                    }
                } else {
                    console.warn('⚠️ Empty audio chunk received');
                }
            } catch (error) {
                console.error('❌ Error writing audio data:', error);
                
                // If write error, try to restart stream
                if (error.code === 'ERR_STREAM_WRITE_AFTER_END') {
                    console.log('🔄 Stream ended during write, restarting...');
                    restartStream();
                } else {
                    socket.emit('streaming-error', { 
                        message: `Audio write error: ${error.message}`,
                        code: error.code 
                    });
                }
            }
        } else {
            // Stream not active, buffer audio or ignore
            console.warn('⚠️ Received audio data but stream not active');
        }
    });
    
    // Stop streaming
    socket.on('stop-stream', () => {
        console.log('🛑 Client requested stop streaming');
        isStreamActive = false;
        clearTimeout(silenceTimeout);
        
        if (recognizeStream) {
            try {
                recognizeStream.end();
            } catch (error) {
                console.warn('⚠️ Error ending stream:', error.message);
            }
        }
        
        streamConfig = null;
        socket.emit('stream-ended');
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        isStreamActive = false;
        clearTimeout(silenceTimeout);
        
        if (recognizeStream) {
            try {
                recognizeStream.end();
            } catch (error) {
                console.warn('⚠️ Error ending stream on disconnect:', error.message);
            }
        }
        
        streamConfig = null;
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        speechClientReady: !!speechClient,
        translateClientReady: !!translateClient,
        timestamp: new Date().toISOString()
    });
});

// Main transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        // Check if speech client is available
        if (!speechClient) {
            return res.status(500).json({
                error: 'Speech recognition service not available',
                message: 'Google Cloud Speech client not initialized. Please check credentials.json file.'
            });
        }

        // Check if audio file was uploaded
        if (!req.file) {
            return res.status(400).json({
                error: 'No audio file provided',
                message: 'Please upload an audio file'
            });
        }

        const audioBuffer = req.file.buffer;
        const language = req.body.language || 'en-US';

        console.log(`🎤 Processing audio transcription:`, {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            size: audioBuffer.length,
            language: language
        });

        // Configure the request for Google Speech-to-Text
        const request = {
            audio: {
                content: audioBuffer.toString('base64'),
            },
            config: {
                encoding: getAudioEncoding(req.file.mimetype),
                sampleRateHertz: 48000, // Most browsers use 48kHz
                languageCode: language,
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false,
                model: 'latest_long', // Use latest model for better accuracy
                useEnhanced: true, // Use enhanced model if available
            },
        };

        // Perform speech recognition
        const [response] = await speechClient.recognize(request);
        
        if (!response.results || response.results.length === 0) {
            return res.json({
                transcript: '',
                confidence: 0,
                message: 'No speech detected in audio'
            });
        }

        // Extract the best transcript
        const transcription = response.results
            .map(result => result.alternatives[0])
            .filter(alternative => alternative.transcript)
            .map(alternative => alternative.transcript)
            .join(' ');

        // Calculate average confidence
        const confidences = response.results
            .map(result => result.alternatives[0].confidence || 0)
            .filter(conf => conf > 0);
        
        const averageConfidence = confidences.length > 0 
            ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
            : 0;

        console.log(`✅ Transcription completed:`, {
            transcript: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''),
            confidence: averageConfidence,
            resultsCount: response.results.length
        });

        res.json({
            transcript: transcription,
            confidence: averageConfidence,
            language: language,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Transcription error:', error);
        
        res.status(500).json({
            error: 'Transcription failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Translation endpoint
app.post('/translate', async (req, res) => {
    try {
        // Check if translation client is available
        if (!translateClient) {
            return res.status(500).json({
                error: 'Translation service not available',
                message: 'Google Cloud Translation client not initialized. Please check credentials.json file.'
            });
        }

        // Validate request body
        const { text, source, target } = req.body;

        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({
                error: 'Invalid text',
                message: 'Text field is required and must be a non-empty string'
            });
        }

        if (!target || typeof target !== 'string') {
            return res.status(400).json({
                error: 'Invalid target language',
                message: 'Target language code is required'
            });
        }

        console.log(`🌍 Processing translation:`, {
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            source: source || 'auto-detect',
            target: target
        });

        // Prepare translation options
        const options = {
            to: target
        };

        // Add source language if specified
        if (source && source !== 'auto') {
            options.from = source;
        }

        // Perform translation
        const [translation] = await translateClient.translate(text, options);

        console.log(`✅ Translation completed:`, {
            originalText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            translatedText: translation.substring(0, 50) + (translation.length > 50 ? '...' : ''),
            target: target
        });

        res.json({
            translatedText: translation,
            sourceLanguage: source || 'auto-detected',
            targetLanguage: target,
            originalText: text,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Translation error:', error);

        // Handle specific translation errors
        let errorMessage = error.message;
        let statusCode = 500;

        if (error.message.includes('Invalid language')) {
            errorMessage = 'Invalid language code provided';
            statusCode = 400;
        } else if (error.message.includes('quota')) {
            errorMessage = 'Translation quota exceeded. Please try again later.';
            statusCode = 429;
        }

        res.status(statusCode).json({
            error: 'Translation failed',
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Helper function to determine audio encoding
function getAudioEncoding(mimetype) {
    switch (mimetype) {
        case 'audio/wav':
        case 'audio/wave':
            return 'LINEAR16';
        case 'audio/webm':
        case 'video/webm':
            return 'WEBM_OPUS';
        case 'audio/ogg':
            return 'OGG_OPUS';
        case 'audio/flac':
            return 'FLAC';
        case 'audio/mp3':
        case 'audio/mpeg':
            return 'MP3';
        default:
            return 'WEBM_OPUS'; // Default for most browsers
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'Audio file must be smaller than 10MB'
            });
        }
    }
    
    console.error('❌ Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'Endpoint not found'
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Speech-to-Text server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🎤 Transcription endpoint: POST http://localhost:${PORT}/transcribe`);
    console.log(`🌍 Translation endpoint: POST http://localhost:${PORT}/translate`);
    console.log(`🔌 Real-time streaming: Socket.IO enabled`);
    
    if (!speechClient || !translateClient) {
        console.log('\n⚠️  SETUP REQUIRED:');
        console.log('   1. Add your credentials.json file to this directory');
        console.log('   2. Restart the server');
        console.log('   3. Documentation: https://cloud.google.com/speech-to-text/docs/before-you-begin\n');
    }
});

module.exports = { app, server };
