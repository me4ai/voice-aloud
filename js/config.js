// Configuration for VoiceFlow Pro
const CONFIG = {
    // App settings
    APP_NAME: 'VoiceFlow Pro',
    VERSION: '1.0.0',
    
    // Feature flags
    FEATURES: {
        BLUETOOTH_SUPPORT: true,
        VOICE_EMOTIONS: true,
        BACKGROUND_MUSIC: true,
        VIDEO_GENERATION: true,
        CUSTOM_BRANDING: true,
        API_ACCESS: true
    },

    // Premium features configuration
    PREMIUM_FEATURES: {
        FREE: {
            MAX_RECORDINGS: 5,
            MAX_DURATION: 300, // 5 minutes
            AVAILABLE_VOICES: ['default'],
            EXPORT_FORMATS: ['txt']
        },
        PREMIUM: {
            MAX_RECORDINGS: -1, // unlimited
            MAX_DURATION: 3600, // 1 hour
            AVAILABLE_VOICES: ['premium', 'emotion', 'custom'],
            EXPORT_FORMATS: ['txt', 'mp3', 'wav']
        },
        ENTERPRISE: {
            MAX_RECORDINGS: -1,
            MAX_DURATION: -1, // unlimited
            AVAILABLE_VOICES: ['all'],
            EXPORT_FORMATS: ['txt', 'mp3', 'wav', 'video']
        }
    },

    // Storage keys
    STORAGE_KEYS: {
        USER_DATA: 'voiceflow_user',
        RECORDINGS: 'voiceflow_recordings',
        SETTINGS: 'voiceflow_settings'
    },

    // API endpoints (for GitHub Pages, we'll use localStorage)
    API: {
        BASE_URL: 'https://api.voiceflow.pro',
        ENDPOINTS: {
            AUTH: '/auth',
            RECORDINGS: '/recordings',
            TRANSCRIPTION: '/transcribe',
            PREMIUM: '/premium'
        }
    },

    // PWA settings
    PWA: {
        CACHE_NAME: 'voiceflow-pro-v1',
        OFFLINE_PAGE: '/offline.html',
        CACHE_ASSETS: [
            '/',
            '/index.html',
            '/styles.css',
            '/js/app.js',
            '/manifest.json',
            '/icons/icon-192x192.png',
            '/icons/icon-512x512.png'
        ]
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
