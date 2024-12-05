const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const auth = require('../middleware/auth');
const User = require('../models/User');

const polly = new AWS.Polly({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const googleTTS = new TextToSpeechClient();

// Get available voices
router.get('/list', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let voices = [];

        // Basic voices (Web Speech API)
        const basicVoices = speechSynthesis.getVoices();
        voices.push(...basicVoices.map(voice => ({
            id: voice.name,
            name: voice.name,
            language: voice.lang,
            provider: 'browser',
            premium: false
        })));

        // Premium voices (if user has premium subscription)
        if (user.subscription !== 'free') {
            // AWS Polly voices
            const pollyVoices = await polly.describeVoices().promise();
            voices.push(...pollyVoices.Voices.map(voice => ({
                id: `polly-${voice.Id}`,
                name: voice.Name,
                language: voice.LanguageCode,
                provider: 'aws',
                premium: true,
                features: voice.SupportedEngines
            })));

            // Google Cloud voices
            const [googleVoices] = await googleTTS.listVoices({});
            voices.push(...googleVoices.voices.map(voice => ({
                id: `google-${voice.name}`,
                name: voice.name,
                language: voice.languageCodes[0],
                provider: 'google',
                premium: true,
                features: voice.ssmlGender
            })));
        }

        res.json(voices);
    } catch (error) {
        console.error('Voice list error:', error);
        res.status(500).json({ message: 'Could not retrieve voices' });
    }
});

// Generate speech
router.post('/synthesize', auth, async (req, res) => {
    try {
        const { text, voiceId, settings } = req.body;
        const user = await User.findById(req.user.id);

        if (voiceId.startsWith('polly-') && user.subscription !== 'free') {
            // AWS Polly synthesis
            const params = {
                Text: text,
                VoiceId: voiceId.replace('polly-', ''),
                Engine: settings.engine || 'neural',
                OutputFormat: 'mp3'
            };

            const result = await polly.synthesizeSpeech(params).promise();
            res.set('Content-Type', 'audio/mpeg');
            res.send(result.AudioStream);
        } else if (voiceId.startsWith('google-') && user.subscription !== 'free') {
            // Google Cloud synthesis
            const request = {
                input: { text },
                voice: { 
                    name: voiceId.replace('google-', ''),
                    languageCode: settings.language || 'en-US'
                },
                audioConfig: { 
                    audioEncoding: 'MP3',
                    pitch: settings.pitch || 0,
                    speakingRate: settings.speed || 1
                }
            };

            const [response] = await googleTTS.synthesizeSpeech(request);
            res.set('Content-Type', 'audio/mpeg');
            res.send(response.audioContent);
        } else {
            // Free tier - client-side synthesis
            res.status(400).json({ 
                message: 'Please use client-side synthesis for free tier',
                useClientSide: true
            });
        }
    } catch (error) {
        console.error('Speech synthesis error:', error);
        res.status(500).json({ message: 'Speech synthesis failed' });
    }
});

module.exports = router;
