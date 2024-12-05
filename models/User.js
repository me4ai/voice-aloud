const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    subscription: {
        type: String,
        enum: ['free', 'premium', 'enterprise'],
        default: 'free'
    },
    stripeCustomerId: String,
    subscriptionId: String,
    apiKey: String,
    usage: {
        audioMinutes: {
            type: Number,
            default: 0
        },
        exportCount: {
            type: Number,
            default: 0
        },
        videoMinutes: {
            type: Number,
            default: 0
        }
    },
    preferences: {
        defaultVoice: String,
        defaultLanguage: String,
        defaultSpeed: Number,
        defaultPitch: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
