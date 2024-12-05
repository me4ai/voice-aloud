# VoiceFlow Pro

A premium voice transcription web application with advanced features for audio recording, transcription, and text-to-speech conversion.

## Features

### Basic Features (Free Tier)
- Voice recording with Bluetooth device support
- Basic transcription
- Text-to-speech with standard voices
- Drag & drop text file support
- Clipboard text input

### Premium Features ($9.99/month)
- Premium voice selection
- Voice emotions
- Background music
- MP3/WAV export
- Unlimited recordings

### Enterprise Features ($29.99/month)
- Video generation
- Custom branding
- API access
- Priority support
- Team collaboration

## Tech Stack

### Frontend
- HTML5
- Vanilla JavaScript
- Web Speech API
- MediaRecorder API
- Clipboard API

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication

### Cloud Services
- AWS SDK
- Google Cloud Text-to-Speech
- Stripe Payments

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/me4ai/voice-aloud.git
cd voice-aloud
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
GOOGLE_APPLICATION_CREDENTIALS=path_to_credentials.json
```

4. Start the server:
```bash
npm start
```

5. Visit `http://localhost:3000` in your browser

## Development

For development with auto-reload:
```bash
npm run dev
```

## License

MIT License
