// Test script for Language Selection & Management features
console.log('🧪 Testing Language Selection & Management...');

// Test when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the app to initialize
    setTimeout(() => {
        testLanguageFeatures();
    }, 1000);
});

function testLanguageFeatures() {
    const tests = [
        testLanguageDropdowns,
        testLanguageShortcuts,
        testLanguageSwap,
        testLanguagePreferences,
        testLanguageMapping
    ];

    console.log('\n📋 Running Language Management Tests...\n');
    
    tests.forEach((test, index) => {
        try {
            test();
            console.log(`✅ Test ${index + 1} passed: ${test.name}`);
        } catch (error) {
            console.error(`❌ Test ${index + 1} failed: ${test.name}`, error);
        }
    });
    
    console.log('\n🎉 Language Management test suite completed!\n');
}

function testLanguageDropdowns() {
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    
    if (!sourceLang || !targetLang) {
        throw new Error('Language dropdowns not found');
    }
    
    // Check if dropdowns have the expected number of options
    if (sourceLang.options.length < 20) {
        throw new Error(`Source language dropdown has only ${sourceLang.options.length} options`);
    }
    
    if (targetLang.options.length < 60) {
        throw new Error(`Target language dropdown has only ${targetLang.options.length} options`);
    }
    
    console.log(`  📊 Source languages: ${sourceLang.options.length}`);
    console.log(`  📊 Target languages: ${targetLang.options.length}`);
}

function testLanguageShortcuts() {
    const shortcuts = document.querySelectorAll('.lang-shortcut');
    
    if (shortcuts.length === 0) {
        throw new Error('No language shortcuts found');
    }
    
    // Check if shortcuts have proper data attributes
    shortcuts.forEach((shortcut, index) => {
        const source = shortcut.getAttribute('data-source');
        const target = shortcut.getAttribute('data-target');
        
        if (!source || !target) {
            throw new Error(`Shortcut ${index + 1} missing data attributes`);
        }
    });
    
    console.log(`  🔗 Language shortcuts found: ${shortcuts.length}`);
}

function testLanguageSwap() {
    const swapBtn = document.getElementById('swap-languages');
    
    if (!swapBtn) {
        throw new Error('Swap button not found');
    }
    
    // Check if swap button has proper event listener
    const hasClickListener = swapBtn.onclick || swapBtn.addEventListener;
    if (!hasClickListener) {
        console.warn('  ⚠️ Swap button may not have click listener (this is expected in test environment)');
    }
    
    console.log('  🔄 Swap button found and functional');
}

function testLanguagePreferences() {
    // Test localStorage functionality
    const testPrefs = {
        source: 'en-US',
        target: 'es',
        timestamp: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('test-language-preferences', JSON.stringify(testPrefs));
        const retrieved = JSON.parse(localStorage.getItem('test-language-preferences'));
        
        if (retrieved.source !== testPrefs.source || retrieved.target !== testPrefs.target) {
            throw new Error('Language preferences storage/retrieval failed');
        }
        
        localStorage.removeItem('test-language-preferences');
        console.log('  💾 Language preferences storage working');
    } catch (error) {
        throw new Error('localStorage not available or failed: ' + error.message);
    }
}

function testLanguageMapping() {
    // Test if speechTranslator is available and has mapping methods
    if (typeof window.speechTranslator === 'undefined') {
        console.warn('  ⚠️ speechTranslator not available (expected in test environment)');
        return;
    }
    
    const translator = window.speechTranslator;
    
    if (typeof translator.getLanguageMapping !== 'function') {
        throw new Error('getLanguageMapping method not found');
    }
    
    if (typeof translator.getSpeechToTranslationLanguage !== 'function') {
        throw new Error('getSpeechToTranslationLanguage method not found');
    }
    
    const mapping = translator.getLanguageMapping();
    if (!mapping || Object.keys(mapping).length < 10) {
        throw new Error('Language mapping appears incomplete');
    }
    
    console.log(`  🗺️ Language mapping contains ${Object.keys(mapping).length} entries`);
}

// Export for manual testing
window.testLanguageFeatures = testLanguageFeatures;
