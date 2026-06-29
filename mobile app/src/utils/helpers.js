import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique ID
 */
export const generateId = () => {
  return uuidv4();
};

/**
 * Generate short ID
 */
export const generateShortId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Request Android permission
 */
export const requestAndroidPermission = async (permission, title, message) => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.request(permission, {
      title: title || 'Permission Required',
      message: message || 'This app needs this permission to function properly.',
      buttonPositive: 'Grant',
      buttonNegative: 'Deny',
    });
    
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

/**
 * Sleep/delay function
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry async function
 */
export const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

/**
 * Debounce function
 */
export const debounce = (fn, delay = 300) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function
 */
export const throttle = (fn, limit = 300) => {
  let inThrottle;
  
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Calculate age in months
 */
export const calculateAgeInMonths = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  return (today.getFullYear() - birth.getFullYear()) * 12 + 
         (today.getMonth() - birth.getMonth());
};

/**
 * Calculate gestational age
 */
export const calculateGestationalAge = (lmpDate) => {
  const lmp = new Date(lmpDate);
  const today = new Date();
  const diffTime = Math.abs(today - lmp);
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  const diffDays = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24));
  
  return {
    weeks: diffWeeks,
    days: diffDays,
    display: `${diffWeeks} weeks, ${diffDays} days`,
  };
};

/**
 * Calculate EDD from LMP
 */
export const calculateEDD = (lmpDate) => {
  const lmp = new Date(lmpDate);
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280); // 40 weeks
  return edd;
};

/**
 * Get BMI category
 */
export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Get color based on value
 */
export const getValueColor = (value, thresholds = [50, 75, 90]) => {
  if (value < thresholds[0]) return '#f44336'; // Red
  if (value < thresholds[1]) return '#FF9800'; // Orange
  if (value < thresholds[2]) return '#FFC107'; // Yellow
  return '#4CAF50'; // Green
};

/**
 * Log error to console in development
 */
export const logError = (error, context = '') => {
  if (__DEV__) {
    console.error(`[${context}]`, error);
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
};

/**
 * Get storage usage
 */
export const getStorageUsage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stores = await AsyncStorage.multiGet(keys);
    
    let totalSize = 0;
    const usage = {};
    
    stores.forEach(([key, value]) => {
      const size = (key.length + (value?.length || 0)) * 2; // UTF-16
      totalSize += size;
      
      const category = key.split(':')[0] || 'other';
      usage[category] = (usage[category] || 0) + size;
    });
    
    return {
      total: totalSize,
      usage,
      formatted: formatFileSize(totalSize),
    };
  } catch (error) {
    return { total: 0, usage: {}, formatted: '0 B' };
  }
};