import {
    SYNC_START,
    SYNC_PROGRESS,
    SYNC_SUCCESS,
    SYNC_FAILURE,
    UPDATE_PENDING_COUNT,
    SET_LAST_SYNC,
    CLEAR_SYNC_ERROR,
    SYNC_QUEUE_UPDATED,
    SET_SYNC_STATUS,
  } from '../actions/syncActions';
  
  const initialState = {
    isSyncing: false,
    progress: 0,
    pendingSync: 0,
    lastSyncTime: null,
    lastSyncAttempt: null,
    error: null,
    syncInProgress: false,
    forceSync: false,
    retrySync: false,
    syncStats: {
      total: 0,
      synced: 0,
      failed: 0,
    },
    syncHistory: [],
    status: {
      hasPending: false,
      lastChecked: null,
      isOnline: true,
    },
    queueInfo: {
      items: [],
      lastUpdated: null,
    },
  };
  
  const syncReducer = (state = initialState, action) => {
    switch (action.type) {
      case SYNC_START:
        return {
          ...state,
          isSyncing: true,
          syncInProgress: true,
          progress: 0,
          error: null,
          forceSync: action.payload?.force || false,
          retrySync: action.payload?.retry || false,
          lastSyncAttempt: new Date().toISOString(),
        };
  
      case SYNC_PROGRESS:
        return {
          ...state,
          progress: action.payload.progress,
        };
  
      case SYNC_SUCCESS:
        const successTime = new Date().toISOString();
        
        // Add to sync history
        const historyEntry = {
          timestamp: successTime,
          stats: action.payload.stats || state.syncStats,
          duration: action.payload.duration || 0,
          type: state.forceSync ? 'force' : state.retrySync ? 'retry' : 'regular',
        };
        
        // Keep last 50 sync history entries
        const updatedHistory = [historyEntry, ...state.syncHistory].slice(0, 50);
  
        return {
          ...state,
          isSyncing: false,
          syncInProgress: false,
          progress: 100,
          lastSyncTime: successTime,
          syncStats: action.payload.stats || state.syncStats,
          syncHistory: updatedHistory,
          error: null,
          forceSync: false,
          retrySync: false,
        };
  
      case SYNC_FAILURE:
        return {
          ...state,
          isSyncing: false,
          syncInProgress: false,
          progress: 0,
          error: action.payload,
          forceSync: false,
          retrySync: false,
          lastSyncAttempt: new Date().toISOString(),
        };
  
      case UPDATE_PENDING_COUNT:
        return {
          ...state,
          pendingSync: action.payload,
        };
  
      case SET_LAST_SYNC:
        return {
          ...state,
          lastSyncTime: action.payload,
        };
  
      case CLEAR_SYNC_ERROR:
        return {
          ...state,
          error: null,
        };
  
      case SYNC_QUEUE_UPDATED:
        return {
          ...state,
          queueInfo: {
            items: action.payload.items || [],
            lastUpdated: new Date().toISOString(),
          },
          pendingSync: action.payload.items?.length || 0,
        };
  
      case SET_SYNC_STATUS:
        return {
          ...state,
          status: {
            ...state.status,
            ...action.payload,
          },
        };
  
      // Reset sync state (on logout)
      case 'LOGOUT':
        return {
          ...initialState,
          lastSyncTime: state.lastSyncTime, // Preserve last sync time
          syncHistory: state.syncHistory, // Preserve sync history
        };
  
      // Reset App
      case 'RESET_APP':
        return initialState;
  
      default:
        return state;
    }
  };
  
  export default syncReducer;