class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.visualizer = document.getElementById('audioVisualizer');
        this.deviceInfo = document.getElementById('deviceInfo');
        this.recordingTime = document.getElementById('recordingTime');
        
        // Bind UI elements
        this.startButton = document.getElementById('startButton');
        this.stopButton = document.getElementById('stopButton');
        
        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
        this.setupVisualizer = this.setupVisualizer.bind(this);
        
        // Add event listeners
        this.startButton.addEventListener('click', this.startRecording);
        this.stopButton.addEventListener('click', this.stopRecording);
    }

    async startRecording() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Update device info
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevice = devices.find(device => device.kind === 'audioinput');
            this.deviceInfo.textContent = `Using: ${audioDevice.label || 'Microphone'}`;
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream);
            
            // Setup audio processing
            this.setupVisualizer();
            
            // Handle data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.startTime = Date.now();
            
            // Update UI
            this.startButton.disabled = true;
            this.stopButton.disabled = false;
            
            // Start timer
            this.timerInterval = setInterval(this.updateTimer, 1000);
            
            // Show recording indicator
            this.showToast('Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showToast('Error starting recording: ' + error.message, 'error');
        }
    }

    stopRecording() {
        if (!this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Stop all tracks
        this.stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        clearInterval(this.timerInterval);
        
        // Update UI
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        
        // Process recording
        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            this.audioChunks = [];
            
            // Save recording
            this.saveRecording(audioBlob);
            
            // Show completion message
            this.showToast('Recording saved');
        };
    }

    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        this.recordingTime.textContent = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    setupVisualizer() {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(this.stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const canvas = this.visualizer;
        const canvasCtx = canvas.getContext('2d');
        
        const draw = () => {
            if (!this.isRecording) return;
            
            requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    async saveRecording(blob) {
        try {
            // Create object URL for preview
            const audioUrl = URL.createObjectURL(blob);
            
            // Get current user and subscription status
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA));
            const isPremium = user?.subscription === 'premium' || user?.subscription === 'enterprise';
            
            // Create recording object
            const recording = {
                id: Date.now(),
                url: audioUrl,
                timestamp: new Date().toISOString(),
                duration: this.recordingTime.textContent,
                transcription: '',
                isPremium
            };
            
            // Save to local storage
            const recordings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECORDINGS) || '[]');
            recordings.unshift(recording);
            localStorage.setItem(CONFIG.STORAGE_KEYS.RECORDINGS, JSON.stringify(recordings));
            
            // Update UI
            this.updateRecordingsList();
            
            // Start transcription if premium
            if (isPremium) {
                this.transcribeAudio(blob, recording.id);
            }
        } catch (error) {
            console.error('Error saving recording:', error);
            this.showToast('Error saving recording', 'error');
        }
    }

    updateRecordingsList() {
        const recordings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECORDINGS) || '[]');
        const recordingsList = document.getElementById('recordingsList');
        
        recordingsList.innerHTML = recordings.map(recording => `
            <div class="recording-item">
                <div class="recording-info">
                    <span class="recording-time">${new Date(recording.timestamp).toLocaleString()}</span>
                    <span class="recording-duration">${recording.duration}</span>
                    ${recording.isPremium ? '<span class="premium-badge">✨</span>' : ''}
                </div>
                <div class="recording-controls">
                    <audio src="${recording.url}" controls></audio>
                    <button onclick="deleteRecording(${recording.id})" class="delete-btn">🗑️</button>
                </div>
                ${recording.transcription ? `
                    <div class="transcription">
                        <p>${recording.transcription}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async transcribeAudio(blob, recordingId) {
        try {
            // In GitHub Pages version, we'll simulate transcription
            setTimeout(() => {
                const recordings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.RECORDINGS) || '[]');
                const index = recordings.findIndex(r => r.id === recordingId);
                
                if (index !== -1) {
                    recordings[index].transcription = 'This is a simulated transcription for the GitHub Pages demo. In the full version, this would be actual transcribed text.';
                    localStorage.setItem(CONFIG.STORAGE_KEYS.RECORDINGS, JSON.stringify(recordings));
                    this.updateRecordingsList();
                }
            }, 2000);
        } catch (error) {
            console.error('Error transcribing audio:', error);
            this.showToast('Error transcribing audio', 'error');
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

// Initialize recorder
const recorder = new AudioRecorder();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioRecorder;
}
