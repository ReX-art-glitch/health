import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton,
  Box, Badge, Avatar, Menu, MenuItem
} from '@mui/material';
import {
  Dashboard, Assessment, Timeline, Chat,
  CloudUpload, Warning, Settings
} from '@mui/icons-material';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Data Entry', icon: <CloudUpload />, path: '/data-entry' },
    { text: 'AI Insights', icon: <Timeline />, path: '/ai-insights' },
    { text: 'Reports', icon: <Assessment />, path: '/reports' },
    { text: 'AI Copilot', icon: <Chat />, path: '/copilot' },
  ];

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 0, marginRight: '30px' }}>
          🏥 Public Health AI
        </Typography>
        
        <Box style={{ flexGrow: 1, display: 'flex', gap: '10px' }}>
          {menuItems.map((item) => (
            <Button
              key={item.text}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              style={{
                backgroundColor: location.pathname === item.path 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'transparent'
              }}
            >
              {item.text}
            </Button>
          ))}
        </Box>

        <Box style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <Warning />
            </Badge>
          </IconButton>
          
          <IconButton color="inherit">
            <Settings />
          </IconButton>
          
          <Avatar style={{ width: 32, height: 32, fontSize: '14px' }}>
            PH
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;