const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    transcript: String,
    audioUrl: String,
    videoUrl: String,
    duration: Number,
    language: String,
    voiceSettings: {
        voice: String,
        speed: Number,
        pitch: Number,
        emotions: [String],
        backgroundMusic: String
    },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    exports: [{
        type: String,
        format: String,
        url: String,
        createdAt: Date
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Recording', recordingSchema);
