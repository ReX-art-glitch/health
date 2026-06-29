import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../services/api';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Connect WebSocket for real-time updates
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:8000', {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('token') },
    });

    newSocket.on('connect', () => console.log('WebSocket connected'));
    newSocket.on('alert', (alert) => setAlerts(prev => [alert, ...prev]));
    newSocket.on('dashboard_update', (data) => setDashboardData(data));
    newSocket.on('disconnect', () => console.log('WebSocket disconnected'));

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboards/stats');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts/active-alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Alerts fetch error:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      dashboardData, alerts, socket, loading,
      fetchDashboardData, fetchAlerts,
    }}>
      {children}
    </AppContext.Provider>
  );
};