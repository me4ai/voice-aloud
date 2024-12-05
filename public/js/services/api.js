const API_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['x-auth-token'] = this.token;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    }

    // Auth endpoints
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        this.setToken(data.token);
        return data;
    }

    async getProfile() {
        return this.request('/auth/profile');
    }

    // Subscription endpoints
    async createSubscription(paymentMethodId, priceId) {
        return this.request('/subscriptions/create', {
            method: 'POST',
            body: JSON.stringify({ paymentMethodId, priceId })
        });
    }

    async cancelSubscription() {
        return this.request('/subscriptions/cancel', {
            method: 'POST'
        });
    }

    async getSubscriptionStatus() {
        return this.request('/subscriptions/status');
    }

    // Voice endpoints
    async getVoices() {
        return this.request('/voices/list');
    }

    async synthesizeSpeech(text, voiceId, settings) {
        return this.request('/voices/synthesize', {
            method: 'POST',
            body: JSON.stringify({ text, voiceId, settings })
        });
    }

    // Export endpoints
    async exportAudio(audioBlob, format, quality, recordingId) {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('format', format);
        formData.append('quality', quality);
        formData.append('recordingId', recordingId);

        return this.request('/exports/audio', {
            method: 'POST',
            headers: {
                'x-auth-token': this.token
            },
            body: formData
        });
    }

    async generateVideo(recordingId, template, customization) {
        return this.request('/exports/video', {
            method: 'POST',
            body: JSON.stringify({ recordingId, template, customization })
        });
    }

    async checkExportStatus(jobId) {
        return this.request(`/exports/status/${jobId}`);
    }
}
