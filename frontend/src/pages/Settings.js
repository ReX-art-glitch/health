import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  Switch, FormControlLabel, Divider, Alert, Card,
  CardContent, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { Save, Refresh, CloudUpload, Storage, Security } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    facility: user?.facility || '',
    title: user?.title || '',
  });

  const [appSettings, setAppSettings] = useState({
    autoSync: true,
    syncInterval: '300',
    notificationsEnabled: true,
    darkMode: false,
    language: 'en',
    dataRetention: '365',
  });

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleProfileSave = async () => {
    try {
      await api.put('/auth/profile', profile);
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    }
  };

  const handlePasswordChange = async () => {
    if (password.new !== password.confirm) {
      enqueueSnackbar('Passwords do not match', { variant: 'error' });
      return;
    }
    try {
      await api.post('/auth/change-password', {
        current_password: password.current,
        new_password: password.new,
      });
      setPassword({ current: '', new: '', confirm: '' });
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to change password', { variant: 'error' });
    }
  };

  const handleAppSettingsSave = async () => {
    try {
      await api.put('/settings', appSettings);
      enqueueSnackbar('Settings saved successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Profile Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Full Name" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email" type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Title" value={profile.title} onChange={(e) => setProfile({...profile, title: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Facility" value={profile.facility} onChange={(e) => setProfile({...profile, facility: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<Save />} onClick={handleProfileSave}>
                  Save Profile
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Password Change */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Current Password" type="password" value={password.current} onChange={(e) => setPassword({...password, current: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="New Password" type="password" value={password.new} onChange={(e) => setPassword({...password, new: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Confirm New Password" type="password" value={password.confirm} onChange={(e) => setPassword({...password, confirm: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="warning" onClick={handlePasswordChange}>
                  Change Password
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Application Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
              Application Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={<Switch checked={appSettings.autoSync} onChange={(e) => setAppSettings({...appSettings, autoSync: e.target.checked})} />}
                  label="Auto Sync Data"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={<Switch checked={appSettings.notificationsEnabled} onChange={(e) => setAppSettings({...appSettings, notificationsEnabled: e.target.checked})} />}
                  label="Enable Notifications"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={<Switch checked={appSettings.darkMode} onChange={(e) => setAppSettings({...appSettings, darkMode: e.target.checked})} />}
                  label="Dark Mode"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sync Interval</InputLabel>
                  <Select value={appSettings.syncInterval} label="Sync Interval" onChange={(e) => setAppSettings({...appSettings, syncInterval: e.target.value})}>
                    <MenuItem value="60">1 minute</MenuItem>
                    <MenuItem value="300">5 minutes</MenuItem>
                    <MenuItem value="900">15 minutes</MenuItem>
                    <MenuItem value="1800">30 minutes</MenuItem>
                    <MenuItem value="3600">1 hour</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select value={appSettings.language} label="Language" onChange={(e) => setAppSettings({...appSettings, language: e.target.value})}>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="sw">Swahili</MenuItem>
                    <MenuItem value="ha">Hausa</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Data Retention (days)</InputLabel>
                  <Select value={appSettings.dataRetention} label="Data Retention (days)" onChange={(e) => setAppSettings({...appSettings, dataRetention: e.target.value})}>
                    <MenuItem value="90">90 days</MenuItem>
                    <MenuItem value="180">180 days</MenuItem>
                    <MenuItem value="365">1 year</MenuItem>
                    <MenuItem value="730">2 years</MenuItem>
                    <MenuItem value="2555">7 years</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<Save />} onClick={handleAppSettingsSave}>
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>System Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Version</Typography>
                <Typography variant="body1">1.0.0</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Environment</Typography>
                <Typography variant="body1">Production</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Last Deployed</Typography>
                <Typography variant="body1">June 14, 2024</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Database Size</Typography>
                <Typography variant="body1">2.3 GB</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;