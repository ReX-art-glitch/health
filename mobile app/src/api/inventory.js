import API from './client';
import { OfflineStorage } from '../services/OfflineStorage';
import NetInfo from '@react-native-community/netinfo';

export const InventoryAPI = {
  /**
   * Update inventory
   */
  updateInventory: async (data) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      try {
        const response = await API.post('/data/drug-inventory', data);
        return {
          success: true,
          data: response.data,
          synced: true,
        };
      } catch (error) {
        await OfflineStorage.saveForSync('inventory', data);
        return {
          success: true,
          synced: false,
          message: 'Saved offline.',
        };
      }
    } else {
      await OfflineStorage.saveForSync('inventory', data);
      return {
        success: true,
        synced: false,
        message: 'Saved offline.',
      };
    }
  },

  /**
   * Get inventory list
   */
  getInventory: async (params = {}) => {
    try {
      const response = await API.get('/data/drug-inventory', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get low stock alerts
   */
  getAlerts: async () => {
    try {
      const response = await API.get('/data/drug-inventory/alerts');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get drug by ID
   */
  getDrugDetails: async (drugId) => {
    try {
      const response = await API.get(`/data/drug-inventory/${drugId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Search drugs
   */
  searchDrugs: async (query) => {
    try {
      const response = await API.get('/data/drug-inventory/search', {
        params: { q: query },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get demand forecast
   */
  getDemandForecast: async (drugName) => {
    try {
      const response = await API.get('/ai/inventory/forecast', {
        params: { drug: drugName },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};