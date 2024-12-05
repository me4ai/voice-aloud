// Import all modules
import auth from './auth.js';
import recorder from './recording.js';
import tts from './tts.js';
import { CONFIG } from './config.js';

// Initialize UI elements
document.addEventListener('DOMContentLoaded', () => {
    // Setup PWA install prompt
    let deferredPrompt;
    const installButton = document.querySelector('.install-button');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installButton.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });

    // Initialize toast notifications
    window.showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
            document.body.removeChild(toast);
        }, 3000);
    };

    // Setup drag and drop
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('highlight');
        }

        function unhighlight(e) {
            dropZone.classList.remove('highlight');
        }

        dropZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }

        function handleFiles(files) {
            ([...files]).forEach(uploadFile);
        }

        function uploadFile(file) {
            if (file.type.startsWith('audio/')) {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onload = async () => {
                    try {
                        const audioBuffer = await new AudioContext().decodeAudioData(reader.result);
                        // Process the audio file
                        showToast('Audio file uploaded successfully!', 'info');
                    } catch (error) {
                        showToast('Error processing audio file', 'error');
                    }
                };
            } else {
                showToast('Please upload an audio file', 'warning');
            }
        }
    }

    // Initialize premium features
    const premiumButtons = document.querySelectorAll('.premium-btn');
    premiumButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!auth.currentUser) {
                showToast('Please login to access premium features', 'warning');
                return;
            }
            if (!auth.currentUser.isPremium) {
                const pricingModal = document.getElementById('pricingModal');
                pricingModal.style.display = 'block';
            }
        });
    });

    // Setup service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }
});
