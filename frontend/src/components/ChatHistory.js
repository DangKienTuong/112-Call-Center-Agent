import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Chat as ChatIcon,
  CheckCircle,
  Pending,
  OpenInNew,
  Refresh
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import chatService from '../services/chatService';

function ChatHistory({ onSelectSession }) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatService.getChatHistory(10);
      setSessions(response.data.data.sessions || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError(t('chat.errorLoadingHistory'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusChip = (status, ticketId) => {
    if (ticketId) {
      return (
        <Chip
          size="small"
          icon={<CheckCircle />}
          label={t('chat.ticketCreated')}
          color="success"
        />
      );
    }

    switch (status) {
      case 'completed':
        return (
          <Chip
            size="small"
            icon={<CheckCircle />}
            label={t('chat.completed')}
            color="success"
          />
        );
      case 'active':
        return (
          <Chip
            size="small"
            icon={<Pending />}
            label={t('chat.active')}
            color="primary"
          />
        );
      default:
        return (
          <Chip
            size="small"
            label={status}
            color="default"
          />
        );
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={fetchHistory} size="small">
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <ChatIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
        <Typography color="textSecondary">
          {t('chat.noHistory')}
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={1}>
        <Typography variant="subtitle2" color="textSecondary">
          {t('chat.recentConversations')}
        </Typography>
        <IconButton size="small" onClick={fetchHistory}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      <List dense>
        {sessions.map((session, index) => (
          <React.Fragment key={session.sessionId}>
            <ListItem
              button
              onClick={() => onSelectSession && onSelectSession(session)}
            >
              <ListItemIcon>
                <ChatIcon color={session.ticketId ? 'success' : 'primary'} />
              </ListItemIcon>

              <ListItemText
                sx={{ pr: 20 }}
                primary={
                  <Typography variant="body2" noWrap>
                    {session.lastMessage || t('chat.conversation')}
                  </Typography>
                }
                secondary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(session.createdAt)}
                    </Typography>
                    {session.messageCount > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        ({session.messageCount} {t('chat.messages')})
                      </Typography>
                    )}
                  </Box>
                }
              />

              <ListItemSecondaryAction>
                <Box display="flex" alignItems="center" gap={1}>
                  {getStatusChip(session.status, session.ticketId)}
                  {session.ticketMongoId && (
                    <Tooltip title={t('chat.viewTicket')}>
                      <IconButton
                        size="small"
                        href={`/tickets/${session.ticketMongoId}`}
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < sessions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
}

export default ChatHistory;
