class UI {
    constructor() {
        // Initialize dropzone
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.textOutput = document.getElementById('textOutput');
        
        // Initialize stats
        this.wordCount = document.getElementById('wordCount');
        this.charCount = document.getElementById('charCount');
        
        // Initialize
        this.init();
    }

    init() {
        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Setup text stats
        this.setupTextStats();
        
        // Setup clipboard
        this.setupClipboard();
        
        // Setup PWA install
        this.setupPWA();
    }

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.add('highlight');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => {
                this.dropZone.classList.remove('highlight');
            });
        });

        this.dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFile(file);
            }
        });

        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });
    }

    handleFile(file) {
        if (file.type !== 'text/plain') {
            this.showToast('Please upload a text file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.textOutput.value = e.target.result;
            this.updateTextStats();
        };
        reader.onerror = () => {
            this.showToast('Error reading file', 'error');
        };
        reader.readAsText(file);
    }

    setupTextStats() {
        this.textOutput.addEventListener('input', () => this.updateTextStats());
    }

    updateTextStats() {
        const text = this.textOutput.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        this.wordCount.textContent = `Words: ${words}`;
        this.charCount.textContent = `Characters: ${chars}`;
    }

    setupClipboard() {
        this.dropZone.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            this.textOutput.value = text;
            this.updateTextStats();
        });
    }

    setupPWA() {
        let deferredPrompt;
        const installButton = document.getElementById('installButton');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installButton.style.display = 'block';
        });

        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            const result = await deferredPrompt.prompt();
            console.log(`Install prompt result: ${result.outcome}`);
            
            if (result.outcome === 'accepted') {
                this.showToast('Thank you for installing VoiceFlow Pro!');
            }
            
            deferredPrompt = null;
            installButton.style.display = 'none';
        });
    }

    copyText() {
        const text = this.textOutput.value;
        if (!text) {
            this.showToast('No text to copy', 'warning');
            return;
        }

        navigator.clipboard.writeText(text)
            .then(() => this.showToast('Text copied to clipboard'))
            .catch(() => this.showToast('Failed to copy text', 'error'));
    }

    downloadText() {
        const text = this.textOutput.value;
        if (!text) {
            this.showToast('No text to download', 'warning');
            return;
        }

        const filename = document.getElementById('fileName').value || 'transcript';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearText() {
        if (!this.textOutput.value) {
            this.showToast('Text area is already empty', 'warning');
            return;
        }

        if (confirm('Are you sure you want to clear the text?')) {
            this.textOutput.value = '';
            this.updateTextStats();
            this.showToast('Text cleared');
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

// Initialize UI
const ui = new UI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}

// Add global functions for HTML onclick handlers
window.copyText = () => ui.copyText();
window.downloadText = () => ui.downloadText();
window.clearText = () => ui.clearText();
