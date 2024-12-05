// Initialize services
const api = new ApiService();
const stripeService = new StripeService();
let currentUser = null;

// Authentication state
let isAuthenticated = false;

// Initialize app
async function initializeApp() {
    try {
        // Check authentication
        const token = localStorage.getItem('token');
        if (token) {
            currentUser = await api.getProfile();
            isAuthenticated = true;
            updateUIForUser();
        }

        // Load available voices
        await loadVoices();

        // Initialize UI elements
        initializeUI();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize app');
    }
}

// Initialize UI elements
function initializeUI() {
    // Show/hide premium features based on subscription
    updatePremiumFeatures();
    
    // Initialize Stripe elements if needed
    if (!isAuthenticated || currentUser.subscription === 'free') {
        initializeStripeElements();
    }
}

// Update UI based on user status
function updateUIForUser() {
    const premiumBadge = document.querySelector('.premium-badge');
    if (isAuthenticated) {
        premiumBadge.textContent = currentUser.subscription === 'free' ? 
            'Upgrade to Premium ✨' : 'Premium Member ✨';
    }
}

// Load available voices
async function loadVoices() {
    try {
        const voices = await api.getVoices();
        updateVoiceSelect(voices);
    } catch (error) {
        console.error('Error loading voices:', error);
        showError('Failed to load voices');
    }
}

// Update voice selection dropdown
function updateVoiceSelect(voices) {
    voiceSelect.innerHTML = voices.map(voice => `
        <option value="${voice.id}" 
            ${voice.premium ? 'data-premium="true"' : ''}>
            ${voice.name} (${voice.premium ? '✨ Premium' : 'Basic'})
        </option>
    `).join('');
}

// Premium feature handling
async function handlePremiumFeature(feature) {
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }

    if (currentUser.subscription === 'free') {
        showPricingModal();
        return;
    }

    switch (feature) {
        case 'export':
            await handleExport();
            break;
        case 'emotions':
            await handleEmotions();
            break;
        case 'music':
            await handleBackgroundMusic();
            break;
    }
}

// Handle audio export
async function handleExport() {
    try {
        const format = 'mp3'; // or get from UI
        const quality = 'high'; // or get from UI

        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const response = await api.exportAudio(audioBlob, format, quality);
        
        // Show download link
        showDownloadLink(response.url);
    } catch (error) {
        console.error('Export error:', error);
        showError('Export failed');
    }
}

// Handle voice emotions
async function handleEmotions() {
    // Implementation for voice emotions
}

// Handle background music
async function handleBackgroundMusic() {
    // Implementation for background music
}

// Authentication handlers
async function handleLogin(email, password) {
    try {
        const response = await api.login({ email, password });
        currentUser = response.user;
        isAuthenticated = true;
        updateUIForUser();
        hideAuthModal();
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed');
    }
}

async function handleRegister(email, password, name) {
    try {
        const response = await api.register({ email, password, name });
        currentUser = response.user;
        isAuthenticated = true;
        updateUIForUser();
        hideAuthModal();
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed');
    }
}

// Subscription handlers
async function handleSubscribe(priceId) {
    try {
        const subscription = await stripeService.initializePayment(priceId);
        currentUser = await api.getProfile(); // Refresh user data
        updateUIForUser();
        hidePricingModal();
        showSuccess('Subscription successful!');
    } catch (error) {
        console.error('Subscription error:', error);
        showError('Subscription failed');
    }
}

// UI helpers
function showError(message) {
    // Implementation for error display
}

function showSuccess(message) {
    // Implementation for success display
}

function showDownloadLink(url) {
    // Implementation for download link display
}

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const textOutput = document.getElementById('textOutput');
const deviceInfo = document.getElementById('deviceInfo');
const saveButton = document.getElementById('saveButton');
const fileName = document.getElementById('fileName');
const readButton = document.getElementById('readButton');
const pauseButton = document.getElementById('pauseButton');
const stopReadButton = document.getElementById('stopReadButton');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const dropZone = document.getElementById('dropZone');

let mediaRecorder;
let chunks = [];
let recognition;
let speechSynthesis = window.speechSynthesis;
let speechUtterance = null;
let isRecording = false;

// Initialize speech recognition
function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('Speech recognition not supported in this browser');
        return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    return recognition;
}

// Save text to file
saveButton.addEventListener('click', () => {
    const text = textOutput.value;
    if (!text) {
        alert('No text to save!');
        return;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.value || 'transcript'}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

// Load available voices
async function loadVoices() {
    try {
        const voices = await api.getVoices();
        voiceSelect.innerHTML = voices.map(voice => `
            <option value="${voice.id}" 
                ${voice.premium ? 'data-premium="true"' : ''}>
                ${voice.name} (${voice.premium ? '✨ Premium' : 'Basic'})
            </option>
        `).join('');
    } catch (error) {
        console.error('Error loading voices:', error);
        showError('Failed to load voices');
    }
}

// Initialize voices
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

// Update rate and pitch displays
rateRange.addEventListener('input', () => {
    rateValue.textContent = rateRange.value;
});

pitchRange.addEventListener('input', () => {
    pitchValue.textContent = pitchRange.value;
});

// Text-to-speech functionality
readButton.addEventListener('click', () => {
    const text = textOutput.value;
    if (!text) {
        alert('No text to read!');
        return;
    }

    speechUtterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voices = speechSynthesis.getVoices();
    const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
    if (selectedVoice) {
        speechUtterance.voice = selectedVoice;
    }

    // Set rate and pitch
    speechUtterance.rate = parseFloat(rateRange.value);
    speechUtterance.pitch = parseFloat(pitchRange.value);

    speechUtterance.onend = () => {
        readButton.disabled = false;
        pauseButton.disabled = true;
        stopReadButton.disabled = true;
    };

    readButton.disabled = true;
    pauseButton.disabled = false;
    stopReadButton.disabled = false;
    
    speechSynthesis.speak(speechUtterance);
});

pauseButton.addEventListener('click', () => {
    if (speechSynthesis.speaking) {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            pauseButton.textContent = 'Pause';
        } else {
            speechSynthesis.pause();
            pauseButton.textContent = 'Resume';
        }
    }
});

stopReadButton.addEventListener('click', () => {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        readButton.disabled = false;
        pauseButton.disabled = true;
        stopReadButton.disabled = true;
        pauseButton.textContent = 'Pause';
    }
});

startButton.addEventListener('click', async () => {
    try {
        // Clear previous text when starting new recording
        textOutput.value = '';
        isRecording = true;

        // Get available audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const bluetoothAudioDevices = devices.filter(device =>
            device.kind === 'audioinput' && 
            (device.label.toLowerCase().includes('bluetooth') || 
             device.label.toLowerCase().includes('headset'))
        );

        let selectedDeviceId = null;
        if (bluetoothAudioDevices.length > 0) {
            selectedDeviceId = bluetoothAudioDevices[0].deviceId;
            deviceInfo.textContent = `Using: ${bluetoothAudioDevices[0].label}`;
        } else {
            deviceInfo.textContent = 'No Bluetooth device found, using default microphone';
        }

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
        });

        // Initialize speech recognition
        recognition = initializeSpeechRecognition();
        if (!recognition) {
            textOutput.value = 'Speech recognition is not supported in this browser.';
            return;
        }

        recognition.onresult = (event) => {
            if (!isRecording) return;
            
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                    // Append final transcript to textarea
                    textOutput.value += finalTranscript;
                    // Scroll to bottom
                    textOutput.scrollTop = textOutput.scrollHeight;
                } else {
                    interimTranscript += transcript;
                }
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                // Restart recognition if still recording
                recognition.start();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                textOutput.value += '\nError: ' + event.error + '\n';
            }
        };

        // Start recording and recognition
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        mediaRecorder.start();
        recognition.start();

        // Update UI
        startButton.disabled = true;
        stopButton.disabled = false;

    } catch (error) {
        console.error('Error:', error);
        textOutput.value = `Error: ${error.message}`;
        resetButtons();
    }
});

stopButton.addEventListener('click', () => {
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (recognition) {
            recognition.stop();
        }
    }
    resetButtons();
});

function resetButtons() {
    startButton.disabled = false;
    stopButton.disabled = true;
}

// Drag and drop functionality
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('drag-over');
}

function unhighlight(e) {
    dropZone.classList.remove('drag-over');
}

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
}

// Handle click to paste
dropZone.addEventListener('click', () => {
    navigator.clipboard.readText()
        .then(text => {
            if (text) {
                textOutput.value = text;
                dropZone.innerHTML = `
                    <div class="icon">✓</div>
                    <p>Text pasted successfully!</p>
                    <p>Click to paste new text</p>
                `;
                setTimeout(() => {
                    dropZone.innerHTML = `
                        <div class="icon">📄</div>
                        <p>Drag & drop text file here</p>
                        <p>or click to paste text</p>
                    `;
                }, 2000);
            }
        })
        .catch(err => {
            console.error('Failed to read clipboard:', err);
            alert('Please allow clipboard access or try dragging a file instead.');
        });
});

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type && !file.type.startsWith('text/')) {
        alert('Please drop a text file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        textOutput.value = e.target.result;
        dropZone.innerHTML = `
            <div class="icon">✓</div>
            <p>File loaded successfully!</p>
            <p>Drop another file or click to paste text</p>
        `;
        setTimeout(() => {
            dropZone.innerHTML = `
                <div class="icon">📄</div>
                <p>Drag & drop text file here</p>
                <p>or click to paste text</p>
            `;
        }, 2000);
    };
    reader.onerror = (e) => {
        console.error('Error reading file:', e);
        alert('Error reading file. Please try again.');
    };
    reader.readAsText(file);
}

// Make textOutput readonly but allow pasting
textOutput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    textOutput.value = text;
});

// Premium feature handling
function showPremiumFeature(feature) {
    handlePremiumFeature(feature);
}

function showPricingModal() {
    const modal = document.getElementById('premiumModal');
    modal.style.display = 'flex';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('premiumModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Export functions (premium features)
async function exportAudio(format = 'mp3') {
    handlePremiumFeature('export');
}

async function generateVideo() {
    handlePremiumFeature('video');
}

function addBackgroundMusic() {
    handlePremiumFeature('music');
}

function addEmotions() {
    handlePremiumFeature('emotions');
}

// Premium status check (mock function)
function isPremiumUser() {
    return false; // Change this to true to test premium features
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initializeApp);
