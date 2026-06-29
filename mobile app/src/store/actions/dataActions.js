import { ImmunizationAPI } from '../../api/immunization';
import { MaternalAPI } from '../../api/maternal';
import { DiseaseAPI } from '../../api/diseases';
import { InventoryAPI } from '../../api/inventory';

// Action Types
export const FETCH_DASHBOARD_START = 'FETCH_DASHBOARD_START';
export const FETCH_DASHBOARD_SUCCESS = 'FETCH_DASHBOARD_SUCCESS';
export const FETCH_DASHBOARD_FAILURE = 'FETCH_DASHBOARD_FAILURE';

export const FETCH_IMMUNIZATIONS_START = 'FETCH_IMMUNIZATIONS_START';
export const FETCH_IMMUNIZATIONS_SUCCESS = 'FETCH_IMMUNIZATIONS_SUCCESS';
export const FETCH_IMMUNIZATIONS_FAILURE = 'FETCH_IMMUNIZATIONS_FAILURE';

export const SUBMIT_DATA_START = 'SUBMIT_DATA_START';
export const SUBMIT_DATA_SUCCESS = 'SUBMIT_DATA_SUCCESS';
export const SUBMIT_DATA_FAILURE = 'SUBMIT_DATA_FAILURE';

export const SET_OFFLINE_DATA = 'SET_OFFLINE_DATA';
export const CLEAR_DATA = 'CLEAR_DATA';

// Fetch dashboard data
export const fetchDashboardData = () => {
  return async (dispatch) => {
    dispatch({ type: FETCH_DASHBOARD_START });
    
    try {
      // Fetch all dashboard data in parallel
      const [immunizationStats, maternalStats, diseaseStats, inventoryStats] = await Promise.all([
        ImmunizationAPI.getCoverageStats(),
        MaternalAPI.getRecords({ limit: 10 }),
        DiseaseAPI.getDiseaseHistory(),
        InventoryAPI.getInventory(),
      ]);

      const dashboardData = {
        todayVaccinations: immunizationStats.data?.todayCount || 0,
        dueVaccinations: immunizationStats.data?.dueCount || 0,
        highRiskPregnancies: maternalStats.data?.filter(m => m.riskLevel === 'high').length || 0,
        activeAlerts: diseaseStats.data?.filter(d => d.status === 'active').length || 0,
        lowStockItems: inventoryStats.data?.filter(i => i.quantity <= i.reorderLevel).length || 0,
        coverageTrend: immunizationStats.data?.trend || null,
        diseaseDistribution: diseaseStats.data || [],
        recentAlerts: diseaseStats.data?.filter(d => d.alertTriggered) || [],
        lastUpdated: new Date().toISOString(),
      };

      dispatch({
        type: FETCH_DASHBOARD_SUCCESS,
        payload: dashboardData,
      });
    } catch (error) {
      dispatch({
        type: FETCH_DASHBOARD_FAILURE,
        payload: error.message,
      });
    }
  };
};

// Fetch immunization records
export const fetchImmunizations = (params = {}) => {
  return async (dispatch) => {
    dispatch({ type: FETCH_IMMUNIZATIONS_START });
    
    try {
      const result = await ImmunizationAPI.getRecords(params);
      
      if (result.success) {
        dispatch({
          type: FETCH_IMMUNIZATIONS_SUCCESS,
          payload: result.data,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      dispatch({
        type: FETCH_IMMUNIZATIONS_FAILURE,
        payload: error.message,
      });
    }
  };
};

// Submit any type of data
export const submitData = (dataType, data) => {
  return async (dispatch) => {
    dispatch({ type: SUBMIT_DATA_START, payload: { dataType } });
    
    try {
      let result;
      
      switch (dataType) {
        case 'immunization':
          result = await ImmunizationAPI.submitRecord(data);
          break;
        case 'maternal':
          result = await MaternalAPI.registerPregnancy(data);
          break;
        case 'disease':
          result = await DiseaseAPI.reportDisease(data);
          break;
        case 'inventory':
          result = await InventoryAPI.updateInventory(data);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }
      
      if (result.success) {
        dispatch({
          type: SUBMIT_DATA_SUCCESS,
          payload: {
            dataType,
            data: result.data,
            synced: result.synced,
          },
        });
      } else {
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      dispatch({
        type: SUBMIT_DATA_FAILURE,
        payload: {
          dataType,
          error: error.message,
        },
      });
      
      throw error;
    }
  };
};

// Set offline data
export const setOfflineData = (dataType, data) => {
  return {
    type: SET_OFFLINE_DATA,
    payload: { dataType, data },
  };
};

// Clear data
export const clearData = () => {
  return {
    type: CLEAR_DATA,
  };
};