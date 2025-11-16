import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  Download,
  LocationOn,
  Phone,
  Person,
  Warning,
  LocalHospital,
  LocalPolice,
  LocalFireDepartment,
  Support
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

function TicketSummary({ ticket, onDownload }) {
  const { t } = useTranslation();

  const getSupportIcons = () => {
    const icons = [];
    if (ticket.supportRequired?.police) {
      icons.push({ icon: <LocalPolice />, label: t('support.police') });
    }
    if (ticket.supportRequired?.ambulance) {
      icons.push({ icon: <LocalHospital />, label: t('support.ambulance') });
    }
    if (ticket.supportRequired?.fireDepartment) {
      icons.push({ icon: <LocalFireDepartment />, label: t('support.fire') });
    }
    if (ticket.supportRequired?.rescue) {
      icons.push({ icon: <Support />, label: t('support.rescue') });
    }
    return icons;
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'URGENT': return 'error';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6">
              {t('ticket.title')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {ticket.ticketId}
            </Typography>
          </Box>
          <CheckCircle color="success" sx={{ fontSize: 40 }} />
        </Box>

        <Box display="flex" gap={1} mb={2}>
          <Chip
            label={ticket.status}
            color={getStatusColor(ticket.status)}
            size="small"
          />
          <Chip
            label={ticket.priority}
            color={getPriorityColor(ticket.priority)}
            size="small"
          />
          <Chip
            label={ticket.emergencyType}
            color="primary"
            size="small"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List dense>
          {/* Location */}
          {ticket.location?.address && (
            <ListItem>
              <ListItemIcon>
                <LocationOn color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t('ticket.location')}
                secondary={ticket.location.address}
              />
            </ListItem>
          )}

          {/* Reporter */}
          {ticket.reporter && (
            <>
              <ListItem>
                <ListItemIcon>
                  <Person color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={t('ticket.reporter')}
                  secondary={ticket.reporter.name}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Phone color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={t('ticket.phone')}
                  secondary={ticket.reporter.phone}
                />
              </ListItem>
            </>
          )}

          {/* Affected People */}
          {ticket.affectedPeople && (
            <ListItem>
              <ListItemIcon>
                <Warning color="warning" />
              </ListItemIcon>
              <ListItemText
                primary={t('ticket.affected')}
                secondary={`${ticket.affectedPeople.total} ${t('ticket.people')}`}
              />
            </ListItem>
          )}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Required Support */}
        <Typography variant="subtitle2" gutterBottom>
          {t('ticket.requiredSupport')}
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {getSupportIcons().map((item, index) => (
            <Chip
              key={index}
              icon={item.icon}
              label={item.label}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Description */}
        {ticket.description && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              {t('ticket.description')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {ticket.description}
            </Typography>
          </>
        )}

        {/* Actions */}
        <Button
          fullWidth
          variant="contained"
          startIcon={<Download />}
          onClick={onDownload}
          color="primary"
        >
          {t('ticket.downloadPDF')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default TicketSummary;