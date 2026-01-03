import { useState, useRef, useCallback, useEffect } from 'react';
import voiceService from '../services/voiceService';

/**
 * Custom hook for voice chat functionality
 * Handles speech recognition (STT) and text-to-speech (TTS)
 */
export function useVoiceChat(language = 'vi') {
  // State for recording
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingError, setRecordingError] = useState(null);

  // State for playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  // State for TTS loading
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  // State for speaking status (queue processing)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check browser support
  const isSupported = voiceService.isSpeechRecognitionSupported();

  /**
   * Initialize speech recognition
   */
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    try {
      const recognition = voiceService.createSpeechRecognition(language);

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingError(null);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);

        switch (event.error) {
          case 'not-allowed':
            setRecordingError('Microphone access denied. Please enable microphone permissions.');
            break;
          case 'no-speech':
            setRecordingError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setRecordingError('No microphone found. Please check your device.');
            break;
          case 'network':
            setRecordingError('Network error. Please check your connection.');
            break;
          default:
            setRecordingError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      return recognition;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setRecordingError('Failed to initialize speech recognition');
      return null;
    }
  }, [language, isSupported]);

  /**
   * Start voice recording
   */
  const startRecording = useCallback(async () => {
    setRecordingError(null);
    setTranscript('');
    setInterimTranscript('');

    // Stop any ongoing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }

    // Also reset speaking state if we force start recording
    setIsSpeaking(false);
    audioQueueRef.current = [];

    // Request microphone access first
    try {
      await voiceService.requestMicrophoneAccess();
    } catch (error) {
      setRecordingError('Microphone access denied. Please enable microphone permissions.');
      return;
    }

    // Initialize and start recognition
    recognitionRef.current = initRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setRecordingError('Failed to start recording');
      }
    }
  }, [initRecognition]);

  /**
   * Stop voice recording
   */
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  /**
   * Process audio queue
   */
  const processAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    setIsSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const { text, lang } = audioQueueRef.current[0];

      try {
        setIsTTSLoading(true);
        const audioBlob = await voiceService.textToSpeech(text, lang);
        setIsTTSLoading(false);

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        setIsPlaying(true);

        await new Promise((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = reject;
          audio.play().catch(reject);
        });

        setIsPlaying(false);
      } catch (error) {
        console.error('Error playing audio:', error);
        setPlaybackError('Failed to play audio response');
        setIsPlaying(false);
        setIsTTSLoading(false);
      }

      audioQueueRef.current.shift();
    }

    isProcessingQueueRef.current = false;
    setIsSpeaking(false);
  }, []);

  /**
   * Speak text using TTS
   */
  const speak = useCallback((text, lang = language) => {
    if (!text) return;

    setPlaybackError(null);
    audioQueueRef.current.push({ text, lang });
    processAudioQueue();
  }, [language, processAudioQueue]);

  /**
   * Stop playback
   */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    audioQueueRef.current = [];
    setIsPlaying(false);
    setIsSpeaking(false);
    setIsTTSLoading(false);
  }, []);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update recognition language when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    }
  }, [language]);

  return {
    // Recording state
    isRecording,
    transcript,
    interimTranscript,
    recordingError,

    // Playback state
    isPlaying,
    isSpeaking,
    isTTSLoading,
    playbackError,

    // Actions
    startRecording,
    stopRecording,
    speak,
    stopPlayback,
    clearTranscript,

    // Utils
    isSupported,
    fullTranscript: transcript + interimTranscript
  };
}

export default useVoiceChat;
