import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import {
  LocalFireDepartment,
  LocalHospital,
  Security,
  ExpandMore,
  ExpandLess,
  Refresh,
  OpenInNew
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import chatService from '../services/chatService';

function MyTickets({ compact = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatService.getTicketHistory();
      setTickets(response.data.data.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(t('tickets.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const getEmergencyIcon = (types) => {
    if (!types || types.length === 0) return <LocalHospital color="error" />;

    const primaryType = types[0];
    switch (primaryType) {
      case 'FIRE_RESCUE':
        return <LocalFireDepartment sx={{ color: '#ff5722' }} />;
      case 'MEDICAL':
        return <LocalHospital sx={{ color: '#f44336' }} />;
      case 'SECURITY':
        return <Security sx={{ color: '#1976d2' }} />;
      default:
        return <LocalHospital color="error" />;
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      URGENT: { color: 'error', label: t('tickets.urgent') },
      IN_PROGRESS: { color: 'warning', label: t('tickets.inProgress') },
      RESOLVED: { color: 'success', label: t('tickets.resolved') },
      CANCELLED: { color: 'default', label: t('tickets.cancelled') }
    };

    const config = statusConfig[status] || statusConfig.URGENT;
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch {
      return dateString;
    }
  };

  const displayedTickets = compact ? tickets.slice(0, 3) : tickets;

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
        <IconButton onClick={fetchTickets} size="small">
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={1.5}
        sx={{ cursor: compact ? 'pointer' : 'default' }}
        onClick={() => compact && setExpanded(!expanded)}
      >
        <Typography variant="subtitle1" fontWeight="medium">
          {t('tickets.myTickets')} ({tickets.length})
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); fetchTickets(); }}>
            <Refresh fontSize="small" />
          </IconButton>
          {compact && (
            <IconButton size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Divider />

        {tickets.length === 0 ? (
          <Box p={2} textAlign="center">
            <Typography color="textSecondary">
              {t('tickets.noTickets')}
            </Typography>
          </Box>
        ) : (
          <>
            <List dense>
              {displayedTickets.map((ticket, index) => (
                <React.Fragment key={ticket.ticketId}>
                  <ListItem
                    button
                    onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                  >
                    <ListItemIcon>
                      {getEmergencyIcon(ticket.emergencyTypes)}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {ticket.ticketId}
                          </Typography>
                          {getStatusChip(ticket.currentStatus || ticket.status)}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="textSecondary" display="block" noWrap>
                            {ticket.location}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(ticket.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />

                    <IconButton size="small">
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </ListItem>
                  {index < displayedTickets.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {compact && tickets.length > 3 && (
              <Box p={1} textAlign="center">
                <Button
                  size="small"
                  onClick={() => navigate('/tickets')}
                >
                  {t('tickets.viewAll')} ({tickets.length})
                </Button>
              </Box>
            )}
          </>
        )}
      </Collapse>
    </Paper>
  );
}

export default MyTickets;
