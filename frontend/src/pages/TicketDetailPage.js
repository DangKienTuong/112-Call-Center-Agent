import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Download,
  Edit,
  LocalPhone,
  LocationOn,
  Person,
  Warning,
  LocalHospital,
  LocalFireDepartment,
  Security,
  Build
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import { useAuth } from '../contexts/AuthContext';

function TicketDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status update dialog
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const canUpdateStatus = user && ['admin', 'staff'].includes(user.role);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTicket(id);
      setTicket(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(t('ticket.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusDialog = () => {
    setNewStatus(ticket.status);
    setStatusNotes('');
    setOpenStatusDialog(true);
  };

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      await ticketService.updateTicketStatus(id, newStatus, statusNotes);
      toast.success(t('ticket.statusUpdateSuccess'));
      setOpenStatusDialog(false);
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await ticketService.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket_${ticket.ticketId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('common.success'));
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error(t('chat.errorDownloading'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'URGENT': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getEmergencyTypeIcon = (type) => {
    switch (type) {
      case 'FIRE_RESCUE': return <LocalFireDepartment color="error" />;
      case 'MEDICAL': return <LocalHospital color="primary" />;
      case 'SECURITY': return <Security color="warning" />;
      default: return <Warning color="action" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/tickets')}
          sx={{ mt: 2 }}
        >
          {t('common.back')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/tickets')}
          >
            {t('common.back')}
          </Button>
          <Typography variant="h4">
            {ticket.ticketId}
          </Typography>
          <Chip
            label={t(`ticket.status.${ticket.status}`)}
            color={getStatusColor(ticket.status)}
          />
          <Chip
            label={t(`ticket.priority.${ticket.priority}`)}
            color={getPriorityColor(ticket.priority)}
            variant="outlined"
          />
        </Box>
        <Box display="flex" gap={1}>
          {canUpdateStatus && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={handleOpenStatusDialog}
            >
              {t('ticket.updateStatus')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleDownloadPDF}
          >
            {t('ticket.downloadPDF')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Info */}
        <Grid item xs={12} md={8}>
          {/* Emergency Type */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {getEmergencyTypeIcon(ticket.emergencyType)}
              <Typography variant="h5">
                {t(`ticket.type.${ticket.emergencyType}`)}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {ticket.description}
            </Typography>
          </Paper>

          {/* Location */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LocationOn color="primary" />
                <Typography variant="h6">{t('ticket.location')}</Typography>
              </Box>
              <Typography variant="body1">{ticket.location?.address}</Typography>
              {ticket.location?.district && (
                <Typography variant="body2" color="text.secondary">
                  {ticket.location.ward}, {ticket.location.district}, {ticket.location.city}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Reporter Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Person color="primary" />
                <Typography variant="h6">{t('ticket.reporter')}</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('auth.fullName')}
                  </Typography>
                  <Typography variant="body1">{ticket.reporter?.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t('ticket.phone')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocalPhone fontSize="small" />
                    <Typography variant="body1">{ticket.reporter?.phone}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Affected People */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('ticket.affected')}</Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">{t('ticket.total')}</Typography>
                  <Typography variant="h6">{ticket.affectedPeople?.total || 0}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">{t('ticket.injured')}</Typography>
                  <Typography variant="h6" color="warning.main">
                    {ticket.affectedPeople?.injured || 0}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">{t('ticket.critical')}</Typography>
                  <Typography variant="h6" color="error.main">
                    {ticket.affectedPeople?.critical || 0}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">{t('ticket.deceased')}</Typography>
                  <Typography variant="h6">{ticket.affectedPeople?.deceased || 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Chat History */}
          {ticket.chatHistory && ticket.chatHistory.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('ticket.chatHistory')}</Typography>
                <List dense>
                  {ticket.chatHistory.map((msg, index) => (
                    <ListItem key={index} sx={{
                      bgcolor: msg.role === 'operator' ? 'primary.light' : 'grey.100',
                      borderRadius: 1,
                      mb: 1
                    }}>
                      <ListItemText
                        primary={msg.message}
                        secondary={`${msg.role} - ${new Date(msg.timestamp).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Support Required */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('ticket.requiredSupport')}</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {ticket.supportRequired?.police && (
                  <Chip icon={<Security />} label={t('support.police')} color="primary" />
                )}
                {ticket.supportRequired?.ambulance && (
                  <Chip icon={<LocalHospital />} label={t('support.ambulance')} color="error" />
                )}
                {ticket.supportRequired?.fireDepartment && (
                  <Chip icon={<LocalFireDepartment />} label={t('support.fire')} color="warning" />
                )}
                {ticket.supportRequired?.rescue && (
                  <Chip icon={<Build />} label={t('support.rescue')} color="info" />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t('ticket.timeline')}</Typography>
              <Box>
                <Typography variant="body2" color="text.secondary">{t('ticket.created')}</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(ticket.createdAt).toLocaleString()}
                </Typography>

                {ticket.resolvedAt && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {t('ticket.resolved')}
                    </Typography>
                    <Typography variant="body1">
                      {new Date(ticket.resolvedAt).toLocaleString()}
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Notes */}
          {ticket.notes && ticket.notes.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{t('ticket.notes')}</Typography>
                <List dense>
                  {ticket.notes.map((note, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={note} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('ticket.updateStatus')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{t('ticket.newStatus')}</InputLabel>
            <Select
              value={newStatus}
              label={t('ticket.newStatus')}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="URGENT">{t('ticket.status.URGENT')}</MenuItem>
              <MenuItem value="IN_PROGRESS">{t('ticket.status.IN_PROGRESS')}</MenuItem>
              <MenuItem value="RESOLVED">{t('ticket.status.RESOLVED')}</MenuItem>
              <MenuItem value="CANCELLED">{t('ticket.status.CANCELLED')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('ticket.notes')}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder={t('ticket.notesPlaceholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusDialog(false)} disabled={updating}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateStatus}
            disabled={updating || newStatus === ticket?.status}
          >
            {updating ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default TicketDetailPage;
