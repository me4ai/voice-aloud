// Configuration for VoiceFlow Pro
const CONFIG = {
    // App settings
    APP_NAME: 'VoiceFlow Pro',
    VERSION: '1.0.0',
    
    // Firebase Configuration
    FIREBASE: {
        apiKey: "YOUR_API_KEY", // Replace with your Firebase API key
        authDomain: "voiceflow-pro.firebaseapp.com",
        projectId: "voiceflow-pro",
        storageBucket: "voiceflow-pro.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    },
    
    // Free service integrations
    SERVICES: {
        STORAGE: 'firebase', // 'firebase' or 'local'
        AUTH: 'firebase',    // 'firebase' or 'local'
        HOSTING: 'github',   // 'github' or 'local'
        ANALYTICS: 'ga4'     // 'ga4' or 'none'
    },

    // Feature configuration
    FEATURES: {
        RECORDING: {
            MAX_DURATION: 300,          // 5 minutes
            FORMAT: 'audio/webm',       // Most widely supported
            MIME_TYPE: 'audio/webm;codecs=opus'
        },
        TRANSCRIPTION: {
            ENGINE: 'webSpeech',        // Using Web Speech API
            CONTINUOUS: true,
            INTERIM_RESULTS: true,
            MAX_ALTERNATIVES: 1
        },
        TTS: {
            ENGINE: 'webSpeech',        // Using Web Speech API
            DEFAULT_VOICE: 'en-US',
            DEFAULT_RATE: 1,
            DEFAULT_PITCH: 1,
            DEFAULT_VOLUME: 1
        }
    },

    // Storage configuration
    STORAGE: {
        KEYS: {
            USER_DATA: 'voiceflow_user',
            RECORDINGS: 'voiceflow_recordings',
            SETTINGS: 'voiceflow_settings',
            TRANSCRIPTS: 'voiceflow_transcripts'
        },
        MAX_SIZE: 5 * 1024 * 1024,     // 5MB limit for free tier
        ALLOWED_TYPES: ['audio/webm', 'audio/wav', 'audio/mp3']
    },

    // PWA Configuration
    PWA: {
        CACHE_NAME: 'voiceflow-pro-v1',
        OFFLINE_FALLBACK: '/offline.html',
        CACHE_STRATEGIES: {
            ASSETS: 'cache-first',
            API: 'network-first',
            DYNAMIC: 'stale-while-revalidate'
        },
        CACHE_ASSETS: [
            '/',
            '/index.html',
            '/css/styles.css',
            '/js/app.js',
            '/js/recording.js',
            '/js/transcription.js',
            '/js/tts.js',
            '/js/auth.js',
            '/js/storage.js',
            '/manifest.json',
            '/assets/icons/icon-192x192.png',
            '/assets/icons/icon-512x512.png',
            '/assets/icons/maskable-icon.png'
        ]
    },

    // Error messages
    ERRORS: {
        RECORDING: {
            NO_PERMISSION: 'Microphone access denied. Please enable microphone access to use recording features.',
            DEVICE_NOT_FOUND: 'No recording device found. Please connect a microphone.',
            NOT_SUPPORTED: 'Recording is not supported in this browser.',
            MAX_DURATION: 'Maximum recording duration reached.'
        },
        TRANSCRIPTION: {
            NOT_SUPPORTED: 'Speech recognition is not supported in this browser.',
            NO_SPEECH: 'No speech detected. Please try speaking again.',
            NETWORK_ERROR: 'Network error occurred during transcription.',
            NOT_ALLOWED: 'Speech recognition permission denied.'
        },
        TTS: {
            NOT_SUPPORTED: 'Text-to-speech is not supported in this browser.',
            NO_VOICE: 'Selected voice is not available.',
            PLAYBACK_ERROR: 'Error occurred during speech playback.'
        },
        STORAGE: {
            QUOTA_EXCEEDED: 'Storage quota exceeded. Please delete some recordings.',
            TYPE_NOT_SUPPORTED: 'File type not supported.',
            SIZE_EXCEEDED: 'File size exceeds maximum allowed size.'
        }
    },

    // Analytics events
    ANALYTICS: {
        EVENTS: {
            RECORDING_STARTED: 'recording_started',
            RECORDING_COMPLETED: 'recording_completed',
            TRANSCRIPTION_STARTED: 'transcription_started',
            TRANSCRIPTION_COMPLETED: 'transcription_completed',
            TTS_STARTED: 'tts_started',
            TTS_COMPLETED: 'tts_completed',
            ERROR_OCCURRED: 'error_occurred'
        }
    }
};

// Export configuration
export default CONFIG;
