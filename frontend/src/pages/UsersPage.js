import React, { useState, useEffect } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Lock,
  LockOpen,
  Refresh,
  Search
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'operator',
    status: 'active',
    profile: {
      fullName: '',
      employeeId: '',
      department: '',
      phone: ''
    }
  });
  const [formError, setFormError] = useState('');

  // Password reset dialog
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        role: roleFilter || undefined,
        search: search || undefined
      });
      setUsers(response.data.data);
      setTotalUsers(response.data.totalUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchUsers();
  };

  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'staff',
      status: 'active',
      profile: {
        fullName: '',
        employeeId: '',
        department: '',
        phone: ''
      }
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (user) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      profile: {
        fullName: user.profile?.fullName || '',
        employeeId: user.profile?.employeeId || '',
        department: user.profile?.department || '',
        phone: user.profile?.phone || ''
      }
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormError('');
  };

  const handleFormChange = (field, value) => {
    if (field.startsWith('profile.')) {
      const profileField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setFormError('');

      if (dialogMode === 'create') {
        if (!formData.password) {
          setFormError(t('users.passwordRequired'));
          return;
        }
        await userService.createUser(formData);
        toast.success(t('users.createSuccess'));
      } else {
        const updateData = { ...formData };
        delete updateData.password; // Don't send password in update
        await userService.updateUser(selectedUser._id, updateData);
        toast.success(t('users.updateSuccess'));
      }

      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.message || t('common.error');
      setFormError(message);
    }
  };

  const handleOpenPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setOpenPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    try {
      await userService.resetPassword(selectedUser._id, newPassword);
      toast.success(t('users.passwordResetSuccess'));
      setOpenPasswordDialog(false);
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.toggleStatus(user._id);
      toast.success(t('users.statusToggleSuccess'));
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const handleOpenDeleteDialog = (user) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    try {
      await userService.deleteUser(userToDelete._id);
      toast.success(t('users.deleteSuccess'));
      setOpenDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'staff': return 'primary';
      case 'supervisor': return 'warning';
      case 'operator': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {t('users.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenCreateDialog}
        >
          {t('users.addUser')}
        </Button>
      </Box>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('auth.role')}</InputLabel>
              <Select
                value={roleFilter}
                label={t('auth.role')}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="admin">{t('users.roles.admin')}</MenuItem>
                <MenuItem value="staff">{t('users.roles.staff')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleSearch}
              fullWidth
            >
              {t('common.search')}
            </Button>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchUsers}
              fullWidth
            >
              {t('common.refresh')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('auth.username')}</TableCell>
                <TableCell>{t('auth.email')}</TableCell>
                <TableCell>{t('auth.fullName')}</TableCell>
                <TableCell>{t('auth.role')}</TableCell>
                <TableCell>{t('users.status')}</TableCell>
                <TableCell>{t('users.lastLogin')}</TableCell>
                <TableCell align="center">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.profile?.fullName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={t(`users.roles.${user.role}`)}
                      size="small"
                      color={getRoleColor(user.role)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(`users.statuses.${user.status}`)}
                      size="small"
                      color={getStatusColor(user.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString()
                      : t('users.neverLoggedIn')}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={t('common.edit')}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(user)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('users.resetPassword')}>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleOpenPasswordDialog(user)}
                      >
                        <Lock />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.status === 'active' ? t('users.deactivate') : t('users.activate')}>
                      <IconButton
                        size="small"
                        color={user.status === 'active' ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(user)}
                        disabled={user._id === currentUser?.id}
                      >
                        {user.status === 'active' ? <LockOpen /> : <Lock />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(user)}
                        disabled={user._id === currentUser?.id}
                      >
                        <Delete />
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
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Create/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? t('users.addUser') : t('users.editUser')}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('auth.username')}
                value={formData.username}
                onChange={(e) => handleFormChange('username', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('auth.email')}
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                required
              />
            </Grid>
            {dialogMode === 'create' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('auth.password')}
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('auth.role')}</InputLabel>
                <Select
                  value={formData.role}
                  label={t('auth.role')}
                  onChange={(e) => handleFormChange('role', e.target.value)}
                >
                  <MenuItem value="admin">{t('users.roles.admin')}</MenuItem>
                  <MenuItem value="staff">{t('users.roles.staff')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('users.status')}</InputLabel>
                <Select
                  value={formData.status}
                  label={t('users.status')}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                >
                  <MenuItem value="active">{t('users.statuses.active')}</MenuItem>
                  <MenuItem value="inactive">{t('users.statuses.inactive')}</MenuItem>
                  <MenuItem value="suspended">{t('users.statuses.suspended')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {t('users.profileInfo')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('auth.fullName')}
                value={formData.profile.fullName}
                onChange={(e) => handleFormChange('profile.fullName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('users.employeeId')}
                value={formData.profile.employeeId}
                onChange={(e) => handleFormChange('profile.employeeId', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('users.department')}
                value={formData.profile.department}
                onChange={(e) => handleFormChange('profile.department', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('users.phone')}
                value={formData.profile.phone}
                onChange={(e) => handleFormChange('profile.phone', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {dialogMode === 'create' ? t('common.create') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
        <DialogTitle>{t('users.resetPassword')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('users.resetPasswordFor', { username: selectedUser?.username })}
          </Typography>
          <TextField
            fullWidth
            label={t('users.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={!newPassword}>
            {t('users.resetPassword')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>{t('users.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('users.deleteConfirmMessage', { username: userToDelete?.username })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UsersPage;
