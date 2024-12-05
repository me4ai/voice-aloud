class Transcriber {
    constructor() {
        // Initialize SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.isTranscribing = false;
        this.transcriptOutput = document.getElementById('transcriptOutput');
        this.languageSelect = document.getElementById('languageSelect');
        this.confidenceDisplay = document.getElementById('confidenceDisplay');
        this.offlineIndicator = document.getElementById('offlineIndicator');
        
        // Track continuous transcription
        this.currentParagraph = null;
        this.lastProcessedText = '';
        this.continuousParagraphTimeout = null;
        this.paragraphTimeoutDuration = 2000; // 2 seconds of silence for new paragraph
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        
        // Bind methods
        this.startTranscription = this.startTranscription.bind(this);
        this.stopTranscription = this.stopTranscription.bind(this);
        this.handleResult = this.handleResult.bind(this);
        this.handleError = this.handleError.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize language
        this.setupLanguage();
        
        // Initialize IndexedDB
        this.initializeStorage();
        
        this.isEditing = false;
        this.editTimeout = null;
        
        // Initialize media recorder
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        // Initialize recordings storage
        this.recordings = [];
        this.recordingsList = document.getElementById('recordingsList');
        this.recordingsCount = document.querySelector('.recordings-count');
        
        // Load existing recordings
        this.loadRecordings();
    }

    setupEventListeners() {
        if (!this.recognition) return;
        
        this.recognition.onresult = this.handleResult;
        this.recognition.onerror = this.handleError;
        this.recognition.onend = () => {
            console.log('Recognition ended');
            if (this.isTranscribing) {
                console.log('Restarting recognition...');
                this.restartTranscription();
            }
        };

        // Add online/offline handlers
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOnlineStatus());
        
        // Add language change listener
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', (event) => this.changeLanguage(event));
        }

        // Add export button listeners
        const exportMP3Btn = document.getElementById('exportMP3');
        const generateVideoBtn = document.getElementById('generateVideo');

        if (exportMP3Btn) {
            exportMP3Btn.addEventListener('click', () => {
                if (!this.isTranscribing) {
                    this.exportToMP3();
                } else {
                    this.showToast('Please stop recording first', 'warning');
                }
            });
        }

        if (generateVideoBtn) {
            generateVideoBtn.addEventListener('click', () => {
                if (!this.isTranscribing) {
                    this.generateVideo();
                } else {
                    this.showToast('Please stop recording first', 'warning');
                }
            });
        }
        
        // Initialize media recorder
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };
                this.mediaRecorder.onstop = () => {
                    console.log('Media recorder stopped');
                    this.updateExportButtons(true);
                };
            })
            .catch(error => {
                console.error('Error initializing media recorder:', error);
                this.showError('Failed to access microphone');
            });
    }

    updateExportButtons(enabled) {
        const exportMP3Btn = document.getElementById('exportMP3');
        const generateVideoBtn = document.getElementById('generateVideo');

        if (exportMP3Btn) {
            exportMP3Btn.disabled = !enabled;
        }
        if (generateVideoBtn) {
            generateVideoBtn.disabled = !enabled;
        }
    }

    setupLanguage() {
        // Set default language
        const defaultLang = 'en-US';
        this.recognition.lang = defaultLang;
        
        // Initialize language selector if it exists
        if (this.languageSelect) {
            this.languageSelect.value = defaultLang;
        }
    }

    async initializeStorage() {
        try {
            const request = indexedDB.open('VoiceFlowDB', 1);
            
            request.onerror = () => {
                console.error('Error opening IndexedDB');
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('transcripts')) {
                    db.createObjectStore('transcripts', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('recordings')) {
                    db.createObjectStore('recordings', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
            };
        } catch (error) {
            console.error('IndexedDB initialization error:', error);
        }
    }

    getPreferredLanguage() {
        return localStorage.getItem('preferredLanguage') || navigator.language || 'en-US';
    }

    handleOnlineStatus() {
        const isOnline = navigator.onLine;
        if (this.offlineIndicator) {
            this.offlineIndicator.textContent = isOnline ? '' : '🔴 Offline Mode';
            this.offlineIndicator.style.display = isOnline ? 'none' : 'block';
        }
    }

    async saveTranscript(transcript) {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['transcripts'], 'readwrite');
            const store = transaction.objectStore('transcripts');
            
            const transcriptData = {
                text: transcript,
                timestamp: new Date().toISOString(),
                language: this.recognition.lang
            };

            await store.add(transcriptData);
        } catch (error) {
            console.error('Error saving transcript:', error);
        }
    }

    restartTranscription() {
        if (this.isTranscribing) {
            console.log('Restarting transcription...');
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error restarting transcription:', error);
                this.handleError(error);
            }
        }
    }

    updateUI() {
        if (this.languageSelect) {
            this.languageSelect.disabled = this.isTranscribing;
        }
        
        // Update transcription button state
        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) {
            transcribeBtn.textContent = this.isTranscribing ? 'Stop' : 'Start';
            transcribeBtn.classList.toggle('active', this.isTranscribing);
        }
    }

    showError(message) {
        console.error(message);
        this.showToast(message, 'error');
        
        // Update UI to show error state
        const errorDisplay = document.getElementById('errorDisplay');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
            setTimeout(() => {
                errorDisplay.style.display = 'none';
            }, 5000);
        }
    }

    initializeLanguageSelector() {
        if (!this.languageSelect) return;

        // Clear existing options
        this.languageSelect.innerHTML = '';

        // Add language options
        Object.entries(this.languages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            this.languageSelect.appendChild(option);
        });

        // Set default language
        this.languageSelect.value = this.recognition.lang;
    }

    changeLanguage(event) {
        const newLang = event.target.value;
        this.recognition.lang = newLang;
        
        // Restart transcription if it's running
        if (this.isTranscribing) {
            this.stopTranscription();
            this.startTranscription();
        }
        
        this.showToast(`Language changed to ${this.languages[newLang]}`);
    }

    startTranscription() {
        if (!this.recognition || this.isTranscribing) return;
        
        try {
            console.log('Starting transcription...');
            this.recognition.start();
            this.isTranscribing = true;
            this.updateUI();
            this.showToast('Transcription started');
            
            // Reset audio chunks and start media recorder
            this.audioChunks = [];
            if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
                this.mediaRecorder.start();
                this.updateExportButtons(false);
            }
        } catch (error) {
            console.error('Error starting transcription:', error);
            this.handleError(error);
        }
    }

    stopTranscription() {
        if (!this.recognition || !this.isTranscribing) return;
        
        try {
            console.log('Stopping transcription...');
            this.recognition.stop();
            this.isTranscribing = false;
            this.updateUI();
            
            // Save recording
            if (this.mediaRecorder && this.audioChunks.length > 0) {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
                const transcript = this.currentParagraph ? this.currentParagraph.textContent : '';
                this.saveRecording(audioBlob, transcript);
            }
            
            if (this.currentParagraph) {
                const cleanedText = this.cleanupText(this.currentParagraph.textContent);
                this.currentParagraph.textContent = cleanedText;
            }
            
            this.showToast('Transcription stopped');
        } catch (error) {
            console.error('Error stopping transcription:', error);
            this.handleError(error);
        }
    }

    handleError(event) {
        console.error('Recognition error:', event.error);
        let errorMessage = 'Recognition error occurred';
        
        switch (event.error) {
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                this.isTranscribing = false;
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Please try speaking again.';
                break;
            case 'network':
                errorMessage = 'Network error occurred. Please check your connection.';
                break;
            case 'aborted':
                errorMessage = 'Recording was aborted';
                break;
        }
        
        this.showError(errorMessage);
        this.updateUI();
    }

    handleResult(event) {
        if (!this.transcriptOutput) return;
        
        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0;
        
        // Create paragraph if it doesn't exist
        if (!this.currentParagraph) {
            this.currentParagraph = document.createElement('p');
            this.currentParagraph.className = 'final-transcript';
            this.transcriptOutput.appendChild(this.currentParagraph);
        }
        
        // Process results
        const results = Array.from(event.results);
        for (let i = event.resultIndex; i < results.length; i++) {
            const result = results[i];
            const transcript = result[0].transcript.trim();
            const confidence = result[0].confidence;
            
            if (result.isFinal) {
                // Only add if it's not a duplicate of the last processed text
                if (transcript && transcript !== this.lastProcessedText) {
                    // Clean up the text and add proper spacing
                    const cleanText = transcript
                        .replace(/^\s+|\s+$/g, '') // Remove leading/trailing spaces
                        .replace(/\s+/g, ' ') // Normalize spaces
                    
                    if (cleanText) {
                        // Add proper spacing between sentences
                        if (this.currentParagraph.textContent) {
                            // Check if we need to add period
                            const lastChar = this.currentParagraph.textContent.slice(-1);
                            if (!['.', '!', '?'].includes(lastChar)) {
                                this.currentParagraph.textContent += '. ';
                            } else {
                                this.currentParagraph.textContent += ' ';
                            }
                        }
                        
                        // Append the new text
                        this.currentParagraph.textContent += cleanText;
                        this.lastProcessedText = cleanText;
                        
                        // Update confidence
                        highestConfidence = Math.max(highestConfidence, confidence);
                        
                        // Save transcript
                        this.saveTranscript(cleanText);
                        
                        // Reset paragraph timeout
                        if (this.continuousParagraphTimeout) {
                            clearTimeout(this.continuousParagraphTimeout);
                        }
                        
                        this.continuousParagraphTimeout = setTimeout(() => {
                            // Start new paragraph after silence
                            this.currentParagraph = null;
                            this.lastProcessedText = '';
                        }, this.paragraphTimeoutDuration);
                    }
                }
            } else {
                // Handle interim results
                if (transcript && transcript !== this.lastProcessedText) {
                    interimTranscript = transcript;
                }
            }
        }
        
        // Update confidence display
        if (this.confidenceDisplay && highestConfidence > 0) {
            const percentage = Math.round(highestConfidence * 100);
            this.confidenceDisplay.textContent = `Confidence: ${percentage}%`;
            this.confidenceDisplay.style.color = percentage > 80 ? 'green' : percentage > 60 ? 'orange' : 'red';
        }
        
        // Show interim results in a separate element
        const interimElement = document.getElementById('interimTranscript');
        if (interimElement) {
            interimElement.textContent = interimTranscript;
        }
        
        // Keep transcript window size manageable
        while (this.transcriptOutput.children.length > 10) {
            this.transcriptOutput.removeChild(this.transcriptOutput.firstChild);
        }
        
        // Scroll to bottom
        this.transcriptOutput.scrollTop = this.transcriptOutput.scrollHeight;
    }

    async processAudioChunk(blob) {
        if (!this.isTranscribing || !window.Worker) return;
        
        try {
            // Convert blob to array buffer for processing
            const arrayBuffer = await blob.arrayBuffer();
            
            // Process audio data (placeholder for future audio processing)
            console.log('Processing audio chunk:', arrayBuffer.byteLength, 'bytes');
            
            // In the future, we could add:
            // - Voice activity detection
            // - Noise reduction
            // - Audio normalization
            // - Custom speech recognition
        } catch (error) {
            console.error('Error processing audio chunk:', error);
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

    cleanupText(text) {
        if (!text) return '';
        
        return text
            // Fix common speech recognition artifacts
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/(\d+)(?=[a-zA-Z])/g, '$1 ') // Add space between numbers and letters
            .replace(/([a-zA-Z])(?=\d+)/g, '$1 ') // Add space between letters and numbers
            .replace(/([.!?])\s*(?=[A-Z])/g, '$1\n\n') // Add newlines after sentence endings before capitals
            .replace(/([.!?])(?=[a-zA-Z])/g, '$1 ') // Add space after punctuation
            .replace(/\s+([.!?,])/g, '$1') // Remove spaces before punctuation
            .replace(/\s*\n\s*/g, '\n') // Clean up newlines
            .replace(/([^.!?])\s*$/g, '$1.') // Add period if missing at end
            .trim();
    }

    makeTextEditable(element) {
        // Clear any existing edit timeout
        if (this.editTimeout) {
            clearTimeout(this.editTimeout);
        }

        element.contentEditable = true;
        element.focus();
        
        // Add editing class for styling
        element.classList.add('editing');
        
        // Create save and cancel buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'edit-buttons';
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'save-btn';
        saveButton.onclick = () => this.saveEdit(element);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'cancel-btn';
        cancelButton.onclick = () => this.cancelEdit(element);
        
        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(cancelButton);
        element.parentNode.insertBefore(buttonContainer, element.nextSibling);
    }

    saveEdit(element) {
        const cleanedText = this.cleanupText(element.textContent);
        element.textContent = cleanedText;
        this.finalizeEdit(element);
    }

    cancelEdit(element) {
        element.textContent = element.getAttribute('data-original');
        this.finalizeEdit(element);
    }

    finalizeEdit(element) {
        element.contentEditable = false;
        element.classList.remove('editing');
        
        // Remove edit buttons
        const buttonContainer = element.nextSibling;
        if (buttonContainer && buttonContainer.className === 'edit-buttons') {
            buttonContainer.remove();
        }
        
        this.isEditing = false;
    }

    async exportToMP3() {
        if (!this.mediaRecorder || !this.audioChunks.length) {
            this.showToast('No recording available to export', 'warning');
            return;
        }

        try {
            // Combine audio chunks into a single blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
            
            // Create a download link
            const url = URL.createObjectURL(audioBlob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `recording-${timestamp}.mp3`;
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = filename;
            
            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Cleanup
            URL.revokeObjectURL(url);
            this.showToast('MP3 exported successfully');
        } catch (error) {
            console.error('Error exporting MP3:', error);
            this.showToast('Failed to export MP3', 'error');
        }
    }

    async generateVideo() {
        if (!this.transcriptOutput || !this.transcriptOutput.textContent) {
            this.showToast('No transcript available to generate video', 'warning');
            return;
        }

        try {
            // Create canvas for video generation
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1280;
            canvas.height = 720;

            // Setup video recorder
            const stream = canvas.captureStream(30); // 30 FPS
            const videoRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            const videoChunks = [];
            videoRecorder.ondataavailable = (e) => videoChunks.push(e.data);
            videoRecorder.onstop = async () => {
                const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(videoBlob);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `transcript-video-${timestamp}.webm`;

                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);

                this.showToast('Video generated successfully');
            };

            // Start recording
            videoRecorder.start();

            // Get transcript text
            const text = this.transcriptOutput.textContent;
            const words = text.split(' ');
            const wordsPerFrame = 3;
            const frameDelay = 100; // milliseconds

            // Setup canvas style
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Animate text
            let currentIndex = 0;
            const animate = async () => {
                if (currentIndex >= words.length) {
                    videoRecorder.stop();
                    return;
                }

                // Clear canvas
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw current words
                const currentWords = words.slice(currentIndex, currentIndex + wordsPerFrame).join(' ');
                const lines = this.getLines(ctx, currentWords, canvas.width - 100);
                
                lines.forEach((line, i) => {
                    const y = canvas.height/2 - ((lines.length - 1) * 40)/2 + i * 40;
                    ctx.fillStyle = '#000000';
                    ctx.fillText(line, canvas.width/2, y);
                });

                currentIndex += wordsPerFrame;
                await new Promise(resolve => setTimeout(resolve, frameDelay));
                requestAnimationFrame(animate);
            };

            animate();
        } catch (error) {
            console.error('Error generating video:', error);
            this.showToast('Failed to generate video', 'error');
        }
    }

    getLines(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    async loadRecordings() {
        try {
            const recordings = await this.getStoredRecordings();
            this.recordings = recordings;
            this.updateRecordingsList();
        } catch (error) {
            console.error('Error loading recordings:', error);
        }
    }

    async saveRecording(blob, transcript) {
        try {
            const recording = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                duration: this.getRecordingDuration(),
                audioBlob: blob,
                transcript: transcript
            };

            this.recordings.push(recording);
            await this.storeRecording(recording);
            this.updateRecordingsList();
            this.showToast('Recording saved successfully');
        } catch (error) {
            console.error('Error saving recording:', error);
            this.showToast('Failed to save recording', 'error');
        }
    }

    updateRecordingsList() {
        if (!this.recordingsList) return;

        // Update count
        if (this.recordingsCount) {
            this.recordingsCount.textContent = this.recordings.length;
        }

        // Clear current list
        this.recordingsList.innerHTML = '';

        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = '<div class="no-recordings">No recordings yet</div>';
            return;
        }

        // Add recordings
        this.recordings.forEach(recording => {
            const item = document.createElement('div');
            item.className = 'recording-item';
            
            const date = new Date(recording.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            item.innerHTML = `
                <div class="recording-info">
                    <span>${formattedDate}</span>
                    <span>${recording.duration || '00:00'}</span>
                </div>
                <div class="recording-actions">
                    <button class="play-btn" data-id="${recording.id}">
                        Play
                    </button>
                    <button class="download-btn" data-id="${recording.id}">
                        Download
                    </button>
                    <button class="delete-btn" data-id="${recording.id}">
                        Delete
                    </button>
                </div>
            `;

            // Add event listeners
            const playBtn = item.querySelector('.play-btn');
            const downloadBtn = item.querySelector('.download-btn');
            const deleteBtn = item.querySelector('.delete-btn');

            playBtn.addEventListener('click', () => this.playRecording(recording));
            downloadBtn.addEventListener('click', () => this.downloadRecording(recording));
            deleteBtn.addEventListener('click', () => this.deleteRecording(recording.id));

            this.recordingsList.appendChild(item);
        });
    }

    async playRecording(recording) {
        try {
            const audio = new Audio(URL.createObjectURL(recording.audioBlob));
            audio.play();
        } catch (error) {
            console.error('Error playing recording:', error);
            this.showToast('Failed to play recording', 'error');
        }
    }

    async downloadRecording(recording) {
        try {
            const url = URL.createObjectURL(recording.audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${recording.id}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading recording:', error);
            this.showToast('Failed to download recording', 'error');
        }
    }

    async deleteRecording(id) {
        try {
            this.recordings = this.recordings.filter(r => r.id !== id);
            await this.deleteStoredRecording(id);
            this.updateRecordingsList();
            this.showToast('Recording deleted');
        } catch (error) {
            console.error('Error deleting recording:', error);
            this.showToast('Failed to delete recording', 'error');
        }
    }

    getRecordingDuration() {
        // Format duration as MM:SS
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async storeRecording(recording) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        await store.put(recording);
    }

    async getStoredRecordings() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction(['recordings'], 'readonly');
        const store = transaction.objectStore('recordings');
        return await store.getAll();
    }

    async deleteStoredRecording(id) {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        await store.delete(id);
    }
}

// Initialize transcriber
const transcriber = new Transcriber();

// Export for use in other modules
export default transcriber;
export { Transcriber };
