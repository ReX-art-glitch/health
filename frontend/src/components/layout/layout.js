import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItem, ListItemIcon, ListItemText, Avatar,
  Badge, Menu, MenuItem, Divider, Tooltip
} from '@mui/material';
import {
  Dashboard, CloudUpload, Timeline, Assessment,
  Chat, Warning, People, Settings, Menu as MenuIcon,
  Notifications, Logout, AccountCircle, LocalHospital
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Data Entry', icon: <CloudUpload />, path: '/data-entry' },
  { text: 'AI Insights', icon: <Timeline />, path: '/ai-insights' },
  { text: 'Reports', icon: <Assessment />, path: '/reports' },
  { text: 'AI Copilot', icon: <Chat />, path: '/copilot' },
  { text: 'Facility Assessment', icon: <LocalHospital />, path: '/facility-assessment' },
  { text: 'Alerts', icon: <Warning />, path: '/alerts' },
  { text: 'Users', icon: <People />, path: '/users' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { alerts } = useApp();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>PH</Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Public Health AI</Typography>
          <Typography variant="caption" color="textSecondary">Intelligence Platform</Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
            selected={location.pathname === item.path}
            sx={{
              mx: 1, borderRadius: 1, mb: 0.5,
              '&.Mui-selected': { backgroundColor: 'primary.light', color: 'white' },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
              {item.text === 'Alerts' ? (
                <Badge badgeContent={alerts.length} color="error">{item.icon}</Badge>
              ) : item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
          </Typography>

          <IconButton color="inherit">
            <Badge badgeContent={alerts.length} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <Tooltip title={user?.name || 'User'}>
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <AccountCircle sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); logout(); }}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
        open
      >
        <Toolbar />
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;