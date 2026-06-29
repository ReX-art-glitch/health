import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const checkAuth = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      enqueueSnackbar('Login successful', { variant: 'success' });
      navigate('/');
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
    enqueueSnackbar('Logged out successfully', { variant: 'info' });
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (!roles) return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, isAuthenticated: !!user,
      login, logout, hasRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};