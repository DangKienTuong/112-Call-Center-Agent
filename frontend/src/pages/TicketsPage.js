import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Box,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  Tooltip
} from '@mui/material';
import {
  Visibility,
  Download,
  FilterList,
  Refresh,
  Edit,
  Add
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import { useAuth } from '../contexts/AuthContext';

function TicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);

  const canUpdateStatus = user && ['admin', 'staff'].includes(user.role);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalTickets, setTotalTickets] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    emergencyType: '',
    priority: ''
  });

  useEffect(() => {
    fetchTickets();
  }, [page, rowsPerPage, filters]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTickets({
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      });
      setTickets(response.data.data);
      setTotalTickets(response.data.totalTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0);
  };

  const handleDownloadPDF = async (ticketId) => {
    try {
      const response = await ticketService.downloadPDF(ticketId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket_${ticketId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('common.success'));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error(t('common.error'));
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

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {t('navigation.tickets')}
        </Typography>
        <Box display="flex" gap={1}>
          {canUpdateStatus && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/tickets/create')}
            >
              {t('createTicket.title')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTickets}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <FilterList sx={{ mr: 1 }} />
          <Typography variant="h6">{t('common.filter')}</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('ticket.status.URGENT')}</InputLabel>
              <Select
                value={filters.status}
                label={t('ticket.status.URGENT')}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="URGENT">{t('ticket.status.URGENT')}</MenuItem>
                <MenuItem value="IN_PROGRESS">{t('ticket.status.IN_PROGRESS')}</MenuItem>
                <MenuItem value="RESOLVED">{t('ticket.status.RESOLVED')}</MenuItem>
                <MenuItem value="CANCELLED">{t('ticket.status.CANCELLED')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('createTicket.emergencyType')}</InputLabel>
              <Select
                value={filters.emergencyType}
                label={t('createTicket.emergencyType')}
                onChange={(e) => handleFilterChange('emergencyType', e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="FIRE_RESCUE">{t('ticket.type.FIRE_RESCUE')}</MenuItem>
                <MenuItem value="MEDICAL">{t('ticket.type.MEDICAL')}</MenuItem>
                <MenuItem value="SECURITY">{t('ticket.type.SECURITY')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CRITICAL">{t('ticket.priority.CRITICAL')}</MenuItem>
                <MenuItem value="HIGH">{t('ticket.priority.HIGH')}</MenuItem>
                <MenuItem value="MEDIUM">{t('ticket.priority.MEDIUM')}</MenuItem>
                <MenuItem value="LOW">{t('ticket.priority.LOW')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tickets Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket._id} hover>
                  <TableCell>{ticket.ticketId}</TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.emergencyType}
                      size="small"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{ticket.reporter?.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {ticket.reporter?.phone}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{ticket.location?.address}</TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.status}
                      size="small"
                      color={getStatusColor(ticket.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.priority}
                      size="small"
                      color={getPriorityColor(ticket.priority)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.view')}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/tickets/${ticket._id}`)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {canUpdateStatus && (
                      <Tooltip title={t('ticket.updateStatus')}>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => navigate(`/tickets/${ticket._id}`)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={t('ticket.downloadPDF')}>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleDownloadPDF(ticket._id)}
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalTickets}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
}

export default TicketsPage;