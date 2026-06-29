import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Alert
} from '@mui/material';
import {
  Warning, Error, Info, CheckCircle, Refresh,
  FilterList, Notifications, Sms, Email
} from '@mui/icons-material';
import api from '../services/api';
import { useSnackbar } from 'notistack';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts/active-alerts');
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      enqueueSnackbar('Alert dismissed', { variant: 'success' });
      fetchAlerts();
    } catch (error) {
      enqueueSnackbar('Failed to dismiss alert', { variant: 'error' });
    }
  };

  const handleEscalate = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/escalate`);
      enqueueSnackbar('Alert escalated', { variant: 'success' });
      fetchAlerts();
    } catch (error) {
      enqueueSnackbar('Failed to escalate alert', { variant: 'error' });
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Info color="info" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  const sampleAlerts = alerts.length > 0 ? alerts : [
    { id: 1, type: 'outbreak', severity: 'critical', title: 'Measles Outbreak Detected', message: '15 confirmed cases in Eastern Obolo LGA. Immediate response required.', location: 'Eastern Obolo', time: '10 minutes ago', status: 'active' },
    { id: 2, type: 'coverage_drop', severity: 'high', title: 'Vaccination Coverage Drop', message: 'Coverage dropped 7% in Akwa Ibom State. 2,100 children at risk.', location: 'Akwa Ibom', time: '2 hours ago', status: 'active' },
    { id: 3, type: 'stockout', severity: 'critical', title: 'Vaccine Stockout Risk', message: '3 facilities have less than 7 days of vaccine supply.', location: 'Ikot Abasi', time: '4 hours ago', status: 'active' },
    { id: 4, type: 'maternal', severity: 'high', title: 'High-Risk Pregnancy Alert', message: '5 high-risk pregnancies require immediate referral.', location: 'Multiple', time: '6 hours ago', status: 'active' },
    { id: 5, type: 'inventory', severity: 'medium', title: 'Drug Expiry Alert', message: '12 drug items expiring within 30 days across facilities.', location: 'Multiple', time: '1 day ago', status: 'active' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Alerts & Notifications</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField select size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All Alerts</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </TextField>
          <IconButton onClick={fetchAlerts}><Refresh /></IconButton>
        </Box>
      </Box>

      {/* Alert Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Critical', count: sampleAlerts.filter(a => a.severity === 'critical').length, color: '#F44336', bg: '#FFEBEE' },
          { label: 'High', count: sampleAlerts.filter(a => a.severity === 'high').length, color: '#FF9800', bg: '#FFF3E0' },
          { label: 'Medium', count: sampleAlerts.filter(a => a.severity === 'medium').length, color: '#2196F3', bg: '#E3F2FD' },
          { label: 'Total', count: sampleAlerts.length, color: '#4CAF50', bg: '#E8F5E9' },
        ].map((item) => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Card sx={{ backgroundColor: item.bg }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ color: item.color, fontWeight: 'bold' }}>{item.count}</Typography>
                <Typography variant="body2">{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alerts List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Severity</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Alert</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sampleAlerts.map((alert) => (
                <TableRow key={alert.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>{getSeverityIcon(alert.severity)}</TableCell>
                  <TableCell><Chip label={alert.type.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">{alert.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{alert.message}</Typography>
                  </TableCell>
                  <TableCell><Chip label={alert.location} size="small" /></TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">{alert.time}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEscalate(alert.id)} title="Escalate">
                      <Notifications fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDismiss(alert.id)} title="Dismiss">
                      <CheckCircle fontSize="small" color="success" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AlertsPanel;