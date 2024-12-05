require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const path = require('path');
const AWS = require('aws-sdk');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/voices', require('./routes/voices'));
app.use('/api/exports', require('./routes/exports'));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('start-transcription', async (data) => {
        // Handle real-time transcription
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
