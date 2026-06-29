import { SyncManager } from '../../services/SyncManager';
import { OfflineStorage } from '../../services/OfflineStorage';

// Action Types
export const SYNC_START = 'SYNC_START';
export const SYNC_PROGRESS = 'SYNC_PROGRESS';
export const SYNC_SUCCESS = 'SYNC_SUCCESS';
export const SYNC_FAILURE = 'SYNC_FAILURE';
export const UPDATE_PENDING_COUNT = 'UPDATE_PENDING_COUNT';
export const SET_LAST_SYNC = 'SET_LAST_SYNC';
export const CLEAR_SYNC_ERROR = 'CLEAR_SYNC_ERROR';

// Trigger sync
export const triggerSync = () => {
  return async (dispatch) => {
    dispatch({ type: SYNC_START });
    
    try {
      // Update progress periodically
      const progressInterval = setInterval(() => {
        dispatch({
          type: SYNC_PROGRESS,
          payload: { progress: Math.random() * 100 },
        });
      }, 2000);
      
      const result = await SyncManager.syncAll();
      clearInterval(progressInterval);
      
      if (result.success) {
        dispatch({
          type: SYNC_SUCCESS,
          payload: {
            stats: {
              total: result.synced + result.errors,
              synced: result.synced,
              failed: result.errors,
            },
            details: result.details,
          },
        });
        
        // Update pending count
        const pendingCount = await OfflineStorage.getPendingSyncCount();
        dispatch(updatePendingCount(pendingCount));
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      dispatch({
        type: SYNC_FAILURE,
        payload: error.message,
      });
    }
  };
};

// Update pending sync count
export const updatePendingCount = (count = null) => {
  return async (dispatch) => {
    try {
      const pendingCount = count ?? await OfflineStorage.getPendingSyncCount();
      dispatch({
        type: UPDATE_PENDING_COUNT,
        payload: pendingCount,
      });
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  };
};

// Set last sync time
export const setLastSync = (timestamp) => {
  return {
    type: SET_LAST_SYNC,
    payload: timestamp,
  };
};

// Clear sync error
export const clearSyncError = () => {
  return {
    type: CLEAR_SYNC_ERROR,
  };
};

// Sync specific data type
export const syncByType = (dataType) => {
  return async (dispatch) => {
    dispatch({ type: SYNC_START });
    
    try {
      const result = await SyncManager.syncByType(dataType);
      
      dispatch({
        type: SYNC_SUCCESS,
        payload: {
          stats: {
            total: result.synced + result.errors,
            synced: result.synced,
            failed: result.errors,
          },
        },
      });
      
      dispatch(updatePendingCount());
    } catch (error) {
      dispatch({
        type: SYNC_FAILURE,
        payload: error.message,
      });
    }
  };
};