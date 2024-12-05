class Storage {
    constructor() {
        this.keys = CONFIG.STORAGE_KEYS;
    }

    // User data methods
    saveUser(userData) {
        localStorage.setItem(this.keys.USER_DATA, JSON.stringify(userData));
    }

    getUser() {
        const userData = localStorage.getItem(this.keys.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    }

    clearUser() {
        localStorage.removeItem(this.keys.USER_DATA);
    }

    // Recordings methods
    saveRecording(recording) {
        const recordings = this.getRecordings();
        recordings.unshift(recording);
        localStorage.setItem(this.keys.RECORDINGS, JSON.stringify(recordings));
    }

    getRecordings() {
        const recordings = localStorage.getItem(this.keys.RECORDINGS);
        return recordings ? JSON.parse(recordings) : [];
    }

    deleteRecording(recordingId) {
        const recordings = this.getRecordings();
        const updatedRecordings = recordings.filter(rec => rec.id !== recordingId);
        localStorage.setItem(this.keys.RECORDINGS, JSON.stringify(updatedRecordings));
    }

    // Settings methods
    saveSettings(settings) {
        localStorage.setItem(this.keys.SETTINGS, JSON.stringify(settings));
    }

    getSettings() {
        const settings = localStorage.getItem(this.keys.SETTINGS);
        return settings ? JSON.parse(settings) : {
            theme: 'light',
            autoSave: true,
            recordingQuality: 'high',
            defaultVoice: '',
            defaultRate: 1,
            defaultPitch: 1
        };
    }

    // Usage tracking methods
    trackUsage(feature) {
        const user = this.getUser();
        if (!user) return;

        const usage = this.getUsage();
        usage[feature] = (usage[feature] || 0) + 1;
        localStorage.setItem('usage_stats', JSON.stringify(usage));

        // Check usage limits
        if (user.subscription === 'free') {
            const limits = CONFIG.PREMIUM_FEATURES.FREE;
            if (feature === 'recordings' && usage.recordings > limits.MAX_RECORDINGS) {
                return false;
            }
        }
        return true;
    }

    getUsage() {
        const usage = localStorage.getItem('usage_stats');
        return usage ? JSON.parse(usage) : {};
    }

    resetUsage() {
        localStorage.setItem('usage_stats', JSON.stringify({}));
    }

    // Cache methods for offline support
    async cacheData(key, data) {
        try {
            const cache = await caches.open('voiceflow-data');
            const response = new Response(JSON.stringify(data));
            await cache.put(`/data/${key}`, response);
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }

    async getCachedData(key) {
        try {
            const cache = await caches.open('voiceflow-data');
            const response = await cache.match(`/data/${key}`);
            if (response) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.error('Error getting cached data:', error);
        }
        return null;
    }

    // Clear all data
    clearAll() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        localStorage.removeItem('usage_stats');
        caches.delete('voiceflow-data');
    }
}

// Initialize storage
const storage = new Storage();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
