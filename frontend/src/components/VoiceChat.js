import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Fade,
  Collapse,
  Alert,
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
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const {
    isRecording,
    transcript,
    interimTranscript,
    recordingError,
    isPlaying,
    isTTSLoading,
    playbackError,
    startRecording,
    stopRecording,
    speak,
    stopPlayback,
    clearTranscript,
    isSupported,
    fullTranscript
  } = useVoiceChat(currentLanguage);

  const [showTranscript, setShowTranscript] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastSpokenMessage, setLastSpokenMessage] = useState(null);

  // Auto-speak operator responses when enabled
  useEffect(() => {
    if (
      autoSpeak &&
      voiceEnabled &&
      lastOperatorMessage &&
      lastOperatorMessage !== lastSpokenMessage
    ) {
      speak(lastOperatorMessage, currentLanguage);
      setLastSpokenMessage(lastOperatorMessage);
    }
  }, [lastOperatorMessage, autoSpeak, voiceEnabled, speak, currentLanguage, lastSpokenMessage]);

  // Notify parent of transcript changes
  useEffect(() => {
    if (onTranscript && fullTranscript) {
      onTranscript(fullTranscript);
    }
  }, [fullTranscript, onTranscript]);

  // Handle recording toggle
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setShowTranscript(true);
    } else {
      clearTranscript();
      startRecording();
      setShowTranscript(true);
    }
  }, [isRecording, stopRecording, startRecording, clearTranscript]);

  // Handle sending the transcript as a message
  const handleSendTranscript = useCallback(() => {
    if (transcript && onSendMessage) {
      onSendMessage(transcript);
      clearTranscript();
      setShowTranscript(false);
    }
  }, [transcript, onSendMessage, clearTranscript]);

  // Handle keyboard shortcut (Enter to send)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !isRecording && transcript) {
        handleSendTranscript();
      }
    };

    if (showTranscript) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showTranscript, isRecording, transcript, handleSendTranscript]);

  // Toggle voice enabled
  const handleToggleVoice = useCallback(() => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    if (!newValue && isPlaying) {
      stopPlayback();
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
            <IconButton size="small" onClick={stopPlayback}>
              <Stop fontSize="small" />
            </IconButton>
          </Box>
        </Fade>
      )}

      {/* Main Voice Button */}
      <Tooltip title={isRecording ? t('voice.stopRecording') : t('voice.startRecording')}>
        <IconButton
          onClick={handleToggleRecording}
          disabled={disabled || isPlaying}
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

      {/* Recording Status */}
      {isRecording && (
        <Fade in>
          <Chip
            icon={<RecordVoiceOver />}
            label={t('voice.listening')}
            color="error"
            size="small"
            sx={{ animation: `${pulse} 1.5s infinite` }}
          />
        </Fade>
      )}

      {/* Transcript Panel */}
      <Collapse in={showTranscript && (fullTranscript || recordingError)}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 1,
            p: 2,
            maxHeight: 200,
            overflow: 'auto',
            backgroundColor: isRecording ? 'rgba(211, 47, 47, 0.05)' : 'background.paper'
          }}
        >
          {recordingError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {recordingError}
            </Alert>
          ) : null}

          {fullTranscript && (
            <>
              <Typography variant="caption" color="textSecondary" gutterBottom>
                {t('voice.transcript')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {transcript}
                {interimTranscript && (
                  <Typography component="span" color="textSecondary">
                    {interimTranscript}
                  </Typography>
                )}
              </Typography>

              {!isRecording && transcript && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label={t('voice.send')}
                    color="primary"
                    onClick={handleSendTranscript}
                    sx={{ cursor: 'pointer' }}
                  />
                  <Chip
                    label={t('voice.clear')}
                    variant="outlined"
                    onClick={() => {
                      clearTranscript();
                      setShowTranscript(false);
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Collapse>

      {/* Playback Error */}
      {playbackError && (
        <Fade in>
          <Alert severity="warning" sx={{ ml: 1 }}>
            {playbackError}
          </Alert>
        </Fade>
      )}
    </Box>
  );
}

export default VoiceChat;
