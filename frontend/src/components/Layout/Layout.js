import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Drawer, Typography, Divider, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  FileUpload,
  AutoAwesome,
  Description,
  SmartToy,
  AssignmentTurnedIn,
  Notifications,
  People,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Data Entry', icon: <FileUpload />, path: '/data-entry' },
    { text: 'AI Insights', icon: <AutoAwesome />, path: '/ai-insights' },
    { text: 'Reports', icon: <Description />, path: '/reports' },
    { text: 'Copilot', icon: <SmartToy />, path: '/copilot' },
    { text: 'Facility Assessment', icon: <AssignmentTurnedIn />, path: '/facility-assessment' },
    { text: 'Alerts', icon: <Notifications />, path: '/alerts' },
    { text: 'Users', icon: <People />, path: '/users' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2196F3' }}>
          Health AI
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Public Health Platform
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: '#2196F3', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="textSecondary">
          {user?.username || 'User'}
        </Typography>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            mt: 1,
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.2)',
            },
          }}
        >
          <ListItemIcon sx={{ color: '#F44336', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            AI Public Health Intelligence Platform
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 250,
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          backgroundColor: '#fafafa',
          minHeight: '100vh',
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
