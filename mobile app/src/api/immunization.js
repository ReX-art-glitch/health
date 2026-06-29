import API from './client';
import { OfflineStorage } from '../services/OfflineStorage';
import NetInfo from '@react-native-community/netinfo';

export const ImmunizationAPI = {
  /**
   * Submit immunization record
   */
  submitRecord: async (data) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      try {
        const response = await API.post('/data/immunization', data);
        return {
          success: true,
          data: response.data,
          synced: true,
        };
      } catch (error) {
        // Save offline if server error
        await OfflineStorage.saveForSync('immunization', data);
        return {
          success: true,
          synced: false,
          message: 'Saved offline. Will sync when connected.',
        };
      }
    } else {
      // Save offline
      await OfflineStorage.saveForSync('immunization', data);
      return {
        success: true,
        synced: false,
        message: 'Saved offline. Will sync when connected.',
      };
    }
  },

  /**
   * Get immunization records
   */
  getRecords: async (params = {}) => {
    try {
      const response = await API.get('/data/immunization', { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get immunization by child ID
   */
  getChildRecords: async (childId) => {
    try {
      const response = await API.get(`/data/immunization/child/${childId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get vaccination schedule
   */
  getVaccinationSchedule: async (childAge) => {
    try {
      const response = await API.get('/data/immunization/schedule', {
        params: { age: childAge },
      });
      return {
        success: true,
        schedule: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Update immunization record
   */
  updateRecord: async (recordId, data) => {
    try {
      const response = await API.put(`/data/immunization/${recordId}`, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Delete immunization record
   */
  deleteRecord: async (recordId) => {
    try {
      await API.delete(`/data/immunization/${recordId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get coverage statistics
   */
  getCoverageStats: async (filters = {}) => {
    try {
      const response = await API.get('/data/immunization/stats', {
        params: filters,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get due vaccinations
   */
  getDueVaccinations: async (location) => {
    try {
      const response = await API.get('/data/immunization/due', {
        params: { location },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Search child records
   */
  searchChild: async (query) => {
    try {
      const response = await API.get('/data/immunization/search', {
        params: { q: query },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get AI reminders for missed vaccinations
   */
  getAIReminders: async (location) => {
    try {
      const response = await API.get('/ai/immunization/reminders', {
        params: { location },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};