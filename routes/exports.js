const express = require('express');
const router = express.Router();
const multer = require('multer');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Recording = require('../models/Recording');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const upload = multer({ dest: 'uploads/' });

// Export audio
router.post('/audio', auth, upload.single('audio'), async (req, res) => {
    try {
        const { format, quality } = req.body;
        const user = await User.findById(req.user.id);

        if (user.subscription === 'free') {
            return res.status(403).json({ message: 'Premium feature' });
        }

        const outputPath = `exports/${Date.now()}.${format}`;
        const ffmpegProcess = spawn(ffmpeg, [
            '-i', req.file.path,
            '-c:a', format === 'mp3' ? 'libmp3lame' : 'aac',
            '-q:a', quality || '0',
            outputPath
        ]);

        ffmpegProcess.on('close', async (code) => {
            if (code === 0) {
                // Upload to S3
                const s3Upload = await s3.upload({
                    Bucket: 'your-bucket-name',
                    Key: `exports/${user.id}/${outputPath}`,
                    Body: require('fs').createReadStream(outputPath)
                }).promise();

                // Create export record
                const recording = await Recording.findById(req.body.recordingId);
                recording.exports.push({
                    type: 'audio',
                    format,
                    url: s3Upload.Location,
                    createdAt: new Date()
                });
                await recording.save();

                res.json({ url: s3Upload.Location });
            } else {
                res.status(500).json({ message: 'Export failed' });
            }
        });
    } catch (error) {
        console.error('Audio export error:', error);
        res.status(500).json({ message: 'Export failed' });
    }
});

// Generate video
router.post('/video', auth, async (req, res) => {
    try {
        const { recordingId, template, customization } = req.body;
        const user = await User.findById(req.user.id);

        if (user.subscription !== 'enterprise') {
            return res.status(403).json({ message: 'Enterprise feature' });
        }

        const recording = await Recording.findById(recordingId);
        
        // Video generation logic here
        // This would typically involve a video rendering service

        res.json({ message: 'Video generation started', jobId: 'some-job-id' });
    } catch (error) {
        console.error('Video generation error:', error);
        res.status(500).json({ message: 'Video generation failed' });
    }
});

// Check export status
router.get('/status/:jobId', auth, async (req, res) => {
    try {
        // Check status logic here
        res.json({ status: 'processing' });
    } catch (error) {
        console.error('Export status check error:', error);
        res.status(500).json({ message: 'Status check failed' });
    }
});

module.exports = router;
