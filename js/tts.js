class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.isPaused = false;
        
        // UI Elements
        this.voiceSelect = document.getElementById('voiceSelect');
        this.rateRange = document.getElementById('rateRange');
        this.pitchRange = document.getElementById('pitchRange');
        this.rateValue = document.getElementById('rateValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.readButton = document.getElementById('readButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.stopReadButton = document.getElementById('stopReadButton');
        this.textOutput = document.getElementById('textOutput');
        
        // Bind methods
        this.loadVoices = this.loadVoices.bind(this);
        this.speak = this.speak.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.stop = this.stop.bind(this);
        this.updateVoiceList = this.updateVoiceList.bind(this);
        
        // Initialize
        this.init();
    }

    async init() {
        // Load voices
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.loadVoices;
        }
        
        // Add event listeners
        this.voiceSelect.addEventListener('change', () => this.updatePreview());
        this.rateRange.addEventListener('input', (e) => {
            this.rateValue.textContent = e.target.value;
            this.updatePreview();
        });
        this.pitchRange.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
            this.updatePreview();
        });
        
        this.readButton.addEventListener('click', this.speak);
        this.pauseButton.addEventListener('click', () => {
            if (this.isPaused) {
                this.resume();
            } else {
                this.pause();
            }
        });
        this.stopReadButton.addEventListener('click', this.stop);
        
        // Load initial voices
        await this.loadVoices();
    }

    async loadVoices() {
        // Wait for voices to be loaded
        const waitForVoices = new Promise(resolve => {
            let voices = this.synth.getVoices();
            if (voices.length !== 0) {
                resolve(voices);
            } else {
                this.synth.onvoiceschanged = () => {
                    voices = this.synth.getVoices();
                    resolve(voices);
                };
            }
        });

        this.voices = await waitForVoices;
        this.updateVoiceList();
    }

    updateVoiceList() {
        // Clear existing options
        this.voiceSelect.innerHTML = '';
        
        // Get user subscription status
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA));
        const isPremium = user?.subscription === 'premium' || user?.subscription === 'enterprise';
        
        this.voices.forEach(voice => {
            const option = document.createElement('option');
            const isPremiumVoice = voice.localService === false;
            
            option.textContent = `${voice.name} (${voice.lang})${isPremiumVoice ? ' ✨' : ''}`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            option.value = voice.name;
            
            // Disable premium voices for non-premium users
            if (isPremiumVoice && !isPremium) {
                option.disabled = true;
                option.textContent += ' (Premium Only)';
            }
            
            this.voiceSelect.appendChild(option);
        });
        
        // Select default voice
        const defaultVoice = this.voices.find(voice => voice.default);
        if (defaultVoice) {
            this.voiceSelect.value = defaultVoice.name;
        }
    }

    speak() {
        // Stop any ongoing speech
        this.stop();
        
        const text = this.textOutput.value;
        if (!text) {
            this.showToast('Please enter some text to read', 'warning');
            return;
        }
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        const selectedVoice = this.voices.find(voice => voice.name === this.voiceSelect.value);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        // Set parameters
        utterance.rate = parseFloat(this.rateRange.value);
        utterance.pitch = parseFloat(this.pitchRange.value);
        
        // Add event listeners
        utterance.onstart = () => {
            this.readButton.disabled = true;
            this.pauseButton.disabled = false;
            this.stopReadButton.disabled = false;
        };
        
        utterance.onend = () => {
            this.readButton.disabled = false;
            this.pauseButton.disabled = true;
            this.stopReadButton.disabled = true;
            this.isPaused = false;
            this.currentUtterance = null;
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.showToast('Error during speech synthesis', 'error');
            this.stop();
        };
        
        // Store current utterance
        this.currentUtterance = utterance;
        
        // Start speaking
        this.synth.speak(utterance);
    }

    pause() {
        if (this.synth.speaking) {
            this.synth.pause();
            this.isPaused = true;
            this.pauseButton.textContent = 'Resume';
        }
    }

    resume() {
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.pauseButton.textContent = 'Pause';
        }
    }

    stop() {
        this.synth.cancel();
        this.isPaused = false;
        this.currentUtterance = null;
        
        // Reset UI
        this.readButton.disabled = false;
        this.pauseButton.disabled = true;
        this.stopReadButton.disabled = true;
        this.pauseButton.textContent = 'Pause';
    }

    updatePreview() {
        // If currently speaking, update the speech with new settings
        if (this.currentUtterance) {
            const currentText = this.currentUtterance.text;
            this.stop();
            this.textOutput.value = currentText;
            this.speak();
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

// Initialize TTS
const tts = new TextToSpeech();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextToSpeech;
}
