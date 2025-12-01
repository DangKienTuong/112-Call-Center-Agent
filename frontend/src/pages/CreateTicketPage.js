import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  Save,
  LocalFireDepartment,
  LocalHospital,
  Security
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import { useAuth } from '../contexts/AuthContext';

function CreateTicketPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    emergencyType: '',
    priority: 'HIGH',
    reporter: {
      name: '',
      phone: '',
      email: ''
    },
    location: {
      address: '',
      ward: '',
      district: '',
      city: ''
    },
    description: '',
    affectedPeople: {
      total: 0,
      injured: 0,
      critical: 0,
      deceased: 0
    },
    supportRequired: {
      police: false,
      ambulance: false,
      fireDepartment: false,
      rescue: false
    },
    additionalInfo: {
      notes: ''
    }
  });

  const handleChange = (field, value) => {
    const fields = field.split('.');
    if (fields.length === 1) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (fields.length === 2) {
      setFormData(prev => ({
        ...prev,
        [fields[0]]: {
          ...prev[fields[0]],
          [fields[1]]: value
        }
      }));
    }
  };

  const handleSupportChange = (field) => {
    setFormData(prev => ({
      ...prev,
      supportRequired: {
        ...prev.supportRequired,
        [field]: !prev.supportRequired[field]
      }
    }));
  };

  const handleEmergencyTypeChange = (type) => {
    setFormData(prev => {
      const newData = { ...prev, emergencyType: type };

      // Auto-set support required based on emergency type
      if (type === 'FIRE_RESCUE') {
        newData.supportRequired = {
          police: false,
          ambulance: true,
          fireDepartment: true,
          rescue: true
        };
      } else if (type === 'MEDICAL') {
        newData.supportRequired = {
          police: false,
          ambulance: true,
          fireDepartment: false,
          rescue: false
        };
      } else if (type === 'SECURITY') {
        newData.supportRequired = {
          police: true,
          ambulance: false,
          fireDepartment: false,
          rescue: false
        };
      }

      return newData;
    });
  };

  const validateForm = () => {
    if (!formData.emergencyType) {
      setError(t('createTicket.errors.emergencyTypeRequired'));
      return false;
    }
    if (!formData.reporter.name) {
      setError(t('createTicket.errors.reporterNameRequired'));
      return false;
    }
    if (!formData.reporter.phone) {
      setError(t('createTicket.errors.reporterPhoneRequired'));
      return false;
    }
    if (!formData.location.address) {
      setError(t('createTicket.errors.addressRequired'));
      return false;
    }
    if (!formData.description) {
      setError(t('createTicket.errors.descriptionRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Build full address
      const fullAddress = [
        formData.location.address,
        formData.location.ward,
        formData.location.district,
        formData.location.city
      ].filter(Boolean).join(', ');

      const ticketData = {
        ...formData,
        location: {
          ...formData.location,
          address: fullAddress
        },
        assignedOperator: user?.id
      };

      const response = await ticketService.createTicket(ticketData);

      toast.success(t('createTicket.success', { id: response.data.data.ticketId }));
      navigate('/tickets');
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const emergencyTypes = [
    {
      value: 'FIRE_RESCUE',
      label: t('ticket.type.FIRE_RESCUE'),
      icon: <LocalFireDepartment sx={{ fontSize: 40 }} />,
      color: '#ff5722',
      description: t('createTicket.typeDesc.FIRE_RESCUE')
    },
    {
      value: 'MEDICAL',
      label: t('ticket.type.MEDICAL'),
      icon: <LocalHospital sx={{ fontSize: 40 }} />,
      color: '#f44336',
      description: t('createTicket.typeDesc.MEDICAL')
    },
    {
      value: 'SECURITY',
      label: t('ticket.type.SECURITY'),
      icon: <Security sx={{ fontSize: 40 }} />,
      color: '#2196f3',
      description: t('createTicket.typeDesc.SECURITY')
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/tickets')}>
          {t('common.back')}
        </Button>
        <Typography variant="h4">{t('createTicket.title')}</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Emergency Type Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('createTicket.selectType')}
          </Typography>
          <Grid container spacing={2}>
            {emergencyTypes.map((type) => (
              <Grid item xs={12} md={4} key={type.value}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: formData.emergencyType === type.value ? `3px solid ${type.color}` : '1px solid #e0e0e0',
                    bgcolor: formData.emergencyType === type.value ? `${type.color}10` : 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: type.color,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onClick={() => handleEmergencyTypeChange(type.value)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{ color: type.color, mb: 1 }}>
                      {type.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {type.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {type.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Reporter Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('createTicket.reporterInfo')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label={t('auth.fullName')}
                value={formData.reporter.name}
                onChange={(e) => handleChange('reporter.name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label={t('ticket.phone')}
                value={formData.reporter.phone}
                onChange={(e) => handleChange('reporter.phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('auth.email')}
                type="email"
                value={formData.reporter.email}
                onChange={(e) => handleChange('reporter.email', e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Location */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('ticket.location')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label={t('createTicket.address')}
                value={formData.location.address}
                onChange={(e) => handleChange('location.address', e.target.value)}
                placeholder={t('createTicket.addressPlaceholder')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('createTicket.ward')}
                value={formData.location.ward}
                onChange={(e) => handleChange('location.ward', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('createTicket.district')}
                value={formData.location.district}
                onChange={(e) => handleChange('location.district', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('createTicket.city')}
                value={formData.location.city}
                onChange={(e) => handleChange('location.city', e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Emergency Details */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('createTicket.emergencyDetails')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('createTicket.priority')}</InputLabel>
                <Select
                  value={formData.priority}
                  label={t('createTicket.priority')}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <MenuItem value="CRITICAL">{t('ticket.priority.CRITICAL')}</MenuItem>
                  <MenuItem value="HIGH">{t('ticket.priority.HIGH')}</MenuItem>
                  <MenuItem value="MEDIUM">{t('ticket.priority.MEDIUM')}</MenuItem>
                  <MenuItem value="LOW">{t('ticket.priority.LOW')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label={t('ticket.description')}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('createTicket.descriptionPlaceholder')}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Affected People */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('ticket.affected')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label={t('ticket.total')}
                value={formData.affectedPeople.total}
                onChange={(e) => handleChange('affectedPeople.total', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label={t('ticket.injured')}
                value={formData.affectedPeople.injured}
                onChange={(e) => handleChange('affectedPeople.injured', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label={t('ticket.critical')}
                value={formData.affectedPeople.critical}
                onChange={(e) => handleChange('affectedPeople.critical', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label={t('ticket.deceased')}
                value={formData.affectedPeople.deceased}
                onChange={(e) => handleChange('affectedPeople.deceased', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Additional Notes */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('createTicket.additionalInfo')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('ticket.notes')}
            value={formData.additionalInfo.notes}
            onChange={(e) => handleChange('additionalInfo.notes', e.target.value)}
            placeholder={t('createTicket.notesPlaceholder')}
          />
        </Paper>

        {/* Submit Button */}
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() => navigate('/tickets')}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            disabled={loading || !formData.emergencyType}
            size="large"
          >
            {t('createTicket.submit')}
          </Button>
        </Box>
      </form>
    </Container>
  );
}

export default CreateTicketPage;
