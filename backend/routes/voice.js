const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

// Text to Speech - convert text to audio
router.post('/tts', voiceController.textToSpeech);

// Text to Speech Stream - stream audio as it's generated
router.post('/tts/stream', voiceController.textToSpeechStream);

// Get available voices
router.get('/voices', voiceController.getVoices);

// Health check
router.get('/health', voiceController.healthCheck);

module.exports = router;
