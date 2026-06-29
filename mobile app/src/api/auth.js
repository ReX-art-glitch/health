import API from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';

export const AuthAPI = {
  /**
   * Login user
   */
  login: async (username, password) => {
    try {
      const response = await API.post('/auth/login', {
        username,
        password,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          deviceId: await getDeviceId(),
        },
      });

      const { accessToken, refreshToken, user } = response.data;

      // Store tokens securely
      await EncryptedStorage.setItem('authToken', accessToken);
      await EncryptedStorage.setItem('refreshToken', refreshToken);
      
      // Store user data
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      return {
        success: true,
        user,
        accessToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      // Call logout endpoint
      await API.post('/auth/logout');

      // Clear stored data
      await EncryptedStorage.clear();
      await AsyncStorage.multiRemove([
        'userData',
        'deviceId',
        'lastSyncTime',
        'pendingSync',
      ]);

      return { success: true };
    } catch (error) {
      // Clear local data even if API call fails
      await EncryptedStorage.clear();
      await AsyncStorage.clear();
      
      return { success: true };
    }
  },

  /**
   * Refresh token
   */
  refreshToken: async () => {
    try {
      const refreshToken = await EncryptedStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await API.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken } = response.data;
      await EncryptedStorage.setItem('authToken', accessToken);

      return { success: true, accessToken };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    try {
      const token = await EncryptedStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      return false;
    }
  },

  /**
   * Register device for push notifications
   */
  registerDevice: async (deviceToken) => {
    try {
      const response = await API.post('/auth/register-device', {
        deviceToken,
        platform: Platform.OS,
      });
      return response.data;
    } catch (error) {
      console.error('Device registration failed:', error);
      return null;
    }
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await API.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return { success: true, ...response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to change password',
      };
    }
  },

  /**
   * Biometric authentication
   */
  biometricAuth: async () => {
    try {
      const response = await API.post('/auth/biometric');
      const { accessToken } = response.data;
      await EncryptedStorage.setItem('authToken', accessToken);
      return { success: true, accessToken };
    } catch (error) {
      return { success: false, error: 'Biometric authentication failed' };
    }
  },
};

// Helper to get or create device ID
const getDeviceId = async () => {
  let deviceId = await AsyncStorage.getItem('deviceId');
  
  if (!deviceId) {
    deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('deviceId', deviceId);
  }
  
  return deviceId;
};