import transcriber from './transcription.js';

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        
        // Get UI elements
        this.visualizer = document.getElementById('audioVisualizer');
        this.deviceInfo = document.getElementById('deviceInfo');
        this.recordingTime = document.getElementById('recordingTime');
        this.startButton = document.getElementById('startButton');
        this.stopButton = document.getElementById('stopButton');
        
        // Initialize UI state
        if (this.stopButton) this.stopButton.disabled = true;
        
        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
        
        // Add event listeners
        if (this.startButton) {
            this.startButton.addEventListener('click', this.startRecording);
        }
        if (this.stopButton) {
            this.stopButton.addEventListener('click', this.stopRecording);
        }
    }

    async startRecording() {
        try {
            if (this.isRecording) {
                console.log('Already recording, stopping first...');
                await this.stopRecording();
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cleanup
            }

            console.log('Starting recording...');
            this.audioChunks = []; // Clear previous chunks
            
            // Start transcription along with recording
            transcriber.startTranscription();
            
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Update device info
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevice = devices.find(device => device.kind === 'audioinput' && device.deviceId === this.stream.getAudioTracks()[0].getSettings().deviceId);
            if (this.deviceInfo) {
                this.deviceInfo.textContent = `Using: ${audioDevice?.label || 'Default Microphone'}`;
            }
            
            // Create and configure MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                ? 'audio/webm;codecs=opus' 
                : 'audio/webm';
                
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType
            });
            
            // Handle data available event
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    // Send chunk to transcriber if size is reasonable
                    if (event.data.size < 1000000) { // Less than 1MB
                        transcriber.processAudioChunk(event.data);
                    }
                }
            });
            
            // Handle recording stop
            this.mediaRecorder.addEventListener('stop', async () => {
                console.log('Recording stopped, processing...');
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Save to IndexedDB
                    await this.saveRecording(audioBlob);
                    
                    // Create audio element to play back recording
                    const audio = document.createElement('audio');
                    audio.src = audioUrl;
                    audio.controls = true;
                    
                    // Add to page
                    const recordings = document.getElementById('recordings');
                    if (recordings) {
                        const recordingItem = document.createElement('div');
                        recordingItem.className = 'recording-item';
                        
                        // Add timestamp
                        const timestamp = document.createElement('div');
                        timestamp.className = 'recording-timestamp';
                        timestamp.textContent = new Date().toLocaleString();
                        recordingItem.appendChild(timestamp);
                        
                        // Add audio player
                        recordingItem.appendChild(audio);
                        
                        // Add download button
                        const downloadBtn = document.createElement('button');
                        downloadBtn.textContent = 'Download';
                        downloadBtn.onclick = () => {
                            const a = document.createElement('a');
                            a.href = audioUrl;
                            a.download = `recording-${new Date().toISOString()}.webm`;
                            a.click();
                        };
                        recordingItem.appendChild(downloadBtn);
                        
                        recordings.insertBefore(recordingItem, recordings.firstChild);
                    }
                    
                    this.showToast('Recording saved successfully!');
                } catch (error) {
                    console.error('Error processing recording:', error);
                    this.showToast('Error saving recording: ' + error.message, 'error');
                }
            });
            
            // Start recording
            this.mediaRecorder.start(1000); // Capture in 1-second chunks
            this.isRecording = true;
            this.startTime = Date.now();
            
            // Update UI
            if (this.startButton) this.startButton.disabled = true;
            if (this.stopButton) this.stopButton.disabled = false;
            
            // Start timer
            this.timerInterval = setInterval(this.updateTimer, 1000);
            
            // Start audio visualization if canvas is available
            if (this.visualizer) {
                this.startVisualization();
            }
            
            console.log('Recording started successfully');
            this.showToast('Recording started');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showToast('Error starting recording: ' + error.message, 'error');
            this.cleanup();
        }
    }

    async saveRecording(blob) {
        if (!window.indexedDB) return;

        try {
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('VoiceFlowDB', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('recordings')) {
                        db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
                    }
                };
            });

            const transaction = db.transaction(['recordings'], 'readwrite');
            const store = transaction.objectStore('recordings');
            
            await store.add({
                blob: blob,
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.startTime,
                type: blob.type
            });
        } catch (error) {
            console.error('Error saving to IndexedDB:', error);
            throw error;
        }
    }

    startVisualization() {
        if (!this.visualizer || !this.stream) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(this.stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const ctx = this.visualizer.getContext('2d');
        
        const draw = () => {
            if (!this.isRecording) return;
            
            requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, this.visualizer.width, this.visualizer.height);
            
            const barWidth = (this.visualizer.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                ctx.fillRect(x, this.visualizer.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    cleanup() {
        // Stop all tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Clear timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Reset UI
        if (this.startButton) this.startButton.disabled = false;
        if (this.stopButton) this.stopButton.disabled = true;
        if (this.recordingTime) this.recordingTime.textContent = '00:00';
        if (this.deviceInfo) this.deviceInfo.textContent = '';
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    async stopRecording() {
        console.log('Stopping recording...');
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            
            // Stop transcription
            transcriber.stopTranscription();
            
            // Cleanup
            this.cleanup();
            
            console.log('Recording stopped successfully');
        }
    }

    updateTimer() {
        if (!this.startTime || !this.recordingTime) return;
        
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

// Initialize recorder
const recorder = new AudioRecorder();

// Export for use in other modules
export default recorder;
export { AudioRecorder };
