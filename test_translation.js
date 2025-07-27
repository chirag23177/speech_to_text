// Simple test script for translation API
const fetch = require('node-fetch');

async function testTranslation() {
    try {
        console.log('🧪 Testing translation API...');
        
        const response = await fetch('http://localhost:3001/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: 'Hello, how are you today?',
                source: 'en',
                target: 'es'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Translation failed:', errorData);
            return;
        }

        const result = await response.json();
        console.log('✅ Translation successful!');
        console.log('Original:', result.originalText);
        console.log('Translated:', result.translatedText);
        console.log('From:', result.sourceLanguage, 'To:', result.targetLanguage);
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.log('💡 Make sure the server is running: node server.js');
    }
}

// Run the test
testTranslation();
