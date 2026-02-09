import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Fade,
  Chip,
  keyframes
} from '@mui/material';
import {
  Mic,
  MicOff,
  Stop,
  VolumeUp,
  VolumeOff,
  GraphicEq,
  RecordVoiceOver
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useVoiceChat } from '../hooks/useVoiceChat';

// Pulse animation for recording indicator
const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(211, 47, 47, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
  }
`;

// Wave animation for speaking indicator
const wave = keyframes`
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
`;

function VoiceChat({
  onTranscript,
  onSendMessage,
  autoSpeak = true,
  lastOperatorMessage = null,
  disabled = false
}) {
  const { t } = useTranslation();

  const {
    isRecording,
    transcript,
    interimTranscript,
    recordingError,
    isPlaying,
    isSpeaking,
    isTTSLoading,
    startRecording,
    stopRecording,
    speak,
    stopPlayback,
    clearTranscript,
    isSupported,
    fullTranscript
  } = useVoiceChat('vi'); // Chỉ hỗ trợ tiếng Việt

  const [voiceEnabled, setVoiceEnabled] = useState(false); // Mặc định tắt voice
  const [hasUsedVoice, setHasUsedVoice] = useState(false); // Track xem user đã dùng voice chưa
  const [lastSpokenMessage, setLastSpokenMessage] = useState(null);
  const lastTranscriptRef = useRef('');
  const autoSendTimeoutRef = useRef(null);
  const isManualStop = useRef(false);
  const wasSpeaking = useRef(false);

  // Auto-speak operator responses when enabled AND user has used voice before
  useEffect(() => {
    if (
      autoSpeak &&
      voiceEnabled &&
      hasUsedVoice && // Chỉ tự động đọc nếu người dùng đã sử dụng voice
      lastOperatorMessage &&
      lastOperatorMessage !== lastSpokenMessage
    ) {
      speak(lastOperatorMessage, 'vi');
      setLastSpokenMessage(lastOperatorMessage);
    }
  }, [lastOperatorMessage, autoSpeak, voiceEnabled, hasUsedVoice, speak, lastSpokenMessage]);

  // Handle auto-restart of recording after speaking finishes
  useEffect(() => {
    if (wasSpeaking.current && !isSpeaking) {
      // Just finished speaking
      if (voiceEnabled && !isManualStop.current) {
        startRecording();
      }
    }
    wasSpeaking.current = isSpeaking;
  }, [isSpeaking, voiceEnabled, startRecording]);

  // Auto-send transcript when recording stops (realtime mode)
  useEffect(() => {
    if (!isRecording && transcript && transcript !== lastTranscriptRef.current) {
      // Clear any existing timeout
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }

      // Auto-send immediately when recording stops
      autoSendTimeoutRef.current = setTimeout(() => {
        if (transcript && onSendMessage) {
          onSendMessage(transcript);
          lastTranscriptRef.current = transcript;
          clearTranscript();
        }
      }, 300); // Small delay to ensure final transcript is captured
    }

    return () => {
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, [isRecording, transcript, onSendMessage, clearTranscript]);

  // Notify parent of transcript changes (for input field sync)
  useEffect(() => {
    if (onTranscript && fullTranscript) {
      onTranscript(fullTranscript);
    }
  }, [fullTranscript, onTranscript]);

  // Handle recording toggle
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      isManualStop.current = true;
      stopRecording();
    } else {
      // Stop playback if playing — but keep voice mode active
      // (user is interrupting to ask a new question, not disabling voice)
      if (isPlaying || isSpeaking) {
        stopPlayback();
      }
      isManualStop.current = false;
      lastTranscriptRef.current = '';
      clearTranscript();
      
      // Đánh dấu người dùng đã sử dụng voice và bật voice mode
      setHasUsedVoice(true);
      setVoiceEnabled(true);
      
      startRecording();
    }
  }, [isRecording, isPlaying, isSpeaking, stopRecording, startRecording, stopPlayback, clearTranscript]);

  // Handle stop playback manually (skip current audio, but keep voice mode active)
  const handleStopPlayback = useCallback(() => {
    stopPlayback();
    // Don't set isManualStop — user just wants to skip current audio,
    // not disable the voice conversation flow
  }, [stopPlayback]);

  // Toggle voice enabled
  const handleToggleVoice = useCallback(() => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    if (!newValue) {
      isManualStop.current = true;
      if (isPlaying) {
        stopPlayback();
      }
    } else {
      // Khi bật voice, đánh dấu user đã sử dụng voice
      setHasUsedVoice(true);
    }
  }, [voiceEnabled, isPlaying, stopPlayback]);

  if (!isSupported) {
    return (
      <Tooltip title={t('voice.notSupported')}>
        <span>
          <IconButton disabled>
            <MicOff color="disabled" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Voice Enable/Disable Toggle */}
      <Tooltip title={voiceEnabled ? t('voice.disableVoice') : t('voice.enableVoice')}>
        <IconButton
          onClick={handleToggleVoice}
          size="small"
          color={voiceEnabled ? 'primary' : 'default'}
        >
          {voiceEnabled ? <VolumeUp /> : <VolumeOff />}
        </IconButton>
      </Tooltip>

      {/* TTS Loading/Playing Indicator */}
      {(isTTSLoading || isPlaying) && voiceEnabled && (
        <Fade in>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isTTSLoading ? (
              <CircularProgress size={20} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 20, gap: '2px' }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 3,
                      height: '100%',
                      backgroundColor: 'primary.main',
                      animation: `${wave} 0.5s ease-in-out infinite`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </Box>
            )}
            <IconButton size="small" onClick={handleStopPlayback}>
              <Stop fontSize="small" />
            </IconButton>
          </Box>
        </Fade>
      )}

      {/* Main Voice Button */}
      <Tooltip title={isRecording ? t('voice.stopRecording') : t('voice.startRecording')}>
        <IconButton
          onClick={handleToggleRecording}
          disabled={disabled}
          sx={{
            backgroundColor: isRecording ? 'error.main' : 'primary.main',
            color: 'white',
            width: 48,
            height: 48,
            animation: isRecording ? `${pulse} 1.5s infinite` : 'none',
            '&:hover': {
              backgroundColor: isRecording ? 'error.dark' : 'primary.dark'
            },
            '&:disabled': {
              backgroundColor: 'grey.300'
            }
          }}
        >
          {isRecording ? <GraphicEq /> : <Mic />}
        </IconButton>
      </Tooltip>

      {/* Recording Status with Live Transcript */}
      {isRecording && (
        <Fade in>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<RecordVoiceOver />}
              label={t('voice.listening')}
              color="error"
              size="small"
              sx={{ animation: `${pulse} 1.5s infinite` }}
            />
            {fullTranscript && (
              <Typography
                variant="body2"
                sx={{
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                "{fullTranscript}"
              </Typography>
            )}
          </Box>
        </Fade>
      )}

      {/* Error Display */}
      {recordingError && (
        <Fade in>
          <Typography variant="caption" color="error" sx={{ ml: 1 }}>
            {recordingError}
          </Typography>
        </Fade>
      )}
    </Box>
  );
}

export default VoiceChat;
