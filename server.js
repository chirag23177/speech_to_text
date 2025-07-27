const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const speech = require('@google-cloud/speech');
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

try {
    // Check if credentials.json exists
    const credentialsPath = path.join(__dirname, 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        speechClient = new speech.SpeechClient({
            keyFilename: credentialsPath
        });
        console.log('✅ Google Cloud Speech client initialized with credentials.json');
    } else {
        console.warn('⚠️ credentials.json not found. Please add your Google Cloud credentials file.');
        console.warn('📖 Instructions: https://cloud.google.com/speech-to-text/docs/before-you-begin');
    }
} catch (error) {
    console.error('❌ Failed to initialize Google Cloud Speech client:', error.message);
}

// Real-time streaming transcription with Socket.IO
io.on('connection', (socket) => {
    console.log('🔌 Client connected for streaming:', socket.id);
    
    let recognizeStream = null;
    let isStreamActive = false;
    
    // Start streaming transcription
    socket.on('start-stream', (config) => {
        try {
            if (!speechClient) {
                socket.emit('error', {
                    message: 'Speech recognition service not available'
                });
                return;
            }
            
            if (isStreamActive && recognizeStream) {
                recognizeStream.end();
            }
            
            const language = config.language || 'en-US';
            const sampleRate = config.sampleRate || 48000;
            
            console.log(`🎤 Starting streaming recognition:`, {
                language,
                sampleRate,
                socketId: socket.id
            });
            
            // Configure streaming request with proper audio settings
            const request = {
                config: {
                    encoding: 'WEBM_OPUS', // Browser MediaRecorder typically uses WEBM with Opus codec
                    sampleRateHertz: sampleRate,
                    languageCode: language,
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: false,
                    model: 'latest_long',
                    useEnhanced: true,
                    maxAlternatives: 1,
                    audioChannelCount: 1, // Mono audio
                    enableSeparateRecognitionPerChannel: false
                },
                interimResults: true,
                enableVoiceActivityEvents: true,
                voiceActivityTimeout: {
                    speechStartTimeout: {
                        seconds: 5,
                        nanos: 0
                    },
                    speechEndTimeout: {
                        seconds: 2,
                        nanos: 0
                    }
                }
            };
            
            // Create streaming recognition with better error handling
            try {
                recognizeStream = speechClient
                    .streamingRecognize(request)
                    .on('error', (error) => {
                        console.error('❌ Streaming recognition error:', error);
                        
                        // Send specific error messages to client
                        let errorMessage = 'Streaming transcription failed';
                        if (error.code === 1) {
                            errorMessage = 'Stream was cancelled - audio format may be incompatible';
                        } else if (error.code === 3) {
                            errorMessage = 'Invalid audio format - check encoding settings';
                        } else if (error.code === 11) {
                            errorMessage = 'Audio processing failed - check audio quality';
                        }
                        
                        socket.emit('streaming-error', {
                            message: errorMessage,
                            code: error.code,
                            details: error.details
                        });
                        isStreamActive = false;
                    })
                    .on('data', (response) => {
                        // Handle streaming results
                        if (response.results && response.results.length > 0) {
                        const result = response.results[0];
                        const transcript = result.alternatives[0].transcript;
                        const confidence = result.alternatives[0].confidence || 0;
                        const isFinal = result.isFinal;
                        
                        // Reduced logging - only log final results to reduce clutter
                        if (isFinal) {
                            console.log(`✅ Final transcription:`, transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''));
                        }
                        
                        // Emit real-time result to frontend
                        socket.emit('transcription-result', {
                            transcript: transcript,
                            confidence: confidence,
                            isFinal: isFinal,
                            timestamp: Date.now()
                        });
                    }
                    
                    // Handle voice activity events
                    if (response.speechEventType) {
                        socket.emit('voice-activity', {
                            event: response.speechEventType,
                            timestamp: Date.now()
                        });
                    }
                })
                .on('end', () => {
                    console.log('🔚 Streaming recognition ended');
                    isStreamActive = false;
                    socket.emit('stream-ended');
                });
            
                isStreamActive = true;
                socket.emit('stream-started');
                
            } catch (streamError) {
                console.error('❌ Failed to create streaming recognition:', streamError);
                socket.emit('streaming-error', {
                    message: `Failed to initialize stream: ${streamError.message}`,
                    code: streamError.code
                });
            }
            
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
                // Handle different audio data formats
                let audioBuffer;
                
                if (Buffer.isBuffer(audioChunk)) {
                    // Already a buffer
                    audioBuffer = audioChunk;
                } else if (typeof audioChunk === 'string') {
                    // Base64 encoded string
                    audioBuffer = Buffer.from(audioChunk, 'base64');
                } else if (audioChunk instanceof ArrayBuffer) {
                    // ArrayBuffer from client
                    audioBuffer = Buffer.from(audioChunk);
                } else {
                    // Assume it's a Blob/binary data
                    audioBuffer = Buffer.from(audioChunk);
                }
                
                // Only write if we have data
                if (audioBuffer && audioBuffer.length > 0) {
                    recognizeStream.write(audioBuffer);
                    // Reduced logging - only log periodically to avoid spam
                    if (Math.random() < 0.1) { // Log ~10% of chunks
                        console.log(`📊 Audio streaming: ${audioBuffer.length} bytes`);
                    }
                } else {
                    console.warn('⚠️ Empty audio chunk received');
                }
            } catch (error) {
                console.error('❌ Error writing audio data:', error);
                socket.emit('streaming-error', { message: error.message });
            }
        }
    });
    
    // Stop streaming
    socket.on('stop-stream', () => {
        console.log('🛑 Client requested stop streaming');
        if (recognizeStream && isStreamActive) {
            recognizeStream.end();
            isStreamActive = false;
        }
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        if (recognizeStream && isStreamActive) {
            recognizeStream.end();
            isStreamActive = false;
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        speechClientReady: !!speechClient,
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
    console.log(`🔌 Real-time streaming: Socket.IO enabled`);
    
    if (!speechClient) {
        console.log('\n⚠️  SETUP REQUIRED:');
        console.log('   1. Add your credentials.json file to this directory');
        console.log('   2. Restart the server');
        console.log('   3. Documentation: https://cloud.google.com/speech-to-text/docs/before-you-begin\n');
    }
});

module.exports = { app, server };
