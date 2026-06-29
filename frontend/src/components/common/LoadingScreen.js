import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = ({ message = 'Loading...' }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: 2,
  }}>
    <CircularProgress size={60} />
    <Typography variant="body1" color="textSecondary">{message}</Typography>
  </Box>
);

export default LoadingScreen;