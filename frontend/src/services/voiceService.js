import api from './api';

/**
 * Voice Service - handles speech-to-text (STT) and text-to-speech (TTS)
 */
const voiceService = {
  /**
   * Convert text to speech using ElevenLabs API
   * @param {string} text - Text to convert to speech
   * @param {string} language - Language code ('vi' or 'en')
   * @returns {Promise<Blob>} - Audio blob
   */
  textToSpeech: async (text, language = 'vi') => {
    const response = await api.post('/voice/tts',
      { text, language },
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Play audio from text using TTS
   * @param {string} text - Text to speak
   * @param {string} language - Language code
   * @returns {Promise<HTMLAudioElement>} - Audio element
   */
  speak: async (text, language = 'vi') => {
    try {
      const audioBlob = await voiceService.textToSpeech(text, language);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Clean up object URL after playback
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      return audio;
    } catch (error) {
      console.error('Error playing TTS audio:', error);
      throw error;
    }
  },

  /**
   * Create a speech recognition instance
   * @param {string} language - Language code ('vi' or 'en')
   * @returns {SpeechRecognition} - Speech recognition instance
   */
  createSpeechRecognition: (language = 'vi') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language based on parameter
    recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';

    return recognition;
  },

  /**
   * Check if speech recognition is supported
   * @returns {boolean}
   */
  isSpeechRecognitionSupported: () => {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /**
   * Check if audio playback is supported
   * @returns {boolean}
   */
  isAudioSupported: () => {
    return typeof Audio !== 'undefined';
  },

  /**
   * Get microphone permission status
   * @returns {Promise<string>} - 'granted', 'denied', or 'prompt'
   */
  getMicrophonePermission: async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch {
      // Fallback for browsers that don't support permissions API
      return 'prompt';
    }
  },

  /**
   * Request microphone access
   * @returns {Promise<MediaStream>}
   */
  requestMicrophoneAccess: async () => {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  },

  /**
   * Health check for voice service
   * @returns {Promise}
   */
  healthCheck: () => {
    return api.get('/voice/health');
  }
};

export default voiceService;
