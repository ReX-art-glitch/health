import { AuthAPI } from '../../api/auth';
import { BiometricService } from '../../services/BiometricService';
import { OfflineStorage } from '../../services/OfflineStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform } from 'react-native';

// Action Types
export const AUTH_START = 'AUTH_START';
export const AUTH_SUCCESS = 'AUTH_SUCCESS';
export const AUTH_FAILURE = 'AUTH_FAILURE';
export const LOGOUT = 'LOGOUT';
export const SET_USER = 'SET_USER';
export const UPDATE_PROFILE = 'UPDATE_PROFILE';
export const CLEAR_AUTH_ERROR = 'CLEAR_AUTH_ERROR';
export const SET_BIOMETRIC_ENABLED = 'SET_BIOMETRIC_ENABLED';
export const SET_LAST_LOGIN = 'SET_LAST_LOGIN';
export const TOKEN_REFRESHED = 'TOKEN_REFRESHED';
export const SESSION_EXPIRED = 'SESSION_EXPIRED';

// Login action
export const login = (username, password, biometric = false) => {
  return async (dispatch) => {
    dispatch({ type: AUTH_START });

    try {
      let result;

      if (biometric) {
        // Get stored credentials for biometric login
        const credentials = await BiometricService.getStoredCredentials();
        if (!credentials) {
          throw new Error('No stored credentials found. Please login with username and password.');
        }
        result = await AuthAPI.login(credentials.username, credentials.password);
      } else {
        result = await AuthAPI.login(username, password);
      }

      if (result.success) {
        // Store credentials for future biometric login
        if (!biometric && password) {
          try {
            await BiometricService.storeCredentials(username, password);
            dispatch({ type: SET_BIOMETRIC_ENABLED, payload: true });
          } catch (bioError) {
            console.error('Failed to store biometric credentials:', bioError);
          }
        }

        // Store last login time
        const lastLogin = new Date().toISOString();
        await AsyncStorage.setItem('lastLogin', lastLogin);

        dispatch({
          type: AUTH_SUCCESS,
          payload: {
            user: result.user,
            token: result.accessToken,
            lastLogin,
          },
        });

        // Dispatch successful login analytics
        dispatch({
          type: 'ANALYTICS_EVENT',
          payload: {
            event: 'user_login',
            method: biometric ? 'biometric' : 'password',
            timestamp: new Date().toISOString(),
          },
        });

        return { success: true };
      } else {
        dispatch({
          type: AUTH_FAILURE,
          payload: result.error || 'Invalid username or password',
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred during login';
      
      dispatch({
        type: AUTH_FAILURE,
        payload: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  };
};

// Logout action
export const logout = () => {
  return async (dispatch) => {
    try {
      // Call logout API
      await AuthAPI.logout();
      
      // Clear all stored data
      await cleanupOnLogout();
      
      dispatch({ type: LOGOUT });
      
      // Dispatch logout analytics
      dispatch({
        type: 'ANALYTICS_EVENT',
        payload: {
          event: 'user_logout',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Still cleanup and dispatch logout even if API call fails
      await cleanupOnLogout();
      dispatch({ type: LOGOUT });
    }
  };
};

// Cleanup on logout
const cleanupOnLogout = async () => {
  try {
    // Clear secure storage
    await EncryptedStorage.clear();
    
    // Clear specific async storage items
    const keysToRemove = [
      'userData',
      'lastLogin',
      'pendingSync',
      'lastSyncTime',
      'locationTracking',
      'cachedData',
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    // Clear offline sync queue (optional - might want to keep)
    // await OfflineStorage.clearAll();
    
  } catch (error) {
    console.error('Logout cleanup error:', error);
  }
};

// Check authentication status on app start
export const checkAuthStatus = () => {
  return async (dispatch) => {
    try {
      const isAuthenticated = await AuthAPI.isAuthenticated();
      
      if (isAuthenticated) {
        // Get stored user data
        const user = await AuthAPI.getCurrentUser();
        
        if (user) {
          // Check if session is still valid
          const lastLogin = await AsyncStorage.getItem('lastLogin');
          const tokenExpiry = await AsyncStorage.getItem('tokenExpiry');
          
          if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
            // Token expired, try refresh
            const refreshResult = await dispatch(refreshAuthToken());
            if (!refreshResult.success) {
              dispatch({ type: SESSION_EXPIRED });
              dispatch({ type: LOGOUT });
              return;
            }
          }
          
          dispatch({
            type: AUTH_SUCCESS,
            payload: {
              user,
              lastLogin: lastLogin || new Date().toISOString(),
            },
          });
        } else {
          dispatch({ type: LOGOUT });
        }
      } else {
        dispatch({ type: LOGOUT });
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      dispatch({ type: LOGOUT });
    }
  };
};

// Refresh authentication token
export const refreshAuthToken = () => {
  return async (dispatch) => {
    try {
      const result = await AuthAPI.refreshToken();
      
      if (result.success) {
        dispatch({
          type: TOKEN_REFRESHED,
          payload: {
            token: result.accessToken,
          },
        });
        return { success: true };
      } else {
        dispatch({ type: LOGOUT });
        return { success: false, error: result.error };
      }
    } catch (error) {
      dispatch({ type: LOGOUT });
      return { success: false, error: error.message };
    }
  };
};

// Update user profile
export const updateProfile = (userData) => {
  return async (dispatch) => {
    dispatch({
      type: UPDATE_PROFILE,
      payload: userData,
    });

    // Save updated user data
    try {
      await AsyncStorage.setItem('userData', JSON.stringify({
        ...userData,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error saving updated profile:', error);
    }

    return { success: true };
  };
};

// Set user data
export const setUser = (userData) => {
  return {
    type: SET_USER,
    payload: userData,
  };
};

// Clear auth error
export const clearAuthError = () => {
  return {
    type: CLEAR_AUTH_ERROR,
  };
};

// Check biometric availability
export const checkBiometricAvailability = () => {
  return async (dispatch) => {
    try {
      const available = await BiometricService.isAvailable();
      const enabled = await BiometricService.isEnabled();
      
      dispatch({
        type: SET_BIOMETRIC_ENABLED,
        payload: available && enabled,
      });
      
      return available;
    } catch (error) {
      console.error('Biometric check error:', error);
      return false;
    }
  };
};

// Enable biometric login
export const enableBiometric = (username, password) => {
  return async (dispatch) => {
    try {
      const result = await BiometricService.enable();
      
      if (result.success) {
        await BiometricService.storeCredentials(username, password);
        dispatch({
          type: SET_BIOMETRIC_ENABLED,
          payload: true,
        });
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

// Disable biometric login
export const disableBiometric = () => {
  return async (dispatch) => {
    try {
      await BiometricService.disable();
      
      dispatch({
        type: SET_BIOMETRIC_ENABLED,
        payload: false,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

// Register device for push notifications
export const registerDevice = (deviceToken) => {
  return async (dispatch) => {
    try {
      const result = await AuthAPI.registerDevice(deviceToken);
      
      if (result) {
        dispatch({
          type: 'DEVICE_REGISTERED',
          payload: { deviceToken },
        });
      }
      
      return result;
    } catch (error) {
      console.error('Device registration error:', error);
      return null;
    }
  };
};

// Change password
export const changePassword = (currentPassword, newPassword) => {
  return async () => {
    try {
      const result = await AuthAPI.changePassword(currentPassword, newPassword);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to change password',
      };
    }
  };
};

// Reset app state
export const resetApp = () => {
  return {
    type: 'RESET_APP',
  };
};