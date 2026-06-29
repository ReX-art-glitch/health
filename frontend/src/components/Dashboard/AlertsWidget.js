import React from 'react';
import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Chip, Box } from '@mui/material';
import { Warning, Error, Info, CheckCircle } from '@mui/icons-material';
import { useApp } from '../../context/AppContext';

const AlertsWidget = () => {
  const { alerts } = useApp();

  const getIcon = (severity) => {
    switch (severity) {
      case 'critical': return <Error color="error" />;
      case 'high': return <Warning color="warning" />;
      case 'medium': return <Info color="info" />;
      default: return <CheckCircle color="success" />;
    }
  };

  const sampleAlerts = alerts.length > 0 ? alerts : [
    { id: 1, type: 'Coverage Drop', severity: 'critical', message: 'Coverage dropped 7% in Akwa Ibom', time: '2 hours ago' },
    { id: 2, type: 'Stockout Risk', severity: 'high', message: '3 facilities at risk of vaccine stockout', time: '4 hours ago' },
    { id: 3, type: 'Outbreak Alert', severity: 'critical', message: 'Measles outbreak detected in Eastern Obolo', time: '6 hours ago' },
    { id: 4, type: 'ANC Alert', severity: 'medium', message: '15 missed ANC appointments this week', time: '1 day ago' },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Active Alerts</Typography>
      <List>
        {sampleAlerts.slice(0, 5).map((alert) => (
          <ListItem key={alert.id} sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>{getIcon(alert.severity)}</ListItemIcon>
            <ListItemText
              primary={alert.message}
              secondary={alert.time}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            />
            <Chip label={alert.type} size="small" color={alert.severity === 'critical' ? 'error' : 'warning'} />
          </ListItem>
        ))}
      </List>
      {sampleAlerts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <CheckCircle color="success" sx={{ fontSize: 40 }} />
          <Typography color="textSecondary">No active alerts</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AlertsWidget;