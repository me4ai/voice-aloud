class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.isPaused = false;
        this.isOffline = !navigator.onLine;
        
        // UI Elements
        this.voiceSelect = document.getElementById('voiceSelect');
        this.rateRange = document.getElementById('rateRange');
        this.pitchRange = document.getElementById('pitchRange');
        this.volumeRange = document.getElementById('volumeRange');
        this.rateValue = document.getElementById('rateValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.readButton = document.getElementById('readButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.stopReadButton = document.getElementById('stopReadButton');
        this.textOutput = document.getElementById('textOutput');
        this.offlineIndicator = document.getElementById('ttsOfflineIndicator');
        
        // Voice Categories (free tier)
        this.voiceCategories = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'hi': 'Hindi'
        };
        
        // Default settings
        this.defaultSettings = {
            rate: 1,
            pitch: 1,
            volume: 1,
            voice: ''
        };
        
        // Bind methods
        this.loadVoices = this.loadVoices.bind(this);
        this.speak = this.speak.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.stop = this.stop.bind(this);
        this.updateRate = this.updateRate.bind(this);
        this.updatePitch = this.updatePitch.bind(this);
        this.updateVolume = this.updateVolume.bind(this);
        this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
        
        // Initialize
        this.loadSettings();
        this.initializeVoices();
        this.setupEventListeners();
        this.initializeStorage();
        
        // Handle online/offline status
        window.addEventListener('online', this.handleOnlineStatus);
        window.addEventListener('offline', this.handleOnlineStatus);
        this.handleOnlineStatus();
    }

    async initializeStorage() {
        try {
            const request = indexedDB.open('VoiceFlowDB', 1);
            
            request.onerror = () => {
                console.error('Error opening IndexedDB');
                this.showToast('Failed to initialize storage', 'error');
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('ttsHistory')) {
                    const historyStore = db.createObjectStore('ttsHistory', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                if (!db.objectStoreNames.contains('voiceCache')) {
                    const voiceStore = db.createObjectStore('voiceCache', { keyPath: 'name' });
                    voiceStore.createIndex('lang', 'lang', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.loadCachedVoices();
            };
        } catch (error) {
            console.error('IndexedDB initialization error:', error);
            this.showToast('Storage initialization failed', 'error');
        }
    }

    async loadCachedVoices() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['voiceCache'], 'readonly');
            const store = transaction.objectStore('voiceCache');
            const voices = await store.getAll();

            if (voices.length > 0 && this.isOffline) {
                this.voices = voices;
                this.updateVoiceSelect();
                this.showToast('Using cached voices in offline mode', 'info');
            }
        } catch (error) {
            console.error('Error loading cached voices:', error);
        }
    }

    async cacheVoices(voices) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['voiceCache'], 'readwrite');
            const store = transaction.objectStore('voiceCache');

            // Clear existing cache
            await store.clear();

            // Cache new voices
            for (const voice of voices) {
                await store.add({
                    name: voice.name,
                    lang: voice.lang,
                    voiceURI: voice.voiceURI,
                    localService: voice.localService,
                    default: voice.default
                });
            }
        } catch (error) {
            console.error('Error caching voices:', error);
        }
    }

    async getHistory(limit = 10) {
        if (!this.db) return [];

        try {
            const transaction = this.db.transaction(['ttsHistory'], 'readonly');
            const store = transaction.objectStore('ttsHistory');
            const index = store.index('timestamp');

            return new Promise((resolve, reject) => {
                const request = index.openCursor(null, 'prev');
                const history = [];

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && history.length < limit) {
                        history.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(history);
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error getting history:', error);
            return [];
        }
    }

    async clearHistory() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['ttsHistory'], 'readwrite');
            const store = transaction.objectStore('ttsHistory');
            await store.clear();
            this.showToast('History cleared', 'info');
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showToast('Failed to clear history', 'error');
        }
    }

    handleOnlineStatus() {
        this.isOffline = !navigator.onLine;
        if (this.offlineIndicator) {
            this.offlineIndicator.textContent = this.isOffline ? '🔴 Offline Mode - Limited Voices' : '';
            this.offlineIndicator.style.display = this.isOffline ? 'block' : 'none';
        }
        
        // Reload voices when coming back online
        if (!this.isOffline) {
            this.loadVoices();
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('ttsSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.defaultSettings = { ...this.defaultSettings, ...settings };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        try {
            const settings = {
                rate: this.rateRange ? parseFloat(this.rateRange.value) : this.defaultSettings.rate,
                pitch: this.pitchRange ? parseFloat(this.pitchRange.value) : this.defaultSettings.pitch,
                volume: this.volumeRange ? parseFloat(this.volumeRange.value) : this.defaultSettings.volume,
                voice: this.voiceSelect ? this.voiceSelect.value : this.defaultSettings.voice
            };
            localStorage.setItem('ttsSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    initializeVoices() {
        // Load voices and set up voice change listener
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.loadVoices;
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
        
        if (this.voiceSelect) {
            // Clear existing options
            this.voiceSelect.innerHTML = '';
            
            // Group voices by language and type
            const voiceGroups = {
                'English (US)': [],
                'English (UK)': [],
                'English (Other)': [],
                'Other Languages': []
            };
            
            this.voices.forEach(voice => {
                if (voice.lang.startsWith('en-')) {
                    if (voice.lang === 'en-US') {
                        voiceGroups['English (US)'].push(voice);
                    } else if (voice.lang === 'en-GB') {
                        voiceGroups['English (UK)'].push(voice);
                    } else {
                        voiceGroups['English (Other)'].push(voice);
                    }
                } else {
                    voiceGroups['Other Languages'].push(voice);
                }
            });
            
            // Create option groups and add voices
            Object.entries(voiceGroups).forEach(([groupName, voices]) => {
                if (voices.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = groupName;
                    
                    voices.forEach(voice => {
                        const option = document.createElement('option');
                        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Default' : ''}`;
                        option.value = voice.name;
                        
                        // Add data attributes for filtering
                        option.dataset.lang = voice.lang;
                        option.dataset.local = voice.localService;
                        
                        // Mark premium voices
                        if (!voice.localService) {
                            option.dataset.premium = true;
                            option.textContent += ' ⭐'; // Add star for premium voices
                        }
                        
                        optgroup.appendChild(option);
                    });
                    
                    this.voiceSelect.appendChild(optgroup);
                }
            });
            
            // Try to select a default voice
            this.selectDefaultVoice();
        }
    }

    selectDefaultVoice() {
        // Priority for default voice selection
        const priorities = [
            // First try to find a free US English voice
            voice => voice.lang === 'en-US' && voice.localService,
            // Then any US English voice
            voice => voice.lang === 'en-US',
            // Then any English voice
            voice => voice.lang.startsWith('en-'),
            // Finally, any available voice
            voice => true
        ];

        let selectedVoice = null;
        for (const priority of priorities) {
            selectedVoice = this.voices.find(priority);
            if (selectedVoice) break;
        }

        if (selectedVoice && this.voiceSelect) {
            this.voiceSelect.value = selectedVoice.name;
            // Save as default
            this.saveSettings({
                ...this.defaultSettings,
                voice: selectedVoice.name
            });
        }
    }

    getCurrentVoice() {
        if (!this.voiceSelect || !this.voices.length) return null;
        return this.voices.find(voice => voice.name === this.voiceSelect.value);
    }

    async speak(text, options = {}) {
        if (!this.synth) return;
        
        // Stop any current speech
        this.stop();
        
        const utterance = new SpeechSynthesisUtterance(text);
        const currentVoice = this.getCurrentVoice();
        
        // Set voice and parameters
        if (currentVoice) {
            utterance.voice = currentVoice;
        }
        
        utterance.rate = parseFloat(this.rateRange?.value || this.defaultSettings.rate);
        utterance.pitch = parseFloat(this.pitchRange?.value || this.defaultSettings.pitch);
        utterance.volume = parseFloat(this.volumeRange?.value || this.defaultSettings.volume);
        
        // Add event handlers
        utterance.onstart = () => {
            this.updateUI(true);
            if (options.onStart) options.onStart();
        };
        
        utterance.onend = () => {
            this.updateUI(false);
            if (options.onEnd) options.onEnd();
            this.currentUtterance = null;
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.updateUI(false);
            if (options.onError) options.onError(event);
            this.currentUtterance = null;
        };
        
        // Start speaking
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    setupEventListeners() {
        if (this.readButton) {
            this.readButton.addEventListener('click', () => {
                const text = this.textOutput?.value || '';
                if (text.trim()) {
                    this.speak(text);
                } else {
                    this.showToast('Please enter text to read', 'warning');
                }
            });
        }
        
        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => {
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
            });
        }
        
        if (this.stopReadButton) {
            this.stopReadButton.addEventListener('click', this.stop);
        }
        
        if (this.rateRange) {
            this.rateRange.addEventListener('input', this.updateRate);
        }
        
        if (this.pitchRange) {
            this.pitchRange.addEventListener('input', this.updatePitch);
        }
        
        if (this.volumeRange) {
            this.volumeRange.addEventListener('input', this.updateVolume);
        }
    }

    updateUI(isSpeaking) {
        if (this.readButton) this.readButton.disabled = isSpeaking;
        if (this.pauseButton) this.pauseButton.disabled = !isSpeaking;
        if (this.stopReadButton) this.stopReadButton.disabled = !isSpeaking;
        
        // Update controls
        if (this.voiceSelect) this.voiceSelect.disabled = isSpeaking;
        if (this.rateRange) this.rateRange.disabled = isSpeaking;
        if (this.pitchRange) this.pitchRange.disabled = isSpeaking;
        if (this.volumeRange) this.volumeRange.disabled = isSpeaking;
    }

    pause() {
        if (this.synth.speaking && !this.isPaused) {
            this.synth.pause();
            this.isPaused = true;
            if (this.pauseButton) {
                this.pauseButton.textContent = 'Resume';
            }
            this.showToast('Paused reading');
        }
    }

    resume() {
        if (this.synth.speaking && this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            if (this.pauseButton) {
                this.pauseButton.textContent = 'Pause';
            }
            this.showToast('Resumed reading');
        }
    }

    stop() {
        this.isPaused = false;
        this.synth.cancel();
        
        if (this.readButton) this.readButton.disabled = false;
        if (this.pauseButton) {
            this.pauseButton.disabled = true;
            this.pauseButton.textContent = 'Pause';
        }
        if (this.stopReadButton) this.stopReadButton.disabled = true;
        
        this.currentUtterance = null;
    }

    updateRate() {
        if (this.rateValue && this.rateRange) {
            this.rateValue.textContent = this.rateRange.value;
        }
    }

    updatePitch() {
        if (this.pitchValue && this.pitchRange) {
            this.pitchValue.textContent = this.pitchRange.value;
        }
    }

    updateVolume() {
        if (this.volumeValue && this.volumeRange) {
            this.volumeValue.textContent = this.volumeRange.value;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize TTS
const tts = new TextToSpeech();

// Export for use in other modules
export default tts;
export { TextToSpeech };
