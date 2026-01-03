const fetch = require('node-fetch');

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_d7b756414d1df0d77dd9e0cfd5e94f304a808e455950ce1d';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for different languages
// Using high-quality multilingual voices
const VOICES = {
  vi: 'XB0fDUnXU5powFXDhCwa', // Charlotte - supports Vietnamese
  en: 'EXAVITQu4vr4xnSDxMaL'  // Sarah - English native speaker
};

// Fallback multilingual voice that supports both
const MULTILINGUAL_VOICE = 'XB0fDUnXU5powFXDhCwa';

/**
 * Convert text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code ('vi' or 'en')
 * @returns {Promise<Buffer>} - Audio buffer in MP3 format
 */
async function textToSpeech(text, language = 'vi') {
  try {
    const voiceId = VOICES[language] || MULTILINGUAL_VOICE;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.buffer();
    return audioBuffer;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
}

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} - List of available voices
 */
async function getVoices() {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: 'GET',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices;
  } catch (error) {
    console.error('Error getting voices:', error);
    throw error;
  }
}

/**
 * Stream text to speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code ('vi' or 'en')
 * @returns {Promise<ReadableStream>} - Audio stream
 */
async function textToSpeechStream(text, language = 'vi') {
  try {
    const voiceId = VOICES[language] || MULTILINGUAL_VOICE;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs streaming API error:', response.status, errorText);
      throw new Error(`ElevenLabs streaming API error: ${response.status}`);
    }

    return response.body;
  } catch (error) {
    console.error('Error in textToSpeechStream:', error);
    throw error;
  }
}

module.exports = {
  textToSpeech,
  textToSpeechStream,
  getVoices,
  VOICES
};
