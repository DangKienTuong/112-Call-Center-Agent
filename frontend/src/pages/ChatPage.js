import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Divider,
  Grid
} from '@mui/material';
import {
  Send as SendIcon,
  LocalHospital,
  Phone,
  LocationOn,
  Person,
  Warning,
  CheckCircle,
  Download
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import chatService from '../services/chatService';
import ticketService from '../services/ticketService';
import MessageBubble from '../components/MessageBubble';
import TicketSummary from '../components/TicketSummary';

function ChatPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Add welcome message
    setMessages([
      {
        role: 'operator',
        message: t('chat.welcome'),
        timestamp: new Date()
      }
    ]);
  }, [t]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'reporter',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatService.processMessage({
        message: inputMessage,
        sessionId,
        context: messages
      });

      // Backend returns {success: true, data: {...}}
      // Axios wraps this in response.data
      // So actual data is at response.data.data
      const responseData = response.data.data;

      const operatorMessage = {
        role: 'operator',
        message: responseData.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, operatorMessage]);

      // Update ticket info
      if (responseData.ticketInfo) {
        setTicketInfo(responseData.ticketInfo);
      }

      // Check if we should create a ticket
      if (responseData.shouldCreateTicket && !currentTicket) {
        handleCreateTicket(responseData.ticketInfo);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error(t('chat.errorProcessing'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (info) => {
    try {
      const response = await ticketService.createTicketFromChat({
        ticketInfo: info,
        sessionId
      });

      // Backend returns {success: true, data: {...}}
      const ticketData = response.data.data || response.data;
      
      setCurrentTicket(ticketData);
      toast.success(t('chat.ticketCreated', { id: ticketData.ticketId }));

      // Add system message from backend (with better formatting)
      setMessages(prev => [...prev, {
        role: 'system',
        message: ticketData.message || t('chat.ticketCreatedMessage', { id: ticketData.ticketId }),
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error(t('chat.errorCreatingTicket'));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownloadTicket = async () => {
    if (!currentTicket) return;

    try {
      const response = await ticketService.downloadPDF(currentTicket._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket_${currentTicket.ticketId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error(t('chat.errorDownloading'));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(45deg, #d32f2f 30%, #ff5722 90%)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <LocalHospital sx={{ fontSize: 40, color: 'white', mr: 2 }} />
            <Box>
              <Typography variant="h4" color="white" fontWeight="bold">
                {t('chat.title')}
              </Typography>
              <Typography variant="subtitle1" color="white">
                {t('chat.subtitle')}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Chip
              icon={<Phone />}
              label="112"
              sx={{ backgroundColor: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {/* Chat Section */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Messages Area */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                backgroundColor: '#f5f5f5'
              }}
            >
              {messages.map((msg, index) => (
                <MessageBubble key={index} message={msg} />
              ))}
              {isLoading && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography color="textSecondary">{t('chat.processing')}</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #e0e0e0' }}>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.inputPlaceholder')}
                  disabled={isLoading}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  endIcon={<SendIcon />}
                >
                  {t('chat.send')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Info Section */}
        <Grid item xs={12} md={4}>
          {/* Current Ticket Info */}
          {currentTicket ? (
            <TicketSummary
              ticket={currentTicket}
              onDownload={handleDownloadTicket}
            />
          ) : (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t('chat.collectingInfo')}
              </Typography>
              {ticketInfo && (
                <Box>
                  {ticketInfo.location && (
                    <Box display="flex" alignItems="center" mb={1}>
                      <LocationOn color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body2">{ticketInfo.location}</Typography>
                    </Box>
                  )}
                  {ticketInfo.reporter?.phone && (
                    <Box display="flex" alignItems="center" mb={1}>
                      <Phone color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body2">{ticketInfo.reporter.phone}</Typography>
                    </Box>
                  )}
                  {ticketInfo.reporter?.name && (
                    <Box display="flex" alignItems="center" mb={1}>
                      <Person color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body2">{ticketInfo.reporter.name}</Typography>
                    </Box>
                  )}
                  {ticketInfo.emergencyType && (
                    <Box display="flex" alignItems="center">
                      <Warning color="error" sx={{ mr: 1 }} />
                      <Typography variant="body2">{ticketInfo.emergencyType}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          )}

          {/* Instructions */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('chat.instructions')}
            </Typography>
            <Alert severity="info" sx={{ mb: 1 }}>
              {t('chat.instruction1')}
            </Alert>
            <Alert severity="warning" sx={{ mb: 1 }}>
              {t('chat.instruction2')}
            </Alert>
            <Alert severity="error">
              {t('chat.instruction3')}
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ChatPage;