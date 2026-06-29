import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';

// Create Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': Platform.OS,
    'X-App-Version': '1.0.0',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add device ID
    const deviceId = await AsyncStorage.getItem('deviceId');
    if (deviceId) {
      config.headers['X-Device-ID'] = deviceId;
    }

    // Add request timestamp
    config.headers['X-Request-Time'] = new Date().toISOString();

    // Log request in development
    if (__DEV__) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (__DEV__) {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          await AsyncStorage.setItem('authToken', accessToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        // You might want to dispatch a logout action here
        console.error('Token refresh failed');
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please try again.';
    }

    return Promise.reject(error);
  }
);

// API helper methods
const API = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data, config = {}) => apiClient.post(url, data, config),
  put: (url, data, config = {}) => apiClient.put(url, data, config),
  patch: (url, data, config = {}) => apiClient.patch(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
  
  // File upload
  upload: (url, formData, config = {}) => {
    return apiClient.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
      timeout: 60000, // 60 seconds for uploads
    });
  },

  // Multipart form data
  postForm: (url, formData, config = {}) => {
    return apiClient.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers,
      },
    });
  },
};

export default API;