/**
 * ElevenLabs Text-to-Speech Service
 * Converts text to speech using ElevenLabs API with Vietnamese voice
 */

const axios = require('axios');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';

    // Vietnamese voice ID - Native Vietnamese voices from ElevenLabs (Hanoi/Northern accent):
    // - "XBDAUT8ybuJTTCoOLSUj" - MC Anh Đức (male, Hanoi, Northern accent - podcasts, TV)
    // - "jpmnSYDOADVEpZksbLmc" - Nhung (female, young, Hanoi - NOTE: Requires Creator Tier)
    // These are NATIVE Vietnamese speakers with standard Northern accent
    this.defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || 'XBDAUT8ybuJTTCoOLSUj'; // MC Anh Đức

    // Model settings - eleven_turbo_v2_5 is optimized for Vietnamese and non-English languages
    // Released Dec 2024 specifically for Vietnamese support
    this.modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

    // Voice settings optimized for Vietnamese
    this.voiceSettings = {
      stability: 0.35,           // Lower = more natural, expressive (good for Vietnamese tones)
      similarity_boost: 0.80,    // Keep voice consistent
      style: 0.0,                // Style exaggeration - 0 for more native-like sound
      use_speaker_boost: true    // Enhance voice clarity
    };

    if (!this.apiKey) {
      console.warn('[ElevenLabs] API key not configured. TTS service will be unavailable.');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices() {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.data.voices;
    } catch (error) {
      console.error('[ElevenLabs] Error fetching voices:', error.message);
      throw error;
    }
  }

  /**
   * Convert text to speech
   * @param {string} text - Text to convert to speech
   * @param {object} options - Optional settings
   * @param {string} options.voiceId - Voice ID to use
   * @param {number} options.stability - Voice stability (0-1)
   * @param {number} options.similarityBoost - Similarity boost (0-1)
   * @returns {Promise<Buffer>} - Audio buffer (mp3)
   */
  async textToSpeech(text, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    // Sanitize text for ElevenLabs API
    const sanitizedText = this.sanitizeText(text);

    if (sanitizedText.length === 0) {
      throw new Error('Text is empty after sanitization');
    }

    const voiceId = options.voiceId || this.defaultVoiceId;

    // Merge default voice settings with any overrides
    const voiceSettings = {
      ...this.voiceSettings,
      ...(options.stability !== undefined && { stability: options.stability }),
      ...(options.similarityBoost !== undefined && { similarity_boost: options.similarityBoost })
    };

    try {
      console.log(`[ElevenLabs] Converting text to speech (model: ${this.modelId}, lang: vi): "${sanitizedText.substring(0, 50)}..."`);

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: sanitizedText,
          model_id: this.modelId,
          language_code: 'vi',  // Force Vietnamese language
          voice_settings: voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json; charset=utf-8',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      console.log('[ElevenLabs] Successfully generated audio');
      return Buffer.from(response.data);
    } catch (error) {
      // Parse error message if it's a buffer
      let errorMessage = error.message;
      if (error.response?.data) {
        try {
          const errorData = Buffer.isBuffer(error.response.data)
            ? JSON.parse(error.response.data.toString('utf-8'))
            : error.response.data;
          errorMessage = errorData.detail?.message || errorData.detail || JSON.stringify(errorData);
        } catch (e) {
          errorMessage = error.response.data.toString('utf-8');
        }
      }
      console.error('[ElevenLabs] Error generating speech:', errorMessage);

      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      } else if (error.response?.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded');
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid request to ElevenLabs API: ${errorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Sanitize text for ElevenLabs API
   * Removes invalid characters, unpaired surrogates, and normalizes Unicode
   * @param {string} text - Raw text
   * @returns {string} - Sanitized text
   */
  sanitizeText(text) {
    if (!text) return '';

    // First, remove unpaired surrogates (the main cause of the error)
    // This regex matches any lone high surrogate or lone low surrogate
    let cleaned = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, '');

    // Remove ALL emoji and symbols that can cause issues
    // This comprehensive regex covers most emoji ranges
    cleaned = cleaned
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')  // All Supplementary Multilingual Plane symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation Selectors
      .replace(/[\u{E0000}-\u{E007F}]/gu, ''); // Tags

    // Normalize Unicode (NFC form for Vietnamese)
    try {
      cleaned = cleaned.normalize('NFC');
    } catch (e) {
      // If normalization fails, continue with the cleaned text
      console.warn('[ElevenLabs] Unicode normalization failed, continuing with raw text');
    }

    // Remove remaining problematic characters
    cleaned = cleaned
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Remove private use area characters
      .replace(/[\uE000-\uF8FF]/g, '')
      // Remove markdown formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove bullet points
      .replace(/^[•\-]\s*/gm, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Stream text to speech (for longer texts)
   * @param {string} text - Text to convert
   * @param {object} options - Optional settings
   * @returns {Promise<ReadableStream>} - Audio stream
   */
  async textToSpeechStream(text, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = options.voiceId || this.defaultVoiceId;
    const stability = options.stability || 0.5;
    const similarityBoost = options.similarityBoost || 0.75;

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
        {
          text: text,
          model_id: this.modelId,
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'stream'
        }
      );

      return response.data;
    } catch (error) {
      console.error('[ElevenLabs] Error streaming speech:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ElevenLabsService();
