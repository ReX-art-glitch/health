import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, TextField,
  Button, MenuItem, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Avatar, Switch
} from '@mui/material';
import {
  PersonAdd, Edit, Delete, Block, CheckCircle,
  AdminPanelSettings, LocalHospital, Person
} from '@mui/icons-material';
import api from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', role: 'field_worker',
    facility: '', phone: '', is_active: true,
  });
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const roles = [
    { value: 'admin', label: 'Administrator', icon: <AdminPanelSettings /> },
    { value: 'director', label: 'Director', icon: <AdminPanelSettings /> },
    { value: 'analyst', label: 'Analyst', icon: <Person /> },
    { value: 'health_worker', label: 'Health Worker', icon: <LocalHospital /> },
    { value: 'field_worker', label: 'Field Worker', icon: <Person /> },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username, email: user.email, password: '',
        role: user.role, facility: user.facility || '',
        phone: user.phone || '', is_active: user.is_active,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '', email: '', password: '',
        role: 'field_worker', facility: '', phone: '', is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedUser) {
        await api.put(`/admin/users/${selectedUser.id}`, formData);
        enqueueSnackbar('User updated successfully', { variant: 'success' });
      } else {
        await api.post('/admin/users', formData);
        enqueueSnackbar('User created successfully', { variant: 'success' });
      }
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.detail || 'Failed to save user', { variant: 'error' });
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { is_active: !isActive });
      enqueueSnackbar(`User ${!isActive ? 'activated' : 'deactivated'}`, { variant: 'success' });
      fetchUsers();
    } catch (error) {
      enqueueSnackbar('Failed to update user status', { variant: 'error' });
    }
  };

  const getRoleChip = (role) => {
    const roleInfo = roles.find(r => r.value === role);
    return (
      <Chip
        icon={roleInfo?.icon}
        label={roleInfo?.label || role}
        size="small"
        color={role === 'admin' ? 'error' : role === 'director' ? 'warning' : 'primary'}
        variant="outlined"
      />
    );
  };

  const sampleUsers = [
    { id: 1, username: 'dr.smith', email: 'dr.smith@health.gov', role: 'director', facility: 'General Hospital Uyo', is_active: true, last_login: '2024-06-14 09:30' },
    { id: 2, username: 'nurse.jane', email: 'jane@health.gov', role: 'health_worker', facility: 'PHC Ikot Abasi', is_active: true, last_login: '2024-06-14 08:15' },
    { id: 3, username: 'field.worker1', email: 'field1@health.gov', role: 'field_worker', facility: 'Mobile Unit 1', is_active: true, last_login: '2024-06-13 16:45' },
    { id: 4, username: 'analyst.mike', email: 'mike@health.gov', role: 'analyst', facility: 'State HQ', is_active: true, last_login: '2024-06-14 10:00' },
    { id: 5, username: 'old.user', email: 'old@health.gov', role: 'field_worker', facility: 'PHC Itu', is_active: false, last_login: '2024-05-01 12:00' },
  ];

  const displayUsers = users.length > 0 ? users : sampleUsers;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        {currentUser?.role === 'admin' && (
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenDialog()}>
            Add User
          </Button>
        )}
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Facility</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: user.is_active ? 'primary.main' : 'grey.400' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{user.username}</Typography>
                        <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{user.facility}</TableCell>
                  <TableCell>
                    <Chip
                      icon={user.is_active ? <CheckCircle /> : <Block />}
                      label={user.is_active ? 'Active' : 'Inactive'}
                      color={user.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{user.last_login}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(user)}><Edit /></IconButton>
                    <IconButton size="small" onClick={() => handleToggleActive(user.id, user.is_active)}>
                      {user.is_active ? <Block color="warning" /> : <CheckCircle color="success" />}
                    </IconButton>
                    {currentUser?.role === 'admin' && (
                      <IconButton size="small" color="error"><Delete /></IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Username" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </Grid>
            {!selectedUser && (
              <Grid item xs={12}>
                <TextField fullWidth label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                {roles.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Facility" value={formData.facility} onChange={(e) => setFormData({...formData, facility: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </Grid>
            {selectedUser && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography>Active Status</Typography>
                  <Switch checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;