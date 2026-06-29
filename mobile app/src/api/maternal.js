import API from './client';
import { OfflineStorage } from '../services/OfflineStorage';
import NetInfo from '@react-native-community/netinfo';

export const MaternalAPI = {
  /**
   * Register new pregnancy
   */
  registerPregnancy: async (data) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      try {
        const response = await API.post('/data/maternal-health', data);
        return {
          success: true,
          data: response.data,
          synced: true,
        };
      } catch (error) {
        await OfflineStorage.saveForSync('maternal_health', data);
        return {
          success: true,
          synced: false,
          message: 'Saved offline. Will sync when connected.',
        };
      }
    } else {
      await OfflineStorage.saveForSync('maternal_health', data);
      return {
        success: true,
        synced: false,
        message: 'Saved offline.',
      };
    }
  },

  /**
   * Record ANC visit
   */
  recordANCVisit: async (pregnancyId, visitData) => {
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      try {
        const response = await API.post(
          `/data/maternal-health/${pregnancyId}/anc`,
          visitData
        );
        return { success: true, data: response.data, synced: true };
      } catch (error) {
        await OfflineStorage.saveForSync('anc_visit', {
          pregnancyId,
          ...visitData,
        });
        return { success: true, synced: false };
      }
    } else {
      await OfflineStorage.saveForSync('anc_visit', {
        pregnancyId,
        ...visitData,
      });
      return { success: true, synced: false };
    }
  },

  /**
   * Record delivery
   */
  recordDelivery: async (pregnancyId, deliveryData) => {
    try {
      const response = await API.post(
        `/data/maternal-health/${pregnancyId}/delivery`,
        deliveryData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Record postnatal visit
   */
  recordPostnatalVisit: async (motherId, visitData) => {
    try {
      const response = await API.post(
        `/data/maternal-health/${motherId}/postnatal`,
        visitData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get maternal records
   */
  getRecords: async (params = {}) => {
    try {
      const response = await API.get('/data/maternal-health', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get pregnancy details
   */
  getPregnancyDetails: async (pregnancyId) => {
    try {
      const response = await API.get(`/data/maternal-health/${pregnancyId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get risk assessment
   */
  getRiskAssessment: async (pregnancyId) => {
    try {
      const response = await API.get(
        `/ai/maternal/risk-assessment/${pregnancyId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get high-risk pregnancies
   */
  getHighRiskPregnancies: async (location) => {
    try {
      const response = await API.get('/data/maternal-health/high-risk', {
        params: { location },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Refer patient
   */
  referPatient: async (referralData) => {
    try {
      const response = await API.post('/data/referrals', referralData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get missed ANC visits
   */
  getMissedANCVisits: async (location) => {
    try {
      const response = await API.get('/ai/maternal/missed-visits', {
        params: { location },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};