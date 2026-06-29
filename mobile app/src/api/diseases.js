import API from './client';
import { OfflineStorage } from '../services/OfflineStorage';
import NetInfo from '@react-native-community/netinfo';

export const DiseaseAPI = {
  /**
   * Report a disease case
   */
  reportDisease: async (data) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      try {
        const response = await API.post('/data/disease-surveillance', data);
        return {
          success: true,
          data: response.data,
          alertTriggered: response.data.alert_triggered,
          synced: true,
        };
      } catch (error) {
        await OfflineStorage.saveForSync('disease_report', data);
        return {
          success: true,
          synced: false,
          message: 'Saved offline. Will sync when connected.',
        };
      }
    } else {
      await OfflineStorage.saveForSync('disease_report', data);
      return {
        success: true,
        synced: false,
        message: 'Saved offline.',
      };
    }
  },

  /**
   * Get disease history
   */
  getDiseaseHistory: async (params = {}) => {
    try {
      const response = await API.get('/data/disease-surveillance', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get disease hotspots
   */
  getHotspots: async (location = null) => {
    try {
      const response = await API.get('/ai/disease/hotspots', {
        params: { location },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get outbreak predictions
   */
  getOutbreakPredictions: async () => {
    try {
      const response = await API.get('/ai/disease/predictions');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get disease statistics
   */
  getDiseaseStats: async (filters = {}) => {
    try {
      const response = await API.get('/data/disease-surveillance/stats', {
        params: filters,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};