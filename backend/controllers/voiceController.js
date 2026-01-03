const elevenLabsService = require('../services/elevenLabsService');

/**
 * Convert text to speech
 * POST /api/voice/tts
 * Body: { text: string, language: 'vi' | 'en' }
 */
exports.textToSpeech = async (req, res) => {
  try {
    const { text, language = 'vi' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Limit text length to prevent abuse
    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text is too long. Maximum 5000 characters allowed.'
      });
    }

    const audioBuffer = await elevenLabsService.textToSpeech(text, language);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'inline; filename="speech.mp3"'
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error in textToSpeech controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert text to speech'
    });
  }
};

/**
 * Stream text to speech
 * POST /api/voice/tts/stream
 * Body: { text: string, language: 'vi' | 'en' }
 */
exports.textToSpeechStream = async (req, res) => {
  try {
    const { text, language = 'vi' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text is too long. Maximum 5000 characters allowed.'
      });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked'
    });

    const stream = await elevenLabsService.textToSpeechStream(text, language);
    stream.pipe(res);
  } catch (error) {
    console.error('Error in textToSpeechStream controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stream text to speech'
    });
  }
};

/**
 * Get available voices
 * GET /api/voice/voices
 */
exports.getVoices = async (req, res) => {
  try {
    const voices = await elevenLabsService.getVoices();
    res.json({
      success: true,
      data: voices
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voices'
    });
  }
};

/**
 * Health check for voice service
 * GET /api/voice/health
 */
exports.healthCheck = async (req, res) => {
  res.json({
    success: true,
    service: 'voice',
    status: 'operational'
  });
};
